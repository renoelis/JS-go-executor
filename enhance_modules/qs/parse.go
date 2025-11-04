package qs

import (
	"fmt"
	"reflect"
	"regexp"
	"strconv"
	"strings"

	"github.com/dop251/goja"
)

// ============================================================================
// 包级正则表达式（性能优化：避免重复编译）
// ============================================================================

var (
	// dotNotationRegex 点号表示法转换正则 (a.b => a[b])
	dotNotationRegex = regexp.MustCompile(`\.([^.[]+)`)

	// bracketSegmentRegex 括号段匹配正则 (用于查找第一个括号段)
	bracketSegmentRegex = regexp.MustCompile(`(\[[^\[\]]*\])`)

	// childKeyRegex 提取所有子键的正则 (用于查找所有括号段)
	childKeyRegex = regexp.MustCompile(`\[[^\[\]]*\]`)
)

// ============================================================================
// Parse - 查询字符串解析（完整手动实现，不依赖第三方库）
// 对应 Node.js qs 的 lib/parse.js
// ============================================================================

// Parse 解析查询字符串为 JavaScript 对象
// 对应 Node.js: qs.parse(str, [options])
func Parse(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	// 1. 获取查询字符串参数
	if len(call.Arguments) < 1 {
		return runtime.ToValue(make(map[string]interface{}))
	}

	// 边界处理：如果是 null 或 undefined，返回空对象
	arg := call.Argument(0)
	if goja.IsUndefined(arg) || goja.IsNull(arg) {
		return runtime.ToValue(make(map[string]interface{}))
	}

	// 类型检查：只接受字符串类型
	// 如果不是字符串，返回空对象（与 Node.js qs 行为一致）
	if arg.ExportType().Kind() != reflect.String {
		return runtime.ToValue(make(map[string]interface{}))
	}

	queryString := arg.String()

	// 空字符串也返回空对象
	if queryString == "" {
		return runtime.ToValue(make(map[string]interface{}))
	}

	// 2. 提取选项
	opts := DefaultParseOptions()
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Argument(1)) && !goja.IsNull(call.Argument(1)) {
		opts = extractParseOptionsFromJS(call.Argument(1), runtime)
	}

	// 3. 执行解析
	result, err := parseQueryString(queryString, opts, runtime)
	if err != nil {
		panic(makeError(runtime, "qs.parse() failed: %v", err))
	}

	// 4. result 已经是有序的 map，直接返回
	return result
}

