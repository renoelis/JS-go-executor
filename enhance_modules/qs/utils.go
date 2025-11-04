package qs

import (
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"unicode/utf8"
)

// ============================================================================
// Utils - 工具函数模块（完整手动实现，不依赖第三方库）
// 对应 Node.js qs 的 lib/utils.js
// ============================================================================

// hexTable 用于编码的十六进制表
var hexTable []string

func init() {
	hexTable = make([]string, 256)
	for i := 0; i < 256; i++ {
		hexTable[i] = fmt.Sprintf("%%%02X", i)
	}
}

// ============================================================================
// 编码/解码函数
// ============================================================================

// Encode 编码字符串（对应 utils.encode）
// 参数：
//   - str: 要编码的字符串
//   - charset: 字符集 ("utf-8" 或 "iso-8859-1")
//   - kind: 类型标识 ("key" 或 "value")
//   - format: 格式 (RFC1738 或 RFC3986)
func Encode(str string, charset string, kind string, format string) string {
	if len(str) == 0 {
		return str
	}

	// ISO-8859-1 编码
	if charset == "iso-8859-1" {
		return encodeISO88591(str)
	}

	// UTF-8 编码（默认）
	return encodeUTF8(str, format)
}

// encodeUTF8 UTF-8 编码
func encodeUTF8(str string, format string) string {
	var out strings.Builder
	out.Grow(len(str) * 3) // 预分配空间

	for _, r := range str {
		// RFC3986 和 RFC1738 允许的未编码字符
		if isUnreserved(r, format) {
			out.WriteRune(r)
			continue
		}

		// 编码字符
		if r < 0x80 {
			// 单字节字符
			out.WriteString(hexTable[r])
		} else if r < 0x800 {
			// 双字节字符
			out.WriteString(hexTable[0xC0|(r>>6)])
			out.WriteString(hexTable[0x80|(r&0x3F)])
		} else if r < 0x10000 {
			// 三字节字符
			out.WriteString(hexTable[0xE0|(r>>12)])
			out.WriteString(hexTable[0x80|((r>>6)&0x3F)])
			out.WriteString(hexTable[0x80|(r&0x3F)])
		} else {
			// 四字节字符
			out.WriteString(hexTable[0xF0|(r>>18)])
			out.WriteString(hexTable[0x80|((r>>12)&0x3F)])
			out.WriteString(hexTable[0x80|((r>>6)&0x3F)])
			out.WriteString(hexTable[0x80|(r&0x3F)])
		}
	}

	return out.String()
}

// encodeISO88591 ISO-8859-1 编码
func encodeISO88591(str string) string {
	// 使用 Go 的 escape 函数模拟
	result := ""
	for _, r := range str {
		if r < 256 {
			if isUnreservedISO(r) {
				result += string(r)
			} else {
				result += fmt.Sprintf("%%%02X", r)
			}
		} else {
			// Unicode 字符转为数字实体
			result += fmt.Sprintf("%%26%%23%d%%3B", r)
		}
	}
	return result
}

// isUnreserved 检查字符是否为未保留字符
func isUnreserved(r rune, format string) bool {
	// RFC3986 和 RFC1738 允许的字符：
	// - (0x2D), . (0x2E), _ (0x5F), ~ (0x7E)
	// 0-9 (0x30-0x39), A-Z (0x41-0x5A), a-z (0x61-0x7A)
	if r == 0x2D || r == 0x2E || r == 0x5F || r == 0x7E {
		return true
	}
	if r >= 0x30 && r <= 0x39 {
		return true
	}
	if r >= 0x41 && r <= 0x5A {
		return true
	}
	if r >= 0x61 && r <= 0x7A {
		return true
	}

	// RFC1738 额外允许的字符：( ) (0x28, 0x29)
	if format == "RFC1738" && (r == 0x28 || r == 0x29) {
		return true
	}

	return false
}

