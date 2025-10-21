package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"flow-codeblock-go/model"
	"flow-codeblock-go/utils"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// TokenRepository Token数据访问层
type TokenRepository struct {
	db *sqlx.DB
}

// NewTokenRepository 创建Token Repository
func NewTokenRepository(db *sqlx.DB) *TokenRepository {
	return &TokenRepository{db: db}
}

// GenerateToken 生成访问令牌
// 使用密码学安全的随机数生成器（crypto/rand）生成不可预测的 Token
//
// Token 格式：flow_{UUID-without-dashes}{32-hex-random}
// - UUID: 32个十六进制字符（128 bits 随机性）
// - Random: 32个十六进制字符（128 bits 随机性）
// - 总计：256 bits 随机性，足以抵御暴力破解
//
// 安全性：如果 crypto/rand.Read 失败，直接返回错误而不降级到弱随机性
func (r *TokenRepository) GenerateToken() (string, error) {
	// 生成 UUID v4（去除横线）
	// 使用 strings.ReplaceAll 替代手动字符串拼接，更清晰
	uuidStr := strings.ReplaceAll(uuid.New().String(), "-", "")

	// 生成 16 字节（128 bits）密码学安全的随机数
	randomBytes := make([]byte, 16)
	if _, err := rand.Read(randomBytes); err != nil {
		// 🔒 安全第一：绝不降级到弱随机性（如时间戳）
		// 宁可失败也不生成可预测的 Token
		// crypto/rand.Read 失败极其罕见（< 1/10,000,000），但一旦发生必须处理
		return "", fmt.Errorf("生成安全随机字节失败: %w", err)
	}
	randomStr := hex.EncodeToString(randomBytes)

	return fmt.Sprintf("flow_%s%s", uuidStr, randomStr), nil
}

// CalculateExpiresAt 计算过期时间
func (r *TokenRepository) CalculateExpiresAt(operation string, days *int, specificDate string) (*time.Time, error) {
	switch operation {
	case "unlimited":
		return nil, nil
	case "add":
		if days == nil || *days <= 0 {
			return nil, fmt.Errorf("operation为add时，days参数必须为正整数")
		}
		expiresAt := time.Now().AddDate(0, 0, *days)
		return &expiresAt, nil
	case "set":
		if specificDate == "" {
			return nil, fmt.Errorf("operation为set时，specific_date参数不能为空")
		}
		// 尝试解析 yyyy-MM-dd HH:mm:ss 格式
		expiresAt, err := utils.ParseTime(specificDate)
		if err != nil {
			// 如果失败，尝试解析 yyyy-MM-dd 格式
			expiresAt, err = time.ParseInLocation("2006-01-02", specificDate, utils.ShanghaiLocation)
			if err != nil {
				return nil, fmt.Errorf("specific_date格式错误，支持格式：yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss")
			}
		}
		return &expiresAt, nil
	default:
		return nil, fmt.Errorf("无效的operation类型: %s", operation)
	}
}

