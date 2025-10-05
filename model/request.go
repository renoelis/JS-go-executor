package model

// ExecuteRequest 执行请求结构
type ExecuteRequest struct {
	Input      map[string]interface{} `json:"input" binding:"required"`
	CodeBase64 string                 `json:"codebase64" binding:"required"`
}
