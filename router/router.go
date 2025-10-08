package router

import (
	"os"

	"flow-codeblock-go/assets"
	"flow-codeblock-go/config"
	"flow-codeblock-go/controller"
	"flow-codeblock-go/middleware"
	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"github.com/gin-contrib/pprof"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RouterResources 路由资源（需要优雅关闭的组件）
type RouterResources struct {
	SmartIPLimiter  *middleware.SmartIPRateLimiter
	GlobalIPLimiter *middleware.IPRateLimiter
}

// SetupRouter 设置路由
func SetupRouter(
	executorController *controller.ExecutorController,
	tokenController *controller.TokenController,
	tokenService *service.TokenService,
	rateLimiterService *service.RateLimiterService,
	adminToken string,
	cfg *config.Config,
	cacheWritePool *service.CacheWritePool, // 🔥 新增：缓存写入池
) (*gin.Engine, *RouterResources) {
	// 设置Gin模式
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// 基础中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.RequestIDMiddleware()) // 🆕 请求ID中间件（最先执行）
	router.Use(corsMiddleware())

	// 🔥 创建限流器实例（需要在关闭时释放）
	resources := &RouterResources{
		SmartIPLimiter: middleware.NewSmartIPRateLimiter(
			cfg.RateLimit.PreAuthIPRate,
			cfg.RateLimit.PreAuthIPBurst,
			cfg.RateLimit.PostAuthIPRate,
			cfg.RateLimit.PostAuthIPBurst,
		),
		GlobalIPLimiter: middleware.NewIPRateLimiter(
			middleware.RateLimit(cfg.RateLimit.GlobalIPRate),
			cfg.RateLimit.GlobalIPBurst,
		),
	}

	utils.Info("限流器已初始化",
		zap.Int("smart_ip_pre_auth_rate", cfg.RateLimit.PreAuthIPRate),
		zap.Int("smart_ip_post_auth_rate", cfg.RateLimit.PostAuthIPRate),
		zap.Int("global_ip_rate", cfg.RateLimit.GlobalIPRate),
	)

	// 🔥 pprof 调试接口（无需认证，便于性能分析）
	// 用于 Goroutine 泄漏检测、内存分析等
	if cfg.Environment == "development" || os.Getenv("ENABLE_PPROF") == "true" {
		// 注册到 /flow/debug/pprof 路径
		pprofGroup := router.Group("/flow/debug/pprof")
		{
			pprof.RouteRegister(pprofGroup, "")
		}
		utils.Info("pprof 调试接口已启用", zap.String("path", "/flow/debug/pprof"))
	}

	// 全局IP限流中间件工厂函数
	globalIPRateLimiter := func() gin.HandlerFunc {
		return func(c *gin.Context) {
			ip := middleware.GetRealIP(c)
			if !resources.GlobalIPLimiter.GetLimiter(ip).Allow() {
				middleware.HandleRateLimitExceeded(c, cfg.RateLimit.GlobalIPRate, cfg.RateLimit.GlobalIPBurst)
				return
			}
			c.Next()
		}
	}

	// 健康检查路由（无需认证，但有全局 IP 限流）
	router.GET("/health",
		globalIPRateLimiter(),
		executorController.SimpleHealth,
	)
	router.GET("/",
		globalIPRateLimiter(),
		executorController.Root,
	)

	// Flow路由组
	flowGroup := router.Group("/flow")
	{
		// 测试工具页面（无需认证）
		flowGroup.GET("/test-tool",
			globalIPRateLimiter(),
			executorController.TestTool,
		)

		// 🔍 公开的Token查询接口（供测试工具使用，带全局IP限流）
		flowGroup.GET("/query-token",
			globalIPRateLimiter(),
			tokenController.QueryTokenPublic,
		)

		// Ace Editor 静态资源路由
		flowGroup.GET("/assets/ace.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceEditor)
		})
		flowGroup.GET("/assets/mode-javascript.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceModeJavaScript)
		})
		flowGroup.GET("/assets/theme-monokai.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceThemeMonokai)
		})
		flowGroup.GET("/assets/worker-javascript.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceWorkerJavaScript)
		})

		// 代码执行接口（智能 IP 限流 + Token 认证 + Token 限流）
		// 🔥 限流策略：
		//   1. 智能 IP 限流 - 根据认证状态动态切换
		//      - 认证失败的IP：10 QPS（严格）- 防止暴力破解
		//      - 认证成功的IP：200 QPS（宽松）- 防止极端滥用
		//   2. Token 认证 - 验证 Token 有效性，成功后标记IP已认证
		//   3. Token 限流 - 根据 Token 配置限流
		flowGroup.POST("/codeblock",
			middleware.SmartIPRateLimiterHandlerWithInstance(resources.SmartIPLimiter, cfg),
			middleware.TokenAuthMiddleware(tokenService),
			middleware.RateLimiterMiddleware(rateLimiterService),
			executorController.Execute,
		)

		// 管理接口（需要管理员认证）
		adminGroup := flowGroup.Group("")
		adminGroup.Use(middleware.AdminAuthMiddleware(adminToken))
		{
			// 系统状态接口
			adminGroup.GET("/health", executorController.Health)
			adminGroup.GET("/status", executorController.Stats)
			adminGroup.GET("/limits", executorController.Limits)

			// Token管理接口
			adminGroup.POST("/tokens", tokenController.CreateToken)
			adminGroup.PUT("/tokens/:token", tokenController.UpdateToken)
			adminGroup.DELETE("/tokens/:token", tokenController.DeleteToken)
			adminGroup.GET("/tokens", tokenController.GetTokenInfo)

			// 缓存和统计接口
			adminGroup.GET("/cache/stats", tokenController.GetCacheStats)
			adminGroup.GET("/rate-limit/stats", tokenController.GetRateLimitStats)
			adminGroup.DELETE("/cache", tokenController.ClearCache)
			adminGroup.DELETE("/rate-limit/:token", tokenController.ClearTokenRateLimit)

			// 🔥 缓存写入池统计接口
			adminGroup.GET("/cache-write-pool/stats", func(c *gin.Context) {
				stats := cacheWritePool.GetStats()
				utils.RespondSuccess(c, stats, "")
			})
		}
	}

	return router, resources
}

// corsMiddleware CORS中间件
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accessToken")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
