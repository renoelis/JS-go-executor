package controller

import (
	"context"
	"encoding/base64"
	"fmt"
	"net/http"
	"runtime"
	"sync"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/model"
	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ExecutorController 执行器控制器
type ExecutorController struct {
	executor     *service.JSExecutor
	config       *config.Config
	tokenService *service.TokenService
	statsService *service.StatsService // 🆕 统计服务
	quotaService *service.QuotaService // 🔥 配额服务
}

// NewExecutorController 创建新的执行器控制器
func NewExecutorController(executor *service.JSExecutor, cfg *config.Config, tokenService *service.TokenService, statsService *service.StatsService, quotaService *service.QuotaService) *ExecutorController {
	return &ExecutorController{
		executor:     executor,
		config:       cfg,
		tokenService: tokenService,
		statsService: statsService, // 🆕 统计服务
		quotaService: quotaService, // 🔥 配额服务
	}
}

// Execute 执行JavaScript代码
func (c *ExecutorController) Execute(ctx *gin.Context) {
	startTime := time.Now()
	requestID := ctx.GetString("request_id") // 🆕 获取请求ID

	// 🆕 记录请求开始（带 request_id）
	utils.Info("代码执行请求开始",
		zap.String("request_id", requestID),
		zap.String("ip", ctx.ClientIP()),
		zap.String("ws_id", ctx.GetString("wsId")),
		zap.String("email", ctx.GetString("userEmail")))

	var req model.ExecuteRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		// 🆕 记录参数验证失败
		utils.Warn("代码执行请求参数错误",
			zap.String("request_id", requestID),
			zap.Error(err))

		ctx.JSON(400, model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type:    "ValidationError",
				Message: fmt.Sprintf("请求参数错误: %v", err),
			},
			Timing: &model.ExecuteTiming{
				TotalTime: time.Since(startTime).Milliseconds(),
			},
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID, // 🆕 添加请求ID
		})
		return
	}

	// 🔥 Base64 长度预检查（DoS 防护）
	// 说明：Base64 编码后的长度约为原始长度的 4/3
	// 在解码前检查可以避免浪费 CPU 和内存资源
	maxBase64Length := c.executor.GetMaxCodeLength()*4/3 + 4 // +4 用于 padding
	if len(req.CodeBase64) > maxBase64Length {
		utils.Warn("拒绝超大 Base64 代码",
			zap.String("request_id", requestID),
			zap.Int("base64_length", len(req.CodeBase64)),
			zap.Int("max_allowed", maxBase64Length),
			zap.Int("max_code_length", c.executor.GetMaxCodeLength()),
			zap.String("ip", ctx.ClientIP()))

		ctx.JSON(400, model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type: "ValidationError",
				Message: fmt.Sprintf("代码 Base64 编码后过长: %d > %d 字节 (预计解码后将超过 %d 字节限制)",
					len(req.CodeBase64),
					maxBase64Length,
					c.executor.GetMaxCodeLength()),
			},
			Timing: &model.ExecuteTiming{
				TotalTime: time.Since(startTime).Milliseconds(),
			},
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID,
		})
		return
	}

	// 解码Base64代码
	codeBytes, err := base64.StdEncoding.DecodeString(req.CodeBase64)
	if err != nil {
		// 🆕 记录Base64解码失败
		utils.Warn("代码Base64解码失败",
			zap.String("request_id", requestID),
			zap.Error(err))

		ctx.JSON(400, model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type:    "ValidationError",
				Message: "代码Base64解码失败",
			},
			Timing: &model.ExecuteTiming{
				TotalTime: time.Since(startTime).Milliseconds(),
			},
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID, // 🆕 添加请求ID
		})
		return
	}

	code := string(codeBytes)

	// 🆕 解析模块使用情况
	moduleInfo := utils.ParseModuleUsage(code)

	// 🔥 【钩子1】预扣配额（调用即消耗）
	token := ctx.GetString("token")
	wsID := ctx.GetString("wsId")
	email := ctx.GetString("userEmail")
	
	// 🔥 获取Token信息，检查是否需要配额检查
	tokenInfoValue, exists := ctx.Get("tokenInfo")
	needsQuotaCheck := false
	if exists {
		if tokenInfo, ok := tokenInfoValue.(*model.TokenInfo); ok {
			needsQuotaCheck = tokenInfo.NeedsQuotaCheck()
		} else {
			// 🔥 类型断言失败，记录警告日志（修复问题12）
			utils.Warn("tokenInfo类型断言失败",
				zap.String("actual_type", fmt.Sprintf("%T", tokenInfoValue)))
			// 安全起见，默认需要配额检查
			needsQuotaCheck = true
		}
	}
	
	// 🔥 只对需要配额检查的Token（count/hybrid类型）进行配额扣减
	if token != "" && c.quotaService != nil && needsQuotaCheck {
		// 注意：这里先传递nil，执行后再更新日志
		_, _, err := c.quotaService.ConsumeQuota(ctx.Request.Context(), token, wsID, email, requestID, true, nil, nil)
		if err != nil {
			utils.Warn("配额不足",
				zap.String("token", utils.MaskToken(token)),
				zap.String("request_id", requestID),
				zap.Error(err))

			ctx.JSON(429, model.ExecuteResponse{
				Success: false,
				Error: &model.ExecuteError{
					Type:    "QuotaExceeded",
					// 🔥 用户友好的错误提示，不暴露内部细节（修复问题9）
					Message: "配额已用完，请联系管理员充值",
				},
				Timing: &model.ExecuteTiming{
					TotalTime: time.Since(startTime).Milliseconds(),
				},
				Timestamp: utils.FormatTime(utils.Now()),
				RequestID: requestID,
			})
			return
		}
	}

	// 🆕 记录代码执行开始
	utils.Debug("开始执行代码",
		zap.String("request_id", requestID),
		zap.Int("code_length", len(code)),
		zap.Bool("has_require", moduleInfo.HasRequire),
		zap.Int("module_count", moduleInfo.ModuleCount),
		zap.String("ws_id", ctx.GetString("wsId")))

	// 🔥 执行代码：传递 HTTP 请求的 context 和 requestID
	// 将 requestID 存入 context，供执行器使用作为 executionId
	execCtx := context.WithValue(ctx.Request.Context(), utils.RequestIDKey, requestID)
	executionResult, err := c.executor.Execute(execCtx, code, req.Input)
	totalTime := time.Since(startTime).Milliseconds()

	if err != nil {
		// 🔥 修复：提取完整的错误信息（包括stack trace）
		errorType := "RuntimeError"
		errorMessage := err.Error()
		errorStack := ""

		if execErr, ok := err.(*model.ExecutionError); ok {
			errorType = execErr.Type
			errorMessage = execErr.Message
			errorStack = execErr.Stack // ✅ 提取stack信息
		}

		// 🆕 记录执行失败（带详细信息）
		utils.Error("代码执行失败",
			zap.String("request_id", requestID),
			zap.String("error_type", errorType),
			zap.String("error_message", errorMessage),
			zap.Int64("total_time_ms", totalTime),
			zap.String("ws_id", ctx.GetString("wsId")),
			zap.String("email", ctx.GetString("userEmail")))

		// 🆕 记录统计数据(异步,失败情况)
		if c.statsService != nil {
			c.recordStats(requestID, ctx, moduleInfo, code, totalTime, "failed")
		}

		ctx.JSON(400, model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type:    errorType,
				Message: errorMessage,
				Stack:   errorStack, // ✅ 返回stack信息
			},
			Timing: &model.ExecuteTiming{
				ExecutionTime: totalTime,
				TotalTime:     totalTime,
			},
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID, // 🆕 添加请求ID
		})
		return
	}

	// 🆕 记录执行成功（带性能指标）
	utils.Info("代码执行成功",
		zap.String("request_id", requestID),
		zap.Int64("execution_time_ms", totalTime),
		zap.String("ws_id", ctx.GetString("wsId")),
		zap.String("email", ctx.GetString("userEmail")))

	// 🆕 记录统计数据(异步,成功情况)
	if c.statsService != nil {
		c.recordStats(requestID, ctx, moduleInfo, code, totalTime, "success")
	}

	ctx.JSON(200, model.ExecuteResponse{
		Success: true,
		Result:  executionResult.Result,
		Timing: &model.ExecuteTiming{
			ExecutionTime: totalTime,
			TotalTime:     totalTime,
		},
		Timestamp: utils.FormatTime(utils.Now()),
		RequestID: requestID, // 🔄 统一使用 request_id
	})
}

