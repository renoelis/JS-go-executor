package service

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/model"
	"flow-codeblock-go/repository"
	"flow-codeblock-go/utils"

	"github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// UpdateScriptResult 更新结果
type UpdateScriptResult struct {
	NewVersion  int  // 新版本号
	CodeChanged bool // 代码是否变化
	PrevVersion int  // 更新前版本号
}

// ScriptService 脚本管理服务
type ScriptService struct {
	db        *sqlx.DB
	redis     *redis.Client
	cfg       *config.Config
	repo      *repository.ScriptRepository
	tokenRepo *repository.TokenRepository
	executor  *JSExecutor

	safeDecrScript *redis.Script
}

var (
	// ErrScriptNotFound 用于标记脚本不存在的场景
	ErrScriptNotFound = errors.New("script not found")
	// ErrVersionNotFound 用于标记脚本版本不存在的场景
	ErrVersionNotFound = errors.New("script version not found")
)

// codeScriptCache 用于在缓存中携带 Token（CodeScript.Token 的 json:"-" 无法直接序列化）
type codeScriptCache struct {
	model.CodeScript
	TokenForCache string `json:"token"`
}

// NewScriptService 创建脚本服务
func NewScriptService(db *sqlx.DB, redisClient *redis.Client, cfg *config.Config, repo *repository.ScriptRepository, tokenRepo *repository.TokenRepository, executor *JSExecutor) *ScriptService {
	return &ScriptService{
		db:        db,
		redis:     redisClient,
		cfg:       cfg,
		repo:      repo,
		tokenRepo: tokenRepo,
		executor:  executor,
		safeDecrScript: redis.NewScript(`
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
if redis.call('EXISTS', key) == 0 then
  return -1
end
local val = tonumber(redis.call('GET', key) or "0")
if val <= 0 then
  if ttl and ttl > 0 then redis.call('EXPIRE', key, ttl) end
  return val
end
local newVal = redis.call('DECR', key)
if ttl and ttl > 0 then redis.call('EXPIRE', key, ttl) end
return newVal
`),
	}
}