// parseQueryString 解析查询字符串
func parseQueryString(queryString string, opts *ParseOptions, runtime *goja.Runtime) (goja.Value, error) {
	// 1. 预处理查询字符串
	str := preprocessQueryString(queryString, opts)

	// 2. 解析为键值对
	tempObj, err := parseValues(str, opts)
	if err != nil {
		return nil, err
	}

	// 3. 预处理：为混合索引数组中的空括号分配索引
	keyOrder := tempObj.Keys() // 保存键的顺序
	keyOrder = assignEmptyBracketIndices(keyOrder, tempObj)

	// 解析键并构建嵌套对象
	obj := make(map[string]interface{})

	// 跟踪嵌套对象的键顺序
	nestedKeyOrder := make(map[string][]string)

	// 第一遍：从 keyOrder 提取嵌套键的顺序（保持原始输入顺序）
	// 例如：["outer[inner]", "outer[inn2]"] -> nestedKeyOrder["outer"] = ["inner", "inn2"]
	for _, key := range keyOrder {
		// 提取顶层键和嵌套键
		if strings.Contains(key, "[") {
			topLevelKey := key[:strings.Index(key, "[")]
			// 提取第一层嵌套键
			rest := key[len(topLevelKey):]
			if strings.HasPrefix(rest, "[") && strings.Contains(rest, "]") {
				endIdx := strings.Index(rest, "]")
				nestedKey := rest[1:endIdx]
				if nestedKey != "" && topLevelKey != "" {
					// 记录顺序（去重）
					if !containsString(nestedKeyOrder[topLevelKey], nestedKey) {
						nestedKeyOrder[topLevelKey] = append(nestedKeyOrder[topLevelKey], nestedKey)
					}
				}
			}
		} else if opts.AllowDots && strings.Contains(key, ".") {
			// 处理点号分隔的键 a.b.c
			parts := strings.Split(key, ".")
			if len(parts) >= 2 {
				topLevelKey := parts[0]
				nestedKey := parts[1]
				if !containsString(nestedKeyOrder[topLevelKey], nestedKey) {
					nestedKeyOrder[topLevelKey] = append(nestedKeyOrder[topLevelKey], nestedKey)
				}
			}
		}
	}

	// 特殊处理：统计空键 "[]" 的数量，用于展平为数字键
	emptyKeyIndex := 0

	// 第二遍：解析并构建对象
	// 按照顶层键的顺序分组处理，确保合并的确定性顺序
	topLevelKeysOrder := extractTopLevelKeysWithOpts(keyOrder, opts)
	processedTopKeys := make(map[string]bool)

	for _, topKey := range topLevelKeysOrder {
		// 处理所有属于这个顶层键的原始键
		for _, key := range keyOrder {
			val, _ := tempObj.Get(key)

			// 特殊处理空键 "[]"
			if key == "[]" {
				if !processedTopKeys["[]"] {
					// 空键应该被展平为数字键 0, 1, 2, ...
					// 处理值（可能是数组）
					if arr, ok := val.([]interface{}); ok {
						// 如果值已经是数组（由 Combine 产生），展平每个元素
						for _, item := range arr {
							obj[strconv.Itoa(emptyKeyIndex)] = item
							emptyKeyIndex++
						}
					} else {
						obj[strconv.Itoa(emptyKeyIndex)] = val
						emptyKeyIndex++
					}
					processedTopKeys["[]"] = true
				}
				continue
			}

			// 提取当前键的顶层键
			currentTopKey := key
			if idx := strings.Index(key, "["); idx != -1 {
				currentTopKey = key[:idx]
			} else if opts.AllowDots && strings.Contains(key, ".") {
				// 处理 allowDots 情况
				currentTopKey = key[:strings.Index(key, ".")]
			}

			// 只处理属于当前顶层键的键
			if currentTopKey != topKey {
				continue
			}

			newObj := parseKeys(key, val, opts, true)
			if newObj != nil {
				// 合并结果
				if resultMap, ok := newObj.(map[string]interface{}); ok {
					// 特殊处理：当 depth=0 或 depth=false 时，
					// parseKeys 返回的键可能是字面量（如 "a[b][c]"），
					// 不再是顶层键，需要直接合并整个 map
					// 或者：当 topKey 是空字符串时（如 [c]），也需要直接合并
					if opts.Depth == 0 || opts.Depth == -1 || topKey == "" {
						for k, v := range resultMap {
							if existing, exists := obj[k]; exists {
								obj[k] = Merge(existing, v, opts)
							} else {
								obj[k] = v
							}
						}
					} else {
						// 只处理当前顶层键
						if v, exists := resultMap[topKey]; exists {
							if existing, existsInObj := obj[topKey]; existsInObj {
								// Merge 后重新排序嵌套对象
								merged := Merge(existing, v, opts)
								if mergedMap, ok := merged.(map[string]interface{}); ok {
									// 如果有嵌套键顺序，按顺序重建 map
									if order, hasOrder := nestedKeyOrder[topKey]; hasOrder {
										orderedMap := make(map[string]interface{})
										// 先按顺序添加
										for _, nestedKey := range order {
											if val, exists := mergedMap[nestedKey]; exists {
												orderedMap[nestedKey] = val
											}
										}
										// 再添加不在顺序中的键
										for k, v := range mergedMap {
											if _, exists := orderedMap[k]; !exists {
												orderedMap[k] = v
											}
										}
										obj[topKey] = orderedMap
									} else {
										obj[topKey] = merged
									}
								} else {
									obj[topKey] = merged
								}
							} else {
								obj[topKey] = v
							}
						}
					}
				} else {
					obj = Merge(obj, newObj, opts).(map[string]interface{})
				}
			}
		}
	}

	// 4. 压缩对象（移除 undefined）或转换稀疏数组
	arrayLimit := opts.ArrayLimit
	if arrayLimit == 0 {
		arrayLimit = 20
	}

	var finalResult interface{} = obj // 用于最终结果（可能是 map 或 array）

	if !opts.AllowSparse {
		// allowSparse: false - 压缩数组（移除空洞）
		compacted := CompactWithOptions(obj, arrayLimit, opts.ParseArrays)
		// CompactWithOptions 可能返回 map 或 array（当所有键都是连续数字时）
		switch v := compacted.(type) {
		case map[string]interface{}:
			obj = v
			finalResult = v
		case []interface{}:
			// 如果返回数组，转换回对象（保持键为字符串）
			obj = make(map[string]interface{})
			for i, item := range v {
				obj[fmt.Sprintf("%d", i)] = item
			}
			finalResult = obj
		default:
			// 保持原样
			obj = map[string]interface{}{"value": compacted}
			finalResult = obj
		}
	} else {
		// allowSparse: true - 保留稀疏数组的空洞
		// 检查是否所有键都是数字（但保留空洞）
		sparseResult := convertToSparseArray(obj, arrayLimit)

		// convertToSparseArray 可能返回 map 或 array
		switch v := sparseResult.(type) {
		case []interface{}:
			// 稀疏数组：保持 nil 用于表示空洞，不转换为 undefined
			// 后续在创建 JS 数组时会正确处理
			finalResult = v
		case map[string]interface{}:
			// 仍然是对象，递归转换嵌套的稀疏数组
			finalResult = convertNilToUndefinedForObject(v, runtime)
			obj = v // 更新 obj 用于后续处理
		default:
			finalResult = sparseResult
		}
	}

	// 5. 创建有序结果（保持键顺序）
	// 特殊处理：如果顶层是数组，使用 Go 原生 API 创建以正确处理 undefined
	if arr, isArray := finalResult.([]interface{}); isArray {
		// 使用 goja 原生 API 创建稀疏数组
		jsArr := runtime.NewArray()

		// 设置数组长度
		jsArr.Set("length", runtime.ToValue(len(arr)))

		// 只设置非 nil 的元素（nil 会自动变成 undefined）
		for i, item := range arr {
			if item != nil {
				jsArr.Set(fmt.Sprintf("%d", i), runtime.ToValue(item))
			}
		}

		return jsArr, nil
	}

	// 提取顶层键（去掉方括号/点号后的部分）
	topLevelKeys := extractTopLevelKeysWithOpts(keyOrder, opts)

	// 如果 allowSparse，预处理对象中的稀疏数组
	if opts.AllowSparse {
		obj = preprocessSparseArraysInObject(obj, runtime)
	}

	// 根据 plainObjects 选项选择返回对象类型
	var result goja.Value
	if opts.PlainObjects {
		// 创建无原型对象（Object.create(null)）
		result = createPlainObjectWithNested(obj, topLevelKeys, nestedKeyOrder, runtime)
	} else {
		// 创建普通对象（有原型链）
		result = createOrderedObjectWithNested(obj, topLevelKeys, nestedKeyOrder, runtime)
	}

	return result, nil
}

