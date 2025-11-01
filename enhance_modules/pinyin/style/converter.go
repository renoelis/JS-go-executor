package style

// Style 拼音风格枚举
type Style int

const (
	StyleNormal      Style = 0 // 无声调: zhong
	StyleTone        Style = 1 // 带声调: zhōng (默认)
	StyleTone2       Style = 2 // 数字声调在末尾: zhong1
	StyleInitials    Style = 3 // 声母: zh
	StyleFirstLetter Style = 4 // 首字母: z
	StyleTone3       Style = 5 // 数字声调内联: zho1ng (TO3NE)
	StylePassport    Style = 6 // 护照风格: ZHONG (ü->YU)
)

// Converter 拼音风格转换器接口
type Converter interface {
	Convert(pinyin string) string
	Name() string
}

// ConvertStyle 根据风格转换拼音
func ConvertStyle(pinyin string, style Style) string {
	if pinyin == "" {
		return ""
	}

	switch style {
	case StyleNormal:
		return ToNormal(pinyin)
	case StyleTone:
		return pinyin // 默认就是带声调的
	case StyleTone2:
		return ToTone2(pinyin)
	case StyleTone3:
		return ToTone3(pinyin)
	case StyleInitials:
		return ToInitials(pinyin)
	case StyleFirstLetter:
		return ToFirstLetter(pinyin)
	case StylePassport:
		return ToPassport(pinyin)
	default:
		return pinyin
	}
}

// ConvertArray 转换拼音数组
func ConvertArray(pinyins []string, style Style) []string {
	if style == StyleTone {
		return pinyins // 无需转换
	}

	result := make([]string, len(pinyins))
	for i, py := range pinyins {
		result[i] = ConvertStyle(py, style)
	}
	return result
}

// Convert2DArray 转换二维拼音数组
func Convert2DArray(pinyins [][]string, style Style) [][]string {
	if style == StyleTone {
		return pinyins // 无需转换
	}

	result := make([][]string, len(pinyins))
	for i, pyArray := range pinyins {
		result[i] = ConvertArray(pyArray, style)
	}
	return result
}