// CreateScript 上传脚本
func (s *ScriptService) CreateScript(ctx context.Context, tokenInfo *model.TokenInfo, codeBase64, description string, ipWhitelist []string) (*model.CodeScript, error) {
	if tokenInfo == nil {
		return nil, fmt.Errorf("Token 信息缺失")
	}

	if err := s.checkBase64Length(codeBase64); err != nil {
		return nil, err
	}

	codeBytes, err := base64.StdEncoding.DecodeString(codeBase64)
	if err != nil {
		return nil, fmt.Errorf("代码Base64解码失败: %w", err)
	}
	if len(codeBytes) > s.cfg.Executor.MaxCodeLength {
		return nil, fmt.Errorf("代码长度超出限制: %d > %d", len(codeBytes), s.cfg.Executor.MaxCodeLength)
	}

	// 代码安全校验
	if s.executor != nil {
		if err := s.executor.validateCodeWithCache(string(codeBytes)); err != nil {
			return nil, fmt.Errorf("代码安全校验失败: %w", err)
		}
	}

	parsedWhitelist, normalizedWhitelist, err := utils.ValidateIPWhitelist(ipWhitelist)
	if err != nil {
		return nil, fmt.Errorf("IP白名单无效: %w", err)
	}

	codeHash := sha256.Sum256(codeBytes)
	script := &model.CodeScript{
		ID:                utils.GenerateBase62UUID(),
		Token:             tokenInfo.AccessToken,
		WsID:              tokenInfo.WsID,
		Email:             tokenInfo.Email,
		Description:       description,
		CodeBase64:        codeBase64,
		CodeHash:          hex.EncodeToString(codeHash[:]),
		CodeLength:        len(codeBytes),
		Version:           1,
		IPWhitelist:       model.JSONStringArray(normalizedWhitelist),
		ParsedIPWhitelist: parsedWhitelist,
	}

	// 🔁 同一Token内按代码哈希查重，避免重复上传
	if existing, err := s.repo.GetScriptByHash(ctx, script.Token, script.CodeHash); err == nil && existing != nil && existing.ID != "" {
		return nil, fmt.Errorf("该代码已存在，script_id=%s", existing.ID)
	} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	lockedToken, err := s.lockToken(ctx, tx, tokenInfo.AccessToken)
	if err != nil {
		return nil, err
	}

	// 事务内再查一次，避免并发窗口产生重复脚本
	if existing, err := s.repo.GetScriptByHashTx(ctx, tx, script.Token, script.CodeHash); err == nil && existing != nil && existing.ID != "" {
		return nil, fmt.Errorf("该代码已存在，script_id=%s", existing.ID)
	} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	maxScripts := s.getMaxScripts(lockedToken)
	currentScripts := 0
	if lockedToken.CurrentScripts != nil {
		currentScripts = *lockedToken.CurrentScripts
	}
	if currentScripts >= maxScripts {
		return nil, fmt.Errorf("脚本数量已达上限(%d)，请删除后再创建", maxScripts)
	}

	if err := s.repo.CreateScriptTx(ctx, tx, script); err != nil {
		// 唯一约束兜底：并发情况下将数据库错误转为友好提示
		if mysqlErr, ok := err.(*mysql.MySQLError); ok && mysqlErr.Number == 1062 {
			if existing, lookupErr := s.repo.GetScriptByHash(ctx, script.Token, script.CodeHash); lookupErr == nil && existing != nil && existing.ID != "" {
				return nil, fmt.Errorf("该代码已存在，script_id=%s", existing.ID)
			}
			return nil, fmt.Errorf("该代码已存在")
		}
		return nil, err
	}

	version := &model.CodeScriptVersion{
		ScriptID:    script.ID,
		Version:     1,
		CodeBase64:  codeBase64,
		CodeHash:    script.CodeHash,
		CodeLength:  script.CodeLength,
		Description: description,
	}
	if err := s.repo.CreateVersionTx(ctx, tx, version); err != nil {
		return nil, err
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE access_tokens 
		SET current_scripts = COALESCE(current_scripts, 0) + 1 
		WHERE access_token = ?
	`, tokenInfo.AccessToken); err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	now := utils.Now()
	script.CreatedAt = now
	script.UpdatedAt = now
	s.updateCacheAfterCreate(ctx, script)
	return script, nil
}

// UpdateScript 更新脚本/回滚
func (s *ScriptService) UpdateScript(ctx context.Context, tokenInfo *model.TokenInfo, scriptID string, codeBase64 *string, description string, rollbackVersion int, ipWhitelistUpdate *[]string) (*UpdateScriptResult, error) {
	if err := utils.ValidateScriptID(scriptID); err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err := s.lockToken(ctx, tx, tokenInfo.AccessToken); err != nil {
		return nil, err
	}

	script, err := s.repo.GetScriptForUpdate(ctx, tx, scriptID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("脚本不存在")
		}
		return nil, err
	}

	if script.Token != tokenInfo.AccessToken {
		return nil, fmt.Errorf("无权操作该脚本")
	}

	if rollbackVersion > 0 && rollbackVersion >= script.Version {
		return nil, fmt.Errorf("回滚版本必须小于当前版本")
	}

	targetBase64 := script.CodeBase64
	targetHash := script.CodeHash
	targetLength := script.CodeLength
	targetDesc := description
	codeChanged := false

	if rollbackVersion > 0 {
		versionRec, err := s.getVersionTx(ctx, tx, scriptID, rollbackVersion)
		if err != nil {
			return nil, err
		}
		targetBase64 = versionRec.CodeBase64
		targetHash = versionRec.CodeHash
		targetLength = versionRec.CodeLength
		if targetDesc == "" {
			targetDesc = versionRec.Description
		}
		codeChanged = true
	} else if codeBase64 != nil {
		if err := s.checkBase64Length(*codeBase64); err != nil {
			return nil, err
		}
		codeBytes, err := base64.StdEncoding.DecodeString(*codeBase64)
		if err != nil {
			return nil, fmt.Errorf("代码Base64解码失败: %w", err)
		}
		if len(codeBytes) > s.cfg.Executor.MaxCodeLength {
			return nil, fmt.Errorf("代码长度超出限制: %d > %d", len(codeBytes), s.cfg.Executor.MaxCodeLength)
		}
		if s.executor != nil {
			if err := s.executor.validateCodeWithCache(string(codeBytes)); err != nil {
				return nil, fmt.Errorf("代码安全校验失败: %w", err)
			}
		}
		hash := sha256.Sum256(codeBytes)
		targetHash = hex.EncodeToString(hash[:])
		targetBase64 = *codeBase64
		targetLength = len(codeBytes)
		if targetHash != script.CodeHash {
			codeChanged = true
		}
	}

	if targetDesc == "" {
		targetDesc = script.Description
	}

	var parsedIPWhitelist []utils.ParsedIPRule
	if ipWhitelistUpdate != nil {
		var normalizedWhitelist []string
		parsedIPWhitelist, normalizedWhitelist, err = utils.ValidateIPWhitelist(*ipWhitelistUpdate)
		if err != nil {
			return nil, fmt.Errorf("IP白名单无效: %w", err)
		}
		script.IPWhitelist = model.JSONStringArray(normalizedWhitelist)
	}

	// 🔁 同一Token内按代码哈希查重，避免更新到已存在的脚本代码
	if codeChanged {
		if existing, err := s.repo.GetScriptByHashTx(ctx, tx, script.Token, targetHash); err == nil && existing != nil && existing.ID != "" && existing.ID != script.ID {
			return nil, fmt.Errorf("该代码已存在，script_id=%s", existing.ID)
		} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return nil, err
		}
	}

	prevVersion := script.Version
	if codeChanged {
		script.Version = script.Version + 1
		script.CodeBase64 = targetBase64
		script.CodeHash = targetHash
		script.CodeLength = targetLength
	}
	script.Description = targetDesc

	if err := s.repo.UpdateScriptTx(ctx, tx, script); err != nil {
		// 唯一约束兜底：并发情况下将数据库错误转为友好提示
		if mysqlErr, ok := err.(*mysql.MySQLError); ok && mysqlErr.Number == 1062 {
			if existing, lookupErr := s.repo.GetScriptByHashTx(ctx, tx, script.Token, targetHash); lookupErr == nil && existing != nil && existing.ID != "" && existing.ID != script.ID {
				return nil, fmt.Errorf("该代码已存在，script_id=%s", existing.ID)
			}
			return nil, fmt.Errorf("该代码已存在")
		}
		return nil, err
	}

	if codeChanged {
		version := &model.CodeScriptVersion{
			ScriptID:    scriptID,
			Version:     script.Version,
			CodeBase64:  targetBase64,
			CodeHash:    targetHash,
			CodeLength:  targetLength,
			Description: targetDesc,
		}
		if err := s.repo.CreateVersionTx(ctx, tx, version); err != nil {
			return nil, err
		}
		if err := s.repo.TrimOldVersionsTx(ctx, tx, scriptID, s.cfg.Script.MaxScriptVersions); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	if ipWhitelistUpdate != nil {
		script.ParsedIPWhitelist = parsedIPWhitelist
	} else {
		script.ParsedIPWhitelist = utils.ParseIPWhitelist(script.IPWhitelist)
	}

	s.clearCacheAfterUpdate(ctx, scriptID, script.Token)
	return &UpdateScriptResult{
		NewVersion:  script.Version,
		CodeChanged: codeChanged,
		PrevVersion: prevVersion,
	}, nil
}

// DeleteScript 删除脚本
func (s *ScriptService) DeleteScript(ctx context.Context, tokenInfo *model.TokenInfo, scriptID string) error {
	if err := utils.ValidateScriptID(scriptID); err != nil {
		return err
	}

	tx, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	lockedToken, err := s.lockToken(ctx, tx, tokenInfo.AccessToken)
	if err != nil {
		return err
	}

	script, err := s.repo.GetScriptForUpdate(ctx, tx, scriptID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("脚本不存在")
		}
		return err
	}

	if script.Token != tokenInfo.AccessToken {
		return fmt.Errorf("无权操作该脚本")
	}

	if _, err := tx.ExecContext(ctx, `
		UPDATE access_tokens 
		SET current_scripts = GREATEST(COALESCE(current_scripts, 0) - 1, 0)
		WHERE access_token = ?
	`, lockedToken.AccessToken); err != nil {
		return err
	}

	if err := s.repo.DeleteScriptTx(ctx, tx, scriptID); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	s.clearCacheAfterDelete(ctx, scriptID, tokenInfo.AccessToken)
	return nil
}

// GetScriptWithCache 获取脚本（含缓存）
func (s *ScriptService) GetScriptWithCache(ctx context.Context, scriptID string) (*model.CodeScript, error) {
	var cached codeScriptCache
	cacheKey := s.cfg.Script.ScriptCachePrefix + scriptID
	if s.redis != nil {
		if data, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil {
			if json.Unmarshal(data, &cached) == nil && cached.CodeBase64 != "" && cached.TokenForCache != "" {
				cached.CodeScript.Token = cached.TokenForCache
				cached.CodeScript.ParsedIPWhitelist = utils.ParseIPWhitelist(cached.IPWhitelist)
				return &cached.CodeScript, nil
			}
		}
	}

	result, err := s.repo.GetScriptByID(ctx, scriptID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrScriptNotFound
		}
		return nil, err
	}
	result.ParsedIPWhitelist = utils.ParseIPWhitelist(result.IPWhitelist)

	if s.redis != nil {
		cachePayload := codeScriptCache{
			CodeScript:    *result,
			TokenForCache: result.Token,
		}
		if data, err := json.Marshal(cachePayload); err == nil {
			ttl := time.Duration(s.cfg.Script.ScriptCacheTTL) * time.Second
			s.redis.Set(ctx, cacheKey, data, ttl)
		}
	}

	return result, nil
}

// GetVersionWithCache 获取历史版本（按需缓存）
func (s *ScriptService) GetVersionWithCache(ctx context.Context, scriptID string, version int) (*model.CodeScriptVersion, error) {
	var v model.CodeScriptVersion
	cacheKey := fmt.Sprintf("%sversion:%s:%d", s.cfg.Script.ScriptCachePrefix, scriptID, version)
	if s.redis != nil {
		if data, err := s.redis.Get(ctx, cacheKey).Bytes(); err == nil {
			if json.Unmarshal(data, &v) == nil {
				return &v, nil
			}
		}
	}

	dbVersion, err := s.repo.GetVersion(ctx, scriptID, version)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrVersionNotFound
		}
		return nil, err
	}

	if s.redis != nil {
		if data, err := json.Marshal(dbVersion); err == nil {
			ttl := time.Duration(s.cfg.Script.ScriptCacheTTL) * time.Second
			s.redis.Set(ctx, cacheKey, data, ttl)
		}
	}

	return dbVersion, nil
}

// GetScriptCount 获取脚本数量（带缓存和异常值兜底）
func (s *ScriptService) GetScriptCount(ctx context.Context, token string, maxScripts int) (int, error) {
	if s.redis != nil {
		countKey := s.cfg.Script.ScriptCachePrefix + "count:" + token
		count, err := s.redis.Get(ctx, countKey).Int()
		if err == nil {
			maxReasonable := maxScripts * 2
			if maxScripts <= 0 || maxReasonable < 100 {
				maxReasonable = 100
			}
			if count >= 0 && count <= maxReasonable {
				return count, nil
			}
		}
	}

	var dbCount int
	if err := s.db.GetContext(ctx, &dbCount, `SELECT COUNT(*) FROM code_scripts WHERE token = ?`, token); err != nil {
		return 0, err
	}

	if s.redis != nil {
		ttl := time.Duration(s.cfg.Script.ScriptCacheTTL) * time.Second
		_ = s.redis.Set(ctx, s.cfg.Script.ScriptCachePrefix+"count:"+token, dbCount, ttl).Err()
	}

	return dbCount, nil
}

// ListScripts 列表查询
func (s *ScriptService) ListScripts(ctx context.Context, token string, page, size int, sort, order, keyword string) ([]model.CodeScript, int64, error) {
	return s.repo.ListScripts(ctx, token, page, size, sort, order, keyword)
}

// ListVersionNumbers 查询版本号列表
func (s *ScriptService) ListVersionNumbers(ctx context.Context, scriptID string) ([]int, error) {
	return s.repo.ListVersionNumbers(ctx, scriptID)
}

// ListVersions 查询版本详情列表（targetVersion>0时只返回指定版本）
func (s *ScriptService) ListVersions(ctx context.Context, scriptID string, targetVersion int) ([]model.CodeScriptVersion, error) {
	if targetVersion > 0 {
		v, err := s.GetVersionWithCache(ctx, scriptID, targetVersion)
		if err != nil {
			return nil, err
		}
		return []model.CodeScriptVersion{*v}, nil
	}
	return s.repo.ListVersions(ctx, scriptID, 0)
}

// 获取版本（事务内）
func (s *ScriptService) getVersionTx(ctx context.Context, tx *sqlx.Tx, scriptID string, version int) (*model.CodeScriptVersion, error) {
	var v model.CodeScriptVersion
	err := tx.GetContext(ctx, &v, `
		SELECT id, script_id, version, code_base64, code_hash, code_length, description, created_at
		FROM code_script_versions
		WHERE script_id = ? AND version = ?
	`, scriptID, version)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("版本 %d 不存在或已清理", version)
		}
		return nil, err
	}
	return &v, nil
}

func (s *ScriptService) checkBase64Length(codeBase64 string) error {
	maxBase64Length := s.cfg.Executor.MaxCodeLength*4/3 + 4
	if len(codeBase64) > maxBase64Length {
		return fmt.Errorf("代码 Base64 编码后过长: %d > %d", len(codeBase64), maxBase64Length)
	}
	return nil
}

func (s *ScriptService) getMaxScripts(tokenInfo *model.TokenInfo) int {
	if tokenInfo != nil && tokenInfo.MaxScripts != nil && *tokenInfo.MaxScripts > 0 {
		return *tokenInfo.MaxScripts
	}
	return 50
}

func (s *ScriptService) lockToken(ctx context.Context, tx *sqlx.Tx, token string) (*model.TokenInfo, error) {
	var tokenInfo model.TokenInfo
	err := tx.GetContext(ctx, &tokenInfo, `SELECT * FROM access_tokens WHERE access_token = ? FOR UPDATE`, token)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrTokenNotFound
		}
		return nil, err
	}
	if !tokenInfo.IsActive {
		return nil, ErrTokenDisabled
	}
	if tokenInfo.IsExpired() {
		return nil, ErrTokenExpired
	}
	return &tokenInfo, nil
}

func (s *ScriptService) updateCacheAfterCreate(ctx context.Context, script *model.CodeScript) {
	if s.redis == nil {
		return
	}
	ttl := time.Duration(s.cfg.Script.ScriptCacheTTL) * time.Second
	cacheKey := s.cfg.Script.ScriptCachePrefix + script.ID
	tokenKey := s.cfg.Script.ScriptCachePrefix + "token:" + script.Token
	countKey := s.cfg.Script.ScriptCachePrefix + "count:" + script.Token
	cachePayload := codeScriptCache{
		CodeScript:    *script,
		TokenForCache: script.Token,
	}
	data, err := json.Marshal(cachePayload)
	if err != nil {
		utils.Warn("脚本缓存序列化失败", zap.Error(err))
		return
	}
	cacheCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	pipe := s.redis.TxPipeline()
	pipe.Set(cacheCtx, cacheKey, data, ttl)
	pipe.SAdd(cacheCtx, tokenKey, script.ID)
	pipe.Expire(cacheCtx, tokenKey, ttl)
	pipe.Incr(cacheCtx, countKey)
	pipe.Expire(cacheCtx, countKey, ttl)
	if _, err := pipe.Exec(cacheCtx); err != nil {
		utils.Warn("脚本缓存写入失败，触发重建", zap.Error(err))
		// 防止部分写入：剔除当前脚本 ID 的集合项，清理脚本缓存，计数走重建
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 2*time.Second)
		_ = s.redis.SRem(cleanupCtx, tokenKey, script.ID).Err()
		_ = s.redis.Del(cleanupCtx, cacheKey).Err()
		cleanupCancel()
		go s.rebuildScriptCount(context.Background(), script.Token)
	}
}

func (s *ScriptService) clearCacheAfterUpdate(ctx context.Context, scriptID, token string) {
	if s.redis == nil {
		return
	}
	s.redis.Del(ctx, s.cfg.Script.ScriptCachePrefix+scriptID)
	s.deleteVersionCaches(ctx, scriptID)
	utils.Debug("缓存已清理（更新）", zap.String("script_id", scriptID), zap.String("token", utils.MaskToken(token)))
}

func (s *ScriptService) clearCacheAfterDelete(ctx context.Context, scriptID, token string) {
	if s.redis == nil {
		return
	}
	countTTL := s.cfg.Script.ScriptCacheTTL
	pipe := s.redis.Pipeline()
	pipe.Del(ctx, s.cfg.Script.ScriptCachePrefix+scriptID)
	pipe.SRem(ctx, s.cfg.Script.ScriptCachePrefix+"token:"+token, scriptID)
	if _, err := pipe.Exec(ctx); err != nil {
		utils.Warn("删除脚本缓存失败", zap.Error(err))
	}

	if s.safeDecrScript != nil {
		if val, err := s.safeDecrScript.Run(ctx, s.redis, []string{s.cfg.Script.ScriptCachePrefix + "count:" + token}, countTTL).Int(); err != nil || val < 0 {
			go s.rebuildScriptCount(context.Background(), token)
		}
	}

	s.deleteVersionCaches(ctx, scriptID)
}

func (s *ScriptService) deleteVersionCaches(ctx context.Context, scriptID string) {
	if s.redis == nil {
		return
	}
	pattern := s.cfg.Script.ScriptCachePrefix + "version:" + scriptID + ":*"
	iter := s.redis.Scan(ctx, 0, pattern, 100).Iterator()
	keys := make([]string, 0)
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if len(keys) > 0 {
		s.redis.Del(ctx, keys...)
	}
}

func (s *ScriptService) rebuildScriptCount(ctx context.Context, token string) {
	if s.redis == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	var dbCount int
	if err := s.db.GetContext(ctx, &dbCount, `SELECT COUNT(*) FROM code_scripts WHERE token = ?`, token); err != nil {
		utils.Warn("重建脚本计数失败", zap.Error(err))
		return
	}
	ttl := time.Duration(s.cfg.Script.ScriptCacheTTL) * time.Second
	if err := s.redis.Set(ctx, s.cfg.Script.ScriptCachePrefix+"count:"+token, dbCount, ttl).Err(); err != nil {
		utils.Warn("脚本计数缓存重建失败", zap.Error(err))
	}
}

// ClearCachesAfterBulkDelete 批量删除脚本后清理缓存并重建计数
func (s *ScriptService) ClearCachesAfterBulkDelete(ctx context.Context, tokenScripts map[string][]string) {
	if s == nil || s.redis == nil || len(tokenScripts) == 0 {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	for token, scriptIDs := range tokenScripts {
		if len(scriptIDs) == 0 {
			continue
		}

		pipe := s.redis.Pipeline()
		for _, scriptID := range scriptIDs {
			pipe.Del(ctx, s.cfg.Script.ScriptCachePrefix+scriptID)
			pipe.SRem(ctx, s.cfg.Script.ScriptCachePrefix+"token:"+token, scriptID)
		}
		if _, err := pipe.Exec(ctx); err != nil {
			utils.Warn("批量删除脚本缓存失败",
				zap.String("token", utils.MaskToken(token)),
				zap.Int("script_count", len(scriptIDs)),
				zap.Error(err))
		}

		for _, scriptID := range scriptIDs {
			s.deleteVersionCaches(ctx, scriptID)
		}

		s.rebuildScriptCount(ctx, token)
	}
}