// preprocessSparseArraysInObject 预处理对象中的稀疏数组，将它们转换为 goja.Value
// 这样 runtime.ToValue 就不会将 nil 转换为 null
func preprocessSparseArraysInObject(obj map[string]interface{}, runtime *goja.Runtime) map[string]interface{} {
	result := make(map[string]interface{})

	for key, val := range obj {
		switch v := val.(type) {
		case []interface{}:
			// 检查是否是稀疏数组（包含 nil）
			hasSparseHoles := false
			for _, item := range v {
				if item == nil {
					hasSparseHoles = true
					break
				}
			}

			if hasSparseHoles {
				// 创建 JavaScript 稀疏数组
				jsArr := createSparseJSArray(v, runtime)
				result[key] = jsArr
			} else {
				// 普通数组，递归处理元素
				result[key] = preprocessArrayElements(v, runtime)
			}

		case map[string]interface{}:
			// 递归处理嵌套对象
			result[key] = preprocessSparseArraysInObject(v, runtime)

		default:
			result[key] = val
		}
	}

	return result
}

// preprocessArrayElements 递归处理数组元素
func preprocessArrayElements(arr []interface{}, runtime *goja.Runtime) []interface{} {
	result := make([]interface{}, len(arr))
	for i, item := range arr {
		switch v := item.(type) {
		case map[string]interface{}:
			result[i] = preprocessSparseArraysInObject(v, runtime)
		case []interface{}:
			result[i] = preprocessArrayElements(v, runtime)
		default:
			result[i] = item
		}
	}
	return result
}

// createSparseJSArray 创建 JavaScript 稀疏数组（纯 Go 实现）
func createSparseJSArray(arr []interface{}, runtime *goja.Runtime) goja.Value {
	// 使用 goja 原生 API 创建稀疏数组
	jsArr := runtime.NewArray()

	// 设置数组长度
	jsArr.Set("length", runtime.ToValue(len(arr)))

	// 只设置非 nil 的元素
	for i, item := range arr {
		if item != nil {
			// 递归处理嵌套结构
			var processedItem interface{}
			switch v := item.(type) {
			case map[string]interface{}:
				processedItem = preprocessSparseArraysInObject(v, runtime)
			case []interface{}:
				processedItem = preprocessArrayElements(v, runtime)
			default:
				processedItem = item
			}
			jsArr.Set(fmt.Sprintf("%d", i), runtime.ToValue(processedItem))
		}
		// nil 元素不设置，会自动成为 undefined
	}

	return jsArr
}

// convertNilToUndefinedForObject 递归地处理对象中的嵌套稀疏数组
// 数组保持 nil 用于表示空洞，对象递归处理
func convertNilToUndefinedForObject(value interface{}, runtime *goja.Runtime) interface{} {
	switch v := value.(type) {
	case map[string]interface{}:
		// 对象：递归处理每个值
		result := make(map[string]interface{})
		for key, val := range v {
			result[key] = convertNilToUndefinedForObject(val, runtime)
		}
		return result
	case []interface{}:
		// 数组：保持原样（包括 nil），在转换为 JS 数组时处理
		return v
	default:
		return value
	}
}

