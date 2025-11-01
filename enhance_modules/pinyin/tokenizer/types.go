package tokenizer

import "flow-codeblock-go/enhance_modules/pinyin/postag"

// Word 表示一个词元（与 JS 版本兼容）
type Word struct {
	W string        // 词的文本内容
	P postag.POSTag // 词性标注（0 表示未识别）
	C int           // 在原文中的位置
}

// Tokenizer 词元识别器接口
type Tokenizer interface {
	// Split 将词序列进一步分割/识别
	// 输入：已分词的词序列
	// 输出：处理后的词序列
	Split(words []Word) []Word

	// Name 返回识别器名称
	Name() string
}

// TokenizerFunc 函数式 Tokenizer
type TokenizerFunc func(words []Word) []Word

func (f TokenizerFunc) Split(words []Word) []Word {
	return f(words)
}

func (f TokenizerFunc) Name() string {
	return "custom"
}

// Pipeline Tokenizer 处理管道
type Pipeline struct {
	tokenizers []Tokenizer
}

// NewPipeline 创建新的 Tokenizer 管道
func NewPipeline(tokenizers ...Tokenizer) *Pipeline {
	return &Pipeline{
		tokenizers: tokenizers,
	}
}

// Process 依次应用所有 Tokenizer
func (p *Pipeline) Process(words []Word) []Word {
	result := words
	for _, t := range p.tokenizers {
		result = t.Split(result)
	}
	return result
}

// AddTokenizer 添加 Tokenizer
func (p *Pipeline) AddTokenizer(t Tokenizer) {
	p.tokenizers = append(p.tokenizers, t)
}
