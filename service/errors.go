package service

import "errors"

// 常见业务错误定义（供脚本管理等功能复用）
var (
	ErrTokenNotFound  = errors.New("token_not_found")
	ErrTokenExpired   = errors.New("token_expired")
	ErrTokenDisabled  = errors.New("token_disabled")
)
