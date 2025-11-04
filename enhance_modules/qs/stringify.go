package qs

import (
	"fmt"
	"reflect"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/dop251/goja"
)

// skipValue 是一个特殊的标记类型，表示 filter 返回 undefined，应跳过该键
type skipValue struct{}

var skipMarker = &skipValue{}

// ============================================================================
// Stringify - 对象序列化为查询字符串（完整手动实现，不依赖第三方库）
// 对应 Node.js qs 的 lib/stringify.js
// ============================================================================

// Stringify 将 JavaScript 对象序列化为查询字符串
// 对应 Node.js: qs.stringify(obj, [options])
func Stringify(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 1. 获取要序列化的对象
	if len(call.Arguments) < 1 {
		return runtime.ToValue("")
	}

	arg := call.Argument(0)

	// 边界处理
	if goja.IsUndefined(arg) || goja.IsNull(arg) {
		return runtime.ToValue("")
	}

	// 2. 提取选项
	opts := DefaultStringifyOptions()
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Argument(1)) && !goja.IsNull(call.Argument(1)) {
		opts = extractStringifyOptionsFromJS(call.Argument(1), runtime)
	}

	// 3. 导出为 Go 值，同时提取键的顺序
	objValue := arg.ToObject(runtime)
	if objValue == nil {
		return runtime.ToValue("")
	}

	// 提取键的顺序
	keyOrder := extractObjectKeys(objValue, runtime)

	// 导出为 Go 值
	obj := arg.Export()

	// 类型检查
	if obj == nil || !isStringifiableObject(obj) {
		return runtime.ToValue("")
	}

	// 4. 应用 filter（如果是函数）
	if opts.Filter != nil {
		if filterFunc, ok := opts.Filter.(func(string, interface{}) interface{}); ok {
			obj = filterFunc("", obj)
			if obj == nil {
				return runtime.ToValue("")
			}
		}
	}

	// 5. 执行序列化（传递键顺序和原始 Goja 对象）
	result, err := stringifyObjectWithOrder(obj, keyOrder, opts, runtime, objValue)
	if err != nil {
		panic(makeError(runtime, "qs.stringify() failed: %v", err))
	}

	// 6. 添加查询前缀
	if opts.AddQueryPrefix && result != "" {
		result = "?" + result
	}

	// 7. 添加字符集标识
	if opts.CharsetSentinel {
		prefix := ""
		if opts.Charset == "iso-8859-1" {
			prefix = "utf8=%26%2310003%3B&"
		} else {
			prefix = "utf8=%E2%9C%93&"
		}
		result = prefix + result
	}

	return runtime.ToValue(result)
}

// extractObjectKeys 从 JavaScript 对象提取键的顺序 - 纯 Go 实现
func extractObjectKeys(obj *goja.Object, runtime *goja.Runtime) []string {
	if obj == nil {
		return nil
	}

	// 使用 goja 原生 API 获取对象的所有键
	// goja 的 Keys() 默认返回可枚举的自有属性（类似 Object.keys 的行为）
	return obj.Keys()
}

