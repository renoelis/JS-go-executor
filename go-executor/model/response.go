package model

// ExecuteResponse 执行响应结构
type ExecuteResponse struct {
	Success     bool           `json:"success"`
	Result      interface{}    `json:"result,omitempty"`
	Error       *ExecuteError  `json:"error,omitempty"`
	Timing      *ExecuteTiming `json:"timing"`
	Timestamp   string         `json:"timestamp"`
	ExecutionId string         `json:"executionId,omitempty"`
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
