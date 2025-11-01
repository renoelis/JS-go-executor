package style

import (
	"strconv"
)

// ToTone2 转换为数字声调在末尾的风格
// 输入: zhōng  输出: zhong1
func ToTone2(pinyin string) string {
	if pinyin == "" {
		return ""
	}

	// 提取声调信息
	basePinyin, tone, _ := ExtractTone(pinyin)

	// 如果没有声调,直接返回
	if tone == 0 {
		return basePinyin
	}

	// 添加数字声调在末尾
	return basePinyin + strconv.Itoa(tone)
}
