package fetch

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	neturl "net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"flow-codeblock-go/enhance_modules/internal/blob"
	"flow-codeblock-go/enhance_modules/internal/body"
	"flow-codeblock-go/enhance_modules/internal/formdata"
	"flow-codeblock-go/enhance_modules/internal/ssrf"
	"flow-codeblock-go/enhance_modules/internal/streams"
	"flow-codeblock-go/enhance_modules/internal/transport"
	"flow-codeblock-go/enhance_modules/internal/url"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

const readableStreamConsumerJS = `
(function (global) {
  if (typeof global.__flowConsumeReadableStream === 'function') {
    return;
  }
  function normalizeChunk(value) {
    if (value == null) {
      return new Uint8Array(0);
    }
    if (value instanceof Uint8Array) {
      return value;
    }
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    if (typeof value === 'string') {
      if (typeof TextEncoder === 'undefined') {
        var arr = new Uint8Array(value.length);
        for (var i = 0; i < value.length; i++) {
          arr[i] = value.charCodeAt(i) & 255;
        }
        return arr;
      }
      return new TextEncoder().encode(value);
    }
    return normalizeChunk(String(value));
  }
  async function collect(stream) {
    if (!stream || typeof stream.getReader !== 'function') {
      throw new TypeError('Body is not a ReadableStream');
    }
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        const chunk = normalizeChunk(value);
        if (chunk.length > 0) {
          chunks.push(chunk);
          total += chunk.length;
        }
      }
    } finally {
      if (reader && typeof reader.releaseLock === 'function') {
        reader.releaseLock();
      }
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
  global.__flowConsumeReadableStream = function (stream, mode) {
    return (async () => {
      const bytes = await collect(stream);
      if (mode === 'arrayBuffer') {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      }
      if (mode === 'blob') {
        return new Blob([bytes]);
      }
      const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;
      const text = decoder
        ? decoder.decode(bytes)
        : Array.prototype.map.call(bytes, function (ch) { return String.fromCharCode(ch); }).join('');
      if (mode === 'json') {
        return JSON.parse(text || '');
      }
      return text;
    })();
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
`

// ==================== FetchEnhancer ====================

// FetchEnhancer Fetch 增强器（集成所有功能）
// 🔥 核心组件：
// - config: 配置管理器（超时、大小限制等）
// - client: HTTP 客户端（连接池、超时等）
// - bodyHandler: Body 类型处理器（TypedArray、URLSearchParams 等）
//
// 设计说明:
// 1. **统一入口**:
//   - RegisterFetchAPI: 注册所有 API 到 goja Runtime
//   - fetch: 主方法（处理 URL、Request、options）
//
// 2. **模块化集成**:
//   - 使用 internal 包的实现（ssrf、formdata、body、blob、url）
//   - 使用 fetch 包的组件（config、security、constructors 等）
//   - 保持零依赖倒置（internal <- fetch <- root adapter）
//
// 3. **Promise 驱动**:
//   - EventLoop 模式：使用 setImmediate 轮询
//   - Runtime Pool 模式：同步等待结果
//
// 4. **类型系统**:
//   - Headers: 请求和响应头部对象
//   - Request: 请求构造器
//   - Response: 响应对象（支持 clone）
//   - AbortController: 请求取消控制器
//   - FormData: 浏览器兼容的 FormData API
//   - Blob/File: 二进制数据对象
//   - URLSearchParams: URL 查询参数对象
type FetchEnhancer struct {
	config      *FetchConfig          // 配置管理器
	client      *http.Client          // HTTP 客户端
	bodyHandler *body.BodyTypeHandler // Body 类型处理器
}

// ==================== 构造器 ====================

// NewFetchEnhancer 创建 Fetch 增强器（使用默认配置）
func NewFetchEnhancer() *FetchEnhancer {
	config := DefaultFetchConfig()
	return NewFetchEnhancerWithConfig(config)
}

// NewFetchEnhancerWithConfig 创建 Fetch 增强器（使用自定义配置）
func NewFetchEnhancerWithConfig(config *FetchConfig) *FetchEnhancer {
	if config == nil {
		config = DefaultFetchConfig()
	}

	// 🔥 创建带 SSRF 防护的 DialContext
	dialContext := ssrf.CreateProtectedDialContext(
		config.SSRFConfig,
		config.TransportConfig.DialTimeout,
		config.TransportConfig.KeepAlive,
	)

	// 🔥 创建 HTTP Transport（应用 TransportConfig 和 SSRF 防护）
	httpTransport := transport.CreateHTTPTransport(dialContext, config.TransportConfig)

	// 创建 HTTP 客户端（带连接池、超时、SSRF 防护）
	client := &http.Client{
		Timeout:   config.RequestTimeout,
		Transport: httpTransport,
	}

	// 创建 Body 类型处理器
	bodyHandler := body.NewBodyTypeHandler(config.MaxBlobFileSize)

	return &FetchEnhancer{
		config:      config,
		client:      client,
		bodyHandler: bodyHandler,
	}
}

// ==================== ModuleEnhancer 接口实现 ====================

// GetName 返回模块名称
func (fe *FetchEnhancer) GetName() string {
	return "fetch"
}

// Name 返回模块名称（ModuleEnhancer 接口）
func (fe *FetchEnhancer) Name() string {
	return fe.GetName()
}

// Register 注册模块到 require 系统（ModuleEnhancer 接口）
// 🔥 Fetch 模块不需要注册到 require，返回 nil
func (fe *FetchEnhancer) Register(registry *require.Registry) error {
	// Fetch 是全局 API，不需要 require()
	return nil
}

// Setup 在 Runtime 上设置全局对象（ModuleEnhancer 接口）
func (fe *FetchEnhancer) Setup(runtime *goja.Runtime) error {
	return fe.RegisterFetchAPI(runtime)
}

// Close 关闭模块并释放资源（ModuleEnhancer 接口）
// 🔥 Fetch 模块使用共享的 HTTP Client，不需要主动关闭
func (fe *FetchEnhancer) Close() error {
	// 主动关闭空闲连接，避免长时间测试场景下连接池占用内存不释放
	if fe != nil && fe.client != nil {
		if transport, ok := fe.client.Transport.(*http.Transport); ok && transport != nil {
			transport.CloseIdleConnections()
		}
	}
	return nil
}

// CleanupIdleConnections 主动清理底层 HTTP Client 的空闲连接
// 可在高频执行场景下按需调用，稳定容器内存占用
func (fe *FetchEnhancer) CleanupIdleConnections() {
	if fe == nil || fe.client == nil {
		return
	}
	if transport, ok := fe.client.Transport.(*http.Transport); ok && transport != nil {
		transport.CloseIdleConnections()
	}
}

// GetFormDataConfig 返回 FormData 配置（供 Node.js FormData 模块使用）
// 🔥 注意：返回的是配置副本，避免外部修改
func (fe *FetchEnhancer) GetFormDataConfig() *formdata.FormDataStreamConfig {
	if fe.config == nil || fe.config.FormDataConfig == nil {
		return formdata.DefaultFormDataStreamConfig()
	}
	// 返回副本，避免外部修改
	config := *fe.config.FormDataConfig
	return &config
}

// RegisterFetchAPI 注册 Fetch API 到 Runtime
// 🔥 对外接口：供 module_enhancer.go 调用
func (fe *FetchEnhancer) RegisterFetchAPI(runtime *goja.Runtime) error {
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}

	// 1. 注册 fetch 主方法
	runtime.Set("fetch", fe.createFetchFunction(runtime))

	// 注册 Event/EventTarget，确保 AbortSignal 继承关系
	runtime.Set("EventTarget", CreateEventTargetConstructor(runtime))
	runtime.Set("Event", CreateEventConstructor(runtime))

	// 确保 queueMicrotask 存在（Node 标准行为）
	if err := ensureQueueMicrotask(runtime); err != nil {
		return fmt.Errorf("注册 queueMicrotask 失败: %w", err)
	}

	// ReadableStream 是 Blob/Response.body 所依赖的全局构造器，Goja 需要手动补齐
	if err := streams.EnsureReadableStream(runtime); err != nil {
		return fmt.Errorf("注册 ReadableStream 失败: %w", err)
	}

	// 2. 注册 Headers 构造器
	runtime.Set("Headers", CreateHeadersConstructor(runtime))
	ensureHeadersPrototypeToStringTag(runtime)

	// 3. 注册 Request 构造器
	runtime.Set("Request", CreateRequestConstructor(runtime, fe))

	// 3.5 注册 Response 构造器
	runtime.Set("Response", fe.createResponseConstructor(runtime))
	if err := fe.attachResponseStaticMethods(runtime); err != nil {
		return fmt.Errorf("注册 Response 静态方法失败: %w", err)
	}

	// 4. 注册 AbortSignal 构造函数（必须在 AbortController 之前，因为需要初始化 prototype）
	runtime.Set("AbortSignal", CreateAbortSignalConstructor(runtime))

	// 5. 注册 AbortController 构造器
	nativeAbortController := CreateAbortControllerConstructor(runtime)
	runtime.Set("AbortController", WrapAbortController(runtime, nativeAbortController))

	// 6. 注册 DOMException 构造器
	runtime.Set("DOMException", CreateDOMExceptionConstructor(runtime))

	// 7. 注册 FormData 构造器
	runtime.Set("FormData", CreateFormDataConstructor(runtime))
	ensureFormDataPrototypeToStringTag(runtime)

	// 8. 注册 Blob/File 构造器
	if err := blob.RegisterBlobFileConstructors(runtime, fe.config.MaxBlobFileSize); err != nil {
		return fmt.Errorf("注册 Blob/File 构造器失败: %w", err)
	}

	// 9. 注册 URLSearchParams 构造器
	if err := url.RegisterURLSearchParams(runtime); err != nil {
		return fmt.Errorf("注册 URLSearchParams 构造器失败: %w", err)
	}

	return nil
}

// createResponseConstructor 创建 Response 构造器（与 WHATWG Fetch 规范保持一致）
func (fe *FetchEnhancer) createResponseConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
	return func(call goja.ConstructorCall) *goja.Object {
		responseData, err := fe.buildResponseDataFromConstructor(runtime, call)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}
		respVal := fe.recreateResponse(runtime, responseData)
		return respVal.ToObject(runtime)
	}
}

func (fe *FetchEnhancer) attachResponseStaticMethods(runtime *goja.Runtime) error {
	constructorVal := runtime.Get("Response")
	if constructorVal == nil || goja.IsUndefined(constructorVal) || goja.IsNull(constructorVal) {
		return fmt.Errorf("Response 构造器未注册")
	}

	constructorObj := constructorVal.ToObject(runtime)
	if constructorObj == nil {
		return fmt.Errorf("Response 构造器不可用")
	}

	constructorObj.Set("error", func(call goja.FunctionCall) goja.Value {
		data := &ResponseData{
			StatusCode:    0,
			Status:        "",
			Headers:       http.Header{},
			Body:          []byte{},
			IsStreaming:   false,
			FinalURL:      "",
			Redirected:    false,
			ResponseType:  "error",
			ContentLength: 0,
		}
		return fe.recreateResponse(runtime, data)
	})

	constructorObj.Set("redirect", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 || goja.IsUndefined(call.Arguments[0]) || goja.IsNull(call.Arguments[0]) {
			panic(runtime.NewTypeError("Response.redirect 需要 url 参数"))
		}

		locationVal := call.Arguments[0]
		location := locationVal.String()
		if strings.TrimSpace(location) == "" {
			panic(runtime.NewTypeError("Response.redirect 需要有效的 url"))
		}

		if parsed, err := neturl.ParseRequestURI(location); err != nil || !parsed.IsAbs() {
			panic(runtime.NewTypeError(fmt.Sprintf("Failed to parse URL from %s", location)))
		}

		status := 302
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			status = int(call.Arguments[1].ToInteger())
		}

		if !isValidResponseRedirectStatus(status) {
			panic(runtime.NewTypeError(fmt.Sprintf("Response.redirect: %d is not a redirect status", status)))
		}

		headers := http.Header{}
		headers.Set("Location", location)

		data := &ResponseData{
			StatusCode:    status,
			Status:        "",
			Headers:       headers,
			Body:          []byte{},
			IsStreaming:   false,
			FinalURL:      "",
			Redirected:    false,
			ResponseType:  "default",
			ContentLength: 0,
		}
		return fe.recreateResponse(runtime, data)
	})

	constructorObj.Set("json", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Response.json: 1 argument required, but 0 found."))
		}

		jsonVal := call.Arguments[0]
		jsonObjVal := runtime.Get("JSON")
		if jsonObjVal == nil || goja.IsUndefined(jsonObjVal) || goja.IsNull(jsonObjVal) {
			panic(runtime.NewTypeError("JSON object is not available"))
		}

		jsonObj := jsonObjVal.ToObject(runtime)
		if jsonObj == nil {
			panic(runtime.NewTypeError("JSON object is not available"))
		}

		stringifyVal := jsonObj.Get("stringify")
		stringifyFunc, ok := goja.AssertFunction(stringifyVal)
		if !ok {
			panic(runtime.NewTypeError("JSON.stringify is not callable"))
		}

		jsonStrVal, err := stringifyFunc(jsonObj, jsonVal)
		if err != nil {
			panic(err)
		}
		if jsonStrVal == nil || goja.IsUndefined(jsonStrVal) {
			panic(runtime.NewTypeError("Value is not JSON serializable"))
		}

		bodyString := jsonStrVal.String()
		args := []goja.Value{runtime.ToValue(bodyString)}
		if len(call.Arguments) > 1 {
			args = append(args, call.Arguments[1])
		}

		responseData, err := fe.buildResponseDataFromConstructor(runtime, goja.ConstructorCall{
			This:      runtime.NewObject(),
			Arguments: args,
		})
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}

		if responseData.Headers == nil {
			responseData.Headers = make(http.Header)
		}
		if responseData.Headers.Get("Content-Type") == "" {
			responseData.Headers.Set("Content-Type", "application/json")
		}

		return fe.recreateResponse(runtime, responseData)
	})

	return nil
}

func isValidResponseRedirectStatus(status int) bool {
	switch status {
	case 301, 302, 303, 307, 308:
		return true
	default:
		return false
	}
}

