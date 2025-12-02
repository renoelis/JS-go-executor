package model

import (
	"database/sql/driver"
	"flow-codeblock-go/utils"
	"time"
)

// ShanghaiTime 上海时区时间类型
type ShanghaiTime struct {
	time.Time
}

// MarshalJSON 实现JSON序列化，输出上海时区格式
func (st ShanghaiTime) MarshalJSON() ([]byte, error) {
	// 如果时间是零值，返回null
	if st.Time.IsZero() {
		return []byte("null"), nil
	}
	// 将时间转换为上海时区并格式化
	// 注意：数据库可能返回UTC时间，需要转换
	loc, _ := time.LoadLocation("Asia/Shanghai")
	shanghaiTime := st.Time.In(loc)
	formatted := shanghaiTime.Format("2006-01-02 15:04:05")
	return []byte(`"` + formatted + `"`), nil
}

// UnmarshalJSON 实现JSON反序列化
func (st *ShanghaiTime) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		return nil
	}
	str := string(data[1 : len(data)-1]) // 去掉引号
	t, err := utils.ParseTime(str)
	if err != nil {
		return err
	}
	st.Time = t
	return nil
}

// Scan 实现sql.Scanner接口
func (st *ShanghaiTime) Scan(value interface{}) error {
	if value == nil {
		st.Time = time.Time{}
		return nil
	}
	if t, ok := value.(time.Time); ok {
		// 数据库连接使用loc=Local，返回的已经是本地时区时间
		// 直接保存即可
		st.Time = t
		return nil
	}
	return nil
}

// Value 实现driver.Valuer接口
func (st ShanghaiTime) Value() (driver.Value, error) {
	return st.Time, nil
}

// TokenInfo Token信息
type TokenInfo struct {
	ID                     int           `db:"id" json:"id"`
	WsID                   string        `db:"ws_id" json:"ws_id"`
	Email                  string        `db:"email" json:"email"`
	AccessToken            string        `db:"access_token" json:"access_token"`
	CreatedAt              ShanghaiTime  `db:"created_at" json:"created_at"`
	ExpiresAt              *ShanghaiTime `db:"expires_at" json:"expires_at"`
	OperationType          string        `db:"operation_type" json:"operation_type"`
	IsActive               bool          `db:"is_active" json:"is_active"`
	RateLimitPerMinute     *int          `db:"rate_limit_per_minute" json:"rate_limit_per_minute"`
	RateLimitBurst         *int          `db:"rate_limit_burst" json:"rate_limit_burst"`
	RateLimitWindowSeconds *int          `db:"rate_limit_window_seconds" json:"rate_limit_window_seconds"`
	// 🔥 配额相关字段
	QuotaType      string        `db:"quota_type" json:"quota_type"`           // time/count/hybrid
	TotalQuota     *int          `db:"total_quota" json:"total_quota"`         // 总配额
	RemainingQuota *int          `db:"remaining_quota" json:"remaining_quota"` // 剩余配额
	QuotaSyncedAt  *ShanghaiTime `db:"quota_synced_at" json:"quota_synced_at"` // 配额同步时间

	// 🆕 脚本管理配额
	MaxScripts     *int         `db:"max_scripts" json:"max_scripts,omitempty"`
	CurrentScripts *int         `db:"current_scripts" json:"current_scripts,omitempty"`
	UpdatedAt      ShanghaiTime `db:"updated_at" json:"updated_at"`
}

// IsExpired 检查Token是否过期
func (t *TokenInfo) IsExpired() bool {
	if t.ExpiresAt == nil {
		return false
	}
	return time.Now().After(t.ExpiresAt.Time)
}

// IsUnlimited 检查是否不限流
func (t *TokenInfo) IsUnlimited() bool {
	return t.RateLimitPerMinute == nil
}

// IsCountBased 是否基于次数的配额模式
func (t *TokenInfo) IsCountBased() bool {
	return t.QuotaType == "count" || t.QuotaType == "hybrid"
}

// NeedsQuotaCheck 是否需要配额检查
func (t *TokenInfo) NeedsQuotaCheck() bool {
	return t.IsCountBased() && t.TotalQuota != nil
}

// IsQuotaExhausted 检查配额是否耗尽
func (t *TokenInfo) IsQuotaExhausted() bool {
	if !t.NeedsQuotaCheck() {
		return false // time模式不检查配额
	}
	if t.RemainingQuota == nil {
		return false // NULL表示不限次数
	}
	return *t.RemainingQuota <= 0
}

// IsValid 检查Token是否有效（综合判断：激活状态 + 时间 + 配额）
func (t *TokenInfo) IsValid() bool {
	if !t.IsActive {
		return false
	}
	// 时间检查
	if t.IsExpired() {
		return false
	}
	// 配额检查
	if t.IsQuotaExhausted() {
		return false
	}
	return true
}

// GetRateLimitConfig 获取限流配置
func (t *TokenInfo) GetRateLimitConfig() RateLimitConfig {
	if t.IsUnlimited() {
		return RateLimitConfig{
			Unlimited: true,
		}
	}

	perMinute := *t.RateLimitPerMinute
	burst := 10 // 默认值
	if t.RateLimitBurst != nil {
		burst = *t.RateLimitBurst
	}
	windowSeconds := 60 // 默认值
	if t.RateLimitWindowSeconds != nil {
		windowSeconds = *t.RateLimitWindowSeconds
	}

	return RateLimitConfig{
		PerMinute:     perMinute,
		Burst:         burst,
		WindowSeconds: windowSeconds,
		Unlimited:     false,
	}
}

