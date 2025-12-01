package enhance_modules

import (
	"context"
	"fmt"
	"net"
	"time"

	"flow-codeblock-go/enhance_modules/fetch"
	"flow-codeblock-go/enhance_modules/internal/formdata"
	"flow-codeblock-go/enhance_modules/internal/ssrf"
	"flow-codeblock-go/enhance_modules/internal/transport"
)

// ==================== 类型别名（向后兼容） ====================
// 🔥 目的：保持现有代码的导入路径不变
// 重构前：import "enhance_modules" 使用 enhance_modules.FetchConfig
// 重构后：仍可使用 enhance_modules.FetchConfig（实际指向 fetch.FetchConfig）

// FetchConfig 配置别名
type FetchConfig = fetch.FetchConfig

// HTTPTransportConfig Transport 配置别名
type HTTPTransportConfig = transport.HTTPTransportConfig

// SSRFProtectionConfig SSRF 防护配置别名
type SSRFProtectionConfig = ssrf.SSRFProtectionConfig

// FormDataStreamConfig FormData 流式配置别名
type FormDataStreamConfig = formdata.FormDataStreamConfig

// StreamingFormData 流式 FormData 别名
type StreamingFormData = formdata.StreamingFormData

// FetchEnhancer Fetch 增强器别名
type FetchEnhancer = fetch.FetchEnhancer

// ==================== 工厂函数包装（向后兼容） ====================
// 🔥 目的：保持现有代码的 API 调用不变

// NewFetchEnhancer 创建 Fetch 增强器
// 🔥 支持两种调用方式：
// 1. NewFetchEnhancer() - 使用默认配置
// 2. NewFetchEnhancer(timeout) - 使用指定超时（向后兼容）
func NewFetchEnhancer(args ...time.Duration) *FetchEnhancer {
	if len(args) == 0 {
		// 无参数版本：使用默认配置
		return fetch.NewFetchEnhancer()
	}
	// 单参数版本：带超时参数（向后兼容旧 API）
	timeout := args[0]

	// 旧版行为：请求超时由参数决定，读取/空闲超时默认为 5 分钟，FormData 超时跟随请求超时
	formDataCfg := formdata.DefaultFormDataStreamConfig()
	formDataCopy := *formDataCfg
	formDataCopy.Timeout = timeout

	return fetch.NewFetchEnhancerWithConfig(
		fetch.NewFetchConfig(
			fetch.WithRequestTimeout(timeout),
			fetch.WithResponseReadTimeout(5*time.Minute),
			fetch.WithResponseBodyIdleTimeout(5*time.Minute),
			fetch.WithFormDataConfig(&formDataCopy),
		),
	)
}

