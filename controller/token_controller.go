package controller

import (
	"net/http"

	"flow-codeblock-go/model"
	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// TokenController Token管理控制器
type TokenController struct {
	tokenService         *service.TokenService
	rateLimiterService   *service.RateLimiterService
	cacheWritePool       *service.CacheWritePool       // 🔥 新增：缓存写入池
	adminToken           string                        // 🔒 管理员令牌（用于内部API调用）
	quotaService         *service.QuotaService         // 🔥 配额服务
	quotaCleanupService  *service.QuotaCleanupService  // 🔥 配额清理服务
}

// NewTokenController 创建Token控制器
func NewTokenController(
	tokenService *service.TokenService,
	rateLimiterService *service.RateLimiterService,
	cacheWritePool *service.CacheWritePool,
	adminToken string,
	quotaService *service.QuotaService,
	quotaCleanupService *service.QuotaCleanupService,
) *TokenController {
	return &TokenController{
		tokenService:        tokenService,
		rateLimiterService:  rateLimiterService,
		cacheWritePool:      cacheWritePool,
		adminToken:          adminToken,
		quotaService:        quotaService,
		quotaCleanupService: quotaCleanupService,
	}
}

// CreateToken 创建Token
func (tc *TokenController) CreateToken(c *gin.Context) {
	var req model.CreateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"请求参数错误: "+err.Error(),
			nil)
		return
	}

	tokenInfo, err := tc.tokenService.CreateToken(c.Request.Context(), &req)
	if err != nil {
		utils.Error("创建Token失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"创建Token失败: "+err.Error(),
			nil)
		return
	}

	utils.RespondSuccess(c, tokenInfo, "Token创建成功")
}

// UpdateToken 更新Token
func (tc *TokenController) UpdateToken(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"缺少token参数",
			nil)
		return
	}

	var req model.UpdateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"请求参数错误: "+err.Error(),
			nil)
		return
	}

	tokenInfo, err := tc.tokenService.UpdateToken(c.Request.Context(), token, &req)
	if err != nil {
		utils.Error("更新Token失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"更新Token失败: "+err.Error(),
			nil)
		return
	}

	utils.RespondSuccess(c, tokenInfo, "Token更新成功")
}

// DeleteToken 删除Token
func (tc *TokenController) DeleteToken(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"缺少token参数",
			nil)
		return
	}

	if err := tc.tokenService.DeleteToken(c.Request.Context(), token); err != nil {
		utils.Error("删除Token失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"删除Token失败: "+err.Error(),
			nil)
		return
	}

	utils.RespondSuccess(c, nil, "Token删除成功")
}

// GetTokenInfo 查询Token信息
func (tc *TokenController) GetTokenInfo(c *gin.Context) {
	var req model.TokenQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"请求参数错误: "+err.Error(),
			nil)
		return
	}

	tokens, err := tc.tokenService.GetTokenInfo(c.Request.Context(), &req)
	if err != nil {
		utils.Error("查询Token失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"查询Token失败: "+err.Error(),
			nil)
		return
	}

	// 使用 map 返回数据和计数
	utils.RespondSuccess(c, map[string]interface{}{
		"tokens": tokens,
		"count":  len(tokens),
	}, "")
}

// GetCacheStats 获取缓存统计
func (tc *TokenController) GetCacheStats(c *gin.Context) {
	stats := tc.tokenService.GetCacheStats()
	utils.RespondSuccess(c, stats, "")
}

// GetRateLimitStats 获取限流统计
func (tc *TokenController) GetRateLimitStats(c *gin.Context) {
	stats := tc.rateLimiterService.GetStats(c.Request.Context())
	writePoolStats := tc.cacheWritePool.GetStats()

	// 使用 map 组合多个统计信息
	utils.RespondSuccess(c, map[string]interface{}{
		"rate_limit": stats,
		"write_pool": writePoolStats,
	}, "")
}

// ClearCache 清空缓存
func (tc *TokenController) ClearCache(c *gin.Context) {
	if err := tc.tokenService.ClearCache(c.Request.Context()); err != nil {
		utils.Error("清空缓存失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"清空缓存失败: "+err.Error(),
			nil)
		return
	}

	utils.RespondSuccess(c, nil, "缓存已清空")
}

// ClearTokenRateLimit 清除指定Token的限流缓存
func (tc *TokenController) ClearTokenRateLimit(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"缺少token参数",
			nil)
		return
	}

	if err := tc.rateLimiterService.ClearTokenCache(c.Request.Context(), token); err != nil {
		utils.Error("清除限流缓存失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"清除限流缓存失败: "+err.Error(),
			nil)
		return
	}

	utils.RespondSuccess(c, nil, "限流缓存已清除")
}

