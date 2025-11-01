package optimizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"flow-codeblock-go/enhance_modules/pinyin/tokenizer"
)

// ChsNameOptimizer 中文人名识别优化器
// 用于优化和补充 ChsNameTokenizer 未能识别的人名
// 与 JavaScript pinyin.js 的 ChsNameOptimizer 兼容
type ChsNameOptimizer struct {
	nameDict dict.NameDict
}

// NewChsNameOptimizer 创建人名识别优化器
func NewChsNameOptimizer() *ChsNameOptimizer {
	// 确保字典已加载
	dict.Init()

	return &ChsNameOptimizer{
		nameDict: dict.GetNameDict(),
	}
}

// Optimize 实现 Optimizer 接口
func (o *ChsNameOptimizer) Optimize(words []tokenizer.Word) []tokenizer.Word {
	if len(words) < 2 {
		return words
	}

	result := make([]tokenizer.Word, 0, len(words))
	i := 0

	for i < len(words) {
		// 🎯 策略1: 姓 + 名 模式识别
		if i < len(words)-1 {
			current := words[i]
			next := words[i+1]

			// 检查是否为人名模式
			if name := o.tryMatchName(current, next, i+2 < len(words), words); name != nil {
				result = append(result, *name)
				// 跳过已合并的词
				if len([]rune(name.W)) == 2 {
					i += 2
				} else if len([]rune(name.W)) == 3 {
					i += 3
				} else {
					i++
				}
				continue
			}
		}

		// 🎯 策略2: 已识别为人名的词，但可能需要合并
		if words[i].P == postag.A_NR {
			// 检查后续是否有可以合并的词
			j := i + 1
			for j < len(words) && words[j].P == postag.A_NR {
				j++
			}

			if j > i+1 {
				// 合并多个连续的人名词
				combinedName := ""
				for k := i; k < j; k++ {
					combinedName += words[k].W
				}

				result = append(result, tokenizer.Word{
					W: combinedName,
					P: postag.A_NR,
					C: words[i].C,
				})
				i = j
				continue
			}
		}

		// 默认：保留原词
		result = append(result, words[i])
		i++
	}

	return result
}

// tryMatchName 尝试匹配人名
// 返回: 匹配成功返回合并后的人名词，否则返回 nil
func (o *ChsNameOptimizer) tryMatchName(first, second tokenizer.Word, hasThird bool, words []tokenizer.Word) *tokenizer.Word {
	// 跳过已识别的词（除了人名）
	if first.P > 0 && first.P != postag.A_NR {
		return nil
	}
	if second.P > 0 && second.P != postag.A_NR {
		return nil
	}

	firstRunes := []rune(first.W)
	secondRunes := []rune(second.W)

	// 只处理单字词
	if len(firstRunes) != 1 || len(secondRunes) != 1 {
		return nil
	}

	firstChar := firstRunes[0]
	secondChar := secondRunes[0]

	// 🔥 模式1: 单姓 + 单字名 (2字人名)
	if o.isFamilyName1(firstChar) && o.isSingleName(secondChar) {
		// 检查是否为叠字名 (如: 李明明)
		if hasThird {
			third := words[2]
			thirdRunes := []rune(third.W)
			if len(thirdRunes) == 1 && thirdRunes[0] == secondChar {
				// 3字人名: 姓 + 名 + 名
				return &tokenizer.Word{
					W: string(firstChar) + string(secondChar) + string(secondChar),
					P: postag.A_NR,
					C: first.C,
				}
			}
		}

		// 普通2字人名
		return &tokenizer.Word{
			W: string(firstChar) + string(secondChar),
			P: postag.A_NR,
			C: first.C,
		}
	}

	// 🔥 模式2: 单姓 + 双字名首字 (需要第三个字)
	if hasThird && o.isFamilyName1(firstChar) && o.isDoubleName1(secondChar) {
		third := words[2]
		thirdRunes := []rune(third.W)
		if len(thirdRunes) == 1 && o.isDoubleName2(thirdRunes[0]) {
			// 3字人名: 姓 + 名1 + 名2
			return &tokenizer.Word{
				W: string(firstChar) + string(secondChar) + string(thirdRunes[0]),
				P: postag.A_NR,
				C: first.C,
			}
		}
	}

	// 🔥 模式3: 复姓识别
	twoCharSurname := string(firstChar) + string(secondChar)
	if o.isFamilyName2(twoCharSurname) {
		if hasThird {
			third := words[2]
			thirdRunes := []rune(third.W)
			if len(thirdRunes) == 1 && o.isSingleName(thirdRunes[0]) {
				// 3字人名: 复姓 + 单字名
				return &tokenizer.Word{
					W: twoCharSurname + string(thirdRunes[0]),
					P: postag.A_NR,
					C: first.C,
				}
			}
		}
	}

	return nil
}

// isFamilyName1 检查是否为单字姓
func (o *ChsNameOptimizer) isFamilyName1(r rune) bool {
	for _, name := range o.nameDict.FamilyName1 {
		if []rune(name)[0] == r {
			return true
		}
	}
	return false
}

// isFamilyName2 检查是否为复姓
func (o *ChsNameOptimizer) isFamilyName2(s string) bool {
	for _, name := range o.nameDict.FamilyName2 {
		if name == s {
			return true
		}
	}
	return false
}

// isSingleName 检查是否为单字名
func (o *ChsNameOptimizer) isSingleName(r rune) bool {
	for _, name := range o.nameDict.SingleName {
		if []rune(name)[0] == r {
			return true
		}
	}
	return false
}

// isDoubleName1 检查是否为双字名首字
func (o *ChsNameOptimizer) isDoubleName1(r rune) bool {
	for _, name := range o.nameDict.DoubleName1 {
		if []rune(name)[0] == r {
			return true
		}
	}
	return false
}

// isDoubleName2 检查是否为双字名末字
func (o *ChsNameOptimizer) isDoubleName2(r rune) bool {
	for _, name := range o.nameDict.DoubleName2 {
		if []rune(name)[0] == r {
			return true
		}
	}
	return false
}

// Name 实现 Optimizer 接口
func (o *ChsNameOptimizer) Name() string {
	return "chs_name"
}