// isUnreservedISO 检查字符是否为未保留字符（ISO-8859-1）
func isUnreservedISO(r rune) bool {
	if r == 0x2D || r == 0x2E || r == 0x5F || r == 0x7E {
		return true
	}
	if r >= 0x30 && r <= 0x39 {
		return true
	}
	if r >= 0x41 && r <= 0x5A {
		return true
	}
	if r >= 0x61 && r <= 0x7A {
		return true
	}
	return false
}

// Decode 解码字符串（对应 utils.decode）
// 参数：
//   - str: 要解码的字符串
//   - charset: 字符集 ("utf-8" 或 "iso-8859-1")
func Decode(str string, charset string) string {
	// 将 + 替换为空格
	strWithoutPlus := strings.ReplaceAll(str, "+", " ")

	// ISO-8859-1 解码
	if charset == "iso-8859-1" {
		// 使用简单的 unescape
		return decodeISO88591(strWithoutPlus)
	}

	// UTF-8 解码（默认）
	decoded, err := url.QueryUnescape(strWithoutPlus)
	if err != nil {
		// 解码失败，返回原字符串
		return strWithoutPlus
	}
	return decoded
}

// decodeISO88591 ISO-8859-1 解码
func decodeISO88591(str string) string {
	// 简单的百分号解码
	re := regexp.MustCompile(`%[0-9a-fA-F]{2}`)
	return re.ReplaceAllStringFunc(str, func(match string) string {
		hex := match[1:]
		var b byte
		fmt.Sscanf(hex, "%02x", &b)
		return string(b)
	})
}

// ============================================================================
// 对象操作函数
// ============================================================================

// Merge 合并两个对象（对应 utils.merge）
// 递归合并 source 到 target
func Merge(target, source interface{}, options *ParseOptions) interface{} {
	if source == nil {
		return target
	}

	// 如果 source 不是对象或函数，处理简单合并
	sourceMap, sourceIsMap := source.(map[string]interface{})
	if !sourceIsMap {
		targetArr, targetIsArr := target.([]interface{})
		if targetIsArr {
			return append(targetArr, source)
		}

		targetMap, targetIsMap := target.(map[string]interface{})
		if targetIsMap {
			// 检查是否允许原型属性
			if options != nil && (options.PlainObjects || options.AllowPrototypes) {
				// 允许添加任意键
				targetMap[fmt.Sprint(source)] = true
			} else {
				// 不允许污染原型
				sourceStr := fmt.Sprint(source)
				if !isPrototypeKey(sourceStr) {
					targetMap[sourceStr] = true
				}
			}
			return targetMap
		}

		// 默认返回数组
		return []interface{}{target, source}
	}

	// 如果 target 不是对象，转换
	targetMap, targetIsMap := target.(map[string]interface{})
	if !targetIsMap {
		// 如果 target 是数组，转换为对象
		if targetArr, ok := target.([]interface{}); ok {
			targetMap = arrayToObject(targetArr, options)
		} else {
			return append([]interface{}{target}, source)
		}
	}

	// 处理数组合并
	targetArr, targetIsArr := target.([]interface{})
	sourceArr, sourceIsArr := source.([]interface{})
	if targetIsArr && sourceIsArr {
		// 合并数组
		result := make([]interface{}, 0, len(targetArr)+len(sourceArr))
		maxLen := len(targetArr)
		if len(sourceArr) > maxLen {
			maxLen = len(sourceArr)
		}

		for i := 0; i < maxLen; i++ {
			var mergedItem interface{}
			hasTarget := i < len(targetArr)
			hasSource := i < len(sourceArr)

			if hasTarget && hasSource {
				// 两者都有，合并
				targetItem := targetArr[i]
				sourceItem := sourceArr[i]
				if isObject(targetItem) && isObject(sourceItem) {
					mergedItem = Merge(targetItem, sourceItem, options)
				} else {
					// 简单类型，使用 source 覆盖
					mergedItem = sourceItem
				}
			} else if hasTarget {
				mergedItem = targetArr[i]
			} else {
				mergedItem = sourceArr[i]
			}

			result = append(result, mergedItem)
		}
		return result
	}

	// 合并对象键
	result := make(map[string]interface{})
	for k, v := range targetMap {
		result[k] = v
	}

	for key, value := range sourceMap {
		if existingValue, exists := result[key]; exists {
			result[key] = Merge(existingValue, value, options)
		} else {
			result[key] = value
		}
	}

	return result
}

