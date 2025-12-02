package utils

import (
	"net"
)

// ParsedIPRule 预解析后的IP规则
type ParsedIPRule struct {
	IsRange bool
	IP      net.IP
	IPNet   *net.IPNet
}

// ParseIPWhitelist 解析IP白名单，支持IPv4/IPv6单地址和CIDR
func ParseIPWhitelist(rules []string) []ParsedIPRule {
	if len(rules) == 0 {
		return nil
	}

	parsed := make([]ParsedIPRule, 0, len(rules))
	for _, rule := range rules {
		if _, ipNet, err := net.ParseCIDR(rule); err == nil {
			parsed = append(parsed, ParsedIPRule{IsRange: true, IPNet: ipNet})
			continue
		}
		if ip := net.ParseIP(rule); ip != nil {
			parsed = append(parsed, ParsedIPRule{IsRange: false, IP: ip})
		}
	}
	return parsed
}

// MatchIPWithParsedRules 在预解析规则中匹配IP
func MatchIPWithParsedRules(clientIPStr string, rules []ParsedIPRule) bool {
	if len(rules) == 0 {
		return true // 未配置即全开放
	}

	clientIP := net.ParseIP(clientIPStr)
	if clientIP == nil {
		return false
	}

	for _, rule := range rules {
		if rule.IsRange {
			if rule.IPNet.Contains(clientIP) {
				return true
			}
			continue
		}
		if rule.IP.Equal(clientIP) {
			return true
		}
	}
	return false
}
