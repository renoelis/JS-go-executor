package fetch

import (
	"fmt"
	"net/url"
	"strings"
)

// ALLOWED_PROTOCOLS 允许的协议列表
// 🔥 安全策略：仅允许 HTTP/HTTPS，禁止 file:// data:// javascript:// 等危险协议
var ALLOWED_PROTOCOLS = []string{"http", "https"}

// CheckProtocol 协议安全检查
// 🔥 防护目标：
// 1. 防止 SSRF 攻击（file:// 协议读取本地文件）
// 2. 防止 XSS 攻击（javascript:// data:// 协议执行代码）
// 3. 防止协议走私（ftp:// gopher:// 等非标准协议）
func CheckProtocol(scheme string) error {
	scheme = strings.ToLower(strings.TrimSpace(scheme))

	// 检查是否在允许列表中
	for _, allowed := range ALLOWED_PROTOCOLS {
		if scheme == allowed {
			return nil
		}
	}

	return fmt.Errorf("Unsupported protocol: %s (http/https only)", scheme)
}

// CheckURL 完整 URL 安全检查
// 🔥 包含协议检查 + URL 格式验证
func CheckURL(rawURL string) error {
	// 解析 URL
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("无效的 URL 格式: %w", err)
	}

	// 检查协议
	if err := CheckProtocol(parsedURL.Scheme); err != nil {
		return err
	}

	// 检查主机名不为空
	if parsedURL.Host == "" {
		return fmt.Errorf("URL 缺少主机名: %s", rawURL)
	}

	return nil
}

// IsAllowedDomain 检查域名是否在白名单中
// 🔥 白名单策略：
// 1. 如果白名单为空，允许所有域名（默认行为）
// 2. 如果白名单非空，仅允许白名单中的域名
// 3. 支持精确匹配（example.com）和通配符子域名（*.example.com）
//
// 匹配规则：
// - "example.com" 匹配 "example.com" 和 "www.example.com"（包含子域名）
// - "*.example.com" 仅匹配子域名，不匹配 "example.com" 本身
// - "api.example.com" 精确匹配 "api.example.com"
func IsAllowedDomain(host string, allowedDomains []string) bool {
	// 1. 白名单为空，允许所有域名
	if len(allowedDomains) == 0 {
		return true
	}

	// 2. 提取主机名（移除端口号）
	// 例如：example.com:8080 -> example.com
	host = strings.ToLower(strings.TrimSpace(host))
	if colonIdx := strings.Index(host, ":"); colonIdx != -1 {
		host = host[:colonIdx]
	}

	// 3. 遍历白名单检查匹配
	for _, allowed := range allowedDomains {
		allowed = strings.ToLower(strings.TrimSpace(allowed))

		// 3.1 精确匹配
		if host == allowed {
			return true
		}

		// 3.2 通配符匹配（*.example.com）
		if strings.HasPrefix(allowed, "*.") {
			// 移除 "*." 前缀
			baseDomain := allowed[2:]
			// 检查是否是子域名
			// 例如：host=api.example.com, baseDomain=example.com
			// 应该匹配：host 以 ".baseDomain" 结尾
			if strings.HasSuffix(host, "."+baseDomain) {
				return true
			}
		}

		// 3.3 包含子域名的匹配
		// 例如：allowed=example.com, host=www.example.com
		// 规则：host 以 ".allowed" 结尾，或 host == allowed
		if strings.HasSuffix(host, "."+allowed) {
			return true
		}
	}

	// 4. 未匹配任何白名单规则
	return false
}

// CheckDomainWhitelist 检查 URL 的域名是否在白名单中
// 🔥 组合检查：URL 解析 + 域名白名单验证
func CheckDomainWhitelist(rawURL string, allowedDomains []string) error {
	// 1. 解析 URL
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("无效的 URL 格式: %w", err)
	}

	// 2. 检查域名白名单
	if !IsAllowedDomain(parsedURL.Host, allowedDomains) {
		return fmt.Errorf("域名不在白名单中: %s", parsedURL.Host)
	}

	return nil
}

