package enhance_modules

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"reflect"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/eventloop"
	"github.com/dop251/goja_nodejs/require"
)

// NodeFormDataModule Node.js form-data 模块
// 提供与 Node.js form-data 包兼容的 API
type NodeFormDataModule struct {
	fetchEnhancer *FetchEnhancer // 共享 FetchEnhancer 的配置和基础设施
}

// NewNodeFormDataModule 创建 Node.js FormData 模块
func NewNodeFormDataModule(fetchEnhancer *FetchEnhancer) *NodeFormDataModule {
	return &NodeFormDataModule{
		fetchEnhancer: fetchEnhancer,
	}
}

// RegisterFormDataModule 注册 form-data 模块到 require 系统
func RegisterFormDataModule(registry *require.Registry, fetchEnhancer *FetchEnhancer) {
	module := NewNodeFormDataModule(fetchEnhancer)

	registry.RegisterNativeModule("form-data", func(runtime *goja.Runtime, moduleObj *goja.Object) {
		// 创建 FormData 构造函数
		constructor := module.createFormDataConstructor(runtime)

		// 导出构造函数
		moduleObj.Set("exports", constructor)
	})
}

// createFormDataConstructor 创建 FormData 构造函数
func (nfm *NodeFormDataModule) createFormDataConstructor(runtime *goja.Runtime) goja.Value {
	constructor := func(call goja.ConstructorCall) *goja.Object {
		// 创建底层的 StreamingFormData 实例
		config := DefaultFormDataStreamConfig()
		if nfm.fetchEnhancer != nil && nfm.fetchEnhancer.formDataConfig != nil {
			config = nfm.fetchEnhancer.formDataConfig
		}
		streamingFormData := NewStreamingFormData(config)
		if streamingFormData == nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to create StreamingFormData instance")))
		}

		// 创建 FormData 对象
		formDataObj := runtime.NewObject()

		// 设置类型标识（区分 Node.js FormData 和浏览器 FormData）
		formDataObj.Set("__isNodeFormData", true)
		formDataObj.Set("__isFormData", false) // 不是浏览器版本
		formDataObj.Set("__type", "nodejs-formdata")

		// === 核心方法实现 ===

		// append(name, value, filename|options?) - 添加字段
		// 支持两种签名：
		// 1. append(name, value, filename) - filename 作为字符串
		// 2. append(name, value, options) - options 对象 {filename, contentType, knownLength}
		formDataObj.Set("append", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("FormData.append requires at least 2 arguments"))
			}

			name := call.Arguments[0].String()
			value := call.Arguments[1]

			var filename string
			var contentType string

			// 解析第三个参数（filename 或 options 对象）
			if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) {
				thirdArg := call.Arguments[2]

				// 尝试转换为对象，检查是否是 options 对象
				if obj := thirdArg.ToObject(runtime); obj != nil {
					filenameVal := obj.Get("filename")

					// 如果有 filename 属性，则是 options 对象
					if filenameVal != nil && !goja.IsUndefined(filenameVal) && !goja.IsNull(filenameVal) {
						filename = filenameVal.String()

						// 检查 contentType
						if contentTypeVal := obj.Get("contentType"); contentTypeVal != nil && !goja.IsUndefined(contentTypeVal) && !goja.IsNull(contentTypeVal) {
							contentType = contentTypeVal.String()
						}
					} else {
						// 没有 filename 属性，当作字符串处理
						filename = thirdArg.String()
					}
				} else {
					// 转换失败，直接当作字符串
					filename = thirdArg.String()
				}
			}

			// 处理不同类型的 value
			if err := nfm.handleAppend(runtime, streamingFormData, name, value, filename, contentType); err != nil {
				panic(runtime.NewGoError(err))
			}
			return goja.Undefined()
		})

		// getHeaders() - 获取 headers 对象（包含正确的 boundary）
		formDataObj.Set("getHeaders", func(call goja.FunctionCall) goja.Value {
			headers := runtime.NewObject()
			contentType := fmt.Sprintf("multipart/form-data; boundary=%s", streamingFormData.boundary)
			headers.Set("content-type", contentType)
			return headers
		})

		// getBoundary() - 获取边界字符串
		formDataObj.Set("getBoundary", func(call goja.FunctionCall) goja.Value {
			return runtime.ToValue(streamingFormData.boundary)
		})

		// setBoundary(boundary) - 设置自定义边界
		formDataObj.Set("setBoundary", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("setBoundary requires a boundary string"))
			}
			boundary := call.Arguments[0].String()
			streamingFormData.boundary = boundary
			return goja.Undefined()
		})

		// getLengthSync() - 同步获取内容长度
		formDataObj.Set("getLengthSync", func(call goja.FunctionCall) goja.Value {
			totalSize := streamingFormData.GetTotalSize()
			return runtime.ToValue(totalSize)
		})

		// getLength(callback) - 异步获取长度（通过 Promise）
		formDataObj.Set("getLength", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				// 返回 Promise（如果没有 callback）
				promise, resolve, _ := runtime.NewPromise()
				totalSize := streamingFormData.GetTotalSize()
				resolve(runtime.ToValue(totalSize))
				return runtime.ToValue(promise)
			}

			callback, ok := goja.AssertFunction(call.Arguments[0])
			if !ok {
				panic(runtime.NewTypeError("getLength requires a callback function"))
			}

			// 同步计算长度
			totalSize := streamingFormData.GetTotalSize()

			// Node.js form-data 标准：callback(err, length) - 只有2个参数
			// 🔥 修复：callback(thisObj, arg1, arg2...) - 第一个参数是 this
			callback(goja.Undefined(), goja.Null(), runtime.ToValue(totalSize))

			return goja.Undefined()
		})

		// getBuffer() - 获取完整的 multipart/form-data Buffer
		// 🔥 关键方法：用于与 fetch API 集成
		formDataObj.Set("getBuffer", func(call goja.FunctionCall) goja.Value {
			// 创建 Reader 并读取所有数据
			reader, err := streamingFormData.CreateReader()
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("failed to create reader: %w", err)))
			}

			// 读取所有数据到 Buffer
			var buf bytes.Buffer
			if _, err := io.Copy(&buf, reader); err != nil {
				panic(runtime.NewGoError(fmt.Errorf("failed to read form data: %w", err)))
			}

			// 转换为 goja Buffer
			bufferConstructor := runtime.Get("Buffer")
			if goja.IsUndefined(bufferConstructor) || goja.IsNull(bufferConstructor) {
				panic(runtime.NewTypeError("Buffer is not available"))
			}

			bufferObj := bufferConstructor.ToObject(runtime)
			if bufferObj == nil {
				panic(runtime.NewTypeError("Failed to convert Buffer to object"))
			}

			fromFunc, ok := goja.AssertFunction(bufferObj.Get("from"))
			if !ok {
				panic(runtime.NewTypeError("Buffer.from is not available"))
			}

			// 创建 Uint8Array
			arrayBuffer := runtime.NewArrayBuffer(buf.Bytes())
			result, err := fromFunc(bufferObj, runtime.ToValue(arrayBuffer))
			if err != nil {
				panic(runtime.NewGoError(err))
			}

			return result
		})

		// _getStreamingFormData() - 内部方法，返回底层 StreamingFormData 对象
		// 🔥 用于 fetch API 直接访问流式对象（高效方案）
		formDataObj.Set("_getStreamingFormData", func(call goja.FunctionCall) goja.Value {
			// 返回一个包装对象，暴露必要的方法
			wrapper := runtime.NewObject()

			wrapper.Set("createReader", func(call goja.FunctionCall) goja.Value {
				// 这个方法在 Go 侧被 fetch_enhancement.go 调用
				// 不需要返回 JavaScript 值
				return goja.Undefined()
			})

			wrapper.Set("getContentType", func(call goja.FunctionCall) goja.Value {
				contentType := fmt.Sprintf("multipart/form-data; boundary=%s", streamingFormData.boundary)
				return runtime.ToValue(contentType)
			})

			wrapper.Set("getBoundary", func(call goja.FunctionCall) goja.Value {
				return runtime.ToValue(streamingFormData.boundary)
			})

			// 存储原始 StreamingFormData 引用（Go 侧访问）
			wrapper.Set("__goStreamingFormData", streamingFormData)

			return wrapper
		})

		// _getGoStreamingFormData() - 直接返回 Go 对象（供 fetch 使用）
		formDataObj.Set("__getGoStreamingFormData", streamingFormData)

		// submit(url, callback?) - 提交表单到指定 URL
		// 🔥 使用内部 fetch API 实现
		formDataObj.Set("submit", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("submit requires a URL"))
			}

			url := call.Arguments[0].String()
			var callback goja.Callable
			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
				var ok bool
				callback, ok = goja.AssertFunction(call.Arguments[1])
				if !ok {
					panic(runtime.NewTypeError("callback must be a function"))
				}
			}

			// 使用 fetch API 发送请求
			fetchFunc := runtime.Get("fetch")
			if goja.IsUndefined(fetchFunc) {
				panic(runtime.NewTypeError("fetch is not available"))
			}

			fetch, ok := goja.AssertFunction(fetchFunc)
			if !ok {
				panic(runtime.NewTypeError("fetch is not a function"))
			}

			// 构建 fetch 选项
			options := runtime.NewObject()
			options.Set("method", "POST")
			options.Set("body", formDataObj)

			// 调用 fetch
			result, err := fetch(goja.Undefined(), runtime.ToValue(url), options)
			if err != nil {
				if callback != nil {
					// 错误应该作为 Error 对象传递
					// 🔥 修复：callback(thisObj, arg1, arg2...) - 第一个参数是 this
					callback(goja.Undefined(), runtime.NewGoError(err), goja.Null())
				} else {
					panic(runtime.NewGoError(err))
				}
				return goja.Undefined()
			}

			// 如果有回调，处理响应
			if callback != nil {
				// 假设 result 是 Promise
				promise := result.ToObject(runtime)

				// 🔥 修复：分别设置 .then() 和 .catch()
				thenFunc, ok := goja.AssertFunction(promise.Get("then"))
				if ok {
					// 调用 .then(callback_success)
					promise2Val, _ := thenFunc(promise, runtime.ToValue(func(response goja.Value) goja.Value {
						// 成功：callback(null, response)
						callback(goja.Undefined(), goja.Null(), response)
						return goja.Undefined()
					}))

					// 调用 .catch(callback_error)
					if promise2 := promise2Val.ToObject(runtime); promise2 != nil {
						if catchFunc, ok := goja.AssertFunction(promise2.Get("catch")); ok {
							catchFunc(promise2, runtime.ToValue(func(err goja.Value) goja.Value {
								// 失败：callback(err, null)
								callback(goja.Undefined(), err, goja.Null())
								return goja.Undefined()
							}))
						}
					}
				}
				return goja.Undefined()
			}

			return result
		})

		// 设置原型链（支持 instanceof 检查）
		if call.This != nil {
			proto := call.This.Prototype()
			if proto != nil {
				formDataObj.SetPrototype(proto)
			}
		}

		return formDataObj
	}

	return runtime.ToValue(constructor)
}