// Combine 组合两个值（对应 utils.combine）
func Combine(a, b interface{}) []interface{} {
	result := []interface{}{}

	// 添加 a
	if aArr, ok := a.([]interface{}); ok {
		result = append(result, aArr...)
	} else {
		result = append(result, a)
	}

	// 添加 b
	if bArr, ok := b.([]interface{}); ok {
		result = append(result, bArr...)
	} else {
		result = append(result, b)
	}

	return result
}

// Compact 压缩对象，移除数组中的 undefined 值（对应 utils.compact）
func Compact(value interface{}, arrayLimit ...int) interface{} {
	limit := 20 // 默认值
	if len(arrayLimit) > 0 && arrayLimit[0] > 0 {
		limit = arrayLimit[0]
	}
	return compactValue(value, limit, true)
}

// CompactWithOptions 压缩对象，带有 parseArrays 选项
func CompactWithOptions(value interface{}, arrayLimit int, parseArrays bool) interface{} {
	return compactValue(value, arrayLimit, parseArrays)
}

// compactValue 递归压缩值
func compactValue(value interface{}, arrayLimit int, parseArrays bool) interface{} {
	switch v := value.(type) {
	case map[string]interface{}:
		// 递归处理对象的每个值
		result := make(map[string]interface{})
		for key, val := range v {
			compacted := compactValue(val, arrayLimit, parseArrays)
			if compacted != nil {
				result[key] = compacted
			}
		}
		// 尝试转换为数组（考虑 arrayLimit 和 parseArrays）
		if parseArrays {
			return convertToArray(result, arrayLimit)
		}
		return result

	case []interface{}:
		// 移除数组中的 nil 值
		result := make([]interface{}, 0, len(v))
		for _, item := range v {
			if item != nil {
				compacted := compactValue(item, arrayLimit, parseArrays)
				if compacted != nil {
					result = append(result, compacted)
				}
			}
		}
		return result

	default:
		return value
	}
}

// convertToArray 将纯数字键的对象转换为数组
// 但如果最大索引超过 arrayLimit，则保持为对象
// 注意：Node.js qs 会创建紧凑数组，只包含实际存在的元素，按索引顺序排列
func convertToArray(value interface{}, arrayLimit int) interface{} {
	objMap, ok := value.(map[string]interface{})
	if !ok {
		return value
	}

	// 检查所有键是否都是数字，并收集索引
	type indexValue struct {
		index int
		value interface{}
	}
	var indices []indexValue
	allNumeric := true
	maxIndex := -1

	for key, val := range objMap {
		index, err := strconv.Atoi(key)
		if err != nil {
			allNumeric = false
			break
		}
		indices = append(indices, indexValue{index: index, value: val})
		if index > maxIndex {
			maxIndex = index
		}
	}

	// 如果所有键都是数字，且最大索引在限制内，转换为紧凑数组
	if allNumeric && maxIndex >= 0 && maxIndex <= arrayLimit {
		// 按索引排序
		sort.Slice(indices, func(i, j int) bool {
			return indices[i].index < indices[j].index
		})

		// 创建紧凑数组（只包含实际存在的元素）
		arr := make([]interface{}, len(indices))
		for i, item := range indices {
			arr[i] = item.value
		}
		return arr
	}

	return value
}

