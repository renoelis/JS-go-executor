package optimizer

import "flow-codeblock-go/enhance_modules/pinyin/tokenizer"

// Optimizer 优化器接口
// 用于对分词结果进行后处理优化
type Optimizer interface {
	// Optimize 优化词序列
	// 输入：初步分词的词序列
	// 输出：优化后的词序列
	Optimize(words []tokenizer.Word) []tokenizer.Word

	// Name 返回优化器名称
	Name() string
}

// OptimizerFunc 函数式 Optimizer
type OptimizerFunc func(words []tokenizer.Word) []tokenizer.Word

func (f OptimizerFunc) Optimize(words []tokenizer.Word) []tokenizer.Word {
	return f(words)
}

func (f OptimizerFunc) Name() string {
	return "custom"
}

// Pipeline Optimizer 处理管道
type Pipeline struct {
	optimizers []Optimizer
}

// NewPipeline 创建新的 Optimizer 管道
func NewPipeline(optimizers ...Optimizer) *Pipeline {
	return &Pipeline{
		optimizers: optimizers,
	}
}

// Process 依次应用所有 Optimizer
func (p *Pipeline) Process(words []tokenizer.Word) []tokenizer.Word {
	result := words
	for _, opt := range p.optimizers {
		result = opt.Optimize(result)
	}
	return result
}

// AddOptimizer 添加 Optimizer
func (p *Pipeline) AddOptimizer(opt Optimizer) {
	p.optimizers = append(p.optimizers, opt)
}

