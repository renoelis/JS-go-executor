package core

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
)

// ConvertPhrase 词组拼音转换（模拟 JS 的 phrases_pinyin 逻辑）
// 这是对 npm pinyin v4 的 phrases_pinyin 方法的精确实现
//
// 核心逻辑：
// 1. 如果词组在 phrases_dict 中 → 使用字典拼音
// 2. 如果词组不在字典中 → 逐字调用 single_pinyin（兜底逻辑）
//
// 参数：
//   - phrase: 要转换的词组（通常是多字词，但也可以是单字）
//   - opts: 转换选项
//
// 返回：
//   - [][]string: 二维数组，每个字对应一个拼音数组
//
// 示例：
//   ConvertPhrase("中国", opts) → [["zhōng"], ["guó"]]  // 从字典
//   ConvertPhrase("未知词", opts) → [["wèi"], ["zhī"], ["cí"]]  // 逐字转换
func ConvertPhrase(phrase string, opts Options) [][]string {
	if phrase == "" {
		return [][]string{}
	}

	// 🎯 策略 1: 优先查找词组字典（phrases_dict）
	if phrasePinyins, found := dict.GetPhrasePinyin(phrase); found {
		// 词组在字典中，使用字典提供的拼音
		result := make([][]string, len(phrasePinyins))

		// ⭐ 关键逻辑：
		// 1. 如果词组在字典中，说明这是一个"固定搭配"（如"重庆"、"银行"）
		// 2. heteronym: true 时：
		//    - 如果词组字典中某个字有多个读音，返回这些读音（如"中心"的"中"）
		//    - 如果词组字典中某个字只有一个读音，这是消歧后的标准读音，直接使用
		//    - 但如果词组字典中该字的读音数组为空或很少，可能是词典数据不完整，此时补充单字字典的数据
		
		runes := []rune(phrase)
		
		for i, pyGroup := range phrasePinyins {
			if opts.Heteronym {
				// 多音字模式：
				// 策略：如果词组字典已经有多个读音（len > 1），说明这个位置确实是多音字，使用词组字典的数据
				//      如果词组字典只有一个读音（len == 1），可能是：
				//        a) 消歧后的标准读音（如"重庆"的"重"）→ 应该只返回这个
				//        b) 词典数据不完整 → 需要补充
				//      判断依据：如果单字字典有多个读音，但词组字典只有一个，说明是消歧（情况a）
				
				if len(pyGroup) > 1 {
					// 词组字典已经有多个读音，直接使用
					result[i] = make([]string, len(pyGroup))
					copy(result[i], pyGroup)
				} else if len(pyGroup) == 1 {
					// 词组字典只有一个读音
					// 这是消歧后的标准读音，应该尊重词组字典的消歧结果
					// 例如："重庆"的"重"在词组中只读 chóng，不应该返回 zhòng
					result[i] = []string{pyGroup[0]}
				} else {
					// 词组字典为空（数据缺失），从单字字典补充
					if i < len(runes) {
						char := runes[i]
						if allPinyins, exists := dict.GetPinyin(char); exists {
							result[i] = allPinyins
						} else {
							result[i] = []string{}
						}
					} else {
						result[i] = []string{}
					}
				}
			} else {
				// 单音模式：只返回词组字典的第一个读音（消歧后的标准读音）
				if len(pyGroup) > 0 {
					result[i] = []string{pyGroup[0]}
				} else {
					result[i] = []string{}
				}
			}
		}
		return result
	}

	// 🎯 策略 2: 不在词典 → 逐字转换（兜底逻辑）
	// ⭐ 这里与 JS 的 phrases_pinyin 完全一致：
	//    JS: for (let i = 0, l = phrases.length; i < l; i++) {
	//          py.push(this.single_pinyin(phrases[i], options));
	//        }
	//
	// 注意：这里调用 convertCharByChar 而不是 Convert，
	//       因为 Convert 可能会触发分词，而我们已经有了分词结果
	return convertCharByChar(phrase, opts)
}

// ConvertSingleChar 单字拼音转换（模拟 JS 的 single_pinyin 逻辑）
// 这是对 npm pinyin v4 的 single_pinyin 方法的精确实现
//
// 核心逻辑：
// 1. 检查字符是否在字典中
// 2. 如果在字典中：
//    - heteronym=true → 返回所有读音（去重）
//    - heteronym=false → 只返回第一个读音
// 3. 如果不在字典中 → 原样返回
//
// 参数：
//   - char: 要转换的单个字符（rune）
//   - opts: 转换选项
//
// 返回：
//   - []string: 该字符的拼音数组
//
// 示例：
//   ConvertSingleChar('中', opts) → ["zhōng"]  // heteronym=false
//   ConvertSingleChar('重', opts) → ["zhòng", "chóng"]  // heteronym=true
func ConvertSingleChar(char rune, opts Options) []string {
	pinyins, exists := dict.GetPinyin(char)

	if !exists {
		// 不在字典中，原样返回
		return []string{string(char)}
	}

	if !opts.Heteronym {
		// 单音模式：只返回第一个读音
		if len(pinyins) > 0 {
			return []string{pinyins[0]}
		}
		return []string{}
	}

	// 多音字模式：返回所有读音
	// ⭐ JS 原版有去重逻辑（使用 py_cached）
	//    临时存储已存在的拼音，避免多音字拼音转换为非注音风格出现重复
	seen := make(map[string]bool)
	result := make([]string, 0, len(pinyins))

	for _, py := range pinyins {
		if !seen[py] {
			seen[py] = true
			result = append(result, py)
		}
	}

	return result
}
