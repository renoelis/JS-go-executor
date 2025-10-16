package model

// 统计API响应结构体 - 保证JSON字段顺序

// ModuleStatsResponse 模块统计响应
type ModuleStatsResponse struct {
	Query   QueryInfo        `json:"query"`
	Summary ModuleSummary    `json:"summary"`
	Modules []ModuleStatItem `json:"modules"`
}

// ModuleStatItem 模块统计项
// 字段按JSON key的字母顺序排列
type ModuleStatItem struct {
	ActiveDays   int    `json:"active_days"`   // a
	FailedCount  int    `json:"failed_count"`  // f
	Module       string `json:"module"`        // m
	Percentage   string `json:"percentage"`    // p
	SuccessCount int    `json:"success_count"` // s
	SuccessRate  string `json:"success_rate"`  // s
	UsageCount   int    `json:"usage_count"`   // u
}

// ModuleSummary 模块统计汇总
// 字段按JSON key的字母顺序排列
type ModuleSummary struct {
	BasicFeatureCount int    `json:"basic_feature_count,omitempty"` // b
	RequireUsageRate  string `json:"require_usage_rate,omitempty"`  // r
	TotalExecutions   int    `json:"total_executions"`              // t
	TotalModules      int    `json:"total_modules"`                 // t
}

// QueryInfo 查询信息
type QueryInfo struct {
	Type      string `json:"type"`
	Date      string `json:"date,omitempty"`
	StartDate string `json:"start_date,omitempty"`
	EndDate   string `json:"end_date,omitempty"`
	Page      int    `json:"page,omitempty"`
	PageSize  int    `json:"page_size,omitempty"`
	SortBy    string `json:"sort_by,omitempty"`
	Order     string `json:"order,omitempty"`
}

// UserActivityResponse 用户活跃度统计响应
type UserActivityResponse struct {
	Query      QueryInfo              `json:"query"`
	Summary    UserActivitySummaryRes `json:"summary"`
	Pagination PaginationInfo         `json:"pagination"`
	Users      []UserActivityItem     `json:"users"`
}

// UserActivitySummaryRes 用户活跃度汇总(响应用)
// 字段按JSON key的字母顺序排列
type UserActivitySummaryRes struct {
	AvgCallsPerUser    string `json:"avg_calls_per_user"`   // a
	FailedCalls        int    `json:"failed_calls"`         // f
	OverallSuccessRate string `json:"overall_success_rate"` // o
	RequireUsageRate   string `json:"require_usage_rate"`   // r
	SuccessCalls       int    `json:"success_calls"`        // s
	TotalCalls         int    `json:"total_calls"`          // t
	UniqueTokens       int    `json:"unique_tokens"`        // u
	UniqueUsers        int    `json:"unique_users"`         // u
}

// UserActivityItem 用户活跃度项
// 字段按JSON key的字母顺序排列，保证输出顺序一致
type UserActivityItem struct {
	AvgExecutionTime  int    `json:"avg_execution_time_ms,omitempty"` // a
	BasicCalls        int    `json:"basic_calls"`                     // b
	Email             string `json:"email"`                           // e
	FailedCalls       int    `json:"failed_calls"`                    // f
	FirstCallAt       string `json:"first_call_at,omitempty"`         // f
	LastCallAt        string `json:"last_call_at,omitempty"`          // l
	Rank              int    `json:"rank"`                            // r
	RequireCalls      int    `json:"require_calls"`                   // r
	RequirePercentage string `json:"require_percentage"`              // r
	SuccessCalls      int    `json:"success_calls"`                   // s
	SuccessRate       string `json:"success_rate"`                    // s
	Token             string `json:"token"`                           // t
	TotalCalls        int    `json:"total_calls"`                     // t
	WsID              string `json:"ws_id"`                           // w
}

// ModuleDetailResponse 模块详细分析响应
type ModuleDetailResponse struct {
	Module     string           `json:"module"`
	Period     PeriodInfo       `json:"period"`
	Summary    ModuleDetailSum  `json:"summary"`
	DailyTrend []DailyTrendItem `json:"daily_trend"`
	TopUsers   []ModuleTopUser  `json:"top_users"`
}

// PeriodInfo 期间信息
type PeriodInfo struct {
	Type      string `json:"type"`
	Date      string `json:"date,omitempty"`
	StartDate string `json:"start_date,omitempty"`
	EndDate   string `json:"end_date,omitempty"`
	Days      int    `json:"days,omitempty"`
}

// ModuleDetailSum 模块详细汇总
// 字段按JSON key的字母顺序排列
type ModuleDetailSum struct {
	ActiveDays     int    `json:"active_days"`       // a
	AvgUsagePerDay string `json:"avg_usage_per_day"` // a
	SuccessRate    string `json:"success_rate"`      // s
	TotalFailed    int    `json:"total_failed"`      // t
	TotalSuccess   int    `json:"total_success"`     // t
	TotalUsage     int    `json:"total_usage"`       // t
}

// DailyTrendItem 每日趋势项
// 字段按JSON key的字母顺序排列
type DailyTrendItem struct {
	Date         string `json:"date"`          // d
	FailedCount  int    `json:"failed_count"`  // f
	SuccessCount int    `json:"success_count"` // s
	SuccessRate  string `json:"success_rate"`  // s
	UsageCount   int    `json:"usage_count"`   // u
}

// ModuleTopUser 模块Top用户
// 字段按JSON key的字母顺序排列
type ModuleTopUser struct {
	Email      string `json:"email"`       // e
	Percentage string `json:"percentage"`  // p
	Rank       int    `json:"rank"`        // r
	Token      string `json:"token"`       // t
	UsageCount int    `json:"usage_count"` // u
	WsID       string `json:"ws_id"`       // w
}
