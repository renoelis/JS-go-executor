package style

import "strings"

// ToInitials 提取声母
// 输入: zhōng  输出: zh
// 输入: ān     输出: (空字符串,因为没有声母)
func ToInitials(pinyin string) string {
	if pinyin == "" {
		return ""
	}

	// 先去除声调
	basePinyin := ToNormal(pinyin)

	// 按长度从长到短匹配声母 (zh, ch, sh 需要优先匹配)
	for _, initial := range []string{"zh", "ch", "sh"} {
		if strings.HasPrefix(basePinyin, initial) {
			return initial
		}
	}

	// 单字母声母
	for _, initial := range Initials {
		if len(initial) == 1 && strings.HasPrefix(basePinyin, initial) {
			return initial
		}
	}

	// 没有声母返回空字符串
	return ""
}
