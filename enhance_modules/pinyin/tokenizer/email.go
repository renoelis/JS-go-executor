package tokenizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"regexp"
)

// EmailTokenizer 邮箱识别器
// 识别文本中的邮箱地址，标记为 EMAIL 词性
type EmailTokenizer struct {
	emailPattern *regexp.Regexp
}

// NewEmailTokenizer 创建邮箱识别器
func NewEmailTokenizer() *EmailTokenizer {
	// 邮箱正则模式（与 JS 版本兼容）
	pattern := regexp.MustCompile(
		`[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}`,
	)

	return &EmailTokenizer{
		emailPattern: pattern,
	}
}

// Split 实现 Tokenizer 接口
func (t *EmailTokenizer) Split(words []Word) []Word {
	result := make([]Word, 0, len(words))

	for _, word := range words {
		// 已识别的词直接保留
		if word.P > 0 {
			result = append(result, word)
			continue
		}

		// 检查是否包含邮箱
		emailMatches := t.emailPattern.FindAllStringIndex(word.W, -1)

		if len(emailMatches) == 0 {
			result = append(result, word)
			continue
		}

		// 分离邮箱
		lastPos := 0
		for _, match := range emailMatches {
			start, end := match[0], match[1]

			// 添加邮箱之前的部分
			if start > lastPos {
				result = append(result, Word{
					W: word.W[lastPos:start],
					P: 0,
					C: word.C + lastPos,
				})
			}

			// 添加邮箱
			result = append(result, Word{
				W: word.W[start:end],
				P: postag.EMAIL, // 标记为 EMAIL 词性
				C: word.C + start,
			})

			lastPos = end
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

// Name 实现 Tokenizer 接口
func (t *EmailTokenizer) Name() string {
	return "email"
}
