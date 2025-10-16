package utils

// ContextKey 定义context key的类型（避免冲突）
type ContextKey string

const (
	// RequestIDKey context中request_id的key
	RequestIDKey ContextKey = "request_id"
)
