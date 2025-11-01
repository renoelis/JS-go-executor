package pinyin

import (
	"flow-codeblock-go/enhance_modules/pinyin/core"
	"flow-codeblock-go/enhance_modules/pinyin/style"
	"fmt"
	"strings"

	"github.com/dop251/goja"
)

// 全局分词器实例（懒加载）
var segmenterEnabled = true // 可通过配置控制是否启用高级分词

// CreatePinyinFunctionNew 创建新的 100% 兼容的 pinyin 函数
func CreatePinyinFunctionNew(runtime *goja.Runtime) goja.Value {
	// 主 pinyin 函数
	pinyinFunc := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue([][]string{})
		}

		// 获取文本参数
		text := call.Arguments[0].String()

		// 解析选项
		opts := core.DefaultOptions()
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			optsObj := call.Arguments[1].ToObject(runtime)
			if optsObj != nil {
				opts = parseOptions(runtime, optsObj)
			}
		}

		// 🔥 高级分词支持：如果启用了 segment，使用 gse 先分词
		// 这样可以获得比内置词典匹配更智能的分词效果
		if opts.Segment && segmenterEnabled {
			result := convertWithSmartSegmentation(text, opts)
			return runtime.ToValue(result)
		}

		// 执行转换（使用内置词典匹配）
		result := core.Convert(text, opts)
		return runtime.ToValue(result)
	}

	// 创建函数对象
	pinyinObj := runtime.ToValue(pinyinFunc).ToObject(runtime)

	// 添加风格常量
	pinyinObj.Set("STYLE_NORMAL", runtime.ToValue(int(style.StyleNormal)))
	pinyinObj.Set("STYLE_TONE", runtime.ToValue(int(style.StyleTone)))
	pinyinObj.Set("STYLE_TONE2", runtime.ToValue(int(style.StyleTone2)))
	pinyinObj.Set("STYLE_TO3NE", runtime.ToValue(int(style.StyleTone3)))
	pinyinObj.Set("STYLE_INITIALS", runtime.ToValue(int(style.StyleInitials)))
	pinyinObj.Set("STYLE_FIRST_LETTER", runtime.ToValue(int(style.StyleFirstLetter)))
	pinyinObj.Set("STYLE_PASSPORT", runtime.ToValue(int(style.StylePassport)))

	// 添加模式常量
	pinyinObj.Set("MODE_NORMAL", runtime.ToValue(int(core.ModeNormal)))
	pinyinObj.Set("MODE_SURNAME", runtime.ToValue(int(core.ModeSurname)))

	// compare 方法
	pinyinObj.Set("compare", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			return runtime.ToValue(0)
		}

		a := call.Arguments[0].String()
		b := call.Arguments[1].String()

		result := core.Compare(a, b)
		return runtime.ToValue(result)
	})

	// compact 方法
	pinyinObj.Set("compact", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue([][]string{})
		}

		// 尝试直接从 Goja 值中提取二维数组
		arg := call.Arguments[0]

		// 检查是否是对象（数组）
		if obj := arg.ToObject(runtime); obj != nil {
			// 尝试获取数组长度
			if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
				length := int(lengthVal.ToInteger())
				result := make([][]string, 0, length)

				for i := 0; i < length; i++ {
					itemVal := obj.Get(fmt.Sprint(i))
					if itemVal == nil || goja.IsUndefined(itemVal) {
						continue
					}

					// 每个元素也是一个数组
					if itemObj := itemVal.ToObject(runtime); itemObj != nil {
						if itemLenVal := itemObj.Get("length"); itemLenVal != nil && !goja.IsUndefined(itemLenVal) {
							itemLen := int(itemLenVal.ToInteger())
							strArray := make([]string, 0, itemLen)

							for j := 0; j < itemLen; j++ {
								strVal := itemObj.Get(fmt.Sprint(j))
								if strVal != nil && !goja.IsUndefined(strVal) {
									strArray = append(strArray, strVal.String())
								}
							}

							if len(strArray) > 0 {
								result = append(result, strArray)
							}
						}
					}
				}

				compacted := core.Compact(result)
				return runtime.ToValue(compacted)
			}
		}

		// 如果无法解析，尝试旧的方法
		argExport := arg.Export()
		if pys, ok := argExport.([]interface{}); ok {
			result := make([][]string, 0, len(pys))
			for _, py := range pys {
				if pyArray, ok := py.([]interface{}); ok {
					strArray := make([]string, 0, len(pyArray))
					for _, item := range pyArray {
						if str, ok := item.(string); ok {
							strArray = append(strArray, str)
						}
					}
					if len(strArray) > 0 {
						result = append(result, strArray)
					}
				}
			}
			compacted := core.Compact(result)
			return runtime.ToValue(compacted)
		}

		// 如果类型不匹配,返回原参数
		return call.Arguments[0]
	})

	// segment 方法 - 提供基础分词功能
	pinyinObj.Set("segment", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue([]string{})
		}

		text := call.Arguments[0].String()

		// 第二个参数是分词类型，但我们使用统一的词组匹配
		// 兼容 "segmentit", "Intl.Segmenter" 等参数

		// 使用词组匹配进行分词
		matches := core.MatchPhrases(text)
		result := make([]string, 0, len(matches))
		for _, match := range matches {
			result = append(result, match.Text)
		}

		return runtime.ToValue(result)
	})

	// 添加 POSTAG 常量（用于兼容性，即使不实际使用）
	postagObj := runtime.NewObject()
	postagObj.Set("D_A", runtime.ToValue(0x40000000))  // 形容词
	postagObj.Set("D_B", runtime.ToValue(0x20000000))  // 区别词
	postagObj.Set("D_C", runtime.ToValue(0x10000000))  // 连词
	postagObj.Set("D_D", runtime.ToValue(0x08000000))  // 副词
	postagObj.Set("D_E", runtime.ToValue(0x04000000))  // 叹词
	postagObj.Set("D_F", runtime.ToValue(0x02000000))  // 方位词
	postagObj.Set("D_I", runtime.ToValue(0x01000000))  // 成语
	postagObj.Set("D_L", runtime.ToValue(0x00800000))  // 习语
	postagObj.Set("A_M", runtime.ToValue(0x00400000))  // 数词
	postagObj.Set("D_MQ", runtime.ToValue(0x00200000)) // 数量词
	postagObj.Set("D_N", runtime.ToValue(0x00100000))  // 名词
	postagObj.Set("D_O", runtime.ToValue(0x00080000))  // 拟声词
	postagObj.Set("D_P", runtime.ToValue(0x00040000))  // 介词
	postagObj.Set("A_Q", runtime.ToValue(0x00020000))  // 量词
	postagObj.Set("D_R", runtime.ToValue(0x00010000))  // 代词
	postagObj.Set("D_S", runtime.ToValue(0x00008000))  // 处所词
	postagObj.Set("D_T", runtime.ToValue(0x00004000))  // 时间词
	postagObj.Set("D_U", runtime.ToValue(0x00002000))  // 助词
	postagObj.Set("D_V", runtime.ToValue(0x00001000))  // 动词
	postagObj.Set("D_W", runtime.ToValue(0x00000800))  // 标点符号
	postagObj.Set("D_X", runtime.ToValue(0x00000400))  // 非语素字
	postagObj.Set("D_Y", runtime.ToValue(0x00000200))  // 语气词
	postagObj.Set("D_Z", runtime.ToValue(0x00000100))  // 状态词
	postagObj.Set("A_NR", runtime.ToValue(0x00000080)) // 人名
	postagObj.Set("A_NS", runtime.ToValue(0x00000040)) // 地名
	postagObj.Set("A_NT", runtime.ToValue(0x00000020)) // 机构团体
	postagObj.Set("A_NX", runtime.ToValue(0x00000010)) // 外文字符
	postagObj.Set("A_NZ", runtime.ToValue(0x00000008)) // 其他专名
	postagObj.Set("D_ZH", runtime.ToValue(0x00000004)) // 前接成分
	postagObj.Set("D_K", runtime.ToValue(0x00000002))  // 后接成分
	postagObj.Set("UNK", runtime.ToValue(0x00000000))  // 未知词性
	postagObj.Set("URL", runtime.ToValue(0x00000001))  // 网址、邮箱

	pinyinObj.Set("POSTAG", postagObj)

	return runtime.ToValue(pinyinObj)
}