// Health 健康检查（详细信息）
// 根据依赖服务状态返回正确的 HTTP 状态码：
// - 200: 所有关键依赖正常
// - 503: 关键依赖失败（数据库、执行器过载）
// Redis 失败不影响整体健康（可降级运行）
func (c *ExecutorController) Health(ctx *gin.Context) {
	stats := c.executor.GetStats()
	warmupStats := c.executor.GetWarmupStats()

	// ==================== 健康检查标志 ====================
	healthy := true
	issues := []string{} // 记录问题

	// ==================== 🚀 并行检查数据库和Redis（性能优化） ====================
	var (
		dbStatus     = "connected"
		dbPing       = "0ms"
		dbHealthy    = true
		redisStatus  = "connected"
		redisPing    = "0ms"
		redisHealthy = true
		wg           sync.WaitGroup
		mu           sync.Mutex // 保护共享变量（issues）
	)

	if c.tokenService != nil {
		// 并行检查数据库
		wg.Add(1)
		go func() {
			defer wg.Done()
			pingStart := time.Now()
			if err := c.tokenService.PingDB(ctx.Request.Context()); err != nil {
				mu.Lock()
				dbStatus = "disconnected"
				dbPing = "error"
				dbHealthy = false
				healthy = false // 数据库失败 = 服务不健康
				issues = append(issues, "database_disconnected")
				mu.Unlock()
				utils.Error("健康检查：数据库连接失败", zap.Error(err))
			} else {
				mu.Lock()
				dbPing = fmt.Sprintf("%.2fms", float64(time.Since(pingStart).Microseconds())/1000.0)
				mu.Unlock()
			}
		}()

		// 并行检查Redis
		wg.Add(1)
		go func() {
			defer wg.Done()
			pingStart := time.Now()
			if err := c.tokenService.PingRedis(ctx.Request.Context()); err != nil {
				mu.Lock()
				redisStatus = "degraded" // Redis 失败使用 "degraded"
				redisPing = "error"
				redisHealthy = false
				// Redis 失败不影响整体健康（服务可降级运行）
				issues = append(issues, "redis_degraded")
				mu.Unlock()
				utils.Warn("健康检查：Redis连接失败（降级模式）", zap.Error(err))
			} else {
				mu.Lock()
				redisPing = fmt.Sprintf("%.2fms", float64(time.Since(pingStart).Microseconds())/1000.0)
				mu.Unlock()
			}
		}()

		// 等待所有检查完成
		wg.Wait()
	}

	// ==================== 检查执行器状态 ====================
	executorHealthy := true
	executorStatus := "healthy"

	// 检查是否过载（当前执行数 >= 最大并发数）
	if stats.CurrentExecutions >= int64(c.executor.GetMaxConcurrent()) {
		executorStatus = "overloaded"
		executorHealthy = false
		healthy = false
		issues = append(issues, "executor_overloaded")
		utils.Warn("健康检查：执行器过载",
			zap.Int64("current", stats.CurrentExecutions),
			zap.Int("max", c.executor.GetMaxConcurrent()))
	}

	// ==================== 确定整体状态 ====================
	overallStatus := "healthy"
	if !healthy {
		overallStatus = "unhealthy"
	} else if !redisHealthy {
		overallStatus = "degraded" // Redis 失败但整体可用
	}

	// ==================== 构建响应 ====================
	type HealthResponse struct {
		Service   string                 `json:"service"`
		Status    string                 `json:"status"`
		Timestamp string                 `json:"timestamp"`
		Version   string                 `json:"version"`
		RequestID string                 `json:"request_id,omitempty"` // 🆕 请求ID
		Checks    map[string]interface{} `json:"checks"`               // 新增：依赖检查结果
		Issues    []string               `json:"issues,omitempty"`     // 新增：问题列表
		Database  map[string]interface{} `json:"database"`
		Redis     map[string]interface{} `json:"redis"`
		Runtime   map[string]interface{} `json:"runtime"`
		Memory    map[string]interface{} `json:"memory"`
		Warmup    interface{}            `json:"warmup"`
	}

	response := HealthResponse{
		Service:   "flow-codeblock-go",
		Status:    overallStatus,
		Timestamp: utils.FormatTime(utils.Now()),
		Version:   "1.0.0",
		RequestID: ctx.GetString("request_id"), // 🆕 从上下文获取请求ID
		Checks: map[string]interface{}{
			"database": dbHealthy,
			"redis":    redisHealthy,
			"executor": executorHealthy,
		},
		Issues: issues,
		Database: map[string]interface{}{
			"status": dbStatus,
			"ping":   dbPing,
		},
		Redis: map[string]interface{}{
			"status": redisStatus,
			"ping":   redisPing,
		},
		Runtime: map[string]interface{}{
			"status":            executorStatus,
			"poolSize":          c.executor.GetPoolSize(),
			"maxConcurrent":     c.executor.GetMaxConcurrent(),
			"currentExecutions": stats.CurrentExecutions,
			"totalExecutions":   stats.TotalExecutions,
			"successRate":       fmt.Sprintf("%.1f%%", stats.SuccessRate),
		},
		Memory: map[string]interface{}{
			"alloc":      config.FormatBytes(stats.MemStats.Alloc),
			"totalAlloc": config.FormatBytes(stats.MemStats.TotalAlloc),
			"sys":        config.FormatBytes(stats.MemStats.Sys),
			"numGC":      stats.MemStats.NumGC,
		},
		Warmup: warmupStats,
	}

	// ==================== 返回正确的 HTTP 状态码 ====================
	statusCode := http.StatusOK
	if !healthy {
		statusCode = http.StatusServiceUnavailable // 503
	}

	ctx.JSON(statusCode, response)
}