// handleAppend 处理 append 方法的不同值类型
func (nfm *NodeFormDataModule) handleAppend(runtime *goja.Runtime, streamingFormData *StreamingFormData, name string, value goja.Value, filename, contentType string) error {
	// 安全检查
	if nfm == nil {
		return fmt.Errorf("nfm is nil")
	}
	if runtime == nil {
		return fmt.Errorf("runtime is nil")
	}
	if streamingFormData == nil {
		return fmt.Errorf("streamingFormData is nil")
	}

	// 先检查 null/undefined（在 ToObject 之前，避免 panic）
	if goja.IsNull(value) || goja.IsUndefined(value) {
		nfm.appendField(streamingFormData, name, "")
		return nil
	}

	// 关键修复：先转换为对象，不要先 Export（Export 会破坏 Blob/File 对象）
	obj := value.ToObject(runtime)

	// 1. 优先处理对象类型（File、Blob、Buffer）
	if obj != nil {
		// 1.1 检查 File（最优先，因为 File 继承自 Blob，必须先检查）
		isFile := obj.Get("__isFile")
		if !goja.IsUndefined(isFile) && isFile != nil && isFile.ToBoolean() {
			if nfm.fetchEnhancer == nil {
				return fmt.Errorf("fetchEnhancer is nil")
			}

			data, contentTypeFromFile, filenameFromFile, err := nfm.fetchEnhancer.extractFileData(obj)
			if err == nil {
				if filename == "" {
					filename = filenameFromFile
				}
				if filename == "" {
					filename = "file"
				}
				if contentType == "" {
					contentType = contentTypeFromFile
				}
				if contentType == "" {
					contentType = "application/octet-stream"
				}
				nfm.appendFile(streamingFormData, name, filename, contentType, data)
				return nil
			}
		}

		// 1.2 检查 Blob
		isBlob := obj.Get("__isBlob")
		if !goja.IsUndefined(isBlob) && isBlob != nil && isBlob.ToBoolean() {
			if nfm.fetchEnhancer == nil {
				return fmt.Errorf("fetchEnhancer is nil")
			}

			data, contentTypeFromBlob, err := nfm.fetchEnhancer.extractBlobData(obj)
			if err == nil {
				if filename == "" {
					filename = "blob"
				}
				if contentType == "" {
					contentType = contentTypeFromBlob
				}
				if contentType == "" {
					contentType = "application/octet-stream"
				}
				nfm.appendFile(streamingFormData, name, filename, contentType, data)
				return nil
			}
		}

		// 1.3 检查 Buffer（通过 length 属性 + 索引访问）
		lengthVal := obj.Get("length")
		if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			// 先排除字符串类型（字符串也有 length 和索引访问）
			if value.ExportType().Kind() != reflect.String {
				// 还要检查是否可以通过索引访问（排除普通数字、字符串对象）
				firstByte := obj.Get("0")
				if firstByte != nil && !goja.IsUndefined(firstByte) && !goja.IsNull(firstByte) {
					// Panic 防护：extractBufferData 可能会 panic
					var data []byte
					var ok bool
					func() {
						defer func() {
							if r := recover(); r != nil {
								ok = false
							}
						}()
						data, ok = nfm.extractBufferData(runtime, obj)
					}()

					if ok && len(data) > 0 {
						if filename == "" {
							filename = "blob"
						}
						if contentType == "" {
							contentType = "application/octet-stream"
						}
						nfm.appendFile(streamingFormData, name, filename, contentType, data)
						return nil
					}
				}
			}
		}
	}

	// 2. 最后才 Export 处理基本类型（避免破坏对象结构）
	exported := value.Export()

	switch v := exported.(type) {
	case string:
		// 字符串类型 - 作为文本字段
		nfm.appendField(streamingFormData, name, v)
		return nil
	case int, int32, int64, float32, float64, bool:
		// 数字和布尔类型
		nfm.appendField(streamingFormData, name, fmt.Sprintf("%v", v))
		return nil
	case []uint8:
		// []byte 类型 - 直接作为文件
		if filename == "" {
			filename = "blob"
		}
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		nfm.appendFile(streamingFormData, name, filename, contentType, v)
		return nil
	}

	// 3. 兜底处理：转换为字符串
	var strValue string
	if value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		strValue = ""
	} else {
		strValue = fmt.Sprintf("%v", exported)
	}

	nfm.appendField(streamingFormData, name, strValue)
	return nil
}

