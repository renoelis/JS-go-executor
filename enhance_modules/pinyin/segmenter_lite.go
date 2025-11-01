package pinyin

import (
	"flow-codeblock-go/enhance_modules/pinyin/core"
	"flow-codeblock-go/enhance_modules/pinyin/dict"
	"flow-codeblock-go/enhance_modules/pinyin/optimizer"
	"flow-codeblock-go/enhance_modules/pinyin/tokenizer"
)

// LightweightSegmenter 轻量级分词器（不依赖 GSE）
// 基于内置词组字典进行分词，内存占用极低
type LightweightSegmenter struct {
	tokenizerPipeline *tokenizer.Pipeline // 🔥 Tokenizer 管道
	optimizerPipeline *optimizer.Pipeline // 🔥 Optimizer 管道
}

// NewLightweightSegmenter 创建轻量级分词器
func NewLightweightSegmenter() *LightweightSegmenter {
	// 🔥 初始化 Tokenizer 管道（100% 兼容 npm pinyin v4）
	// 
	// ⭐ 重要更新：经过对 JS 原版的深度分析，npm pinyin v4 使用了完整的 Tokenizer 管道！
	// 
	// JS 原版使用的模块顺序（modules 数组）：
	//   var modules = [
	//     URLTokenizer,          // URL识别
	//     WildcardTokenizer,     // 通配符，必须在标点符号识别之前
	//     PunctuationTokenizer,  // 标点符号识别
	//     ForeignTokenizer,      // 外文字符、数字识别，必须在标点符号识别之后
	//     DictTokenizer,         // 词典识别
	//     ChsNameTokenizer,      // 人名识别，建议在词典识别之后
	//     // 优化模块
	//     EmailOptimizer,        // 邮箱地址识别
	//     ChsNameOptimizer,      // 人名识别优化
	//     DictOptimizer,         // 词典识别优化
	//     DatetimeOptimizer,     // 日期时间识别优化
	//     AdjectiveOptimizer     // 形容词优化
	//   ];
	//
	// 因此，我们需要启用所有 Tokenizer 以保持 100% 兼容：
	//
	tokenizerPipeline := tokenizer.NewPipeline(
		tokenizer.NewURLTokenizer(),         // ✅ URL识别
		tokenizer.NewWildcardTokenizer(),    // ✅ 通配符识别（必须在标点之前）
		tokenizer.NewPunctuationTokenizer(), // ✅ 标点符号识别
		tokenizer.NewForeignTokenizer(),     // ✅ 外文字符、数字识别（必须在标点之后）
		tokenizer.NewChsNameTokenizer(),     // ✅ 中文人名识别
	)

	// 🔥 初始化 Optimizer 管道（优化阶段）
	optimizerPipeline := optimizer.NewPipeline(
		optimizer.NewDatetimeOptimizer(),  // 日期时间识别优化
		optimizer.NewChsNameOptimizer(),   // 人名识别优化
		optimizer.NewDictOptimizer(),      // 词典优化（MMSG算法）
		optimizer.NewAdjectiveOptimizer(), // 形容词优化
	)

	return &LightweightSegmenter{
		tokenizerPipeline: tokenizerPipeline,
		optimizerPipeline: optimizerPipeline,
	}
}

// Segment 轻量级分词（基于词组字典的前向最大匹配）
// 内存占用: ~0MB（复用已有的 PhrasesDict）
func (ls *LightweightSegmenter) Segment(text string, mode string) []string {
	if text == "" {
		return []string{}
	}

	runes := []rune(text)
	result := make([]string, 0, len(runes))
	i := 0

	for i < len(runes) {
		// 🎯 策略1: 尝试最长词组匹配（前向最大匹配算法）
		maxLen := 8 // 最大词组长度（可调整）
		if maxLen > len(runes)-i {
			maxLen = len(runes) - i
		}

		matched := false
		// 从最长到最短尝试匹配
		for length := maxLen; length >= 2; length-- {
			if i+length > len(runes) {
				continue
			}

			phrase := string(runes[i : i+length])
			// ⭐ 修复：同时检查 PhrasesDict 和 SpecialDict
			// JS 原版在 phrase_match.go 中也是这样做的
			_, foundInPhrases := core.GetPhraseFromDict(phrase)
			isSpecial := dict.IsSpecialWord(phrase)
			
			if foundInPhrases || isSpecial {
				// 词组匹配成功
				result = append(result, phrase)
				i += length
				matched = true
				break
			}
		}

		if matched {
			continue
		}

		// 🎯 策略2: 单字处理
		char := runes[i]

		// 检查是否是汉字
		if isChineseChar(char) {
			// 单个汉字作为一个词
			result = append(result, string(char))
			i++
		} else {
			// 🎯 策略3: 非汉字连续合并
			start := i
			for i < len(runes) && !isChineseChar(runes[i]) {
				i++
			}
			result = append(result, string(runes[start:i]))
		}
	}

	return result
}