// assignEmptyBracketIndices 为混合索引数组中的空括号分配索引
// 例如：["a[0]", "a[]", "a[2]", "a[]"] => ["a[0]", "a[1]", "a[2]", "a[3]"]
func assignEmptyBracketIndices(keys []string, tempObj *OrderedMap) []string {
	// 按前缀分组，追踪每个前缀的索引使用情况
	prefixIndices := make(map[string]map[int]bool) // prefix -> set of used indices
	prefixMaxIndex := make(map[string]int)         // prefix -> max used index

	// 用于检测是否为混合情况
	prefixHasEmptyBracket := make(map[string]bool)  // prefix -> has empty bracket
	prefixHasNumberedIndex := make(map[string]bool) // prefix -> has numbered index

	// 第一遍：收集已有的索引，并检测混合情况
	for _, key := range keys {
		if !strings.Contains(key, "[") {
			continue
		}

		// 提取前缀和索引部分
		parts := strings.SplitN(key, "[", 2)
		if len(parts) != 2 {
			continue
		}

		prefix := parts[0]
		indexPart := "[" + parts[1]

		// 检查是否是空括号
		if strings.HasPrefix(indexPart, "[]") {
			prefixHasEmptyBracket[prefix] = true
			continue
		}

		// 检查是否是数字索引
		if strings.HasPrefix(indexPart, "[") && strings.Contains(indexPart, "]") {
			endIdx := strings.Index(indexPart, "]")
			indexStr := indexPart[1:endIdx]

			// 尝试解析为整数
			if index, err := strconv.Atoi(indexStr); err == nil {
				prefixHasNumberedIndex[prefix] = true
				if prefixIndices[prefix] == nil {
					prefixIndices[prefix] = make(map[int]bool)
				}
				prefixIndices[prefix][index] = true

				if index > prefixMaxIndex[prefix] {
					prefixMaxIndex[prefix] = index
				}
			}
		}
	}

	// 第二遍：仅对混合情况（既有数字索引又有空括号）分配索引
	result := make([]string, 0, len(keys))
	nextIndex := make(map[string]int) // prefix -> next available index

	for _, key := range keys {
		if !strings.HasSuffix(key, "[]") || !strings.Contains(key, "[") {
			result = append(result, key)
			continue
		}

		// 这是一个 prefix[] 形式的键
		prefix := key[:len(key)-2] // 移除 []

		// 🔍 关键判断：只处理混合情况
		// 如果该前缀既有空括号又有数字索引，才需要分配索引
		// 否则保持原样（让 parseKeys 和 Combine 处理纯空括号数组）
		if !prefixHasNumberedIndex[prefix] {
			// 纯空括号数组（如 arr[]=1&arr[]=2），不处理
			result = append(result, key)
			continue
		}

		// 这是混合情况（如 a[0]=x&a[]=y），需要分配索引
		// 检查值是否已经是数组（被 Combine 合并过）
		if val, exists := tempObj.Get(key); exists {
			if arr, isArray := val.([]interface{}); isArray {
				// 值已经是数组，说明有多个相同的 prefix[]
				// 需要展开这个数组，为每个元素分配索引
				for _, item := range arr {
					// 找到下一个可用的索引
					if _, exists := nextIndex[prefix]; !exists {
						nextIndex[prefix] = 0
					}

					// 跳过已使用的索引
					for {
						if prefixIndices[prefix] == nil || !prefixIndices[prefix][nextIndex[prefix]] {
							break
						}
						nextIndex[prefix]++
					}

					// 创建新的键
					newKey := prefix + "[" + strconv.Itoa(nextIndex[prefix]) + "]"
					result = append(result, newKey)

					// 更新 tempObj
					tempObj.Set(newKey, item)

					// 标记该索引已使用
					if prefixIndices[prefix] == nil {
						prefixIndices[prefix] = make(map[int]bool)
					}
					prefixIndices[prefix][nextIndex[prefix]] = true
					nextIndex[prefix]++
				}

				// 删除原始的 prefix[] 键
				tempObj.Delete(key)
				continue
			}
		}

		// 单个 prefix[]，分配索引
		// 找到下一个可用的索引
		if _, exists := nextIndex[prefix]; !exists {
			nextIndex[prefix] = 0
		}

		// 跳过已使用的索引
		for {
			if prefixIndices[prefix] == nil || !prefixIndices[prefix][nextIndex[prefix]] {
				break
			}
			nextIndex[prefix]++
		}

		// 创建新的键
		newKey := prefix + "[" + strconv.Itoa(nextIndex[prefix]) + "]"
		result = append(result, newKey)

		// 更新 tempObj，将旧键的值移到新键
		if val, exists := tempObj.Get(key); exists {
			tempObj.Set(newKey, val)
			tempObj.Delete(key)
		}

		// 标记该索引已使用
		if prefixIndices[prefix] == nil {
			prefixIndices[prefix] = make(map[int]bool)
		}
		prefixIndices[prefix][nextIndex[prefix]] = true
		nextIndex[prefix]++
	}

	return result
}

// extractTopLevelKeys 从查询字符串的键中提取顶层键
// 例如：["a[0]", "a[1]", "b"] => ["a", "b"]
func extractTopLevelKeys(keys []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0)

	for _, key := range keys {
		// 提取顶层键（方括号之前的部分）
		topKey := key
		if idx := strings.Index(key, "["); idx != -1 {
			topKey = key[:idx]
		}

		// 去重并保持顺序
		if !seen[topKey] {
			seen[topKey] = true
			result = append(result, topKey)
		}
	}

	return result
}

// extractTopLevelKeysWithOpts 从查询字符串的键中提取顶层键（支持 allowDots）
// 例如：["a[0]", "a[1]", "b"] => ["a", "b"]
// 或：["a.b", "a.c", "d"] => ["a", "d"] (when allowDots=true)
func extractTopLevelKeysWithOpts(keys []string, opts *ParseOptions) []string {
	seen := make(map[string]bool)
	result := make([]string, 0)

	for _, key := range keys {
		// 提取顶层键（方括号或点号之前的部分）
		topKey := key
		if idx := strings.Index(key, "["); idx != -1 {
			topKey = key[:idx]
		} else if opts.AllowDots && strings.Contains(key, ".") {
			topKey = key[:strings.Index(key, ".")]
		}

		// 去重并保持顺序
		if !seen[topKey] {
			seen[topKey] = true
			result = append(result, topKey)
		}
	}

	return result
}

