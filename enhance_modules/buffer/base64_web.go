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
	btoaFunc := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("btoa: At least 1 argument required"))
		}
		
		arg := call.Arguments[0]
		
		// 检查是否为 Symbol 类型
		if symbol, ok := arg.(*goja.Symbol); ok {
			_ = symbol // 避免未使用变量警告
			panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
		}
		
		// 也检查对象包装的 Symbol
		if obj, ok := arg.(*goja.Object); ok {
			if exported := obj.Export(); exported != nil {
				if _, ok := exported.(*goja.Symbol); ok {
					panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
				}
			}
		}
		
		input := arg.String()
		
		// 将字符串转换为字节数组 - 每个字符作为一个字节处理（Latin-1）
		bytes := make([]byte, 0, len(input))
		for _, r := range input {
			if r > 255 {
				// 创建 InvalidCharacterError
				err := runtime.NewGoError(errors.New("InvalidCharacterError The string to be encoded contains characters outside of the Latin1 range."))
				err.Set("name", runtime.ToValue("InvalidCharacterError"))
				panic(err)
			}
			bytes = append(bytes, byte(r))
		}
		
		encoded := base64.StdEncoding.EncodeToString(bytes)
		return runtime.ToValue(encoded)
	})
	
	// 设置 btoa 函数的 length 和 name 属性
	if btoaObj, ok := btoaFunc.(*goja.Object); ok {
		btoaObj.DefineDataProperty("length", runtime.ToValue(1), 0, 0, 0)
		btoaObj.DefineDataProperty("name", runtime.ToValue("btoa"), 0, 0, 0)
	}
	runtime.Set("btoa", btoaFunc)

	// atob - ASCII 到二进制 (Base64 解码)
	atobFunc := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("atob: At least 1 argument required"))
		}
		
		arg := call.Arguments[0]
		
		// 检查是否为 Symbol 类型 - 直接检查类型而不是调用转换方法
		if symbol, ok := arg.(*goja.Symbol); ok {
			_ = symbol // 避免未使用变量警告
			panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
		}
		
		// 也检查对象包装的 Symbol
		if obj, ok := arg.(*goja.Object); ok {
			if exported := obj.Export(); exported != nil {
				if _, ok := exported.(*goja.Symbol); ok {
					panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
				}
			}
		}
		
		input := arg.String()
		
		// 实现标准 Web atob 函数
		decoded, err := WebAtob(input)
		if err != nil {
			// 根据错误类型创建合适的错误消息
			if err.Error() == "character error" {
				panic(runtime.NewGoError(errors.New("Invalid character")))
			} else {
				panic(runtime.NewGoError(errors.New("The string to be decoded is not correctly encoded.")))
			}
		}
		return runtime.ToValue(decoded)
	})
	
	// 设置 atob 函数的 length 和 name 属性
	if atobObj, ok := atobFunc.(*goja.Object); ok {
		atobObj.DefineDataProperty("length", runtime.ToValue(1), 0, 0, 0)
		atobObj.DefineDataProperty("name", runtime.ToValue("atob"), 0, 0, 0)
	}
	runtime.Set("atob", atobFunc)
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
	
	// 3. 先验证所有字符都是有效的 Base64 字符（优先检查）
	if !isValidBase64String(cleaned) {
		return "", errors.New("character error")
	}

	// 4. 然后验证字符串长度是否符合 Base64 规则
	if len(cleaned)%4 == 1 {
		return "", errors.New("encoding error")
	}

	// 5. 标准化填充
	normalized := normalizePadding(cleaned)

	// 6. 使用标准 Base64 解码
	decoded, err := base64.StdEncoding.DecodeString(normalized)
	if err != nil {
		return "", err
	}

	// 按照 Web 标准，将每个字节作为 Latin-1 字符处理
	// 而不是作为 UTF-8 字符串处理
	result := make([]rune, len(decoded))
	for i, b := range decoded {
		result[i] = rune(b)
	}
	return string(result), nil
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
	validChars := make(map[rune]bool, 64)
	for _, r := range base64Chars {
		validChars[r] = true
	}
	
	// 查找第一个填充符位置
	firstPadding := strings.IndexByte(s, '=')
	
	if firstPadding == -1 {
		// 没有填充字符，检查所有字符是否有效
		for _, r := range s {
			if !validChars[r] {
				return false
			}
		}
		return true
	}
	
	// 有填充字符的情况
	// 1. 检查填充符之前的字符是否都是有效的 Base64 字符
	for i := 0; i < firstPadding; i++ {
		if !validChars[rune(s[i])] {
			return false
		}
	}
	
	// 2. 填充字符只能出现在末尾
	for i := firstPadding; i < len(s); i++ {
		if s[i] != '=' {
			return false
		}
	}
	
	// 3. 检查填充数量 (最多2个)
	paddingCount := len(s) - firstPadding
	if paddingCount > 2 {
		return false
	}
	
	// 4. 特殊情况：只有填充符是无效的
	if firstPadding == 0 {
		return false
	}
	
	// 5. 检查长度是否符合 Base64 规则
	if len(s)%4 != 0 {
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
