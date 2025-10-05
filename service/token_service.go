package service

import (
	"context"
	"fmt"
	"time"

	"flow-codeblock-go/model"
	"flow-codeblock-go/repository"
	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

// TokenService Token业务逻辑服务
type TokenService struct {
	repo             *repository.TokenRepository
	cache            *CacheService
	writePool        *CacheWritePool // 🔥 新增：异步缓存写入池
	writePoolTimeout time.Duration   // 🔥 写入池提交超时
}

// NewTokenService 创建Token服务
func NewTokenService(
	repo *repository.TokenRepository,
	cache *CacheService,
	writePool *CacheWritePool,
	writePoolTimeout time.Duration,
) *TokenService {
	return &TokenService{
		repo:             repo,
		cache:            cache,
		writePool:        writePool,
		writePoolTimeout: writePoolTimeout,
	}
}

// ValidateToken 验证Token（带缓存）
func (s *TokenService) ValidateToken(ctx context.Context, token string) (*model.TokenInfo, error) {
	// 1. 先查热缓存
	if tokenInfo, found := s.cache.GetHot(token); found {
		// 检查过期
		if tokenInfo.IsExpired() {
			s.cache.Delete(ctx, token) // 传递 Context
			return nil, fmt.Errorf("Token已过期")
		}
		utils.Debug("Token热缓存命中", zap.String("token", utils.MaskToken(token)))
		return tokenInfo, nil
	}

	// 2. 查温缓存（Redis）
	if tokenInfo, found := s.cache.GetWarm(ctx, token); found {
		// 提升到热缓存
		s.cache.SetHot(token, tokenInfo)

		if tokenInfo.IsExpired() {
			s.cache.Delete(ctx, token) // 传递 Context
			return nil, fmt.Errorf("Token已过期")
		}
		utils.Debug("Token温缓存命中", zap.String("token", utils.MaskToken(token)))
		return tokenInfo, nil
	}

	// 3. 查数据库
	tokenInfo, err := s.repo.GetByToken(ctx, token)
	if err != nil {
		return nil, err
	}

	if tokenInfo == nil {
		return nil, fmt.Errorf("Token不存在")
	}

	if !tokenInfo.IsActive {
		return nil, fmt.Errorf("Token已禁用")
	}

	if tokenInfo.IsExpired() {
		return nil, fmt.Errorf("Token已过期")
	}

	// 4. 存入缓存
	s.cache.SetHot(token, tokenInfo)

	// 🔥 使用写入池异步写入温缓存（零丢失方案）
	task := CacheWriteTask{
		TaskType: "token",
		Key:      utils.MaskToken(token),
		Execute: func(ctx context.Context) error {
			return s.cache.SetWarm(ctx, token, tokenInfo)
		},
	}

	// 🔥 提交任务（使用配置的超时时间）
	// 如果超时内队列仍满，仅记录警告但不影响主流程
	if err := s.writePool.Submit(task, s.writePoolTimeout); err != nil {
		utils.Warn("提交缓存写入任务失败",
			zap.String("token", utils.MaskToken(token)),
			zap.Error(err),
		)
	}

	utils.Debug("Token数据库查询", zap.String("token", utils.MaskToken(token)))
	return tokenInfo, nil
}

// CreateToken 创建Token
func (s *TokenService) CreateToken(ctx context.Context, req *model.CreateTokenRequest) (*model.TokenInfo, error) {
	// 验证参数
	if err := s.validateCreateRequest(req); err != nil {
		return nil, err
	}

	// 创建Token
	tokenInfo, err := s.repo.Create(ctx, req)
	if err != nil {
		return nil, err
	}

	// 存入缓存
	s.cache.SetHot(tokenInfo.AccessToken, tokenInfo)

	// 🔥 使用写入池异步写入温缓存
	task := CacheWriteTask{
		TaskType: "token",
		Key:      utils.MaskToken(tokenInfo.AccessToken),
		Execute: func(ctx context.Context) error {
			return s.cache.SetWarm(ctx, tokenInfo.AccessToken, tokenInfo)
		},
	}

	if err := s.writePool.Submit(task, s.writePoolTimeout); err != nil {
		utils.Warn("提交缓存写入任务失败",
			zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
			zap.Error(err),
		)
	}

	utils.Info("Token创建成功",
		zap.String("ws_id", tokenInfo.WsID),
		zap.String("email", tokenInfo.Email),
		zap.String("token", utils.MaskToken(tokenInfo.AccessToken)),
	)

	return tokenInfo, nil
}

// UpdateToken 更新Token
func (s *TokenService) UpdateToken(ctx context.Context, token string, req *model.UpdateTokenRequest) (*model.TokenInfo, error) {
	// 验证参数
	if err := s.validateUpdateRequest(req); err != nil {
		return nil, err
	}

	// 更新Token
	tokenInfo, err := s.repo.Update(ctx, token, req)
	if err != nil {
		return nil, err
	}

	// 清除缓存（传递 Context）
	s.cache.Delete(ctx, token)

	utils.Info("Token更新成功", zap.String("token", utils.MaskToken(token)))
	return tokenInfo, nil
}

// DeleteToken 删除Token
func (s *TokenService) DeleteToken(ctx context.Context, token string) error {
	// 删除Token
	if err := s.repo.Delete(ctx, token); err != nil {
		return err
	}

	// 清除缓存（传递 Context）
	s.cache.Delete(ctx, token)

	utils.Info("Token删除成功", zap.String("token", utils.MaskToken(token)))
	return nil
}

// GetTokenInfo 查询Token信息
func (s *TokenService) GetTokenInfo(ctx context.Context, req *model.TokenQueryRequest) ([]*model.TokenInfo, error) {
	// 场景1：输入token参数 → 只返回该Token的完整信息
	if req.Token != "" {
		tokenInfo, err := s.repo.GetByToken(ctx, req.Token)
		if err != nil {
			return nil, err
		}
		if tokenInfo == nil {
			return []*model.TokenInfo{}, nil
		}
		// Token完整显示
		return []*model.TokenInfo{tokenInfo}, nil
	}

	// 场景2：同时输入ws_id和email → Token完整显示
	if req.WsID != "" && req.Email != "" {
		tokens, err := s.repo.GetByWsID(ctx, req.WsID)
		if err != nil {
			return nil, err
		}
		// 过滤出匹配email的token
		var result []*model.TokenInfo
		for _, token := range tokens {
			if token.Email == req.Email {
				result = append(result, token)
			}
		}
		// Token完整显示
		return result, nil
	}

	// 场景3：只输入ws_id → Token脱敏显示
	if req.WsID != "" {
		tokens, err := s.repo.GetByWsID(ctx, req.WsID)
		if err != nil {
			return nil, err
		}
		// Token脱敏
		return s.maskTokens(tokens), nil
	}

	// 场景4：只输入email → Token脱敏显示
	if req.Email != "" {
		tokens, err := s.repo.GetByEmail(ctx, req.Email)
		if err != nil {
			return nil, err
		}
		// Token脱敏
		return s.maskTokens(tokens), nil
	}

	return nil, fmt.Errorf("必须提供ws_id、email或token参数")
}

// maskTokens 对Token列表进行脱敏处理
func (s *TokenService) maskTokens(tokens []*model.TokenInfo) []*model.TokenInfo {
	if len(tokens) == 0 {
		return tokens
	}

	result := make([]*model.TokenInfo, len(tokens))
	for i, token := range tokens {
		// 创建副本，避免修改原始数据
		maskedToken := *token
		// 脱敏Token（只显示前15位+***）
		maskedToken.AccessToken = utils.MaskToken(token.AccessToken)
		result[i] = &maskedToken
	}
	return result
}

// validateCreateRequest 验证创建请求
func (s *TokenService) validateCreateRequest(req *model.CreateTokenRequest) error {
	if req.WsID == "" || req.Email == "" || req.Operation == "" {
		return fmt.Errorf("ws_id、email和operation参数不能为空")
	}

	if req.Operation == "add" && (req.Days == nil || *req.Days <= 0) {
		return fmt.Errorf("operation为add时，days参数必须为正整数")
	}

	if req.Operation == "set" && req.SpecificDate == "" {
		return fmt.Errorf("operation为set时，specific_date参数不能为空")
	}

	return nil
}

// validateUpdateRequest 验证更新请求
func (s *TokenService) validateUpdateRequest(req *model.UpdateTokenRequest) error {
	if req.Operation == "" {
		return fmt.Errorf("operation参数不能为空")
	}

	if req.Operation == "set" && req.SpecificDate == "" {
		return fmt.Errorf("operation为set时，specific_date参数不能为空")
	}

	return nil
}

// GetCacheStats 获取缓存统计信息
func (s *TokenService) GetCacheStats() map[string]interface{} {
	return s.cache.GetStats()
}

// ClearCache 清空缓存
func (s *TokenService) ClearCache(ctx context.Context) error {
	return s.cache.ClearAll(ctx)
}

// PingDB 检查数据库连接
func (s *TokenService) PingDB(ctx context.Context) error {
	return s.repo.PingDB(ctx)
}

// PingRedis 检查Redis连接
func (s *TokenService) PingRedis(ctx context.Context) error {
	return s.cache.PingRedis(ctx)
}