// Stats 执行统计
func (c *ExecutorController) Stats(ctx *gin.Context) {
	stats := c.executor.GetStats()
	utils.RespondSuccess(ctx, map[string]interface{}{
		"status":      "running",
		"uptime":      time.Since(GetStartTime()).Seconds(),
		"startTime":   utils.FormatTime(GetStartTime()),
		"nodeVersion": runtime.Version(),
		"memory": map[string]interface{}{
			"rss":       config.FormatBytes(stats.MemStats.Sys),
			"heapUsed":  config.FormatBytes(stats.MemStats.HeapAlloc),
			"heapTotal": config.FormatBytes(stats.MemStats.HeapSys),
			"external":  config.FormatBytes(stats.MemStats.StackSys),
			"executor":  "go-goja",
			"executorStats": map[string]interface{}{
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
		"cache": map[string]interface{}{
			"codeCompilation":   c.executor.GetCacheStats(),
			"codeValidation":    c.executor.GetValidationCacheStats(),
			"runtimePoolHealth": c.executor.GetRuntimePoolHealth(),
		},
		"limits": map[string]interface{}{
			"executionTimeout": fmt.Sprintf("%.0fs", c.executor.GetExecutionTimeout().Seconds()),
			"maxCodeLength":    fmt.Sprintf("%d字节 (%dKB)", c.executor.GetMaxCodeLength(), c.executor.GetMaxCodeLength()/1024),
			"maxConcurrent":    c.executor.GetMaxConcurrent(),
			"maxResultSize":    fmt.Sprintf("%dMB", c.executor.GetMaxResultSize()/(1024*1024)),
		},
	}, "")
}

// Limits 系统限制信息
func (c *ExecutorController) Limits(ctx *gin.Context) {
	type LimitsResponse struct {
		Success   bool                   `json:"success"`
		Data      map[string]interface{} `json:"data"`
		Timestamp string                 `json:"timestamp"`
		RequestID string                 `json:"request_id,omitempty"` // 🆕 请求ID
	}

	response := LimitsResponse{
		Success: true,
		Data: map[string]interface{}{
			"execution": map[string]interface{}{
				"maxCodeLength":    c.executor.GetMaxCodeLength(),
				"maxCodeLengthStr": fmt.Sprintf("%d字节 (%dKB)", c.executor.GetMaxCodeLength(), c.executor.GetMaxCodeLength()/1024),
				"maxInputSize":     c.executor.GetMaxInputSize(),
				"maxInputSizeStr":  fmt.Sprintf("%.2fMB", float64(c.executor.GetMaxInputSize())/(1024*1024)),
				"maxResultSize":    c.executor.GetMaxResultSize(),
				"maxResultSizeStr": fmt.Sprintf("%.2fMB", float64(c.executor.GetMaxResultSize())/(1024*1024)),
				"timeout":          int(c.executor.GetExecutionTimeout().Milliseconds()),
				"timeoutStr":       fmt.Sprintf("%.0f秒", c.executor.GetExecutionTimeout().Seconds()),
				"allowConsole":     c.config.Executor.AllowConsole,
			},
			"concurrency": map[string]interface{}{
				"maxConcurrent":  c.executor.GetMaxConcurrent(),
				"poolSize":       c.config.Executor.PoolSize,
				"minPoolSize":    c.config.Executor.MinPoolSize,
				"maxPoolSize":    c.config.Executor.MaxPoolSize,
				"idleTimeout":    int(c.config.Executor.IdleTimeout.Minutes()),
				"idleTimeoutStr": fmt.Sprintf("%.0f分钟", c.config.Executor.IdleTimeout.Minutes()),
			},
			"cache": map[string]interface{}{
				"codeCacheSize": c.config.Executor.CodeCacheSize,
			},
			"circuitBreaker": map[string]interface{}{
				"enabled":      c.config.Executor.CircuitBreakerEnabled,
				"minRequests":  c.config.Executor.CircuitBreakerMinRequests,
				"failureRatio": c.config.Executor.CircuitBreakerFailureRatio,
				"timeout":      int(c.config.Executor.CircuitBreakerTimeout.Seconds()),
				"timeoutStr":   fmt.Sprintf("%.0f秒", c.config.Executor.CircuitBreakerTimeout.Seconds()),
				"maxRequests":  c.config.Executor.CircuitBreakerMaxRequests,
			},
			"rateLimit": map[string]interface{}{
				"preAuthIP": map[string]interface{}{
					"rate":  c.config.RateLimit.PreAuthIPRate,
					"burst": c.config.RateLimit.PreAuthIPBurst,
				},
				"postAuthIP": map[string]interface{}{
					"rate":  c.config.RateLimit.PostAuthIPRate,
					"burst": c.config.RateLimit.PostAuthIPBurst,
				},
				"globalIP": map[string]interface{}{
					"rate":  c.config.RateLimit.GlobalIPRate,
					"burst": c.config.RateLimit.GlobalIPBurst,
				},
			},
			"database": map[string]interface{}{
				"host":               c.config.Database.Host,
				"port":               c.config.Database.Port,
				"database":           c.config.Database.Database,
				"maxOpenConns":       c.config.Database.MaxOpenConns,
				"maxIdleConns":       c.config.Database.MaxIdleConns,
				"connMaxLifetime":    int(c.config.Database.ConnMaxLifetime.Minutes()),
				"connMaxLifetimeStr": fmt.Sprintf("%.0f分钟", c.config.Database.ConnMaxLifetime.Minutes()),
				"connMaxIdleTime":    int(c.config.Database.ConnMaxIdleTime.Minutes()),
				"connMaxIdleTimeStr": fmt.Sprintf("%.0f分钟", c.config.Database.ConnMaxIdleTime.Minutes()),
			},
			"redis": map[string]interface{}{
				"enabled":      c.config.Redis.Enabled,
				"host":         c.config.Redis.Host,
				"port":         c.config.Redis.Port,
				"db":           c.config.Redis.DB,
				"poolSize":     c.config.Redis.PoolSize,
				"minIdleConns": c.config.Redis.MinIdleConns,
				"dialTimeout":  int(c.config.Redis.DialTimeout.Seconds()),
				"readTimeout":  int(c.config.Redis.ReadTimeout.Seconds()),
				"writeTimeout": int(c.config.Redis.WriteTimeout.Seconds()),
				"maxRetries":   c.config.Redis.MaxRetries,
			},
			"tokenCache": map[string]interface{}{
				"hotCacheSize":     c.config.Cache.HotCacheSize,
				"hotCacheTTL":      int(c.config.Cache.HotCacheTTL.Minutes()),
				"hotCacheTTLStr":   fmt.Sprintf("%.0f分钟", c.config.Cache.HotCacheTTL.Minutes()),
				"redisCacheTTL":    int(c.config.Cache.RedisCacheTTL.Minutes()),
				"redisCacheTTLStr": fmt.Sprintf("%.0f分钟", c.config.Cache.RedisCacheTTL.Minutes()),
			},
			"tokenRateLimit": map[string]interface{}{
				"hotTierSize": c.config.TokenLimit.HotTierSize,
				"redisTTL":    int(c.config.TokenLimit.RedisTTL.Minutes()),
				"redisTTLStr": fmt.Sprintf("%.0f分钟", c.config.TokenLimit.RedisTTL.Minutes()),
				"batchSize":   c.config.TokenLimit.BatchSize,
			},
		},
		Timestamp: utils.FormatTime(utils.Now()),
		RequestID: ctx.GetString("request_id"), // 🆕 从上下文获取请求ID
	}

	ctx.JSON(200, response)
}

// SimpleHealth 简单健康检查
func (c *ExecutorController) SimpleHealth(ctx *gin.Context) {
	utils.RespondSuccess(ctx, map[string]interface{}{
		"status":  "healthy",
		"service": "flow-codeblock-go",
		"version": "1.0.0",
	}, "")
}

// Root 根路径信息
func (c *ExecutorController) Root(ctx *gin.Context) {
	utils.RespondSuccess(ctx, map[string]interface{}{
		"service":     "Flow-CodeBlock API (Go版本)",
		"version":     "1.0.0",
		"description": "基于Go+goja的高性能JavaScript代码执行服务",
		"endpoints": map[string]interface{}{
			"main":   "POST /flow/codeblock",
			"status": "GET /flow/status",
			"health": "GET /flow/health",
			"limits": "GET /flow/limits",
		},
		"performance": map[string]interface{}{
			"engine":      "Go + goja",
			"concurrency": "1000+",
			"memory":      "低内存占用",
			"latency":     "5-50ms",
		},
	}, "")
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

// recordStats 记录统计数据(辅助方法)
func (c *ExecutorController) recordStats(requestID string, ctx *gin.Context, moduleInfo *utils.ModuleUsageInfo, code string, totalTime int64, status string) {
	// 检测是否为异步代码
	isAsync := c.executor.GetAnalyzer().IsLikelyAsync(code)

	// 获取Token (从tokenInfo中提取AccessToken字段)
	token := ""
	if tokenInfoValue, exists := ctx.Get("tokenInfo"); exists {
		if tokenInfo, ok := tokenInfoValue.(*model.TokenInfo); ok {
			token = tokenInfo.AccessToken
		}
	}

	statsRecord := &model.ExecutionStatsRecord{
		ExecutionID:     requestID,
		Token:           token,
		WsID:            ctx.GetString("wsId"),
		Email:           ctx.GetString("userEmail"),
		HasRequire:      moduleInfo.HasRequire,
		ModulesUsed:     moduleInfo.GetModuleList(),
		ModuleCount:     moduleInfo.ModuleCount,
		ExecutionStatus: status,
		ExecutionTimeMs: totalTime,
		CodeLength:      len(code),
		IsAsync:         isAsync,
		ExecutionDate:   time.Now().Format("2006-01-02"),
		ExecutionTime:   time.Now(),
	}

	c.statsService.RecordExecutionStats(statsRecord)
}

// TestTool 测试工具页面
func (c *ExecutorController) TestTool(ctx *gin.Context) {
	// 从配置中获取测试工具配置
	testToolCfg := c.config.TestTool

	ctx.HTML(http.StatusOK, "test-tool.html", gin.H{
		"ApiUrl":           testToolCfg.ApiUrl,
		"LogoUrl":          testToolCfg.LogoUrl,
		"AiAssistantUrl":   testToolCfg.AiAssistantUrl,
		"HelpDocUrl":       testToolCfg.HelpDocUrl,
		"ApiDocUrl":        testToolCfg.ApiDocUrl,
		"TestToolGuideUrl": testToolCfg.TestToolGuideUrl,
		"ExampleDocUrl":    testToolCfg.ExampleDocUrl,
		"ApplyServiceUrl":  testToolCfg.ApplyServiceUrl,
	})
}
