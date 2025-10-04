package controller

import (
	"encoding/base64"
	"fmt"
	"runtime"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/model"
	"flow-codeblock-go/service"

	"github.com/gin-gonic/gin"
)

// ExecutorController 执行器控制器
type ExecutorController struct {
	executor *service.JSExecutor
	config   *config.Config
}

// NewExecutorController 创建新的执行器控制器
func NewExecutorController(executor *service.JSExecutor, cfg *config.Config) *ExecutorController {
	return &ExecutorController{
		executor: executor,
		config:   cfg,
	}
}

// Execute 执行JavaScript代码
func (c *ExecutorController) Execute(ctx *gin.Context) {
	startTime := time.Now()

	var req model.ExecuteRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(400, model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type:    "ValidationError",
				Message: fmt.Sprintf("请求参数错误: %v", err),
			},
			Timing: &model.ExecuteTiming{
				TotalTime: time.Since(startTime).Milliseconds(),
			},
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return
	}

	// 解码Base64代码
	codeBytes, err := base64.StdEncoding.DecodeString(req.CodeBase64)
	if err != nil {
		ctx.JSON(400, model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type:    "ValidationError",
				Message: "代码Base64解码失败",
			},
			Timing: &model.ExecuteTiming{
				TotalTime: time.Since(startTime).Milliseconds(),
			},
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return
	}

	code := string(codeBytes)

	// 执行代码
	executionResult, err := c.executor.Execute(code, req.Input)
	totalTime := time.Since(startTime).Milliseconds()

	if err != nil {
		// 错误分类
		errorType := "RuntimeError"
		if execErr, ok := err.(*model.ExecutionError); ok {
			errorType = execErr.Type
		}

		ctx.JSON(400, model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type:    errorType,
				Message: err.Error(),
			},
			Timing: &model.ExecuteTiming{
				ExecutionTime: totalTime,
				TotalTime:     totalTime,
			},
			Timestamp: time.Now().Format(time.RFC3339),
		})
		return
	}

	ctx.JSON(200, model.ExecuteResponse{
		Success:     true,
		Result:      executionResult.Result,
		ExecutionId: executionResult.ExecutionId,
		Timing: &model.ExecuteTiming{
			ExecutionTime: totalTime,
			TotalTime:     totalTime,
		},
		Timestamp: time.Now().Format(time.RFC3339),
	})
}

// Health 健康检查（详细信息）
func (c *ExecutorController) Health(ctx *gin.Context) {
	stats := c.executor.GetStats()
	warmupStats := c.executor.GetWarmupStats()

	ctx.JSON(200, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "flow-codeblock-go",
		"version":   "1.0.0",
		"runtime": gin.H{
			"poolSize":          c.executor.GetPoolSize(),
			"maxConcurrent":     c.executor.GetMaxConcurrent(),
			"currentExecutions": stats.CurrentExecutions,
			"totalExecutions":   stats.TotalExecutions,
			"successRate":       fmt.Sprintf("%.1f%%", stats.SuccessRate),
		},
		"memory": gin.H{
			"alloc":      config.FormatBytes(stats.MemStats.Alloc),
			"totalAlloc": config.FormatBytes(stats.MemStats.TotalAlloc),
			"sys":        config.FormatBytes(stats.MemStats.Sys),
			"numGC":      stats.MemStats.NumGC,
		},
		"warmup": warmupStats,
	})
}

// Stats 执行统计
func (c *ExecutorController) Stats(ctx *gin.Context) {
	stats := c.executor.GetStats()
	ctx.JSON(200, gin.H{
		"success":     true,
		"status":      "running",
		"uptime":      time.Since(GetStartTime()).Seconds(),
		"startTime":   GetStartTime().Format(time.RFC3339),
		"nodeVersion": runtime.Version(),
		"memory": gin.H{
			"rss":       config.FormatBytes(stats.MemStats.Sys),
			"heapUsed":  config.FormatBytes(stats.MemStats.HeapAlloc),
			"heapTotal": config.FormatBytes(stats.MemStats.HeapSys),
			"external":  config.FormatBytes(stats.MemStats.StackSys),
			"executor":  "go-goja",
			"executorStats": gin.H{
				"currentExecutions": stats.CurrentExecutions,
				"maxConcurrent":     c.executor.GetMaxConcurrent(),
				"queueLength":       0,
				"total":             stats.TotalExecutions,
				"successful":        stats.SuccessfulExecs,
				"failed":            stats.FailedExecs,
				"successRate":       fmt.Sprintf("%.1f%%", stats.SuccessRate),
				"syncExecutions":    stats.SyncExecutions,
				"asyncExecutions":   stats.AsyncExecutions,
			},
		},
		"cache": gin.H{
			"codeCompilation":   c.executor.GetCacheStats(),
			"codeValidation":    c.executor.GetValidationCacheStats(),
			"runtimePoolHealth": c.executor.GetRuntimePoolHealth(),
		},
		"limits": gin.H{
			"executionTimeout": fmt.Sprintf("%.0fs", c.executor.GetExecutionTimeout().Seconds()),
			"maxCodeLength":    fmt.Sprintf("%d字节 (%dKB)", c.executor.GetMaxCodeLength(), c.executor.GetMaxCodeLength()/1024),
			"maxConcurrent":    c.executor.GetMaxConcurrent(),
			"maxResultSize":    fmt.Sprintf("%dMB", c.executor.GetMaxResultSize()/(1024*1024)),
		},
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// Limits 系统限制信息
func (c *ExecutorController) Limits(ctx *gin.Context) {
	ctx.JSON(200, gin.H{
		"success": true,
		"data": gin.H{
			"limits": gin.H{
				"executionTimeout": fmt.Sprintf("%.0f秒", c.executor.GetExecutionTimeout().Seconds()),
				"maxCodeLength":    fmt.Sprintf("%d字节 (%dKB)", c.executor.GetMaxCodeLength(), c.executor.GetMaxCodeLength()/1024),
				"maxInputSize":     fmt.Sprintf("%dMB", c.executor.GetMaxInputSize()/(1024*1024)),
				"maxConcurrent":    c.executor.GetMaxConcurrent(),
				"maxResultSize":    fmt.Sprintf("%dMB", c.executor.GetMaxResultSize()/(1024*1024)),
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

// SimpleHealth 简单健康检查
func (c *ExecutorController) SimpleHealth(ctx *gin.Context) {
	ctx.JSON(200, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"service":   "flow-codeblock-go",
		"version":   "1.0.0",
	})
}

// Root 根路径信息
func (c *ExecutorController) Root(ctx *gin.Context) {
	ctx.JSON(200, gin.H{
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

// 全局启动时间变量
var startTime time.Time

func init() {
	startTime = time.Now()
}

// GetStartTime 获取启动时间
func GetStartTime() time.Time {
	return startTime
}
