package model

import "encoding/json"

// ExecuteResponse 执行响应结构
type ExecuteResponse struct {
	Success   bool            `json:"success"`
	Result    interface{}     `json:"result,omitempty"` // 🔥 可以是普通数据或 json.RawMessage（预序列化）
	Error     *ExecuteError   `json:"error,omitempty"`
	Timing    *ExecuteTiming  `json:"timing"`
	Timestamp string          `json:"timestamp"`
	RequestID string          `json:"request_id,omitempty"` // 🔄 统一使用 request_id（原 executionId 已移除）
	ResultRaw json.RawMessage `json:"-"`                    // 🔥 内部使用，不序列化
}

// ExecuteError 执行错误结构
type ExecuteError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
	Stack   string `json:"stack,omitempty"` // 🔥 新增：JavaScript错误的stack trace
}

// ExecuteTiming 执行时间统计
type ExecuteTiming struct {
	ExecutionTime int64 `json:"executionTime"` // 毫秒
	TotalTime     int64 `json:"totalTime"`     // 毫秒
}
