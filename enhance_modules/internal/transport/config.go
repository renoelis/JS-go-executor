package transport

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"time"

	"golang.org/x/net/http2"
)

// HTTPTransportConfig HTTP Transport 配置
type HTTPTransportConfig struct {
	MaxIdleConns          int           // 最大空闲连接数
	MaxIdleConnsPerHost   int           // 每个 host 的最大空闲连接数
	MaxConnsPerHost       int           // 每个 host 的最大连接数
	IdleConnTimeout       time.Duration // 空闲连接超时
	DialTimeout           time.Duration // 连接建立超时
	KeepAlive             time.Duration // Keep-Alive 间隔
	TLSHandshakeTimeout   time.Duration // TLS 握手超时
	ExpectContinueTimeout time.Duration // 期望继续超时
	ForceHTTP2            bool          // 启用 HTTP/2
}

// DefaultHTTPTransportConfig 返回默认的 HTTP Transport 配置
func DefaultHTTPTransportConfig() *HTTPTransportConfig {
	return &HTTPTransportConfig{
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

// CreateHTTPTransport 创建 HTTP Transport
// dialContext: 自定义的 DialContext 函数（可以包含 SSRF 防护）
// config: Transport 配置
func CreateHTTPTransport(
	dialContext func(ctx context.Context, network, addr string) (net.Conn, error),
	config *HTTPTransportConfig,
) *http.Transport {
	if config == nil {
		config = DefaultHTTPTransportConfig()
	}

	transport := &http.Transport{
		DialContext:           dialContext,
		MaxIdleConns:          config.MaxIdleConns,
		MaxIdleConnsPerHost:   config.MaxIdleConnsPerHost,
		MaxConnsPerHost:       config.MaxConnsPerHost,
		IdleConnTimeout:       config.IdleConnTimeout,
		TLSHandshakeTimeout:   config.TLSHandshakeTimeout,
		ExpectContinueTimeout: config.ExpectContinueTimeout,
		// 🔥 启用压缩（gzip、deflate）
		DisableCompression: false,
		// 🔥 禁用长连接时的自动重试（避免幂等性问题）
		DisableKeepAlives: false,
	}

	// 启用 HTTP/2
	if config.ForceHTTP2 {
		http2.ConfigureTransport(transport)
	}

	return transport
}

// CreateHTTPTransportWithTLS 创建带 TLS 配置的 HTTP Transport
func CreateHTTPTransportWithTLS(
	dialContext func(ctx context.Context, network, addr string) (net.Conn, error),
	config *HTTPTransportConfig,
	tlsConfig *tls.Config,
) *http.Transport {
	transport := CreateHTTPTransport(dialContext, config)
	transport.TLSClientConfig = tlsConfig
	return transport
}
