package main

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
)

// 全局变量记录启动时间
var startTime time.Time

func init() {
	startTime = time.Now()
}

func main() {
	// 设置Go运行时参数
	setupGoRuntime()

	// 初始化执行器
	executor := NewJSExecutor()

	// 初始化Gin路由
	router := setupRouter(executor)

	// 启动HTTP服务器
	server := &http.Server{
		Addr:           ":3002",
		Handler:        router,
		ReadTimeout:    30 * time.Second,
		WriteTimeout:   30 * time.Second,
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
║ 📡 端口: 3002                         ║
║ 🌍 地址: http://0.0.0.0:3002          ║
║ ⚡ Runtime池: %d                      ║
║ 🔧 最大并发: %d                       ║
║ 📊 Go版本: %s                         ║
╚═══════════════════════════════════════╝
`, executor.poolSize, executor.maxConcurrent, runtime.Version())

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

func setupGoRuntime() {
	// 设置GOMAXPROCS为CPU核心数
	if os.Getenv("GOMAXPROCS") == "" {
		runtime.GOMAXPROCS(runtime.NumCPU())
	}

	// 设置GC目标百分比
	if os.Getenv("GOGC") == "" {
		os.Setenv("GOGC", "100") // 默认100%
	}

	log.Printf("🔧 Go运行时配置: GOMAXPROCS=%d, GOGC=%s",
		runtime.GOMAXPROCS(0), os.Getenv("GOGC"))
}

func setupRouter(executor *JSExecutor) *gin.Engine {
	// 设置Gin模式
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// 中间件
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// 路由 - 保持与Node.js版本一致
	flowGroup := router.Group("/flow")
	{
		flowGroup.POST("/codeblock", executeHandler(executor))        // 主要执行接口（统一处理同步/异步）
		flowGroup.GET("/health", healthHandler(executor))             // 健康检查
		flowGroup.GET("/status", statsHandler(executor))              // 状态统计（兼容Node.js版本）
		flowGroup.GET("/limits", limitsHandler(executor))             // 系统限制信息
	}

	// 根路径健康检查（兼容Node.js版本）
	router.GET("/health", simpleHealthHandler())
	router.GET("/", rootHandler())

	return router
}

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

// ExecuteRequest 执行请求结构
type ExecuteRequest struct {
	Input      map[string]interface{} `json:"input" binding:"required"`
	CodeBase64 string                 `json:"codebase64" binding:"required"`
}

// ExecuteResponse 执行响应结构
type ExecuteResponse struct {
	Success     bool           `json:"success"`
	Result      interface{}    `json:"result,omitempty"`
	Error       *ExecuteError  `json:"error,omitempty"`
	Timing      *ExecuteTiming `json:"timing"`
	Timestamp   string         `json:"timestamp"`
	ExecutionId string         `json:"executionId,omitempty"`
}

// ExecuteError 执行错误结构
type ExecuteError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// ExecuteTiming 执行时间统计
type ExecuteTiming struct {
	ExecutionTime int64 `json:"executionTime"` // 毫秒
	TotalTime     int64 `json:"totalTime"`     // 毫秒
}

func executeHandler(executor *JSExecutor) gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		var req ExecuteRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, ExecuteResponse{
				Success: false,
				Error: &ExecuteError{
					Type:    "ValidationError",
					Message: fmt.Sprintf("请求参数错误: %v", err),
				},
				Timing: &ExecuteTiming{
					TotalTime: time.Since(startTime).Milliseconds(),
				},
				Timestamp: time.Now().Format(time.RFC3339),
			})
			return
		}

		// 解码Base64代码
		codeBytes, err := base64.StdEncoding.DecodeString(req.CodeBase64)
		if err != nil {
			c.JSON(400, ExecuteResponse{
				Success: false,
				Error: &ExecuteError{
					Type:    "ValidationError",
					Message: "代码Base64解码失败",
				},
				Timing: &ExecuteTiming{
					TotalTime: time.Since(startTime).Milliseconds(),
				},
				Timestamp: time.Now().Format(time.RFC3339),
			})
			return
		}

		code := string(codeBytes)

		// 执行代码
		executionResult, err := executor.Execute(code, req.Input)
		totalTime := time.Since(startTime).Milliseconds()

		if err != nil {
			// 错误分类
			errorType := "RuntimeError"
			if execErr, ok := err.(*ExecutionError); ok {
				errorType = execErr.Type
			}

			c.JSON(400, ExecuteResponse{
				Success: false,
				Error: &ExecuteError{
					Type:    errorType,
					Message: err.Error(),
				},
				Timing: &ExecuteTiming{
					ExecutionTime: totalTime,
					TotalTime:     totalTime,
				},
				Timestamp: time.Now().Format(time.RFC3339),
			})
			return
		}

		c.JSON(200, ExecuteResponse{
			Success:     true,
			Result:      executionResult.Result,
			ExecutionId: executionResult.ExecutionId,
			Timing: &ExecuteTiming{
				ExecutionTime: totalTime,
				TotalTime:     totalTime,
			},
			Timestamp: time.Now().Format(time.RFC3339),
		})
	}
}

func healthHandler(executor *JSExecutor) gin.HandlerFunc {
	return func(c *gin.Context) {
		stats := executor.GetStats()

		c.JSON(200, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "flow-codeblock-go",
			"version":   "1.0.0",
			"runtime": gin.H{
				"poolSize":          executor.poolSize,
				"maxConcurrent":     executor.maxConcurrent,
				"currentExecutions": stats.CurrentExecutions,
				"totalExecutions":   stats.TotalExecutions,
				"successRate":       fmt.Sprintf("%.1f%%", stats.SuccessRate),
			},
			"memory": gin.H{
				"alloc":      formatBytes(stats.MemStats.Alloc),
				"totalAlloc": formatBytes(stats.MemStats.TotalAlloc),
				"sys":        formatBytes(stats.MemStats.Sys),
				"numGC":      stats.MemStats.NumGC,
			},
		})
	}
}

func statsHandler(executor *JSExecutor) gin.HandlerFunc {
	return func(c *gin.Context) {
		stats := executor.GetStats()
		c.JSON(200, gin.H{
			"success":     true,
			"status":      "running",
			"uptime":      time.Since(startTime).Seconds(),
			"startTime":   startTime.Format(time.RFC3339),
			"nodeVersion": runtime.Version(), // Go版本信息
			"memory": gin.H{
				"rss":       formatBytes(stats.MemStats.Sys),
				"heapUsed":  formatBytes(stats.MemStats.HeapAlloc),
				"heapTotal": formatBytes(stats.MemStats.HeapSys),
				"external":  formatBytes(stats.MemStats.StackSys),
				"executor":  "go-goja",
				"executorStats": gin.H{
					"currentExecutions": stats.CurrentExecutions,
					"maxConcurrent":     executor.maxConcurrent,
					"queueLength":       0, // Go版本无队列概念
					"total":             stats.TotalExecutions,
					"successful":        stats.SuccessfulExecs,
					"failed":            stats.FailedExecs,
					"successRate":       fmt.Sprintf("%.1f%%", stats.SuccessRate),
				},
			},
			"limits": gin.H{
				"executionTimeout": fmt.Sprintf("%.0fs", executor.executionTimeout.Seconds()),
				"maxCodeLength":    fmt.Sprintf("%d字节 (%dKB)", executor.maxCodeLength, executor.maxCodeLength/1024),
				"maxConcurrent":    executor.maxConcurrent,
				"maxResultSize":    fmt.Sprintf("%dMB", executor.maxResultSize/(1024*1024)),
			},
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
}

func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(bytes)/float64(div), "KMGTPE"[exp])
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// limitsHandler 系统限制信息处理函数（兼容Node.js版本）
func limitsHandler(executor *JSExecutor) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"success": true,
			"data": gin.H{
				"limits": gin.H{
					"executionTimeout": fmt.Sprintf("%.0f秒", executor.executionTimeout.Seconds()),
					"maxCodeLength":    fmt.Sprintf("%d字节 (%dKB)", executor.maxCodeLength, executor.maxCodeLength/1024),
					"maxInputSize":     fmt.Sprintf("%dMB", executor.maxInputSize/(1024*1024)),
					"maxConcurrent":    executor.maxConcurrent,
					"maxResultSize":    fmt.Sprintf("%dMB", executor.maxResultSize/(1024*1024)),
					"configurable": gin.H{
						"executionTimeout": "EXECUTION_TIMEOUT_MS (单位: 毫秒)",
						"maxCodeLength":    "MAX_CODE_LENGTH (单位: 字节)",
						"maxInputSize":     "MAX_INPUT_SIZE (单位: 字节)",
						"maxConcurrent":    "MAX_CONCURRENT_EXECUTIONS",
						"maxResultSize":    "MAX_RESULT_SIZE (单位: 字节)",
					},
				},
			},
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
}

// simpleHealthHandler 简单健康检查处理函数
func simpleHealthHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":    "healthy",
			"timestamp": time.Now().Format(time.RFC3339),
			"service":   "flow-codeblock-go",
			"version":   "1.0.0",
		})
	}
}

// rootHandler 根路径处理函数（兼容Node.js版本）
func rootHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.JSON(200, gin.H{
			"service":     "Flow-CodeBlock API (Go版本)",
			"version":     "1.0.0",
			"description": "基于Go+goja的高性能JavaScript代码执行服务",
			"endpoints": gin.H{
				"main":   "POST /flow/codeblock",
				"status": "GET /flow/status",
				"health": "GET /flow/health",
				"limits": "GET /flow/limits",
			},
			"performance": gin.H{
				"engine":      "Go + goja",
				"concurrency": "1000+",
				"memory":      "低内存占用",
				"latency":     "5-50ms",
			},
			"timestamp": time.Now().Format(time.RFC3339),
		})
	}
}
