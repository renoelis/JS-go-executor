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
	UpdatedAt              ShanghaiTime  `db:"updated_at" json:"updated_at"`
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
}

// UpdateTokenRequest 更新Token请求
type UpdateTokenRequest struct {
	Operation              string `json:"operation" binding:"required,oneof=set unlimited"`
	SpecificDate           string `json:"specific_date"`
	RateLimitPerMinute     *int   `json:"rate_limit_per_minute"`
	RateLimitBurst         *int   `json:"rate_limit_burst"`
	RateLimitWindowSeconds *int   `json:"rate_limit_window_seconds"`
}

// TokenQueryRequest Token查询请求
type TokenQueryRequest struct {
	WsID  string `form:"ws_id"`
	Email string `form:"email"`
	Token string `form:"token"`
}
