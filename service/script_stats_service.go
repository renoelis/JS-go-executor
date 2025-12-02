package service

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/model"
	"flow-codeblock-go/utils"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// ScriptStatsPeriod 时间范围
type ScriptStatsPeriod struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

// ScriptQuotaUsage 配额使用情况
type ScriptQuotaUsage struct {
	Used      int64   `json:"used"`
	Max       int64   `json:"max"`
	UsageRate float64 `json:"usage_rate"`
}

// ScriptSummary 汇总信息
type ScriptSummary struct {
	TotalScripts       int64             `db:"total_scripts" json:"total_scripts,omitempty"`
	ActiveScripts      int64             `db:"active_scripts" json:"active_scripts,omitempty"`
	TotalVersions      int64             `db:"total_versions" json:"total_versions,omitempty"`
	TotalExecutions    int64             `db:"total_executions" json:"total_executions"`
	SuccessCount       int64             `db:"success_count" json:"success_count"`
	FailedCount        int64             `db:"failed_count" json:"failed_count"`
	SuccessRate        float64           `db:"success_rate" json:"success_rate"`
	AvgExecutionTimeMs float64           `db:"avg_execution_time_ms" json:"avg_execution_time_ms"`
	MaxExecutionTimeMs int64             `db:"max_execution_time_ms" json:"max_execution_time_ms"`
	QuotaUsage         *ScriptQuotaUsage `json:"quota_usage,omitempty"`
	ScriptID           string            `json:"script_id,omitempty"`
	LatestVersion      int               `json:"latest_version,omitempty"`
	LatestCodeLength   int               `json:"latest_code_length,omitempty"`
	LatestDescription  string            `json:"latest_description,omitempty"`
}

// ScriptTopItem 热门脚本
type ScriptTopItem struct {
	ScriptID    string  `db:"script_id" json:"script_id"`
	Description string  `db:"description" json:"description"`
	Executions  int64   `db:"executions" json:"executions"`
	SuccessRate float64 `db:"success_rate" json:"success_rate"`
	AvgTimeMs   float64 `db:"avg_time_ms" json:"avg_time_ms"`
}

// ScriptDailyTrend 按日趋势
type ScriptDailyTrend struct {
	Date    string `db:"date" json:"date"`
	Total   int64  `db:"total" json:"total"`
	Success int64  `db:"success" json:"success"`
	Failed  int64  `db:"failed" json:"failed"`
}

// ScriptStatsOverview 汇总统计结果
type ScriptStatsOverview struct {
	Period     ScriptStatsPeriod  `json:"period"`
	Summary    ScriptSummary      `json:"summary"`
	TopScripts []ScriptTopItem    `json:"top_scripts,omitempty"`
	DailyTrend []ScriptDailyTrend `json:"daily_trend"`
}

// ScriptStatsService 脚本执行统计服务
type ScriptStatsService struct {
	db  *sqlx.DB
	cfg *config.Config
}

// NewScriptStatsService 创建统计服务
func NewScriptStatsService(db *sqlx.DB, cfg *config.Config) *ScriptStatsService {
	return &ScriptStatsService{db: db, cfg: cfg}
}

// RecordExecution 记录脚本执行结果（异步）
func (s *ScriptStatsService) RecordExecution(ctx context.Context, scriptID, token, status string, durationMs int) {
	if s == nil || s.db == nil {
		return
	}

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		execTime := utils.Now()
		_, err := s.db.ExecContext(ctx, `
			INSERT INTO script_execution_stats (
				script_id, token, execution_status, execution_time_ms, execution_date, execution_time
			) VALUES (?, ?, ?, ?, ?, ?)
		`, scriptID, token, status, durationMs, execTime.Format("2006-01-02"), execTime)
		if err != nil {
			utils.Warn("记录脚本执行统计失败", zap.Error(err), zap.String("script_id", scriptID))
		}
	}()
}