// CreatePinyinClass 创建 Pinyin 类（用于 new Pinyin() 语法）
func CreatePinyinClass(runtime *goja.Runtime) goja.Value {
	// Pinyin 构造函数
	pinyinClass := func(call goja.ConstructorCall) *goja.Object {
		// 🔥 使用 call.This 获取正确的实例（由 goja 自动创建，包含原型链）
		instance := call.This

		// 添加 segment 方法到实例
		instance.Set("segment", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return runtime.ToValue([]string{})
			}

			text := call.Arguments[0].String()

			// 使用词组匹配进行分词
			matches := core.MatchPhrases(text)
			result := make([]string, 0, len(matches))
			for _, match := range matches {
				result = append(result, match.Text)
			}

			return runtime.ToValue(result)
		})

		// 添加 pinyin 方法到实例（与全局 pinyin 函数行为一致）
		instance.Set("pinyin", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return runtime.ToValue([][]string{})
			}

			text := call.Arguments[0].String()
			opts := core.DefaultOptions()

			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
				optsObj := call.Arguments[1].ToObject(runtime)
				if optsObj != nil {
					opts = parseOptions(runtime, optsObj)
				}
			}

			if opts.Segment && segmenterEnabled {
				result := convertWithSmartSegmentation(text, opts)
				return runtime.ToValue(result)
			}

			result := core.Convert(text, opts)
			return runtime.ToValue(result)
		})

		// 添加 compare 方法到实例
		instance.Set("compare", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				return runtime.ToValue(0)
			}

			a := call.Arguments[0].String()
			b := call.Arguments[1].String()

			result := core.Compare(a, b)
			return runtime.ToValue(result)
		})

		// 添加 compact 方法到实例
		instance.Set("compact", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				return runtime.ToValue([][]string{})
			}

			arg := call.Arguments[0]

			if obj := arg.ToObject(runtime); obj != nil {
				if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
					length := int(lengthVal.ToInteger())
					result := make([][]string, 0, length)

					for i := 0; i < length; i++ {
						itemVal := obj.Get(fmt.Sprint(i))
						if itemVal == nil || goja.IsUndefined(itemVal) {
							continue
						}

						if itemObj := itemVal.ToObject(runtime); itemObj != nil {
							if itemLenVal := itemObj.Get("length"); itemLenVal != nil && !goja.IsUndefined(itemLenVal) {
								itemLen := int(itemLenVal.ToInteger())
								strArray := make([]string, 0, itemLen)

								for j := 0; j < itemLen; j++ {
									strVal := itemObj.Get(fmt.Sprint(j))
									if strVal != nil && !goja.IsUndefined(strVal) {
										strArray = append(strArray, strVal.String())
									}
								}

								if len(strArray) > 0 {
									result = append(result, strArray)
								}
							}
						}
					}

					compacted := core.Compact(result)
					return runtime.ToValue(compacted)
				}
			}

			return call.Arguments[0]
		})

		return instance
	}

	return runtime.ToValue(pinyinClass)
}

