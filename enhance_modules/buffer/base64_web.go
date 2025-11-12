package buffer

import (
	"encoding/base64"
	"errors"
	"regexp"
	"strings"

	"github.com/dop251/goja"
)

// Web 标准 Base64 字符集 (RFC 4648)
const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

// RegisterBase64Functions 注册 btoa 和 atob 函数到 goja runtime
func RegisterBase64Functions(runtime *goja.Runtime) {
	// btoa - 二进制到 ASCII (Base64 编码)
	runtime.Set("btoa", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("btoa: At least 1 argument required"))
		}
		input := call.Arguments[0].String()
		encoded := base64.StdEncoding.EncodeToString([]byte(input))
		return runtime.ToValue(encoded)
	})

	// atob - ASCII 到二进制 (Base64 解码)
	runtime.Set("atob", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("atob: At least 1 argument required"))
		}
		input := call.Arguments[0].String()
		
		// 实现标准 Web atob 函数
		decoded, err := WebAtob(input)
		if err != nil {
			// 创建 InvalidCharacterError - Web 标准错误类型
			panic(runtime.NewGoError(errors.New("InvalidCharacterError Invalid character")))
		}
		return runtime.ToValue(decoded)
	})
}

// WebAtob 实现符合 Web 标准的 atob 函数
// 参考：https://html.spec.whatwg.org/multipage/webappapis.html#atob
func WebAtob(input string) (string, error) {
	// 1. 如果输入为空字符串，返回空字符串
	if input == "" {
		return "", nil
	}

	// 2. 移除所有空白字符 (space, tab, newline, form feed, carriage return)
	cleaned := removeWhitespace(input)
	
	// 3. 验证字符串长度是否符合 Base64 规则
	if len(cleaned)%4 == 1 {
		return "", errors.New("invalid base64 length")
	}

	// 4. 验证所有字符都是有效的 Base64 字符
	if !isValidBase64String(cleaned) {
		return "", errors.New("invalid base64 character")
	}

	// 5. 标准化填充
	normalized := normalizePadding(cleaned)

	// 6. 使用标准 Base64 解码
	decoded, err := base64.StdEncoding.DecodeString(normalized)
	if err != nil {
		return "", err
	}

	return string(decoded), nil
}

// removeWhitespace 移除字符串中的所有 ASCII 空白字符
func removeWhitespace(s string) string {
	var result strings.Builder
	result.Grow(len(s))
	
	for _, r := range s {
		// 只移除 ASCII 空白字符: space(0x20), tab(0x09), LF(0x0A), FF(0x0C), CR(0x0D)
		if r != ' ' && r != '\t' && r != '\n' && r != '\f' && r != '\r' {
			result.WriteRune(r)
		}
	}
	
	return result.String()
}

// isValidBase64String 检查字符串是否只包含有效的 Base64 字符
func isValidBase64String(s string) bool {
	// 创建有效字符集映射
	validChars := make(map[rune]bool, 65) // 64 + 1 for padding
	for _, r := range base64Chars + "=" {
		validChars[r] = true
	}
	
	// 检查每个字符
	for _, r := range s {
		if !validChars[r] {
			return false
		}
	}
	
	// 检查填充字符的位置是否正确
	return isValidPadding(s)
}

// isValidPadding 检查填充字符(=)的位置是否符合 Base64 规则
func isValidPadding(s string) bool {
	// 查找第一个 = 的位置
	firstPadding := strings.IndexByte(s, '=')
	
	if firstPadding == -1 {
		// 没有填充字符，这是允许的
		return true
	}
	
	// 填充字符只能出现在末尾
	for i := firstPadding; i < len(s); i++ {
		if s[i] != '=' {
			return false
		}
	}
	
	// 检查填充数量 (最多2个)
	paddingCount := len(s) - firstPadding
	if paddingCount > 2 {
		return false
	}
	
	// 检查填充位置是否正确 (必须在4的倍数位置)
	expectedLength := ((len(s) + 3) / 4) * 4
	if len(s) != expectedLength && len(s) != expectedLength-paddingCount {
		return false
	}
	
	return true
}

// normalizePadding 标准化 Base64 填充
func normalizePadding(s string) string {
	// 如果字符串长度已经是4的倍数，直接返回
	if len(s)%4 == 0 {
		return s
	}
	
	// 添加必要的填充字符
	paddingNeeded := 4 - (len(s) % 4)
	return s + strings.Repeat("=", paddingNeeded)
}

// isASCIIWhitespace 检查字符是否为 ASCII 空白字符
func isASCIIWhitespace(r rune) bool {
	return r == ' ' || r == '\t' || r == '\n' || r == '\f' || r == '\r'
}

// WebBtoa 实现符合 Web 标准的 btoa 函数 (当前使用标准库实现)
func WebBtoa(input string) string {
	return base64.StdEncoding.EncodeToString([]byte(input))
}

// validateBase64Input 验证 Base64 输入的辅助函数
func validateBase64Input(input string) error {
	// 检查是否包含非 Base64 字符
	re := regexp.MustCompile(`[^A-Za-z0-9+/=\s]`)
	if re.MatchString(input) {
		return errors.New("contains invalid characters")
	}
	
	// 移除空白后检查长度
	cleaned := strings.ReplaceAll(input, " ", "")
	cleaned = strings.ReplaceAll(cleaned, "\t", "")
	cleaned = strings.ReplaceAll(cleaned, "\n", "")
	cleaned = strings.ReplaceAll(cleaned, "\r", "")
	cleaned = strings.ReplaceAll(cleaned, "\f", "")
	
	if len(cleaned) == 0 {
		return nil // 空字符串是有效的
	}
	
	// 检查长度是否符合 Base64 规则
	if len(cleaned)%4 == 1 {
		return errors.New("invalid length")
	}
	
	return nil
}

// Additional utility functions for Base64 handling

// IsBase64 检查字符串是否为有效的 Base64
func IsBase64(s string) bool {
	_, err := WebAtob(s)
	return err == nil
}

// Base64Length 计算 Base64 编码后的长度
func Base64Length(dataLength int) int {
	return ((dataLength + 2) / 3) * 4
}

// Base64DecodeLength 计算 Base64 解码后的长度
func Base64DecodeLength(encodedLength int) int {
	if encodedLength == 0 {
		return 0
	}
	return (encodedLength * 3) / 4
}