// createPlainObject 创建无原型对象（Object.create(null)）- 纯 Go 实现
func createPlainObject(obj map[string]interface{}, keyOrder []string, runtime *goja.Runtime) goja.Value {
	// 使用 goja 原生 API 创建对象
	result := runtime.NewObject()

	// 记录已添加的键
	added := make(map[string]bool)

	// 按照 keyOrder 的顺序添加键
	for _, key := range keyOrder {
		if value, exists := obj[key]; exists {
			result.Set(key, runtime.ToValue(value))
			added[key] = true
		}
	}

	// 添加 keyOrder 中没有的键（如果有）
	for key, value := range obj {
		if !added[key] {
			result.Set(key, runtime.ToValue(value))
		}
	}

	// 移除原型链以创建无原型对象
	result.SetPrototype(nil)

	return result
}

// createPlainObjectWithNested 创建无原型对象（包括嵌套对象）- 纯 Go 实现
func createPlainObjectWithNested(obj map[string]interface{}, keyOrder []string, nestedKeyOrder map[string][]string, runtime *goja.Runtime) goja.Value {
	// 辅助函数：对嵌套对象排序
	var orderObject func(obj map[string]interface{}, keys []string) *goja.Object
	orderObject = func(obj map[string]interface{}, keys []string) *goja.Object {
		if obj == nil {
			return nil
		}

		ordered := runtime.NewObject()
		added := make(map[string]bool)

		// 按指定顺序添加键
		if len(keys) > 0 {
			for _, key := range keys {
				if value, exists := obj[key]; exists {
					ordered.Set(key, runtime.ToValue(value))
					added[key] = true
				}
			}
		}

		// 添加剩余的键
		for key, value := range obj {
			if !added[key] {
				ordered.Set(key, runtime.ToValue(value))
			}
		}

		// 移除原型链
		ordered.SetPrototype(nil)
		return ordered
	}

	// 创建结果对象
	result := runtime.NewObject()
	added := make(map[string]bool)

	// 按照 keyOrder 的顺序添加顶层键
	for _, key := range keyOrder {
		if value, exists := obj[key]; exists {
			// 如果值是对象且有嵌套键顺序，则应用顺序
			if valueMap, ok := value.(map[string]interface{}); ok {
				if nestedKeys, hasNested := nestedKeyOrder[key]; hasNested {
					result.Set(key, orderObject(valueMap, nestedKeys))
				} else {
					result.Set(key, runtime.ToValue(value))
				}
			} else {
				result.Set(key, runtime.ToValue(value))
			}
			added[key] = true
		}
	}

	// 添加 keyOrder 中没有的键
	for key, value := range obj {
		if !added[key] {
			if valueMap, ok := value.(map[string]interface{}); ok {
				if nestedKeys, hasNested := nestedKeyOrder[key]; hasNested {
					result.Set(key, orderObject(valueMap, nestedKeys))
				} else {
					result.Set(key, runtime.ToValue(value))
				}
			} else {
				result.Set(key, runtime.ToValue(value))
			}
		}
	}

	// 移除原型链以创建无原型对象
	result.SetPrototype(nil)

	return result
}

// createOrderedObject 创建有序的 JavaScript 对象 - 纯 Go 实现
func createOrderedObject(obj map[string]interface{}, keyOrder []string, runtime *goja.Runtime) goja.Value {
	// 使用 goja 原生 API 创建对象
	result := runtime.NewObject()
	added := make(map[string]bool)

	// 按照 keyOrder 的顺序添加键
	for _, key := range keyOrder {
		if value, exists := obj[key]; exists {
			result.Set(key, runtime.ToValue(value))
			added[key] = true
		}
	}

	// 添加 keyOrder 中没有的键（如果有）
	for key, value := range obj {
		if !added[key] {
			result.Set(key, runtime.ToValue(value))
		}
	}

	return result
}

// createOrderedObjectWithNested 创建有序的 JavaScript 对象（包括嵌套对象）- 纯 Go 实现
func createOrderedObjectWithNested(obj map[string]interface{}, keyOrder []string, nestedKeyOrder map[string][]string, runtime *goja.Runtime) goja.Value {
	// 辅助函数：对嵌套对象排序
	var orderObject func(obj map[string]interface{}, keys []string) *goja.Object
	orderObject = func(obj map[string]interface{}, keys []string) *goja.Object {
		if obj == nil {
			return nil
		}

		ordered := runtime.NewObject()
		added := make(map[string]bool)

		// 按指定顺序添加键
		if len(keys) > 0 {
			for _, key := range keys {
				if value, exists := obj[key]; exists {
					ordered.Set(key, runtime.ToValue(value))
					added[key] = true
				}
			}
		}

		// 添加剩余的键
		for key, value := range obj {
			if !added[key] {
				ordered.Set(key, runtime.ToValue(value))
			}
		}

		return ordered
	}

	// 创建结果对象
	result := runtime.NewObject()
	added := make(map[string]bool)

	// 按照 keyOrder 的顺序添加顶层键
	for _, key := range keyOrder {
		if value, exists := obj[key]; exists {
			// 如果值是对象且有嵌套键顺序，则应用顺序
			if valueMap, ok := value.(map[string]interface{}); ok {
				if nestedKeys, hasNested := nestedKeyOrder[key]; hasNested {
					result.Set(key, orderObject(valueMap, nestedKeys))
				} else {
					result.Set(key, runtime.ToValue(value))
				}
			} else {
				result.Set(key, runtime.ToValue(value))
			}
			added[key] = true
		}
	}

	// 添加 keyOrder 中没有的键
	for key, value := range obj {
		if !added[key] {
			if valueMap, ok := value.(map[string]interface{}); ok {
				if nestedKeys, hasNested := nestedKeyOrder[key]; hasNested {
					result.Set(key, orderObject(valueMap, nestedKeys))
				} else {
					result.Set(key, runtime.ToValue(value))
				}
			} else {
				result.Set(key, runtime.ToValue(value))
			}
		}
	}

	return result
}