func (fe *FetchEnhancer) buildResponseDataFromConstructor(runtime *goja.Runtime, call goja.ConstructorCall) (*ResponseData, error) {
	status := 200
	statusText := ""
	headers := make(http.Header)
	var bodyBytes []byte
	var contentType string
	var hasBody bool
	var jsReadableBody *goja.Object

	if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
		hasBody = true
		bodyVal := call.Arguments[0]
		fallbackStr := bodyVal.String()

		var bodyInput interface{}
		var handledSpecialBody bool

		if obj, ok := bodyVal.(*goja.Object); ok {
			bodyInput = obj
			if isReadableStreamObject(obj) {
				jsReadableBody = obj
			}

			if isFormDataObject(obj) {
				formBody, boundary, err := fe.extractFormDataInCurrentThread(runtime, obj)
				if err != nil {
					return nil, fmt.Errorf("提取 Response FormData 失败: %w", err)
				}
				bytes, err := convertFormDataBodyToBytes(formBody)
				if err != nil {
					return nil, fmt.Errorf("读取 Response FormData 失败: %w", err)
				}
				bodyBytes = append([]byte(nil), bytes...)
				handledSpecialBody = true
				if boundary != "" {
					contentType = fmt.Sprintf("multipart/form-data; boundary=%s", boundary)
				} else {
					contentType = "multipart/form-data"
				}
			} else if isNodeFormDataObject(obj) {
				bytes, boundary, err := fe.convertNodeFormDataToBytes(runtime, obj)
				if err != nil {
					return nil, fmt.Errorf("提取 Node.js FormData 失败: %w", err)
				}
				bodyBytes = append([]byte(nil), bytes...)
				handledSpecialBody = true
				if boundary != "" {
					contentType = fmt.Sprintf("multipart/form-data; boundary=%s", boundary)
				} else {
					contentType = "multipart/form-data"
				}
			}
		} else {
			bodyInput = bodyVal.Export()
		}

		if !handledSpecialBody {
			var (
				data   []byte
				reader io.Reader
				ct     string
				err    error
			)

			if jsReadableBody == nil && fe.bodyHandler != nil {
				data, reader, ct, err = fe.bodyHandler.ProcessBody(runtime, bodyInput)
				if err != nil {
					return nil, fmt.Errorf("处理 Response body 失败: %w", err)
				}

				if reader != nil {
					buffer, err := io.ReadAll(reader)
					if err != nil {
						return nil, fmt.Errorf("读取 Response body 失败: %w", err)
					}
					data = buffer
				}
			}

			switch {
			case jsReadableBody != nil:
				bodyBytes = nil
			case data != nil:
				bodyBytes = append([]byte(nil), data...)
			default:
				bodyBytes = []byte(fallbackStr)
			}

			contentType = ct
		}
	}

	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
		initObj := call.Arguments[1].ToObject(runtime)
		if initObj == nil {
			return nil, fmt.Errorf("Response init 必须是对象")
		}

		if statusVal := initObj.Get("status"); statusVal != nil {
			if !goja.IsUndefined(statusVal) {
				parsed := int(statusVal.ToInteger())
				if parsed < 200 || parsed > 599 || parsed == 101 {
					return nil, fmt.Errorf("Response status 必须在 200-599 且不能为 101")
				}
				status = parsed
			}
		}

		if statusTextVal := initObj.Get("statusText"); statusTextVal != nil && !goja.IsUndefined(statusTextVal) && !goja.IsNull(statusTextVal) {
			statusText = statusTextVal.String()
		}

		if headersVal := initObj.Get("headers"); headersVal != nil && !goja.IsUndefined(headersVal) && !goja.IsNull(headersVal) {
			if err := populateHeadersFromValue(runtime, headers, headersVal); err != nil {
				return nil, fmt.Errorf("解析 Response headers 失败: %w", err)
			}
		}
	}

	if hasBody && (status == 101 || status == 204 || status == 205 || status == 304) {
		return nil, fmt.Errorf("Response status %d 不允许包含 body", status)
	}

	if _, ok := headers["Content-Type"]; !ok && contentType != "" {
		headers.Set("Content-Type", contentType)
	}

	responseData := &ResponseData{
		StatusCode:    status,
		Status:        statusText,
		Headers:       headers,
		Body:          bodyBytes,
		IsStreaming:   false,
		FinalURL:      "",
		Redirected:    false,
		ResponseType:  "default",
		ContentLength: int64(len(bodyBytes)),
	}
	responseData.JSReadableBody = jsReadableBody

	return responseData, nil
}

func populateHeadersFromValue(runtime *goja.Runtime, headers http.Header, value goja.Value) error {
	if headers == nil || value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		return nil
	}

	opCtx := "Headers.append"

	if obj, ok := value.(*goja.Object); ok {
		if obj.ClassName() == "Array" {
			appendHTTPHeaderTuplesFromArray(runtime, opCtx, obj, headers)
			return nil
		}

		if forEach := obj.Get("forEach"); forEach != nil && !goja.IsUndefined(forEach) {
			if fn, ok := goja.AssertFunction(forEach); ok {
				callback := func(call goja.FunctionCall) goja.Value {
					if len(call.Arguments) >= 2 {
						name := call.Argument(1).String()
						addHTTPHeaderEntry(runtime, opCtx, headers, name, call.Argument(0).String())
					}
					return goja.Undefined()
				}
				if _, err := fn(obj, runtime.ToValue(callback)); err != nil {
					return err
				}
				return nil
			}
		}

		for _, key := range obj.Keys() {
			addHTTPHeaderEntry(runtime, opCtx, headers, key, obj.Get(key).String())
		}
		return nil
	}

	if exported := value.Export(); exported != nil {
		switch h := exported.(type) {
		case map[string]interface{}:
			for key, val := range h {
				addHTTPHeaderEntry(runtime, opCtx, headers, key, fmt.Sprintf("%v", val))
			}
		case []interface{}:
			appendHTTPHeaderTuplesFromSlice(runtime, opCtx, h, headers)
		}
	}

	return nil
}

func addHTTPHeaderEntry(runtime *goja.Runtime, ctx string, headers http.Header, name, value string) {
	if headers == nil {
		return
	}
	ensureValidHeaderName(runtime, ctx, name)
	normalized := normalizeHeaderValue(value)
	ensureValidHeaderValue(runtime, ctx, normalized)
	ensureASCIIHeaderValue(runtime, normalized)
	headers.Add(name, normalized)
}

func appendHTTPHeaderTuplesFromArray(runtime *goja.Runtime, ctx string, arrayObj *goja.Object, headers http.Header) {
	if arrayObj == nil {
		return
	}
	lengthVal := arrayObj.Get("length")
	length := int(lengthVal.ToInteger())
	for i := 0; i < length; i++ {
		entryVal := arrayObj.Get(fmt.Sprintf("%d", i))
		addHTTPHeaderTupleValue(runtime, ctx, entryVal, headers)
	}
}

func appendHTTPHeaderTuplesFromSlice(runtime *goja.Runtime, ctx string, entries []interface{}, headers http.Header) {
	for _, entry := range entries {
		addHTTPHeaderTupleFromExport(runtime, ctx, entry, headers)
	}
}

func addHTTPHeaderTupleValue(runtime *goja.Runtime, ctx string, val goja.Value, headers http.Header) {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return
	}
	if obj, ok := val.(*goja.Object); ok && obj.ClassName() == "Array" {
		lengthVal := obj.Get("length")
		length := int(lengthVal.ToInteger())
		if length != 2 {
			panic(runtime.NewTypeError(fmt.Sprintf("%s: header entry must contain exactly two items", ctx)))
		}
		key := obj.Get("0").String()
		value := obj.Get("1").String()
		addHTTPHeaderEntry(runtime, ctx, headers, key, value)
		return
	}
	addHTTPHeaderTupleFromExport(runtime, ctx, val.Export(), headers)
}

func addHTTPHeaderTupleFromExport(runtime *goja.Runtime, ctx string, entry interface{}, headers http.Header) {
	if entry == nil {
		return
	}
	if tuple, ok := entry.([]string); ok {
		if len(tuple) != 2 {
			panic(runtime.NewTypeError(fmt.Sprintf("%s: header entry must contain exactly two items", ctx)))
		}
		addHTTPHeaderEntry(runtime, ctx, headers, tuple[0], tuple[1])
		return
	}
	if tuple, ok := entry.([]interface{}); ok {
		if len(tuple) != 2 {
			panic(runtime.NewTypeError(fmt.Sprintf("%s: header entry must contain exactly two items", ctx)))
		}
		key := fmt.Sprintf("%v", tuple[0])
		value := fmt.Sprintf("%v", tuple[1])
		addHTTPHeaderEntry(runtime, ctx, headers, key, value)
		return
	}
	panic(runtime.NewTypeError(fmt.Sprintf("%s: Invalid header entry", ctx)))
}

func normalizeHeadersInit(runtime *goja.Runtime, value goja.Value, opCtx string) (map[string]interface{}, error) {
	result := make(map[string]interface{})
	if runtime == nil || value == nil || goja.IsUndefined(value) || goja.IsNull(value) {
		return result, nil
	}

	if handled, err := populateHeadersFromObject(runtime, value, result, opCtx); err != nil {
		return nil, err
	} else if handled {
		return result, nil
	}

	if obj, ok := value.(*goja.Object); ok && obj != nil {
		if obj.ClassName() == "Object" {
			for _, key := range obj.Keys() {
				val := obj.Get(key)
				addNormalizedHeaderEntry(runtime, opCtx, key, val.String(), result)
			}
			return result, nil
		}
	}

	if exported := value.Export(); exported != nil {
		switch h := exported.(type) {
		case map[string]interface{}:
			for key, val := range h {
				addNormalizedHeaderEntry(runtime, opCtx, key, fmt.Sprintf("%v", val), result)
			}
			return result, nil
		case map[string]string:
			for key, val := range h {
				addNormalizedHeaderEntry(runtime, opCtx, key, val, result)
			}
			return result, nil
		case []interface{}:
			appendHeaderTuplesFromSlice(runtime, opCtx, h, result)
			return result, nil
		case string, bool, int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
			return nil, fmt.Errorf("%s: Invalid Headers init input", opCtx)
		}
	}

	return nil, fmt.Errorf("%s: Invalid Headers init input", opCtx)
}

func populateHeadersFromObject(runtime *goja.Runtime, value goja.Value, target map[string]interface{}, opCtx string) (bool, error) {
	obj, ok := value.(*goja.Object)
	if !ok || obj == nil {
		return false, nil
	}

	if obj.ClassName() == "Array" {
		appendHeaderTuplesFromArray(runtime, opCtx, obj, target)
		return true, nil
	}

	if forEach := obj.Get("forEach"); forEach != nil && !goja.IsUndefined(forEach) {
		if fn, ok := goja.AssertFunction(forEach); ok {
			callback := func(cbCall goja.FunctionCall) goja.Value {
				if len(cbCall.Arguments) >= 2 {
					key := cbCall.Argument(1).String()
					addNormalizedHeaderEntry(runtime, opCtx, key, cbCall.Argument(0).String(), target)
				}
				return goja.Undefined()
			}
			if _, err := fn(obj, runtime.ToValue(callback)); err != nil {
				return false, err
			}
			return true, nil
		}
	}

	if entries := obj.Get("entries"); entries != nil && !goja.IsUndefined(entries) {
		if fn, ok := goja.AssertFunction(entries); ok {
			iterVal, err := fn(obj)
			if err != nil {
				return false, err
			}
			if err := iterateHeaderIterator(runtime, iterVal, target, opCtx); err != nil {
				return false, err
			}
			return true, nil
		}
	}

	if runtime != nil {
		if symbolVal := runtime.Get("Symbol"); symbolVal != nil && !goja.IsUndefined(symbolVal) {
			if symbolObj := symbolVal.ToObject(runtime); symbolObj != nil {
				if iteratorSymVal := symbolObj.Get("iterator"); iteratorSymVal != nil {
					if sym, ok := iteratorSymVal.(*goja.Symbol); ok {
						if iterFunc := obj.GetSymbol(sym); iterFunc != nil && !goja.IsUndefined(iterFunc) {
							if fn, ok := goja.AssertFunction(iterFunc); ok {
								iterVal, err := fn(obj)
								if err != nil {
									return false, err
								}
								if err := iterateHeaderIterator(runtime, iterVal, target, opCtx); err != nil {
									return false, err
								}
								return true, nil
							}
						}
					}
				}
			}
		}
	}

	return false, nil
}

func iterateHeaderIterator(runtime *goja.Runtime, iteratorVal goja.Value, target map[string]interface{}, opCtx string) error {
	if iteratorVal == nil || goja.IsUndefined(iteratorVal) || goja.IsNull(iteratorVal) {
		return nil
	}

	iterObj := iteratorVal.ToObject(runtime)
	if iterObj == nil {
		return nil
	}

	nextVal := iterObj.Get("next")
	nextFn, ok := goja.AssertFunction(nextVal)
	if !ok {
		return nil
	}

	for {
		resultVal, err := nextFn(iterObj)
		if err != nil {
			return err
		}
		resultObj := resultVal.ToObject(runtime)
		if resultObj == nil {
			break
		}
		doneVal := resultObj.Get("done")
		if !goja.IsUndefined(doneVal) && doneVal.ToBoolean() {
			break
		}
		valueVal := resultObj.Get("value")
		appendHeaderTupleValue(runtime, opCtx, valueVal, target)
	}
	return nil
}

func appendHeaderTuplesFromArray(runtime *goja.Runtime, opCtx string, arrayObj *goja.Object, target map[string]interface{}) {
	if arrayObj == nil || target == nil {
		return
	}
	lengthVal := arrayObj.Get("length")
	length := int(lengthVal.ToInteger())
	for i := 0; i < length; i++ {
		entryVal := arrayObj.Get(fmt.Sprintf("%d", i))
		appendHeaderTupleValue(runtime, opCtx, entryVal, target)
	}
}

func appendHeaderTuplesFromSlice(runtime *goja.Runtime, opCtx string, entries []interface{}, target map[string]interface{}) {
	if target == nil {
		return
	}
	for _, entry := range entries {
		appendHeaderTupleFromExport(runtime, opCtx, entry, target)
	}
}

