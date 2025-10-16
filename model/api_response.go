package model

// StatsAPIResponse 统计API统一响应格式
// 字段顺序: success -> data -> timestamp -> request_id
type StatsAPIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data"`
	Timestamp string      `json:"timestamp"`
	RequestID string      `json:"request_id,omitempty"`
}

// StatsErrorResponse 统计API错误响应
// 字段顺序: success -> error -> message -> timestamp -> request_id
type StatsErrorResponse struct {
	Success   bool   `json:"success"`
	Error     string `json:"error"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
	RequestID string `json:"request_id,omitempty"`
}