// containsString 检查字符串切片是否包含指定字符串
func containsString(slice []string, str string) bool {
	for _, s := range slice {
		if s == str {
			return true
		}
	}
	return false
}

// preprocessQueryString 预处理查询字符串
func preprocessQueryString(str string, opts *ParseOptions) string {
	// 移除查询前缀 ?
	if opts.IgnoreQueryPrefix {
		str = strings.TrimPrefix(str, "?")
	}

	// 替换 %5B 和 %5D 为 [ 和 ]
	str = ReplacePercentEncodedBrackets(str)

	return str
}

// parseValues 解析查询字符串为键值对映射
func parseValues(str string, opts *ParseOptions) (*OrderedMap, error) {
	obj := NewOrderedMap()

	// 字符集检测
	charset := opts.Charset
	if opts.CharsetSentinel {
		// 检测 utf8 标识
		if strings.Contains(str, "utf8=%E2%9C%93") {
			charset = "utf-8"
		} else if strings.Contains(str, "utf8=%26%2310003%3B") {
			charset = "iso-8859-1"
		}
	}

	// 分割参数
	var parts []string
	if opts.DelimiterPattern != nil {
		// 使用正则表达式分割
		parts = opts.DelimiterPattern.Split(str, -1)
	} else {
		// 使用字符串分割
		delimiter := opts.Delimiter
		if delimiter == "" {
			delimiter = "&"
		}
		parts = strings.Split(str, delimiter)
	}

	limit := opts.ParameterLimit
	if limit == 0 {
		limit = 1000
	}

	// 检查参数数量限制
	if opts.ThrowOnLimitExceeded && len(parts) > limit {
		return nil, &QSError{Message: "Parameter limit exceeded. Only " + strconv.Itoa(limit) + " parameter(s) allowed."}
	}

	// 限制参数数量
	if len(parts) > limit {
		parts = parts[:limit]
	}

	// 解析每个键值对
	skipIndex := -1
	if opts.CharsetSentinel {
		// 查找 utf8 标识的位置
		for i, part := range parts {
			if strings.HasPrefix(part, "utf8=") {
				skipIndex = i
				break
			}
		}
	}

	for i, part := range parts {
		if i == skipIndex {
			continue
		}

		// 提取键和值
		bracketEqualsPos := strings.Index(part, "]=")
		pos := -1
		if bracketEqualsPos == -1 {
			pos = strings.Index(part, "=")
		} else {
			pos = bracketEqualsPos + 1
		}

		var key, val string
		if pos == -1 {
			// 没有等号，整个是键
			key = decodeComponent(part, charset, opts)
			if opts.StrictNullHandling {
				val = "" // 会被处理为 null
			} else {
				val = ""
			}
		} else {
			// 有等号，分离键和值
			key = decodeComponent(part[:pos], charset, opts)
			valPart := part[pos+1:]

			// 处理逗号分隔的值
			if opts.Comma && strings.Contains(valPart, ",") {
				// 分割为数组
				valParts := strings.Split(valPart, ",")
				decodedVals := make([]interface{}, len(valParts))
				for j, v := range valParts {
					decodedVals[j] = decodeComponent(v, charset, opts)
				}
				val = "" // 会被后续处理为数组
				obj.Set(key, decodedVals)
				continue
			}

			val = decodeComponent(valPart, charset, opts)
		}

		// 处理数字实体
		if opts.InterpretNumericEntities && charset == "iso-8859-1" {
			val = InterpretNumericEntities(val)
		}

		// 检查是否是数组符号 []=
		// 注：这里只是标记，实际处理在后续的 parseKeys 中

		// 处理重复键
		if existing, exists := obj.Get(key); exists {
			switch opts.Duplicates {
			case "first":
				// 保留第一个值，不覆盖
				continue
			case "last":
				// 保留最后一个值，覆盖
				obj.Set(key, val)
			default: // "combine"
				// 合并为数组
				obj.Set(key, Combine(existing, val))
			}
		} else {
			// 处理 strictNullHandling
			if opts.StrictNullHandling && val == "" && pos == -1 {
				obj.Set(key, nil)
			} else {
				obj.Set(key, val)
			}
		}
	}

	return obj, nil
}