// appendField 添加文本字段到 StreamingFormData
func (nfm *NodeFormDataModule) appendField(streamingFormData *StreamingFormData, name, value string) {
	if streamingFormData == nil {
		return
	}

	entry := FormDataEntry{
		Name:  name,
		Value: value,
	}

	// 检查 entries 是否为 nil
	if streamingFormData.entries == nil {
		streamingFormData.entries = make([]FormDataEntry, 0)
	}

	streamingFormData.entries = append(streamingFormData.entries, entry)

	// 更新总大小估算
	streamingFormData.totalSize += int64(len(name) + len(value) + 100) // 100 字节为 header 开销
}

// appendFile 添加文件字段到 StreamingFormData
func (nfm *NodeFormDataModule) appendFile(streamingFormData *StreamingFormData, name, filename, contentType string, data []byte) {
	if streamingFormData == nil {
		return
	}

	entry := FormDataEntry{
		Name:        name,
		Value:       data,
		Filename:    filename,
		ContentType: contentType,
	}

	// 检查 entries 是否为 nil
	if streamingFormData.entries == nil {
		streamingFormData.entries = make([]FormDataEntry, 0)
	}

	streamingFormData.entries = append(streamingFormData.entries, entry)

	// 更新总大小估算
	streamingFormData.totalSize += int64(len(name) + len(filename) + len(contentType) + len(data) + 200) // 200 字节为 header 开销
}