func appendHeaderTupleValue(runtime *goja.Runtime, opCtx string, val goja.Value, target map[string]interface{}) {
	if target == nil || val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return
	}
	if obj, ok := val.(*goja.Object); ok && obj.ClassName() == "Array" {
		lengthVal := obj.Get("length")
		length := int(lengthVal.ToInteger())
		if length != 2 {
			panic(runtime.NewTypeError(fmt.Sprintf("%s: header entry must contain exactly two items", opCtx)))
		}
		key := obj.Get("0").String()
		value := obj.Get("1").String()
		addNormalizedHeaderEntry(runtime, opCtx, key, value, target)
		return
	}
	appendHeaderTupleFromExport(runtime, opCtx, val.Export(), target)
}

func appendHeaderTupleFromExport(runtime *goja.Runtime, opCtx string, entry interface{}, target map[string]interface{}) {
	if target == nil || entry == nil {
		return
	}
	if tuple, ok := entry.([]string); ok && len(tuple) >= 1 {
		if len(tuple) != 2 {
			panic(runtime.NewTypeError(fmt.Sprintf("%s: header entry must contain exactly two items", opCtx)))
		}
		addNormalizedHeaderEntry(runtime, opCtx, tuple[0], tuple[1], target)
		return
	}
	if tuple, ok := entry.([]interface{}); ok && len(tuple) >= 1 {
		if len(tuple) != 2 {
			panic(runtime.NewTypeError(fmt.Sprintf("%s: header entry must contain exactly two items", opCtx)))
		}
		key := fmt.Sprintf("%v", tuple[0])
		value := fmt.Sprintf("%v", tuple[1])
		addNormalizedHeaderEntry(runtime, opCtx, key, value, target)
		return
	}
	panic(runtime.NewTypeError(fmt.Sprintf("%s: Invalid header entry", opCtx)))
}

func addNormalizedHeaderEntry(runtime *goja.Runtime, opCtx, name, value string, target map[string]interface{}) {
	if target == nil {
		return
	}
	ensureValidHeaderName(runtime, opCtx, name)
	normalized := normalizeHeaderValue(value)
	ensureValidHeaderValue(runtime, opCtx, normalized)
	ensureASCIIHeaderValue(runtime, normalized)
	lowerName := strings.ToLower(name)
	if existing, ok := target[lowerName]; ok {
		existingStr := fmt.Sprintf("%v", existing)
		if existingStr == "" {
			target[lowerName] = normalized
		} else if normalized == "" {
			target[lowerName] = existingStr
		} else {
			target[lowerName] = existingStr + ", " + normalized
		}
	} else {
		target[lowerName] = normalized
	}
}

func (fe *FetchEnhancer) createBlobFromBytes(runtime *goja.Runtime, data []byte, contentType string) (*goja.Object, error) {
	factory, err := ensureBlobFactory(runtime)
	if err != nil {
		return nil, err
	}

	copied := make([]byte, len(data))
	copy(copied, data)
	arrayBuffer := runtime.NewArrayBuffer(copied)

	var typeVal goja.Value = goja.Undefined()
	if contentType != "" {
		typeVal = runtime.ToValue(contentType)
	}

	result, err := factory(goja.Undefined(), runtime.ToValue(arrayBuffer), typeVal)
	if err != nil {
		return nil, err
	}

	return result.ToObject(runtime), nil
}

func (fe *FetchEnhancer) createFileFromBytes(runtime *goja.Runtime, data []byte, filename, contentType string) (*goja.Object, error) {
	factory, err := ensureFileFactory(runtime)
	if err != nil {
		return nil, err
	}

	copied := make([]byte, len(data))
	copy(copied, data)
	arrayBuffer := runtime.NewArrayBuffer(copied)

	optionsVal := goja.Value(goja.Undefined())
	if contentType != "" {
		optionsObj := runtime.NewObject()
		optionsObj.Set("type", contentType)
		optionsVal = optionsObj
	}

	result, err := factory(goja.Undefined(), runtime.ToValue(arrayBuffer), runtime.ToValue(filename), optionsVal)
	if err != nil {
		return nil, err
	}

	return result.ToObject(runtime), nil
}

func ensureBlobFactory(runtime *goja.Runtime) (goja.Callable, error) {
	existing := runtime.Get("__createBlobFromBytes")
	if existing != nil && !goja.IsUndefined(existing) && !goja.IsNull(existing) {
		if callable, ok := goja.AssertFunction(existing); ok {
			return callable, nil
		}
	}

	script := `(function(global){
  function createBlobFromBytes(buffer, type) {
    if (type === undefined) {
      return new Blob([buffer]);
    }
    return new Blob([buffer], { type: type });
  }
  Object.defineProperty(global, '__createBlobFromBytes', {
    value: createBlobFromBytes,
    configurable: true,
    writable: true
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);`
	if _, err := runtime.RunString(script); err != nil {
		return nil, err
	}

	existing = runtime.Get("__createBlobFromBytes")
	if callable, ok := goja.AssertFunction(existing); ok {
		return callable, nil
	}
	return nil, fmt.Errorf("__createBlobFromBytes is not callable")
}

func ensureFileFactory(runtime *goja.Runtime) (goja.Callable, error) {
	existing := runtime.Get("__createFileFromBytes")
	if existing != nil && !goja.IsUndefined(existing) && !goja.IsNull(existing) {
		if callable, ok := goja.AssertFunction(existing); ok {
			return callable, nil
		}
	}

	script := `(function(global){
  if (typeof global.__createFileFromBytes === 'function') {
    return;
  }
  function createFileFromBytes(buffer, name, options) {
    if (typeof File !== 'function') {
      throw new TypeError('File constructor is not available');
    }
    var fileName = typeof name === 'string' && name.length ? name : 'blob';
    return new File([buffer], fileName, options);
  }
  Object.defineProperty(global, '__createFileFromBytes', {
    value: createFileFromBytes,
    writable: false,
    enumerable: false,
    configurable: false
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);`

	if _, err := runtime.RunString(script); err != nil {
		return nil, err
	}

	existing = runtime.Get("__createFileFromBytes")
	if existing == nil || goja.IsUndefined(existing) || goja.IsNull(existing) {
		return nil, fmt.Errorf("failed to initialize File factory")
	}

	callable, ok := goja.AssertFunction(existing)
	if !ok {
		return nil, fmt.Errorf("__createFileFromBytes is not callable")
	}
	return callable, nil
}

// ensureQueueMicrotask 注入 queueMicrotask（若宿主环境未提供）
func ensureQueueMicrotask(runtime *goja.Runtime) error {
	existing := runtime.Get("queueMicrotask")
	if existing != nil && !goja.IsUndefined(existing) && !goja.IsNull(existing) {
		return nil
	}

	script := `
(function(global){
  if (typeof global.queueMicrotask === 'function') {
    return;
  }
  function queueMicrotask(callback) {
    if (arguments.length === 0) {
      throw new TypeError("Failed to execute 'queueMicrotask': 1 argument required, but only 0 present.");
    }
    if (typeof callback !== 'function') {
      throw new TypeError("Failed to execute 'queueMicrotask': callback is not a function");
    }
    Promise.resolve().then(function () {
      callback();
    });
  }
  Object.defineProperty(global, 'queueMicrotask', {
    value: queueMicrotask,
    configurable: true,
    writable: true
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);
`
	_, err := runtime.RunString(script)
	return err
}

// ==================== Fetch 主方法 ====================

