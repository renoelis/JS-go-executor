package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/controller"
	"flow-codeblock-go/repository"
	"flow-codeblock-go/router"
	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()

	// 🔥 初始化日志系统（必须在最早期初始化）
	if err := utils.InitLogger(cfg.Environment); err != nil {
		log.Fatalf("❌ 初始化日志系统失败: %v", err)
	}
	defer utils.Sync()

	utils.Info("Flow-CodeBlock Go 服务启动中",
		zap.String("version", "2.1"),
		zap.String("environment", cfg.Environment),
		zap.String("go_version", runtime.Version()),
	)

	// 设置Go运行时参数
	cfg.SetupGoRuntime()

	// ==================== 初始化数据库 ====================
	db, err := config.InitDatabase(&cfg.Database)
	if err != nil {
		utils.Fatal("数据库初始化失败", zap.Error(err))
	}
	defer db.Close()
	utils.Info("数据库连接成功")

	// ==================== 初始化Redis ====================
	redisClient, err := config.InitRedis(&cfg.Redis)
	if err != nil {
		utils.Warn("Redis初始化失败，将在无Redis模式下运行", zap.Error(err))
	}
	if redisClient != nil {
		defer redisClient.Close()
		utils.Info("Redis连接成功")
	}

	// ==================== 初始化Repository ====================
	tokenRepo := repository.NewTokenRepository(db)

	// ==================== 初始化Service ====================
	// 🔥 缓存写入池（统一管理所有异步缓存写入）
	cacheWritePool := service.NewCacheWritePool(
		cfg.Cache.WritePoolWorkers,   // workers: 从配置读取（默认：15）
		cfg.Cache.WritePoolQueueSize, // queueSize: 从配置读取（默认：1500）
	)

	// 缓存服务（使用统一配置）
	cacheService := service.NewCacheService(
		cfg.Cache.HotCacheSize,  // 热缓存大小
		cfg.Cache.HotCacheTTL,   // 热缓存TTL
		redisClient,             // Redis客户端
		cfg.Cache.RedisCacheTTL, // Redis TTL
	)

	// Token服务
	tokenService := service.NewTokenService(
		tokenRepo,
		cacheService,
		cacheWritePool,
		cfg.Cache.WritePoolSubmitTimeout, // 🔥 写入池提交超时
	)

	// 限流服务（使用统一配置）
	rateLimiterService := service.NewRateLimiterService(
		cfg.TokenLimit.HotTierSize,       // 热数据层大小
		redisClient,                      // Redis客户端
		cfg.TokenLimit.RedisTTL,          // Redis TTL
		db,                               // 数据库连接
		cfg.TokenLimit.BatchSize,         // 批量写入大小
		cacheWritePool,                   // 🔥 缓存写入池
		cfg.Cache.WritePoolSubmitTimeout, // 🔥 写入池提交超时
	)

	// 执行器服务
	executor := service.NewJSExecutor(cfg)

	// ==================== 管理员Token ====================
	// 🔒 从配置中获取已验证的管理员Token（验证逻辑在 config.LoadConfig 中）
	adminToken := cfg.Auth.AdminToken

	// ==================== 初始化Controller ====================
	executorController := controller.NewExecutorController(executor, cfg, tokenService)
	tokenController := controller.NewTokenController(tokenService, rateLimiterService, cacheWritePool, adminToken)

	// ==================== 设置路由 ====================
	ginRouter := router.SetupRouter(
		executorController,
		tokenController,
		tokenService,
		rateLimiterService,
		adminToken,
		cfg,            // 🔥 传入配置（用于 IP 限流）
		cacheWritePool, // 🔥 传入缓存写入池（用于监控）
	)

	// ==================== 加载HTML模板 ====================
	ginRouter.LoadHTMLGlob("templates/*")

	// 启动HTTP服务器
	server := &http.Server{
		Addr:           ":" + cfg.Server.Port,
		Handler:        ginRouter,
		ReadTimeout:    cfg.Server.ReadTimeout,
		WriteTimeout:   cfg.Server.WriteTimeout,
		MaxHeaderBytes: 1 << 20, // 1MB
	}

	// 优雅关闭处理
	done := make(chan struct{})
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		utils.Warn("收到关闭信号，开始优雅关闭")
		_ = utils.Sync()

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		// 1. 停止接受新请求
		if err := server.Shutdown(ctx); err != nil {
			utils.Error("服务器关闭失败", zap.Error(err))
			_ = utils.Sync()
		}

		// 2. 停止执行器
		executor.Shutdown()
		_ = utils.Sync()

		// 🔥 3. 关闭缓存写入池（等待所有缓存写入完成）
		cacheWritePool.Shutdown(5 * time.Second)
		_ = utils.Sync()

		utils.Info("服务关闭完成")
		_ = utils.Sync()

		close(done)
	}()

	// 启动服务器
	utils.Info("HTTP 服务器配置",
		zap.String("port", cfg.Server.Port),
		zap.String("address", "http://0.0.0.0:"+cfg.Server.Port),
		zap.Int("runtime_pool_size", cfg.Executor.PoolSize),
		zap.Int("max_concurrent", cfg.Executor.MaxConcurrent),
		zap.Duration("read_timeout", cfg.Server.ReadTimeout),
		zap.Duration("write_timeout", cfg.Server.WriteTimeout),
	)

	utils.Info("可用端点",
		zap.Strings("endpoints", []string{
			"POST /flow/codeblock - Execute code (需要Token认证和限流)",
			"GET  /flow/health - Detailed health check (需要管理员认证)",
			"GET  /flow/status - Execution statistics (需要管理员认证)",
			"GET  /flow/limits - System limits (需要管理员认证)",
			"POST /flow/tokens - Create token (需要管理员认证)",
			"GET  /flow/tokens - Query tokens (需要管理员认证)",
			"GET  /health - Simple health check",
			"GET  / - API information",
		}),
	)

	utils.Info("服务启动成功",
		zap.String("listen_address", ":"+cfg.Server.Port),
	)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		utils.Fatal("服务器启动失败", zap.Error(err))
	}

	<-done // 等待优雅关闭完成
}
