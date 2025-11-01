package tokenizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
	"flow-codeblock-go/enhance_modules/pinyin/postag"
)

// ChsNameTokenizer 中文人名识别器
// 基于人名字典识别中文人名，标记为 A_NR 词性
// 与 JavaScript pinyin.js 的 ChsNameTokenizer 完全兼容
type ChsNameTokenizer struct {
	familyName1 map[rune]bool   // 单字姓
	familyName2 map[string]bool // 复姓
	singleName  map[rune]bool   // 单字名
	doubleName1 map[rune]bool   // 双字名首字
	doubleName2 map[rune]bool   // 双字名末字
}

// NewChsNameTokenizer 创建中文人名识别器
func NewChsNameTokenizer() *ChsNameTokenizer {
	// 确保字典已加载
	dict.Init()

	// 构建人名字典的快速查找表
	nameDict := dict.GetNameDict()

	familyName1 := make(map[rune]bool, len(nameDict.FamilyName1))
	for _, name := range nameDict.FamilyName1 {
		if len([]rune(name)) == 1 {
			familyName1[[]rune(name)[0]] = true
		}
	}

	familyName2 := make(map[string]bool, len(nameDict.FamilyName2))
	for _, name := range nameDict.FamilyName2 {
		familyName2[name] = true
	}

	singleName := make(map[rune]bool, len(nameDict.SingleName))
	for _, name := range nameDict.SingleName {
		if len([]rune(name)) == 1 {
			singleName[[]rune(name)[0]] = true
		}
	}

	doubleName1 := make(map[rune]bool, len(nameDict.DoubleName1))
	for _, name := range nameDict.DoubleName1 {
		if len([]rune(name)) == 1 {
			doubleName1[[]rune(name)[0]] = true
		}
	}

	doubleName2 := make(map[rune]bool, len(nameDict.DoubleName2))
	for _, name := range nameDict.DoubleName2 {
		if len([]rune(name)) == 1 {
			doubleName2[[]rune(name)[0]] = true
		}
	}

	return &ChsNameTokenizer{
		familyName1: familyName1,
		familyName2: familyName2,
		singleName:  singleName,
		doubleName1: doubleName1,
		doubleName2: doubleName2,
	}
}

// NameInfo 人名信息
type NameInfo struct {
	Name string // 人名文本
	Pos  int    // 在原文中的位置
}

// Split 实现 Tokenizer 接口
func (t *ChsNameTokenizer) Split(words []Word) []Word {
	result := make([]Word, 0, len(words))

	for _, word := range words {
		// 已识别的词直接保留
		if word.P > 0 {
			result = append(result, word)
			continue
		}

		// 识别人名
		names := t.matchName(word.W)

		if len(names) == 0 {
			result = append(result, word)
			continue
		}

		// 分离人名
		lastPos := 0
		for _, nameInfo := range names {
			// 添加人名之前的部分
			if nameInfo.Pos > lastPos {
				result = append(result, Word{
					W: word.W[lastPos:nameInfo.Pos],
					P: 0,
					C: word.C + lastPos,
				})
			}

			// 添加人名
			result = append(result, Word{
				W: nameInfo.Name,
				P: postag.A_NR, // 标记为人名
				C: word.C + nameInfo.Pos,
			})

			lastPos = nameInfo.Pos + len(nameInfo.Name)
		}

		// 添加剩余部分
		if lastPos < len(word.W) {
			result = append(result, Word{
				W: word.W[lastPos:],
				P: 0,
				C: word.C + lastPos,
			})
		}
	}

	return result
}

// matchName 匹配文本中的人名
// 实现逻辑与 JS 版本的 ChsNameTokenizer.matchName 完全一致
func (t *ChsNameTokenizer) matchName(text string) []NameInfo {
	runes := []rune(text)
	result := make([]NameInfo, 0)
	pos := 0

	for pos < len(runes) {
		name := ""

		// 🔥 策略1：尝试复姓（2字）
		if pos+2 <= len(runes) {
			f2 := string(runes[pos : pos+2])
			if t.familyName2[f2] {
				// 复姓 + 双字名（4字人名）
				if pos+4 <= len(runes) {
					n1 := runes[pos+2]
					n2 := runes[pos+3]
					if t.doubleName1[n1] && t.doubleName2[n2] {
						name = f2 + string(n1) + string(n2)
					}
				}

				// 复姓 + 单字名（3字人名）
				if name == "" && pos+3 <= len(runes) {
					n1 := runes[pos+2]
					if t.singleName[n1] {
						n2 := rune(0)
						if pos+3 < len(runes) {
							n2 = runes[pos+3]
						}
						// 检查是否为叠字名（如：张三三）
						if n1 == n2 {
							name = f2 + string(n1) + string(n2)
						} else {
							name = f2 + string(n1)
						}
					}
				}
			}
		}

		// 🔥 策略2：尝试单姓（1字）
		if name == "" && pos+1 <= len(runes) {
			f1 := runes[pos]
			if t.familyName1[f1] {
				// 单姓 + 双字名（3字人名）
				if pos+3 <= len(runes) {
					n1 := runes[pos+1]
					n2 := runes[pos+2]
					if t.doubleName1[n1] && t.doubleName2[n2] {
						name = string(f1) + string(n1) + string(n2)
					}
				}

				// 单姓 + 单字名（2字人名）
				if name == "" && pos+2 <= len(runes) {
					n1 := runes[pos+1]
					if t.singleName[n1] {
						n2 := rune(0)
						if pos+2 < len(runes) {
							n2 = runes[pos+2]
						}
						// 检查是否为叠字名（如：李明明）
						if n1 == n2 {
							name = string(f1) + string(n1) + string(n2)
						} else {
							name = string(f1) + string(n1)
						}
					}
				}
			}
		}

		// 检查是否匹配成功
		if name == "" {
			pos++
		} else {
			result = append(result, NameInfo{
				Name: name,
				Pos:  pos,
			})
			pos += len([]rune(name))
		}
	}

	return result
}

// Name 实现 Tokenizer 接口
func (t *ChsNameTokenizer) Name() string {
	return "chs_name"
}
