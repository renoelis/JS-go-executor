package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"flow-codeblock-go/model"
	"flow-codeblock-go/utils"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// StatsService 统计服务
type StatsService struct {
	db *sqlx.DB
}

// NewStatsService 创建统计服务
func NewStatsService(db *sqlx.DB) *StatsService {
	return &StatsService{db: db}
}

// RecordExecutionStats 记录执行统计(异步)
// 这个方法会启动一个 goroutine 后台写入,不阻塞主流程
func (s *StatsService) RecordExecutionStats(record *model.ExecutionStatsRecord) {
	if s.db == nil {
		utils.Debug("统计服务未初始化(数据库为nil),跳过统计记录")
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := s.recordExecutionStatsSync(ctx, record); err != nil {
			utils.Error("记录执行统计失败",
				zap.String("execution_id", record.ExecutionID),
				zap.Error(err))
		}
	}()
}

// recordExecutionStatsSync 同步记录执行统计
func (s *StatsService) recordExecutionStatsSync(ctx context.Context, record *model.ExecutionStatsRecord) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("开始事务失败: %w", err)
	}
	defer tx.Rollback()

	// 1. 写入详细记录
	modulesJSON, _ := json.Marshal(record.ModulesUsed)

	_, err = tx.ExecContext(ctx, `
		INSERT INTO code_execution_stats (
			execution_id, token, ws_id, email,
			has_require, modules_used, module_count,
			execution_status, execution_time_ms, code_length, is_async,
			execution_date, execution_time
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			execution_status = VALUES(execution_status),
			execution_time_ms = VALUES(execution_time_ms)
	`,
		record.ExecutionID, record.Token, record.WsID, record.Email,
		record.HasRequire, string(modulesJSON), record.ModuleCount,
		record.ExecutionStatus, record.ExecutionTimeMs, record.CodeLength, record.IsAsync,
		record.ExecutionDate, record.ExecutionTime,
	)
	if err != nil {
		return fmt.Errorf("插入执行记录失败: %w", err)
	}

	// 2. 更新模块使用统计
	if err := s.updateModuleStats(ctx, tx, record); err != nil {
		return fmt.Errorf("更新模块统计失败: %w", err)
	}

	// 3. 更新用户活跃度统计
	if err := s.updateUserActivityStats(ctx, tx, record); err != nil {
		return fmt.Errorf("更新用户活跃度统计失败: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}

	utils.Debug("执行统计记录成功",
		zap.String("execution_id", record.ExecutionID),
		zap.Bool("has_require", record.HasRequire),
		zap.Int("module_count", record.ModuleCount))

	return nil
}

// updateModuleStats 更新模块统计(聚合表)
func (s *StatsService) updateModuleStats(ctx context.Context, tx *sql.Tx, record *model.ExecutionStatsRecord) error {
	modules := record.ModulesUsed
	if len(modules) == 0 {
		// 没有使用 require,记为 "basic_feature"
		modules = []string{"basic_feature"}
	}

	for _, module := range modules {
		successInc := 0
		failedInc := 0
		if record.ExecutionStatus == "success" {
			successInc = 1
		} else {
			failedInc = 1
		}

		_, err := tx.ExecContext(ctx, `
			INSERT INTO module_usage_stats (
				stat_date, module_name, usage_count,
				success_count, failed_count
			) VALUES (?, ?, 1, ?, ?)
			ON DUPLICATE KEY UPDATE
				usage_count = usage_count + 1,
				success_count = success_count + ?,
				failed_count = failed_count + ?
		`, record.ExecutionDate, module, successInc, failedInc, successInc, failedInc)

		if err != nil {
			return err
		}
	}

	return nil
}

// updateUserActivityStats 更新用户活跃度统计(聚合表)
func (s *StatsService) updateUserActivityStats(ctx context.Context, tx *sql.Tx, record *model.ExecutionStatsRecord) error {
	successInc := 0
	failedInc := 0
	if record.ExecutionStatus == "success" {
		successInc = 1
	} else {
		failedInc = 1
	}

	requireInc := 0
	basicInc := 0
	if record.HasRequire {
		requireInc = 1
	} else {
		basicInc = 1
	}

	_, err := tx.ExecContext(ctx, `
		INSERT INTO user_activity_stats (
			stat_date, token, ws_id, email,
			total_calls, success_calls, failed_calls,
			require_calls, basic_calls,
			total_execution_time_ms,
			first_call_at, last_call_at
		) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			total_calls = total_calls + 1,
			success_calls = success_calls + ?,
			failed_calls = failed_calls + ?,
			require_calls = require_calls + ?,
			basic_calls = basic_calls + ?,
			total_execution_time_ms = total_execution_time_ms + ?,
			avg_execution_time_ms = (total_execution_time_ms + ?) / (total_calls + 1),
			last_call_at = ?
	`,
		record.ExecutionDate, record.Token, record.WsID, record.Email,
		successInc, failedInc, requireInc, basicInc,
		record.ExecutionTimeMs,
		record.ExecutionTime, record.ExecutionTime,
		successInc, failedInc, requireInc, basicInc,
		record.ExecutionTimeMs, record.ExecutionTimeMs,
		record.ExecutionTime,
	)

	return err
}

// GetModuleStats 获取模块使用统计
func (s *StatsService) GetModuleStats(ctx context.Context, params *model.StatsQueryParams) (*model.ModuleStatsResponse, error) {
	if err := params.ValidateAndNormalize(); err != nil {
		return nil, err
	}

	dateCondition := params.GetDateCondition()

	// 查询模块统计(聚合)
	query := fmt.Sprintf(`
		SELECT 
			module_name,
			SUM(usage_count) as total_usage,
			SUM(success_count) as total_success,
			SUM(failed_count) as total_failed,
			COUNT(DISTINCT stat_date) as active_days
		FROM module_usage_stats
		WHERE %s
		GROUP BY module_name
		ORDER BY total_usage DESC
	`, dateCondition)

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	modules := make([]model.ModuleStatItem, 0)
	totalExecutions := 0
	basicFeatureCount := 0

	for rows.Next() {
		var module string
		var usage, success, failed, activeDays int

		if err := rows.Scan(&module, &usage, &success, &failed, &activeDays); err != nil {
			return nil, err
		}

		totalExecutions += usage
		if module == "basic_feature" {
			basicFeatureCount = usage
		}

		successRate := 0.0
		if usage > 0 {
			successRate = float64(success) / float64(usage) * 100
		}

		modules = append(modules, model.ModuleStatItem{
			Module:       module,
			UsageCount:   usage,
			SuccessCount: success,
			FailedCount:  failed,
			SuccessRate:  fmt.Sprintf("%.1f", successRate),
			ActiveDays:   activeDays,
		})
	}

	// 计算百分比
	for i := range modules {
		percentage := 0.0
		if totalExecutions > 0 {
			percentage = float64(modules[i].UsageCount) / float64(totalExecutions) * 100
		}
		modules[i].Percentage = fmt.Sprintf("%.1f", percentage)
	}

	// 计算require使用率
	requireUsageRate := 0.0
	if totalExecutions > 0 {
		requireUsageRate = float64(totalExecutions-basicFeatureCount) / float64(totalExecutions) * 100
	}

	// 构建响应
	response := &model.ModuleStatsResponse{
		Query: model.QueryInfo{
			Type: "single_date",
			Date: params.Date,
		},
		Summary: model.ModuleSummary{
			TotalExecutions:   totalExecutions,
			TotalModules:      len(modules),
			RequireUsageRate:  fmt.Sprintf("%.1f", requireUsageRate),
			BasicFeatureCount: basicFeatureCount,
		},
		Modules: modules,
	}

	if params.StartDate != "" {
		response.Query.Type = "date_range"
		response.Query.StartDate = params.StartDate
		response.Query.EndDate = params.EndDate
		response.Query.Date = ""
	}

	return response, nil
}

// GetUserActivityStats 获取用户活跃度统计(带分页)
func (s *StatsService) GetUserActivityStats(ctx context.Context, params *model.StatsQueryParams) (*model.UserActivityResponse, error) {
	if err := params.ValidateAndNormalize(); err != nil {
		return nil, err
	}

	dateCondition := params.GetDateCondition()

	// 1. 查询汇总数据
	summaryQuery := fmt.Sprintf(`
		SELECT 
			COUNT(DISTINCT token) as unique_tokens,
			COUNT(DISTINCT CONCAT(ws_id, '_', email)) as unique_users,
			COALESCE(SUM(total_calls), 0) as total_calls,
			COALESCE(SUM(success_calls), 0) as success_calls,
			COALESCE(SUM(failed_calls), 0) as failed_calls,
			COALESCE(SUM(require_calls), 0) as require_calls
		FROM user_activity_stats
		WHERE %s
	`, dateCondition)

	var summary struct {
		UniqueTokens int
		UniqueUsers  int
		TotalCalls   int
		SuccessCalls int
		FailedCalls  int
		RequireCalls int
	}

	err := s.db.QueryRowContext(ctx, summaryQuery).Scan(
		&summary.UniqueTokens,
		&summary.UniqueUsers,
		&summary.TotalCalls,
		&summary.SuccessCalls,
		&summary.FailedCalls,
		&summary.RequireCalls,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// 2. 查询总记录数
	countQuery := fmt.Sprintf(`
		SELECT COUNT(DISTINCT token)
		FROM user_activity_stats
		WHERE %s
	`, dateCondition)

	if params.MinCalls > 0 {
		countQuery = fmt.Sprintf(`
			SELECT COUNT(*)
			FROM (
				SELECT token
				FROM user_activity_stats
				WHERE %s
				GROUP BY token
				HAVING SUM(total_calls) >= %d
			) t
		`, dateCondition, params.MinCalls)
	}

	var totalRecords int
	if err := s.db.QueryRowContext(ctx, countQuery).Scan(&totalRecords); err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// 3. 查询用户列表(带分页)
	sortBy := params.SortBy
	if sortBy == "" {
		sortBy = "total_calls"
	}

	offset := (params.Page - 1) * params.PageSize

	minCallsFilter := ""
	if params.MinCalls > 0 {
		minCallsFilter = fmt.Sprintf("HAVING SUM(total_calls) >= %d", params.MinCalls)
	}

	usersQuery := fmt.Sprintf(`
		SELECT 
			token, ws_id, email,
			SUM(total_calls) as total_calls,
			SUM(success_calls) as success_calls,
			SUM(failed_calls) as failed_calls,
			SUM(require_calls) as require_calls,
			SUM(basic_calls) as basic_calls,
			AVG(avg_execution_time_ms) as avg_time,
			MIN(first_call_at) as first_call,
			MAX(last_call_at) as last_call
		FROM user_activity_stats
		WHERE %s
		GROUP BY token, ws_id, email
		%s
		ORDER BY %s %s
		LIMIT %d OFFSET %d
	`, dateCondition,
		minCallsFilter,
		sortBy, params.Order,
		params.PageSize, offset)

	rows, err := s.db.QueryContext(ctx, usersQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]model.UserActivityItem, 0)
	rank := offset + 1

	for rows.Next() {
		var token, wsID, email string
		var totalCalls, successCalls, failedCalls, requireCalls, basicCalls int
		var avgTime sql.NullFloat64
		var firstCall, lastCall sql.NullTime

		if err := rows.Scan(
			&token, &wsID, &email,
			&totalCalls, &successCalls, &failedCalls,
			&requireCalls, &basicCalls, &avgTime,
			&firstCall, &lastCall,
		); err != nil {
			return nil, err
		}

		successRate := 0.0
		if totalCalls > 0 {
			successRate = float64(successCalls) / float64(totalCalls) * 100
		}

		requirePercentage := 0.0
		if totalCalls > 0 {
			requirePercentage = float64(requireCalls) / float64(totalCalls) * 100
		}

		// Token脱敏处理: 只显示前8位和后4位
		maskedToken := token
		if token == "" {
			maskedToken = "[empty]"
		} else if len(token) > 12 {
			maskedToken = token[:8] + "..." + token[len(token)-4:]
		}

		user := model.UserActivityItem{
			Rank:              rank,
			Token:             maskedToken,
			WsID:              wsID,
			Email:             email,
			TotalCalls:        totalCalls,
			SuccessCalls:      successCalls,
			FailedCalls:       failedCalls,
			SuccessRate:       fmt.Sprintf("%.1f", successRate),
			RequireCalls:      requireCalls,
			BasicCalls:        basicCalls,
			RequirePercentage: fmt.Sprintf("%.1f", requirePercentage),
		}

		if avgTime.Valid {
			user.AvgExecutionTime = int(avgTime.Float64)
		}

		if firstCall.Valid {
			user.FirstCallAt = firstCall.Time.Format("2006-01-02 15:04:05")
		}

		if lastCall.Valid {
			user.LastCallAt = lastCall.Time.Format("2006-01-02 15:04:05")
		}

		users = append(users, user)
		rank++
	}

	// 4. 计算分页信息
	totalPages := (totalRecords + params.PageSize - 1) / params.PageSize
	pagination := model.PaginationInfo{
		Page:         params.Page,
		PageSize:     params.PageSize,
		TotalRecords: totalRecords,
		TotalPages:   totalPages,
		HasNext:      params.Page < totalPages,
		HasPrev:      params.Page > 1,
	}

	// 5. 构建返回结果
	avgCallsPerUser := 0.0
	if summary.UniqueUsers > 0 {
		avgCallsPerUser = float64(summary.TotalCalls) / float64(summary.UniqueUsers)
	}

	overallSuccessRate := 0.0
	if summary.TotalCalls > 0 {
		overallSuccessRate = float64(summary.SuccessCalls) / float64(summary.TotalCalls) * 100
	}

	requireUsageRate := 0.0
	if summary.TotalCalls > 0 {
		requireUsageRate = float64(summary.RequireCalls) / float64(summary.TotalCalls) * 100
	}

	response := &model.UserActivityResponse{
		Query: model.QueryInfo{
			Type:     "single_date",
			Date:     params.Date,
			Page:     params.Page,
			PageSize: params.PageSize,
			SortBy:   sortBy,
			Order:    params.Order,
		},
		Summary: model.UserActivitySummaryRes{
			UniqueTokens:       summary.UniqueTokens,
			UniqueUsers:        summary.UniqueUsers,
			TotalCalls:         summary.TotalCalls,
			AvgCallsPerUser:    fmt.Sprintf("%.1f", avgCallsPerUser),
			SuccessCalls:       summary.SuccessCalls,
			FailedCalls:        summary.FailedCalls,
			OverallSuccessRate: fmt.Sprintf("%.1f", overallSuccessRate),
			RequireUsageRate:   fmt.Sprintf("%.1f", requireUsageRate),
		},
		Pagination: pagination,
		Users:      users,
	}

	if params.StartDate != "" {
		response.Query.Type = "date_range"
		response.Query.StartDate = params.StartDate
		response.Query.EndDate = params.EndDate
		response.Query.Date = ""
	}

	return response, nil
}

// GetModuleDetailStats 获取特定模块的详细统计
func (s *StatsService) GetModuleDetailStats(ctx context.Context, moduleName string, params *model.StatsQueryParams) (*model.ModuleDetailResponse, error) {
	if err := params.ValidateAndNormalize(); err != nil {
		return nil, err
	}

	dateCondition := params.GetDateCondition()

	// 1. 查询模块汇总数据
	summaryQuery := fmt.Sprintf(`
		SELECT 
			COALESCE(SUM(usage_count), 0) as total_usage,
			COALESCE(SUM(success_count), 0) as total_success,
			COALESCE(SUM(failed_count), 0) as total_failed,
			COUNT(DISTINCT stat_date) as active_days
		FROM module_usage_stats
		WHERE module_name = ? AND %s
	`, dateCondition)

	var totalUsage, totalSuccess, totalFailed, activeDays int
	err := s.db.QueryRowContext(ctx, summaryQuery, moduleName).Scan(
		&totalUsage, &totalSuccess, &totalFailed, &activeDays,
	)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	successRate := 0.0
	if totalUsage > 0 {
		successRate = float64(totalSuccess) / float64(totalUsage) * 100
	}

	// 2. 查询每日趋势
	dailyQuery := fmt.Sprintf(`
		SELECT 
			stat_date,
			usage_count,
			success_count,
			failed_count
		FROM module_usage_stats
		WHERE module_name = ? AND %s
		ORDER BY stat_date ASC
	`, dateCondition)

	rows, err := s.db.QueryContext(ctx, dailyQuery, moduleName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dailyTrend := make([]model.DailyTrendItem, 0)
	for rows.Next() {
		var date string
		var usage, success, failed int

		if err := rows.Scan(&date, &usage, &success, &failed); err != nil {
			return nil, err
		}

		rate := 0.0
		if usage > 0 {
			rate = float64(success) / float64(usage) * 100
		}

		dailyTrend = append(dailyTrend, model.DailyTrendItem{
			Date:         date,
			UsageCount:   usage,
			SuccessCount: success,
			FailedCount:  failed,
			SuccessRate:  fmt.Sprintf("%.1f", rate),
		})
	}

	// 3. 查询使用该模块的Top用户
	topUsersQuery := fmt.Sprintf(`
		SELECT 
			ces.token,
			ces.ws_id,
			ces.email,
			COUNT(*) as usage_count
		FROM code_execution_stats ces
		WHERE ces.modules_used LIKE ? AND %s
		GROUP BY ces.token, ces.ws_id, ces.email
		ORDER BY usage_count DESC
		LIMIT 10
	`, strings.Replace(dateCondition, "stat_date", "ces.execution_date", -1))

	topUsersRows, err := s.db.QueryContext(ctx, topUsersQuery, fmt.Sprintf("%%\"%s\"%%", moduleName))
	if err != nil {
		return nil, err
	}
	defer topUsersRows.Close()

	topUsers := make([]model.ModuleTopUser, 0)
	rank := 1
	for topUsersRows.Next() {
		var token, wsID, email string
		var usageCount int

		if err := topUsersRows.Scan(&token, &wsID, &email, &usageCount); err != nil {
			return nil, err
		}

		// Token脱敏
		maskedToken := token
		if len(token) > 12 {
			maskedToken = token[:8] + "..." + token[len(token)-4:]
		}

		percentage := 0.0
		if totalUsage > 0 {
			percentage = float64(usageCount) / float64(totalUsage) * 100
		}

		topUsers = append(topUsers, model.ModuleTopUser{
			Rank:       rank,
			Token:      maskedToken,
			WsID:       wsID,
			Email:      email,
			UsageCount: usageCount,
			Percentage: fmt.Sprintf("%.1f", percentage),
		})
		rank++
	}

	// 计算平均每日使用量
	avgUsagePerDay := 0.0
	if activeDays > 0 {
		avgUsagePerDay = float64(totalUsage) / float64(activeDays)
	}

	// 构建响应
	response := &model.ModuleDetailResponse{
		Module: moduleName,
		Period: model.PeriodInfo{},
		Summary: model.ModuleDetailSum{
			TotalUsage:     totalUsage,
			TotalSuccess:   totalSuccess,
			TotalFailed:    totalFailed,
			SuccessRate:    fmt.Sprintf("%.1f", successRate),
			ActiveDays:     activeDays,
			AvgUsagePerDay: fmt.Sprintf("%.1f", avgUsagePerDay),
		},
		DailyTrend: dailyTrend,
		TopUsers:   topUsers,
	}

	// 设置期间信息
	if params.Date != "" {
		response.Period = model.PeriodInfo{
			Type: "single_date",
			Date: params.Date,
		}
	} else {
		response.Period = model.PeriodInfo{
			Type:      "date_range",
			StartDate: params.StartDate,
			EndDate:   params.EndDate,
			Days:      activeDays,
		}
	}

	return response, nil
}
