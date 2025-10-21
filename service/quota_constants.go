package service

import "time"

// 🔥 修复问题3.2：Magic Number定义为常量

// 配额系统常量
const (
	// MaxRecursionDepth 递归深度限制（防止栈溢出）
	MaxRecursionDepth = 2
	
	// AlertThreshold 告警阈值（每N次丢弃触发告警）
	AlertThreshold = 100
	
	// AlertCooldownDuration 告警冷却时间（避免告警风暴）
	AlertCooldownDuration = 5 * time.Minute
	
	// DefaultRetentionDays 默认日志保留天数
	DefaultRetentionDays = 180
	
	// DefaultBatchSize 默认批处理大小
	DefaultBatchSize = 500
	
	// MaxBatchSize 批量操作最大值（防止SQL过大）
	MaxBatchSize = 500
	
	// SyncQueueTimeout 同步队列超时时间
	SyncQueueTimeout = 5 * time.Second
	
	// CleanupBatchDelay 清理批次间延迟（避免过载）
	CleanupBatchDelay = 500 * time.Millisecond
	
	// DBLoadRetryInterval DB加载失败重试间隔
	DBLoadRetryInterval = 1 * time.Second
)

// Redis相关常量
const (
	// RedisKeyPrefix Redis配额Key前缀
	RedisKeyPrefix = "quota:"
)