// parseOptions 解析选项对象
func parseOptions(runtime *goja.Runtime, optsObj *goja.Object) core.Options {
	opts := core.DefaultOptions()

	// style 选项
	if styleVal := optsObj.Get("style"); styleVal != nil && !goja.IsUndefined(styleVal) && !goja.IsNull(styleVal) {
		opts.Style = parseStyle(styleVal)
	}

	// heteronym 选项
	if hetVal := optsObj.Get("heteronym"); hetVal != nil && !goja.IsUndefined(hetVal) && !goja.IsNull(hetVal) {
		opts.Heteronym = hetVal.ToBoolean()
	}

	// segment 选项 - 支持 boolean 和 string
	if segVal := optsObj.Get("segment"); segVal != nil && !goja.IsUndefined(segVal) && !goja.IsNull(segVal) {
		// 如果是字符串类型 (如 "segmentit", "Intl.Segmenter")
		if segStr := segVal.String(); segStr != "" && segStr != "false" && segStr != "undefined" {
			// 任何非空字符串都视为启用分词
			opts.Segment = true
		} else {
			// boolean 类型
			opts.Segment = segVal.ToBoolean()
		}
	}

	// mode 选项
	if modeVal := optsObj.Get("mode"); modeVal != nil && !goja.IsUndefined(modeVal) && !goja.IsNull(modeVal) {
		opts.Mode = parseMode(modeVal)
	}

	// group 选项
	if groupVal := optsObj.Get("group"); groupVal != nil && !goja.IsUndefined(groupVal) && !goja.IsNull(groupVal) {
		opts.Group = groupVal.ToBoolean()
	}

	// compact 选项
	if compactVal := optsObj.Get("compact"); compactVal != nil && !goja.IsUndefined(compactVal) && !goja.IsNull(compactVal) {
		opts.Compact = compactVal.ToBoolean()
	}

	return opts
}

