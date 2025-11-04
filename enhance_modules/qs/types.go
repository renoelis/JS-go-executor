package qs

import (
	"regexp"
	"strings"

	"github.com/dop251/goja"
)

// ============================================================================
// Types - 类型定义（完整手动实现，不依赖第三方库）
// 对应 Node.js qs 的选项类型
// ============================================================================

// ============================================================================
// Parse 选项
// ============================================================================

// ParseOptions Parse 函数的选项
type ParseOptions struct {
	// 分隔符，默认 "&"
	// 可以是字符串或正则表达式
	Delimiter        string
	DelimiterPattern *regexp.Regexp // 如果 delimiter 是正则表达式

	// 最大嵌套深度，默认 5
	// 可以是数字或 false（false 表示禁用深度解析）
	Depth int

	// 数组元素最大数量，默认 20
	ArrayLimit int

	// 是否允许点号表示法（a.b.c），默认 false
	AllowDots bool

	// 是否允许在 Object.prototype 上设置属性，默认 false
	AllowPrototypes bool

	// 是否允许稀疏数组，默认 false
	AllowSparse bool

	// 是否允许空数组，默认 false
	AllowEmptyArrays bool

	// 字符集，默认 "utf-8"
	// 可选值："utf-8", "iso-8859-1"
	Charset string

	// 是否包含字符集标识，默认 false
	CharsetSentinel bool

	// 是否支持逗号分隔的数组，默认 false
	// 例如：a=1,2,3 => {a: ["1", "2", "3"]}
	Comma bool

	// 是否在点号键中解码点，默认 false
	DecodeDotInKeys bool

	// 重复键的处理方式，默认 "combine"
	// 可选值："combine", "first", "last"
	// - combine: 合并为数组
	// - first: 保留第一个值
	// - last: 保留最后一个值
	Duplicates string

	// 是否忽略查询字符串前缀 "?"，默认 false
	IgnoreQueryPrefix bool

	// 是否解释数字实体（&#数字;），默认 false
	// 仅在 charset="iso-8859-1" 时有效
	InterpretNumericEntities bool

	// 参数数量限制，默认 1000
	ParameterLimit int

	// 是否解析数组，默认 true
	ParseArrays bool

	// 是否使用纯对象（无原型），默认 false
	PlainObjects bool

	// 是否严格执行深度限制，默认 false
	// 如果为 true，超过 depth 时抛出错误
	StrictDepth bool

	// 是否严格处理 null，默认 false
	// 如果为 true，没有值的键解析为 null 而不是空字符串
	StrictNullHandling bool

	// 超过限制是否抛出异常，默认 false
	ThrowOnLimitExceeded bool

	// 自定义解码器函数
	// function(str, defaultDecoder, charset, type)
	Decoder DecoderFunc
}

// DecoderFunc 解码器函数类型
type DecoderFunc func(str string, defaultDecoder func(string) string, charset string, typ string) (string, error)

// DefaultParseOptions 默认 Parse 选项
func DefaultParseOptions() *ParseOptions {
	return &ParseOptions{
		Delimiter:                "&",
		Depth:                    5,
		ArrayLimit:               20,
		AllowDots:                false,
		AllowPrototypes:          false,
		AllowSparse:              false,
		AllowEmptyArrays:         false,
		Charset:                  "utf-8",
		CharsetSentinel:          false,
		Comma:                    false,
		DecodeDotInKeys:          false,
		Duplicates:               "combine",
		IgnoreQueryPrefix:        false,
		InterpretNumericEntities: false,
		ParameterLimit:           1000,
		ParseArrays:              true,
		PlainObjects:             false,
		StrictDepth:              false,
		StrictNullHandling:       false,
		ThrowOnLimitExceeded:     false,
		Decoder:                  nil,
	}
}

// ============================================================================
// Stringify 选项
// ============================================================================