// convertToSparseArray 将数字索引的 map 转换为稀疏数组（保留空洞）
// 用于 allowSparse: true 的情况，递归处理嵌套结构
//
// 内存保护机制：
// - arrayLimit 参数限制数组的最大索引值（maxIndex）
// - 当 maxIndex > arrayLimit 时，返回对象而不是数组
// - 这样可以防止恶意输入（如 a[999999]=x）创建超大数组导致 OOM
// - 默认 arrayLimit = 20，这是 Node.js qs v6.14.0 的标准行为
func convertToSparseArray(value interface{}, arrayLimit int) interface{} {
	objMap, ok := value.(map[string]interface{})
	if !ok {
		return value
	}

	// 检查所有键是否都是数字，并收集索引
	indices := make(map[int]interface{}) // 使用 map 存储索引和值
	allNumeric := true
	maxIndex := -1

	for key, val := range objMap {
		index, err := strconv.Atoi(key)
		if err != nil {
			allNumeric = false
			break
		}
		// 递归处理嵌套的值
		indices[index] = convertToSparseArray(val, arrayLimit)
		if index > maxIndex {
			maxIndex = index
		}
	}

	// 如果所有键都是数字，且最大索引在限制内，转换为稀疏数组
	// 内存保护：maxIndex <= arrayLimit 防止创建过大的数组
	// 例如：a[0]=x&a[999999]=y 在默认 arrayLimit=20 时会转为对象而不是长度 1000000 的数组
	if allNumeric && maxIndex >= 0 && maxIndex <= arrayLimit {
		// 创建稀疏数组（保留空洞，用 nil 表示 undefined）
		arr := make([]interface{}, maxIndex+1)
		// 初始化所有位置为 nil（表示 undefined）
		for i := range arr {
			arr[i] = nil
		}
		// 填充实际存在的值
		for index, val := range indices {
			arr[index] = val
		}
		return arr
	}

	// 不是数组，但仍需递归处理嵌套的值
	result := make(map[string]interface{})
	for key, val := range objMap {
		result[key] = convertToSparseArray(val, arrayLimit)
	}
	return result
}

// arrayToObject 将数组转换为对象（对应 utils.arrayToObject）
func arrayToObject(source []interface{}, options *ParseOptions) map[string]interface{} {
	obj := make(map[string]interface{})
	for i, item := range source {
		if item != nil {
			obj[strconv.Itoa(i)] = item
		}
	}
	return obj
}

// ============================================================================
// 辅助函数
// ============================================================================

// isObject 检查是否为对象
func isObject(v interface{}) bool {
	if v == nil {
		return false
	}
	switch v.(type) {
	case map[string]interface{}, []interface{}:
		return true
	default:
		return false
	}
}

// contains 检查切片是否包含元素
func contains(slice []interface{}, item interface{}) bool {
	for _, elem := range slice {
		if elem == item {
			return true
		}
	}
	return false
}

// isPrototypeKey 检查是否为原型污染键
func isPrototypeKey(key string) bool {
	return key == "__proto__" || key == "constructor" || key == "prototype"
}

// MaybeMap 如果值是数组，则映射；否则直接应用函数（对应 utils.maybeMap）
func MaybeMap(val interface{}, fn func(interface{}) interface{}) interface{} {
	if arr, ok := val.([]interface{}); ok {
		mapped := make([]interface{}, len(arr))
		for i, item := range arr {
			mapped[i] = fn(item)
		}
		return mapped
	}
	return fn(val)
}

// IsRegExp 检查是否为正则表达式（Go 中暂不支持，返回 false）
func IsRegExp(obj interface{}) bool {
	// Go 中没有直接对应的正则表达式对象
	// 这里返回 false，由调用方处理
	return false
}

// IsBuffer 检查是否为 Buffer（对应 utils.isBuffer）
func IsBuffer(obj interface{}) bool {
	// 检查是否为字节切片
	_, ok := obj.([]byte)
	return ok
}