// convertWithSmartSegmentation 使用智能分词进行拼音转换
// 先用分词器（轻量级或 GSE）分词，然后逐词转换拼音
// 🎯 100% 兼容 npm pinyin v4 的 segment_pinyin 逻辑
func convertWithSmartSegmentation(text string, opts core.Options) [][]string {
	if text == "" {
		return [][]string{}
	}

	// 🔥 获取统一分词器（默认使用轻量级分词器，内存占用几乎为 0）
	segmenter := GetUnifiedSegmenter()

	// 使用分词器进行分词
	words := segmenter.SegmentForPinyin(text)

	if len(words) == 0 {
		return [][]string{}
	}

	// 逐词转换拼音
	result := make([][]string, 0, len(text))

	// 临时禁用 segment 选项，避免递归调用词组匹配
	// 但保留 heteronym 等其他选项
	optsForWord := opts
	optsForWord.Segment = false
	optsForWord.Compact = false // ⭐ 临时禁用 Compact（将在最后应用）

	for _, word := range words {
		// ⭐ 核心修复：模拟 JS 的 segment_pinyin 逻辑
		// JS 原版：
		//   const newPys = words.length === 1
		//       ? this.normal_pinyin(words, options)    // 单字 → 逐字转换
		//       : this.phrases_pinyin(words, options);  // 多字 → 词组转换
		var wordPinyin [][]string

		runes := []rune(word)
		if len(runes) == 1 {
			// ⭐ 单字词：使用 normal_pinyin 逻辑（逐字转换）
			// 在 Go 中，单字词直接用 Convert 即可（因为 Segment=false）
			wordPinyin = core.Convert(word, optsForWord)
		} else {
			// ⭐ 多字词：使用 phrases_pinyin 逻辑（词组转换）
			// 新的 ConvertPhrase 函数实现了与 JS phrases_pinyin 完全一致的逻辑：
			//   1. 先查词组字典
			//   2. 不在字典则逐字转换（兜底）
			wordPinyin = core.ConvertPhrase(word, optsForWord)
		}

		if opts.Group {
			// group 模式：将整个词的拼音合并为一组
			// ⭐ 与 JS 的 groupPhrases 逻辑一致
			if len(wordPinyin) > 1 {
				// 多字词：需要组合多音字的所有可能组合
				// 例如：["银","行"] → [["yín"],["háng","xíng"]] → ["yínháng","yínxíng"]
				combinations := core.CartesianProduct(wordPinyin)
				// 将每个组合连接（不用空格，与 npm pinyin v4 兼容）
				groupedOptions := make([]string, 0, len(combinations))
				for _, combo := range combinations {
					joined := strings.Join(combo, "") // npm v4: "zhōngguó" 而不是 "zhōng guó"
					groupedOptions = append(groupedOptions, joined)
				}
				result = append(result, groupedOptions)
			} else if len(wordPinyin) == 1 {
				// 单字词：直接添加
				// JS: if (phrases.length === 1) { return phrases[0]; }
				result = append(result, wordPinyin[0])
			}
		} else {
			// 非 group 模式：逐字添加
			result = append(result, wordPinyin...)
		}
	}

	// ⭐ 应用 style 转换（必须在 Compact 之前）
	// 这一步在之前的修复中被遗漏了，导致 style 选项不生效
	result = style.Convert2DArray(result, opts.Style)

	// ⭐ P0-2 修复：在这里应用 Compact（而不是在 Convert 内部）
	// JS 原版在主函数最后应用：
	//   if (options?.compact) {
	//       pys = compact(pys);
	//   }
	if opts.Compact && opts.Heteronym {
		result = core.CartesianProduct(result)
	}

	return result
}

// parseStyle 解析拼音风格
func parseStyle(val goja.Value) style.Style {
	// 先尝试作为字符串
	strVal := strings.ToLower(val.String())
	switch strVal {
	case "normal", "0":
		return style.StyleNormal
	case "tone", "1":
		return style.StyleTone
	case "tone2", "2":
		return style.StyleTone2
	case "to3ne", "tone3", "5":
		return style.StyleTone3
	case "initials", "3":
		return style.StyleInitials
	case "first_letter", "4":
		return style.StyleFirstLetter
	case "passport", "6":
		return style.StylePassport
	}

	// 尝试作为整数
	intVal := val.ToInteger()
	if intVal >= 0 && intVal <= 6 {
		return style.Style(intVal)
	}

	// 默认值
	return style.StyleTone
}

// parseMode 解析拼音模式
func parseMode(val goja.Value) core.Mode {
	// 先尝试作为字符串
	strVal := strings.ToLower(val.String())
	switch strVal {
	case "normal", "0":
		return core.ModeNormal
	case "surname", "1":
		return core.ModeSurname
	}

	// 尝试作为整数
	if intVal := val.ToInteger(); intVal >= 0 && intVal <= 1 {
		return core.Mode(intVal)
	}

	// 默认值
	return core.ModeNormal
}
