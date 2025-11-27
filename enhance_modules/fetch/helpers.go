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

// ensureASCIIHeaderValue 校验 header 值是否为 ASCII，违反时抛出 TypeError
func ensureASCIIHeaderValue(runtime *goja.Runtime, value string) {
	for _, r := range value {
		if r > 0xFF {
			panic(runtime.NewTypeError("Invalid character in header value"))
		}
	}
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
