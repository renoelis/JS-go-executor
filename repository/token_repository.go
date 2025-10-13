package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
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

	// 插入数据库
	query := `
		INSERT INTO access_tokens (
			ws_id, email, access_token, expires_at, operation_type,
			rate_limit_per_minute, rate_limit_burst, rate_limit_window_seconds
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := r.db.ExecContext(ctx, query,
		req.WsID,
		req.Email,
		accessToken,
		expiresAt,
		req.Operation,
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
		if err.Error() == "sql: no rows in result set" {
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
		if err.Error() == "sql: no rows in result set" {
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

	// 更新数据库
	query := `
		UPDATE access_tokens 
		SET expires_at = ?, operation_type = ?,
			rate_limit_per_minute = ?, rate_limit_burst = ?, rate_limit_window_seconds = ?
		WHERE access_token = ? AND is_active = 1
	`

	_, err = r.db.ExecContext(ctx, query,
		expiresAt,
		req.Operation,
		req.RateLimitPerMinute,
		req.RateLimitBurst,
		req.RateLimitWindowSeconds,
		token,
	)
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

// PingDB 检查数据库连接
func (r *TokenRepository) PingDB(ctx context.Context) error {
	return r.db.PingContext(ctx)
}
