package config

import (
	"log"
	"os"
	"runtime"
	"strconv"
	"time"
)

// Config 应用程序配置
type Config struct {
	Server   ServerConfig
	Executor ExecutorConfig
	Fetch    FetchConfig
	Runtime  RuntimeConfig
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

// LoadConfig 从环境变量加载配置
func LoadConfig() *Config {
	cfg := &Config{}

	// 加载服务器配置
	cfg.Server = ServerConfig{
		Port:         getEnvString("PORT", "3002"),
		GinMode:      getEnvString("GIN_MODE", "release"),
		ReadTimeout:  time.Duration(getEnvInt("EXECUTION_TIMEOUT_MS", 300000)) * time.Millisecond,
		WriteTimeout: time.Duration(getEnvInt("EXECUTION_TIMEOUT_MS", 300000)) * time.Millisecond,
	}

	// 加载执行器配置
	poolSize := getEnvInt("RUNTIME_POOL_SIZE", 100)
	minPoolSize := getEnvInt("MIN_RUNTIME_POOL_SIZE", 50)
	maxPoolSize := getEnvInt("MAX_RUNTIME_POOL_SIZE", 200)
	idleTimeoutMin := getEnvInt("RUNTIME_IDLE_TIMEOUT_MIN", 5)

	// 配置合法性检查
	if minPoolSize < 10 {
		minPoolSize = 10
		log.Printf("⚠️  MIN_RUNTIME_POOL_SIZE 过小，已调整为 10")
	}
	if maxPoolSize < minPoolSize {
		maxPoolSize = minPoolSize * 2
		log.Printf("⚠️  MAX_RUNTIME_POOL_SIZE 小于 MIN_RUNTIME_POOL_SIZE，已调整为 %d", maxPoolSize)
	}
	if poolSize < minPoolSize {
		poolSize = minPoolSize
	}
	if poolSize > maxPoolSize {
		poolSize = maxPoolSize
	}

	cfg.Executor = ExecutorConfig{
		PoolSize:         poolSize,
		MinPoolSize:      minPoolSize,
		MaxPoolSize:      maxPoolSize,
		IdleTimeout:      time.Duration(idleTimeoutMin) * time.Minute,
		MaxConcurrent:    getEnvInt("MAX_CONCURRENT_EXECUTIONS", 1000),
		MaxCodeLength:    getEnvInt("MAX_CODE_LENGTH", 65535),
		MaxInputSize:     getEnvInt("MAX_INPUT_SIZE", 2*1024*1024),
		MaxResultSize:    getEnvInt("MAX_RESULT_SIZE", 5*1024*1024),
		ExecutionTimeout: time.Duration(getEnvInt("EXECUTION_TIMEOUT_MS", 300000)) * time.Millisecond,
		CodeCacheSize:    getEnvInt("CODE_CACHE_SIZE", 100),
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

	log.Printf("🔧 Go运行时配置: GOMAXPROCS=%d, GOGC=%s",
		runtime.GOMAXPROCS(0), os.Getenv("GOGC"))
}

// 辅助函数：从环境变量读取字符串
func getEnvString(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// 辅助函数：从环境变量读取整数
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
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
