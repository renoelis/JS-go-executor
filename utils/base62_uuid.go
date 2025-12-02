package utils

import (
	"crypto/rand"
	"encoding/binary"
	"errors"
)

// base62Chars 允许的字符集
const base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

// base62CharIndex 预计算字符索引，便于校验
var base62CharIndex = func() [128]int8 {
	idx := [128]int8{}
	for i := range idx {
		idx[i] = -1
	}
	for i, c := range base62Chars {
		idx[c] = int8(i)
	}
	return idx
}()

// GenerateBase62UUID 生成22位Base62编码的UUID（含1位校验位）
// 使用 crypto/rand 保证随机性，并在末尾追加校验位用于快速校验
func GenerateBase62UUID() string {
	// 生成128位随机数
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand read failed: " + err.Error())
	}

	// 分成两个64位数字编码
	high := binary.BigEndian.Uint64(b[:8])
	low := binary.BigEndian.Uint64(b[8:])

	result := make([]byte, 22)
	encodeBase62(result[:11], high)
	encodeBase62(result[11:21], low) // 只写入10位，预留末位校验位

	// 计算校验位
	result[21] = calculateCheckDigit(result[:21])
	return string(result)
}

// ValidateScriptID 校验脚本ID长度、字符集及校验位
func ValidateScriptID(scriptID string) error {
	if len(scriptID) != 22 {
		return errors.New("无效的脚本ID长度")
	}

	for _, c := range scriptID {
		if c >= 128 || base62CharIndex[c] < 0 {
			return errors.New("无效的脚本ID字符")
		}
	}

	expected := calculateCheckDigit([]byte(scriptID[:21]))
	if scriptID[21] != expected {
		return errors.New("无效的脚本ID")
	}
	return nil
}

// calculateCheckDigit 计算校验位，奇偶位使用不同权重
func calculateCheckDigit(data []byte) byte {
	var sum int64
	for i, c := range data {
		idx := base62CharIndex[c]
		if i%2 == 0 {
			sum += int64(idx) * 2
		} else {
			sum += int64(idx)
		}
	}
	checkIdx := sum % 62
	return base62Chars[checkIdx]
}

func encodeBase62(dst []byte, n uint64) {
	for i := len(dst) - 1; i >= 0; i-- {
		dst[i] = base62Chars[n%62]
		n /= 62
	}
}
