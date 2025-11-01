package core

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
)

// MatchPhrases 词组匹配算法 (最长匹配优先)
// 返回匹配结果列表,未匹配部分用单字填充
// 🔥 兼容 npm pinyin v4: 连续非汉字字符会被累积为一个整体
func MatchPhrases(text string) []Match {
	if text == "" {
		return []Match{}
	}

	runes := []rune(text)
	matches := []Match{}
	pos := 0

	for pos < len(runes) {
		matched := false

		// 从最长词组开始尝试(最多10字,根据PhrasesStats.MaxLength)
		maxLen := min(10, len(runes)-pos)

		for length := maxLen; length >= 2; length-- {
			if pos+length > len(runes) {
				continue
			}

			phrase := string(runes[pos : pos+length])

			// 先检查 PhrasesDict (包含拼音)
			if pinyins, exists := dict.GetPhrasePinyin(phrase); exists {
				matches = append(matches, Match{
					Text:    phrase,
					Pinyins: pinyins,
					Start:   pos,
					Length:  length,
				})
				pos += length
				matched = true
				break
			}

			// 如果不在 PhrasesDict，检查 SpecialDict（专有词，如"喜欢"）
			if dict.IsSpecialWord(phrase) {
				// SpecialDict 没有拼音，需要逐字获取
				pinyinArray := make([][]string, 0, length)
				for _, char := range []rune(phrase) {
					if charPinyins, exists := dict.GetPinyin(char); exists {
						pinyinArray = append(pinyinArray, charPinyins)
					} else {
						// 如果有字不在字典，放弃这个词组
						pinyinArray = nil
						break
					}
				}

				if pinyinArray != nil {
					matches = append(matches, Match{
						Text:    phrase,
						Pinyins: pinyinArray,
						Start:   pos,
						Length:  length,
					})
					pos += length
					matched = true
					break
				}
			}
		}

		// 如果没有匹配到词组,作为单字处理
		if !matched {
			char := runes[pos]
			pinyins, exists := dict.GetPinyin(char)

			if exists {
				// 转换为 [][]string 格式
				pinyinArray := make([][]string, 1)
				pinyinArray[0] = pinyins

				matches = append(matches, Match{
					Text:    string(char),
					Pinyins: pinyinArray,
					Start:   pos,
					Length:  1,
				})
				pos++
			} else {
				// 🔥 非汉字：累积连续的非汉字字符（兼容 npm pinyin v4）
				// 这样 "Hello World" 会被保持为一个整体，而不是拆成 H,e,l,l,o...
				start := pos
				nonHanBuffer := ""
				
				for pos < len(runes) && !dict.HasChar(runes[pos]) {
					nonHanBuffer += string(runes[pos])
					pos++
				}

				// 将累积的非汉字字符作为一个整体
				matches = append(matches, Match{
					Text:    nonHanBuffer,
					Pinyins: [][]string{{nonHanBuffer}}, // 原样保留
					Start:   start,
					Length:  pos - start,
				})
			}
		}
	}

	return matches
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