// createFetchFunction 创建 fetch 函数
// 🔥 核心入口：处理 URL、Request 对象、options
func (fe *FetchEnhancer) createFetchFunction(runtime *goja.Runtime) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("fetch 需要至少 1 个参数"))
		}

		// 1. 解析 URL（支持 string 或 Request 对象）
		var url string
		var options map[string]interface{}
		modeFromRequest := false

		firstArg := call.Arguments[0]
		if obj, ok := firstArg.(*goja.Object); ok {
			// 🔥 先检查是否是 URL 对象（有 href 属性且 href 是字符串）
			hrefVal := obj.Get("href")
			if hrefVal != nil && !goja.IsUndefined(hrefVal) && !goja.IsNull(hrefVal) {
				// 优先调用对象自身的 toString，防止 href 属性未及时同步 searchParams
				if toStringVal := obj.Get("toString"); toStringVal != nil && !goja.IsUndefined(toStringVal) {
					if toStringFn, ok := goja.AssertFunction(toStringVal); ok {
						if strVal, err := toStringFn(obj); err == nil {
							str := strVal.String()
							if str != "" {
								url = str
							}
						}
					}
				}
				if url == "" {
					hrefStr := hrefVal.String()
					if hrefStr != "" {
						url = hrefStr
					} else {
						url = firstArg.String()
					}
				}
			} else if requestURL := obj.Get("url"); requestURL != nil && !goja.IsUndefined(requestURL) {
				// 这是一个 Request 对象
				url = requestURL.String()

				// 从 Request 对象提取 options
				options = make(map[string]interface{})
				copyStringProp := func(prop string) {
					if value := obj.Get(prop); value != nil && !goja.IsUndefined(value) && !goja.IsNull(value) {
						options[prop] = value.String()
					}
				}
				if method := obj.Get("method"); !goja.IsUndefined(method) {
					options["method"] = method.String()
				}
				if headers := obj.Get("headers"); !goja.IsUndefined(headers) && !goja.IsNull(headers) {
					normalizedHeaders, err := normalizeHeadersInit(runtime, headers, "Headers.append")
					if err != nil {
						panic(runtime.NewTypeError("解析 Request headers 失败: " + err.Error()))
					}
					if len(normalizedHeaders) > 0 {
						options["headers"] = normalizedHeaders
					}
				}
				if rawBodyVal := obj.Get(requestRawBodyValueProp); rawBodyVal != nil && !goja.IsUndefined(rawBodyVal) && !goja.IsNull(rawBodyVal) {
					if bodyObj, ok := rawBodyVal.(*goja.Object); ok {
						options["__rawBodyObject"] = bodyObj
					} else {
						options["body"] = rawBodyVal.Export()
					}
				} else if bodyVal := obj.Get("body"); !goja.IsUndefined(bodyVal) && !goja.IsNull(bodyVal) {
					// 保留 body 对象，延迟处理
					if bodyObj, ok := bodyVal.(*goja.Object); ok {
						options["__rawBodyObject"] = bodyObj
					} else {
						// 🔥 字符串或其他基本类型，直接导出
						options["body"] = bodyVal.Export()
					}
				}
				// 🔥 从 Request 对象提取 signal（如果存在）
				if signalVal := obj.Get("signal"); !goja.IsUndefined(signalVal) && !goja.IsNull(signalVal) {
					if signalObj, ok := signalVal.(*goja.Object); ok {
						options["signal"] = signalObj
					}
				}
				copyStringProp("cache")
				copyStringProp("credentials")
				copyStringProp("mode")
				copyStringProp("redirect")
				copyStringProp("referrer")
				copyStringProp("referrerPolicy")
				copyStringProp("integrity")
				if keepaliveVal := obj.Get("keepalive"); !goja.IsUndefined(keepaliveVal) && !goja.IsNull(keepaliveVal) {
					options["keepalive"] = keepaliveVal.ToBoolean()
				}
			} else {
				// 既不是 URL 对象也不是 Request 对象，尝试调用 toString()
				url = firstArg.String()
			}
		} else {
			url = firstArg.String()
		}

		// 2. 解析 options（如果有第二个参数）
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) {
			if optionsArg := call.Arguments[1].ToObject(runtime); optionsArg != nil {
				if options == nil {
					options = make(map[string]interface{})
				}

				// 🔥 先保存 signal、headers 和 body 对象（保持原始类型）
				var signalVal, bodyVal, headersVal goja.Value
				var methodVal, modeVal, credentialsVal, redirectVal goja.Value
				var cacheVal, referrerVal, referrerPolicyVal, integrityVal goja.Value
				var keepaliveVal goja.Value
				if sv := optionsArg.Get("signal"); !goja.IsUndefined(sv) && sv != nil {
					signalVal = sv
				}
				if bv := optionsArg.Get("body"); !goja.IsUndefined(bv) && bv != nil {
					bodyVal = bv
				}
				if hv := optionsArg.Get("headers"); !goja.IsUndefined(hv) && hv != nil && !goja.IsNull(hv) {
					headersVal = hv
				}
				methodVal = optionsArg.Get("method")
				modeVal = optionsArg.Get("mode")
				credentialsVal = optionsArg.Get("credentials")
				redirectVal = optionsArg.Get("redirect")
				cacheVal = optionsArg.Get("cache")
				referrerVal = optionsArg.Get("referrer")
				referrerPolicyVal = optionsArg.Get("referrerPolicy")
				integrityVal = optionsArg.Get("integrity")
				keepaliveVal = optionsArg.Get("keepalive")

				// Export 其他选项
				exportedOptions := call.Arguments[1].Export()
				if optMap, ok := exportedOptions.(map[string]interface{}); ok {
					for k, v := range optMap {
						options[k] = v
					}
				}

				// 恢复 signal 和 body 对象
				if signalVal != nil && !goja.IsUndefined(signalVal) {
					// 🔥 保留原始的 goja.Value（无论是对象、字符串还是数字）
					// 这样后续可以正确验证并抛出 TypeError
					options["signal"] = signalVal
				}
				if bodyVal != nil && !goja.IsUndefined(bodyVal) {
					if bodyObj, ok := bodyVal.(*goja.Object); ok {
						options["__rawBodyObject"] = bodyObj
					} else {
						options["body"] = bodyVal.Export()
					}
				}
				if headersVal != nil && !goja.IsUndefined(headersVal) {
					normalizedHeaders, err := normalizeHeadersInit(runtime, headersVal, "Headers.append")
					if err != nil {
						panic(runtime.NewTypeError("解析 headers 失败: " + err.Error()))
					}
					options["headers"] = normalizedHeaders
				}
				if methodVal != nil && !goja.IsUndefined(methodVal) {
					options["method"] = methodVal.String()
				}
				if modeVal != nil {
					if goja.IsUndefined(modeVal) {
						delete(options, "mode")
					} else {
						options["mode"] = modeVal.String()
					}
				}
				if credentialsVal != nil {
					if goja.IsUndefined(credentialsVal) {
						delete(options, "credentials")
					} else {
						options["credentials"] = credentialsVal.String()
					}
				}
				if redirectVal != nil {
					if goja.IsUndefined(redirectVal) {
						delete(options, "redirect")
					} else {
						options["redirect"] = redirectVal.String()
					}
				}
				if cacheVal != nil {
					if goja.IsUndefined(cacheVal) {
						delete(options, "cache")
					} else {
						options["cache"] = cacheVal.String()
					}
				}
				if referrerVal != nil {
					if goja.IsUndefined(referrerVal) {
						delete(options, "referrer")
					} else {
						options["referrer"] = referrerVal.String()
					}
				}
				if referrerPolicyVal != nil {
					if goja.IsUndefined(referrerPolicyVal) {
						delete(options, "referrerPolicy")
					} else {
						options["referrerPolicy"] = referrerPolicyVal.String()
					}
				}
				if integrityVal != nil {
					if goja.IsUndefined(integrityVal) {
						delete(options, "integrity")
					} else {
						options["integrity"] = integrityVal.String()
					}
				}
				if keepaliveVal != nil {
					if goja.IsUndefined(keepaliveVal) {
						delete(options, "keepalive")
					} else {
						options["keepalive"] = keepaliveVal.ToBoolean()
					}
				}
			}
		}

		// 3. 创建 Promise
		promise, resolve, reject := runtime.NewPromise()

		// 3.1 处理 auth 配置（兜底生成 Basic Authorization 头）
		if authVal, ok := options["auth"]; ok && authVal != nil {
			var username, password string

			switch v := authVal.(type) {
			case map[string]interface{}:
				if u, ok := v["username"].(string); ok {
					username = u
				}
				if p, ok := v["password"].(string); ok {
					password = p
				}
			case *goja.Object:
				if u := v.Get("username"); !goja.IsUndefined(u) && !goja.IsNull(u) {
					username = u.String()
				}
				if p := v.Get("password"); !goja.IsUndefined(p) && !goja.IsNull(p) {
					password = p.String()
				}
			}

			if username != "" {
				authHeader := "Basic " + base64.StdEncoding.EncodeToString([]byte(fmt.Sprintf("%s:%s", username, password)))
				if headers, ok := options["headers"].(map[string]interface{}); ok {
					if _, exists := headers["authorization"]; !exists {
						headers["authorization"] = authHeader
					}
				} else {
					options["headers"] = map[string]interface{}{
						"authorization": authHeader,
					}
				}
			}
		}

		// 4. 处理特殊 Body 类型（必须在 Promise 创建之后）
		if rawBodyObj, exists := options["__rawBodyObject"]; exists {
			if bodyObj, ok := rawBodyObj.(*goja.Object); ok {
				// 4.1 检查是否是 Node.js FormData（优先检查）
				isNodeFormDataVal := bodyObj.Get("__isNodeFormData")
				if !goja.IsUndefined(isNodeFormDataVal) && isNodeFormDataVal != nil && isNodeFormDataVal.ToBoolean() {
					// 🔥 Node.js FormData 处理
					// 方案1：尝试获取底层 StreamingFormData 对象（高效）
					if goStreamingFD := bodyObj.Get("__getGoStreamingFormData"); !goja.IsUndefined(goStreamingFD) {
						if streamingFormData, ok := goStreamingFD.Export().(*formdata.StreamingFormData); ok {
							// 🔥 判断使用缓冲模式还是流式模式
							totalSize := streamingFormData.GetTotalSize()
							boundary := streamingFormData.GetBoundary()

							// 🔥 如果总大小 <= 缓冲阈值，使用缓冲模式（返回 []byte）
							// 注意：totalSize == 0 的情况（空表单）也应该缓冲
							var bodyReaderOrBytes interface{}
							if totalSize >= 0 && totalSize <= fe.config.FormDataConfig.MaxBufferedFormDataSize {
								// 缓冲模式：一次性读取到内存
								reader, err := streamingFormData.CreateReader()
								if err != nil {
									reject(runtime.NewTypeError("创建 FormData reader 失败: " + err.Error()))
									return runtime.ToValue(promise)
								}

								// 读取所有数据
								data, err := io.ReadAll(reader)
								if err != nil {
									reject(runtime.NewTypeError("读取 FormData 失败: " + err.Error()))
									return runtime.ToValue(promise)
								}

								// 返回 []byte（带 Content-Length）
								bodyReaderOrBytes = data
							} else {
								// 流式模式：返回 Reader（chunked 传输）
								reader, err := streamingFormData.CreateReader()
								if err != nil {
									reject(runtime.NewTypeError("创建 FormData reader 失败: " + err.Error()))
									return runtime.ToValue(promise)
								}
								bodyReaderOrBytes = reader
								// 🔥 保存 StreamingFormData 对象，以便在请求执行时立即注入 context
								options["__streamingFormData"] = streamingFormData
							}

							options["__formDataBody"] = bodyReaderOrBytes
							options["__formDataBoundary"] = boundary

							// 自动设置 Content-Type（如果用户没有手动设置）
							if headers, ok := options["headers"].(map[string]interface{}); ok {
								if _, hasContentType := headers["content-type"]; !hasContentType {
									headers["content-type"] = fmt.Sprintf("multipart/form-data; boundary=%s", boundary)
								}
							} else {
								options["headers"] = map[string]interface{}{
									"content-type": fmt.Sprintf("multipart/form-data; boundary=%s", boundary),
								}
							}
						} else {
							reject(runtime.NewTypeError("无效的 Node.js FormData 对象"))
							return runtime.ToValue(promise)
						}
					} else {
						// 方案2：降级到 getBuffer()
						getBufferFunc := bodyObj.Get("getBuffer")
						if goja.IsUndefined(getBufferFunc) {
							reject(runtime.NewTypeError("Node.js FormData 缺少 getBuffer 方法"))
							return runtime.ToValue(promise)
						}

						getBuffer, ok := goja.AssertFunction(getBufferFunc)
						if !ok {
							reject(runtime.NewTypeError("getBuffer 不是一个函数"))
							return runtime.ToValue(promise)
						}

						// 调用 getBuffer() 获取数据
						bufferVal, err := getBuffer(bodyObj)
						if err != nil {
							reject(runtime.NewTypeError("调用 getBuffer 失败: " + err.Error()))
							return runtime.ToValue(promise)
						}

						// 提取 Buffer 数据
						bufferObj := bufferVal.ToObject(runtime)
						if bufferObj == nil {
							reject(runtime.NewTypeError("getBuffer 没有返回 Buffer"))
							return runtime.ToValue(promise)
						}

						// 从 Buffer 提取字节数据
						data, err := fe.extractBufferBytes(bufferObj)
						if err != nil {
							reject(runtime.NewTypeError("提取 buffer 数据失败: " + err.Error()))
							return runtime.ToValue(promise)
						}

						// 获取 boundary
						boundaryVal := bodyObj.Get("getBoundary")
						if goja.IsUndefined(boundaryVal) {
							reject(runtime.NewTypeError("Node.js FormData 缺少 getBoundary 方法"))
							return runtime.ToValue(promise)
						}
						getBoundaryFunc, ok := goja.AssertFunction(boundaryVal)
						if !ok {
							reject(runtime.NewTypeError("getBoundary 不是一个函数"))
							return runtime.ToValue(promise)
						}
						boundaryResult, err := getBoundaryFunc(bodyObj)
						if err != nil {
							reject(runtime.NewTypeError("调用 getBoundary 失败: " + err.Error()))
							return runtime.ToValue(promise)
						}
						boundary := boundaryResult.String()

						options["__formDataBody"] = data
						options["__formDataBoundary"] = boundary

						// 自动设置 Content-Type
						if headers, ok := options["headers"].(map[string]interface{}); ok {
							if _, hasContentType := headers["content-type"]; !hasContentType {
								headers["content-type"] = fmt.Sprintf("multipart/form-data; boundary=%s", boundary)
							}
						} else {
							options["headers"] = map[string]interface{}{
								"content-type": fmt.Sprintf("multipart/form-data; boundary=%s", boundary),
							}
						}
					}
				} else if isFormDataVal := bodyObj.Get("__isFormData"); !goja.IsUndefined(isFormDataVal) && isFormDataVal != nil && isFormDataVal.ToBoolean() {
					// 4.2 浏览器 FormData 处理
					// 🔥 关键：在当前 goroutine 中提取 FormData 数据
					bodyReaderOrBytes, boundary, err := fe.extractFormDataInCurrentThread(runtime, bodyObj)
					if err != nil {
						reject(runtime.NewTypeError("提取 FormData 失败: " + err.Error()))
						return runtime.ToValue(promise)
					}

					// 🔥 支持流式 Reader 或字节数组
					options["__formDataBody"] = bodyReaderOrBytes
					options["__formDataBoundary"] = boundary
				} else {
					// 4.3 处理其他特殊 Body 类型（TypedArray、URLSearchParams 等）
					if fe.bodyHandler == nil {
						reject(runtime.NewTypeError("bodyHandler 为 nil"))
						return runtime.ToValue(promise)
					}

					data, reader, ct, err := fe.bodyHandler.ProcessBody(runtime, bodyObj)
					if err != nil {
						reject(runtime.NewTypeError("处理 body 失败: " + err.Error()))
						return runtime.ToValue(promise)
					}

					if data != nil {
						// 已知大小的数据
						options["body"] = data
						if ct != "" {
							// 如果没有手动设置 Content-Type，则使用自动检测的
							// 🔥 修复：大小写不敏感检查 Content-Type
							if headers, ok := options["headers"].(map[string]interface{}); ok {
								hasContentType := false
								for key := range headers {
									if strings.EqualFold(key, "Content-Type") {
										hasContentType = true
										break
									}
								}
								if !hasContentType {
									headers["Content-Type"] = ct
								}
							} else {
								options["headers"] = map[string]interface{}{
									"Content-Type": ct,
								}
							}
						}
					} else if reader != nil {
						// 真正的流式数据
						options["body"] = reader
					}
				}
			}
			// 清理临时字段
			delete(options, "__rawBodyObject")

		}
		options = normalizeRequestOptions(runtime, options, modeFromRequest)

		// 5. 检查是否有 AbortSignal
		var abortCh chan struct{}
		var signalObj *goja.Object // 保存 signal 对象引用，用于后续获取 reason

		if signal, ok := options["signal"]; ok && signal != nil {
			// 🔥 检查是否是 goja.Value
			signalValue, isGojaValue := signal.(goja.Value)

			// 🔥 如果 signal 不是 null 或 undefined，需要验证它是有效的 AbortSignal
			if isGojaValue && !goja.IsNull(signalValue) && !goja.IsUndefined(signalValue) {
				if sObj, ok := signal.(*goja.Object); ok {
					// 🔥 验证是否是真正的 AbortSignal（检查 __isAbortSignal 标记）
					isSignalVal := sObj.Get("__isAbortSignal")
					if isSignalVal != nil && !goja.IsUndefined(isSignalVal) && !goja.IsNull(isSignalVal) && isSignalVal.ToBoolean() {
						signalObj = sObj
						// 🔥 从 signal 对象获取已存在的 abortChannel
						// 🔥 使用 defer recover 保护 Export 调用，避免非法 signal 导致 panic
						if chVal := signalObj.Get("__abortChannel"); !goja.IsUndefined(chVal) && !goja.IsNull(chVal) {
							func() {
								defer func() {
									if r := recover(); r != nil {
										// 忽略非法的 __abortChannel，使用默认 channel
									}
								}()
								if ch, ok := chVal.Export().(chan struct{}); ok && ch != nil {
									abortCh = ch
								}
							}()
						}
					} else {
						// 🔥 不是有效的 AbortSignal，抛出 TypeError（与 Node.js 行为一致）
						panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
					}
				} else {
					// 🔥 signal 不是对象类型（字符串、数字等），抛出 TypeError
					panic(runtime.NewTypeError("signal is not a valid AbortSignal"))
				}
			}
			// 🔥 如果 signal 是 null 或 undefined，静默忽略（符合 Node.js 行为）
		}

		// 先验证 URL 是否有效（即便 signal 已经 aborted 也要抛出 TypeError）
		if parsed, err := neturl.ParseRequestURI(url); err != nil || parsed.Scheme == "" {
			panic(runtime.NewTypeError(fmt.Sprintf("Failed to parse URL from %s", url)))
		}

		// header 值 ASCII 校验
		if headers, ok := options["headers"].(map[string]interface{}); ok {
			for _, v := range headers {
				ensureASCIIHeaderValue(runtime, fmt.Sprintf("%v", v))
			}
		}

		// 🔥 检查 signal 是否已经 aborted（在发起请求前）
		if signalObj != nil {
			abortedVal := signalObj.Get("aborted")
			if !goja.IsUndefined(abortedVal) && !goja.IsNull(abortedVal) && abortedVal.ToBoolean() {
				// 🔥 signal 已经 aborted，直接 reject 并使用 signal.reason
				reasonVal := signalObj.Get("reason")
				if reasonVal != nil && !goja.IsUndefined(reasonVal) && !goja.IsNull(reasonVal) {
					// 使用自定义 reason
					reject(reasonVal)
				} else {
					// 使用默认 AbortError
					reject(CreateDOMException(runtime, "This operation was aborted", "AbortError"))
				}
				return runtime.ToValue(promise)
			}
		}

		// 如果没有 signal 或获取失败，创建一个新的（但不会被使用）
		if abortCh == nil {
			abortCh = make(chan struct{})
		}

		// 6. 创建请求控制通道
		req := &FetchRequest{
			url:       url,
			options:   options,
			resultCh:  make(chan FetchResult, 1),
			abortCh:   abortCh,
			signalObj: signalObj, // 🔥 传递 signal 对象，用于获取 reason
		}

		// 7. 异步执行请求（不阻塞 EventLoop）
		go ExecuteRequestAsync(fe.config, fe.client, req, fe.createBodyWrapper)

		// 8. 检查是否在 EventLoop 环境中
		setImmediateFn := runtime.Get("setImmediate")

		if setImmediateFn != nil && !goja.IsUndefined(setImmediateFn) {
			// EventLoop 模式：使用轮询机制
			resolveFunc := func(value goja.Value) { resolve(value) }
			rejectFunc := func(value goja.Value) { reject(value) }
			PollResult(runtime, req, resolveFunc, rejectFunc, setImmediateFn, fe.recreateResponse)
		} else {
			// Runtime Pool 模式：同步等待
			result := <-req.resultCh
			if result.err != nil {
				// 🔥 检查是否为 AbortError
				if _, isAbortError := result.err.(*AbortError); isAbortError {
					// 🔥 如果有自定义 abortReason，使用它；否则使用默认 AbortError
					if result.abortReason != nil && !goja.IsUndefined(result.abortReason) {
						reject(result.abortReason)
					} else {
						reject(CreateAbortErrorObject(runtime, result.err))
					}
				} else {
					reject(CreateErrorObject(runtime, result.err))
				}
			} else {
				resolve(fe.recreateResponse(runtime, result.response))
			}
		}

		return runtime.ToValue(promise)
	}
}

