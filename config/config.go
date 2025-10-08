package config

import (
	"os"
	"runtime"
	"strconv"
	"strings"
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
	Auth        AuthConfig       // 🔒 认证配置
	RateLimit   RateLimitConfig  // 🔥 IP 限流配置
	Database    DatabaseConfig   // 数据库配置
	Redis       RedisConfig      // Redis配置
	Cache       CacheConfig      // 缓存配置
	TokenLimit  TokenLimitConfig // Token限流配置
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

	// 🔥 超时配置（新增可配置项）
	ConcurrencyWaitTimeout    time.Duration // 并发槽位等待超时（默认 10 秒）
	RuntimePoolAcquireTimeout time.Duration // Runtime 池获取超时（默认 5 秒）

	// 🔥 熔断器配置
	CircuitBreakerEnabled      bool          // 是否启用熔断器
	CircuitBreakerMinRequests  uint32        // 最小请求数（触发熔断的最小样本）
	CircuitBreakerFailureRatio float64       // 失败率阈值（0.0-1.0）
	CircuitBreakerTimeout      time.Duration // Open 状态持续时间
	CircuitBreakerMaxRequests  uint32        // Half-Open 状态最大探测请求数

	// 🔥 JavaScript 内存限制配置
	EnableJSMemoryLimit bool  // 是否启用 JavaScript 侧内存限制（默认：true）
	JSMemoryLimitMB     int64 // JavaScript 单次分配最大大小（MB，默认使用 MaxBlobFileSize）
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
	MaxResponseSize     int64 // 🔥 Fetch下载响应体最大大小（字节）
}

// RuntimeConfig Go运行时配置
type RuntimeConfig struct {
	GOMAXPROCS int
	GOGC       string
}

// AuthConfig 认证配置
type AuthConfig struct {
	AdminToken string // 🔒 管理员Token（必需，用于访问管理接口）
}

// RateLimitConfig IP 限流配置
type RateLimitConfig struct {
	// 认证前 IP 限流（严格）- 防止暴力破解 Token
	PreAuthIPRate  int // 每秒允许的请求数（默认：10）
	PreAuthIPBurst int // 突发允许的请求数（默认：20）

	// 认证后 IP 限流（宽松）- 防止极端滥用，不影响 Token 配额
	PostAuthIPRate  int // 每秒允许的请求数（默认：200）
	PostAuthIPBurst int // 突发允许的请求数（默认：400）

	// 全局 IP 限流（用于公开端点）
	GlobalIPRate  int // 每秒允许的请求数（默认：50）
	GlobalIPBurst int // 突发允许的请求数（默认：100）
}

// CacheConfig 缓存配置
type CacheConfig struct {
	HotCacheSize  int           // 热缓存大小（默认：500）
	HotCacheTTL   time.Duration // 热缓存TTL（默认：5分钟）
	RedisCacheTTL time.Duration // Redis缓存TTL（默认：1小时）

	// 🔥 缓存写入池配置
	WritePoolWorkers       int           // 写入池 worker 数量（默认：15）
	WritePoolQueueSize     int           // 写入池队列大小（默认：1500）
	WritePoolSubmitTimeout time.Duration // 写入池提交超时（默认：50ms）
}

