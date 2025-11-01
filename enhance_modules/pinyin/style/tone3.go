package style

import (
	"strconv"
)

// ToTone3 转换为数字声调内联的风格 (TO3NE)
// 输入: zhōng  输出: zho1ng
// 数字插入在声调标记的位置之后
func ToTone3(pinyin string) string {
	if pinyin == "" {
		return ""
	}

	// 提取声调信息
	basePinyin, tone, tonePos := ExtractTone(pinyin)

	// 如果没有声调,直接返回
	if tone == 0 || tonePos < 0 {
		return basePinyin
	}

	// 在声调位置之后插入数字
	runes := []rune(basePinyin)
	result := make([]rune, 0, len(runes)+1)

	for i, r := range runes {
		result = append(result, r)
		if i == tonePos {
			// 在声调字符后插入数字
			result = append(result, []rune(strconv.Itoa(tone))...)
		}
	}

	return string(result)
}