// ==================== 响应创建 ====================

// recreateResponse 创建响应对象（供 JavaScript 使用）
// 🔥 核心方法：将 ResponseData 转换为 JavaScript Response 对象
func setResponseReadOnlyProperty(runtime *goja.Runtime, obj *goja.Object, name string, raw interface{}) {
	if runtime == nil || obj == nil || name == "" {
		return
	}

	var value goja.Value
	if v, ok := raw.(goja.Value); ok {
		value = v
	} else {
		value = runtime.ToValue(raw)
	}

	if err := obj.DefineDataProperty(name, value, goja.FLAG_FALSE, goja.FLAG_TRUE, goja.FLAG_TRUE); err != nil {
		obj.Set(name, raw)
	}
}

func (fe *FetchEnhancer) recreateResponse(runtime *goja.Runtime, data *ResponseData) goja.Value {
	if data == nil {
		return goja.Null()
	}

	respObj := runtime.NewObject()

	if responseCtor := runtime.Get("Response"); responseCtor != nil && !goja.IsUndefined(responseCtor) && !goja.IsNull(responseCtor) {
		if ctorObj := responseCtor.ToObject(runtime); ctorObj != nil {
			if protoVal := ctorObj.Get("prototype"); protoVal != nil && !goja.IsUndefined(protoVal) && !goja.IsNull(protoVal) {
				if protoObj := protoVal.ToObject(runtime); protoObj != nil {
					respObj.SetPrototype(protoObj)
				}
			}
		}
	}

	// 基础属性
	setResponseReadOnlyProperty(runtime, respObj, "status", data.StatusCode)
	setResponseReadOnlyProperty(runtime, respObj, "statusText", data.Status)
	setResponseReadOnlyProperty(runtime, respObj, "ok", data.StatusCode >= 200 && data.StatusCode < 300)
	setResponseReadOnlyProperty(runtime, respObj, "url", data.FinalURL)

	// 🔥 支持 redirected 属性（检测是否发生重定向）
	setResponseReadOnlyProperty(runtime, respObj, "redirected", data.Redirected)

	// WHATWG Response 默认类型（Node 默认返回 default）
	responseType := data.ResponseType
	if responseType == "" {
		responseType = "default"
	}
	setResponseReadOnlyProperty(runtime, respObj, "type", responseType)

	// Headers 对象
	headersObj := fe.createResponseHeaders(runtime, data.Headers)
	setResponseReadOnlyProperty(runtime, respObj, "headers", headersObj)

	// bodyUsed 默认为 false，供后续方法更新
	setResponseReadOnlyProperty(runtime, respObj, "bodyUsed", false)

	// 🔥 核心：Body 读取方法（支持流式和缓冲）
	// 🔥 注意：clone() 方法在 attachStreamingBodyMethods 和 attachBufferedBodyMethods 中设置
	switch {
	case data.JSReadableBody != nil:
		fe.attachJSReadableStreamBody(runtime, respObj, data)
	case data.IsStreaming:
		// 流式响应（支持 clone）
		fe.attachStreamingBodyMethods(runtime, respObj, data)
	default:
		// 缓冲响应
		fe.attachBufferedBodyMethods(runtime, respObj, data)
	}

	return respObj
}

func sortedHTTPHeaderMapping(httpHeaders http.Header) ([]string, map[string]string) {
	keys := make([]string, 0, len(httpHeaders))
	original := make(map[string]string, len(httpHeaders))
	for key := range httpHeaders {
		lower := strings.ToLower(key)
		keys = append(keys, lower)
		if _, exists := original[lower]; !exists {
			original[lower] = key
		}
	}
	sort.Strings(keys)
	return keys, original
}

// createResponseHeaders 创建响应 Headers 对象
func (fe *FetchEnhancer) createResponseHeaders(runtime *goja.Runtime, httpHeaders http.Header) *goja.Object {
	headersObj := runtime.NewObject()

	setCookieValues := make([]string, 0)
	for key, values := range httpHeaders {
		if strings.EqualFold(key, "set-cookie") {
			for _, v := range values {
				setCookieValues = append(setCookieValues, v)
			}
		}
	}

	// get(name) - 获取指定头部值
	headersObj.Set("get", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Null()
		}
		name := strings.ToLower(call.Arguments[0].String())
		for key, values := range httpHeaders {
			if strings.ToLower(key) == name && len(values) > 0 {
				// 🔥 Set-Cookie 特殊处理：返回数组
				if name == "set-cookie" && len(values) > 1 {
					return runtime.ToValue(values)
				}
				return runtime.ToValue(values[0])
			}
		}
		return goja.Null()
	})

	// has(name) - 检查是否存在指定头部
	headersObj.Set("has", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}
		name := strings.ToLower(call.Arguments[0].String())
		for key := range httpHeaders {
			if strings.ToLower(key) == name {
				return runtime.ToValue(true)
			}
		}
		return runtime.ToValue(false)
	})

	// forEach(callback) - 遍历所有头部
	headersObj.Set("forEach", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		callback, ok := goja.AssertFunction(call.Arguments[0])
		if !ok {
			return goja.Undefined()
		}

		sortedKeys, originalKeys := sortedHTTPHeaderMapping(httpHeaders)
		for _, lowerKey := range sortedKeys {
			originalKey := originalKeys[lowerKey]
			values := httpHeaders[originalKey]
			if len(values) == 0 {
				continue
			}

			keyLower := strings.ToLower(originalKey)
			if keyLower == "set-cookie" && len(values) > 1 {
				// Set-Cookie 返回数组
				callback(goja.Undefined(), runtime.ToValue(values), runtime.ToValue(originalKey), headersObj)
			} else {
				callback(goja.Undefined(), runtime.ToValue(values[0]), runtime.ToValue(originalKey), headersObj)
			}
		}
		return goja.Undefined()
	})

	// getSetCookie() - Node fetch 扩展：返回 Set-Cookie 数组
	headersObj.Set("getSetCookie", func(call goja.FunctionCall) goja.Value {
		if len(setCookieValues) == 0 {
			return runtime.ToValue([]string{})
		}
		copyVals := append([]string(nil), setCookieValues...)
		return runtime.ToValue(copyVals)
	})

	attachConstructorPrototype(runtime, "Headers", headersObj)

	return headersObj
}

// attachJSReadableStreamBody 附加基于 ReadableStream 的 Body（Response 构造器）
func (fe *FetchEnhancer) attachJSReadableStreamBody(runtime *goja.Runtime, respObj *goja.Object, data *ResponseData) {
	streamObj := data.JSReadableBody
	if streamObj == nil {
		fe.attachBufferedBodyMethods(runtime, respObj, data)
		return
	}

	currentStream := streamObj
	respObj.Set("body", currentStream)
	setResponseReadOnlyProperty(runtime, respObj, "bodyUsed", false)

	var bodyConsumed bool
	var bodyMutex sync.Mutex

	markBodyUsed := func() error {
		bodyMutex.Lock()
		defer bodyMutex.Unlock()

		if bodyConsumed {
			return errors.New(bodyAlreadyUsedErrorMessage)
		}
		bodyConsumed = true
		setResponseReadOnlyProperty(runtime, respObj, "bodyUsed", true)
		return nil
	}

	rejectPromise := func(err error) goja.Value {
		promise, _, reject := runtime.NewPromise()
		if exc, ok := err.(*goja.Exception); ok {
			reject(exc.Value())
		} else {
			reject(runtime.NewGoError(err))
		}
		return runtime.ToValue(promise)
	}

	createMethod := func(mode string) func(goja.FunctionCall) goja.Value {
		return func(call goja.FunctionCall) goja.Value {
			if err := markBodyUsed(); err != nil {
				return rejectPromise(err)
			}

			value, err := fe.consumeReadableStream(runtime, currentStream, mode)
			if err != nil {
				return rejectPromise(err)
			}
			return value
		}
	}

	respObj.Set("text", createMethod("text"))
	respObj.Set("json", createMethod("json"))
	respObj.Set("arrayBuffer", createMethod("arrayBuffer"))
	respObj.Set("blob", createMethod("blob"))

	respObj.Set("clone", func(call goja.FunctionCall) goja.Value {
		bodyMutex.Lock()
		consumed := bodyConsumed
		bodyMutex.Unlock()
		if consumed {
			panic(runtime.NewTypeError(responseCloneConsumedMessage))
		}

		teeVal := currentStream.Get("tee")
		teeFunc, ok := goja.AssertFunction(teeVal)
		if !ok {
			panic(runtime.NewTypeError("ReadableStream.tee is not available"))
		}

		result, err := teeFunc(currentStream)
		if err != nil {
			panic(err)
		}
		branches := result.ToObject(runtime)
		if branches == nil {
			panic(runtime.NewTypeError("ReadableStream.tee returned invalid result"))
		}

		firstVal := branches.Get("0")
		secondVal := branches.Get("1")
		first := firstVal.ToObject(runtime)
		second := secondVal.ToObject(runtime)
		if first == nil || second == nil {
			panic(runtime.NewTypeError("ReadableStream.tee returned invalid branches"))
		}

		currentStream = first
		respObj.Set("body", currentStream)

		clonedData := &ResponseData{
			StatusCode:     data.StatusCode,
			Status:         data.Status,
			Headers:        data.Headers.Clone(),
			Body:           nil,
			IsStreaming:    false,
			FinalURL:       data.FinalURL,
			Redirected:     data.Redirected,
			ResponseType:   data.ResponseType,
			ContentLength:  data.ContentLength,
			AbortCh:        data.AbortCh,
			Signal:         data.Signal,
			JSReadableBody: second,
		}

		return fe.recreateResponse(runtime, clonedData)
	})
}

// ==================== 流式响应处理 ====================

const (
	bodyAlreadyUsedErrorMessage  = "Body is unusable: Body has already been read"
	responseCloneConsumedMessage = "Response.clone: Body has already been consumed."
)

