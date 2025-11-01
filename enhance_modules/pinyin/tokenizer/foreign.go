package tokenizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"unicode"
)

// ForeignTokenizer 外文字符识别器
// 识别并分离文本中的外文字符（英文字母、数字等）
// 与 JavaScript pinyin.js 的 ForeignTokenizer 完全兼容
type ForeignTokenizer struct{}

// NewForeignTokenizer 创建外文字符识别器
func NewForeignTokenizer() *ForeignTokenizer {
	return &ForeignTokenizer{}
}

// Split 实现 Tokenizer 接口
func (t *ForeignTokenizer) Split(words []Word) []Word {
	result := make([]Word, 0, len(words)*2)

	for _, word := range words {
		// 已识别的词直接保留
		if word.P > 0 {
			result = append(result, word)
			continue
		}

		// 分离外文字符
		splitWords := t.splitForeign(word.W, word.C)
		result = append(result, splitWords...)
	}

	return result
}

// splitForeign 分离外文字符
// 将文本按照中文、英文、数字进行分组
func (t *ForeignTokenizer) splitForeign(text string, basePos int) []Word {
	if text == "" {
		return []Word{}
	}

	runes := []rune(text)
	result := make([]Word, 0)

	i := 0
	for i < len(runes) {
		r := runes[i]

		// 判断字符类型
		if isEnglishChar(r) {
			// 连续英文字母
			start := i
			for i < len(runes) && isEnglishChar(runes[i]) {
				i++
			}
			result = append(result, Word{
				W: string(runes[start:i]),
				P: postag.A_NX, // 标记为外文字符
				C: basePos + len(string(runes[:start])),
			})
		} else if isDigit(r) {
			// 连续数字
			start := i
			for i < len(runes) && (isDigit(runes[i]) || runes[i] == '.' || runes[i] == ',') {
				i++
			}
			result = append(result, Word{
				W: string(runes[start:i]),
				P: postag.A_M, // 标记为数词
				C: basePos + len(string(runes[:start])),
			})
		} else if isSpace(r) {
			// 空格
			result = append(result, Word{
				W: string(r),
				P: postag.D_W, // 标记为标点（空格作为分隔符）
				C: basePos + len(string(runes[:i])),
			})
			i++
		} else {
			// 中文或其他字符
			start := i
			// 连续非英文非数字字符
			for i < len(runes) && !isEnglishChar(runes[i]) && !isDigit(runes[i]) && !isSpace(runes[i]) {
				i++
			}
			result = append(result, Word{
				W: string(runes[start:i]),
				P: 0, // 未识别，等待后续处理
				C: basePos + len(string(runes[:start])),
			})
		}
	}

	return result
}

// isEnglishChar 判断是否为英文字母
func isEnglishChar(r rune) bool {
	return (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z')
}

// isDigit 判断是否为数字
func isDigit(r rune) bool {
	return r >= '0' && r <= '9'
}

// isSpace 判断是否为空格
func isSpace(r rune) bool {
	return unicode.IsSpace(r)
}

// Name 实现 Tokenizer 接口
func (t *ForeignTokenizer) Name() string {
	return "foreign"
}