// ============================================================================
// 字符串处理
// ============================================================================

// InterpretNumericEntities 解释数字实体（对应 parse.js 中的 interpretNumericEntities）
func InterpretNumericEntities(str string) string {
	// 将 &#数字; 转换为对应的字符
	re := regexp.MustCompile(`&#(\d+);`)
	return re.ReplaceAllStringFunc(str, func(match string) string {
		re2 := regexp.MustCompile(`\d+`)
		numberStr := re2.FindString(match)
		if numberStr == "" {
			return match
		}
		code, err := strconv.Atoi(numberStr)
		if err != nil {
			return match
		}
		return string(rune(code))
	})
}

// ============================================================================
// 键排序和顺序保持
// ============================================================================

// GetKeys 获取对象的键（保持插入顺序）
func GetKeys(obj map[string]interface{}) []string {
	keys := make([]string, 0, len(obj))
	for k := range obj {
		keys = append(keys, k)
	}
	return keys
}

// SortKeys 对键进行排序
func SortKeys(keys []string, sortFn func(a, b string) bool) []string {
	if sortFn == nil {
		return keys
	}

	// 使用冒泡排序（保持稳定性）
	result := make([]string, len(keys))
	copy(result, keys)

	for i := 0; i < len(result); i++ {
		for j := i + 1; j < len(result); j++ {
			if sortFn(result[j], result[i]) {
				result[i], result[j] = result[j], result[i]
			}
		}
	}

	return result
}

// ============================================================================
// URL 编码/解码辅助
// ============================================================================

// ReplacePercentEncodedBrackets 替换百分号编码的方括号
// %5B => [, %5D => ]
func ReplacePercentEncodedBrackets(str string) string {
	str = strings.ReplaceAll(str, "%5B", "[")
	str = strings.ReplaceAll(str, "%5b", "[")
	str = strings.ReplaceAll(str, "%5D", "]")
	str = strings.ReplaceAll(str, "%5d", "]")
	return str
}

// EncodeKey 编码键
func EncodeKey(key string, charset string, format string) string {
	return Encode(key, charset, "key", format)
}

// EncodeValue 编码值
func EncodeValue(value string, charset string, format string) string {
	return Encode(value, charset, "value", format)
}

// DecodeKey 解码键
func DecodeKey(key string, charset string) string {
	return Decode(key, charset)
}

// DecodeValue 解码值
func DecodeValue(value string, charset string) string {
	return Decode(value, charset)
}

// ============================================================================
// 类型转换
// ============================================================================

// ToString 将值转换为字符串
func ToString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case int:
		return strconv.Itoa(val)
	case int64:
		return strconv.FormatInt(val, 10)
	case float64:
		return strconv.FormatFloat(val, 'f', -1, 64)
	case bool:
		return strconv.FormatBool(val)
	default:
		return fmt.Sprint(v)
	}
}

// ToInt 将值转换为整数
func ToInt(v interface{}) (int, bool) {
	switch val := v.(type) {
	case int:
		return val, true
	case int64:
		return int(val), true
	case float64:
		return int(val), true
	case string:
		i, err := strconv.Atoi(val)
		return i, err == nil
	default:
		return 0, false
	}
}

// IsNumericString 检查字符串是否为数字
func IsNumericString(s string) bool {
	_, err := strconv.Atoi(s)
	return err == nil
}

// ============================================================================
// UTF-8 处理
// ============================================================================

// StringLength 获取字符串的 UTF-8 字符数
func StringLength(s string) int {
	return utf8.RuneCountInString(s)
}

// SubString 获取 UTF-8 字符串的子串
func SubString(s string, start, end int) string {
	runes := []rune(s)
	if start < 0 {
		start = 0
	}
	if end > len(runes) {
		end = len(runes)
	}
	if start >= end {
		return ""
	}
	return string(runes[start:end])
}
