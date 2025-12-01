package fetch

import (
	"time"

	"flow-codeblock-go/enhance_modules/internal/formdata"
	"flow-codeblock-go/enhance_modules/internal/ssrf"
	"flow-codeblock-go/enhance_modules/internal/transport"
)

// FetchConfig 统一的 Fetch 配置结构体
// 🔥 设计目标：
// 1. 整合所有配置（HTTP、安全、FormData、响应体、超时）
// 2. 支持差异化限制（缓冲/流式）
// 3. 提供合理的默认值
// 4. 易于测试和验证
type FetchConfig struct {
	// ==================== HTTP Transport 配置 ====================
	TransportConfig *transport.HTTPTransportConfig // HTTP Transport 配置（连接池、超时等）

	// ==================== 安全配置 ====================
	SSRFConfig     *ssrf.SSRFProtectionConfig // SSRF 防护配置
	AllowedDomains []string                   // 白名单域名（额外的安全策略）

	// ==================== 超时配置 ====================
	// 🔥 多层超时保护（防止资源泄漏和慢速攻击）
	RequestTimeout          time.Duration // HTTP 请求超时（连接+发送+响应头）
	ResponseReadTimeout     time.Duration // 响应读取总时长超时（防止慢速读取攻击）
	ResponseBodyIdleTimeout time.Duration // 响应体空闲超时（完全不读取时触发）

	// ==================== 响应大小限制 ====================
	// 🔥 差异化限制：缓冲模式 vs 流式模式
	MaxResponseSize  int64 // 缓冲读取限制（arrayBuffer/blob/text/json）
	MaxStreamingSize int64 // 流式读取限制（getReader）

	// ==================== 请求体流式写入限制 ====================
	// 用于 ReadableStream 作为请求体时的缓冲上限（超过则阻塞等待消费，形成背压）
	RequestStreamBufferLimit int64

	// ==================== FormData 配置 ====================
	FormDataConfig *formdata.FormDataStreamConfig // FormData 流式处理配置

	// ==================== Blob/File 配置 ====================
	MaxBlobFileSize int64 // Blob/File 最大大小（字节）
}

// DefaultFetchConfig 创建默认配置
// 🔥 默认值设计原则：
// 1. 安全优先：启用 SSRF 防护（生产环境）
// 2. 性能优化：合理的连接池大小、HTTP/2 支持
// 3. 兼容性：适配 60 秒执行超时限制
// 4. 差异化限制：缓冲模式 1MB，流式模式 100MB
func DefaultFetchConfig() *FetchConfig {
	return &FetchConfig{
		// HTTP Transport 配置（高性能 + 安全）
		TransportConfig: &transport.HTTPTransportConfig{
			MaxIdleConns:          50,               // 全局最大空闲连接数
			MaxIdleConnsPerHost:   10,               // 每个 host 的最大空闲连接数
			MaxConnsPerHost:       100,              // 每个 host 的最大连接数（防止慢速攻击）
			IdleConnTimeout:       90 * time.Second, // 空闲连接超时
			DialTimeout:           10 * time.Second, // 连接超时
			KeepAlive:             30 * time.Second, // Keep-Alive 时间
			TLSHandshakeTimeout:   10 * time.Second, // TLS 握手超时
			ExpectContinueTimeout: 1 * time.Second,  // Expect: 100-continue 超时
			ForceHTTP2:            true,             // 启用 HTTP/2
		},

		// SSRF 防护（默认关闭以保持向后兼容）
		// 旧实现默认允许私网/localhost，保持零破坏性
		SSRFConfig: &ssrf.SSRFProtectionConfig{
			Enabled:        false,
			AllowPrivateIP: true,
		},

		// 白名单域名（空 = 允许所有公网域名）
		AllowedDomains: []string{},

		// 超时配置（保持旧版 5 分钟读取/空闲超时）
		RequestTimeout:          30 * time.Second, // HTTP 请求超时
		ResponseReadTimeout:     5 * time.Minute,  // 响应读取总时长超时（向后兼容旧版默认）
		ResponseBodyIdleTimeout: 5 * time.Minute,  // 响应体空闲超时（向后兼容旧版默认）

		// 响应大小限制（差异化）
		MaxResponseSize:  1 * 1024 * 1024,   // 缓冲模式：1MB（arrayBuffer/blob/text/json）
		MaxStreamingSize: 100 * 1024 * 1024, // 流式模式：100MB（getReader）

		// 请求体流式写入限制（有界缓冲，避免无限堆积）
		RequestStreamBufferLimit: 8 * 1024 * 1024, // 默认 8MB

		// FormData 配置（差异化限制）
		FormDataConfig: formdata.DefaultFormDataStreamConfig(),

		// Blob/File 限制
		MaxBlobFileSize: 50 * 1024 * 1024, // 默认 50MB
	}
}