// Create 创建Token
func (r *TokenRepository) Create(ctx context.Context, req *model.CreateTokenRequest) (*model.TokenInfo, error) {
	// 生成Token（使用密码学安全的随机数）
	accessToken, err := r.GenerateToken()
	if err != nil {
		// 记录安全相关错误（极其罕见，< 1/10,000,000）
		utils.Error("Token生成失败：密码学随机数生成器错误", zap.Error(err))
		return nil, fmt.Errorf("failed to generate secure token: %w", err)
	}

	// 计算过期时间
	expiresAt, err := r.CalculateExpiresAt(req.Operation, req.Days, req.SpecificDate)
	if err != nil {
		return nil, err
	}

	// 设置默认值
	windowSeconds := 60
	if req.RateLimitWindowSeconds != nil {
		windowSeconds = *req.RateLimitWindowSeconds
	}

	// 🔥 配额类型默认值（向后兼容）
	quotaType := "time"
	if req.QuotaType != "" {
		quotaType = req.QuotaType
	}

	// 🔥 插入数据库（增加配额字段）
	query := `
		INSERT INTO access_tokens (
			ws_id, email, access_token, expires_at, operation_type,
			quota_type, total_quota, remaining_quota,
			rate_limit_per_minute, rate_limit_burst, rate_limit_window_seconds
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		req.WsID,
		req.Email,
		accessToken,
		expiresAt,
		req.Operation,
		quotaType,         // 🔥 新增
		req.TotalQuota,    // 🔥 新增
		req.TotalQuota,    // 🔥 新增（初始 remaining = total）
		req.RateLimitPerMinute,
		req.RateLimitBurst,
		windowSeconds,
	)
	if err != nil {
		utils.Error("创建Token失败", zap.Error(err))
		return nil, fmt.Errorf("创建Token失败: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	// 返回创建的Token信息
	return r.GetByID(ctx, int(id))
}

// GetByToken 根据Token获取信息
func (r *TokenRepository) GetByToken(ctx context.Context, token string) (*model.TokenInfo, error) {
	var tokenInfo model.TokenInfo
	query := `
		SELECT * FROM access_tokens 
		WHERE access_token = ? AND is_active = 1
	`

	err := r.db.GetContext(ctx, &tokenInfo, query, token)
	if err != nil {
		// 🔥 使用errors.Is替代字符串比较（修复中等问题3）
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		utils.Error("查询Token失败", zap.Error(err), zap.String("token", utils.MaskToken(token)))
		return nil, fmt.Errorf("查询Token失败: %w", err)
	}

	return &tokenInfo, nil
}

// GetByID 根据ID获取Token信息
func (r *TokenRepository) GetByID(ctx context.Context, id int) (*model.TokenInfo, error) {
	var tokenInfo model.TokenInfo
	query := `SELECT * FROM access_tokens WHERE id = ?`

	err := r.db.GetContext(ctx, &tokenInfo, query, id)
	if err != nil {
		// 🔥 使用errors.Is替代字符串比较（修复中等问题3）
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("查询Token失败: %w", err)
	}

	return &tokenInfo, nil
}

// GetByWsID 根据工作空间ID获取Token列表
func (r *TokenRepository) GetByWsID(ctx context.Context, wsID string) ([]*model.TokenInfo, error) {
	var tokens []*model.TokenInfo
	query := `
		SELECT * FROM access_tokens 
		WHERE ws_id = ? AND is_active = 1
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &tokens, query, wsID)
	if err != nil {
		utils.Error("查询Token列表失败", zap.Error(err), zap.String("ws_id", wsID))
		return nil, fmt.Errorf("查询Token列表失败: %w", err)
	}

	return tokens, nil
}

// GetByEmail 根据邮箱获取Token列表
func (r *TokenRepository) GetByEmail(ctx context.Context, email string) ([]*model.TokenInfo, error) {
	var tokens []*model.TokenInfo
	query := `
		SELECT * FROM access_tokens 
		WHERE email = ? AND is_active = 1
		ORDER BY created_at DESC
	`

	err := r.db.SelectContext(ctx, &tokens, query, email)
	if err != nil {
		utils.Error("查询Token列表失败", zap.Error(err), zap.String("email", email))
		return nil, fmt.Errorf("查询Token列表失败: %w", err)
	}

	return tokens, nil
}