// CleanupOrphanedStats 清理孤儿统计记录
func (s *ScriptStatsService) CleanupOrphanedStats(ctx context.Context) (int64, error) {
	if s == nil || s.db == nil {
		return 0, nil
	}
	retention := s.cfg.Script.StatsOrphanRetentionDays
	if retention <= 0 {
		retention = 90
	}
	cutoff := time.Now().AddDate(0, 0, -retention).Format("2006-01-02")

	result, err := s.db.ExecContext(ctx, `
		DELETE ses FROM script_execution_stats ses
		LEFT JOIN code_scripts cs ON ses.script_id = cs.id
		WHERE cs.id IS NULL AND ses.execution_date < ?
	`, cutoff)
	if err != nil {
		return 0, err
	}
	affected, _ := result.RowsAffected()
	if affected > 0 {
		utils.Info("孤儿脚本统计已清理",
			zap.Int64("deleted", affected),
			zap.String("cutoff", cutoff))
	}
	return affected, nil
}

// CleanupOldStats 清理过期统计
func (s *ScriptStatsService) CleanupOldStats(ctx context.Context) (int64, error) {
	if s == nil || s.db == nil {
		return 0, nil
	}
	retention := s.cfg.Script.StatsMaxRetentionDays
	if retention <= 0 {
		retention = 180
	}
	cutoff := time.Now().AddDate(0, 0, -retention).Format("2006-01-02")

	result, err := s.db.ExecContext(ctx, `
		DELETE FROM script_execution_stats WHERE execution_date < ?
	`, cutoff)
	if err != nil {
		return 0, err
	}
	affected, _ := result.RowsAffected()
	if affected > 0 {
		utils.Info("过期脚本统计已清理",
			zap.Int64("deleted", affected),
			zap.String("cutoff", cutoff))
	}
	return affected, nil
}

