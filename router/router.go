package router

import (
	"os"
	"path"
	"strings"

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
	SmartIPLimiter    *middleware.SmartIPRateLimiter
	GlobalIPLimiter   *middleware.IPRateLimiter
	ScriptExecLimiter *middleware.ScriptExecIPRateLimiter
}

// SetupRouter 设置路由
func SetupRouter(
	executorController *controller.ExecutorController,
	tokenController *controller.TokenController,
	statsController *controller.StatsController, // 🆕 统计控制器
	scriptController *controller.ScriptController,
	tokenService *service.TokenService,
	rateLimiterService *service.RateLimiterService,
	adminToken string,
	cfg *config.Config,
	cacheWritePool *service.CacheWritePool, // 🔥 新增：缓存写入池
	scriptExecLimiter *middleware.ScriptExecIPRateLimiter,
) (*gin.Engine, *RouterResources) {
	// 设置Gin模式
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.SetTrustedProxies([]string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.1/8",
	})

	// 基础中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.RequestIDMiddleware()) // 🆕 请求ID中间件（最先执行）

	// 🔥 请求体大小限制（DoS 防护 - 第一道防线）
	maxRequestBodyBytes := int64(cfg.Server.MaxRequestBodyMB) * 1024 * 1024
	router.Use(middleware.RequestBodyLimitMiddleware(maxRequestBodyBytes))
	utils.Info("请求体大小限制已启用",
		zap.Int("max_mb", cfg.Server.MaxRequestBodyMB),
		zap.Int64("max_bytes", maxRequestBodyBytes))

	router.Use(corsMiddleware(cfg.Server.AllowedOrigins)) // 🔒 智能 CORS 控制

	// 🔥 Gzip 压缩中间件（节省带宽 70%+）
	router.Use(middleware.GzipMiddleware())
	utils.Info("Gzip 压缩已启用", zap.String("level", "best_speed"))

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
		ScriptExecLimiter: scriptExecLimiter,
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

		// 🔐 Token查询验证码相关接口（供测试工具使用，带全局IP限流）
		flowGroup.POST("/token/request-verify-code",
			globalIPRateLimiter(),
			tokenController.RequestVerifyCode,
		)
		flowGroup.POST("/token/verify-and-query",
			globalIPRateLimiter(),
			tokenController.VerifyCodeAndQueryToken,
		)

		// 静态资源路由
		flowGroup.GET("/assets/ace.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceEditor)
		})
		flowGroup.GET("/assets/mode-javascript.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceModeJavaScript)
		})
		flowGroup.GET("/assets/mode-json.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceModeJSON)
		})
		flowGroup.GET("/assets/theme-monokai.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceThemeMonokai)
		})
		flowGroup.GET("/assets/worker-javascript.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceWorkerJavaScript)
		})
		flowGroup.GET("/assets/worker-json.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceWorkerJSON)
		})
		flowGroup.GET("/assets/ext-searchbox.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.String(200, assets.AceExtSearchbox)
		})
		// 🆕 Logo 图片路由（支持动态配置）
		// 优先级：CUSTOM_LOGO_PATH > 默认本地文件
		flowGroup.GET("/assets/logo.png", func(c *gin.Context) {
			// 检查是否配置了自定义本地Logo路径
			if customLogoPath := cfg.TestTool.CustomLogoPath; customLogoPath != "" {
				c.File(customLogoPath)
				return
			}
			// 使用默认Logo
			c.File("assets/elements/LOGO.png")
		})

		// 🔐 验证码功能JS模块
		flowGroup.GET("/assets/verify-code.js", func(c *gin.Context) {
			c.Header("Content-Type", "application/javascript; charset=utf-8")
			c.File("templates/verify-code.js")
		})

		// 脚本管理前端资源
		flowGroup.GET("/assets/script-manager/*filepath", func(c *gin.Context) {
			safePath := path.Clean(path.Join("assets/script-manager", strings.TrimPrefix(c.Param("filepath"), "/")))
			if !strings.HasPrefix(safePath, "assets/script-manager") {
				c.AbortWithStatus(403)
				return
			}
			c.File(safePath)
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

		// 脚本管理接口组（需Token认证 + 智能IP限流 + Token限流）
		if scriptController != nil {
			scriptGroup := flowGroup.Group("/scripts")
			scriptGroup.Use(
				middleware.SmartIPRateLimiterHandlerWithInstance(resources.SmartIPLimiter, cfg),
				middleware.TokenAuthMiddleware(tokenService),
				middleware.RateLimiterMiddleware(rateLimiterService),
			)
			{
				scriptGroup.POST("", scriptController.UploadScript)
				scriptGroup.PUT("/:scriptId", scriptController.UpdateScript)
				scriptGroup.DELETE("/:scriptId", scriptController.DeleteScript)
				scriptGroup.GET("", scriptController.ListScripts)
				scriptGroup.GET("/:scriptId/stats", scriptController.GetScriptExecutionStats)
				scriptGroup.GET("/:scriptId", scriptController.GetScript)
			}

			// 无Token脚本执行接口（使用脚本绑定的Token）
			flowGroup.GET("/codeblock/:scriptId",
				middleware.ScriptExecIPRateLimiterMiddleware(resources.ScriptExecLimiter, cfg),
				scriptController.ExecuteScript,
			)
			flowGroup.POST("/codeblock/:scriptId",
				middleware.ScriptExecIPRateLimiterMiddleware(resources.ScriptExecLimiter, cfg),
				scriptController.ExecuteScript,
			)
		}

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

			// 🔥 配额查询接口
			adminGroup.GET("/tokens/:token/quota", tokenController.GetQuota)
			adminGroup.GET("/tokens/:token/quota/logs", tokenController.GetQuotaLogs)

			// 🔥 配额清理接口
			adminGroup.GET("/quota/cleanup/stats", tokenController.GetQuotaCleanupStats)
			adminGroup.POST("/quota/cleanup/trigger", tokenController.TriggerQuotaCleanup)

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

			// 🆕 统计接口
			if statsController != nil {
				adminGroup.GET("/stats/modules", statsController.GetModuleStats)
				adminGroup.GET("/stats/modules/:module_name", statsController.GetModuleDetailStats)
				adminGroup.GET("/stats/users", statsController.GetUserActivityStats)
			}
			if scriptController != nil {
				adminGroup.GET("/scripts/stats", scriptController.GetGlobalScriptStats)
			}

			// 脚本/统计清理接口
			if scriptController != nil {
				adminGroup.GET("/scripts/cleanup/stats", scriptController.GetScriptCleanupStats)
				adminGroup.POST("/scripts/cleanup/trigger", scriptController.TriggerScriptCleanup)
			}
		}
	}

	return router, resources
}

