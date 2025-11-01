package style

import "strings"

// ToNormal 转换为无声调风格
// 输入: zhōng  输出: zhong
func ToNormal(pinyin string) string {
	if pinyin == "" {
		return ""
	}

	var result strings.Builder
	for _, r := range pinyin {
		result.WriteRune(RemoveTone(r))
	}

	return result.String()
}