// GetOverallStats 获取当前 Token 下的脚本汇总统计
func (s *ScriptStatsService) GetOverallStats(ctx context.Context, token string, startDate, endDate time.Time, page, pageSize int) (*ScriptStatsOverview, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("统计服务未初始化")
	}

	period := ScriptStatsPeriod{
		StartDate: startDate.Format("2006-01-02"),
		EndDate:   endDate.Format("2006-01-02"),
	}

	var summary ScriptSummary
	if err := s.db.GetContext(ctx, &summary.TotalScripts, `SELECT COUNT(*) FROM code_scripts WHERE token = ?`, token); err != nil {
		return nil, err
	}
	if err := s.db.GetContext(ctx, &summary.TotalVersions, `
		SELECT COUNT(*) 
		FROM code_script_versions v 
		JOIN code_scripts s ON v.script_id = s.id 
		WHERE s.token = ?
	`, token); err != nil {
		return nil, err
	}
	if err := s.db.GetContext(ctx, &summary.ActiveScripts, `
		SELECT COUNT(DISTINCT ses.script_id)
		FROM script_execution_stats ses
		JOIN code_scripts cs ON ses.script_id = cs.id
		WHERE cs.token = ? AND ses.execution_date BETWEEN ? AND ?
	`, token, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}

	type aggRow struct {
		Total   int64   `db:"total"`
		Success int64   `db:"success"`
		Failed  int64   `db:"failed"`
		Avg     float64 `db:"avg_time"`
		Max     int64   `db:"max_time"`
	}
	var agg aggRow
	if err := s.db.GetContext(ctx, &agg, `
		SELECT 
			COUNT(*) AS total,
			SUM(CASE WHEN ses.execution_status = 'success' THEN 1 ELSE 0 END) AS success,
			SUM(CASE WHEN ses.execution_status = 'failed' THEN 1 ELSE 0 END) AS failed,
			AVG(ses.execution_time_ms) AS avg_time,
			MAX(ses.execution_time_ms) AS max_time
		FROM script_execution_stats ses
		JOIN code_scripts cs ON ses.script_id = cs.id
		WHERE cs.token = ? AND ses.execution_date BETWEEN ? AND ?
	`, token, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}
	summary.TotalExecutions = agg.Total
	summary.SuccessCount = agg.Success
	summary.FailedCount = agg.Failed
	summary.AvgExecutionTimeMs = agg.Avg
	summary.MaxExecutionTimeMs = agg.Max
	if agg.Total > 0 {
		summary.SuccessRate = float64(agg.Success) * 100 / float64(agg.Total)
	}

	var quota ScriptQuotaUsage
	if err := s.db.GetContext(ctx, &quota, `
		SELECT 
			COALESCE(current_scripts, 0) AS used,
			COALESCE(max_scripts, 0) AS max,
			0 AS usage_rate
		FROM access_tokens WHERE access_token = ?
	`, token); err == nil {
		if quota.Max <= 0 {
			quota.Max = 50
		}
		quota.UsageRate = float64(quota.Used) * 100 / float64(quota.Max)
		summary.QuotaUsage = &quota
	}

	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	topRows := []ScriptTopItem{}
	if err := s.db.SelectContext(ctx, &topRows, `
		SELECT 
			cs.id AS script_id,
			cs.description AS description,
			COUNT(*) AS executions,
			AVG(ses.execution_time_ms) AS avg_time_ms,
			CASE WHEN COUNT(*) = 0 THEN 0 ELSE SUM(CASE WHEN ses.execution_status = 'success' THEN 1 ELSE 0 END) * 100 / COUNT(*) END AS success_rate
		FROM script_execution_stats ses
		JOIN code_scripts cs ON ses.script_id = cs.id
		WHERE cs.token = ? AND ses.execution_date BETWEEN ? AND ?
		GROUP BY cs.id, cs.description
		ORDER BY executions DESC
		LIMIT ? OFFSET ?
	`, token, period.StartDate, period.EndDate, pageSize, offset); err != nil {
		return nil, err
	}

	trendRows := []ScriptDailyTrend{}
	if err := s.db.SelectContext(ctx, &trendRows, `
		SELECT 
			ses.execution_date AS date,
			COUNT(*) AS total,
			SUM(CASE WHEN ses.execution_status = 'success' THEN 1 ELSE 0 END) AS success,
			SUM(CASE WHEN ses.execution_status = 'failed' THEN 1 ELSE 0 END) AS failed
		FROM script_execution_stats ses
		JOIN code_scripts cs ON ses.script_id = cs.id
		WHERE cs.token = ? AND ses.execution_date BETWEEN ? AND ?
		GROUP BY ses.execution_date
		ORDER BY ses.execution_date
	`, token, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}

	return &ScriptStatsOverview{
		Period:     period,
		Summary:    summary,
		TopScripts: topRows,
		DailyTrend: trendRows,
	}, nil
}

