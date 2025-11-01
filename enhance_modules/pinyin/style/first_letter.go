package style

// ToFirstLetter 提取首字母
// 输入: zhōng  输出: z
func ToFirstLetter(pinyin string) string {
	if pinyin == "" {
		return ""
	}

	// 先去除声调
	basePinyin := ToNormal(pinyin)

	if len(basePinyin) > 0 {
		return string(basePinyin[0])
	}

	return ""
}