// TokenLimitConfig Token限流配置
type TokenLimitConfig struct {
	HotTierSize int           // 热数据层大小（默认：500）
	RedisTTL    time.Duration // Redis TTL（默认：1小时）
	BatchSize   int           // 批量写入大小（默认：100）
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

		// 🔥 超时配置（新增可配置项）
		ConcurrencyWaitTimeout:    time.Duration(getEnvInt("CONCURRENCY_WAIT_TIMEOUT_SEC", 10)) * time.Second,    // 并发等待超时（默认 10 秒）
		RuntimePoolAcquireTimeout: time.Duration(getEnvInt("RUNTIME_POOL_ACQUIRE_TIMEOUT_SEC", 5)) * time.Second, // Runtime 获取超时（默认 5 秒）

		// 🔥 熔断器配置
		CircuitBreakerEnabled:      getEnvBool("CIRCUIT_BREAKER_ENABLED", true),                               // 默认启用
		CircuitBreakerMinRequests:  uint32(getEnvInt("CIRCUIT_BREAKER_MIN_REQUESTS", 100)),                    // 最少 100 个请求
		CircuitBreakerFailureRatio: getEnvFloat("CIRCUIT_BREAKER_FAILURE_RATIO", 0.9),                         // 90% 失败率
		CircuitBreakerTimeout:      time.Duration(getEnvInt("CIRCUIT_BREAKER_TIMEOUT_SEC", 10)) * time.Second, // 10 秒
		CircuitBreakerMaxRequests:  uint32(getEnvInt("CIRCUIT_BREAKER_MAX_REQUESTS", 100)),                    // 最多 100 个探测请求

		// 🔥 JavaScript 内存限制配置
		EnableJSMemoryLimit: getEnvBool("ENABLE_JS_MEMORY_LIMIT", true), // 默认启用
		JSMemoryLimitMB:     int64(getEnvInt("JS_MEMORY_LIMIT_MB", 0)),  // 默认 0（使用 MaxBlobFileSize）
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
		MaxResponseSize:     int64(getEnvInt("MAX_RESPONSE_SIZE_MB", 100)) * 1024 * 1024, // 🔥 默认100MB
	}

	// 加载Go运行时配置
	cfg.Runtime = RuntimeConfig{
		GOMAXPROCS: getEnvInt("GOMAXPROCS", runtime.NumCPU()),
		GOGC:       getEnvString("GOGC", "100"),
	}

	// 🔥 加载 IP 限流配置
	cfg.RateLimit = RateLimitConfig{
		// 认证前 IP 限流（严格）- 防止暴力破解 Token
		PreAuthIPRate:  getEnvInt("IP_RATE_LIMIT_PRE_AUTH", 10),
		PreAuthIPBurst: getEnvInt("IP_RATE_LIMIT_PRE_AUTH_BURST", 20),

		// 认证后 IP 限流（宽松）- 防止极端滥用，不影响 Token 配额
		PostAuthIPRate:  getEnvInt("IP_RATE_LIMIT_POST_AUTH", 200),
		PostAuthIPBurst: getEnvInt("IP_RATE_LIMIT_POST_AUTH_BURST", 400),

		// 全局 IP 限流（用于公开端点）
		GlobalIPRate:  getEnvInt("IP_RATE_LIMIT_GLOBAL", 50),
		GlobalIPBurst: getEnvInt("IP_RATE_LIMIT_GLOBAL_BURST", 100),
	}

	// 🔥 加载数据库配置
	cfg.Database = DatabaseConfig{
		Host:            getEnvString("DB_HOST", "localhost"),
		Port:            getEnvInt("DB_PORT", 3306),
		User:            getEnvString("DB_USER", "flow_user"),
		Password:        getEnvString("DB_PASSWORD", "flow_password"),
		Database:        getEnvString("DB_NAME", "flow_codeblock_go"),
		MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 100),
		MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 20),
		ConnMaxLifetime: time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME_MIN", 60)) * time.Minute,
		ConnMaxIdleTime: time.Duration(getEnvInt("DB_CONN_MAX_IDLE_TIME_MIN", 10)) * time.Minute,
	}

	// 🔥 加载Redis配置
	cfg.Redis = RedisConfig{
		Enabled:      getEnvBool("REDIS_ENABLED", true),
		Host:         getEnvString("REDIS_HOST", "localhost"),
		Port:         getEnvInt("REDIS_PORT", 6379),
		Password:     getEnvString("REDIS_PASSWORD", ""),
		DB:           getEnvInt("REDIS_DB", 0),
		PoolSize:     getEnvInt("REDIS_POOL_SIZE", 100),
		MinIdleConns: getEnvInt("REDIS_MIN_IDLE_CONNS", 10),
		DialTimeout:  time.Duration(getEnvInt("REDIS_DIAL_TIMEOUT_SEC", 5)) * time.Second,
		ReadTimeout:  time.Duration(getEnvInt("REDIS_READ_TIMEOUT_SEC", 3)) * time.Second,
		WriteTimeout: time.Duration(getEnvInt("REDIS_WRITE_TIMEOUT_SEC", 3)) * time.Second,
		MaxRetries:   getEnvInt("REDIS_MAX_RETRIES", 3),
	}

	// 🔥 加载缓存配置
	cfg.Cache = CacheConfig{
		HotCacheSize:  getEnvInt("TOKEN_CACHE_HOT_SIZE", 500),
		HotCacheTTL:   time.Duration(getEnvInt("TOKEN_CACHE_HOT_TTL_MINUTES", 5)) * time.Minute,
		RedisCacheTTL: time.Duration(getEnvInt("TOKEN_CACHE_REDIS_TTL_MINUTES", 60)) * time.Minute,

		// 🔥 缓存写入池配置
		WritePoolWorkers:       getEnvInt("CACHE_WRITE_POOL_WORKERS", 15),
		WritePoolQueueSize:     getEnvInt("CACHE_WRITE_POOL_QUEUE_SIZE", 1500),
		WritePoolSubmitTimeout: time.Duration(getEnvInt("CACHE_WRITE_POOL_SUBMIT_TIMEOUT_MS", 50)) * time.Millisecond,
	}

	// 🔥 加载Token限流配置
	cfg.TokenLimit = TokenLimitConfig{
		HotTierSize: getEnvInt("RATE_LIMIT_HOT_SIZE", 500),
		RedisTTL:    time.Duration(getEnvInt("RATE_LIMIT_REDIS_TTL_MINUTES", 60)) * time.Minute,
		BatchSize:   getEnvInt("RATE_LIMIT_BATCH_SIZE", 100),
	}

	// 🔒 加载和验证认证配置
	adminToken := os.Getenv("ADMIN_TOKEN")

	// 1. 验证：ADMIN_TOKEN 必须设置
	if adminToken == "" {
		utils.Fatal("ADMIN_TOKEN 环境变量未设置",
			zap.String("security", "管理员Token是必需的，用于保护管理接口"),
			zap.String("help", "请设置强随机密码"),
			zap.String("example", "export ADMIN_TOKEN=$(openssl rand -base64 32)"),
			zap.String("warning", "绝不使用弱密码或默认值"))
	}

	// 2. 验证：Token长度（至少16个字符）
	if len(adminToken) < 16 {
		utils.Fatal("ADMIN_TOKEN 长度不足",
			zap.Int("current_length", len(adminToken)),
			zap.Int("required_length", 16),
			zap.String("help", "请使用强随机密码: openssl rand -base64 32"))
	}

	// 3. 验证：检测常见弱密码
	weakPasswords := []string{
		"admin", "password", "123456", "qingflow", "qingflow7676",
		"test", "demo", "default", "secret",
	}
	adminTokenLower := strings.ToLower(adminToken)
	for _, weak := range weakPasswords {
		if strings.Contains(adminTokenLower, weak) {
			utils.Fatal("ADMIN_TOKEN 包含常见弱密码",
				zap.String("detected", weak),
				zap.String("security_risk", "容易被攻击者猜测"),
				zap.String("help", "请使用强随机密码: openssl rand -base64 32"))
		}
	}

	// 4. 配置通过验证
	cfg.Auth = AuthConfig{
		AdminToken: adminToken,
	}

	utils.Info("ADMIN_TOKEN 安全验证通过",
		zap.Int("length", len(adminToken)),
		zap.String("masked_token", utils.MaskToken(adminToken)))

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
// 🔥 配置校验：解析失败时记录 WARN 日志并返回默认值（帮助快速发现配置错误）
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

// 辅助函数：从环境变量读取浮点数
//
// 🔥 配置校验说明：
//   - 解析成功：返回解析后的浮点数值
//   - 解析失败：记录 WARN 日志并返回默认值
//   - 空值：直接返回默认值（不记录日志，这是正常行为）
func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		} else {
			utils.Warn("环境变量浮点数解析失败，使用默认值",
				zap.String("key", key),
				zap.String("invalid_value", value),
				zap.Float64("default", defaultValue),
				zap.Error(err))
		}
	}
	return defaultValue
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