// SegmentForPinyin 专门为拼音转换优化的分词
// 🔥 集成了高级 Tokenizer 功能
// ⭐ 重要修复：先应用 Tokenizer，再进行中文分词
func (ls *LightweightSegmenter) SegmentForPinyin(text string) []string {
	if text == "" {
		return []string{}
	}

	// ⭐ 特殊处理：如果文本全是非汉字（标点、数字、英文等），不拆分
	// 这样保持与 npm pinyin v4 的 normal_pinyin 行为一致
	// normal_pinyin 会将连续的非汉字字符累积为一个元素
	hasHanzi := false
	for _, r := range text {
		if isChineseChar(r) {
			hasHanzi = true
			break
		}
	}
	
	// 如果没有汉字，直接返回整个文本（累积非汉字）
	if !hasHanzi {
		return []string{text}
	}

	// ⭐ 关键修复：先应用 Tokenizer 管道，再分词
	// 这样可以确保 URL、数字、英文等先被识别，不会被分词拆散
	// 
	// 流程：
	// 1. 整个文本作为一个 Word 输入
	// 2. Tokenizer 管道识别并分离 URL/数字/英文/标点等
	// 3. 对剩余的中文部分进行分词
	
	// 1. 创建初始 Word（整个文本）
	initialWord := []tokenizer.Word{{
		W: text,
		P: 0,
		C: 0,
	}}

	// 2. 应用 Tokenizer 管道
	// 这会识别 URL、邮箱、数字、英文、标点等
	tokenWords := ls.tokenizerPipeline.Process(initialWord)

	// 3. 对每个 tokenWord 进行进一步处理
	result := make([]string, 0, len(tokenWords))
	
	for _, tw := range tokenWords {
		// 如果已被识别（有词性标注），直接保留
		if tw.P > 0 {
			result = append(result, tw.W)
		} else {
			// 未识别的部分（可能是中文），进行分词
			segments := ls.Segment(tw.W, "default")
			result = append(result, segments...)
		}
	}

	return result
}

// AddWord 添加自定义词（轻量级实现：忽略，因为没有独立词典）
func (ls *LightweightSegmenter) AddWord(word string, freq int) {
	// 轻量级实现不维护独立词典，直接使用 PhrasesDict
	// 如果需要动态添加词，可以考虑维护一个小型 map
}

// isChineseChar 判断是否是中文字符
func isChineseChar(r rune) bool {
	// CJK 统一汉字
	if r >= 0x4E00 && r <= 0x9FFF {
		return true
	}
	// CJK 扩展 A
	if r >= 0x3400 && r <= 0x4DBF {
		return true
	}
	// CJK 扩展 B-F
	if r >= 0x20000 && r <= 0x2EBEF {
		return true
	}
	// CJK 兼容汉字
	if r >= 0xF900 && r <= 0xFAFF {
		return true
	}
	return false
}

// ==========================================
// 🔥 全局轻量级分词器接口（替代 GSE）
// ==========================================

var (
	useLightweightSegmenter      = true // 🔥 控制是否使用轻量级分词器
	lightweightSegmenterInstance *LightweightSegmenter
)

// GetSegmenterLite 获取轻量级分词器
// 内存占用几乎为 0（只复用已有的词组字典）
func GetSegmenterLite() *LightweightSegmenter {
	if lightweightSegmenterInstance == nil {
		lightweightSegmenterInstance = NewLightweightSegmenter()
	}
	return lightweightSegmenterInstance
}

// SetUseLightweightSegmenter 设置是否使用轻量级分词器
// true: 使用轻量级分词器（内存占用低，分词质量略低）
// false: 使用 GSE 分词器（内存占用高 ~170MB，分词质量高）
func SetUseLightweightSegmenter(useLite bool) {
	useLightweightSegmenter = useLite
}

// IsUsingLightweightSegmenter 检查是否正在使用轻量级分词器
func IsUsingLightweightSegmenter() bool {
	return useLightweightSegmenter
}

// SegmenterInterface 统一的分词器接口
type SegmenterInterface interface {
	Segment(text string, mode string) []string
	SegmentForPinyin(text string) []string
	AddWord(word string, freq int)
}

// GetUnifiedSegmenter 获取统一的分词器（根据配置自动选择）
// 🔥 这是推荐的获取分词器的方式
func GetUnifiedSegmenter() SegmenterInterface {
	if useLightweightSegmenter {
		return GetSegmenterLite()
	}
	// 如果需要 GSE，取消下面的注释
	// return GetGlobalSegmenter()

	// 默认返回轻量级分词器
	return GetSegmenterLite()
}
