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
	tokenService       *service.TokenService
	rateLimiterService *service.RateLimiterService
	cacheWritePool     *service.CacheWritePool // 🔥 新增：缓存写入池
}

// NewTokenController 创建Token控制器
func NewTokenController(
	tokenService *service.TokenService,
	rateLimiterService *service.RateLimiterService,
	cacheWritePool *service.CacheWritePool,
) *TokenController {
	return &TokenController{
		tokenService:       tokenService,
		rateLimiterService: rateLimiterService,
		cacheWritePool:     cacheWritePool,
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
