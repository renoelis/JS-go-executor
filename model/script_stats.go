package model

import "time"

// ScriptExecutionRecord 脚本执行统计记录
type ScriptExecutionRecord struct {
	ID              int64     `db:"id" json:"id"`
	ScriptID        string    `db:"script_id" json:"script_id"`
	Token           string    `db:"token" json:"token"`
	ExecutionStatus string    `db:"execution_status" json:"execution_status"`
	ExecutionTimeMs int       `db:"execution_time_ms" json:"execution_time_ms"`
	ExecutionDate   time.Time `db:"execution_date" json:"execution_date"`
	ExecutionTime   time.Time `db:"execution_time" json:"execution_time"`
	CreatedAt       time.Time `db:"created_at" json:"created_at"`
}