// Update 更新Token
func (r *TokenRepository) Update(ctx context.Context, token string, req *model.UpdateTokenRequest) (*model.TokenInfo, error) {
	// 先检查Token是否存在
	existingToken, err := r.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if existingToken == nil {
		return nil, fmt.Errorf("Token不存在")
	}

	// 计算过期时间
	expiresAt, err := r.CalculateExpiresAt(req.Operation, nil, req.SpecificDate)
	if err != nil {
		return nil, err
	}

	// 🔥 根据是否提供quota_type来决定SQL语句
	var query string
	var args []interface{}
	
	if req.QuotaType != "" {
		// 如果提供了quota_type，则更新配额类型
		query = `
			UPDATE access_tokens 
			SET expires_at = ?, operation_type = ?,
				rate_limit_per_minute = ?, rate_limit_burst = ?, rate_limit_window_seconds = ?,
				quota_type = ?
			WHERE access_token = ? AND is_active = 1
		`
		args = []interface{}{
			expiresAt,
			req.Operation,
			req.RateLimitPerMinute,
			req.RateLimitBurst,
			req.RateLimitWindowSeconds,
			req.QuotaType,
			token,
		}
	} else {
		// 如果没有提供quota_type，保持原有逻辑
		query = `
			UPDATE access_tokens 
			SET expires_at = ?, operation_type = ?,
				rate_limit_per_minute = ?, rate_limit_burst = ?, rate_limit_window_seconds = ?
			WHERE access_token = ? AND is_active = 1
		`
		args = []interface{}{
			expiresAt,
			req.Operation,
			req.RateLimitPerMinute,
			req.RateLimitBurst,
			req.RateLimitWindowSeconds,
			token,
		}
	}

	_, err = r.db.ExecContext(ctx, query, args...)
	if err != nil {
		utils.Error("更新Token失败", zap.Error(err), zap.String("token", utils.MaskToken(token)))
		return nil, fmt.Errorf("更新Token失败: %w", err)
	}

	// 返回更新后的Token信息
	return r.GetByToken(ctx, token)
}

// Delete 删除Token（软删除）
func (r *TokenRepository) Delete(ctx context.Context, token string) error {
	query := `UPDATE access_tokens SET is_active = 0 WHERE access_token = ?`

	result, err := r.db.ExecContext(ctx, query, token)
	if err != nil {
		utils.Error("删除Token失败", zap.Error(err), zap.String("token", utils.MaskToken(token)))
		return fmt.Errorf("删除Token失败: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("Token不存在")
	}

	utils.Info("Token已删除", zap.String("token", utils.MaskToken(token)))
	return nil
}

// SyncQuotaFromRedis 同步Redis配额到数据库
func (r *TokenRepository) SyncQuotaFromRedis(ctx context.Context, token string, remaining int) error {
	query := `
		UPDATE access_tokens 
		SET remaining_quota = ?, quota_synced_at = NOW()
		WHERE access_token = ? AND is_active = 1
	`
	_, err := r.db.ExecContext(ctx, query, remaining, token)
	if err != nil {
		return fmt.Errorf("同步配额失败: %w", err)
	}
	return nil
}

// GetQuotaFromDB 从数据库获取配额（用于Redis故障降级）
func (r *TokenRepository) GetQuotaFromDB(ctx context.Context, token string) (*int, error) {
	var quota *int
	query := `SELECT remaining_quota FROM access_tokens WHERE access_token = ? AND is_active = 1`
	
	err := r.db.GetContext(ctx, &quota, query, token)
	if err != nil {
		// 🔥 使用errors.Is替代字符串比较（修复中等问题3）
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("Token不存在")
		}
		return nil, fmt.Errorf("查询配额失败: %w", err)
	}
	return quota, nil
}