// NewFetchConfig 创建自定义配置
// 🔥 使用 Functional Options 模式（可扩展）
func NewFetchConfig(opts ...FetchConfigOption) *FetchConfig {
	// 从默认配置开始
	config := DefaultFetchConfig()

	// 应用选项
	for _, opt := range opts {
		opt(config)
	}

	// 验证配置
	config.Validate()

	return config
}

// FetchConfigOption 配置选项函数
type FetchConfigOption func(*FetchConfig)

// WithRequestTimeout 设置请求超时
func WithRequestTimeout(timeout time.Duration) FetchConfigOption {
	return func(c *FetchConfig) {
		c.RequestTimeout = timeout
	}
}

// WithResponseReadTimeout 设置响应读取超时
func WithResponseReadTimeout(timeout time.Duration) FetchConfigOption {
	return func(c *FetchConfig) {
		c.ResponseReadTimeout = timeout
	}
}

// WithResponseBodyIdleTimeout 设置响应体空闲超时
func WithResponseBodyIdleTimeout(timeout time.Duration) FetchConfigOption {
	return func(c *FetchConfig) {
		c.ResponseBodyIdleTimeout = timeout
	}
}

// WithMaxResponseSize 设置缓冲模式响应大小限制
func WithMaxResponseSize(size int64) FetchConfigOption {
	return func(c *FetchConfig) {
		c.MaxResponseSize = size
	}
}

// WithMaxStreamingSize 设置流式模式响应大小限制
func WithMaxStreamingSize(size int64) FetchConfigOption {
	return func(c *FetchConfig) {
		c.MaxStreamingSize = size
	}
}

// WithRequestStreamBufferLimit 设置 ReadableStream 请求体的缓冲上限
func WithRequestStreamBufferLimit(limit int64) FetchConfigOption {
	return func(c *FetchConfig) {
		c.RequestStreamBufferLimit = limit
	}
}

// WithTransportConfig 设置 HTTP Transport 配置
func WithTransportConfig(config *transport.HTTPTransportConfig) FetchConfigOption {
	return func(c *FetchConfig) {
		c.TransportConfig = config
	}
}

// WithSSRFConfig 设置 SSRF 防护配置
func WithSSRFConfig(config *ssrf.SSRFProtectionConfig) FetchConfigOption {
	return func(c *FetchConfig) {
		c.SSRFConfig = config
	}
}

// WithAllowedDomains 设置白名单域名
func WithAllowedDomains(domains []string) FetchConfigOption {
	return func(c *FetchConfig) {
		c.AllowedDomains = domains
	}
}

// WithFormDataConfig 设置 FormData 配置
func WithFormDataConfig(config *formdata.FormDataStreamConfig) FetchConfigOption {
	return func(c *FetchConfig) {
		c.FormDataConfig = config
	}
}

// WithMaxBlobFileSize 设置 Blob/File 最大大小
func WithMaxBlobFileSize(size int64) FetchConfigOption {
	return func(c *FetchConfig) {
		c.MaxBlobFileSize = size
	}
}

