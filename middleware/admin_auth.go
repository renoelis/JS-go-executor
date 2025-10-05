package middleware

import (
	"net/http"

	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminAuthMiddleware 管理员认证中间件
func AdminAuthMiddleware(adminToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取请求头中的Token
		token := extractToken(c)

		if token == "" {
			utils.RespondError(c, http.StatusUnauthorized,
				utils.ErrorTypeAuthentication,
				"缺少管理员访问令牌，请在请求头中提供accessToken",
				nil)
			c.Abort()
			return
		}

		// 验证是否为管理员Token
		if token != adminToken {
			// 记录潜在的安全威胁
			utils.Warn("管理员认证失败",
				zap.String("ip", c.ClientIP()),
				zap.String("token", token[:min(8, len(token))]+"***"),
			)

			utils.RespondError(c, http.StatusForbidden,
				utils.ErrorTypeAuthorization,
				"管理员令牌无效，访问被拒绝",
				nil)
			c.Abort()
			return
		}

		// 标记为管理员请求
		c.Set("isAdmin", true)
		c.Set("adminToken", token)

		utils.Debug("管理员认证成功", zap.String("ip", c.ClientIP()))

		c.Next()
	}
}

// OptionalAdminAuthMiddleware 可选的管理员认证中间件
// 如果提供了管理员token则验证，但不强制要求
func OptionalAdminAuthMiddleware(adminToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := extractToken(c)

		if token != "" && token == adminToken {
			c.Set("isAdmin", true)
			c.Set("adminToken", token)
			utils.Debug("可选管理员认证成功", zap.String("ip", c.ClientIP()))
		}

		c.Next()
	}
}

// IsAdmin 检查是否为管理员
func IsAdmin(c *gin.Context) bool {
	isAdmin, exists := c.Get("isAdmin")
	if !exists {
		return false
	}
	admin, ok := isAdmin.(bool)
	return ok && admin
}

// min 返回两个整数中的较小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
