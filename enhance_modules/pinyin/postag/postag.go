package postag

// POSTag 词性标注类型（使用位标志，与 JS 版本完全兼容）
type POSTag uint32

// 23 种词性定义（与 JavaScript pinyin.js 完全一致）
const (
	// 实词类
	D_A  POSTag = 0x40000000 // 形容词 (Adjective)
	D_B  POSTag = 0x20000000 // 区别词
	D_C  POSTag = 0x10000000 // 连词 (Conjunction)
	D_D  POSTag = 0x08000000 // 副词 (Adverb)
	D_E  POSTag = 0x04000000 // 叹词 (Exclamation)
	D_F  POSTag = 0x02000000 // 方位词
	D_I  POSTag = 0x01000000 // 成语
	D_L  POSTag = 0x00800000 // 习语
	A_M  POSTag = 0x00400000 // 数词 (Numeral)
	D_MQ POSTag = 0x00200000 // 数量词
	D_N  POSTag = 0x00100000 // 名词 (Noun)
	D_O  POSTag = 0x00080000 // 拟声词 (Onomatopoeia)
	D_P  POSTag = 0x00040000 // 介词 (Preposition)
	A_Q  POSTag = 0x00020000 // 量词 (Quantifier)
	D_R  POSTag = 0x00010000 // 代词 (Pronoun)
	D_S  POSTag = 0x00008000 // 处所词
	D_T  POSTag = 0x00004000 // 时间词
	D_U  POSTag = 0x00002000 // 助词 (Auxiliary)
	D_V  POSTag = 0x00001000 // 动词 (Verb)
	D_W  POSTag = 0x00000800 // 标点符号 (Punctuation)
	D_X  POSTag = 0x00000400 // 非语素字
	D_Y  POSTag = 0x00000200 // 语气词
	D_Z  POSTag = 0x00000100 // 状态词

	// 专有名词类
	A_NR POSTag = 0x00000080 // 人名 (Person Name)
	A_NS POSTag = 0x00000040 // 地名 (Place Name)
	A_NT POSTag = 0x00000020 // 机构团体名
	A_NX POSTag = 0x00000010 // 外文字符
	A_NZ POSTag = 0x00000008 // 其他专名

	// 特殊类型
	URL   POSTag = 0x00000004 // URL 地址
	EMAIL POSTag = 0x00000002 // 邮箱地址
)

// TagName 返回词性的中文名称
func (t POSTag) TagName() string {
	switch t {
	case D_A:
		return "形容词"
	case D_B:
		return "区别词"
	case D_C:
		return "连词"
	case D_D:
		return "副词"
	case D_E:
		return "叹词"
	case D_F:
		return "方位词"
	case D_I:
		return "成语"
	case D_L:
		return "习语"
	case A_M:
		return "数词"
	case D_MQ:
		return "数量词"
	case D_N:
		return "名词"
	case D_O:
		return "拟声词"
	case D_P:
		return "介词"
	case A_Q:
		return "量词"
	case D_R:
		return "代词"
	case D_S:
		return "处所词"
	case D_T:
		return "时间词"
	case D_U:
		return "助词"
	case D_V:
		return "动词"
	case D_W:
		return "标点符号"
	case D_X:
		return "非语素字"
	case D_Y:
		return "语气词"
	case D_Z:
		return "状态词"
	case A_NR:
		return "人名"
	case A_NS:
		return "地名"
	case A_NT:
		return "机构名"
	case A_NX:
		return "外文"
	case A_NZ:
		return "专名"
	case URL:
		return "URL"
	case EMAIL:
		return "邮箱"
	default:
		return "未知"
	}
}

// TagCode 返回词性的英文代码
func (t POSTag) TagCode() string {
	switch t {
	case D_A:
		return "D_A"
	case D_B:
		return "D_B"
	case D_C:
		return "D_C"
	case D_D:
		return "D_D"
	case D_E:
		return "D_E"
	case D_F:
		return "D_F"
	case D_I:
		return "D_I"
	case D_L:
		return "D_L"
	case A_M:
		return "A_M"
	case D_MQ:
		return "D_MQ"
	case D_N:
		return "D_N"
	case D_O:
		return "D_O"
	case D_P:
		return "D_P"
	case A_Q:
		return "A_Q"
	case D_R:
		return "D_R"
	case D_S:
		return "D_S"
	case D_T:
		return "D_T"
	case D_U:
		return "D_U"
	case D_V:
		return "D_V"
	case D_W:
		return "D_W"
	case D_X:
		return "D_X"
	case D_Y:
		return "D_Y"
	case D_Z:
		return "D_Z"
	case A_NR:
		return "A_NR"
	case A_NS:
		return "A_NS"
	case A_NT:
		return "A_NT"
	case A_NX:
		return "A_NX"
	case A_NZ:
		return "A_NZ"
	case URL:
		return "URL"
	case EMAIL:
		return "EMAIL"
	default:
		return "UNKNOWN"
	}
}

// HasTag 检查是否包含指定词性（支持多词性组合）
func (t POSTag) HasTag(tag POSTag) bool {
	return (t & tag) > 0
}

// IsNominal 判断是否为名词性（名词、人名、地名、机构名等）
func (t POSTag) IsNominal() bool {
	return t.HasTag(D_N) || t.HasTag(A_NT) || t.HasTag(A_NX) ||
		t.HasTag(A_NZ) || t.HasTag(A_NR) || t.HasTag(A_NS)
}

// IsVerbal 判断是否为动词性
func (t POSTag) IsVerbal() bool {
	return t.HasTag(D_V)
}

// IsAdjective 判断是否为形容词性
func (t POSTag) IsAdjective() bool {
	return t.HasTag(D_A)
}

// IsNumeral 判断是否为数词
func (t POSTag) IsNumeral() bool {
	return t.HasTag(A_M) || t.HasTag(D_MQ)
}

// IsPunctuation 判断是否为标点符号
func (t POSTag) IsPunctuation() bool {
	return t.HasTag(D_W)
}
