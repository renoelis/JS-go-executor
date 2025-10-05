package middleware

import (
	"net/http"
	"strings"
	"time"

	"flow-codeblock-go/model"
	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// TokenAuthMiddleware Token认证中间件
func TokenAuthMiddleware(tokenService *service.TokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// 1. 从请求头获取Token
		token := extractToken(c)
		if token == "" {
			utils.RespondError(c, http.StatusUnauthorized,
				utils.ErrorTypeAuthentication,
				"缺少访问令牌，请在请求头中提供accessToken",
				nil)
			c.Abort()
			return
		}

		// 2. 验证Token（优先从缓存获取）
		tokenInfo, err := tokenService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			utils.Warn("Token验证失败",
				zap.String("token", utils.MaskToken(token)),
				zap.String("ip", c.ClientIP()),
				zap.Error(err),
			)

			utils.RespondError(c, http.StatusUnauthorized,
				utils.ErrorTypeAuthentication,
				"Token无效: "+err.Error(),
				nil)
			c.Abort()
			return
		}

		// 3. 将Token信息存入上下文
		c.Set("tokenInfo", tokenInfo)
		c.Set("wsId", tokenInfo.WsID)
		c.Set("userEmail", tokenInfo.Email)

		// 4. 标记IP已认证成功（用于智能IP限流）
		MarkIPAuthenticated(c)

		// 记录认证成功日志
		duration := time.Since(startTime)
		utils.Debug("Token认证成功",
			zap.String("ws_id", tokenInfo.WsID),
			zap.String("email", tokenInfo.Email),
			zap.String("token", utils.MaskToken(c.GetHeader("accessToken"))),
			zap.String("ip", c.ClientIP()),
			zap.Duration("duration", duration),
		)

		c.Next()
	}
}

// OptionalAuthMiddleware 可选的Token认证中间件
// 如果提供了Token则验证，但不强制要求
func OptionalAuthMiddleware(tokenService *service.TokenService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.Next()
			return
		}

		tokenInfo, err := tokenService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			// 可选认证失败不阻塞请求
			utils.Debug("可选Token认证失败", zap.Error(err))
			c.Next()
			return
		}

		// 将Token信息存入上下文
		c.Set("tokenInfo", tokenInfo)
		c.Set("wsId", tokenInfo.WsID)
		c.Set("userEmail", tokenInfo.Email)

		c.Next()
	}
}

// extractToken 从请求头提取Token
func extractToken(c *gin.Context) string {
	// 支持多种格式
	if token := c.GetHeader("accessToken"); token != "" {
		return token
	}
	if token := c.GetHeader("access-token"); token != "" {
		return token
	}
	if auth := c.GetHeader("Authorization"); auth != "" {
		// 支持 "Bearer <token>" 格式
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

// GetTokenInfo 从上下文获取Token信息
func GetTokenInfo(c *gin.Context) (*model.TokenInfo, bool) {
	tokenInfoValue, exists := c.Get("tokenInfo")
	if !exists {
		return nil, false
	}
	tokenInfo, ok := tokenInfoValue.(*model.TokenInfo)
	return tokenInfo, ok
}
