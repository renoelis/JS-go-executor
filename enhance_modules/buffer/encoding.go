package buffer

import (
	"encoding/base64"
	"strings"
)

// decodeBase64Lenient 宽松的 base64 解码（Node.js 行为）
// 允许：空格、换行、有/无 padding，忽略所有非 base64 字符
func decodeBase64Lenient(str string) ([]byte, error) {
	// 🔥 修复：移除所有非 base64 字符（Node.js 行为）
	// 只保留 A-Z, a-z, 0-9, +, /, =
	cleaned := strings.Map(func(r rune) rune {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '+' || r == '/' || r == '=' {
			return r
		}
		return -1 // 删除无效字符
	}, str)

	// 如果清理后为空，返回空字节数组
	if len(cleaned) == 0 {
		return []byte{}, nil
	}

	// 🔥 修复：Node.js 行为 - 遇到第一个 '=' 就停止解码
	// 例如：'SGVsbG8=SGVsbG8=' 只解码到第一个 '='，结果是 'Hello'
	if idx := strings.Index(cleaned, "="); idx >= 0 {
		cleaned = cleaned[:idx]
		// 补齐到 4 的倍数（base64 要求）
		remainder := len(cleaned) % 4
		if remainder > 0 {
			cleaned += strings.Repeat("=", 4-remainder)
		}
	}

	// 🔥 修复：先尝试标准解码（带 padding）
	decoded, err := base64.StdEncoding.DecodeString(cleaned)
	if err == nil {
		return decoded, nil
	}

	// 🔥 修复：如果标准解码失败，尝试 RawStdEncoding（无 padding）
	// 移除所有 padding
	cleaned = strings.TrimRight(cleaned, "=")
	decoded, err = base64.RawStdEncoding.DecodeString(cleaned)
	if err == nil {
		return decoded, nil
	}

	// 🔥 修复：如果还是失败，尝试补齐 padding
	remainder := len(cleaned) % 4
	if remainder > 0 {
		cleaned += strings.Repeat("=", 4-remainder)
		decoded, err = base64.StdEncoding.DecodeString(cleaned)
		if err == nil {
			return decoded, nil
		}
	}

	// 所有尝试都失败，返回错误
	return nil, err
}

// decodeBase64URLLenient 宽松的 base64url 解码（Node.js 行为）
// 允许：空格、换行、有/无 padding
func decodeBase64URLLenient(str string) ([]byte, error) {
	// 移除空格、换行、制表符等空白字符
	str = strings.Map(func(r rune) rune {
		if r == ' ' || r == '\n' || r == '\r' || r == '\t' {
			return -1 // 删除字符
		}
		return r
	}, str)

	// 检查是否有 padding
	hasPadding := strings.Contains(str, "=")

	if hasPadding {
		// 有 padding：使用 URLEncoding
		decoded, err := base64.URLEncoding.DecodeString(str)
		if err == nil {
			return decoded, nil
		}
		// 如果失败，移除 padding 再试
		str = strings.TrimRight(str, "=")
	}

	// 无 padding 或移除 padding 后：使用 RawURLEncoding
	return base64.RawURLEncoding.DecodeString(str)
}

// decodeHexLenient 宽松的 hex 解码（Node.js 行为）
// Node.js 对奇数长度的 hex 字符串会忽略最后一个字符
// 例如：'010' -> <Buffer 01>, '0' -> <Buffer>
func decodeHexLenient(str string) ([]byte, error) {
	// 如果长度为奇数，去掉最后一个字符
	if len(str)%2 != 0 {
		str = str[:len(str)-1]
	}
	
	// 如果为空，返回空字节数组
	if len(str) == 0 {
		return []byte{}, nil
	}
	
	// 使用标准 hex 解码
	result := make([]byte, len(str)/2)
	for i := 0; i < len(str); i += 2 {
		high := hexCharToByte(str[i])
		low := hexCharToByte(str[i+1])
		if high == 255 || low == 255 {
			// 无效的 hex 字符
			return nil, nil
		}
		result[i/2] = (high << 4) | low
	}
	return result, nil
}

// hexCharToByte 将 hex 字符转换为字节值
func hexCharToByte(c byte) byte {
	switch {
	case c >= '0' && c <= '9':
		return c - '0'
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10
	case c >= 'A' && c <= 'F':
		return c - 'A' + 10
	default:
		return 255 // 无效字符
	}
}

// utf16CodeUnitCount 计算字符串的 UTF-16 码元数量（Node.js 行为）
// 在 Node.js 中，每个 UTF-16 码元占 2 字节
// 例如：'𠮷' (U+20BB7) 在 UTF-16 中是 surrogate pair，占 2 个码元 = 4 字节
// 但在 JavaScript 中被视为 2 个"字符"（码元），所以 byteLength('𠮷', 'ucs2') === 4
func utf16CodeUnitCount(str string) int {
	count := 0
	for _, r := range str {
		if r <= 0xFFFF {
			// BMP 字符：1 个 UTF-16 码元
			count++
		} else {
			// 超出 BMP：需要 surrogate pair，占 2 个 UTF-16 码元
			count += 2
		}
	}
	return count
}

// stringToUTF16CodeUnits 将字符串转换为 UTF-16 码元序列（Node.js 行为）
// 🔥 修复：ascii/latin1 需要按 UTF-16 码元处理，而不是按 Unicode 码点
// 例如：'𠮷' (U+20BB7) → [0xD842, 0xDFB7] (2 个码元)
func stringToUTF16CodeUnits(str string) []uint16 {
	runes := []rune(str)
	codeUnits := make([]uint16, 0, len(runes))

	for _, r := range runes {
		if r <= 0xFFFF {
			// BMP 字符：直接转换
			codeUnits = append(codeUnits, uint16(r))
		} else {
			// 超出 BMP：编码为 surrogate pair
			r -= 0x10000
			high := uint16(0xD800 + (r >> 10))
			low := uint16(0xDC00 + (r & 0x3FF))
			codeUnits = append(codeUnits, high, low)
		}
	}

	return codeUnits
}
