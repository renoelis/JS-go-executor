package core

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
	"flow-codeblock-go/enhance_modules/pinyin/style"
)

// Convert 将汉字转换为拼音
// 返回二维数组,每个汉字对应一个拼音数组
func Convert(text string, opts Options) [][]string {
	if text == "" {
		return [][]string{}
	}

	var result [][]string

	// 1. 模式判断 - 姓氏模式优先级最高
	if opts.Mode == ModeSurname {
		// 姓氏模式：使用姓氏专用字典
		result = ConvertSurname(text, opts)
	} else if opts.Segment {
		// 2. 词组匹配 (如果启用)
		matches := MatchPhrases(text)

		if opts.Group {
			// 按词组分组返回
			result = matchesToGroupedPinyins(matches, opts)
		} else {
			// 展平为单字返回
			result = matchesToFlatPinyins(matches, opts)
		}
	} else {
		// 3. 普通模式：不分词,逐字处理
		result = convertCharByChar(text, opts)
	}

	// 4. 应用风格转换
	result = style.Convert2DArray(result, opts.Style)

	// 5. Compact 模式 (生成笛卡尔积)
	if opts.Compact && opts.Heteronym {
		result = CartesianProduct(result)
	}

	return result
}

// convertCharByChar 逐字转换
// JavaScript 原版逻辑: 连续的非汉字字符会累积成一个元素
func convertCharByChar(text string, opts Options) [][]string {
	runes := []rune(text)
	result := make([][]string, 0, len(runes))
	nonHanBuffer := "" // 累积非汉字字符

	for _, char := range runes {
		pinyins, exists := dict.GetPinyin(char)

		if exists {
			// 遇到汉字时，先处理累积的非汉字
			if nonHanBuffer != "" {
				result = append(result, []string{nonHanBuffer})
				nonHanBuffer = "" // 重置缓冲区
			}

			// 转换汉字
			if opts.Heteronym {
				// 返回所有读音
				result = append(result, pinyins)
			} else {
				// 只返回第一个读音
				result = append(result, []string{pinyins[0]})
			}
		} else {
			// 累积非汉字字符
			nonHanBuffer += string(char)
		}
	}

	// 处理最后剩余的非汉字字符
	if nonHanBuffer != "" {
		result = append(result, []string{nonHanBuffer})
	}

	return result
}

// matchesToFlatPinyins 将匹配结果转换为展平的拼音数组
func matchesToFlatPinyins(matches []Match, opts Options) [][]string {
	result := [][]string{}

	for _, match := range matches {
		for _, pyGroup := range match.Pinyins {
			if opts.Heteronym {
				result = append(result, pyGroup)
			} else {
				// 只取第一个读音
				if len(pyGroup) > 0 {
					result = append(result, []string{pyGroup[0]})
				}
			}
		}
	}

	return result
}

// matchesToGroupedPinyins 将匹配结果转换为分组的拼音数组
// group 模式下，词组的拼音会被组合成字符串
// 例如：[["zhāo", "cháo"], ["yáng"]] -> [["zhāoyáng", "cháoyáng"]]
func matchesToGroupedPinyins(matches []Match, opts Options) [][]string {
	result := [][]string{}

	for _, match := range matches {
		// 如果词组只有一个字，直接处理
		if len(match.Pinyins) == 1 {
			if opts.Heteronym {
				result = append(result, match.Pinyins[0])
			} else {
				if len(match.Pinyins[0]) > 0 {
					result = append(result, []string{match.Pinyins[0][0]})
				}
			}
			continue
		}

		// 多字词组：需要组合拼音
		if opts.Heteronym {
			// 多音字模式：使用 combo 逻辑组合所有可能的读音
			grouped := comboStrings(match.Pinyins)
			result = append(result, grouped)
		} else {
			// 单音模式：只取每个字的第一个读音并拼接
			var singlePinyins []string
			for _, pyGroup := range match.Pinyins {
				if len(pyGroup) > 0 {
					singlePinyins = append(singlePinyins, pyGroup[0])
				}
			}
			// 将单音拼接成一个字符串
			combined := ""
			for _, py := range singlePinyins {
				combined += py
			}
			result = append(result, []string{combined})
		}
	}

	return result
}

// comboStrings 组合二维字符串数组为一维字符串数组
// 类似于 JavaScript 的 combo 函数
// 输入：[["zhāo", "cháo"], ["yáng"]]
// 输出：["zhāoyáng", "cháoyáng"]
func comboStrings(arr [][]string) []string {
	if len(arr) == 0 {
		return []string{}
	}
	if len(arr) == 1 {
		return arr[0]
	}

	// 从第一个数组开始
	result := arr[0]

	// 逐个与后续数组组合
	for i := 1; i < len(arr); i++ {
		result = combo2strings(result, arr[i])
	}

	return result
}

// combo2strings 组合两个字符串数组
// 类似于 JavaScript 的 combo2array 函数
// 将 a1 和 a2 的每个元素两两拼接
func combo2strings(a1, a2 []string) []string {
	if len(a1) == 0 {
		return a2
	}
	if len(a2) == 0 {
		return a1
	}

	result := []string{}
	for _, s1 := range a1 {
		for _, s2 := range a2 {
			result = append(result, s1+s2)
		}
	}

	return result
}
