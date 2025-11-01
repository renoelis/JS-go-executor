package postprocessor

import (
	"flow-codeblock-go/enhance_modules/pinyin/dict"
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"flow-codeblock-go/enhance_modules/pinyin/tokenizer"
)

// PostProcessor 后处理器接口
type PostProcessor interface {
	// Process 处理词序列
	Process(words []tokenizer.Word) []tokenizer.Word

	// Name 返回处理器名称
	Name() string
}

// ============================================
// 1. StripPunctuation - 去除标点符号
// ============================================

// StripPunctuationProcessor 去除标点符号处理器
type StripPunctuationProcessor struct{}

// NewStripPunctuationProcessor 创建标点去除处理器
func NewStripPunctuationProcessor() *StripPunctuationProcessor {
	return &StripPunctuationProcessor{}
}

// Process 去除所有标点符号
func (p *StripPunctuationProcessor) Process(words []tokenizer.Word) []tokenizer.Word {
	result := make([]tokenizer.Word, 0, len(words))

	for _, word := range words {
		// 跳过标点符号
		if word.P == postag.D_W {
			continue
		}
		result = append(result, word)
	}

	return result
}

// Name 实现 PostProcessor 接口
func (p *StripPunctuationProcessor) Name() string {
	return "strip_punctuation"
}

// ============================================
// 2. ConvertSynonym - 转换同义词
// ============================================

// ConvertSynonymProcessor 同义词转换处理器
type ConvertSynonymProcessor struct {
	synonymDict map[string]string // 同义词映射表
}

// NewConvertSynonymProcessor 创建同义词转换处理器
func NewConvertSynonymProcessor() *ConvertSynonymProcessor {
	// 确保字典已加载
	dict.Init()

	// 从 SynonymDict 构建快速查找表
	synonymMap := make(map[string]string)

	for _, group := range dict.SynonymDict {
		if len(group) < 2 {
			continue
		}

		// 第一个词作为标准词，其他词都映射到它
		standard := group[0]
		for i := 1; i < len(group); i++ {
			synonymMap[group[i]] = standard
		}
	}

	return &ConvertSynonymProcessor{
		synonymDict: synonymMap,
	}
}

// Process 转换同义词为标准词
func (p *ConvertSynonymProcessor) Process(words []tokenizer.Word) []tokenizer.Word {
	result := make([]tokenizer.Word, len(words))

	for i, word := range words {
		// 检查是否有同义词
		if standard, exists := p.synonymDict[word.W]; exists {
			result[i] = tokenizer.Word{
				W: standard, // 替换为标准词
				P: word.P,
				C: word.C,
			}
		} else {
			result[i] = word
		}
	}

	return result
}

// Name 实现 PostProcessor 接口
func (p *ConvertSynonymProcessor) Name() string {
	return "convert_synonym"
}

// ============================================
// 3. StripStopword - 去除停用词
// ============================================

// StripStopwordProcessor 停用词去除处理器
type StripStopwordProcessor struct {
	stopwords map[string]bool // 停用词集合
}

// NewStripStopwordProcessor 创建停用词去除处理器
func NewStripStopwordProcessor() *StripStopwordProcessor {
	// 确保字典已加载
	dict.Init()

	// 构建停用词快速查找表
	stopwordSet := make(map[string]bool, len(dict.StopwordDict))
	for _, word := range dict.StopwordDict {
		stopwordSet[word] = true
	}

	return &StripStopwordProcessor{
		stopwords: stopwordSet,
	}
}

// Process 去除停用词
func (p *StripStopwordProcessor) Process(words []tokenizer.Word) []tokenizer.Word {
	result := make([]tokenizer.Word, 0, len(words))

	for _, word := range words {
		// 跳过停用词
		if p.stopwords[word.W] {
			continue
		}
		result = append(result, word)
	}

	return result
}

// Name 实现 PostProcessor 接口
func (p *StripStopwordProcessor) Name() string {
	return "strip_stopword"
}

// ============================================
// 4. SimpleMode - 只返回单词内容
// ============================================

// SimpleModeProcessor 简化模式处理器
// 将结果简化为只包含文本内容
type SimpleModeProcessor struct{}

// NewSimpleModeProcessor 创建简化模式处理器
func NewSimpleModeProcessor() *SimpleModeProcessor {
	return &SimpleModeProcessor{}
}

// Process 保持原样（simple 模式在最终输出时处理）
func (p *SimpleModeProcessor) Process(words []tokenizer.Word) []tokenizer.Word {
	return words
}

// Name 实现 PostProcessor 接口
func (p *SimpleModeProcessor) Name() string {
	return "simple_mode"
}

// ToSimple 将词序列转换为简单字符串数组
func ToSimple(words []tokenizer.Word) []string {
	result := make([]string, len(words))
	for i, word := range words {
		result[i] = word.W
	}
	return result
}

// ============================================
// Pipeline - 后处理管道
// ============================================

// Pipeline 后处理管道
type Pipeline struct {
	processors []PostProcessor
}

// NewPipeline 创建新的后处理管道
func NewPipeline(processors ...PostProcessor) *Pipeline {
	return &Pipeline{
		processors: processors,
	}
}

// Process 依次应用所有后处理器
func (p *Pipeline) Process(words []tokenizer.Word) []tokenizer.Word {
	result := words
	for _, processor := range p.processors {
		result = processor.Process(result)
	}
	return result
}

// AddProcessor 添加后处理器
func (p *Pipeline) AddProcessor(processor PostProcessor) {
	p.processors = append(p.processors, processor)
}

// ============================================
// 便捷函数
// ============================================

// StripPunctuation 去除标点符号（便捷函数）
func StripPunctuation(words []tokenizer.Word) []tokenizer.Word {
	return NewStripPunctuationProcessor().Process(words)
}

// ConvertSynonym 转换同义词（便捷函数）
func ConvertSynonym(words []tokenizer.Word) []tokenizer.Word {
	return NewConvertSynonymProcessor().Process(words)
}

// StripStopword 去除停用词（便捷函数）
func StripStopword(words []tokenizer.Word) []tokenizer.Word {
	return NewStripStopwordProcessor().Process(words)
}