// parseKeys 解析键并构建嵌套对象
// 对应 Node.js qs 的 parseKeys 函数
func parseKeys(givenKey string, val interface{}, opts *ParseOptions, valuesParsed bool) interface{} {
	if givenKey == "" {
		return nil
	}

	// 转换点号表示法为方括号表示法
	key := givenKey
	if opts.AllowDots {
		// a.b.c => a[b][c]（使用包级正则表达式，避免重复编译）
		key = dotNotationRegex.ReplaceAllString(key, "[$1]")
	}

	// 检查 depth 设置
	// - depth=-1: depth=false，与 depth=0 行为相同
	// - depth=0: 不解析任何嵌套
	// - depth>0: 最多解析指定层数
	if opts.Depth == 0 || opts.Depth == -1 {
		// depth=0 或 depth=false：不解析嵌套，整个键作为字面量
		result := make(map[string]interface{})
		result[givenKey] = val
		return result
	}

	depth := opts.Depth

	// 提取键的层次结构（使用包级正则表达式）
	segment := bracketSegmentRegex.FindStringIndex(key)

	var parent string
	if segment != nil {
		parent = key[:segment[0]]
	} else {
		parent = key
	}

	// 构建键数组
	keys := []string{}

	// 添加父键
	if parent != "" {
		// 检查原型污染
		if !opts.PlainObjects && isPrototypeKey(parent) {
			if !opts.AllowPrototypes {
				return nil
			}
		}
		keys = append(keys, parent)
	}

	// 提取所有子键（使用包级正则表达式）
	matches := childKeyRegex.FindAllString(key, -1)

	for i, match := range matches {
		if i >= depth {
			// 超过深度限制
			if opts.StrictDepth {
				return nil
			}
			// 将剩余部分作为一个键
			// 从当前索引开始，拼接所有剩余的匹配
			remaining := strings.Join(matches[i:], "")
			keys = append(keys, "["+remaining+"]")
			break
		}

		// 检查原型污染
		innerKey := match[1 : len(match)-1]
		if !opts.PlainObjects && isPrototypeKey(innerKey) {
			if !opts.AllowPrototypes {
				return nil
			}
		}

		keys = append(keys, match)
	}

	// 解析对象
	return parseObject(keys, val, opts, valuesParsed)
}

// parseObject 从键数组构建对象
// 对应 Node.js qs 的 parseObject 函数
func parseObject(chain []string, val interface{}, opts *ParseOptions, valuesParsed bool) interface{} {
	if len(chain) == 0 {
		return val
	}

	// 从最内层开始构建
	leaf := val
	if !valuesParsed {
		// 处理数组值
		if opts.Comma {
			if valStr, ok := val.(string); ok {
				if strings.Contains(valStr, ",") {
					parts := strings.Split(valStr, ",")
					arr := make([]interface{}, len(parts))
					for i, p := range parts {
						arr[i] = p
					}
					leaf = arr
				}
			}
		}
	}

	// 从后向前构建嵌套结构
	for i := len(chain) - 1; i >= 0; i-- {
		root := chain[i]
		var obj interface{}

		if root == "[]" && opts.ParseArrays {
			// 数组符号
			if opts.AllowEmptyArrays && (leaf == "" || (opts.StrictNullHandling && leaf == nil)) {
				obj = []interface{}{}
			} else {
				obj = Combine([]interface{}{}, leaf)
			}
		} else {
			// 对象或数组索引
			newObj := make(map[string]interface{})

			// 清理键名
			cleanRoot := root
			if strings.HasPrefix(root, "[") && strings.HasSuffix(root, "]") {
				cleanRoot = root[1 : len(root)-1]
			}

			// 处理 decodeDotInKeys
			if opts.DecodeDotInKeys {
				cleanRoot = strings.ReplaceAll(cleanRoot, "%2E", ".")
			}

			// 尝试解析为数组索引
			index, err := strconv.Atoi(cleanRoot)
			if err == nil && root != cleanRoot && strconv.Itoa(index) == cleanRoot && index >= 0 {
				// 是数组索引
				arrayLimit := opts.ArrayLimit
				if arrayLimit == 0 {
					arrayLimit = 20
				}
				if opts.ParseArrays && index <= arrayLimit {
					// 创建一个对象，键为数字
					// Compact 阶段会将其转换为数组
					newObj[strconv.Itoa(index)] = leaf
					obj = newObj
				} else {
					newObj[cleanRoot] = leaf
					obj = newObj
				}
			} else if cleanRoot != "__proto__" {
				// 普通键
				if cleanRoot == "" && !opts.ParseArrays {
					newObj["0"] = leaf
				} else {
					newObj[cleanRoot] = leaf
				}
				obj = newObj
			} else {
				// __proto__ 被忽略
				obj = newObj
			}
		}

		leaf = obj
	}

	return leaf
}

// decodeComponent 解码组件（键或值）
func decodeComponent(str string, charset string, opts *ParseOptions) string {
	// 使用自定义解码器（如果有）
	if opts.Decoder != nil {
		defaultDecoder := func(s string) string {
			return Decode(s, charset)
		}
		decoded, err := opts.Decoder(str, defaultDecoder, charset, "value")
		if err == nil {
			return decoded
		}
	}

	// 默认解码
	return Decode(str, charset)
}

// ============================================================================
// JavaScript 选项提取
// ============================================================================

