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
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()

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
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		log.Println("🛑 收到关闭信号，开始优雅关闭...")

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			log.Printf("❌ 服务器关闭失败: %v", err)
		}

		executor.Shutdown()
		log.Println("✅ 服务已完全关闭")
		os.Exit(0)
	}()

	// 启动服务器
	log.Printf(`
╔═══════════════════════════════════════╗
║     Flow-CodeBlock Go Service         ║
╠═══════════════════════════════════════╣
║ 🚀 服务已启动                         ║
║ 📡 端口: %s                         ║
║ 🌍 地址: http://0.0.0.0:%s          ║
║ ⚡ Runtime池: %d                      ║
║ 🔧 最大并发: %d                       ║
║ ⏱️  HTTP超时: %.0fs                     ║
║ 📊 Go版本: %s                         ║
╚═══════════════════════════════════════╝
`, cfg.Server.Port, cfg.Server.Port, cfg.Executor.PoolSize, cfg.Executor.MaxConcurrent, cfg.Server.ReadTimeout.Seconds(), runtime.Version())

	log.Println("📋 可用端点:")
	log.Println("   POST /flow/codeblock         - 执行代码 [兼容Node.js版本]")
	log.Println("   GET  /flow/health            - 健康检查 [详细信息]")
	log.Println("   GET  /flow/status            - 执行统计 [兼容Node.js版本]")
	log.Println("   GET  /flow/limits            - 系统限制 [兼容Node.js版本]")
	log.Println("   GET  /health                 - 简单健康检查")
	log.Println("   GET  /                       - API信息")
	log.Println("")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("❌ 服务器启动失败: %v", err)
	}
}
