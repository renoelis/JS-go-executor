package buffer

import (
	"encoding/base64"
	"encoding/hex"
	"errors"
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

	// 🔥 修复：Node.js v25 行为 - 单字符或不完整的 base64 会解码为空或部分数据
	// 例如：'A' -> Buffer[], 'AB' -> Buffer[0], 'ABC' -> Buffer[0, 16]

	// 处理 padding
	if idx := strings.Index(cleaned, "="); idx >= 0 {
		cleaned = cleaned[:idx]
	}

	// 移除所有 padding（如果还有）
	cleaned = strings.TrimRight(cleaned, "=")

	// 如果为空或只有1个字符，返回空 Buffer（Node.js 行为）
	if len(cleaned) <= 1 {
		return []byte{}, nil
	}

	// 先尝试 RawStdEncoding（无 padding）
	decoded, err := base64.RawStdEncoding.DecodeString(cleaned)
	if err == nil {
		return decoded, nil
	}

	// 如果失败，尝试补齐 padding
	remainder := len(cleaned) % 4
	if remainder > 0 {
		cleaned += strings.Repeat("=", 4-remainder)
		decoded, err = base64.StdEncoding.DecodeString(cleaned)
		if err == nil {
			return decoded, nil
		}
	}

	// 所有尝试都失败，返回空 Buffer（Node.js 宽松行为）
	return []byte{}, nil
}