// GetGlobalStats 获取全局脚本汇总统计（管理员）
func (s *ScriptStatsService) GetGlobalStats(ctx context.Context, startDate, endDate time.Time, page, pageSize int) (*model.GlobalScriptStatsResponse, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("统计服务未初始化")
	}
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	period := model.GlobalPeriod{
		StartDate: startDate.Format("2006-01-02"),
		EndDate:   endDate.Format("2006-01-02"),
	}

	summary := model.GlobalScriptSummary{}
	if err := s.db.GetContext(ctx, &summary.TotalScripts, `SELECT COUNT(*) FROM code_scripts`); err != nil {
		return nil, err
	}
	if err := s.db.GetContext(ctx, &summary.TotalVersions, `SELECT COUNT(*) FROM code_script_versions`); err != nil {
		return nil, err
	}
	if err := s.db.GetContext(ctx, &summary.ActiveScripts, `
		SELECT COUNT(DISTINCT script_id)
		FROM script_execution_stats
		WHERE execution_date BETWEEN ? AND ?
	`, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}

	var agg struct {
		Total   int64   `db:"total"`
		Success int64   `db:"success"`
		Failed  int64   `db:"failed"`
		Avg     float64 `db:"avg_time"`
		Max     int64   `db:"max_time"`
	}
	if err := s.db.GetContext(ctx, &agg, `
		SELECT 
			COUNT(*) AS total,
			SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) AS success,
			SUM(CASE WHEN execution_status = 'failed' THEN 1 ELSE 0 END) AS failed,
			AVG(execution_time_ms) AS avg_time,
			MAX(execution_time_ms) AS max_time
		FROM script_execution_stats
		WHERE execution_date BETWEEN ? AND ?
	`, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}
	summary.TotalExecutions = agg.Total
	summary.SuccessCount = agg.Success
	summary.FailedCount = agg.Failed
	summary.AvgExecutionTimeMs = agg.Avg
	summary.MaxExecutionTimeMs = agg.Max
	summary.SuccessRate = formatRateString(agg.Success, agg.Total)

	var totalCount int64
	if err := s.db.GetContext(ctx, &totalCount, `
		SELECT COUNT(*) FROM script_execution_stats WHERE execution_date BETWEEN ? AND ?
	`, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}
	if totalCount > 0 {
		offsetP99 := int(math.Ceil(float64(totalCount)*0.99)) - 1
		if offsetP99 < 0 {
			offsetP99 = 0
		}

		var p99 sql.NullInt64
		if err := s.db.GetContext(ctx, &p99, `
			SELECT execution_time_ms
			FROM script_execution_stats
			WHERE execution_date BETWEEN ? AND ?
			ORDER BY execution_time_ms
			LIMIT 1 OFFSET ?
		`, period.StartDate, period.EndDate, offsetP99); err == nil && p99.Valid {
			summary.P99ExecutionTimeMs = p99.Int64
		}
	}

	var quota model.GlobalQuotaUsage
	if err := s.db.GetContext(ctx, &quota, `
		SELECT 
			COALESCE(SUM(current_scripts), 0) AS used,
			COALESCE(SUM(max_scripts), 0) AS max
		FROM access_tokens
	`); err == nil {
		summary.QuotaUsage.Used = quota.Used
		summary.QuotaUsage.Max = quota.Max
	}
	if summary.QuotaUsage.Used < summary.TotalScripts {
		summary.QuotaUsage.Used = summary.TotalScripts
	}
	if summary.QuotaUsage.Max <= 0 {
		summary.QuotaUsage.Max = int64(maxInt(50, int(summary.TotalScripts)))
	}
	summary.QuotaUsage.UsageRate = formatRateString(summary.QuotaUsage.Used, summary.QuotaUsage.Max)

	topRows := []struct {
		ScriptID     string         `db:"script_id"`
		Description  sql.NullString `db:"description"`
		Executions   int64          `db:"executions"`
		SuccessCount int64          `db:"success_count"`
		AvgTimeMs    float64        `db:"avg_time_ms"`
	}{}
	if err := s.db.SelectContext(ctx, &topRows, `
		SELECT 
			cs.id AS script_id,
			cs.description AS description,
			COUNT(*) AS executions,
			SUM(CASE WHEN ses.execution_status = 'success' THEN 1 ELSE 0 END) AS success_count,
			AVG(ses.execution_time_ms) AS avg_time_ms
		FROM script_execution_stats ses
		JOIN code_scripts cs ON ses.script_id = cs.id
		WHERE ses.execution_date BETWEEN ? AND ?
		GROUP BY cs.id, cs.description
		ORDER BY executions DESC
		LIMIT ? OFFSET ?
	`, period.StartDate, period.EndDate, pageSize, offset); err != nil {
		return nil, err
	}

	topScripts := make([]model.GlobalTopScriptItem, 0, len(topRows))
	for i, row := range topRows {
		desc := row.Description.String
		topScripts = append(topScripts, model.GlobalTopScriptItem{
			Rank:        offset + i + 1,
			ScriptID:    row.ScriptID,
			Description: desc,
			Executions:  row.Executions,
			SuccessRate: formatRateString(row.SuccessCount, row.Executions),
			AvgTimeMs:   row.AvgTimeMs,
		})
	}

	dailyTrend := []model.GlobalDailyTrendItem{}
	if err := s.db.SelectContext(ctx, &dailyTrend, `
		SELECT 
			execution_date AS date,
			COUNT(*) AS total,
			SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) AS success,
			SUM(CASE WHEN execution_status = 'failed' THEN 1 ELSE 0 END) AS failed
		FROM script_execution_stats
		WHERE execution_date BETWEEN ? AND ?
		GROUP BY execution_date
		ORDER BY execution_date
	`, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}

	return &model.GlobalScriptStatsResponse{
		Period:     period,
		Summary:    summary,
		TopScripts: topScripts,
		DailyTrend: dailyTrend,
	}, nil
}