// Validate 验证配置的合理性
// 🔥 验证规则：
// 1. 超时配置必须 > 0（保持旧版长超时兼容）
// 2. 大小限制必须 > 0
// 3. FormData 配置必须有效
// 4. SSRF 配置必须有效
func (c *FetchConfig) Validate() {
	// 1. 超时配置验证
	if c.RequestTimeout <= 0 {
		c.RequestTimeout = 30 * time.Second
	}

	if c.ResponseReadTimeout <= 0 {
		c.ResponseReadTimeout = 5 * time.Minute
	}

	if c.ResponseBodyIdleTimeout <= 0 {
		c.ResponseBodyIdleTimeout = 5 * time.Minute
	}

	// 2. 大小限制验证
	if c.MaxResponseSize <= 0 {
		c.MaxResponseSize = 1 * 1024 * 1024 // 默认 1MB
	}

	if c.MaxStreamingSize <= 0 {
		c.MaxStreamingSize = 100 * 1024 * 1024 // 默认 100MB
	}

	if c.RequestStreamBufferLimit <= 0 {
		c.RequestStreamBufferLimit = 8 * 1024 * 1024 // 默认 8MB
	}

	if c.MaxBlobFileSize <= 0 {
		c.MaxBlobFileSize = 50 * 1024 * 1024 // 默认 50MB
	}

	// 3. FormData 配置验证
	if c.FormDataConfig == nil {
		c.FormDataConfig = formdata.DefaultFormDataStreamConfig()
	}
	// 保底：如果未显式设置 FormData 超时，与请求超时保持一致（兼容旧实现）
	if c.FormDataConfig.Timeout <= 0 {
		c.FormDataConfig.Timeout = c.RequestTimeout
	}
	// 确保 FormData 流式队列容量有效（兼容旧配置未设置新字段的情况）
	if c.FormDataConfig.StreamChunkQueueSize <= 0 || c.FormDataConfig.StreamBacklogQueueSize <= 0 {
		defaultCfg := formdata.DefaultFormDataStreamConfig()
		if c.FormDataConfig.StreamChunkQueueSize <= 0 {
			c.FormDataConfig.StreamChunkQueueSize = defaultCfg.StreamChunkQueueSize
		}
		if c.FormDataConfig.StreamBacklogQueueSize <= 0 {
			c.FormDataConfig.StreamBacklogQueueSize = defaultCfg.StreamBacklogQueueSize
		}
	}

	// 4. Transport 配置验证
	if c.TransportConfig == nil {
		c.TransportConfig = &transport.HTTPTransportConfig{
			MaxIdleConns:          50,
			MaxIdleConnsPerHost:   10,
			MaxConnsPerHost:       100,
			IdleConnTimeout:       90 * time.Second,
			DialTimeout:           10 * time.Second,
			KeepAlive:             30 * time.Second,
			TLSHandshakeTimeout:   10 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
			ForceHTTP2:            true,
		}
	}

	// 5. SSRF 配置验证
	if c.SSRFConfig == nil {
		c.SSRFConfig = &ssrf.SSRFProtectionConfig{
			Enabled:        false, // 默认禁用（兼容性）
			AllowPrivateIP: true,
		}
	}
}

// NewDevelopmentConfig 创建开发环境配置
// 🔥 特点：
// 1. 禁用 SSRF 防护（允许 localhost）
// 2. 较短的超时（快速失败）
// 3. 较小的限制（快速测试）
func NewDevelopmentConfig() *FetchConfig {
	return NewFetchConfig(
		WithRequestTimeout(10*time.Second),
		WithResponseReadTimeout(15*time.Second),
		WithResponseBodyIdleTimeout(10*time.Second),
		WithMaxResponseSize(1*1024*1024),   // 1MB
		WithMaxStreamingSize(10*1024*1024), // 10MB
		WithMaxBlobFileSize(5*1024*1024),   // 5MB
		WithSSRFConfig(&ssrf.SSRFProtectionConfig{
			Enabled:        false, // 禁用 SSRF 防护
			AllowPrivateIP: true,  // 允许私有 IP
		}),
	)
}

// NewProductionConfig 创建生产环境配置
// 🔥 特点：
// 1. 启用 SSRF 防护（禁止私有 IP）
// 2. 较长的超时（容错性）
// 3. 较大的限制（生产负载）
// 4. 可选域名白名单
func NewProductionConfig(allowedDomains []string) *FetchConfig {
	return NewFetchConfig(
		WithRequestTimeout(30*time.Second),
		WithResponseReadTimeout(35*time.Second),
		WithResponseBodyIdleTimeout(30*time.Second),
		WithMaxResponseSize(1*1024*1024),    // 1MB
		WithMaxStreamingSize(100*1024*1024), // 100MB
		WithMaxBlobFileSize(50*1024*1024),   // 50MB
		WithSSRFConfig(&ssrf.SSRFProtectionConfig{
			Enabled:        true,  // 启用 SSRF 防护
			AllowPrivateIP: false, // 禁止私有 IP
		}),
		WithAllowedDomains(allowedDomains),
	)
}