// NewFetchEnhancerWithConfig 创建 Fetch 增强器（使用自定义配置）
// 🔥 支持两种调用方式：
// 1. NewFetchEnhancerWithConfig(config *FetchConfig) - 新 API（推荐）
// 2. NewFetchEnhancerWithConfig(13个位置参数)      - 旧 API（完全保持原有顺序）
//
// 旧 API 参数顺序（与原单体版一致）：
// timeout, responseReadTimeout, maxBufferedFormDataSize, maxStreamingFormDataSize,
// enableChunked, maxBlobFileSize, bufferSize, maxFileSize,
// maxResponseSize, maxStreamingSize, httpTransportConfig, responseBodyIdleTimeout, ssrfProtectionConfig
func NewFetchEnhancerWithConfig(args ...interface{}) (*FetchEnhancer, error) {
	argErr := func(index int, expect string, got interface{}) error {
		return fmt.Errorf("NewFetchEnhancerWithConfig: 第 %d 个参数期望 %s，收到 %T", index, expect, got)
	}

	// 新 API：接收单个 *FetchConfig 参数
	if len(args) == 1 {
		if config, ok := args[0].(*FetchConfig); ok {
			return fetch.NewFetchEnhancerWithConfig(config), nil
		}
		return nil, argErr(1, "*FetchConfig", args[0])
	}

	// 旧 API：固定 13 个参数
	if len(args) == 13 {
		timeout, ok1 := args[0].(time.Duration)
		if !ok1 {
			return nil, argErr(1, "time.Duration", args[0])
		}
		responseReadTimeout, ok2 := args[1].(time.Duration)
		if !ok2 {
			return nil, argErr(2, "time.Duration", args[1])
		}
		maxBufferedFormDataSize, ok3 := args[2].(int64)
		if !ok3 {
			return nil, argErr(3, "int64", args[2])
		}
		maxStreamingFormDataSize, ok4 := args[3].(int64)
		if !ok4 {
			return nil, argErr(4, "int64", args[3])
		}
		enableChunked, ok5 := args[4].(bool)
		if !ok5 {
			return nil, argErr(5, "bool", args[4])
		}
		maxBlobFileSize, ok6 := args[5].(int64)
		if !ok6 {
			return nil, argErr(6, "int64", args[5])
		}
		bufferSize, ok7 := args[6].(int)
		if !ok7 {
			return nil, argErr(7, "int", args[6])
		}
		maxFileSize, ok8 := args[7].(int64)
		if !ok8 {
			return nil, argErr(8, "int64", args[7])
		}
		maxResponseSize, ok9 := args[8].(int64)
		if !ok9 {
			return nil, argErr(9, "int64", args[8])
		}
		maxStreamingSize, ok10 := args[9].(int64)
		if !ok10 {
			return nil, argErr(10, "int64", args[9])
		}
		httpTransportConfig, ok11 := args[10].(*transport.HTTPTransportConfig)
		if !ok11 {
			return nil, argErr(11, "*transport.HTTPTransportConfig", args[10])
		}
		responseBodyIdleTimeout, ok12 := args[11].(time.Duration)
		if !ok12 {
			return nil, argErr(12, "time.Duration", args[11])
		}
		ssrfProtectionConfig, ok13 := args[12].(*ssrf.SSRFProtectionConfig)
		if !ok13 {
			return nil, argErr(13, "*ssrf.SSRFProtectionConfig", args[12])
		}

		config := fetch.NewFetchConfig(
			fetch.WithRequestTimeout(timeout),
			fetch.WithResponseReadTimeout(responseReadTimeout),
			fetch.WithResponseBodyIdleTimeout(responseBodyIdleTimeout),
			fetch.WithMaxResponseSize(maxResponseSize),
			fetch.WithMaxStreamingSize(maxStreamingSize),
			fetch.WithMaxBlobFileSize(maxBlobFileSize),
			fetch.WithFormDataConfig(&formdata.FormDataStreamConfig{
				MaxBufferedFormDataSize:  maxBufferedFormDataSize,
				MaxStreamingFormDataSize: maxStreamingFormDataSize,
				EnableChunkedUpload:      enableChunked,
				BufferSize:               bufferSize,
				MaxFileSize:              maxFileSize,
				Timeout:                  timeout,
			}),
			fetch.WithTransportConfig(httpTransportConfig),
			fetch.WithSSRFConfig(ssrfProtectionConfig),
		)

		return fetch.NewFetchEnhancerWithConfig(config), nil
	}

	// 参数错误
	return nil, fmt.Errorf("NewFetchEnhancerWithConfig: 不支持的参数数量 %d（期望 1 或 13）", len(args))
}

// MustNewFetchEnhancerWithConfig 兼容旧行为：内部 panic，供确需失败即崩溃的场景使用
func MustNewFetchEnhancerWithConfig(args ...interface{}) *FetchEnhancer {
	enhancer, err := NewFetchEnhancerWithConfig(args...)
	if err != nil {
		panic(err)
	}
	return enhancer
}

// NewStreamingFormData 创建 StreamingFormData 实例
func NewStreamingFormData(config *FormDataStreamConfig) *StreamingFormData {
	return formdata.NewStreamingFormData(config)
}

// NewFetchConfig 创建自定义配置（包装）
func NewFetchConfig(opts ...fetch.FetchConfigOption) *FetchConfig {
	return fetch.NewFetchConfig(opts...)
}

// DefaultFetchConfig 创建默认配置（包装）
func DefaultFetchConfig() *FetchConfig {
	return fetch.DefaultFetchConfig()
}

// NewDevelopmentConfig 创建开发环境配置（包装）
func NewDevelopmentConfig() *FetchConfig {
	return fetch.NewDevelopmentConfig()
}

// NewProductionConfig 创建生产环境配置（包装）
func NewProductionConfig(allowedDomains []string) *FetchConfig {
	return fetch.NewProductionConfig(allowedDomains)
}

// ==================== 配置选项函数（向后兼容） ====================

// WithRequestTimeout 设置请求超时
func WithRequestTimeout(timeout time.Duration) fetch.FetchConfigOption {
	return fetch.WithRequestTimeout(timeout)
}

// WithResponseReadTimeout 设置响应读取超时
func WithResponseReadTimeout(timeout time.Duration) fetch.FetchConfigOption {
	return fetch.WithResponseReadTimeout(timeout)
}

// WithResponseBodyIdleTimeout 设置响应体空闲超时
func WithResponseBodyIdleTimeout(timeout time.Duration) fetch.FetchConfigOption {
	return fetch.WithResponseBodyIdleTimeout(timeout)
}

// WithMaxResponseSize 设置缓冲模式响应大小限制
func WithMaxResponseSize(size int64) fetch.FetchConfigOption {
	return fetch.WithMaxResponseSize(size)
}