// UpdateQuota 更新配额（用于增购/重置）
func (r *TokenRepository) UpdateQuota(ctx context.Context, token string, operation string, amount *int) (*model.TokenInfo, error) {
	// 先获取当前Token信息
	tokenInfo, err := r.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}
	if tokenInfo == nil {
		return nil, fmt.Errorf("Token不存在")
	}

	var newRemainingQuota int
	var newTotalQuota int
	
	switch operation {
	case "add":
		// 增加配额：同时增加 remaining 和 total
		if amount == nil || *amount <= 0 {
			return nil, fmt.Errorf("增加配额数量必须为正整数")
		}
		currentRemaining := 0
		if tokenInfo.RemainingQuota != nil {
			currentRemaining = *tokenInfo.RemainingQuota
		}
		currentTotal := 0
		if tokenInfo.TotalQuota != nil {
			currentTotal = *tokenInfo.TotalQuota
		}
		newRemainingQuota = currentRemaining + *amount
		newTotalQuota = currentTotal + *amount  // 🔥 同时增加总配额
		
	case "set":
		// 设置为指定值（只设置 remaining，不改变 total）
		if amount == nil || *amount < 0 {
			return nil, fmt.Errorf("配额数量不能为负数")
		}
		newRemainingQuota = *amount
		// total 保持不变
		if tokenInfo.TotalQuota != nil {
			newTotalQuota = *tokenInfo.TotalQuota
		}
		
	case "reset":
		// 重置配额支持两种模式：
		// 1. 不提供amount：重置remaining为当前的total（原有逻辑）
		// 2. 提供amount：同时修改total和remaining为该值（新增功能，用于修正配额错误）
		if amount != nil {
			// 模式2：同时修改total和remaining为指定值
			if *amount < 0 {
				return nil, fmt.Errorf("配额数量不能为负数")
			}
			newRemainingQuota = *amount
			newTotalQuota = *amount
		} else {
			// 模式1：重置remaining为当前的total
			if tokenInfo.TotalQuota == nil {
				return nil, fmt.Errorf("该Token没有设置总配额，无法重置")
			}
			newRemainingQuota = *tokenInfo.TotalQuota
			newTotalQuota = *tokenInfo.TotalQuota
		}
		
	default:
		return nil, fmt.Errorf("无效的配额操作: %s", operation)
	}

	// 更新数据库（同时更新 remaining_quota 和 total_quota）
	query := `
		UPDATE access_tokens 
		SET remaining_quota = ?, total_quota = ?, quota_synced_at = NOW()
		WHERE access_token = ? AND is_active = 1
	`
	_, err = r.db.ExecContext(ctx, query, newRemainingQuota, newTotalQuota, token)
	if err != nil {
		return nil, fmt.Errorf("更新配额失败: %w", err)
	}

	// 返回更新后的Token信息
	return r.GetByToken(ctx, token)
}

// DecrementQuotaAtomic 原子扣减配额（数据库降级模式）
// 返回：扣减前配额、扣减后配额、错误
func (r *TokenRepository) DecrementQuotaAtomic(ctx context.Context, token string) (int, int, error) {
	// 使用数据库原子操作扣减配额
	// WHERE remaining_quota > 0 确保不会扣成负数
	query := `
		UPDATE access_tokens 
		SET remaining_quota = remaining_quota - 1,
		    quota_synced_at = NOW()
		WHERE access_token = ? 
		  AND is_active = 1 
		  AND remaining_quota > 0
	`
	
	result, err := r.db.ExecContext(ctx, query, token)
	if err != nil {
		return 0, 0, fmt.Errorf("扣减配额失败: %w", err)
	}
	
	// 检查是否更新成功
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, 0, fmt.Errorf("获取影响行数失败: %w", err)
	}
	
	if rowsAffected == 0 {
		// 没有更新任何行，说明配额不足或Token不存在
		return 0, 0, fmt.Errorf("配额不足或Token不存在")
	}
	
	// 查询扣减后的配额
	var quotaAfter int
	selectQuery := `
		SELECT remaining_quota 
		FROM access_tokens 
		WHERE access_token = ?
	`
	err = r.db.GetContext(ctx, &quotaAfter, selectQuery, token)
	if err != nil {
		return 0, 0, fmt.Errorf("查询扣减后配额失败: %w", err)
	}
	
	// 扣减前配额 = 扣减后配额 + 1
	quotaBefore := quotaAfter + 1
	
	return quotaBefore, quotaAfter, nil
}

// InsertQuotaLog 插入配额日志
func (r *TokenRepository) InsertQuotaLog(ctx context.Context, log *model.QuotaLog) error {
	query := `
		INSERT INTO token_quota_logs (
			token, ws_id, email, quota_before, quota_after, quota_change,
			action, request_id, execution_success, execution_error_type, execution_error_message
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`
	_, err := r.db.ExecContext(ctx, query,
		log.Token,
		log.WsID,
		log.Email,
		log.QuotaBefore,
		log.QuotaAfter,
		log.QuotaChange,
		log.Action,
		log.RequestID,
		log.ExecutionSuccess,
		log.ExecutionErrorType,
		log.ExecutionErrorMessage,
	)
	return err
}

