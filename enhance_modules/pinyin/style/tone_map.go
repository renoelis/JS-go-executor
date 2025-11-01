package style

// ToneInfo 声调信息
type ToneInfo struct {
	Base rune // 基础字母 (a, e, i, o, u, v, n, m)
	Tone int  // 声调 (1-4, 0表示轻声)
}

// ToneMap 声调字符映射表
// Key: 带声调的字符
// Value: 基础字符和声调信息
var ToneMap = map[rune]ToneInfo{
	// a 系列
	'ā': {Base: 'a', Tone: 1},
	'á': {Base: 'a', Tone: 2},
	'ǎ': {Base: 'a', Tone: 3},
	'à': {Base: 'a', Tone: 4},

	// e 系列
	'ē': {Base: 'e', Tone: 1},
	'é': {Base: 'e', Tone: 2},
	'ě': {Base: 'e', Tone: 3},
	'è': {Base: 'e', Tone: 4},

	// i 系列
	'ī': {Base: 'i', Tone: 1},
	'í': {Base: 'i', Tone: 2},
	'ǐ': {Base: 'i', Tone: 3},
	'ì': {Base: 'i', Tone: 4},

	// o 系列
	'ō': {Base: 'o', Tone: 1},
	'ó': {Base: 'o', Tone: 2},
	'ǒ': {Base: 'o', Tone: 3},
	'ò': {Base: 'o', Tone: 4},

	// u 系列
	'ū': {Base: 'u', Tone: 1},
	'ú': {Base: 'u', Tone: 2},
	'ǔ': {Base: 'u', Tone: 3},
	'ù': {Base: 'u', Tone: 4},

	// ü 系列 (使用 v 作为基础)
	'ǖ': {Base: 'v', Tone: 1},
	'ǘ': {Base: 'v', Tone: 2},
	'ǚ': {Base: 'v', Tone: 3},
	'ǜ': {Base: 'v', Tone: 4},
	'ü': {Base: 'v', Tone: 0}, // 轻声或无声调

	// n 系列 (较少用)
	'ń': {Base: 'n', Tone: 2},
	'ň': {Base: 'n', Tone: 3},
	// m 系列暂不支持 (ḿ 很少使用)
}

// ReverseToneMap 反向映射: 基础字母+声调 -> 带声调字符
// 用于从无声调拼音添加声调
var ReverseToneMap = map[rune]map[int]rune{
	'a': {1: 'ā', 2: 'á', 3: 'ǎ', 4: 'à'},
	'e': {1: 'ē', 2: 'é', 3: 'ě', 4: 'è'},
	'i': {1: 'ī', 2: 'í', 3: 'ǐ', 4: 'ì'},
	'o': {1: 'ō', 2: 'ó', 3: 'ǒ', 4: 'ò'},
	'u': {1: 'ū', 2: 'ú', 3: 'ǔ', 4: 'ù'},
	'v': {1: 'ǖ', 2: 'ǘ', 3: 'ǚ', 4: 'ǜ', 0: 'ü'},
	'ü': {1: 'ǖ', 2: 'ǘ', 3: 'ǚ', 4: 'ǜ', 0: 'ü'}, // 兼容 ü
	'n': {2: 'ń', 3: 'ň'},
	// m 系列很少使用,暂不支持
}

// HasTone 检查字符是否带声调
func HasTone(r rune) bool {
	_, exists := ToneMap[r]
	return exists
}

// GetToneInfo 获取声调信息
func GetToneInfo(r rune) (ToneInfo, bool) {
	info, exists := ToneMap[r]
	return info, exists
}

// RemoveTone 去除单个字符的声调
func RemoveTone(r rune) rune {
	if info, exists := ToneMap[r]; exists {
		return info.Base
	}
	return r
}

// AddTone 给基础字符添加声调
func AddTone(base rune, tone int) rune {
	if toneMap, exists := ReverseToneMap[base]; exists {
		if toneChar, ok := toneMap[tone]; ok {
			return toneChar
		}
	}
	return base
}

// 声母列表
var Initials = []string{
	"b", "p", "m", "f",
	"d", "t", "n", "l",
	"g", "k", "h",
	"j", "q", "x",
	"zh", "ch", "sh", "r",
	"z", "c", "s",
}

// 声调优先级规则 (用于确定声调标注在哪个元音上)
// 规则: a > o > e > i > u > ü
var TonePriority = map[rune]int{
	'a': 6,
	'o': 5,
	'e': 4,
	'i': 3,
	'u': 2,
	'ü': 1,
	'v': 1,
}

// FindTonePosition 找到声调应该标注的位置
// 返回: 位置索引, 找到的元音字符
func FindTonePosition(pinyin string) (int, rune) {
	runes := []rune(pinyin)
	maxPriority := -1
	pos := -1
	vowel := rune(0)

	for i, r := range runes {
		if priority, exists := TonePriority[r]; exists {
			if priority > maxPriority {
				maxPriority = priority
				pos = i
				vowel = r
			}
		}
		// 检查带声调的元音
		if info, exists := ToneMap[r]; exists {
			if priority, ok := TonePriority[info.Base]; ok {
				if priority > maxPriority {
					maxPriority = priority
					pos = i
					vowel = r
				}
			}
		}
	}

	return pos, vowel
}

// ExtractTone 提取拼音的声调和位置
// 返回: 无声调拼音, 声调数字, 声调位置
func ExtractTone(pinyin string) (string, int, int) {
	if pinyin == "" {
		return "", 0, -1
	}

	runes := []rune(pinyin)
	result := make([]rune, 0, len(runes))
	tone := 0
	tonePos := -1

	for i, r := range runes {
		if info, exists := ToneMap[r]; exists {
			result = append(result, info.Base)
			tone = info.Tone
			tonePos = i
		} else {
			result = append(result, r)
		}
	}

	return string(result), tone, tonePos
}
