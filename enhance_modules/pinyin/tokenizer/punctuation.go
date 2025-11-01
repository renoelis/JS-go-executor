package tokenizer

import (
	"flow-codeblock-go/enhance_modules/pinyin/postag"
	"unicode"
)

// PunctuationTokenizer 标点符号识别器
// 将标点符号单独分离出来，标记为 D_W 词性
type PunctuationTokenizer struct{}

// NewPunctuationTokenizer 创建标点符号识别器
func NewPunctuationTokenizer() *PunctuationTokenizer {
	return &PunctuationTokenizer{}
}

// Split 实现 Tokenizer 接口
func (t *PunctuationTokenizer) Split(words []Word) []Word {
	result := make([]Word, 0, len(words)*2) // 预分配更多空间
	
	for _, word := range words {
		// 已识别的词直接保留
		if word.P > 0 {
			result = append(result, word)
			continue
		}
		
		// 分离标点符号
		runes := []rune(word.W)
		start := 0
		
		for i, r := range runes {
			if isPunctuation(r) {
				// 添加标点之前的部分
				if i > start {
					result = append(result, Word{
						W: string(runes[start:i]),
						P: 0,
						C: word.C + len(string(runes[:start])),
					})
				}
				
				// 添加标点符号
				result = append(result, Word{
					W: string(r),
					P: postag.D_W, // 标记为标点
					C: word.C + len(string(runes[:i])),
				})
				
				start = i + 1
			}
		}
		
		// 添加剩余部分
		if start < len(runes) {
			result = append(result, Word{
				W: string(runes[start:]),
				P: 0,
				C: word.C + len(string(runes[:start])),
			})
		}
	}
	
	return result
}

// isPunctuation 判断是否为标点符号
func isPunctuation(r rune) bool {
	// Unicode 标点符号类别
	if unicode.IsPunct(r) {
		return true
	}
	
	// 中文标点符号
	chinesePunct := []rune{
		'。', '，', '、', '；', '：', '？', '！',
		'（', '）', '【', '】', '《', '》',
		0x201C, 0x201D, // 中英文引号 " "
		0x2018, 0x2019, // 中英文单引号 ' '
		'…', '—', '·', '～',
		'「', '」', '『', '』', '〈', '〉', '〔', '〕',
	}
	for _, p := range chinesePunct {
		if r == p {
			return true
		}
	}
	
	return false
}

// Name 实现 Tokenizer 接口
func (t *PunctuationTokenizer) Name() string {
	return "punctuation"
}

