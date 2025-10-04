package config

import (
	"os"
	"runtime"
	"strconv"
	"time"

	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

// Config 应用程序配置
type Config struct {
	Environment string // 运行环境: "development" 或 "production"
	Server      ServerConfig
	Executor    ExecutorConfig
	Fetch       FetchConfig
	Runtime     RuntimeConfig
}

// ServerConfig HTTP服务器配置
type ServerConfig struct {
	Port         string
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	GinMode      string
}

// ExecutorConfig JavaScript执行器配置
type ExecutorConfig struct {
	PoolSize         int
	MinPoolSize      int
	MaxPoolSize      int
	IdleTimeout      time.Duration
	MaxConcurrent    int
	MaxCodeLength    int
	MaxInputSize     int
	MaxResultSize    int
	ExecutionTimeout time.Duration
	CodeCacheSize    int
	AllowConsole     bool // 是否允许用户代码使用 console（开发环境：true，生产环境：false）
}

// FetchConfig Fetch API配置
type FetchConfig struct {
	Timeout             time.Duration
	MaxFormDataSize     int64
	StreamingThreshold  int64
	EnableChunkedUpload bool
	MaxBlobFileSize     int64
	FormDataBufferSize  int
	MaxFileSize         int64
}

// RuntimeConfig Go运行时配置
type RuntimeConfig struct {
	GOMAXPROCS int
	GOGC       string
}

// calculateMaxConcurrent 基于系统内存智能计算并发限制
// 🔥 使用保守策略，防止 OOM
func calculateMaxConcurrent() int {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	// 🔥 基于 NumCPU 和 Sys 内存估算
	numCPU := runtime.NumCPU()

	// 如果 m.Sys 太小（启动早期），使用 CPU 核心数估算
	if m.Sys < 100*1024*1024 { // < 100MB，说明刚启动
		// 保守估计：每个 CPU 核心对应 200 并发
		maxConcurrent := numCPU * 200
		utils.Info("Smart concurrency limit calculated (early startup, CPU-based)",
			zap.Int("cpu_cores", numCPU), zap.Int("recommended_concurrent", maxConcurrent))
		return maxConcurrent
	}

	// 🔥 估算系统总内存（m.Sys 通常是系统总内存的 30-50%）
	// 保守估计：系统总内存 = m.Sys * 2.5
	estimatedTotalGB := float64(m.Sys) * 2.5 / (1024 * 1024 * 1024)

	// 🔥 使用 75% 的内存（预留 25% 给系统和其他进程）
	availableGB := estimatedTotalGB * 0.75

	// 🔥 假设每个请求平均使用 10MB 内存（保守估计）
	// 包括：Runtime (~2MB) + 代码 (~1MB) + 数据 (~5MB) + 缓冲 (~2MB)
	const avgMemoryPerRequestMB = 10.0

	// 🔥 计算最大并发数
	maxConcurrent := int(availableGB * 1024 / avgMemoryPerRequestMB)

	// 🔥 设置合理的边界值
	const minConcurrent = 100       // 最小并发（即使小内存机器）
	const maxConcurrentLimit = 2000 // 最大并发（防止过度并发）

	if maxConcurrent < minConcurrent {
		maxConcurrent = minConcurrent
		utils.Warn("计算的并发限制过低，已调整为最小值",
			zap.Int("min_concurrent", minConcurrent))
	}
	if maxConcurrent > maxConcurrentLimit {
		maxConcurrent = maxConcurrentLimit
		utils.Warn("计算的并发限制过高，已调整为最大值",
			zap.Int("max_concurrent_limit", maxConcurrentLimit))
	}

	utils.Info("智能并发限制计算完成",
		zap.Float64("estimated_total_gb", estimatedTotalGB), zap.Float64("available_gb", availableGB), zap.Int("recommended_concurrent", maxConcurrent))

	return maxConcurrent
}

// LoadConfig 从环境变量加载配置
func LoadConfig() *Config {
	cfg := &Config{}

	// 加载环境配置
	cfg.Environment = getEnvString("ENVIRONMENT", "production")

	// 加载服务器配置
	// 🔥 HTTP 超时配置策略：
	// - ReadTimeout: 用于读取请求（不影响执行）
	// - WriteTimeout: 必须比执行超时更长，留出响应时间
	//   推荐：executionTimeout + 5秒（足够返回超时错误）
	executionTimeoutMS := getEnvInt("EXECUTION_TIMEOUT_MS", 300000)
	cfg.Server = ServerConfig{
		Port:         getEnvString("PORT", "3002"),
		GinMode:      getEnvString("GIN_MODE", "release"),
		ReadTimeout:  time.Duration(executionTimeoutMS) * time.Millisecond,
		WriteTimeout: time.Duration(executionTimeoutMS+5000) * time.Millisecond, // ✅ 比执行超时多5秒
	}

	// 加载执行器配置
	poolSize := getEnvInt("RUNTIME_POOL_SIZE", 100)
	minPoolSize := getEnvInt("MIN_RUNTIME_POOL_SIZE", 50)
	maxPoolSize := getEnvInt("MAX_RUNTIME_POOL_SIZE", 200)
	idleTimeoutMin := getEnvInt("RUNTIME_IDLE_TIMEOUT_MIN", 5)

	// 配置合法性检查
	// 🔥 范围校验：确保配置值在合理范围内，避免无效配置导致系统异常
	// 注意：这里可以安全使用 utils.Warn，因为有 fallback 机制（自动降级到标准库 log）
	adjustmentCount := 0

	// 1. 最小池大小校验（下限保护）
	if minPoolSize < 10 {
		utils.Warn("MIN_RUNTIME_POOL_SIZE 过小，已调整",
			zap.Int("original", minPoolSize),
			zap.Int("adjusted", 10),
			zap.String("reason", "最小值不能低于 10"))
		minPoolSize = 10
		adjustmentCount++
	}

	// 2. 🔥 最大池大小上限校验（防止 OOM）
	// 每个 Runtime 约占用 3-5MB 内存（包括 VM + 嵌入库）
	// 500 个 Runtime ≈ 2.5GB 内存（合理上限）
	const maxPoolSizeLimit = 500
	if maxPoolSize > maxPoolSizeLimit {
		utils.Warn("MAX_RUNTIME_POOL_SIZE 超过系统限制，已调整",
			zap.Int("original", maxPoolSize),
			zap.Int("adjusted", maxPoolSizeLimit),
			zap.String("reason", "防止内存溢出，每个 Runtime 约占用 5MB"))
		maxPoolSize = maxPoolSizeLimit
		adjustmentCount++
	}

	// 3. 最大池大小与最小池大小关系校验
	if maxPoolSize < minPoolSize {
		originalMax := maxPoolSize
		maxPoolSize = minPoolSize * 2
		utils.Warn("MAX_RUNTIME_POOL_SIZE 小于 MIN_RUNTIME_POOL_SIZE，已调整",
			zap.Int("min_pool_size", minPoolSize),
			zap.Int("original_max", originalMax),
			zap.Int("adjusted_max", maxPoolSize))
		adjustmentCount++
	}

	// 4. 初始池大小下限校验
	if poolSize < minPoolSize {
		utils.Warn("RUNTIME_POOL_SIZE 小于 MIN_RUNTIME_POOL_SIZE，已调整",
			zap.Int("original", poolSize),
			zap.Int("adjusted", minPoolSize))
		poolSize = minPoolSize
		adjustmentCount++
	}

	// 5. 初始池大小上限校验
	if poolSize > maxPoolSize {
		utils.Warn("RUNTIME_POOL_SIZE 大于 MAX_RUNTIME_POOL_SIZE，已调整",
			zap.Int("original", poolSize),
			zap.Int("adjusted", maxPoolSize))
		poolSize = maxPoolSize
		adjustmentCount++
	}

	// 🔥 配置调整汇总（便于用户快速了解最终生效的配置）
	if adjustmentCount > 0 {
		utils.Info("Runtime 池配置已调整",
			zap.Int("adjustments", adjustmentCount),
			zap.Int("final_min_pool_size", minPoolSize),
			zap.Int("final_max_pool_size", maxPoolSize),
			zap.Int("final_pool_size", poolSize))
	}

	// 🔥 智能计算默认并发限制（基于系统内存）
	smartMaxConcurrent := calculateMaxConcurrent()

	// 🔥 Console 控制策略：
	// - 开发环境（development）：默认允许 console，便于调试
	// - 生产环境（production）：默认禁止 console，提升性能和安全性
	// - 可通过 ALLOW_CONSOLE 环境变量显式覆盖
	allowConsole := getEnvBool("ALLOW_CONSOLE", cfg.Environment == "development")

	cfg.Executor = ExecutorConfig{
		PoolSize:         poolSize,
		MinPoolSize:      minPoolSize,
		MaxPoolSize:      maxPoolSize,
		IdleTimeout:      time.Duration(idleTimeoutMin) * time.Minute,
		MaxConcurrent:    getEnvInt("MAX_CONCURRENT_EXECUTIONS", smartMaxConcurrent), // 🔥 使用智能计算的默认值
		MaxCodeLength:    getEnvInt("MAX_CODE_LENGTH", 65535),
		MaxInputSize:     getEnvInt("MAX_INPUT_SIZE", 2*1024*1024),
		MaxResultSize:    getEnvInt("MAX_RESULT_SIZE", 5*1024*1024),
		ExecutionTimeout: time.Duration(getEnvInt("EXECUTION_TIMEOUT_MS", 300000)) * time.Millisecond,
		CodeCacheSize:    getEnvInt("CODE_CACHE_SIZE", 100),
		AllowConsole:     allowConsole, // 🔥 Console 控制
	}

	// 加载Fetch配置
	cfg.Fetch = FetchConfig{
		Timeout:             time.Duration(getEnvInt("FETCH_TIMEOUT_MS", 300000)) * time.Millisecond,
		MaxFormDataSize:     int64(getEnvInt("MAX_FORMDATA_SIZE_MB", 100)) * 1024 * 1024,
		StreamingThreshold:  int64(getEnvInt("FORMDATA_STREAMING_THRESHOLD_MB", 1)) * 1024 * 1024,
		EnableChunkedUpload: getEnvInt("ENABLE_CHUNKED_UPLOAD", 1) == 1,
		MaxBlobFileSize:     int64(getEnvInt("MAX_BLOB_FILE_SIZE_MB", 100)) * 1024 * 1024,
		FormDataBufferSize:  getEnvInt("FORMDATA_BUFFER_SIZE", 2*1024*1024),
		MaxFileSize:         int64(getEnvInt("MAX_FILE_SIZE_MB", 50)) * 1024 * 1024,
	}

	// 加载Go运行时配置
	cfg.Runtime = RuntimeConfig{
		GOMAXPROCS: getEnvInt("GOMAXPROCS", runtime.NumCPU()),
		GOGC:       getEnvString("GOGC", "100"),
	}

	return cfg
}

// SetupGoRuntime 设置Go运行时参数
func (c *Config) SetupGoRuntime() {
	// 设置GOMAXPROCS
	if os.Getenv("GOMAXPROCS") == "" {
		runtime.GOMAXPROCS(c.Runtime.GOMAXPROCS)
	}

	// 设置GC目标百分比
	if os.Getenv("GOGC") == "" {
		os.Setenv("GOGC", c.Runtime.GOGC)
	}

	utils.Info("Go 运行时配置",
		zap.Int("gomaxprocs", runtime.GOMAXPROCS(0)), zap.String("gogc", os.Getenv("GOGC")))
}

// 辅助函数：从环境变量读取字符串
func getEnvString(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// 辅助函数：从环境变量读取整数
//
// 🔥 配置校验说明：
//   - 解析成功：返回解析后的整数值
//   - 解析失败：记录 WARN 日志并返回默认值
//   - 空值：直接返回默认值（不记录日志，这是正常行为）
//
// 为什么要记录解析失败的日志？
//  1. 可观测性：立即发现配置错误（如 "100abc", "2千" 等拼写错误）
//  2. 生产安全：避免配置静默失败导致性能瓶颈或安全问题
//  3. 调试效率：快速定位配置问题，减少排查时间
//  4. Fail Fast：早发现、早修复，避免隐藏问题在生产环境爆发
//
// 性能开销：仅在解析失败时记录日志（~5μs），可忽略不计
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		} else {
			// 🔥 解析失败时记录警告日志，帮助快速发现配置错误
			// 注意：这里可以安全使用 utils.Warn，因为有 fallback 机制（自动降级到标准库 log）
			utils.Warn("环境变量解析失败，使用默认值",
				zap.String("key", key),
				zap.String("invalid_value", value),
				zap.Int("default", defaultValue),
				zap.Error(err))
		}
	}
	return defaultValue
}

// 辅助函数：从环境变量读取布尔值
//
// 支持的格式：
//   - true, TRUE, True, 1, yes, YES, Yes, on, ON, On
//   - false, FALSE, False, 0, no, NO, No, off, OFF, Off
//
// 如果值为空或无法识别，返回默认值
func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	// 支持多种常见格式
	switch value {
	case "true", "TRUE", "True", "1", "yes", "YES", "Yes", "on", "ON", "On":
		return true
	case "false", "FALSE", "False", "0", "no", "NO", "No", "off", "OFF", "Off":
		return false
	default:
		// 无法识别时记录警告并返回默认值
		utils.Warn("环境变量布尔值格式无效，使用默认值",
			zap.String("key", key),
			zap.String("invalid_value", value),
			zap.Bool("default", defaultValue),
			zap.String("supported_formats", "true/false, 1/0, yes/no, on/off"))
		return defaultValue
	}
}

// FormatBytes 格式化字节大小
func FormatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return strconv.FormatUint(bytes, 10) + " B"
	}
	div, exp := int64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return strconv.FormatFloat(float64(bytes)/float64(div), 'f', 1, 64) + " " + string("KMGTPE"[exp]) + "B"
}