// extractBufferData 从 Buffer 对象提取字节数据
func (nfm *NodeFormDataModule) extractBufferData(runtime *goja.Runtime, bufferObj *goja.Object) ([]byte, bool) {
	// 安全检查
	if bufferObj == nil || runtime == nil {
		return nil, false
	}

	// 尝试获取 Buffer 的底层数据
	lengthVal := bufferObj.Get("length")
	if goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
		return nil, false
	}

	length := int(lengthVal.ToInteger())
	if length == 0 {
		return []byte{}, true
	}

	// 优化：尝试使用 toJSON() 方法（更高效）
	toJSONFunc := bufferObj.Get("toJSON")
	if !goja.IsUndefined(toJSONFunc) {
		if toJSON, ok := goja.AssertFunction(toJSONFunc); ok {
			result, err := toJSON(bufferObj)
			if err == nil && !goja.IsUndefined(result) {
				resultObj := result.ToObject(runtime)
				if resultObj != nil {
					// toJSON() 返回 { type: 'Buffer', data: [...] }
					dataVal := resultObj.Get("data")
					if !goja.IsUndefined(dataVal) {
						dataObj := dataVal.ToObject(runtime)
						if dataObj != nil {
							// 提取 data 数组
							dataLen := dataObj.Get("length")
							if !goja.IsUndefined(dataLen) {
								arrayLen := int(dataLen.ToInteger())
								data := make([]byte, arrayLen)
								for i := 0; i < arrayLen; i++ {
									val := dataObj.Get(fmt.Sprintf("%d", i))
									if !goja.IsUndefined(val) && !goja.IsNull(val) {
										data[i] = byte(val.ToInteger())
									}
								}
								return data, true
							}
						}
					}
				}
			}
		}
	}

	// 降级方案：逐字节读取（兼容性更好，但效率较低）
	data := make([]byte, length)
	for i := 0; i < length; i++ {
		val := bufferObj.Get(fmt.Sprintf("%d", i))
		if goja.IsUndefined(val) || goja.IsNull(val) {
			data[i] = 0
		} else {
			data[i] = byte(val.ToInteger())
		}
	}

	return data, true
}

// RegisterFormDataModuleWithEventLoop 使用 EventLoop 注册模块（支持异步操作）
func RegisterFormDataModuleWithEventLoop(loop *eventloop.EventLoop, registry *require.Registry, fetchEnhancer *FetchEnhancer) {
	module := NewNodeFormDataModule(fetchEnhancer)

	registry.RegisterNativeModule("form-data", func(runtime *goja.Runtime, moduleObj *goja.Object) {
		// 创建 FormData 构造函数（支持异步）
		constructor := module.createFormDataConstructor(runtime)

		// 导出构造函数
		moduleObj.Set("exports", constructor)

		log.Println("✅ Node.js form-data 模块已注册（支持 EventLoop）")
	})
}

// isNodeFormData 检查对象是否为 Node.js FormData
// 🔥 辅助方法：提供更安全的类型检查
func isNodeFormData(obj *goja.Object) bool {
	if obj == nil {
		return false
	}
	val := obj.Get("__isNodeFormData")
	return !goja.IsUndefined(val) && !goja.IsNull(val) && val.ToBoolean()
}