// GetScriptStats 获取单个脚本统计
func (s *ScriptStatsService) GetScriptStats(ctx context.Context, token, scriptID string, startDate, endDate time.Time) (*ScriptStatsOverview, error) {
	if s == nil || s.db == nil {
		return nil, fmt.Errorf("统计服务未初始化")
	}
	period := ScriptStatsPeriod{
		StartDate: startDate.Format("2006-01-02"),
		EndDate:   endDate.Format("2006-01-02"),
	}

	var belongs string
	if err := s.db.GetContext(ctx, &belongs, `SELECT token FROM code_scripts WHERE id = ?`, scriptID); err != nil {
		return nil, err
	}
	if belongs != token {
		return nil, fmt.Errorf("无权查看该脚本统计")
	}

	var summary ScriptSummary
	if err := s.db.GetContext(ctx, &summary, `
		SELECT 
			COUNT(*) AS total_executions,
			SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) AS success_count,
			SUM(CASE WHEN execution_status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
			AVG(execution_time_ms) AS avg_execution_time_ms,
			MAX(execution_time_ms) AS max_execution_time_ms
		FROM script_execution_stats
		WHERE script_id = ? AND execution_date BETWEEN ? AND ?
	`, scriptID, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}
	summary.ScriptID = scriptID
	if summary.TotalExecutions > 0 {
		summary.SuccessRate = float64(summary.SuccessCount) * 100 / float64(summary.TotalExecutions)
	}

	type latestInfo struct {
		Version     int    `db:"version"`
		CodeLength  int    `db:"code_length"`
		Description string `db:"description"`
	}
	var latest latestInfo
	if err := s.db.GetContext(ctx, &latest, `SELECT version, code_length, description FROM code_scripts WHERE id = ?`, scriptID); err == nil {
		summary.LatestVersion = latest.Version
		summary.LatestCodeLength = latest.CodeLength
		summary.LatestDescription = latest.Description
	}

	trendRows := []ScriptDailyTrend{}
	if err := s.db.SelectContext(ctx, &trendRows, `
		SELECT 
			execution_date AS date,
			COUNT(*) AS total,
			SUM(CASE WHEN execution_status = 'success' THEN 1 ELSE 0 END) AS success,
			SUM(CASE WHEN execution_status = 'failed' THEN 1 ELSE 0 END) AS failed
		FROM script_execution_stats
		WHERE script_id = ? AND execution_date BETWEEN ? AND ?
		GROUP BY execution_date
		ORDER BY execution_date
	`, scriptID, period.StartDate, period.EndDate); err != nil {
		return nil, err
	}

	return &ScriptStatsOverview{
		Period:     period,
		Summary:    summary,
		DailyTrend: trendRows,
	}, nil
}

func formatRateString(numerator, denominator int64) string {
	if denominator <= 0 {
		return "0.0"
	}
	return fmt.Sprintf("%.1f", float64(numerator)*100/float64(denominator))
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
