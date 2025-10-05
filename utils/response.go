package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorResponse 统一的错误响应结构
type ErrorResponse struct {
	Success   bool         `json:"success"`
	Error     *ErrorDetail `json:"error,omitempty"`
	Timestamp string       `json:"timestamp"`
	RequestID string       `json:"request_id,omitempty"`
}

// ErrorDetail 错误详情
type ErrorDetail struct {
	Type    string                 `json:"type"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// SuccessResponse 统一的成功响应结构
type SuccessResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Message   string      `json:"message,omitempty"`
	Timestamp string      `json:"timestamp"`
	RequestID string      `json:"request_id,omitempty"`
}

// RespondError 统一的错误响应
// 参数：
//   - c: gin.Context
//   - code: HTTP 状态码
//   - errType: 错误类型（如 "AuthenticationError", "ValidationError"）
//   - message: 错误消息
//   - details: 可选的详细信息（如重试时间、限制值等）
func RespondError(c *gin.Context, code int, errType, message string, details map[string]interface{}) {
	response := ErrorResponse{
		Success: false,
		Error: &ErrorDetail{
			Type:    errType,
			Message: message,
			Details: details,
		},
		Timestamp: FormatTime(Now()),
		RequestID: c.GetString("request_id"), // 从上下文获取请求ID（如果有中间件设置）
	}

	c.JSON(code, response)
}

// RespondSuccess 统一的成功响应
// 参数：
//   - c: gin.Context
//   - data: 响应数据
//   - message: 可选的成功消息
func RespondSuccess(c *gin.Context, data interface{}, message string) {
	response := SuccessResponse{
		Success:   true,
		Data:      data,
		Message:   message,
		Timestamp: FormatTime(Now()),
		RequestID: c.GetString("request_id"),
	}

	c.JSON(http.StatusOK, response)
}

// RespondSuccessWithCode 统一的成功响应（自定义状态码）
// 参数：
//   - c: gin.Context
//   - code: HTTP 状态码
//   - data: 响应数据
//   - message: 可选的成功消息
func RespondSuccessWithCode(c *gin.Context, code int, data interface{}, message string) {
	response := SuccessResponse{
		Success:   true,
		Data:      data,
		Message:   message,
		Timestamp: FormatTime(Now()),
		RequestID: c.GetString("request_id"),
	}

	c.JSON(code, response)
}

// 常用错误类型常量
const (
	ErrorTypeAuthentication = "AuthenticationError"
	ErrorTypeAuthorization  = "AuthorizationError"
	ErrorTypeValidation     = "ValidationError"
	ErrorTypeNotFound       = "NotFoundError"
	ErrorTypeRateLimit      = "RateLimitError"
	ErrorTypeTokenRateLimit = "TokenRateLimitError"
	ErrorTypeIPRateLimit    = "IPRateLimitError"
	ErrorTypeInternal       = "InternalError"
	ErrorTypeServiceUnavail = "ServiceUnavailableError"
	ErrorTypeBadRequest     = "BadRequestError"
)
