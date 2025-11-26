package url

import (
	"fmt"
	"net/url"
	"sort"
	"strings"

	"github.com/dop251/goja"
)

// addSymbolIteratorToIterator 为迭代器添加 Symbol.iterator 支持（使用原生 API）
// 使迭代器本身可迭代（返回自身），符合 ES6 迭代器协议
func addSymbolIteratorToIterator(runtime *goja.Runtime, iterator *goja.Object) {
	symbolObj := runtime.Get("Symbol")
	if goja.IsUndefined(symbolObj) {
		return
	}

	symbol := symbolObj.ToObject(runtime)
	if symbol == nil {
		return
	}

	iteratorSym := symbol.Get("iterator")
	if goja.IsUndefined(iteratorSym) {
		return
	}

	// 使用原生 SetSymbol API（性能最优）
	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		iterator.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return iterator
		}))
	}
}

// setSymbolIteratorMethod 为对象设置 Symbol.iterator 方法（使用原生 API）
// methodFunc 是返回迭代器的函数
func setSymbolIteratorMethod(runtime *goja.Runtime, obj *goja.Object, methodFunc func() goja.Value) {
	symbolObj := runtime.Get("Symbol")
	if goja.IsUndefined(symbolObj) {
		return
	}

	symbol := symbolObj.ToObject(runtime)
	if symbol == nil {
		return
	}

	iteratorSym := symbol.Get("iterator")
	if goja.IsUndefined(iteratorSym) {
		return
	}

	// 使用原生 SetSymbol API（性能最优）
	if sym, ok := iteratorSym.(*goja.Symbol); ok {
		obj.SetSymbol(sym, runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			return methodFunc()
		}))
	}
}

