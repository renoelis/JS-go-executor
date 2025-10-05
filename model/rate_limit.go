package model

import "time"

// RateLimitConfig 限流配置
type RateLimitConfig struct {
	PerMinute     int  `json:"per_minute"`
	Burst         int  `json:"burst"`
	WindowSeconds int  `json:"window_seconds"`
	Unlimited     bool `json:"unlimited"`
}

// RateLimitInfo 限流信息
type RateLimitInfo struct {
	Allowed    bool      `json:"allowed"`
	Remaining  int       `json:"remaining"`
	ResetTime  time.Time `json:"reset_time"`
	RetryAfter int       `json:"retry_after"`
	Message    string    `json:"message"`
	LimitType  string    `json:"limit_type"` // "burst" 或 "window"
}

// RateLimitHistory 限流历史记录
type RateLimitHistory struct {
	ID             int64     `db:"id" json:"id"`
	TokenKey       string    `db:"token_key" json:"token_key"`
	RequestCount   int       `db:"request_count" json:"request_count"`
	TimeWindow     int       `db:"time_window" json:"time_window"`
	RecordDate     string    `db:"record_date" json:"record_date"`
	RecordHour     int       `db:"record_hour" json:"record_hour"`
	FirstRequestAt time.Time `db:"first_request_at" json:"first_request_at"`
	LastRequestAt  time.Time `db:"last_request_at" json:"last_request_at"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time `db:"updated_at" json:"updated_at"`
}

// RateLimitStats 限流统计信息
type RateLimitStats struct {
	HotTier  HotTierStats  `json:"hot_tier"`
	WarmTier WarmTierStats `json:"warm_tier"`
	ColdTier ColdTierStats `json:"cold_tier"`
	HitRate  HitRateStats  `json:"hit_rate"`
}

// HotTierStats 热数据层统计
type HotTierStats struct {
	Size               int `json:"size"`
	MaxSize            int `json:"max_size"`
	UtilizationPercent int `json:"utilization_percent"`
}

// WarmTierStats 温数据层统计
type WarmTierStats struct {
	Enabled bool   `json:"enabled"`
	Size    int    `json:"size"`
	TTL     int    `json:"ttl"`
	Error   string `json:"error,omitempty"`
}

// ColdTierStats 冷数据层统计
type ColdTierStats struct {
	Enabled         bool   `json:"enabled"`
	BatchBufferSize int    `json:"batch_buffer_size"`
	BatchSize       int    `json:"batch_size"`
	TableName       string `json:"table_name"`
}

// HitRateStats 命中率统计
type HitRateStats struct {
	HotHits  int64   `json:"hot_hits"`
	WarmHits int64   `json:"warm_hits"`
	ColdHits int64   `json:"cold_hits"`
	Misses   int64   `json:"misses"`
	HotRate  float64 `json:"hot_rate"`
	WarmRate float64 `json:"warm_rate"`
	Overall  float64 `json:"overall"`
}
