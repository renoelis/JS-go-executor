package model

// GlobalPeriod 表示统计时间范围
type GlobalPeriod struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

// GlobalQuotaUsage 脚本配额使用情况（全局）
type GlobalQuotaUsage struct {
	Used      int64  `json:"used" db:"used"`
	Max       int64  `json:"max" db:"max"`
	UsageRate string `json:"usage_rate"`
}

// GlobalErrorStats 全局错误指标
type GlobalErrorStats struct {
	QuotaExceeded     int64 `json:"quota_exceeded"`
	IPBlocked         int64 `json:"ip_blocked"`
	NotFound          int64 `json:"not_found"`
	CacheUpdateFailed int64 `json:"cache_update_failed"`
}

// GlobalCacheStats 全局缓存指标
type GlobalCacheStats struct {
	HitCount  int64  `json:"hit_count"`
	MissCount int64  `json:"miss_count"`
	HitRate   string `json:"hit_rate"`
}

// GlobalScriptSummary 全局脚本统计汇总
type GlobalScriptSummary struct {
	TotalScripts       int64             `json:"total_scripts"`
	ActiveScripts      int64             `json:"active_scripts"`
	TotalVersions      int64             `json:"total_versions"`
	QuotaUsage         GlobalQuotaUsage  `json:"quota_usage"`
	TotalExecutions    int64             `json:"total_executions"`
	SuccessCount       int64             `json:"success_count"`
	FailedCount        int64             `json:"failed_count"`
	SuccessRate        string            `json:"success_rate"`
	AvgExecutionTimeMs float64           `json:"avg_execution_time_ms"`
	MaxExecutionTimeMs int64             `json:"max_execution_time_ms"`
	P99ExecutionTimeMs int64             `json:"p99_execution_time_ms"`
	ErrorStats         GlobalErrorStats  `json:"error_stats"`
	CacheStats         *GlobalCacheStats `json:"cache_stats,omitempty"`
}

// GlobalTopScriptItem 脚本排行榜项
type GlobalTopScriptItem struct {
	Rank        int     `json:"rank"`
	ScriptID    string  `json:"script_id"`
	Description string  `json:"description"`
	Executions  int64   `json:"executions"`
	SuccessRate string  `json:"success_rate"`
	AvgTimeMs   float64 `json:"avg_time_ms"`
}

// GlobalDailyTrendItem 每日趋势项
type GlobalDailyTrendItem struct {
	Date    string `json:"date" db:"date"`
	Total   int64  `json:"total" db:"total"`
	Success int64  `json:"success" db:"success"`
	Failed  int64  `json:"failed" db:"failed"`
}

// GlobalScriptStatsResponse 全局脚本统计响应
type GlobalScriptStatsResponse struct {
	Period     GlobalPeriod           `json:"period"`
	Summary    GlobalScriptSummary    `json:"summary"`
	TopScripts []GlobalTopScriptItem  `json:"top_scripts"`
	DailyTrend []GlobalDailyTrendItem `json:"daily_trend"`
}
