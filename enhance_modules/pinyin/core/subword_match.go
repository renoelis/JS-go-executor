package core

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
)

// SubwordMatchResult 子词匹配结果
type SubwordMatchResult struct {
	Matched  bool       // 是否成功匹配
	Pinyins  [][]string // 匹配到的拼音
	Coverage float64    // 覆盖率（匹配字符数/总字符数）
	Score    int        // 匹配得分（用于选择最佳方案）
}

// MatchWithSubwordSplit 使用子词拆分策略进行匹配
// 策略：贪心算法，从左到右尝试最长匹配
func MatchWithSubwordSplit(text string, opts Options) ([][]string, bool) {
	if text == "" {
		return nil, false
	}

	// 首先尝试整词匹配
	if phrasePinyin, found := dict.GetPhrasePinyinLazy(text); found {
		return phrasePinyin, true
	}

	// 如果整词不匹配，尝试子词拆分
	result, success := greedySubwordMatch(text, opts)
	if success {
		return result, true
	}

	return nil, false
}

// greedySubwordMatch 贪心算法：从左到右最长匹配
func greedySubwordMatch(text string, opts Options) ([][]string, bool) {
	runes := []rune(text)
	result := [][]string{}
	matchedChars := 0
	i := 0

	for i < len(runes) {
		matched := false

		// 从当前位置开始，尝试最长的子串
		for length := len(runes) - i; length > 0; length-- {
			subword := string(runes[i : i+length])

			// 尝试从词组字典匹配
			if phrasePinyin, found := dict.GetPhrasePinyinLazy(subword); found {
				// 找到匹配！
				result = append(result, phrasePinyin...)
				matchedChars += length
				i += length
				matched = true
				break
			}
		}

		// 如果没有匹配到任何子词，逐字处理
		if !matched {
			char := runes[i]
			if charPinyin, exists := dict.GetPinyin(char); exists {
				// 取第一个读音（如果 heteronym 为 false）
				if opts.Heteronym {
					result = append(result, charPinyin)
				} else {
					result = append(result, []string{charPinyin[0]})
				}
			} else {
				// 非汉字字符，原样保留
				result = append(result, []string{string(char)})
			}
			i++
		}
	}

	// 如果至少匹配到一些字符，认为成功
	success := matchedChars > 0 || len(result) > 0

	return result, success
}

// TryMultipleSplits 尝试多种拆分方式，选择最佳方案（高级版本）
// 使用动态规划找到最优拆分
func TryMultipleSplits(text string, opts Options) ([][]string, bool) {
	runes := []rune(text)
	n := len(runes)

	if n == 0 {
		return nil, false
	}

	// dp[i] 表示从位置 i 到结尾的最佳匹配结果
	type DPNode struct {
		result   [][]string
		score    int
		coverage float64
	}

	dp := make([]*DPNode, n+1)
	dp[n] = &DPNode{result: [][]string{}, score: 0, coverage: 1.0}

	// 从右往左填充 DP 表
	for i := n - 1; i >= 0; i-- {
		bestNode := &DPNode{score: -1}

		// 尝试不同长度的子词
		for length := 1; i+length <= n; length++ {
			subword := string(runes[i : i+length])
			var subResult [][]string
			var subScore int

			// 尝试词组字典匹配
			if phrasePinyin, found := dict.GetPhrasePinyinLazy(subword); found {
				subResult = phrasePinyin
				// 词组匹配得分 = 长度^2 （鼓励更长的匹配）
				subScore = length * length * 10
			} else if length == 1 {
				// 单字回退
				char := runes[i]
				if charPinyin, exists := dict.GetPinyin(char); exists {
					if opts.Heteronym {
						// 返回所有读音
						subResult = [][]string{charPinyin}
					} else {
						// 只返回第一个读音
						firstPinyin := []string{charPinyin[0]}
						subResult = [][]string{firstPinyin}
					}
					subScore = 1 // 单字得分最低
				} else {
					// 非汉字字符，原样保留
					charStr := string(char)
					subResult = [][]string{{charStr}}
					subScore = 0
				}
			} else {
				// 多字但未匹配，跳过
				continue
			}

			// 计算总得分
			if dp[i+length] != nil {
				totalScore := subScore + dp[i+length].score
				if totalScore > bestNode.score {
					// 找到更好的方案
					combined := append(subResult, dp[i+length].result...)
					bestNode = &DPNode{
						result:   combined,
						score:    totalScore,
						coverage: float64(length) / float64(n),
					}
				}
			}
		}

		dp[i] = bestNode
	}

	if dp[0] != nil && dp[0].score > 0 {
		return dp[0].result, true
	}

	return nil, false
}

// GetPhraseFromDict 从词组字典获取拼音（导出给外部使用）
func GetPhraseFromDict(phrase string) ([][]string, bool) {
	return dict.GetPhrasePinyinLazy(phrase)
}
