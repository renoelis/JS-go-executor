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
		zap.String("version", "2.0"),
		zap.String("environment", cfg.Environment),
		zap.String("go_version", runtime.Version()),
	)

	// 设置Go运行时参数
	cfg.SetupGoRuntime()

	// 初始化执行器服务
	executor := service.NewJSExecutor(cfg)

	// 初始化控制器
	executorController := controller.NewExecutorController(executor, cfg)

	// 设置路由
	ginRouter := router.SetupRouter(executorController)

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

		if err := server.Shutdown(ctx); err != nil {
			utils.Error("服务器关闭失败", zap.Error(err))
			_ = utils.Sync()
		}

		executor.Shutdown()
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
			"POST /flow/codeblock - Execute code",
			"GET  /flow/health - Detailed health check",
			"GET  /flow/status - Execution statistics",
			"GET  /flow/limits - System limits",
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