// ValidateRequestURL 验证请求 URL 的完整安全性
// 🔥 完整安全检查流程：
// 1. URL 格式验证
// 2. 协议检查（仅 http/https）
// 3. 域名白名单检查（如果配置）
func ValidateRequestURL(rawURL string, allowedDomains []string) error {
	// 1. URL 格式 + 协议检查
	if err := CheckURL(rawURL); err != nil {
		return err
	}

	// 2. 域名白名单检查（如果配置）
	if len(allowedDomains) > 0 {
		if err := CheckDomainWhitelist(rawURL, allowedDomains); err != nil {
			return err
		}
	}

	return nil
}

// NormalizeDomain 规范化域名格式
// 🔥 用途：统一域名格式，方便比较和匹配
// - 移除前后空格
// - 转换为小写
// - 移除尾部的点号（example.com. -> example.com）
func NormalizeDomain(domain string) string {
	domain = strings.ToLower(strings.TrimSpace(domain))
	domain = strings.TrimSuffix(domain, ".")
	return domain
}

// ParseHostPort 解析主机名和端口
// 🔥 兼容处理：
// - IPv4: 192.168.1.1:8080 -> (192.168.1.1, 8080)
// - IPv6: [::1]:8080 -> (::1, 8080)
// - 域名: example.com:443 -> (example.com, 443)
// - 无端口: example.com -> (example.com, "")
func ParseHostPort(hostPort string) (host string, port string, err error) {
	// 尝试解析（支持 IPv6）
	host, port, err = splitHostPort(hostPort)
	if err != nil {
		// 可能没有端口号
		host = hostPort
		port = ""
		err = nil
	}

	// 规范化主机名
	host = NormalizeDomain(host)

	return host, port, nil
}

// splitHostPort 分离主机名和端口（内部辅助函数）
// 🔥 兼容 net.SplitHostPort 但更宽容
func splitHostPort(hostPort string) (host, port string, err error) {
	// 检查是否包含端口
	if !strings.Contains(hostPort, ":") {
		return hostPort, "", nil
	}

	// IPv6 地址处理
	if strings.HasPrefix(hostPort, "[") {
		// [::1]:8080 格式
		closeBracket := strings.Index(hostPort, "]")
		if closeBracket == -1 {
			return "", "", fmt.Errorf("无效的 IPv6 地址格式: %s", hostPort)
		}

		host = hostPort[1:closeBracket] // 移除 []
		if closeBracket+1 < len(hostPort) && hostPort[closeBracket+1] == ':' {
			port = hostPort[closeBracket+2:]
		}
		return host, port, nil
	}

	// IPv4 或域名
	lastColon := strings.LastIndex(hostPort, ":")
	if lastColon == -1 {
		return hostPort, "", nil
	}

	host = hostPort[:lastColon]
	port = hostPort[lastColon+1:]
	return host, port, nil
}

// IsSafeRedirectURL 检查重定向 URL 是否安全
// 🔥 重定向安全策略：
// 1. 必须是 http/https 协议
// 2. 如果配置了域名白名单，必须在白名单中
// 3. 不允许重定向到本地文件、数据 URI 等危险协议
func IsSafeRedirectURL(redirectURL string, allowedDomains []string) error {
	return ValidateRequestURL(redirectURL, allowedDomains)
}

// GetDomainFromURL 从 URL 中提取域名
// 🔥 用途：日志记录、白名单匹配等
func GetDomainFromURL(rawURL string) (string, error) {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("无效的 URL: %w", err)
	}

	// 检查必须有 scheme（不能是相对 URL）
	if parsedURL.Scheme == "" {
		return "", fmt.Errorf("URL 缺少协议: %s", rawURL)
	}

	// 检查必须有 Host
	if parsedURL.Host == "" {
		return "", fmt.Errorf("URL 缺少主机名: %s", rawURL)
	}

	// 提取主机名（移除端口）
	host, _, err := ParseHostPort(parsedURL.Host)
	if err != nil {
		return "", fmt.Errorf("无效的主机名: %w", err)
	}

	return host, nil
}