// CreateTokenRequest 创建Token请求
type CreateTokenRequest struct {
	WsID                   string `json:"ws_id" binding:"required"`
	Email                  string `json:"email" binding:"required,email"`
	Operation              string `json:"operation" binding:"required,oneof=add set unlimited"`
	Days                   *int   `json:"days"`
	SpecificDate           string `json:"specific_date"`
	RateLimitPerMinute     *int   `json:"rate_limit_per_minute"`
	RateLimitBurst         *int   `json:"rate_limit_burst"`
	RateLimitWindowSeconds *int   `json:"rate_limit_window_seconds"`
	// 🔥 配额相关字段
	QuotaType  string `json:"quota_type" binding:"omitempty,oneof=time count hybrid"` // 配额类型
	TotalQuota *int   `json:"total_quota"`                                            // 总配额次数
	// 🆕 脚本配额
	MaxScripts *int `json:"max_scripts" binding:"omitempty,min=1"` // 最大脚本数量
}

// UpdateTokenRequest 更新Token请求
type UpdateTokenRequest struct {
	Operation              string `json:"operation" binding:"required,oneof=set unlimited"`
	SpecificDate           string `json:"specific_date"`
	RateLimitPerMinute     *int   `json:"rate_limit_per_minute"`
	RateLimitBurst         *int   `json:"rate_limit_burst"`
	RateLimitWindowSeconds *int   `json:"rate_limit_window_seconds"`
	// 🔥 配额操作字段
	QuotaOperation string `json:"quota_operation" binding:"omitempty,oneof=add set reset"` // add=增加, set=设置, reset=重置
	QuotaAmount    *int   `json:"quota_amount"`                                            // 配额数量
	// 🔥 新增：支持修改配额类型
	QuotaType string `json:"quota_type" binding:"omitempty,oneof=time count hybrid"` // time=仅时间, count=仅次数, hybrid=双重限制
	// 🆕 脚本配额
	MaxScripts *int `json:"max_scripts" binding:"omitempty,min=1"`
}

// TokenQueryRequest Token查询请求
type TokenQueryRequest struct {
	WsID  string `form:"ws_id"`
	Email string `form:"email"`
	Token string `form:"token"`
}

// QuotaLog 配额日志
type QuotaLog struct {
	ID                    int64        `db:"id" json:"id"`
	Token                 string       `db:"token" json:"token"`
	WsID                  string       `db:"ws_id" json:"ws_id"`
	Email                 string       `db:"email" json:"email"`
	QuotaBefore           int          `db:"quota_before" json:"quota_before"`
	QuotaAfter            int          `db:"quota_after" json:"quota_after"`
	QuotaChange           int          `db:"quota_change" json:"quota_change"`
	Action                string       `db:"action" json:"action"`
	RequestID             *string      `db:"request_id" json:"request_id"`
	ExecutionSuccess      *bool        `db:"execution_success" json:"execution_success"`
	ExecutionErrorType    *string      `db:"execution_error_type" json:"execution_error_type"`
	ExecutionErrorMessage *string      `db:"execution_error_message" json:"execution_error_message"`
	CreatedAt             ShanghaiTime `db:"created_at" json:"created_at"`
}

// QuotaLogsQueryRequest 配额日志查询请求
type QuotaLogsQueryRequest struct {
	Token     string `form:"token"`
	StartDate string `form:"start_date"` // yyyy-MM-dd
	EndDate   string `form:"end_date"`   // yyyy-MM-dd
	Page      int    `form:"page"`
	PageSize  int    `form:"page_size"`
}

// ========== Token查询验证码相关模型 ==========

// RequestVerifyCodeRequest 请求验证码请求
type RequestVerifyCodeRequest struct {
	WsID  string `json:"ws_id" binding:"required"`
	Email string `json:"email" binding:"required,email"`
}

// VerifyCodeAndQueryTokenRequest 验证验证码并查询Token请求
type VerifyCodeAndQueryTokenRequest struct {
	WsID  string `json:"ws_id" binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required"`
}

// MaskedTokenInfo 脱敏的Token信息（用于验证码验证通过后返回）
type MaskedTokenInfo struct {
	ID                     int           `json:"id"`
	WsID                   string        `json:"ws_id"`
	Email                  string        `json:"email"`
	AccessToken            string        `json:"access_token"` // 完整Token
	CreatedAt              ShanghaiTime  `json:"created_at"`
	ExpiresAt              *ShanghaiTime `json:"expires_at,omitempty"`
	IsExpired              bool          `json:"is_expired"`
	QuotaPerDay            *int          `json:"quota_per_day,omitempty"`
	QuotaPerSecond         *float64      `json:"quota_per_second,omitempty"`
	QuotaUsedToday         int           `json:"quota_used_today"`
	QuotaRemainingToday    int           `json:"quota_remaining_today"`
	QuotaResetTime         *ShanghaiTime `json:"quota_reset_time,omitempty"`
	LastUsedAt             *ShanghaiTime `json:"last_used_at,omitempty"`
	LastUsedIP             *string       `json:"last_used_ip,omitempty"`
	AllowFetch             bool          `json:"allow_fetch"`
	AllowBase64            bool          `json:"allow_base64"`
	MaxBlobFileSize        *int64        `json:"max_blob_file_size,omitempty"`
	MaxConcurrentRequests  *int          `json:"max_concurrent_requests,omitempty"`
	MaxExecutionTimeoutSec *int          `json:"max_execution_timeout_sec,omitempty"`
	Status                 string        `json:"status"`
}
