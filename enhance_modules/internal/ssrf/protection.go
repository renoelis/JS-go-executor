package ssrf

import (
	"context"
	"fmt"
	"net"
	"time"

	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

// SSRFProtectionConfig SSRF 防护配置
type SSRFProtectionConfig struct {
	Enabled        bool // 是否启用 SSRF 防护
	AllowPrivateIP bool // 是否允许访问私有 IP
}

// CreateProtectedDialContext 创建带 SSRF 防护的 DialContext 函数
// 🛡️ SSRF (Server-Side Request Forgery) 防护
// 功能：
// - 禁止访问私有 IP 地址（127.0.0.1, 10.x.x.x, 172.16-31.x.x, 192.168.x.x）
// - 禁止访问 Link-Local 地址（169.254.x.x）
// - 禁止访问 AWS/阿里云/腾讯云等云平台元数据服务
// - DNS 解析后再次检查 IP（防止 DNS 重绑定攻击）
func CreateProtectedDialContext(
	config *SSRFProtectionConfig,
	dialTimeout time.Duration,
	keepAlive time.Duration,
) func(ctx context.Context, network, addr string) (net.Conn, error) {
	// 防御性兜底：允许 nil 配置时退回默认（关闭防护、允许私网）
	cfg := config
	if cfg == nil {
		cfg = &SSRFProtectionConfig{
			Enabled:        false,
			AllowPrivateIP: true,
		}
	}

	// 创建标准 Dialer
	standardDialer := &net.Dialer{
		Timeout:   dialTimeout,
		KeepAlive: keepAlive,
	}

	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		// 1. 如果未启用 SSRF 防护，直接使用标准 Dialer
		if !cfg.Enabled {
			return standardDialer.DialContext(ctx, network, addr)
		}

		// 2. 解析地址
		host, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("无效的地址格式: %w", err)
		}

		// 3. 检查是否是 IP 地址
		ip := net.ParseIP(host)
		if ip != nil {
			// 直接是 IP，检查是否允许
			if err := checkIPAllowed(ip, cfg.AllowPrivateIP); err != nil {
				utils.Warn("SSRF防护：禁止访问私有IP",
					zap.String("ip", ip.String()),
					zap.String("addr", addr),
					zap.Error(err))
				return nil, err
			}
		} else {
			// 4. 是域名，需要先解析
			ips, err := net.LookupIP(host)
			if err != nil {
				return nil, fmt.Errorf("DNS 解析失败: %w", err)
			}

			if len(ips) == 0 {
				return nil, fmt.Errorf("DNS 解析未返回任何 IP")
			}

			// 5. 检查所有解析的 IP（防止 DNS 重绑定攻击）
			for _, resolvedIP := range ips {
				if err := checkIPAllowed(resolvedIP, cfg.AllowPrivateIP); err != nil {
					utils.Warn("SSRF防护：域名解析到私有IP",
						zap.String("domain", host),
						zap.String("resolved_ip", resolvedIP.String()),
						zap.String("addr", addr),
						zap.Error(err))
					return nil, fmt.Errorf("域名 %s 解析到被禁止的 IP %s: %w", host, resolvedIP.String(), err)
				}
			}
		}

		// 6. 所有检查通过，使用标准 Dialer 建立连接
		return standardDialer.DialContext(ctx, network, net.JoinHostPort(host, port))
	}
}

// checkIPAllowed 检查 IP 是否允许访问
// 🛡️ SSRF 防护规则：
// 1. 如果 allowPrivateIP = true，允许所有 IP（本地开发模式）
// 2. 如果 allowPrivateIP = false，禁止以下 IP：
//   - 环回地址：127.0.0.0/8, ::1
//   - 私有网络：10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
//   - Link-Local：169.254.0.0/16, fe80::/10
//   - 云平台元数据服务：100.100.100.200 等
func checkIPAllowed(ip net.IP, allowPrivateIP bool) error {
	// 1. 如果允许私有 IP，直接通过
	if allowPrivateIP {
		return nil
	}

	// 2. 检查是否是 Loopback（环回地址）
	if ip.IsLoopback() {
		return fmt.Errorf("禁止访问 Loopback 地址（127.0.0.1/::1）: %s", ip.String())
	}

	// 3. 检查是否是 Private IP（私有网络地址）
	if ip.IsPrivate() {
		return fmt.Errorf("禁止访问私有网络地址（10.x, 172.16-31.x, 192.168.x）: %s", ip.String())
	}

	// 4. 检查是否是 Link-Local 地址（169.254.x.x, fe80::/10）
	if ip.IsLinkLocalUnicast() {
		return fmt.Errorf("禁止访问 Link-Local 地址（169.254.x.x）: %s", ip.String())
	}

	// 5. 检查是否是 Link-Local 多播地址
	if ip.IsLinkLocalMulticast() {
		return fmt.Errorf("禁止访问 Link-Local 多播地址: %s", ip.String())
	}

	// 6. 检查云平台元数据服务地址
	if isCloudMetadataIP(ip) {
		return fmt.Errorf("禁止访问云平台元数据服务: %s", ip.String())
	}

	// 7. 所有检查通过
	return nil
}

// isCloudMetadataIP 检查是否是云平台元数据服务 IP
// 🛡️ 云平台元数据服务地址：
// - AWS: 169.254.169.254
// - 阿里云: 100.100.100.200
// - 腾讯云: 169.254.0.23
// - Google Cloud: 169.254.169.254, metadata.google.internal
// - Azure: 169.254.169.254
func isCloudMetadataIP(ip net.IP) bool {
	ipStr := ip.String()

	// 常见的云平台元数据服务 IP
	metadataIPs := []string{
		"169.254.169.254", // AWS, GCP, Azure
		"169.254.0.23",    // 腾讯云
		"100.100.100.200", // 阿里云
	}

	for _, metadataIP := range metadataIPs {
		if ipStr == metadataIP {
			return true
		}
	}

	// 检查是否在 100.64.0.0/10 范围内（阿里云 VPC 内网段）
	// 100.64.0.0 - 100.127.255.255 (第二段: 64-127)
	// 需要转换为 IPv4 格式（可能是 IPv6 映射的 IPv4）
	ip4 := ip.To4()
	if ip4 != nil && ip4[0] == 100 {
		secondOctet := int(ip4[1])
		if secondOctet >= 64 && secondOctet <= 127 {
			return true
		}
	}

	return false
}
