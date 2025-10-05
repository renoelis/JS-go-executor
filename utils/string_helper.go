package utils

const (
	// DefaultTokenMaskLength Token脱敏默认显示长度
	// 用于日志和API响应中的Token安全显示
	// 15位足以识别Token前缀，同时保护完整Token不泄露
	DefaultTokenMaskLength = 15
)

// SafeSubstring 安全地截取字符串，避免越界
func SafeSubstring(s string, length int) string {
	if len(s) <= length {
		return s
	}
	return s[:length]
}

// MaskToken 使用默认长度遮蔽Token，显示前15个字符
// 这是最常用的方法，适用于日志记录和安全显示
func MaskToken(token string) string {
	return MaskTokenWithLength(token, DefaultTokenMaskLength)
}

// MaskTokenWithLength 使用指定长度遮蔽Token，显示前N个字符
// 保留此方法用于特殊场景（如需要不同的显示长度）
func MaskTokenWithLength(token string, showLength int) string {
	if token == "" {
		return ""
	}
	if len(token) <= showLength {
		return token + "***"
	}
	return token[:showLength] + "***"
}