// RegisterURLSearchParams 在 runtime 中注册 URLSearchParams 构造函数
func RegisterURLSearchParams(runtime *goja.Runtime) error {
	// 创建构造函数对象并设置 name 属性（需要在构造函数定义之前）
	var constructorObj *goja.Object

	// URLSearchParams 构造函数
	urlSearchParamsConstructor := func(call goja.ConstructorCall) *goja.Object {
		obj := call.This

		// 设置 constructor 引用
		if constructorObj != nil {
			obj.Set("constructor", constructorObj)
		}

		// 内部存储：使用 Map 来存储键值对
		params := make(map[string][]string)
		obj.Set("__params", params)

		// 处理构造函数参数
		if len(call.Arguments) > 0 {
			arg := call.Arguments[0]

			// 支持字符串初始化
			if !goja.IsUndefined(arg) && !goja.IsNull(arg) {
				if str, ok := arg.Export().(string); ok {
					// 解析查询字符串
					str = strings.TrimPrefix(str, "?")
					parsed, err := url.ParseQuery(str)
					if err == nil {
						for k, v := range parsed {
							params[k] = v
						}
					}
				} else if exported := arg.Export(); exported != nil {
					// 🔥 检查是否为二维数组 [['key', 'value'], ...]
					if arr, ok := exported.([]interface{}); ok {
						for _, item := range arr {
							if pairArr, ok := item.([]interface{}); ok && len(pairArr) >= 2 {
								key := fmt.Sprintf("%v", pairArr[0])
								value := fmt.Sprintf("%v", pairArr[1])
								if existing, exists := params[key]; exists {
									params[key] = append(existing, value)
								} else {
									params[key] = []string{value}
								}
							}
						}
					} else if argObj, ok := arg.(*goja.Object); ok {
						// 支持对象初始化
						for _, key := range argObj.Keys() {
							val := argObj.Get(key)
							if !goja.IsUndefined(val) {
								// 🔥 检查是否为数组
								if valArr, ok := val.Export().([]interface{}); ok {
									// 将数组的每个元素转换为字符串
									strArr := make([]string, len(valArr))
									for i, v := range valArr {
										strArr[i] = fmt.Sprintf("%v", v)
									}
									params[key] = strArr
								} else {
									// 单个值
									params[key] = []string{val.String()}
								}
							}
						}
					}
				}
			}
		}

		// append(name, value) 方法
		obj.Set("append", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("URLSearchParams.append 需要 2 个参数"))
			}
			name := call.Arguments[0].String()
			value := call.Arguments[1].String()

			if existing, ok := params[name]; ok {
				params[name] = append(existing, value)
			} else {
				params[name] = []string{value}
			}
			return goja.Undefined()
		})

		// delete(name, value) 方法 - Node.js v22 新增支持第二个参数
		obj.Set("delete", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.delete 需要至少 1 个参数"))
			}
			name := call.Arguments[0].String()

			// 如果提供了第二个参数 value，只删除匹配的键值对
			if len(call.Arguments) >= 2 {
				targetValue := call.Arguments[1].String()
				if values, ok := params[name]; ok {
					// 过滤掉匹配的值
					newValues := make([]string, 0)
					for _, v := range values {
						if v != targetValue {
							newValues = append(newValues, v)
						}
					}
					if len(newValues) > 0 {
						params[name] = newValues
					} else {
						delete(params, name)
					}
				}
			} else {
				// 传统行为：删除所有同名参数
				delete(params, name)
			}
			return goja.Undefined()
		})

		// get(name) 方法
		obj.Set("get", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.get 需要 1 个参数"))
			}
			name := call.Arguments[0].String()
			if values, ok := params[name]; ok && len(values) > 0 {
				return runtime.ToValue(values[0])
			}
			return goja.Null()
		})

		// getAll(name) 方法
		obj.Set("getAll", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.getAll 需要 1 个参数"))
			}
			name := call.Arguments[0].String()
			if values, ok := params[name]; ok {
				return runtime.ToValue(values)
			}
			return runtime.NewArray()
		})

		// has(name, value) 方法 - Node.js v22 新增支持第二个参数
		obj.Set("has", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.has 需要至少 1 个参数"))
			}
			name := call.Arguments[0].String()

			// 如果提供了第二个参数 value，检查是否存在指定的键值对
			if len(call.Arguments) >= 2 {
				targetValue := call.Arguments[1].String()
				if values, ok := params[name]; ok {
					for _, v := range values {
						if v == targetValue {
							return runtime.ToValue(true)
						}
					}
				}
				return runtime.ToValue(false)
			}

			// 传统行为：只检查键是否存在
			_, exists := params[name]
			return runtime.ToValue(exists)
		})

		// set(name, value) 方法
		obj.Set("set", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("URLSearchParams.set 需要 2 个参数"))
			}
			name := call.Arguments[0].String()
			value := call.Arguments[1].String()
			params[name] = []string{value}
			return goja.Undefined()
		})

		// toString() 方法
		obj.Set("toString", func(call goja.FunctionCall) goja.Value {
			values := url.Values(params)
			return runtime.ToValue(values.Encode())
		})

		// sort() 方法 - Node.js v22 新增，按键名 UTF-16 编码顺序排序
		obj.Set("sort", func(call goja.FunctionCall) goja.Value {
			// 获取所有键并排序
			keys := make([]string, 0, len(params))
			for k := range params {
				keys = append(keys, k)
			}

			// 按 UTF-16 编码顺序排序（Go 的字符串比较默认就是 UTF-16）
			sort.Strings(keys)

			// 创建新的有序 map
			sortedParams := make(map[string][]string)
			for _, k := range keys {
				// 保持每个键的值顺序不变（稳定排序）
				sortedParams[k] = params[k]
			}

			// 替换原 params
			// 清空旧的
			for k := range params {
				delete(params, k)
			}
			// 添加排序后的
			for k, v := range sortedParams {
				params[k] = v
			}

			return goja.Undefined()
		})

		// forEach(callback) 方法
		obj.Set("forEach", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("URLSearchParams.forEach 需要 1 个参数"))
			}

			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				panic(runtime.NewTypeError("URLSearchParams.forEach 回调函数必须是一个函数"))
			}

			for name, values := range params {
				for _, value := range values {
					callback(goja.Undefined(), runtime.ToValue(value), runtime.ToValue(name), obj)
				}
			}
			return goja.Undefined()
		})

		// entries() 方法 - 返回迭代器对象
		obj.Set("entries", func(call goja.FunctionCall) goja.Value {
			// 收集所有条目
			entries := make([][]string, 0)
			for name, values := range params {
				for _, value := range values {
					entries = append(entries, []string{name, value})
				}
			}

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(entries) {
					pair := runtime.NewArray(2)
					pair.Set("0", runtime.ToValue(entries[index][0]))
					pair.Set("1", runtime.ToValue(entries[index][1]))
					result.Set("value", pair)
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			// 🔥 添加 Symbol.iterator，使迭代器本身可迭代（返回自身）
			addSymbolIteratorToIterator(runtime, iterator)

			return iterator
		})

		// keys() 方法 - 返回迭代器对象（符合 Web API 标准）
		obj.Set("keys", func(call goja.FunctionCall) goja.Value {
			// 收集所有 keys
			keys := make([]string, 0)
			for name, values := range params {
				for range values {
					keys = append(keys, name)
				}
			}

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(keys) {
					result.Set("value", runtime.ToValue(keys[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			// 🔥 添加 Symbol.iterator，使迭代器本身可迭代（返回自身）
			addSymbolIteratorToIterator(runtime, iterator)

			return iterator
		})

		// values() 方法 - 返回迭代器对象（符合 Web API 标准）
		obj.Set("values", func(call goja.FunctionCall) goja.Value {
			// 收集所有 values
			allValues := make([]string, 0)
			for _, vals := range params {
				allValues = append(allValues, vals...)
			}

			// 创建迭代器对象
			iterator := runtime.NewObject()
			index := 0

			iterator.Set("next", func(call goja.FunctionCall) goja.Value {
				result := runtime.NewObject()
				if index < len(allValues) {
					result.Set("value", runtime.ToValue(allValues[index]))
					result.Set("done", runtime.ToValue(false))
					index++
				} else {
					result.Set("value", goja.Undefined())
					result.Set("done", runtime.ToValue(true))
				}
				return result
			})

			// 🔥 添加 Symbol.iterator，使迭代器本身可迭代（返回自身）
			addSymbolIteratorToIterator(runtime, iterator)

			return iterator
		})

		// 🔥 添加 URLSearchParams 标识符（用于类型识别）
		obj.Set("__isURLSearchParams", runtime.ToValue(true))

		// size 属性 - Node.js v22 新增，返回所有查询参数的数量（包括重复的 key）
		// 使用 getter 定义为动态只读属性
		if err := obj.DefineAccessorProperty("size",
			runtime.ToValue(func(call goja.FunctionCall) goja.Value {
				count := 0
				for _, values := range params {
					count += len(values)
				}
				return runtime.ToValue(count)
			}),
			nil, // no setter
			goja.FLAG_FALSE, goja.FLAG_TRUE); err != nil {
			// 如果定义失败，回退到普通属性
			obj.Set("__getSize", func() int {
				count := 0
				for _, values := range params {
					count += len(values)
				}
				return count
			})
		}

		// 🔥 添加 Symbol.iterator 支持，使 URLSearchParams 本身可迭代
		// 这样就可以直接用 for...of 遍历 URLSearchParams 对象
		// 例如：for (const [key, value] of params) { ... }
		// 将 entries 方法作为默认迭代器（符合 Web API 标准）
		setSymbolIteratorMethod(runtime, obj, func() goja.Value {
			// ✅ 直接返回 entries() 迭代器
			// 调用 obj.entries() 方法
			if entriesFunc, ok := goja.AssertFunction(obj.Get("entries")); ok {
				result, err := entriesFunc(obj)
				if err == nil {
					return result
				}
			}
			return goja.Undefined()
		})

		return obj
	}

	// 创建构造函数对象并设置 name 属性
	constructorObj = runtime.ToValue(urlSearchParamsConstructor).ToObject(runtime)
	constructorObj.Set("name", "URLSearchParams")

	// 设置构造函数
	return runtime.Set("URLSearchParams", constructorObj)
}