// stringifyObjectWithOrder 序列化对象（保持键顺序）
func stringifyObjectWithOrder(obj interface{}, keyOrder []string, opts *StringifyOptions, runtime *goja.Runtime, gojaObj *goja.Object) (string, error) {
	// 检查是否为数组
	if arr, ok := obj.([]interface{}); ok {
		// 数组：将索引作为键进行序列化
		objMap := make(map[string]interface{})
		arrKeys := []string{}

		// 如果 allowSparse 且有 gojaObj，检查哪些索引真正存在
		if opts.AllowSparse && gojaObj != nil {
			// 使用 goja 原生 API 检查索引是否真正存在
			// 直接遍历对象的数字键，而不是遍历 arr
			// 优化：缓存 Keys() 结果，避免多次调用
			keys := gojaObj.Keys()
			for _, k := range keys {
				// 检查是否是数字键
				if idx, err := strconv.Atoi(k); err == nil && idx >= 0 && idx < len(arr) {
					objMap[k] = arr[idx]
					arrKeys = append(arrKeys, k)
				}
			}
		} else {
			// 普通模式或没有 gojaObj，序列化所有元素
			arrKeys = make([]string, len(arr))
			for i, item := range arr {
				key := strconv.Itoa(i)
				objMap[key] = item
				arrKeys[i] = key
			}
		}

		// 使用数组索引作为 keyOrder
		obj = objMap
		keyOrder = arrKeys
	}

	// 转换为 map
	objMap, ok := obj.(map[string]interface{})
	if !ok {
		return "", nil
	}

	// 使用提供的键顺序，但过滤掉值为 undefined 的键
	objKeys := keyOrder
	if objKeys == nil {
		objKeys = getObjectKeys(objMap, opts)
	} else if gojaObj != nil {
		// 过滤掉值为 undefined 的键
		filteredKeys := make([]string, 0, len(objKeys))
		for _, key := range objKeys {
			val := gojaObj.Get(key)
			// 跳过 undefined 值
			if !goja.IsUndefined(val) {
				filteredKeys = append(filteredKeys, key)
			}
		}
		objKeys = filteredKeys
	}

	// 如果用户提供了 sort 函数，应用排序
	if opts.Sort != nil {
		sort.SliceStable(objKeys, func(i, j int) bool {
			return opts.Sort(objKeys[i], objKeys[j])
		})
	}

	// 序列化每个键值对
	keys := []string{}
	sideChannel := newSideChannel()

	for _, key := range objKeys {
		value, exists := objMap[key]
		if !exists {
			continue
		}

		// 从 Goja 对象检测 undefined（如果可用）
		var propGojaVal goja.Value
		if gojaObj != nil {
			propGojaVal = gojaObj.Get(key)
			if goja.IsUndefined(propGojaVal) {
				continue
			}
		}

		// 跳过 null 值（如果 skipNulls 启用）
		if opts.SkipNulls && value == nil {
			continue
		}

		// 应用 filter（如果是数组）
		if filterArray, ok := opts.Filter.([]string); ok {
			found := false
			for _, allowedKey := range filterArray {
				if key == allowedKey {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}

		// 序列化值（传递 Goja 对象用于嵌套的 undefined 检测）
		var serialized []string
		if !goja.IsUndefined(propGojaVal) && !goja.IsNull(propGojaVal) {
			serialized = stringifyValue(
				value,
				key,
				generateArrayPrefix(opts.ArrayFormat),
				opts,
				sideChannel,
				runtime,
				propGojaVal,
			)
		} else {
			serialized = stringifyValue(
				value,
				key,
				generateArrayPrefix(opts.ArrayFormat),
				opts,
				sideChannel,
				runtime,
			)
		}

		keys = append(keys, serialized...)
	}

	// 使用分隔符连接
	delimiter := opts.Delimiter
	if delimiter == "" {
		delimiter = "&"
	}

	return strings.Join(keys, delimiter), nil
}

// stringifyValue 序列化单个值
func stringifyValue(
	object interface{},
	prefix string,
	generateArrayPrefix arrayPrefixGenerator,
	opts *StringifyOptions,
	sideChannel *sideChannel,
	runtime *goja.Runtime,
	gojaValue ...goja.Value,
) []string {
	obj := object

	// 检查是否为 undefined
	if len(gojaValue) > 0 && goja.IsUndefined(gojaValue[0]) {
		// undefined 应该被跳过，不输出任何内容
		return []string{}
	}

	// 应用 filter 函数
	if filterFunc, ok := opts.Filter.(func(string, interface{}) interface{}); ok {
		obj = filterFunc(prefix, obj)
		// 如果 filter 返回 skipMarker，跳过此键
		if _, isSkip := obj.(*skipValue); isSkip {
			return []string{}
		}
	}

	// 处理 Date 对象
	// 优先检查 JavaScript Date 对象（如果有 gojaValue）
	isDateProcessed := false
	if len(gojaValue) > 0 && !goja.IsNull(gojaValue[0]) {
		// 确保不是 null 或 undefined 才调用 ToObject
		if gojaObj := gojaValue[0].ToObject(runtime); gojaObj != nil {
			if className := gojaObj.ClassName(); className == "Date" {
				// 这是一个 Date 对象
				isDateProcessed = true
				if opts.SerializeDate != nil {
					// 调用自定义的 serializeDate，传递原始的 JavaScript Date 对象
					serialized := opts.SerializeDate(gojaValue[0])
					obj = serialized
				} else {
					// 默认格式化（调用 toISOString）
					if isoFunc := gojaObj.Get("toISOString"); isFunction(isoFunc) {
						if isoFn, ok := goja.AssertFunction(isoFunc); ok {
							if result, err := isoFn(gojaObj); err == nil {
								obj = result.String()
							}
						}
					}
				}
			}
		}
	}

	// 如果没有处理为 JavaScript Date，检查 Go time.Time 类型
	if !isDateProcessed {
		if dateVal, ok := obj.(time.Time); ok {
			if opts.SerializeDate != nil {
				obj = opts.SerializeDate(dateVal)
			} else {
				obj = dateVal.Format(time.RFC3339)
			}
		}
	}

	// 处理 null
	if obj == nil {
		if opts.StrictNullHandling {
			// 严格模式：key（不带等号）
			if opts.Encode {
				encoded := encodeKey(prefix, opts)
				return []string{formatted(encoded, opts)}
			}
			return []string{formatted(prefix, opts)}
		}
		obj = ""
	}

	// 处理基本类型
	if isPrimitive(obj) {
		if opts.Encode {
			keyValue := prefix
			if !opts.EncodeValuesOnly {
				keyValue = encodeKey(prefix, opts)
			}
			return []string{formatted(keyValue) + "=" + formatted(encodeValue(ToString(obj), opts))}
		}
		return []string{formatted(prefix) + "=" + formatted(ToString(obj))}
	}

	// 🔍 检查循环引用（在处理对象/数组之前）
	if obj != nil {
		if sideChannel.has(obj) {
			// 检测到循环引用，抛出异常（与 Node.js qs 行为一致）
			panic(makeError(runtime, "Cyclic object value"))
		}
		// 标记当前对象为"正在处理"
		sideChannel.set(obj, true)
	}

	values := []string{}

	// 处理 undefined
	if obj == nil {
		return values
	}

	// 获取对象键
	var objKeys []string

	// 处理数组（comma 格式）
	if generateArrayPrefix == nil && opts.ArrayFormat == "comma" {
		if arr, ok := obj.([]interface{}); ok {
			// 编码数组元素（跳过稀疏数组的空洞）
			strs := []string{}

			// 如果 allowSparse 且有 gojaValue，使用 goja 原生 API 检查索引是否存在
			if opts.AllowSparse && len(gojaValue) > 0 && !goja.IsUndefined(gojaValue[0]) && !goja.IsNull(gojaValue[0]) {
				if gojaArr := gojaValue[0].ToObject(runtime); gojaArr != nil {
					// 使用 goja 原生 API 检查索引是否存在
					// 直接遍历对象的数字键
					// 优化：缓存 Keys() 结果
					keys := gojaArr.Keys()
					for _, k := range keys {
						if idx, err := strconv.Atoi(k); err == nil && idx >= 0 && idx < len(arr) {
							item := arr[idx]
							strVal := ToString(item)
							if opts.Encode {
								if encoder := opts.Encoder; encoder != nil {
									strs = append(strs, encoder(strVal, nil, opts.Charset, "value", opts.Format))
								} else {
									strs = append(strs, encodeValue(strVal, opts))
								}
							} else {
								strs = append(strs, strVal)
							}
						}
					}
				}
			} else {
				// 普通模式：处理所有元素
				for _, item := range arr {
					strVal := ToString(item)
					if opts.Encode {
						if encoder := opts.Encoder; encoder != nil {
							strs = append(strs, encoder(strVal, nil, opts.Charset, "value", opts.Format))
						} else {
							strs = append(strs, encodeValue(strVal, opts))
						}
					} else {
						strs = append(strs, strVal)
					}
				}
			}

			// 连接为逗号分隔的字符串
			joined := strings.Join(strs, ",")

			// 直接返回结果，不再递归处理
			if opts.Encode && !opts.EncodeValuesOnly {
				encodedPrefix := encodeKey(prefix, opts)
				return []string{formatted(encodedPrefix) + "=" + formatted(joined)}
			}
			return []string{formatted(prefix) + "=" + formatted(joined)}
		}
	}

	// 处理 filter 数组
	if filterArray, ok := opts.Filter.([]string); ok {
		objKeys = filterArray
	} else if objKeys == nil {
		// 获取对象键
		if objMap, ok := obj.(map[string]interface{}); ok {
			// 如果有 Goja 对象，从它提取键顺序（保持 JavaScript 对象的键顺序）
			if len(gojaValue) > 0 && !goja.IsUndefined(gojaValue[0]) && !goja.IsNull(gojaValue[0]) {
				if gojaObj := gojaValue[0].ToObject(runtime); gojaObj != nil {
					objKeys = extractObjectKeys(gojaObj, runtime)
				}
			}
			// 如果没有 Goja 对象或提取失败，使用 Go map 的键（可能是随机顺序）
			if objKeys == nil {
				objKeys = GetKeys(objMap)
			}
		} else if arr, ok := obj.([]interface{}); ok {
			// 如果 allowSparse 且有 gojaValue，只包含存在的索引
			if opts.AllowSparse && len(gojaValue) > 0 && !goja.IsUndefined(gojaValue[0]) && !goja.IsNull(gojaValue[0]) {
				if gojaArr := gojaValue[0].ToObject(runtime); gojaArr != nil {
					// 使用 goja 原生 API 检查索引是否真正存在
					// 直接使用对象的数字键
					// 优化：缓存 Keys() 结果
					keys := gojaArr.Keys()
					objKeys = make([]string, 0, len(keys))
					for _, k := range keys {
						if idx, err := strconv.Atoi(k); err == nil && idx >= 0 && idx < len(arr) {
							objKeys = append(objKeys, k)
						}
					}
				} else {
					// 降级：包含所有索引
					objKeys = make([]string, len(arr))
					for i := range arr {
						objKeys[i] = fmt.Sprintf("%d", i)
					}
				}
			} else {
				// 普通模式：包含所有索引
				objKeys = make([]string, len(arr))
				for i := range arr {
					objKeys[i] = fmt.Sprintf("%d", i)
				}
			}
		}
	}

	// 排序键
	if opts.Sort != nil && objKeys != nil {
		objKeys = SortKeys(objKeys, opts.Sort)
	}

	// 编码前缀中的点
	encodedPrefix := prefix
	if opts.EncodeDotInKeys {
		encodedPrefix = strings.ReplaceAll(prefix, ".", "%2E")
	}

	// 处理单元素数组（commaRoundTrip）
	adjustedPrefix := encodedPrefix
	if opts.CommaRoundTrip {
		if arr, ok := obj.([]interface{}); ok && len(arr) == 1 {
			adjustedPrefix = encodedPrefix + "[]"
		}
	}

	// 处理空数组
	if opts.AllowEmptyArrays {
		if arr, ok := obj.([]interface{}); ok && len(arr) == 0 {
			return []string{adjustedPrefix + "[]"}
		}
	}

	// 遍历键
	for _, key := range objKeys {
		var value interface{}
		var elemGojaValue goja.Value

		// 获取值
		if objMap, ok := obj.(map[string]interface{}); ok {
			value = objMap[key]
			// 获取对应的 Goja 值
			if len(gojaValue) > 0 && !goja.IsUndefined(gojaValue[0]) && !goja.IsNull(gojaValue[0]) {
				if gojaObj := gojaValue[0].ToObject(runtime); gojaObj != nil {
					elemGojaValue = gojaObj.Get(key)
				}
			}
		} else if arr, ok := obj.([]interface{}); ok {
			// 使用 strconv.Atoi 替代 fmt.Sscanf（性能优化：16倍提升）
			idx, err := strconv.Atoi(key)
			if err == nil && idx >= 0 && idx < len(arr) {
				value = arr[idx]

				// 从 gojaValue 检测数组元素
				if len(gojaValue) > 0 && !goja.IsUndefined(gojaValue[0]) && !goja.IsNull(gojaValue[0]) {
					if gojaArr := gojaValue[0].ToObject(runtime); gojaArr != nil {
						elemGojaValue = gojaArr.Get(key)
						if goja.IsUndefined(elemGojaValue) {
							continue // 跳过 undefined 元素
						}
					}
				}
			}
		} else if key == "" {
			// comma 格式的特殊处理
			value = obj
		}

		// 跳过 null
		if opts.SkipNulls && value == nil {
			continue
		}

		// 编码键
		encodedKey := key
		if opts.AllowDots && opts.EncodeDotInKeys {
			encodedKey = strings.ReplaceAll(key, ".", "%2E")
		}

		// 构建键前缀
		var keyPrefix string
		isArray := false
		if _, ok := obj.([]interface{}); ok {
			isArray = true
		}

		if isArray {
			if generateArrayPrefix != nil {
				keyPrefix = generateArrayPrefix(adjustedPrefix, encodedKey)
			} else {
				keyPrefix = adjustedPrefix
			}
		} else {
			if opts.AllowDots {
				keyPrefix = adjustedPrefix + "." + encodedKey
			} else {
				keyPrefix = adjustedPrefix + "[" + encodedKey + "]"
			}
		}

		// 递归序列化（传递同一个 sideChannel 以检测循环引用）
		// 传递 Goja 值用于嵌套的 Date 和 undefined 检测
		var serialized []string
		if elemGojaValue != nil && !goja.IsUndefined(elemGojaValue) && !goja.IsNull(elemGojaValue) {
			serialized = stringifyValue(
				value,
				keyPrefix,
				generateArrayPrefix,
				opts,
				sideChannel, // ✅ 传递同一个 sideChannel
				runtime,
				elemGojaValue,
			)
		} else {
			serialized = stringifyValue(
				value,
				keyPrefix,
				generateArrayPrefix,
				opts,
				sideChannel, // ✅ 传递同一个 sideChannel
				runtime,
			)
		}

		values = append(values, serialized...)
	}

	return values
}

// ============================================================================
// 辅助函数
// ============================================================================

// isStringifiableObject 检查对象是否可序列化
func isStringifiableObject(obj interface{}) bool {
	if obj == nil {
		return false
	}

	switch obj.(type) {
	case map[string]interface{}, []interface{}:
		return true
	default:
		// 使用反射检查
		v := reflect.ValueOf(obj)
		return v.Kind() == reflect.Map || v.Kind() == reflect.Slice
	}
}

// isPrimitive 检查是否为基本类型
func isPrimitive(v interface{}) bool {
	if v == nil {
		return false
	}

	switch v.(type) {
	case string, int, int64, float64, bool:
		return true
	default:
		return false
	}
}

// getObjectKeys 获取对象的键
func getObjectKeys(obj map[string]interface{}, opts *StringifyOptions) []string {
	// 应用 filter（如果是数组）
	if filterArray, ok := opts.Filter.([]string); ok {
		return filterArray
	}

	return GetKeys(obj)
}

// encodeKey 编码键
func encodeKey(key string, opts *StringifyOptions) string {
	if !opts.Encode {
		return key
	}

	encoded := ""
	if opts.Encoder != nil {
		defaultEncoder := func(s string) string {
			return Encode(s, opts.Charset, "key", opts.Format)
		}
		encoded = opts.Encoder(key, defaultEncoder, opts.Charset, "key", opts.Format)
	} else {
		encoded = Encode(key, opts.Charset, "key", opts.Format)
	}

	// 应用格式化
	format := RFC3986
	if opts.Format != "" {
		format = Format(opts.Format)
	}
	return FormatValue(encoded, format)
}

// encodeValue 编码值
func encodeValue(value string, opts *StringifyOptions) string {
	if !opts.Encode {
		return value
	}

	encoded := ""
	if opts.Encoder != nil {
		defaultEncoder := func(s string) string {
			return Encode(s, opts.Charset, "value", opts.Format)
		}
		encoded = opts.Encoder(value, defaultEncoder, opts.Charset, "value", opts.Format)
	} else {
		encoded = Encode(value, opts.Charset, "value", opts.Format)
	}

	// 应用格式化
	format := RFC3986
	if opts.Format != "" {
		format = Format(opts.Format)
	}
	return FormatValue(encoded, format)
}

// formatted 应用格式化
func formatted(value string, opts ...*StringifyOptions) string {
	if len(opts) == 0 {
		return value
	}

	opt := opts[0]
	format := RFC3986
	if opt.Format != "" {
		format = Format(opt.Format)
	}

	return FormatValue(value, format)
}

// ============================================================================
// 数组前缀生成器
// ============================================================================

// arrayPrefixGenerator 数组前缀生成器类型
type arrayPrefixGenerator func(prefix string, key string) string

// generateArrayPrefix 获取数组前缀生成器
func generateArrayPrefix(arrayFormat string) arrayPrefixGenerator {
	switch arrayFormat {
	case "brackets":
		return func(prefix string, key string) string {
			return prefix + "[]"
		}
	case "indices":
		return func(prefix string, key string) string {
			return prefix + "[" + key + "]"
		}
	case "repeat":
		return func(prefix string, key string) string {
			return prefix
		}
	case "comma":
		return nil // 特殊处理
	default:
		// 默认使用 indices
		return func(prefix string, key string) string {
			return prefix + "[" + key + "]"
		}
	}
}

// ============================================================================
// Side Channel（用于循环引用检测）
// ============================================================================

// sideChannel 侧通道（用于循环引用检测）
// 使用切片而不是 map，因为 map[string]interface{} 不可哈希
type sideChannel struct {
	keys   []interface{}
	values []interface{}
}

// newSideChannel 创建侧通道
func newSideChannel() *sideChannel {
	return &sideChannel{
		keys:   make([]interface{}, 0),
		values: make([]interface{}, 0),
	}
}

// set 设置值
func (sc *sideChannel) set(key interface{}, value interface{}) {
	// 检查是否已存在
	for i, k := range sc.keys {
		if reflect.DeepEqual(k, key) {
			sc.values[i] = value
			return
		}
	}
	// 添加新的
	sc.keys = append(sc.keys, key)
	sc.values = append(sc.values, value)
}

// has 检查键是否存在（用于循环引用检测）
func (sc *sideChannel) has(key interface{}) bool {
	if key == nil {
		return false
	}

	keyVal := reflect.ValueOf(key)

	for _, k := range sc.keys {
		if k == nil {
			continue
		}

		kVal := reflect.ValueOf(k)

		// 对于指针类型，比较指针地址
		if kVal.Kind() == reflect.Ptr && keyVal.Kind() == reflect.Ptr {
			if kVal.Pointer() == keyVal.Pointer() {
				return true
			}
		}

		// 对于 map 和 slice，比较底层数据指针
		if (kVal.Kind() == reflect.Map || kVal.Kind() == reflect.Slice) &&
			(keyVal.Kind() == reflect.Map || keyVal.Kind() == reflect.Slice) {
			if kVal.Pointer() == keyVal.Pointer() {
				return true
			}
		}

		// 其他情况使用 DeepEqual
		if reflect.DeepEqual(k, key) {
			return true
		}
	}

	return false
}

// ============================================================================
// JavaScript 选项提取
// ============================================================================

// extractStringifyOptionsFromJS 从 JavaScript 选项对象提取 StringifyOptions
func extractStringifyOptionsFromJS(optionsArg goja.Value, runtime *goja.Runtime) *StringifyOptions {
	optionsObj := optionsArg.ToObject(runtime)
	if optionsObj == nil {
		return DefaultStringifyOptions()
	}

	opts := DefaultStringifyOptions()

	// 提取所有选项
	if v := getValue(optionsObj, "addQueryPrefix"); !goja.IsUndefined(v) {
		opts.AddQueryPrefix = v.ToBoolean()
	}

	if v := getValue(optionsObj, "allowDots"); !goja.IsUndefined(v) {
		opts.AllowDots = v.ToBoolean()
	}

	if v := getValue(optionsObj, "allowEmptyArrays"); !goja.IsUndefined(v) {
		opts.AllowEmptyArrays = v.ToBoolean()
	}

	if v := getValue(optionsObj, "allowSparse"); !goja.IsUndefined(v) {
		opts.AllowSparse = v.ToBoolean()
	}

	if v := getStringValue(optionsObj, "arrayFormat", ""); v != "" {
		opts.ArrayFormat = v
	}

	if v := getStringValue(optionsObj, "charset", ""); v != "" {
		opts.Charset = v
	}

	if v := getValue(optionsObj, "charsetSentinel"); !goja.IsUndefined(v) {
		opts.CharsetSentinel = v.ToBoolean()
	}

	if v := getValue(optionsObj, "commaRoundTrip"); !goja.IsUndefined(v) {
		opts.CommaRoundTrip = v.ToBoolean()
	}

	if v := getStringValue(optionsObj, "delimiter", ""); v != "" {
		opts.Delimiter = v
	}

	if v := getValue(optionsObj, "encode"); !goja.IsUndefined(v) {
		opts.Encode = v.ToBoolean()
	}

	if v := getValue(optionsObj, "encodeDotInKeys"); !goja.IsUndefined(v) {
		opts.EncodeDotInKeys = v.ToBoolean()
	}

	if v := getValue(optionsObj, "encodeValuesOnly"); !goja.IsUndefined(v) {
		opts.EncodeValuesOnly = v.ToBoolean()
	}

	if v := getStringValue(optionsObj, "format", ""); v != "" {
		opts.Format = v
	}

	if v := getValue(optionsObj, "indices"); !goja.IsUndefined(v) {
		opts.Indices = v.ToBoolean()
		// 如果 indices=true，使用 "indices" 格式；否则使用 "repeat"
		if opts.ArrayFormat == "indices" {
			if opts.Indices {
				opts.ArrayFormat = "indices"
			} else {
				opts.ArrayFormat = "repeat"
			}
		}
	}

	if v := getValue(optionsObj, "skipNulls"); !goja.IsUndefined(v) {
		opts.SkipNulls = v.ToBoolean()
	}

	if v := getValue(optionsObj, "strictNullHandling"); !goja.IsUndefined(v) {
		opts.StrictNullHandling = v.ToBoolean()
	}

	// 自定义编码器
	if encoderVal := getValue(optionsObj, "encoder"); isFunction(encoderVal) {
		encoderFunc, ok := goja.AssertFunction(encoderVal)
		if ok {
			opts.Encoder = func(str string, defaultEncoder func(string) string, charset string, typ string, format string) string {
				// 创建默认编码器的 JS 包装
				defaultEncoderJS := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
					if len(call.Arguments) == 0 {
						return goja.Undefined()
					}
					s := call.Argument(0).String()
					return runtime.ToValue(defaultEncoder(s))
				})

				// 调用 JS 编码器
				result, err := encoderFunc(goja.Undefined(),
					runtime.ToValue(str),
					defaultEncoderJS,
					runtime.ToValue(charset),
					runtime.ToValue(typ),
					runtime.ToValue(format),
				)

				if err != nil {
					return str
				}

				if goja.IsUndefined(result) || goja.IsNull(result) {
					return str
				}

				return result.String()
			}
		}
	}

	// Filter
	if filterVal := getValue(optionsObj, "filter"); !goja.IsUndefined(filterVal) && !goja.IsNull(filterVal) {
		if isFunction(filterVal) {
			filterFunc, ok := goja.AssertFunction(filterVal)
			if ok {
				opts.Filter = func(prefix string, value interface{}) interface{} {
					result, err := filterFunc(goja.Undefined(),
						runtime.ToValue(prefix),
						runtime.ToValue(value),
					)
					if err != nil {
						return value
					}
					// 如果 filter 返回 undefined，返回 skipMarker 表示跳过该键
					if goja.IsUndefined(result) {
						return skipMarker
					}
					// 如果返回 null，保持为 nil（会被当作 null 处理）
					if goja.IsNull(result) {
						return nil
					}
					return result.Export()
				}
			}
		} else {
			// 数组形式
			if exported := filterVal.Export(); exported != nil {
				if arr, ok := exported.([]interface{}); ok {
					filterArray := make([]string, 0, len(arr))
					for _, item := range arr {
						if str, ok := item.(string); ok {
							filterArray = append(filterArray, str)
						}
					}
					opts.Filter = filterArray
				}
			}
		}
	}

	// Sort
	if sortVal := getValue(optionsObj, "sort"); isFunction(sortVal) {
		sortFunc, ok := goja.AssertFunction(sortVal)
		if ok {
			opts.Sort = func(a, b string) bool {
				result, err := sortFunc(goja.Undefined(),
					runtime.ToValue(a),
					runtime.ToValue(b),
				)
				if err != nil {
					return a < b
				}
				// 如果返回负数，a < b
				return result.ToInteger() < 0
			}
		}
	}

	// SerializeDate
	if serializeDateVal := getValue(optionsObj, "serializeDate"); isFunction(serializeDateVal) {
		serializeDateFunc, ok := goja.AssertFunction(serializeDateVal)
		if ok {
			opts.SerializeDate = func(date interface{}) string {
				// 如果 date 已经是 goja.Value，直接使用
				var dateVal goja.Value
				if gojaVal, ok := date.(goja.Value); ok {
					dateVal = gojaVal
				} else if gojaObj, ok := date.(*goja.Object); ok {
					dateVal = gojaObj
				} else {
					dateVal = runtime.ToValue(date)
				}

				result, err := serializeDateFunc(goja.Undefined(), dateVal)
				if err != nil {
					if d, ok := date.(time.Time); ok {
						return d.Format(time.RFC3339)
					}
					return ToString(date)
				}
				return result.String()
			}
		}
	}

	return opts
}
