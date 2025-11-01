package tokenizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/postag"
)

// WildcardTokenizer 通配符识别器
// 识别并分离文本中的通配符 (* 和 ?)
// 与 JavaScript pinyin.js 的 WildcardTokenizer 完全兼容
type WildcardTokenizer struct{}

// NewWildcardTokenizer 创建通配符识别器
func NewWildcardTokenizer() *WildcardTokenizer {
	return &WildcardTokenizer{}
}

// Split 实现 Tokenizer 接口
func (t *WildcardTokenizer) Split(words []Word) []Word {
	result := make([]Word, 0, len(words)*2)

	for _, word := range words {
		// 已识别的词直接保留
		if word.P > 0 {
			result = append(result, word)
			continue
		}

		// 检查是否包含通配符
		if !containsWildcard(word.W) {
			result = append(result, word)
			continue
		}

		// 分离通配符
		splitWords := t.splitWildcard(word.W, word.C)
		result = append(result, splitWords...)
	}

	return result
}

// splitWildcard 分离通配符
func (t *WildcardTokenizer) splitWildcard(text string, basePos int) []Word {
	runes := []rune(text)
	result := make([]Word, 0)

	start := 0
	for i, r := range runes {
		if r == '*' || r == '?' {
			// 添加通配符之前的部分
			if i > start {
				result = append(result, Word{
					W: string(runes[start:i]),
					P: 0,
					C: basePos + len(string(runes[:start])),
				})
			}

			// 添加通配符
			result = append(result, Word{
				W: string(r),
				P: postag.D_W, // 标记为标点符号
				C: basePos + len(string(runes[:i])),
			})

			start = i + 1
		}
	}

	// 添加剩余部分
	if start < len(runes) {
		result = append(result, Word{
			W: string(runes[start:]),
			P: 0,
			C: basePos + len(string(runes[:start])),
		})
	}

	return result
}

// containsWildcard 检查是否包含通配符
func containsWildcard(text string) bool {
	for _, r := range text {
		if r == '*' || r == '?' {
			return true
		}
	}
	return false
}

// Name 实现 Tokenizer 接口
func (t *WildcardTokenizer) Name() string {
	return "wildcard"
}

