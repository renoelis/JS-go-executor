package core

import "flow-codeblock-go/enhance_modules/pinyin/style"

// Options 拼音转换选项
type Options struct {
	Style     style.Style // 拼音风格
	Heteronym bool        // 是否返回多音字
	Segment   bool        // 是否启用分词
	Mode      Mode        // 拼音模式
	Group     bool        // 是否按词组分组
	Compact   bool        // 是否返回笛卡尔积

	// 🔥 高级后处理选项
	StripPunctuation bool // 去除标点符号
	ConvertSynonym   bool // 转换同义词为标准词
	StripStopword    bool // 去除停用词
	Simple           bool // 简化模式（只返回文本）
}

// Mode 拼音模式
type Mode int

const (
	ModeNormal  Mode = 0 // 普通模式
	ModeSurname Mode = 1 // 姓氏模式
)

// DefaultOptions 返回默认选项
func DefaultOptions() Options {
	return Options{
		Style:     style.StyleTone, // 默认带声调
		Heteronym: false,
		Segment:   false,
		Mode:      ModeNormal,
		Group:     false,
		Compact:   false,
		// 高级选项默认关闭
		StripPunctuation: false,
		ConvertSynonym:   false,
		StripStopword:    false,
		Simple:           false,
	}
}

// Match 词组匹配结果
type Match struct {
	Text    string     // 匹配的文本
	Pinyins [][]string // 拼音数组
	Start   int        // 起始位置(rune索引)
	Length  int        // 长度(rune数量)
}