// QueryTokenPublic 公开的Token查询接口（供测试工具使用）
// 🔒 安全说明：此接口不需要前端传递管理员令牌，由后端自动添加
func (tc *TokenController) QueryTokenPublic(c *gin.Context) {
	var req model.TokenQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"请求参数错误: "+err.Error(),
			nil)
		return
	}

	// 🔥 验证参数：支持两种查询方式
	// 方式1：直接通过Token查询
	// 方式2：通过ws_id + email查询
	if req.Token == "" && (req.WsID == "" || req.Email == "") {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"请提供 token，或者同时提供 ws_id 和 email",
			nil)
		return
	}

	// 查询Token信息
	tokens, err := tc.tokenService.GetTokenInfo(c.Request.Context(), &req)
	if err != nil {
		utils.Error("查询Token失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"查询Token失败: "+err.Error(),
			nil)
		return
	}

	// 🔥 返回结果（包装成统一格式）
	result := map[string]interface{}{
		"count":  len(tokens),
		"tokens": tokens,
	}
	utils.RespondSuccess(c, result, "")
}

// GetQuota 查询Token配额
func (tc *TokenController) GetQuota(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
		"缺少token参数",
			nil)
		return
	}

	// 查询Token信息
	tokenInfo, err := tc.tokenService.GetTokenInfo(c.Request.Context(), &model.TokenQueryRequest{
		Token: token,
	})
	if err != nil {
		utils.Error("查询Token失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"查询Token失败: "+err.Error(),
			nil)
		return
	}

	if len(tokenInfo) == 0 {
		utils.RespondError(c, http.StatusNotFound,
			utils.ErrorTypeNotFound,
			"Token不存在",
			nil)
		return
	}

	info := tokenInfo[0]

	// 如果不是配额模式，返回提示
	if !info.NeedsQuotaCheck() {
		utils.RespondSuccess(c, map[string]interface{}{
			"quota_type": info.QuotaType,
			"message":    "该Token为时间模式，无配额限制",
		}, "")
		return
	}

	// 查询剩余配额（从 Redis 获取最新值）
	remainingQuota := 0
	if tc.quotaService != nil {
		quota, err := tc.quotaService.GetRemainingQuota(c.Request.Context(), token)
		if err == nil {
			remainingQuota = quota
		} else if info.RemainingQuota != nil {
			// Redis失败，使用DB值
			remainingQuota = *info.RemainingQuota
		}
	} else if info.RemainingQuota != nil {
		remainingQuota = *info.RemainingQuota
	}

	totalQuota := 0
	if info.TotalQuota != nil {
		totalQuota = *info.TotalQuota
	}

	// 计算已消耗配额
	// 注意：增购后remaining可能大于total，此时consumed应该为0
	consumedQuota := 0
	if totalQuota > remainingQuota {
		consumedQuota = totalQuota - remainingQuota
	}

	utils.RespondSuccess(c, map[string]interface{}{
		"quota_type":       info.QuotaType,
		"total_quota":      totalQuota,
		"remaining_quota":  remainingQuota,
		"consumed_quota":   consumedQuota,
		"quota_synced_at":  info.QuotaSyncedAt,
	}, "")
}

// GetQuotaLogs 查询Token配额消耗日志
func (tc *TokenController) GetQuotaLogs(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"缺少token参数",
			nil)
		return
	}

	var req model.QuotaLogsQueryRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.RespondError(c, http.StatusBadRequest,
			utils.ErrorTypeValidation,
			"请求参数错误: "+err.Error(),
			nil)
		return
	}

	req.Token = token // 设置token

	// 查询日志
	logs, total, err := tc.tokenService.GetQuotaLogs(c.Request.Context(), &req)
	if err != nil {
		utils.Error("查询配额日志失败", zap.Error(err))
		utils.RespondError(c, http.StatusInternalServerError,
			utils.ErrorTypeInternal,
			"查询配额日志失败: "+err.Error(),
			nil)
		return
	}

	// 计算分页信息
	page := req.Page
	if page < 1 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize < 1 || pageSize > 1000 {
		pageSize = 100
	}
	totalPages := (total + pageSize - 1) / pageSize

	utils.RespondSuccess(c, map[string]interface{}{
		"logs":        logs,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": totalPages,
	}, "")
}

// GetQuotaCleanupStats 获取配额清理统计信息
func (tc *TokenController) GetQuotaCleanupStats(c *gin.Context) {
	if tc.quotaCleanupService == nil {
		utils.RespondSuccess(c, map[string]interface{}{
			"enabled": false,
			"message": "配额清理服务未启用",
		}, "")
		return
	}

	stats := tc.quotaCleanupService.GetStats()
	stats["enabled"] = true
	utils.RespondSuccess(c, stats, "")
}

// TriggerQuotaCleanup 手动触发配额清理
func (tc *TokenController) TriggerQuotaCleanup(c *gin.Context) {
	if tc.quotaCleanupService == nil {
		utils.RespondError(c, http.StatusServiceUnavailable,
			utils.ErrorTypeInternal,
			"配额清理服务未启用",
			nil)
		return
	}

	// 异步触发清理
	tc.quotaCleanupService.TriggerCleanup()

	utils.RespondSuccess(c, map[string]interface{}{
		"message": "清理任务已提交，正在后台执行",
	}, "清理任务已启动")
}
