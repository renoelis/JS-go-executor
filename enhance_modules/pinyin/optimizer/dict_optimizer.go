package optimizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"flow-codeblock-go/enhance_modules/pinyin/tokenizer"
)

// DictOptimizer 词典优化器
// 实现类似 MMSG (最大匹配-最短路径-词语粘连) 算法
// 主要功能：
// 1. 合并连续的单字词为词组
// 2. 优化词语边界
// 3. 提高分词质量
//
// 与 JavaScript pinyin.js 的 DictOptimizer 兼容
type DictOptimizer struct{}

// NewDictOptimizer 创建词典优化器
func NewDictOptimizer() *DictOptimizer {
	// 确保字典已加载
	dict.Init()
	return &DictOptimizer{}
}

// Optimize 实现 Optimizer 接口
func (o *DictOptimizer) Optimize(words []tokenizer.Word) []tokenizer.Word {
	if len(words) == 0 {
		return words
	}

	// 🔥 第一步：词语粘连处理
	// 尝试合并相邻的单字词为词组
	words = o.mergeAdjacentChars(words)

	// 🔥 第二步：单字词优化
	// 检查是否有被过度切分的情况
	words = o.optimizeSingleChars(words)

	return words
}

// mergeAdjacentChars 合并相邻的单字为词组
// 如果连续的单字在词典中存在对应的词组，则合并
func (o *DictOptimizer) mergeAdjacentChars(words []tokenizer.Word) []tokenizer.Word {
	if len(words) < 2 {
		return words
	}

	result := make([]tokenizer.Word, 0, len(words))
	i := 0

	for i < len(words) {
		// 尝试从当前位置开始找最长的词组匹配
		maxLen := min(8, len(words)-i) // 最大词组长度为8
		merged := false

		// 从最长到最短尝试匹配
		for length := maxLen; length >= 2; length-- {
			if i+length > len(words) {
				continue
			}

			// 只合并单字词或未识别的词
			canMerge := true
			for j := 0; j < length; j++ {
				w := words[i+j]
				// 如果是已识别的特殊词（URL、邮箱、人名等），不参与合并
				if w.P > 0 && w.P != postag.D_W {
					canMerge = false
					break
				}
				// 如果不是单字，不参与合并
				if len([]rune(w.W)) != 1 {
					canMerge = false
					break
				}
			}

			if !canMerge {
				break
			}

			// 构建候选词组
			var candidateText string
			for j := 0; j < length; j++ {
				candidateText += words[i+j].W
			}

			// 检查词典
			if dict.HasPhrase(candidateText) {
				// 找到词组，合并
				result = append(result, tokenizer.Word{
					W: candidateText,
					P: 0, // 保持未标注状态，可能后续会被其他优化器识别词性
					C: words[i].C,
				})
				i += length
				merged = true
				break
			}
		}

		if !merged {
			// 没有找到合并机会，保留原词
			result = append(result, words[i])
			i++
		}
	}

	return result
}

// optimizeSingleChars 优化单字词
// 使用启发式规则改善分词结果
func (o *DictOptimizer) optimizeSingleChars(words []tokenizer.Word) []tokenizer.Word {
	if len(words) < 2 {
		return words
	}

	result := make([]tokenizer.Word, 0, len(words))
	i := 0

	for i < len(words) {
		word := words[i]

		// 🎯 规则1: 数词 + 量词 → 保持分离（符合语法）
		if i < len(words)-1 {
			nextWord := words[i+1]

			// 如果当前是数词，下一个是量词，不合并
			if word.P == postag.A_M || isNumberWord(word.W) {
				if nextWord.P == postag.A_Q || isMeasureWord(nextWord.W) {
					result = append(result, word)
					i++
					continue
				}
			}
		}

		// 🎯 规则2: 连续单字词且在词典中 → 尝试合并
		if len([]rune(word.W)) == 1 && word.P == 0 {
			// 向前看，尝试找连续的单字
			j := i + 1
			for j < len(words) && len([]rune(words[j].W)) == 1 && words[j].P == 0 {
				j++
			}

			if j > i+1 {
				// 找到连续单字
				combinedText := ""
				for k := i; k < j; k++ {
					combinedText += words[k].W
				}

				// 检查是否在词典中
				if dict.HasPhrase(combinedText) {
					result = append(result, tokenizer.Word{
						W: combinedText,
						P: 0,
						C: word.C,
					})
					i = j
					continue
				}
			}
		}

		// 默认：保留原词
		result = append(result, word)
		i++
	}

	return result
}

// isNumberWord 判断是否为数字词
func isNumberWord(word string) bool {
	numberWords := []string{
		"一", "二", "三", "四", "五", "六", "七", "八", "九", "十",
		"百", "千", "万", "亿", "兆",
		"零", "壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖", "拾",
		"0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
	}

	for _, num := range numberWords {
		if word == num {
			return true
		}
	}

	// 检查是否全部是数字
	for _, r := range word {
		if r < '0' || r > '9' {
			return false
		}
	}

	return len(word) > 0
}

// isMeasureWord 判断是否为量词
func isMeasureWord(word string) bool {
	measureWords := []string{
		"个", "只", "条", "头", "匹", "峰", "张", "座", "回", "场", "尾", "件",
		"支", "枝", "根", "把", "台", "辆", "位", "名", "块", "片", "段", "节",
		"颗", "粒", "粒", "滴", "团", "丝", "毫", "厘", "分", "寸", "尺", "丈",
		"里", "斤", "两", "克", "千克", "吨", "升", "毫升", "米", "千米",
		"年", "月", "日", "时", "分", "秒", "天", "周", "季", "元", "角", "分",
		"本", "册", "卷", "篇", "章", "页", "行", "句", "段", "字", "双", "对",
	}

	for _, measure := range measureWords {
		if word == measure {
			return true
		}
	}

	return false
}

// min 返回两个整数中的最小值
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Name 实现 Optimizer 接口
func (o *DictOptimizer) Name() string {
	return "dict"
}
