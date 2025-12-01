package fetch

import "github.com/dop251/goja"

// ==================== AbortError ====================

// AbortError 表示请求被中止
// 🔥 浏览器兼容的 Abort Error
// 标准参考: https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController/abort
//
// 用途说明:
// - fetch 请求被 AbortController.abort() 取消时抛出
// - 区分于其他网络错误（如超时、连接失败等）
// - JavaScript 可以通过 error.name === 'AbortError' 识别
type AbortError struct {
	message string
}

// NewAbortError 创建 AbortError
func NewAbortError(message string) *AbortError {
	if message == "" {
		message = "The operation was aborted"
	}
	return &AbortError{message: message}
}

// Error 实现 error 接口
func (e *AbortError) Error() string {
	return e.message
}

// ensureASCIIHeaderValue 校验 header 值字符合法性，与 Node/undici 对齐，违反时抛 TypeError
func ensureASCIIHeaderValue(runtime *goja.Runtime, value string) {
	for _, r := range value {
		// 允许 obs-text (0x80-0xFF)，拒绝控制字符、DEL 和超出 0xFF 的码位
		if r > 0xFF || (r <= 0x1F && r != '\t') || r == 0x7F {
			panic(runtime.NewTypeError("Invalid character in header value"))
		}
	}
}

// createUint8ArrayValue 将 Go 字节切片包装成 Uint8Array（与 Node fetch 行为一致）
// - 优先使用全局 Uint8Array 构造器
// - 如果不可用，则回退为 ArrayBuffer
func createUint8ArrayValue(runtime *goja.Runtime, data []byte) goja.Value {
	if runtime == nil {
		return goja.Undefined()
	}

	arrayBuffer := runtime.NewArrayBuffer(data)
	uint8ArrayCtor := runtime.Get("Uint8Array")
	if uint8ArrayCtor != nil && !goja.IsUndefined(uint8ArrayCtor) && !goja.IsNull(uint8ArrayCtor) {
		if ctor, ok := goja.AssertConstructor(uint8ArrayCtor); ok {
			if typedArray, err := ctor(nil, runtime.ToValue(arrayBuffer)); err == nil {
				return typedArray
			}
		}
	}

	return runtime.ToValue(arrayBuffer)
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **浏览器兼容性**：
//    - 与浏览器 AbortError 行为一致
//    - 可以被 JavaScript 识别和处理
//    - 支持自定义错误消息
//
// 2. **错误区分**：
//    - 与网络错误（超时、连接失败）区分开
//    - 与业务错误（HTTP 4xx/5xx）区分开
//    - 便于用户进行错误处理
//
// 3. **简洁性**：
//    - 仅包含必要的错误消息
//    - 不携带额外的状态或上下文
//    - 符合 Go error 接口规范
