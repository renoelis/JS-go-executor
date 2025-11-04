package qs

import (
	"strings"
)

// ============================================================================
// Formats - 格式化常量和函数（完整手动实现）
// 对应 Node.js qs 的 lib/formats.js
// ============================================================================

// Format 格式类型
type Format string

const (
	// RFC1738 格式：空格编码为 +
	RFC1738 Format = "RFC1738"

	// RFC3986 格式：空格编码为 %20（默认）
	RFC3986 Format = "RFC3986"
)

// DefaultFormat 默认格式
const DefaultFormat = RFC3986

// ============================================================================
// Formatter 函数类型
// ============================================================================

// FormatterFunc 格式化函数类型
// 将值转换为查询字符串的最终格式
type FormatterFunc func(value string) string

// ============================================================================
// 格式化函数映射
// ============================================================================

// Formatters 格式化函数映射
var Formatters = map[Format]FormatterFunc{
	RFC1738: FormatterRFC1738,
	RFC3986: FormatterRFC3986,
}

// FormatterRFC1738 RFC1738 格式化函数
// 将 %20 替换为 +
func FormatterRFC1738(value string) string {
	return strings.ReplaceAll(value, "%20", "+")
}

// FormatterRFC3986 RFC3986 格式化函数
// 保持 %20 不变（默认）
func FormatterRFC3986(value string) string {
	return value
}

// GetFormatter 获取格式化函数
func GetFormatter(format Format) FormatterFunc {
	if formatter, exists := Formatters[format]; exists {
		return formatter
	}
	return Formatters[DefaultFormat]
}

// FormatValue 格式化值
func FormatValue(value string, format Format) string {
	formatter := GetFormatter(format)
	return formatter(value)
}
