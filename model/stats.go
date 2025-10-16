package model

import (
	"fmt"
	"time"
)

// ExecutionStatsRecord 执行统计记录
type ExecutionStatsRecord struct {
	ExecutionID     string    // 执行ID(request_id)
	Token           string    // 访问Token
	WsID            string    // 工作空间ID
	Email           string    // 用户邮箱
	HasRequire      bool      // 是否使用require
	ModulesUsed     []string  // 使用的模块列表
	ModuleCount     int       // 模块数量
	ExecutionStatus string    // "success" 或 "failed"
	ExecutionTimeMs int64     // 执行耗时(毫秒)
	CodeLength      int       // 代码长度(字节)
	IsAsync         bool      // 是否异步代码
	ExecutionDate   string    // 执行日期 "2025-10-15"
	ExecutionTime   time.Time // 执行时间
}

// StatsQueryParams 统计查询参数
type StatsQueryParams struct {
	// 日期范围
	Date      string // 单个日期 "2025-10-15"
	StartDate string // 开始日期
	EndDate   string // 结束日期

	// 分页
	Page     int // 页码(从1开始)
	PageSize int // 每页数量

	// 排序
	SortBy string // 排序字段
	Order  string // asc/desc

	// 过滤
	Module   string // 模块名称
	WsID     string // 工作空间ID
	MinCalls int    // 最小调用次数
}

// PaginationInfo 分页信息
type PaginationInfo struct {
	Page         int  `json:"page"`
	PageSize     int  `json:"page_size"`
	TotalRecords int  `json:"total_records"`
	TotalPages   int  `json:"total_pages"`
	HasNext      bool `json:"has_next"`
	HasPrev      bool `json:"has_prev"`
}

// ModuleStatsSummary 模块统计汇总
type ModuleStatsSummary struct {
	TotalExecutions   int     `json:"total_executions"`
	TotalModules      int     `json:"total_modules"`
	RequireUsageRate  float64 `json:"require_usage_rate,omitempty"`
	BasicFeatureCount int     `json:"basic_feature_count,omitempty"`
}

// UserActivitySummary 用户活跃度汇总
type UserActivitySummary struct {
	UniqueTokens       int     `json:"unique_tokens"`
	UniqueUsers        int     `json:"unique_users"`
	TotalCalls         int     `json:"total_calls"`
	AvgCallsPerUser    float64 `json:"avg_calls_per_user"`
	SuccessCalls       int     `json:"success_calls"`
	FailedCalls        int     `json:"failed_calls"`
	OverallSuccessRate float64 `json:"overall_success_rate"`
	RequireUsageRate   float64 `json:"require_usage_rate"`
}

// ValidateAndNormalize 验证并规范化参数
func (p *StatsQueryParams) ValidateAndNormalize() error {
	// 1. 日期验证
	if p.Date != "" {
		// 单日查询优先
		if _, err := time.Parse("2006-01-02", p.Date); err != nil {
			return fmt.Errorf("无效的日期格式: %s", p.Date)
		}
	} else if p.StartDate != "" || p.EndDate != "" {
		// 日期范围查询
		if p.StartDate == "" || p.EndDate == "" {
			return fmt.Errorf("start_date 和 end_date 必须同时提供")
		}

		start, err := time.Parse("2006-01-02", p.StartDate)
		if err != nil {
			return fmt.Errorf("无效的开始日期: %s", p.StartDate)
		}

		end, err := time.Parse("2006-01-02", p.EndDate)
		if err != nil {
			return fmt.Errorf("无效的结束日期: %s", p.EndDate)
		}

		if end.Before(start) {
			return fmt.Errorf("结束日期不能早于开始日期")
		}

		// 限制最大范围为31天
		days := int(end.Sub(start).Hours()/24) + 1
		if days > 31 {
			return fmt.Errorf("日期范围不能超过31天(当前: %d天)", days)
		}
	} else {
		// 默认查询今天
		p.Date = time.Now().Format("2006-01-02")
	}

	// 2. 分页验证
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PageSize < 1 {
		p.PageSize = 20
	}
	if p.PageSize > 100 {
		p.PageSize = 100
	}

	// 防止翻页过深
	if p.Page*p.PageSize > 10000 {
		return fmt.Errorf("翻页超出限制(最多10000条记录)")
	}

	// 3. 排序验证
	if p.Order == "" {
		p.Order = "desc"
	}
	if p.Order != "asc" && p.Order != "desc" {
		return fmt.Errorf("无效的排序方向: %s", p.Order)
	}

	return nil
}

// GetDateCondition 获取日期查询条件
func (p *StatsQueryParams) GetDateCondition() string {
	if p.Date != "" {
		return fmt.Sprintf("stat_date = '%s'", p.Date)
	}
	return fmt.Sprintf("stat_date BETWEEN '%s' AND '%s'", p.StartDate, p.EndDate)
}
