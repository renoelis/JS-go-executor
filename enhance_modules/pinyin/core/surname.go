package core

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
)

// ConvertSurname 姓氏模式转换
// 用于处理中文姓名，会优先使用姓氏字典中的读音
func ConvertSurname(text string, opts Options) [][]string {
	if text == "" {
		return [][]string{}
	}

	// 姓氏模式调用复姓处理函数
	return compoundSurname(text, opts)
}

// compoundSurname 复姓处理
// 遍历文本查找2字复姓，对于非复姓部分调用 singleSurname 处理
func compoundSurname(text string, opts Options) [][]string {
	runes := []rune(text)
	length := len(runes)
	prefixIndex := 0
	result := [][]string{}

	for i := 0; i < length; i++ {
		// 尝试匹配2字复姓
		if i+2 <= length {
			twoWords := string(runes[i : i+2])

			// 查找复姓字典
			if pinyins, exists := dict.CompoundSurnamePinyinDict[twoWords]; exists {
				// 先处理前面的单姓部分
				if prefixIndex <= i-1 {
					beforePart := string(runes[prefixIndex:i])
					result = append(result, singleSurname(beforePart, opts)...)
				}

				// 添加复姓的拼音
				// CompoundSurnamePinyinDict 的值是 [][]string 格式，如 [["shàng"], ["guān"]]
				// 需要直接添加到结果中
				for _, pyGroup := range pinyins {
					if opts.Heteronym {
						// 多音字模式：保留所有读音
						result = append(result, pyGroup)
					} else {
						// 单音模式：只取第一个读音
						if len(pyGroup) > 0 {
							result = append(result, []string{pyGroup[0]})
						}
					}
				}

				// 跳过复姓的2个字
				i = i + 1 // for循环会再+1，所以这里只+1
				prefixIndex = i + 1
			}
		}
	}

	// 处理复姓后面剩余的部分
	if prefixIndex < length {
		remainPart := string(runes[prefixIndex:length])
		result = append(result, singleSurname(remainPart, opts)...)
	}

	return result
}

// singleSurname 单姓处理
// 逐字处理，优先使用姓氏字典，如果不在姓氏字典中则回退到普通字典
func singleSurname(text string, opts Options) [][]string {
	if text == "" {
		return [][]string{}
	}

	result := [][]string{}

	for _, char := range text {
		word := string(char)

		// 先查姓氏字典
		if pinyins, exists := dict.SurnamePinyinDict[word]; exists {
			// 姓氏字典中的值是 []string 格式，如 ["shàn"]
			// 但实际上可能有多个读音，需要按照 heteronym 选项处理
			if opts.Heteronym {
				// 多音字模式：返回所有读音，每个读音作为单独的元素
				pyArray := make([]string, len(pinyins))
				copy(pyArray, pinyins)
				result = append(result, pyArray)
			} else {
				// 单音模式：只取第一个读音
				if len(pinyins) > 0 {
					result = append(result, []string{pinyins[0]})
				}
			}
		} else {
			// 如果不在姓氏字典，回退到普通字典
			if charPinyins, exists := dict.GetPinyin(char); exists {
				if opts.Heteronym {
					result = append(result, charPinyins)
				} else {
					if len(charPinyins) > 0 {
						result = append(result, []string{charPinyins[0]})
					}
				}
			} else {
				// 非汉字，保留原字符
				result = append(result, []string{word})
			}
		}
	}

	return result
}