// WithMaxStreamingSize 设置流式模式响应大小限制
func WithMaxStreamingSize(size int64) fetch.FetchConfigOption {
	return fetch.WithMaxStreamingSize(size)
}

// WithRequestStreamBufferLimit 设置 ReadableStream 请求体的缓冲上限
func WithRequestStreamBufferLimit(limit int64) fetch.FetchConfigOption {
	return fetch.WithRequestStreamBufferLimit(limit)
}

// WithTransportConfig 设置 HTTP Transport 配置
func WithTransportConfig(config *transport.HTTPTransportConfig) fetch.FetchConfigOption {
	return fetch.WithTransportConfig(config)
}

// WithSSRFConfig 设置 SSRF 防护配置
func WithSSRFConfig(config *ssrf.SSRFProtectionConfig) fetch.FetchConfigOption {
	return fetch.WithSSRFConfig(config)
}

// WithAllowedDomains 设置白名单域名
func WithAllowedDomains(domains []string) fetch.FetchConfigOption {
	return fetch.WithAllowedDomains(domains)
}

// WithFormDataConfig 设置 FormData 配置
func WithFormDataConfig(config *formdata.FormDataStreamConfig) fetch.FetchConfigOption {
	return fetch.WithFormDataConfig(config)
}

// WithMaxBlobFileSize 设置 Blob/File 最大大小
func WithMaxBlobFileSize(size int64) fetch.FetchConfigOption {
	return fetch.WithMaxBlobFileSize(size)
}

// ==================== 安全函数（向后兼容） ====================

// CheckProtocol 协议安全检查
func CheckProtocol(scheme string) error {
	return fetch.CheckProtocol(scheme)
}

// CheckURL 完整 URL 安全检查
func CheckURL(rawURL string) error {
	return fetch.CheckURL(rawURL)
}

// IsAllowedDomain 检查域名是否在白名单中
func IsAllowedDomain(host string, allowedDomains []string) bool {
	return fetch.IsAllowedDomain(host, allowedDomains)
}

// CheckDomainWhitelist 检查 URL 的域名是否在白名单中
func CheckDomainWhitelist(rawURL string, allowedDomains []string) error {
	return fetch.CheckDomainWhitelist(rawURL, allowedDomains)
}

// ValidateRequestURL 验证请求 URL 的完整安全性
func ValidateRequestURL(rawURL string, allowedDomains []string) error {
	return fetch.ValidateRequestURL(rawURL, allowedDomains)
}

// ==================== FormData 辅助函数（向后兼容） ====================

// DefaultFormDataStreamConfig 默认 FormData 配置
func DefaultFormDataStreamConfig() *FormDataStreamConfig {
	return formdata.DefaultFormDataStreamConfig()
}

// DefaultFormDataStreamConfigWithBuffer 创建带自定义缓冲区的默认配置
func DefaultFormDataStreamConfigWithBuffer(bufferSize int, maxBufferedSize, maxStreamingSize, maxFileSize int64, timeout time.Duration) *FormDataStreamConfig {
	return formdata.DefaultFormDataStreamConfigWithBuffer(bufferSize, maxBufferedSize, maxStreamingSize, maxFileSize, timeout)
}

// ==================== SSRF 防护辅助函数（向后兼容） ====================

// CreateProtectedDialContext 创建带 SSRF 防护的 DialContext 函数
// 🛡️ 注意：这是 internal/ssrf 的导出，用于特殊场景
// 通常情况下，应该使用 FetchConfig 配置 SSRF 防护，而不是直接调用此函数
func CreateProtectedDialContext(
	config *SSRFProtectionConfig,
	dialTimeout time.Duration,
	keepAlive time.Duration,
) func(ctx context.Context, network, addr string) (net.Conn, error) {
	return ssrf.CreateProtectedDialContext(config, dialTimeout, keepAlive)
}

// ==================== 注释说明 ====================
// 🔥 重构说明：
//
// 1. **向后兼容性**：
//    - 保持所有公开 API 的签名不变
//    - 保持导入路径不变（enhance_modules）
//    - 现有代码无需修改
//
// 2. **新代码推荐**：
//    - 直接导入 "enhance_modules/fetch"
//    - 直接导入 "enhance_modules/internal/formdata"
//    - 直接导入 "enhance_modules/internal/ssrf"
//
// 3. **类型别名 vs 包装函数**：
//    - 类型：使用类型别名（type XXX = fetch.XXX）
//    - 函数：使用包装函数（直接调用子包）
//
// 4. **依赖关系**：
//    - enhance_modules → fetch (适配层依赖子包)
//    - fetch → internal/* (子包依赖 internal)
//    - ✅ 无循环依赖