// BatchInsertQuotaLogs 批量插入配额日志
func (r *TokenRepository) BatchInsertQuotaLogs(ctx context.Context, logs []*model.QuotaLog) error {
	if len(logs) == 0 {
		return nil
	}

	// 🔥 分批插入，每次最多500条（修复问题4）
	const maxBatchSize = 500
	
	for i := 0; i < len(logs); i += maxBatchSize {
		end := i + maxBatchSize
		if end > len(logs) {
			end = len(logs)
		}
		batch := logs[i:end]
		
		// 🔥 使用事务包装批量插入，提高性能（修复问题1.2）
		tx, err := r.db.BeginTxx(ctx, nil)
		if err != nil {
			return fmt.Errorf("开始事务失败: %w", err)
		}
		defer tx.Rollback() // 自动回滚未提交的事务
		
		// 🔥 使用strings.Builder优化SQL拼接（修复严重问题2）
		var queryBuilder strings.Builder
		queryBuilder.WriteString(`
			INSERT INTO token_quota_logs (
				token, ws_id, email, quota_before, quota_after, quota_change,
				action, request_id, execution_success, execution_error_type, execution_error_message
			) VALUES `)
		
		// 预分配values容量，避免多次扩容
		values := make([]interface{}, 0, len(batch)*11)
		
		for j, log := range batch {
			if j > 0 {
				queryBuilder.WriteString(",")
			}
			queryBuilder.WriteString("(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
			values = append(values,
				log.Token,
				log.WsID,
				log.Email,
				log.QuotaBefore,
				log.QuotaAfter,
				log.QuotaChange,
				log.Action,
				log.RequestID,
				log.ExecutionSuccess,
				log.ExecutionErrorType,
				log.ExecutionErrorMessage,
			)
		}

		// 在事务中执行批量插入
		_, err = tx.ExecContext(ctx, queryBuilder.String(), values...)
		if err != nil {
			return fmt.Errorf("批量插入第%d-%d条日志失败: %w", i+1, end, err)
		}
		
		// 提交事务
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("提交事务失败: %w", err)
		}
	}
	
	return nil
}

// GetQuotaLogs 查询配额日志
func (r *TokenRepository) GetQuotaLogs(ctx context.Context, req *model.QuotaLogsQueryRequest) ([]*model.QuotaLog, int, error) {
	// 设置默认分页参数
	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	// 构建查询条件
	where := "WHERE token = ?"
	args := []interface{}{req.Token}
	
	// 🔥 验证并标准化日期格式（修复问题6）
	if req.StartDate != "" {
		startTime, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return nil, 0, fmt.Errorf("无效的开始日期格式，应为YYYY-MM-DD: %w", err)
		}
		where += " AND created_at >= ?"
		args = append(args, startTime.Format("2006-01-02 00:00:00"))
	}
	if req.EndDate != "" {
		endTime, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return nil, 0, fmt.Errorf("无效的结束日期格式，应为YYYY-MM-DD: %w", err)
		}
		where += " AND created_at <= ?"
		args = append(args, endTime.Format("2006-01-02 23:59:59"))
	}

	// 查询总数
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM token_quota_logs %s", where)
	err := r.db.GetContext(ctx, &total, countQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("查询日志总数失败: %w", err)
	}

	// 查询日志列表
	var logs []*model.QuotaLog
	query := fmt.Sprintf(`
		SELECT * FROM token_quota_logs 
		%s
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`, where)
	args = append(args, pageSize, offset)
	
	err = r.db.SelectContext(ctx, &logs, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("查询日志列表失败: %w", err)
	}

	return logs, total, nil
}

// GetDB 获取数据库连接（供内部服务使用）
func (r *TokenRepository) GetDB() *sqlx.DB {
	return r.db
}

// PingDB 检查数据库连接
func (r *TokenRepository) PingDB(ctx context.Context) error {
	return r.db.PingContext(ctx)
}
