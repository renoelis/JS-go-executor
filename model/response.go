package model

// ExecuteResponse 执行响应结构
type ExecuteResponse struct {
	Success   bool           `json:"success"`
	Result    interface{}    `json:"result,omitempty"`
	Error     *ExecuteError  `json:"error,omitempty"`
	Timing    *ExecuteTiming `json:"timing"`
	Timestamp string         `json:"timestamp"`
	RequestID string         `json:"request_id,omitempty"` // 🔄 统一使用 request_id（原 executionId 已移除）
}

// ExecuteError 执行错误结构
type ExecuteError struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

// ExecuteTiming 执行时间统计
type ExecuteTiming struct {
	ExecutionTime int64 `json:"executionTime"` // 毫秒
	TotalTime     int64 `json:"totalTime"`     // 毫秒
}
