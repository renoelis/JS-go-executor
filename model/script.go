package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"flow-codeblock-go/utils"
)

// JSONStringArray 用于存储JSON数组字段
type JSONStringArray []string

// Scan 实现 sql.Scanner
func (a *JSONStringArray) Scan(value interface{}) error {
	if value == nil {
		*a = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		if len(v) == 0 {
			*a = nil
			return nil
		}
		return json.Unmarshal(v, a)
	case string:
		if v == "" {
			*a = nil
			return nil
		}
		return json.Unmarshal([]byte(v), a)
	default:
		return fmt.Errorf("unsupported type for JSONStringArray: %T", value)
	}
}

// Value 实现 driver.Valuer
func (a JSONStringArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	return json.Marshal(a)
}

// CodeScript 脚本主表
type CodeScript struct {
	ID                string               `db:"id" json:"id"`
	Token             string               `db:"token" json:"-"`
	WsID              string               `db:"ws_id" json:"ws_id"`
	Email             string               `db:"email" json:"email"`
	Description       string               `db:"description" json:"description"`
	CodeBase64        string               `db:"code_base64" json:"code_base64"`
	CodeHash          string               `db:"code_hash" json:"code_hash"`
	CodeLength        int                  `db:"code_length" json:"code_length"`
	Version           int                  `db:"version" json:"version"`
	IPWhitelist       JSONStringArray      `db:"ip_whitelist" json:"ip_whitelist"`
	CreatedAt         time.Time            `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time            `db:"updated_at" json:"updated_at"`
	ParsedIPWhitelist []utils.ParsedIPRule `db:"-" json:"-"`
	AvailableVersions []int                `db:"-" json:"available_versions,omitempty"`
}