// attachStreamingBodyMethods 附加流式 Body 方法
// 🔥 支持：text(), json(), arrayBuffer(), body.getReader()
// 🔥 重要：text/json/arrayBuffer/blob 方法受 MaxResponseSize 限制（防止大响应占满内存）
// 🔥 线程安全：使用 setImmediate 替代 goroutine，确保所有 goja Runtime 操作在 EventLoop 中执行
func (fe *FetchEnhancer) attachStreamingBodyMethods(runtime *goja.Runtime, respObj *goja.Object, data *ResponseData) {
	// 创建 StreamReader（包装 BodyStream）
	// 🔥 P2: 传入 ResponseReadTimeout 用于 abort watcher 超时保护
	streamReader := NewStreamReader(data.BodyStream, runtime, fe.config.MaxStreamingSize, data.ContentLength, data.AbortCh, data.Signal, fe.config.ResponseReadTimeout)

	// 🔥 创建 StreamingResponse（支持 Node.js + Web Streams）
	streamingResponse := NewStreamingResponse(streamReader, runtime, false) // cloneable=false，避免缓存占满内存

	// 🔥 保障底层流只关闭一次，避免资源悬挂
	var closeStreamingOnce sync.Once
	var autoCleanupTimer *time.Timer // 🔥 P1: 保存 timer 引用以便停止
	closeStreaming := func() {
		closeStreamingOnce.Do(func() {
			// 🔥 P1: 停止自动清理 timer,防止 timer 累积
			if autoCleanupTimer != nil {
				autoCleanupTimer.Stop()
			}
			_ = streamingResponse.Close()
		})
	}

	// 🔥 取消状态标志（body.cancel() 后阻止读取）
	var cancelled bool
	var cancelledMutex sync.Mutex

	// 🔥 创建自定义 body 对象（包装 StreamingResponse.GetReader()）
	bodyObj := runtime.NewObject()
	streams.AttachReadableStreamPrototype(runtime, bodyObj)
	bodyObj.Set("__streamReader", streamReader)

	var bodyLocked bool
	var bodyLockOwnerID uint64
	var bodyLockCounter uint64
	var bodyLockMutex sync.Mutex

	// 🔥 bodyUsed 状态
	var bodyConsumed bool
	var bodyUsedMutex sync.Mutex

	markBodyUsed := func() bool {
		bodyUsedMutex.Lock()
		defer bodyUsedMutex.Unlock()

		if bodyConsumed {
			return false
		}
		bodyConsumed = true
		setResponseReadOnlyProperty(runtime, respObj, "bodyUsed", true)
		return true
	}

	releaseAllLocks := func() {
		bodyLockMutex.Lock()
		bodyLocked = false
		bodyLockOwnerID = 0
		bodyObj.Set("locked", false)
		bodyLockMutex.Unlock()
	}

	releaseReaderByID := func(ownerID uint64) {
		bodyLockMutex.Lock()
		if bodyLocked && bodyLockOwnerID == ownerID {
			bodyLocked = false
			bodyLockOwnerID = 0
			bodyObj.Set("locked", false)
		}
		bodyLockMutex.Unlock()
	}

	// getReader() 方法
	bodyObj.Set("getReader", func(call goja.FunctionCall) goja.Value {
		bodyLockMutex.Lock()
		if bodyLocked {
			bodyLockMutex.Unlock()
			panic(runtime.NewTypeError("ReadableStream is already locked"))
		}
		bodyLocked = true
		bodyLockCounter++
		currentReaderID := bodyLockCounter
		bodyLockOwnerID = currentReaderID
		bodyObj.Set("locked", true)
		bodyLockMutex.Unlock()

		reader := streamingResponse.GetReader()
		if reader == nil {
			releaseReaderByID(currentReaderID)
			panic(runtime.NewTypeError("Failed to acquire ReadableStream reader"))
		}

		releaseReader := func() {
			releaseReaderByID(currentReaderID)
		}

		if readVal := reader.Get("read"); readVal != nil {
			if readFunc, ok := goja.AssertFunction(readVal); ok {
				reader.Set("read", func(call goja.FunctionCall) goja.Value {
					markBodyUsed()
					result, err := readFunc(call.This, call.Arguments...)
					if err != nil {
						panic(err)
					}
					return result
				})
			}
		}

		if cancelVal := reader.Get("cancel"); cancelVal != nil {
			if cancelFunc, ok := goja.AssertFunction(cancelVal); ok {
				reader.Set("cancel", func(call goja.FunctionCall) goja.Value {
					defer releaseReader()
					markBodyUsed()
					result, err := cancelFunc(call.This, call.Arguments...)
					if err != nil {
						panic(err)
					}
					return result
				})
			}
		}

		reader.Set("releaseLock", func(call goja.FunctionCall) goja.Value {
			releaseReader()
			return goja.Undefined()
		})

		if closedVal := reader.Get("closed"); closedVal != nil && !goja.IsUndefined(closedVal) && !goja.IsNull(closedVal) {
			if closedObj := closedVal.ToObject(runtime); closedObj != nil {
				if thenVal := closedObj.Get("then"); thenVal != nil {
					if thenFunc, ok := goja.AssertFunction(thenVal); ok {
						releaseCallback := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
							releaseReader()
							return goja.Undefined()
						})
						if _, err := thenFunc(closedObj, releaseCallback, releaseCallback); err != nil {
							panic(err)
						}
					}
				}
			}
		}

		return reader
	})

	// cancel() 方法 - 设置取消标志并关闭流
	bodyObj.Set("cancel", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()

		cancelledMutex.Lock()
		cancelled = true
		cancelledMutex.Unlock()
		markBodyUsed()

		// 关闭底层流
		closeStreaming()
		releaseAllLocks()

		resolve(goja.Undefined())
		return runtime.ToValue(promise)
	})

	// locked 属性
	bodyObj.Set("locked", false)

	respObj.Set("body", bodyObj)
	// 🔥 数据缓存机制（确保只读取一次）
	var cachedData []byte
	var cacheError error
	var cacheOnce sync.Once
	var cacheMutex sync.RWMutex

	// 🔥 将流式读取错误转换为 JS 可识别的错误对象
	convertStreamError := func(err error) goja.Value {
		if err == nil {
			return goja.Undefined()
		}

		switch e := err.(type) {
		case *AbortReasonError:
			reason := e.Reason()
			if reason == nil || goja.IsUndefined(reason) || goja.IsNull(reason) {
				reason = CreateDOMException(runtime, "This operation was aborted", "AbortError")
			}
			return reason
		case *AbortError:
			return CreateAbortErrorObject(runtime, err)
		default:
			return runtime.NewGoError(err)
		}
	}

	handleBodyReadError := func(err error, reject func(interface{}) error) bool {
		if err == nil {
			return false
		}
		closeStreaming()
		reject(convertStreamError(err))
		return true
	}

	readStreamIntoCache := func() {
		defer closeStreaming()
		defer func() {
			if r := recover(); r != nil {
				cacheMutex.Lock()
				cacheError = fmt.Errorf("读取响应流时发生内部错误: %v", r)
				cacheMutex.Unlock()
			}
		}()

		var buffer bytes.Buffer

		for {
			chunk, done, err := streamReader.Read(0)
			if err != nil {
				cacheMutex.Lock()
				cacheError = err
				cacheMutex.Unlock()
				return
			}

			if len(chunk) > 0 {
				if fe.config.MaxResponseSize > 0 && int64(buffer.Len()+len(chunk)) > fe.config.MaxResponseSize {
					cacheMutex.Lock()
					cacheError = fmt.Errorf(
						"响应大小超过缓冲限制: %.2fMB > %.2fMB (使用 .body.getReader() 进行流式读取)",
						float64(buffer.Len()+len(chunk))/1024/1024,
						float64(fe.config.MaxResponseSize)/1024/1024,
					)
					cacheMutex.Unlock()
					return
				}
				_, _ = buffer.Write(chunk)
			}

			if done {
				break
			}
		}

		cacheMutex.Lock()
		cachedData = buffer.Bytes()
		cacheMutex.Unlock()
	}

	// 🔥 P1 优化: 自动清理机制 - 使用可停止的 timer
	// 在 ResponseBodyIdleTimeout 内完全未读取任何数据时关闭流，防止长时间占用连接
	autoCleanupTimeout := fe.config.ResponseBodyIdleTimeout
	if autoCleanupTimeout <= 0 {
		autoCleanupTimeout = 30 * time.Second
	}
	autoCleanupTimer = time.AfterFunc(autoCleanupTimeout, func() {
		// 如果流已经关闭或已被显式取消，则不再处理
		if streamReader == nil || streamReader.IsClosed() {
			return
		}

		cancelledMutex.Lock()
		isCancelled := cancelled
		cancelledMutex.Unlock()
		if isCancelled {
			return
		}

		// 仅在完全没有读取任何字节（GetTotalRead == 0）时触发自动关闭
		if streamReader.GetTotalRead() == 0 {
			closeStreaming()
		}
	})

	// 通用的数据获取函数：优先使用缓存，缓存不存在时读取流
	getResponseData := func() ([]byte, error) {
		// 🔥 检查是否已取消（cancel 后返回空数据）
		cancelledMutex.Lock()
		isCancelled := cancelled
		cancelledMutex.Unlock()

		if isCancelled {
			closeStreaming()
			return []byte{}, nil // cancel 后返回空数据
		}

		cacheOnce.Do(func() {
			// 🔥 再次检查取消状态（防止在 cacheOnce.Do 等待期间被取消）
			cancelledMutex.Lock()
			if cancelled {
				cancelledMutex.Unlock()
				return
			}
			cancelledMutex.Unlock()

			readStreamIntoCache()
		})

		// 🔥 最终检查：即使有缓存数据，如果已取消也返回空
		cancelledMutex.Lock()
		isCancelled = cancelled
		cancelledMutex.Unlock()

		if isCancelled {
			closeStreaming()
			return []byte{}, nil
		}

		cacheMutex.RLock()
		defer cacheMutex.RUnlock()
		return cachedData, cacheError
	}

	// 检查并标记 body 为已使用
	checkAndMarkBodyUsed := func() error {
		if !markBodyUsed() {
			return errors.New(bodyAlreadyUsedErrorMessage)
		}
		return nil
	}

	isBodyConsumed := func() bool {
		bodyUsedMutex.Lock()
		defer bodyUsedMutex.Unlock()
		return bodyConsumed
	}

	// text() - 读取为文本
	// 🔥 使用 setImmediate 替代 goroutine，确保线程安全
	respObj.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 防御性保护
		defer func() {
			if r := recover(); r != nil {
				reject(runtime.NewGoError(fmt.Errorf("response.text internal error: %v", r)))
			}
		}()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.text internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}
				resolve(runtime.ToValue(string(allData)))
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}
			resolve(runtime.ToValue(string(allData)))
		}

		return runtime.ToValue(promise)
	})

	// json() - 读取为 JSON
	// 🔥 使用 setImmediate 替代 goroutine
	respObj.Set("json", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		rejectJSONError := func(parseErr error) {
			if exc, ok := parseErr.(*goja.Exception); ok {
				reject(exc.Value())
			} else {
				reject(runtime.NewGoError(parseErr))
			}
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.json internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}

				parsedVal, parseErr := parseJSONBytes(runtime, allData)
				if parseErr != nil {
					rejectJSONError(parseErr)
				} else {
					resolve(parsedVal)
				}
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}

			parsedVal, parseErr := parseJSONBytes(runtime, allData)
			if parseErr != nil {
				rejectJSONError(parseErr)
			} else {
				resolve(parsedVal)
			}
		}

		return runtime.ToValue(promise)
	})

	// arrayBuffer() - 读取为 ArrayBuffer
	// 🔥 使用 setImmediate 替代 goroutine
	respObj.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.arrayBuffer internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}
				arrayBuffer := runtime.NewArrayBuffer(allData)
				resolve(runtime.ToValue(arrayBuffer))
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}
			arrayBuffer := runtime.NewArrayBuffer(allData)
			resolve(runtime.ToValue(arrayBuffer))
		}

		return runtime.ToValue(promise)
	})

	// blob() - 读取为 Blob
	// 🔥 使用 setImmediate 替代 goroutine
	respObj.Set("blob", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		// 检查 body 是否已被使用
		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				defer func() {
					if r := recover(); r != nil {
						reject(runtime.NewGoError(fmt.Errorf("response.blob internal error: %v", r)))
					}
				}()

				allData, err := getResponseData()
				if handleBodyReadError(err, reject) {
					return goja.Undefined()
				}

				// 从响应头获取 Content-Type
				contentType := "application/octet-stream"
				if ct := data.Headers.Get("Content-Type"); ct != "" {
					contentType = ct
				}

				blobObj, blobErr := fe.createBlobFromBytes(runtime, allData, contentType)
				if blobErr != nil {
					reject(runtime.NewGoError(fmt.Errorf("create Blob failed: %v", blobErr)))
					return goja.Undefined()
				}

				resolve(blobObj)
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			// 降级：同步执行
			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return runtime.ToValue(promise)
			}

			contentType := "application/octet-stream"
			if ct := data.Headers.Get("Content-Type"); ct != "" {
				contentType = ct
			}

			blobObj, blobErr := fe.createBlobFromBytes(runtime, allData, contentType)
			if blobErr != nil {
				reject(runtime.NewGoError(fmt.Errorf("create Blob failed: %v", blobErr)))
				return runtime.ToValue(promise)
			}

			resolve(blobObj)
		}

		return runtime.ToValue(promise)
	})

	// formData() - 读取为 FormData
	respObj.Set("formData", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		execute := func() {
			defer func() {
				if r := recover(); r != nil {
					reject(runtime.NewGoError(fmt.Errorf("response.formData internal error: %v", r)))
				}
			}()

			allData, err := getResponseData()
			if handleBodyReadError(err, reject) {
				return
			}

			formDataObj, parseErr := fe.parseBodyToFormData(runtime, data.Headers, allData)
			if parseErr != nil {
				reject(runtime.NewTypeError(parseErr.Error()))
				return
			}

			resolve(formDataObj)
		}

		setImmediate := runtime.Get("setImmediate")
		if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
			callback := func(call goja.FunctionCall) goja.Value {
				execute()
				return goja.Undefined()
			}
			setImmediateFn(goja.Undefined(), runtime.ToValue(callback))
		} else {
			execute()
		}

		return runtime.ToValue(promise)
	})

	// bodyUsed 属性
	setResponseReadOnlyProperty(runtime, respObj, "bodyUsed", false)

	// 🔥 clone() 方法 - 使用缓存机制（性能优化：共享缓存，避免深拷贝）
	respObj.Set("clone", func(call goja.FunctionCall) goja.Value {
		if isBodyConsumed() {
			panic(runtime.NewTypeError(responseCloneConsumedMessage))
		}
		// 🔥 先读取并缓存数据（确保原始和克隆都能读取）
		localData, err := getResponseData()
		if err != nil {
			panic(convertStreamError(err))
		}

		// 🔥 创建克隆的 ResponseData（非流式，共享缓存数据）
		clonedData := &ResponseData{
			StatusCode:    data.StatusCode,
			Status:        data.Status,
			Headers:       data.Headers.Clone(),
			Body:          localData, // 共享缓存，避免深拷贝
			IsStreaming:   false,     // 克隆为非流式
			FinalURL:      data.FinalURL,
			Redirected:    data.Redirected,
			ResponseType:  data.ResponseType,
			ContentLength: int64(len(localData)),
			AbortCh:       data.AbortCh,
			Signal:        data.Signal,
		}

		return fe.recreateResponse(runtime, clonedData)
	})
}

