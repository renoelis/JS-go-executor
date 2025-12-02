package model

import "time"

// CodeScriptVersion 脚本历史版本
type CodeScriptVersion struct {
	ID          int64     `db:"id" json:"id"`
	ScriptID    string    `db:"script_id" json:"script_id"`
	Version     int       `db:"version" json:"version"`
	CodeBase64  string    `db:"code_base64" json:"code_base64"`
	CodeHash    string    `db:"code_hash" json:"code_hash"`
	CodeLength  int       `db:"code_length" json:"code_length"`
	Description string    `db:"description" json:"description"`
	CreatedAt   time.Time `db:"created_at" json:"created_at"`
}