// extractParseOptionsFromJS 从 JavaScript 选项对象提取 ParseOptions
func extractParseOptionsFromJS(optionsArg goja.Value, runtime *goja.Runtime) *ParseOptions {
	optionsObj := optionsArg.ToObject(runtime)
	if optionsObj == nil {
		return DefaultParseOptions()
	}

	opts := DefaultParseOptions()

	// 提取所有选项
	// delimiter 可以是字符串或正则表达式
	if v := getValue(optionsObj, "delimiter"); !goja.IsUndefined(v) {
		if v.ExportType().Kind() == reflect.String {
			opts.Delimiter = v.String()
		} else if obj := v.ToObject(runtime); obj != nil {
			// 尝试获取正则表达式的 source 属性
			if source := obj.Get("source"); !goja.IsUndefined(source) {
				pattern := source.String()
				// 编译正则表达式
				re, err := regexp.Compile(pattern)
				if err == nil {
					opts.DelimiterPattern = re
				}
			}
		}
	}

	if v := getValue(optionsObj, "depth"); !goja.IsUndefined(v) {
		// depth 可以是 false、数字
		// - depth=false: 禁用深度限制（无限深度），用 -1 表示
		// - depth=0: 不解析任何嵌套
		// - depth=N: 最多解析 N 层
		if v.ExportType().Kind() == reflect.Bool && !v.ToBoolean() {
			opts.Depth = -1 // depth=false: 无限深度
		} else {
			opts.Depth = int(v.ToInteger())
		}
	}

	if v := getValue(optionsObj, "arrayLimit"); !goja.IsUndefined(v) {
		opts.ArrayLimit = int(v.ToInteger())
	}

	if v := getValue(optionsObj, "allowDots"); !goja.IsUndefined(v) {
		opts.AllowDots = v.ToBoolean()
	}

	if v := getValue(optionsObj, "allowPrototypes"); !goja.IsUndefined(v) {
		opts.AllowPrototypes = v.ToBoolean()
	}

	if v := getValue(optionsObj, "allowSparse"); !goja.IsUndefined(v) {
		opts.AllowSparse = v.ToBoolean()
	}

	if v := getValue(optionsObj, "allowEmptyArrays"); !goja.IsUndefined(v) {
		opts.AllowEmptyArrays = v.ToBoolean()
	}

	if v := getStringValue(optionsObj, "charset", ""); v != "" {
		opts.Charset = v
	}

	if v := getValue(optionsObj, "charsetSentinel"); !goja.IsUndefined(v) {
		opts.CharsetSentinel = v.ToBoolean()
	}

	if v := getValue(optionsObj, "comma"); !goja.IsUndefined(v) {
		opts.Comma = v.ToBoolean()
	}

	if v := getValue(optionsObj, "decodeDotInKeys"); !goja.IsUndefined(v) {
		opts.DecodeDotInKeys = v.ToBoolean()
	}

	if v := getStringValue(optionsObj, "duplicates", ""); v != "" {
		opts.Duplicates = v
	}

	if v := getValue(optionsObj, "ignoreQueryPrefix"); !goja.IsUndefined(v) {
		opts.IgnoreQueryPrefix = v.ToBoolean()
	}

	if v := getValue(optionsObj, "interpretNumericEntities"); !goja.IsUndefined(v) {
		opts.InterpretNumericEntities = v.ToBoolean()
	}

	if v := getValue(optionsObj, "parameterLimit"); !goja.IsUndefined(v) {
		opts.ParameterLimit = int(v.ToInteger())
	}

	if v := getValue(optionsObj, "parseArrays"); !goja.IsUndefined(v) {
		opts.ParseArrays = v.ToBoolean()
	}

	if v := getValue(optionsObj, "plainObjects"); !goja.IsUndefined(v) {
		opts.PlainObjects = v.ToBoolean()
	}

	if v := getValue(optionsObj, "strictDepth"); !goja.IsUndefined(v) {
		opts.StrictDepth = v.ToBoolean()
	}

	if v := getValue(optionsObj, "strictNullHandling"); !goja.IsUndefined(v) {
		opts.StrictNullHandling = v.ToBoolean()
	}

	if v := getValue(optionsObj, "throwOnLimitExceeded"); !goja.IsUndefined(v) {
		opts.ThrowOnLimitExceeded = v.ToBoolean()
	}

	// 自定义解码器
	if decoderVal := getValue(optionsObj, "decoder"); isFunction(decoderVal) {
		decoderFunc, ok := goja.AssertFunction(decoderVal)
		if ok {
			opts.Decoder = func(str string, defaultDecoder func(string) string, charset string, typ string) (string, error) {
				// 创建默认解码器的 JS 包装
				defaultDecoderJS := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
					if len(call.Arguments) == 0 {
						return goja.Undefined()
					}
					s := call.Argument(0).String()
					return runtime.ToValue(defaultDecoder(s))
				})

				// 调用 JS 解码器
				result, err := decoderFunc(goja.Undefined(),
					runtime.ToValue(str),
					defaultDecoderJS,
					runtime.ToValue(charset),
					runtime.ToValue(typ),
				)

				if err != nil {
					return str, err
				}

				if goja.IsUndefined(result) || goja.IsNull(result) {
					return str, nil
				}

				return result.String(), nil
			}
		}
	}

	return opts
}