// attachBufferedBodyMethods 附加缓冲 Body 方法
func (fe *FetchEnhancer) attachBufferedBodyMethods(runtime *goja.Runtime, respObj *goja.Object, data *ResponseData) {
	// 缓冲数据已完全读取到 Body
	bodyData := data.Body

	// 🔥 bodyUsed 状态管理
	var bodyConsumed bool
	var bodyUsedMutex sync.Mutex

	markBodyUsed := func() bool {
		bodyUsedMutex.Lock()
		defer bodyUsedMutex.Unlock()

		if bodyConsumed {
			return false
		}
		bodyConsumed = true
		setResponseReadOnlyProperty(runtime, respObj, "bodyUsed", true)
		return true
	}

	// 🔥 取消状态（与流式模式保持一致）
	var cancelled bool
	var cancelledMutex sync.RWMutex

	// getBodyData 返回当前可读的数据；cancel 后返回空数据
	getBodyData := func() []byte {
		cancelledMutex.RLock()
		isCancelled := cancelled
		cancelledMutex.RUnlock()
		if isCancelled {
			return []byte{}
		}
		return bodyData
	}

	// 标记为已取消
	markCancelled := func() {
		cancelledMutex.Lock()
		cancelled = true
		cancelledMutex.Unlock()
	}

	// 检查并标记 body 为已使用
	checkAndMarkBodyUsed := func() error {
		if !markBodyUsed() {
			return errors.New(bodyAlreadyUsedErrorMessage)
		}
		return nil
	}

	isBodyConsumed := func() bool {
		bodyUsedMutex.Lock()
		defer bodyUsedMutex.Unlock()
		return bodyConsumed
	}

	// text() - 返回文本
	respObj.Set("text", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		resolve(runtime.ToValue(string(getBodyData())))
		return runtime.ToValue(promise)
	})

	// json() - 解析 JSON
	respObj.Set("json", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		parsedVal, err := parseJSONBytes(runtime, getBodyData())
		if err != nil {
			if exc, ok := err.(*goja.Exception); ok {
				reject(exc.Value())
			} else {
				reject(runtime.NewGoError(err))
			}
		} else {
			resolve(parsedVal)
		}
		return runtime.ToValue(promise)
	})

	// arrayBuffer() - 返回 ArrayBuffer
	respObj.Set("arrayBuffer", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		arrayBuffer := runtime.NewArrayBuffer(getBodyData())
		resolve(runtime.ToValue(arrayBuffer))
		return runtime.ToValue(promise)
	})

	// blob() - 返回 Blob
	respObj.Set("blob", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		contentType := "application/octet-stream"
		if ct := data.Headers.Get("Content-Type"); ct != "" {
			contentType = ct
		}

		blobObj, err := fe.createBlobFromBytes(runtime, getBodyData(), contentType)
		if err != nil {
			reject(runtime.NewGoError(fmt.Errorf("create Blob failed: %v", err)))
			return runtime.ToValue(promise)
		}

		resolve(blobObj)
		return runtime.ToValue(promise)
	})

	// formData() - 返回 FormData
	respObj.Set("formData", func(call goja.FunctionCall) goja.Value {
		promise, resolve, reject := runtime.NewPromise()

		if err := checkAndMarkBodyUsed(); err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		formDataObj, err := fe.parseBodyToFormData(runtime, data.Headers, getBodyData())
		if err != nil {
			reject(runtime.NewTypeError(err.Error()))
			return runtime.ToValue(promise)
		}

		resolve(formDataObj)
		return runtime.ToValue(promise)
	})

	// 🔥 body 属性（ReadableStream 对象，支持 cancel 和 getReader）
	// Web API 标准：response.body 应该是 ReadableStream，不是 null
	bodyObj := runtime.NewObject()
	streams.AttachReadableStreamPrototype(runtime, bodyObj)

	var bodyLocked bool
	var bodyLockOwnerID uint64
	var bodyLockCounter uint64
	var bodyLockMutex sync.Mutex

	releaseAllLocks := func() {
		bodyLockMutex.Lock()
		bodyLocked = false
		bodyLockOwnerID = 0
		bodyObj.Set("locked", false)
		bodyLockMutex.Unlock()
	}

	releaseReaderByID := func(ownerID uint64) {
		bodyLockMutex.Lock()
		if bodyLocked && bodyLockOwnerID == ownerID {
			bodyLocked = false
			bodyLockOwnerID = 0
			bodyObj.Set("locked", false)
		}
		bodyLockMutex.Unlock()
	}

	// getReader() 方法
	bodyObj.Set("getReader", func(call goja.FunctionCall) goja.Value {
		if isBodyConsumed() {
			panic(runtime.NewTypeError(bodyAlreadyUsedErrorMessage))
		}

		bodyLockMutex.Lock()
		if bodyLocked {
			bodyLockMutex.Unlock()
			panic(runtime.NewTypeError("ReadableStream is already locked"))
		}
		bodyLocked = true
		bodyLockCounter++
		currentReaderID := bodyLockCounter
		bodyLockOwnerID = currentReaderID
		bodyObj.Set("locked", true)
		bodyLockMutex.Unlock()

		reader := runtime.NewObject()
		localIndex := 0
		closedPromise, resolveClosedPromise, _ := runtime.NewPromise()
		var closeOnce sync.Once
		closeReader := func() {
			closeOnce.Do(func() {
				resolveClosedPromise(goja.Undefined())
				releaseReaderByID(currentReaderID)
			})
		}
		reader.Set("closed", closedPromise)

		// read() 方法
		reader.Set("read", func(call goja.FunctionCall) goja.Value {
			promise, resolve, _ := runtime.NewPromise()
			result := runtime.NewObject()

			cancelledMutex.RLock()
			isCancelled := cancelled
			cancelledMutex.RUnlock()

			if isCancelled {
				// 已取消：直接返回 done
				result.Set("value", goja.Undefined())
				result.Set("done", true)
				resolve(result)
				return runtime.ToValue(promise)
			}

			markBodyUsed()

			if localIndex < len(bodyData) {
				// 返回所有数据（一次性，chunk 类型保持与 Node fetch 一致）
				result.Set("value", createUint8ArrayValue(runtime, bodyData[localIndex:]))
				result.Set("done", false)
				localIndex = len(bodyData)
			} else {
				result.Set("value", goja.Undefined())
				result.Set("done", true)
				closeReader()
			}

			resolve(result)
			return runtime.ToValue(promise)
		})

		// cancel() 方法
		reader.Set("cancel", func(call goja.FunctionCall) goja.Value {
			promise, resolve, _ := runtime.NewPromise()
			localIndex = len(bodyData) // 标记为已消费
			markBodyUsed()
			markCancelled()
			closeReader()
			resolve(goja.Undefined())
			return runtime.ToValue(promise)
		})

		reader.Set("releaseLock", func(call goja.FunctionCall) goja.Value {
			releaseReaderByID(currentReaderID)
			return goja.Undefined()
		})

		return reader
	})

	// cancel() 方法
	bodyObj.Set("cancel", func(call goja.FunctionCall) goja.Value {
		promise, resolve, _ := runtime.NewPromise()
		markBodyUsed()
		markCancelled()
		releaseAllLocks()
		resolve(goja.Undefined())
		return runtime.ToValue(promise)
	})

	// locked 属性
	bodyObj.Set("locked", false)

	respObj.Set("body", bodyObj)
	setResponseReadOnlyProperty(runtime, respObj, "bodyUsed", false)

	// 🔥 clone() 方法 - 缓冲响应克隆（共享数据，避免深拷贝）
	respObj.Set("clone", func(call goja.FunctionCall) goja.Value {
		if isBodyConsumed() {
			panic(runtime.NewTypeError(responseCloneConsumedMessage))
		}
		// 🔥 创建克隆的 ResponseData（共享缓存数据）
		localData := getBodyData()
		clonedData := &ResponseData{
			StatusCode:    data.StatusCode,
			Status:        data.Status,
			Headers:       data.Headers.Clone(),
			Body:          localData, // 共享缓存，避免深拷贝
			IsStreaming:   false,
			FinalURL:      data.FinalURL,
			Redirected:    data.Redirected,
			ResponseType:  data.ResponseType,
			ContentLength: int64(len(localData)),
			AbortCh:       data.AbortCh,
			Signal:        data.Signal,
		}

		return fe.recreateResponse(runtime, clonedData)
	})
}

func parseJSONBytes(runtime *goja.Runtime, data []byte) (goja.Value, error) {
	if runtime == nil {
		return goja.Undefined(), fmt.Errorf("runtime is nil")
	}
	jsonVal := runtime.Get("JSON")
	if jsonVal == nil || goja.IsUndefined(jsonVal) {
		return goja.Undefined(), fmt.Errorf("JSON is not available")
	}
	jsonObj := jsonVal.ToObject(runtime)
	if jsonObj == nil {
		return goja.Undefined(), fmt.Errorf("JSON object is not available")
	}
	parseVal := jsonObj.Get("parse")
	parseFn, ok := goja.AssertFunction(parseVal)
	if !ok {
		return goja.Undefined(), fmt.Errorf("JSON.parse is not a function")
	}
	return parseFn(jsonObj, runtime.ToValue(string(data)))
}

func (fe *FetchEnhancer) parseBodyToFormData(runtime *goja.Runtime, headers http.Header, body []byte) (*goja.Object, error) {
	if runtime == nil {
		return nil, fmt.Errorf("runtime is nil")
	}

	contentType := ""
	if headers != nil {
		contentType = headers.Get("Content-Type")
		if contentType == "" {
			contentType = headers.Get("content-type")
		}
	}

	if strings.TrimSpace(contentType) == "" {
		return nil, fmt.Errorf("Response.formData: missing Content-Type header")
	}

	mediaType, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		return nil, fmt.Errorf("Response.formData: invalid Content-Type: %w", err)
	}

	switch strings.ToLower(mediaType) {
	case "multipart/form-data":
		boundary := params["boundary"]
		if strings.TrimSpace(boundary) == "" {
			return nil, fmt.Errorf("Response.formData: missing multipart boundary")
		}
		return fe.parseMultipartFormData(runtime, body, boundary)
	case "application/x-www-form-urlencoded":
		if charset, ok := params["charset"]; ok {
			cs := strings.TrimSpace(strings.ToLower(charset))
			if cs != "" && cs != "utf-8" && cs != "utf8" {
				return nil, fmt.Errorf("Response.formData: unsupported charset %q", charset)
			}
		}
		return fe.parseURLEncodedFormData(runtime, body)
	default:
		return nil, fmt.Errorf("Response.formData: unsupported Content-Type %q", mediaType)
	}
}

func (fe *FetchEnhancer) parseMultipartFormData(runtime *goja.Runtime, body []byte, boundary string) (*goja.Object, error) {
	formDataObj, formDataInstance, err := fe.newJSFormDataObject(runtime)
	if err != nil {
		return nil, err
	}

	reader := multipart.NewReader(bytes.NewReader(body), boundary)
	for {
		part, err := reader.NextPart()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("Response.formData: failed to read multipart body: %w", err)
		}

		partData, err := io.ReadAll(part)
		part.Close()
		if err != nil {
			return nil, fmt.Errorf("Response.formData: failed to read multipart entry: %w", err)
		}

		name := part.FormName()
		if name == "" {
			continue
		}

		filename := part.FileName()
		if filename != "" {
			fileObj, fileErr := fe.createFileFromBytes(runtime, partData, filename, part.Header.Get("Content-Type"))
			if fileErr != nil {
				return nil, fmt.Errorf("Response.formData: failed to create File: %w", fileErr)
			}
			formDataInstance.Append(name, fileObj)
			continue
		}

		formDataInstance.Append(name, string(partData))
	}

	return formDataObj, nil
}

func (fe *FetchEnhancer) parseURLEncodedFormData(runtime *goja.Runtime, body []byte) (*goja.Object, error) {
	formDataObj, formDataInstance, err := fe.newJSFormDataObject(runtime)
	if err != nil {
		return nil, err
	}

	if len(body) == 0 {
		return formDataObj, nil
	}

	pairs := bytes.Split(body, []byte("&"))
	for _, pair := range pairs {
		if len(pair) == 0 {
			continue
		}

		var namePart, valuePart []byte
		if idx := bytes.IndexByte(pair, '='); idx >= 0 {
			namePart = pair[:idx]
			valuePart = pair[idx+1:]
		} else {
			namePart = pair
			valuePart = []byte{}
		}

		name, err := neturl.QueryUnescape(string(namePart))
		if err != nil {
			return nil, fmt.Errorf("Response.formData: failed to decode field name: %w", err)
		}
		value, err := neturl.QueryUnescape(string(valuePart))
		if err != nil {
			return nil, fmt.Errorf("Response.formData: failed to decode field value: %w", err)
		}
		formDataInstance.Append(name, value)
	}

	return formDataObj, nil
}

func (fe *FetchEnhancer) newJSFormDataObject(runtime *goja.Runtime) (*goja.Object, *FormData, error) {
	if runtime == nil {
		return nil, nil, fmt.Errorf("runtime is nil")
	}

	formDataVal := runtime.Get("FormData")
	if formDataVal == nil || goja.IsUndefined(formDataVal) || goja.IsNull(formDataVal) {
		return nil, nil, fmt.Errorf("FormData constructor is unavailable")
	}

	formDataObj, err := runtime.New(formDataVal)
	if err != nil {
		return nil, nil, err
	}

	instance, err := ExtractFormDataInstance(formDataObj)
	if err != nil {
		return nil, nil, err
	}

	return formDataObj, instance, nil
}

// ==================== FormData 提取 ====================

