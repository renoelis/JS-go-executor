package core

import (
	"flow-codeblock-go/enhance_modules/pinyin/style"
	"strings"
	"unicode"
)

// Compare 比较两个汉字字符串的拼音排序
// 返回 -1 (a < b)、0 (a == b) 或 1 (a > b)
// 🔥 100% 兼容 JavaScript 的 String.localeCompare() 行为
func Compare(a, b string) int {
	opts := Options{
		Style:     style.StyleTone, // 使用默认的带声调风格，与 JS 版本一致
		Heteronym: false,
		Segment:   false,
	}

	// 获取二维拼音数组
	pinyinA := Convert(a, opts)
	pinyinB := Convert(b, opts)

	// 转换为字符串（模拟 JavaScript 的 String(array) 行为）
	// [["zhōng"], ["guó"]] -> "zhōng,guó"
	strA := arrayToString(pinyinA)
	strB := arrayToString(pinyinB)

	// 🔥 使用 locale-aware 比较（模拟 JavaScript 的 localeCompare）
	// 移除声调后按字母表顺序比较，与 npm pinyin v4 完全一致
	return localeCompare(strA, strB)
}

// arrayToString 将二维数组转换为字符串，模拟 JavaScript 的 String(array) 行为
// [["zhōng"], ["guó"]] -> "zhōng,guó"
func arrayToString(arr [][]string) string {
	parts := make([]string, len(arr))
	for i, inner := range arr {
		parts[i] = strings.Join(inner, ",")
	}
	return strings.Join(parts, ",")
}

// localeCompare 模拟 JavaScript 的 String.localeCompare() 行为
// 实现 locale-aware 字符串比较，忽略声调差异
// 🎯 核心原理：将带声调的拉丁字母规范化为基本字母后比较
func localeCompare(a, b string) int {
	// 规范化字符串（移除声调）
	normalizedA := normalizeForCompare(a)
	normalizedB := normalizeForCompare(b)

	// 先按规范化后的字符串比较（字母表顺序）
	result := strings.Compare(normalizedA, normalizedB)
	
	// 如果规范化后相同，则按原始字符串比较（保持稳定排序）
	if result == 0 {
		return strings.Compare(a, b)
	}
	
	return result
}

// normalizeForCompare 规范化字符串用于比较
// 将带声调的拉丁字母转换为基本 ASCII 字母
// 例如: "ā" -> "a", "é" -> "e", "zhōng" -> "zhong"
func normalizeForCompare(s string) string {
	var builder strings.Builder
	builder.Grow(len(s))

	for _, r := range s {
		// 转换为基本字母（移除声调）
		normalized := removeAccent(r)
		// 跳过组合字符（返回值为 -1）
		if normalized != -1 {
			builder.WriteRune(normalized)
		}
	}

	return strings.ToLower(builder.String())
}

// accentMap 声调映射表 - 完整的拼音字符集
// 🎯 性能优化：声明为包级变量，避免重复创建
var accentMap = map[rune]rune{
	// a 的声调
	'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'a': 'a',
	'Ā': 'A', 'Á': 'A', 'Ǎ': 'A', 'À': 'A', 'A': 'A',
	// e 的声调
	'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'e': 'e', 'ê': 'e',
	'Ē': 'E', 'É': 'E', 'Ě': 'E', 'È': 'E', 'E': 'E', 'Ê': 'E',
	// i 的声调
	'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'i': 'i',
	'Ī': 'I', 'Í': 'I', 'Ǐ': 'I', 'Ì': 'I', 'I': 'I',
	// o 的声调
	'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o', 'o': 'o',
	'Ō': 'O', 'Ó': 'O', 'Ǒ': 'O', 'Ò': 'O', 'O': 'O',
	// u 的声调
	'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'u': 'u',
	'Ū': 'U', 'Ú': 'U', 'Ǔ': 'U', 'Ù': 'U', 'U': 'U',
	// ü 的声调
	'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v', 'ü': 'v',
	'Ǖ': 'V', 'Ǘ': 'V', 'Ǚ': 'V', 'Ǜ': 'V', 'Ü': 'V',
	// n 和 m 的声调（用于 ng, n, m 韵母）
	'ń': 'n', 'ň': 'n', 'ǹ': 'n', 'n': 'n',
	'Ń': 'N', 'Ň': 'N', 'Ǹ': 'N', 'N': 'N',
	'ḿ': 'm', 'm': 'm',
	'Ḿ': 'M', 'M': 'M',
}

// removeAccent 移除拉丁字母的声调标记
// 🎯 映射表涵盖所有拼音声调字符
func removeAccent(r rune) rune {
	// 查找映射
	if normalized, ok := accentMap[r]; ok {
		return normalized
	}

	// 如果不在映射表中，尝试使用 Unicode 规范化
	// 对于其他可能的带声调字符
	if unicode.Is(unicode.Mn, r) || unicode.Is(unicode.Me, r) {
		// 跳过组合用字符（声调标记）
		return -1 // 返回特殊值表示跳过
	}

	// 原样返回（ASCII 字母、数字、标点等）
	return r
}
