package tokenizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"regexp"
)

// URLTokenizer URL 识别器
// 识别文本中的 URL 地址，标记为 URL 词性
type URLTokenizer struct {
	urlPattern *regexp.Regexp
}

// NewURLTokenizer 创建 URL 识别器
func NewURLTokenizer() *URLTokenizer {
	// URL 正则模式（与 JS 版本兼容）
	pattern := regexp.MustCompile(
		`https?://[\w\-]+(\.[\w\-]+)+[/#?]?.*?|` + // http:// 或 https://
			`www\.[\w\-]+(\.[\w\-]+)+[/#?]?.*?|` + // www.
			`ftp://[\w\-]+(\.[\w\-]+)+[/#?]?.*?`, // ftp://
	)

	return &URLTokenizer{
		urlPattern: pattern,
	}
}

// Split 实现 Tokenizer 接口
func (t *URLTokenizer) Split(words []Word) []Word {
	result := make([]Word, 0, len(words))

	for _, word := range words {
		// 已识别的词直接保留
		if word.P > 0 {
			result = append(result, word)
			continue
		}

		// 检查是否包含 URL
		urlMatches := t.urlPattern.FindAllStringIndex(word.W, -1)

		if len(urlMatches) == 0 {
			result = append(result, word)
			continue
		}

		// 分离 URL
		lastPos := 0
		for _, match := range urlMatches {
			start, end := match[0], match[1]

			// 添加 URL 之前的部分
			if start > lastPos {
				result = append(result, Word{
					W: word.W[lastPos:start],
					P: 0,
					C: word.C + lastPos,
				})
			}

			// 添加 URL
			result = append(result, Word{
				W: word.W[start:end],
				P: postag.URL, // 标记为 URL 词性
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
func (t *URLTokenizer) Name() string {
	return "url"
}