// StringifyOptions Stringify 函数的选项
type StringifyOptions struct {
	// 是否添加查询前缀 "?"，默认 false
	AddQueryPrefix bool

	// 是否允许点号表示法，默认 false
	AllowDots bool

	// 是否允许空数组，默认 false
	AllowEmptyArrays bool

	// 是否允许稀疏数组，默认 false
	// 如果为 true，序列化时会跳过数组中不存在的索引（undefined）
	// 例如：{ a: [, , 'x'] } => "a[2]=x" 而不是 "a[0]=&a[1]=&a[2]=x"
	AllowSparse bool

	// 数组格式，默认 "indices"
	// 可选值："indices", "brackets", "repeat", "comma"
	// - indices: a[0]=1&a[1]=2
	// - brackets: a[]=1&a[]=2
	// - repeat: a=1&a=2
	// - comma: a=1,2
	ArrayFormat string

	// 字符集，默认 "utf-8"
	Charset string

	// 是否包含字符集标识，默认 false
	CharsetSentinel bool

	// 逗号往返兼容，默认 false
	// 如果为 true，单元素数组会编码为 a[]=value 而不是 a=value
	CommaRoundTrip bool

	// 分隔符，默认 "&"
	Delimiter string

	// 是否编码，默认 true
	Encode bool

	// 是否在点号键中编码点，默认 false
	EncodeDotInKeys bool

	// 是否只编码值，默认 false
	// 如果为 true，键不会被编码
	EncodeValuesOnly bool

	// 格式，默认 "RFC3986"
	// 可选值："RFC1738", "RFC3986"
	// - RFC1738: 空格编码为 +
	// - RFC3986: 空格编码为 %20
	Format string

	// 是否使用索引（已废弃，使用 ArrayFormat），默认 false
	Indices bool

	// 是否跳过 null 值，默认 false
	SkipNulls bool

	// 是否严格处理 null，默认 false
	// 如果为 true，null 值不会有等号（key 而不是 key=）
	StrictNullHandling bool

	// 自定义编码器函数
	// function(str, defaultEncoder, charset, type, format)
	Encoder EncoderFunc

	// 过滤器（数组或函数）
	// 数组：允许的键列表
	// 函数：function(prefix, value)
	Filter interface{}

	// 排序函数
	// function(a, b) 返回负数表示 a < b
	Sort SortFunc

	// 日期序列化函数
	// function(date) 返回字符串
	SerializeDate SerializeDateFunc
}

// EncoderFunc 编码器函数类型
type EncoderFunc func(str string, defaultEncoder func(string) string, charset string, typ string, format string) string

// SortFunc 排序函数类型
type SortFunc func(a, b string) bool

// SerializeDateFunc 日期序列化函数类型
type SerializeDateFunc func(date interface{}) string

// DefaultStringifyOptions 默认 Stringify 选项
func DefaultStringifyOptions() *StringifyOptions {
	return &StringifyOptions{
		AddQueryPrefix:     false,
		AllowDots:          false,
		AllowEmptyArrays:   false,
		AllowSparse:        false,
		ArrayFormat:        "indices",
		Charset:            "utf-8",
		CharsetSentinel:    false,
		CommaRoundTrip:     false,
		Delimiter:          "&",
		Encode:             true,
		EncodeDotInKeys:    false,
		EncodeValuesOnly:   false,
		Format:             string(DefaultFormat),
		Indices:            false,
		SkipNulls:          false,
		StrictNullHandling: false,
		Encoder:            nil,
		Filter:             nil,
		Sort:               nil,
		SerializeDate:      nil,
	}
}

// ============================================================================
// 工具函数 - goja.Value 转换
// ============================================================================

// getStringValue 从 goja.Object 中获取字符串值
func getStringValue(obj *goja.Object, key string, defaultValue string) string {
	if obj == nil {
		return defaultValue
	}
	v := obj.Get(key)
	if v == nil || goja.IsUndefined(v) || goja.IsNull(v) {
		return defaultValue
	}
	return v.String()
}

// getValue 从 goja.Object 中获取原始 goja.Value
func getValue(obj *goja.Object, key string) goja.Value {
	if obj == nil {
		return goja.Undefined()
	}
	v := obj.Get(key)
	if v == nil {
		return goja.Undefined()
	}
	return v
}

// isFunction 检查 goja.Value 是否为函数
func isFunction(v goja.Value) bool {
	if v == nil || goja.IsUndefined(v) || goja.IsNull(v) {
		return false
	}
	_, ok := goja.AssertFunction(v)
	return ok
}

// makeError 创建错误对象
func makeError(runtime *goja.Runtime, format string, args ...interface{}) *goja.Object {
	var message string
	if len(args) > 0 {
		message = formatString(format, args...)
	} else {
		message = format
	}
	return runtime.NewGoError(createError(message))
}

// formatString 格式化字符串
func formatString(format string, args ...interface{}) string {
	// 简单的格式化实现
	result := format
	for _, arg := range args {
		result = strings.Replace(result, "%v", ToString(arg), 1)
	}
	return result
}

// createError 创建错误
func createError(message string) error {
	return &QSError{Message: message}
}

// QSError QS 错误类型
type QSError struct {
	Message string
}

func (e *QSError) Error() string {
	return e.Message
}

// ============================================================================
// 内部辅助类型
// ============================================================================

// ParseContext Parse 解析上下文
type ParseContext struct {
	Options *ParseOptions
	Charset string
	Decoder DecoderFunc
}

// StringifyContext Stringify 序列化上下文
type StringifyContext struct {
	Options *StringifyOptions
	Format  Format
	Encoder EncoderFunc
	Sort    SortFunc
}
