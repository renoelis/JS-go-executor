package optimizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"flow-codeblock-go/enhance_modules/pinyin/tokenizer"
)

// AdjectiveOptimizer 形容词优化器
// 优化形容词与其修饰词的组合
// 与 JavaScript pinyin.js 的 AdjectiveOptimizer 兼容
type AdjectiveOptimizer struct {
	adjectives map[string]bool // 常见形容词
}

// NewAdjectiveOptimizer 创建形容词优化器
func NewAdjectiveOptimizer() *AdjectiveOptimizer {
	// 常见形容词列表
	adjectives := map[string]bool{
		// 性质形容词
		"好": true, "坏": true, "大": true, "小": true, "高": true, "低": true,
		"长": true, "短": true, "粗": true, "细": true, "厚": true, "薄": true,
		"宽": true, "窄": true, "深": true, "浅": true, "重": true, "轻": true,
		"冷": true, "热": true, "凉": true, "暖": true, "干": true, "湿": true,
		"快": true, "慢": true, "早": true, "晚": true, "新": true, "旧": true,
		"多": true, "少": true, "远": true, "近": true, "清": true, "浊": true,
		"美": true, "丑": true, "善": true, "恶": true, "真": true, "假": true,
		"对": true, "错": true, "正": true, "邪": true, "强": true, "弱": true,
		"硬": true, "软": true, "明": true, "暗": true, "亮": true, "黑": true,
		"白": true, "红": true, "黄": true, "蓝": true, "绿": true, "紫": true,
		"圆": true, "方": true, "尖": true, "钝": true, "直": true, "弯": true,
		"平": true, "斜": true, "滑": true, "糙": true, "香": true, "臭": true,
		"甜": true, "苦": true, "辣": true, "酸": true, "咸": true, "鲜": true,

		// 状态形容词
		"富": true, "穷": true, "贫": true, "贵": true, "贱": true, "空": true,
		"满": true, "饱": true, "饿": true, "累": true, "忙": true, "闲": true,
		"静": true, "动": true, "活": true, "死": true, "生": true, "熟": true,
		"安": true, "危": true, "稳": true, "乱": true, "齐": true, "整": true,

		// 程度副词+形容词
		"很好": true, "很坏": true, "很大": true, "很小": true, "很高": true,
		"非常": true, "特别": true, "十分": true, "极其": true, "格外": true,
		"更加": true, "比较": true, "相当": true, "太": true, "最": true,
	}

	return &AdjectiveOptimizer{
		adjectives: adjectives,
	}
}

// Optimize 实现 Optimizer 接口
func (o *AdjectiveOptimizer) Optimize(words []tokenizer.Word) []tokenizer.Word {
	if len(words) < 2 {
		return words
	}

	result := make([]tokenizer.Word, 0, len(words))
	i := 0

	for i < len(words) {
		// 🎯 策略1: 程度副词 + 形容词 → 合并
		// 例: "很" + "好" → "很好"
		if i < len(words)-1 {
			current := words[i]
			next := words[i+1]

			if o.isDegreeAdverb(current.W) && o.isAdjective(next.W) {
				// 合并
				result = append(result, tokenizer.Word{
					W: current.W + next.W,
					P: postag.D_A, // 标记为形容词
					C: current.C,
				})
				i += 2
				continue
			}
		}

		// 🎯 策略2: 形容词 + "的" → 保持分离（为了语法正确性）
		// 例: "好" + "的" + "人" → 保持为 ["好", "的", "人"]
		// 不做合并，直接保留

		// 🎯 策略3: 标记形容词词性
		if o.isAdjective(words[i].W) && words[i].P == 0 {
			result = append(result, tokenizer.Word{
				W: words[i].W,
				P: postag.D_A, // 标记为形容词
				C: words[i].C,
			})
			i++
			continue
		}

		// 默认：保留原词
		result = append(result, words[i])
		i++
	}

	return result
}

// isAdjective 检查是否为形容词
func (o *AdjectiveOptimizer) isAdjective(word string) bool {
	return o.adjectives[word]
}

// isDegreeAdverb 检查是否为程度副词
func (o *AdjectiveOptimizer) isDegreeAdverb(word string) bool {
	adverbs := []string{
		"很", "非常", "特别", "十分", "极其", "格外",
		"更加", "比较", "相当", "太", "最", "更",
		"挺", "颇", "稍", "略", "较", "极",
		"超", "超级", "蛮", "好", "真", "实在",
	}

	for _, adv := range adverbs {
		if word == adv {
			return true
		}
	}
	return false
}

// Name 实现 Optimizer 接口
func (o *AdjectiveOptimizer) Name() string {
	return "adjective"
}