// decodeBase64URLLenient 宽松的 base64url 解码（Node.js 行为）
// 允许：空格、换行、有/无 padding
func decodeBase64URLLenient(str string) ([]byte, error) {
	// 🔥 修复：移除所有非 base64url 字符
	// 只保留 A-Z, a-z, 0-9, -, _, =
	cleaned := strings.Map(func(r rune) rune {
		if (r >= 'A' && r <= 'Z') || (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '-' || r == '_' || r == '=' {
			return r
		}
		return -1 // 删除无效字符
	}, str)

	// 如果清理后为空，返回空字节数组
	if len(cleaned) == 0 {
		return []byte{}, nil
	}

	// 处理 padding
	if idx := strings.Index(cleaned, "="); idx >= 0 {
		cleaned = cleaned[:idx]
	}

	// 移除所有 padding（如果还有）
	cleaned = strings.TrimRight(cleaned, "=")

	// 如果为空或只有1个字符，返回空 Buffer（Node.js 行为）
	if len(cleaned) <= 1 {
		return []byte{}, nil
	}

	// 先尝试 RawURLEncoding（无 padding）
	decoded, err := base64.RawURLEncoding.DecodeString(cleaned)
	if err == nil {
		return decoded, nil
	}

	// 如果失败，尝试补齐 padding
	remainder := len(cleaned) % 4
	if remainder > 0 {
		cleaned += strings.Repeat("=", 4-remainder)
		decoded, err = base64.URLEncoding.DecodeString(cleaned)
		if err == nil {
			return decoded, nil
		}
	}

	// 所有尝试都失败，返回空 Buffer（Node.js 宽松行为）
	return []byte{}, nil
}

// decodeHexLenient 宽松的 hex 解码（Node.js 行为）
// Node.js 对奇数长度的 hex 字符串会忽略最后一个字符
// 例如：'010' -> <Buffer 01>, '0' -> <Buffer>
// Node.js v25 行为：遇到无效字符（包括空格）会停止解析
// 例如：'ab cd' -> <Buffer ab>, 'abc g' -> <Buffer ab>
func decodeHexLenient(str string) ([]byte, error) {
	// 🔥 修复：遇到无效字符时停止解析（Node.js v25 行为）
	// 不是忽略空格，而是遇到空格就停止
	validStr := ""
	for i := 0; i < len(str); i++ {
		c := str[i]
		if hexCharToByte(c) == Uint8Max {
			// 遇到无效字符，停止解析
			break
		}
		validStr += string(c)
	}

	str = validStr

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
		if high == Uint8Max || low == Uint8Max {
			// 无效的 hex 字符（不应该发生，因为上面已经过滤了）
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

// findUTF8ByteBoundary 找到 UTF-8 字符边界，确保不会截断多字节字符
// 返回可以安全写入的字节数（<= maxBytes）
// Node.js 行为：如果空间不足以容纳完整的多字节字符，则不写入该字符
func findUTF8ByteBoundary(data []byte, maxBytes int64) int64 {
	if maxBytes <= 0 {
		return 0
	}
	if maxBytes > int64(len(data)) {
		maxBytes = int64(len(data))
	}

	// 从后往前检查，找到最后一个完整的 UTF-8 字符
	i := maxBytes

	// 如果最后一个字节是单字节字符（0xxxxxxx），直接返回
	if i > 0 && data[i-1] < 0x80 {
		return i
	}

	// 从后往前找到字符的开始字节
	for i > 0 && i > maxBytes-4 {
		i--
		b := data[i]

		// 检查这是否是一个字符的开始字节
		if b < 0x80 {
			// 单字节字符 (0xxxxxxx)
			return i + 1
		} else if b&0xE0 == 0xC0 {
			// 2 字节字符开始 (110xxxxx)
			if i+2 <= maxBytes && i+2 <= int64(len(data)) {
				return i + 2
			}
			return i // 空间不足，不写入此字符
		} else if b&0xF0 == 0xE0 {
			// 3 字节字符开始 (1110xxxx)
			if i+3 <= maxBytes && i+3 <= int64(len(data)) {
				return i + 3
			}
			return i // 空间不足，不写入此字符
		} else if b&0xF8 == 0xF0 {
			// 4 字节字符开始 (11110xxx)
			if i+4 <= maxBytes && i+4 <= int64(len(data)) {
				return i + 4
			}
			return i // 空间不足，不写入此字符
		}
		// 否则是continuation byte (10xxxxxx)，继续往前找
	}

	return maxBytes // 默认返回 maxBytes（理论上不应该到这里）
}

type EncodingConverter interface {
	Encode(str string) ([]byte, error)
	Decode(data []byte) (string, error)
}

type utf8EncodingConverter struct{}

func (c utf8EncodingConverter) Encode(str string) ([]byte, error) {
	return []byte(str), nil
}

func (c utf8EncodingConverter) Decode(data []byte) (string, error) {
	return string(data), nil
}

type hexEncodingConverter struct{}

func (c hexEncodingConverter) Encode(str string) ([]byte, error) {
	decoded, err := decodeHexLenient(str)
	if err != nil {
		return nil, errors.New("无效的十六进制字符串")
	}
	return decoded, nil
}

func (c hexEncodingConverter) Decode(data []byte) (string, error) {
	return hex.EncodeToString(data), nil
}

type base64EncodingConverter struct{}

func (c base64EncodingConverter) Encode(str string) ([]byte, error) {
	decoded, err := decodeBase64Lenient(str)
	if err != nil {
		return nil, errors.New("无效的 base64 字符串")
	}
	return decoded, nil
}

func (c base64EncodingConverter) Decode(data []byte) (string, error) {
	return base64.StdEncoding.EncodeToString(data), nil
}

type base64URLEncodingConverter struct{}

func (c base64URLEncodingConverter) Encode(str string) ([]byte, error) {
	decoded, err := decodeBase64URLLenient(str)
	if err != nil {
		return nil, errors.New("无效的 base64url 字符串")
	}
	return decoded, nil
}

func (c base64URLEncodingConverter) Decode(data []byte) (string, error) {
	return base64.RawURLEncoding.EncodeToString(data), nil
}

type latin1EncodingConverter struct{}

func (c latin1EncodingConverter) Encode(str string) ([]byte, error) {
	codeUnits := stringToUTF16CodeUnits(str)
	data := make([]byte, len(codeUnits))
	for i, unit := range codeUnits {
		data[i] = byte(unit) & 0xFF
	}
	return data, nil
}

func (c utf16leEncodingConverter) Decode(data []byte) (string, error) {
	if len(data) < 2 {
		return "", nil
	}

	var runes []rune
	for i := 0; i < len(data)-1; i += 2 {
		codeUnit := uint16(data[i]) | (uint16(data[i+1]) << 8)
		if codeUnit >= 0xD800 && codeUnit <= 0xDBFF {
			if i+3 < len(data) {
				lowSurrogate := uint16(data[i+2]) | (uint16(data[i+3]) << 8)
				if lowSurrogate >= 0xDC00 && lowSurrogate <= 0xDFFF {
					codePoint := 0x10000 + ((uint32(codeUnit) - 0xD800) << 10) + (uint32(lowSurrogate) - 0xDC00)
					runes = append(runes, rune(codePoint))
					i += 2
					continue
				}
			}
			runes = append(runes, '\uFFFD')
		} else if codeUnit >= 0xDC00 && codeUnit <= 0xDFFF {
			runes = append(runes, '\uFFFD')
		} else {
			runes = append(runes, rune(codeUnit))
		}
	}

	return string(runes), nil
}

func (c latin1EncodingConverter) Decode(data []byte) (string, error) {
	runes := make([]rune, len(data))
	for i, b := range data {
		runes[i] = rune(b)
	}
	return string(runes), nil
}

type asciiEncodingConverter struct{}

func (c asciiEncodingConverter) Encode(str string) ([]byte, error) {
	codeUnits := stringToUTF16CodeUnits(str)
	data := make([]byte, len(codeUnits))
	for i, unit := range codeUnits {
		data[i] = byte(unit) & 0xFF
	}
	return data, nil
}

func (c asciiEncodingConverter) Decode(data []byte) (string, error) {
	asciiData := make([]byte, len(data))
	for i, b := range data {
		asciiData[i] = b & 0x7F
	}
	return string(asciiData), nil
}

type utf16leEncodingConverter struct{}

func (c utf16leEncodingConverter) Encode(str string) ([]byte, error) {
	byteCount := utf16CodeUnitCount(str) * 2
	data := make([]byte, byteCount)
	offset := 0
	for _, r := range str {
		if r <= 0xFFFF {
			data[offset] = byte(r)
			data[offset+1] = byte(r >> 8)
			offset += 2
		} else {
			rPrime := r - 0x10000
			high := uint16(0xD800 + (rPrime >> 10))
			low := uint16(0xDC00 + (rPrime & 0x3FF))
			data[offset] = byte(high)
			data[offset+1] = byte(high >> 8)
			offset += 2
			data[offset] = byte(low)
			data[offset+1] = byte(low >> 8)
			offset += 2
		}
	}
	return data, nil
}

func GetEncodingConverter(encoding string) EncodingConverter {
	switch encoding {
	case "utf8", "utf-8":
		return utf8EncodingConverter{}
	case "hex":
		return hexEncodingConverter{}
	case "base64":
		return base64EncodingConverter{}
	case "base64url":
		return base64URLEncodingConverter{}
	case "latin1", "binary":
		return latin1EncodingConverter{}
	case "ascii":
		return asciiEncodingConverter{}
	case "utf16le", "ucs2", "ucs-2", "utf-16le":
		return utf16leEncodingConverter{}
	default:
		return nil
	}
}