// corsMiddleware 智能 CORS 中间件
// 🔒 安全策略（优先级从高到低）：
// 1. 无 Origin 头（服务端调用）：✅ 始终允许
// 2. 同域请求（Origin 与服务器域名相同）：✅ 始终允许
// 3. 白名单域名（Origin 在 ALLOWED_ORIGINS 中）：✅ 允许
// 4. 其他跨域请求：❌ 拒绝
func corsMiddleware(allowedOrigins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// 1. 服务端调用（无 Origin 头）：直接允许
		if origin == "" {
			c.Next()
			return
		}

		// 2. 判断是否允许该 Origin
		allowed := false

		// 2.1 检查是否为同域请求（始终允许，无论是否有白名单）
		requestHost := c.Request.Host
		if origin == "http://"+requestHost || origin == "https://"+requestHost {
			allowed = true
		}

		// 2.2 如果不是同域，检查白名单
		if !allowed && len(allowedOrigins) > 0 {
			for _, allowedOrigin := range allowedOrigins {
				if origin == allowedOrigin {
					allowed = true
					break
				}
			}
		}

		if allowed {
			// ✅ 允许的 Origin：设置 CORS 响应头
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accessToken")
			c.Header("Access-Control-Allow-Credentials", "true")

			if c.Request.Method == "OPTIONS" {
				c.AbortWithStatus(204)
				return
			}
			c.Next()
		} else {
			// ❌ 不允许的跨域请求：拒绝
			utils.Warn("拒绝跨域请求",
				zap.String("origin", origin),
				zap.String("host", c.Request.Host),
				zap.String("method", c.Request.Method),
				zap.String("path", c.Request.URL.Path),
			)
			c.AbortWithStatusJSON(403, gin.H{
				"error":   "跨域请求被拒绝",
				"message": "此服务仅允许服务端调用或同域前端访问",
			})
		}
	}
}
