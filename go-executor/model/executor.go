package model

import "runtime"

// ExecutorStats 执行器统计信息
type ExecutorStats struct {
	TotalExecutions   int64            `json:"totalExecutions"`
	SuccessfulExecs   int64            `json:"successfulExecutions"`
	FailedExecs       int64            `json:"failedExecutions"`
	CurrentExecutions int64            `json:"currentExecutions"`
	SuccessRate       float64          `json:"successRate"`
	AvgExecutionTime  int64            `json:"avgExecutionTime"` // 毫秒
	TotalTime         int64            `json:"totalExecutionTime"`
	MemStats          runtime.MemStats `json:"memStats"`

	// 执行策略统计
	SyncExecutions  int64 `json:"syncExecutions"`  // 使用 Runtime 池的次数
	AsyncExecutions int64 `json:"asyncExecutions"` // 使用 EventLoop 的次数
}

// ExecutionError 自定义执行错误
type ExecutionError struct {
	Type    string
	Message string
}

func (e *ExecutionError) Error() string {
	return e.Message
}

// ExecutionResult 执行结果包装
type ExecutionResult struct {
	Result      interface{}
	ExecutionId string
}

// WarmupStats 模块预热统计信息
type WarmupStats struct {
	Status       string   `json:"status"`       // "completed", "not_started", "failed"
	Modules      []string `json:"modules"`      // 预编译的模块列表
	TotalModules int      `json:"totalModules"` // 总模块数
	SuccessCount int      `json:"successCount"` // 成功数量
	Elapsed      string   `json:"elapsed"`      // 耗时（格式化）
	ElapsedMs    int64    `json:"elapsedMs"`    // 耗时（毫秒）
	Timestamp    string   `json:"timestamp"`    // 预热完成时间
}