// extractFormDataInCurrentThread 在当前线程提取 FormData
// 🔥 关键：必须在有 runtime 上下文时提取，避免异步 goroutine 中访问
// 🔥 返回值：interface{} 可能是 []byte（缓冲模式）或 io.Reader（流式模式）
func (fe *FetchEnhancer) extractFormDataInCurrentThread(runtime *goja.Runtime, formDataObj *goja.Object) (interface{}, string, error) {
	// 从浏览器 FormData 提取实例
	formData, err := ExtractFormDataInstance(formDataObj)
	if err != nil {
		return nil, "", err
	}

	// 防御性保护：配置兜底，避免 nil
	if fe.config == nil {
		fe.config = DefaultFetchConfig()
	}
	if fe.config.FormDataConfig == nil {
		fe.config.FormDataConfig = formdata.DefaultFormDataStreamConfig()
	}

	// 创建 StreamingFormData（使用内部包）
	// 🔥 使用 FormDataConfig 中的配置
	config := formdata.DefaultFormDataStreamConfigWithBuffer(
		fe.config.FormDataConfig.BufferSize,
		fe.config.FormDataConfig.MaxBufferedFormDataSize,
		fe.config.FormDataConfig.MaxStreamingFormDataSize,
		fe.config.FormDataConfig.MaxFileSize,
		fe.config.RequestTimeout,
	)
	streamingFormData := formdata.NewStreamingFormData(config)
	if boundary := getFormDataBoundaryFromObject(formDataObj); boundary != "" {
		streamingFormData.SetBoundary(boundary)
	}

	// 转换 entries
	entries := formData.GetEntries()
	for _, entry := range entries {
		// 处理不同类型的值
		var value interface{}
		var contentType string

		switch v := entry.Value.(type) {
		case string:
			value = v
		case []byte:
			value = v
		case goja.Value:
			// 可能是 Blob/File 对象
			if obj, ok := v.(*goja.Object); ok {
				// 🔥 先检查是否是 File（更具体），再检查 Blob（更通用）
				// 因为 File 继承自 Blob，所以 File 对象同时具有 __isBlob=true 和 __isFile=true
				if isFile := obj.Get("__isFile"); isFile != nil && !goja.IsUndefined(isFile) && !goja.IsNull(isFile) && isFile.ToBoolean() {
					dataBytes, ct, filename, err := fe.ExtractFileData(obj)
					if err != nil {
						return nil, "", fmt.Errorf("提取 File 数据失败: %w", err)
					}
					value = dataBytes
					contentType = ct
					// 如果入口未提供 filename，则使用 File 自带的名称
					if entry.Filename == "" && filename != "" {
						entry.Filename = filename
					}
				} else if isBlob := obj.Get("__isBlob"); isBlob != nil && !goja.IsUndefined(isBlob) && !goja.IsNull(isBlob) && isBlob.ToBoolean() {
					// 🔥 使用统一的提取方法，兼容 Blob 原生实现
					dataBytes, ct, err := fe.ExtractBlobData(obj)
					if err != nil {
						return nil, "", fmt.Errorf("提取 Blob 数据失败: %w", err)
					}
					value = dataBytes
					contentType = ct
				}
			}
			// 如果不是 Blob，转为字符串
			if value == nil {
				value = v.String()
			}
		case map[string]interface{}:
			// 🔥 对象转换为 "[object Object]"（符合浏览器行为，防止循环引用导致栈溢出）
			value = "[object Object]"
		case nil:
			// 🔥 nil 转换为 "null"
			value = "null"
		default:
			value = fmt.Sprintf("%v", v)
		}

		// 添加到 StreamingFormData
		streamingFormData.AddEntry(formdata.FormDataEntry{
			Name:        entry.Name,
			Value:       value,
			Filename:    entry.Filename,
			ContentType: contentType,
		})
	}

	// 🔥 判断使用缓冲模式还是流式模式
	totalSize := streamingFormData.GetTotalSize()
	boundary := streamingFormData.GetBoundary()
	shouldStream := streamingFormData.ShouldUseStreaming() || totalSize > fe.config.FormDataConfig.MaxBufferedFormDataSize

	// 🔥 如果总大小 <= 缓冲阈值，使用缓冲模式（返回 []byte）
	// 注意：totalSize == 0 的情况（空表单）也应该缓冲
	if !shouldStream && totalSize >= 0 && totalSize <= fe.config.FormDataConfig.MaxBufferedFormDataSize {
		// 缓冲模式：一次性读取到内存
		reader, err := streamingFormData.CreateReader()
		if err != nil {
			return nil, "", err
		}

		// 读取所有数据
		data, err := io.ReadAll(reader)
		if err != nil {
			return nil, "", fmt.Errorf("读取 FormData 失败: %w", err)
		}

		// 返回 []byte（带 Content-Length）
		return data, boundary, nil
	}

	// 流式模式：返回 Reader（chunked 传输）
	reader, err := streamingFormData.CreateReader()
	if err != nil {
		return nil, "", err
	}

	return reader, boundary, nil
}

func (fe *FetchEnhancer) convertNodeFormDataToBytes(runtime *goja.Runtime, formDataObj *goja.Object) ([]byte, string, error) {
	if formDataObj == nil {
		return nil, "", fmt.Errorf("Node.js FormData 为 nil")
	}

	if goStreamingFD := formDataObj.Get("__getGoStreamingFormData"); !goja.IsUndefined(goStreamingFD) && goStreamingFD != nil {
		if streamingFormData, ok := goStreamingFD.Export().(*formdata.StreamingFormData); ok && streamingFormData != nil {
			reader, err := streamingFormData.CreateReader()
			if err != nil {
				return nil, "", fmt.Errorf("创建 FormData reader 失败: %w", err)
			}
			data, err := io.ReadAll(reader)
			if err != nil {
				return nil, "", fmt.Errorf("读取 FormData 失败: %w", err)
			}
			return data, streamingFormData.GetBoundary(), nil
		}
	}

	getBufferFunc := formDataObj.Get("getBuffer")
	if goja.IsUndefined(getBufferFunc) || getBufferFunc == nil {
		return nil, "", fmt.Errorf("Node.js FormData 缺少 getBuffer 方法")
	}
	getBuffer, ok := goja.AssertFunction(getBufferFunc)
	if !ok {
		return nil, "", fmt.Errorf("Node.js FormData getBuffer 不是一个函数")
	}

	bufferVal, err := getBuffer(formDataObj)
	if err != nil {
		return nil, "", fmt.Errorf("调用 getBuffer 失败: %w", err)
	}

	bufferObj := bufferVal.ToObject(runtime)
	if bufferObj == nil {
		return nil, "", fmt.Errorf("getBuffer 没有返回 Buffer")
	}

	data, err := fe.extractBufferBytes(bufferObj)
	if err != nil {
		return nil, "", fmt.Errorf("提取 buffer 数据失败: %w", err)
	}

	boundary := ""
	if boundaryGetter := formDataObj.Get("getBoundary"); !goja.IsUndefined(boundaryGetter) && boundaryGetter != nil {
		getBoundaryFn, ok := goja.AssertFunction(boundaryGetter)
		if !ok {
			return nil, "", fmt.Errorf("getBoundary 不是一个函数")
		}
		result, err := getBoundaryFn(formDataObj)
		if err != nil {
			return nil, "", fmt.Errorf("调用 getBoundary 失败: %w", err)
		}
		boundary = strings.TrimSpace(result.String())
	}

	return data, boundary, nil
}

// ==================== Body Wrapper ====================

// createBodyWrapper 创建 Body 包装器（带超时和取消）
// 🔥 核心方法：延迟 context 取消（在 body.Close() 时调用）
func (fe *FetchEnhancer) createBodyWrapper(body io.ReadCloser, contentLength int64, timeout time.Duration, cancel context.CancelFunc) io.ReadCloser {
	// 使用 body_timeout.go 中的实现
	// 参数顺序: body, contentLength, totalTimeout, baseIdleTimeout, cancel
	return CreateBodyWithCancel(body, contentLength, fe.config.ResponseReadTimeout, fe.config.ResponseBodyIdleTimeout, cancel)
}

func (fe *FetchEnhancer) getReadableStreamConsumer(runtime *goja.Runtime) (goja.Callable, error) {
	fnVal := runtime.Get("__flowConsumeReadableStream")
	if fnVal == nil || goja.IsUndefined(fnVal) || goja.IsNull(fnVal) {
		if _, err := runtime.RunString(readableStreamConsumerJS); err != nil {
			return nil, err
		}
		fnVal = runtime.Get("__flowConsumeReadableStream")
	}
	fn, ok := goja.AssertFunction(fnVal)
	if !ok {
		return nil, fmt.Errorf("__flowConsumeReadableStream is not callable")
	}
	return fn, nil
}

func (fe *FetchEnhancer) consumeReadableStream(runtime *goja.Runtime, stream *goja.Object, mode string) (goja.Value, error) {
	if stream == nil {
		return nil, fmt.Errorf("ReadableStream body is nil")
	}
	consumeFn, err := fe.getReadableStreamConsumer(runtime)
	if err != nil {
		return nil, err
	}
	return consumeFn(goja.Undefined(), stream, runtime.ToValue(mode))
}

// ==================== 辅助方法 ====================

func isReadableStreamObject(obj *goja.Object) bool {
	if obj == nil {
		return false
	}
	getReaderVal := obj.Get("getReader")
	if getReaderVal == nil || goja.IsUndefined(getReaderVal) || goja.IsNull(getReaderVal) {
		return false
	}
	_, ok := goja.AssertFunction(getReaderVal)
	return ok
}

// extractBufferBytes 从 Buffer 对象提取字节数据
// 🔥 用于 Node.js FormData 的 getBuffer() 方法返回值
func (fe *FetchEnhancer) extractBufferBytes(bufferObj *goja.Object) ([]byte, error) {
	// 安全检查
	if bufferObj == nil {
		return nil, fmt.Errorf("buffer object is nil")
	}

	// 获取 Buffer 长度
	lengthVal := bufferObj.Get("length")
	if lengthVal == nil || goja.IsUndefined(lengthVal) {
		return nil, fmt.Errorf("buffer object has no length property")
	}

	length := int(lengthVal.ToInteger())
	if length <= 0 {
		return []byte{}, nil
	}

	// 逐字节读取数据
	data := make([]byte, length)
	for i := 0; i < length; i++ {
		val := bufferObj.Get(fmt.Sprintf("%d", i))
		if goja.IsUndefined(val) {
			data[i] = 0
		} else {
			data[i] = byte(val.ToInteger())
		}
	}

	return data, nil
}

// ExtractFileData 从 File 对象提取数据
// 🔥 用于 Node.js FormData 模块处理 File 对象
func (fe *FetchEnhancer) ExtractFileData(fileObj *goja.Object) (data []byte, contentType string, filename string, err error) {
	// 🔥 防御性保护：捕获所有 panic
	defer func() {
		if r := recover(); r != nil {
			data = nil
			contentType = ""
			filename = ""
			err = fmt.Errorf("extract file data panic: %v", r)
		}
	}()

	// 安全检查
	if fileObj == nil {
		return nil, "", "", fmt.Errorf("file object is nil")
	}

	// 检查是否是 File 对象
	isFile := fileObj.Get("__isFile")
	if goja.IsUndefined(isFile) || isFile == nil || !isFile.ToBoolean() {
		return nil, "", "", fmt.Errorf("not a File object")
	}

	// 提取数据：优先使用新的 __fileData（*blob.JSFile），兼容旧的 __data []byte
	if dataVal := fileObj.Get("__fileData"); !goja.IsUndefined(dataVal) && !goja.IsNull(dataVal) && dataVal != nil {
		exported := dataVal.Export()
		if exported == nil {
			return nil, "", "", fmt.Errorf("file data export returned nil")
		}

		if fileData, ok := exported.(*blob.JSFile); ok {
			data = fileData.GetData()
			contentType = fileData.GetType()
			filename = fileData.GetName()
		} else {
			return nil, "", "", fmt.Errorf("file data is not *blob.JSFile, got %T", exported)
		}
	} else if legacyVal := fileObj.Get("__data"); !goja.IsUndefined(legacyVal) && !goja.IsNull(legacyVal) && legacyVal != nil {
		// 兼容旧对象上的 __data []byte
		exported := legacyVal.Export()
		if exported == nil {
			return nil, "", "", fmt.Errorf("legacy file data export returned nil")
		}
		bytesData, ok := exported.([]byte)
		if !ok {
			return nil, "", "", fmt.Errorf("legacy file data is not []byte, got %T", exported)
		}
		data = bytesData
		// contentType/filename 仍从属性中读取
	} else {
		return nil, "", "", fmt.Errorf("file has no __fileData or __data property")
	}

	// 提取 contentType
	if typeVal := fileObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
		contentType = typeVal.String()
	}

	// 提取 filename
	if nameVal := fileObj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) && !goja.IsNull(nameVal) {
		filename = nameVal.String()
	}

	return data, contentType, filename, nil
}

// ExtractBlobData 从 Blob 对象提取数据
// 🔥 用于 Node.js FormData 模块处理 Blob 对象
func (fe *FetchEnhancer) ExtractBlobData(blobObj *goja.Object) (data []byte, contentType string, err error) {
	// 🔥 防御性保护：捕获所有 panic
	defer func() {
		if r := recover(); r != nil {
			data = nil
			contentType = ""
			err = fmt.Errorf("extract blob data panic: %v", r)
		}
	}()

	// 安全检查
	if blobObj == nil {
		return nil, "", fmt.Errorf("blob object is nil")
	}

	// 检查是否是 Blob 对象
	isBlob := blobObj.Get("__isBlob")
	if goja.IsUndefined(isBlob) || isBlob == nil || !isBlob.ToBoolean() {
		return nil, "", fmt.Errorf("not a Blob object")
	}

	// 提取数据：优先 __blobData（*blob.JSBlob），兼容旧的 __data []byte
	if dataVal := blobObj.Get("__blobData"); !goja.IsUndefined(dataVal) && !goja.IsNull(dataVal) && dataVal != nil {
		exported := dataVal.Export()
		if exported == nil {
			return nil, "", fmt.Errorf("blob data export returned nil")
		}

		if blobData, ok := exported.(*blob.JSBlob); ok {
			data = blobData.GetData()
			contentType = blobData.GetType()
		} else {
			return nil, "", fmt.Errorf("blob data is not *blob.JSBlob, got %T", exported)
		}
	} else if legacyVal := blobObj.Get("__data"); !goja.IsUndefined(legacyVal) && !goja.IsNull(legacyVal) && legacyVal != nil {
		exported := legacyVal.Export()
		if exported == nil {
			return nil, "", fmt.Errorf("legacy blob data export returned nil")
		}
		bytesData, ok := exported.([]byte)
		if !ok {
			return nil, "", fmt.Errorf("legacy blob data is not []byte, got %T", exported)
		}
		data = bytesData
	} else {
		return nil, "", fmt.Errorf("blob has no __blobData or __data property")
	}

	return data, contentType, nil
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **模块化集成**：
//    - internal 包：共享实现（ssrf、formdata、body、blob、url）
//    - fetch 包：业务逻辑（config、security、constructors、request、response）
//    - FetchEnhancer：统一入口（集成所有组件）
//
// 2. **零破坏性重构**：
//    - API 完全兼容原始实现
//    - 行为保持一致（Promise、EventLoop、Runtime Pool）
//    - 无需修改任何用户代码
//
// 3. **Promise 驱动**：
//    - EventLoop 模式：使用 setImmediate 轮询（不阻塞）
//    - Runtime Pool 模式：同步等待（goja Runtime 不是线程安全）
//
// 4. **类型系统**：
//    - Headers：请求和响应头部对象
//    - Request：请求构造器（支持 clone）
//    - Response：响应对象（支持 clone、流式、缓冲）
//    - AbortController：请求取消控制器
//    - FormData：浏览器兼容的 FormData API
//    - Blob/File：二进制数据对象
//    - URLSearchParams：URL 查询参数对象
//
// 5. **流式支持**：
//    - Node.js Readable Stream API
//    - Web Streams API（ReadableStream）
//    - Clone 缓存机制（首次读取时缓存）
//
// 6. **错误处理**：
//    - 浏览器兼容的错误码（ECONNABORTED、ENOTFOUND 等）
//    - AbortError 特殊处理
//    - 详细的错误消息（方便调试）
//
// 7. **资源管理**：
//    - 延迟 context 取消（bodyWrapper.Close() 时调用）
//    - 双重超时保护（idle + total）
//    - Abort 监听器（channel-based）
//    - 连接复用（HTTP Transport 配置）
