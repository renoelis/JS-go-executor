package utils

import (
	"time"
)

// 上海时区（东八区）
var ShanghaiLocation *time.Location

func init() {
	var err error
	ShanghaiLocation, err = time.LoadLocation("Asia/Shanghai")
	if err != nil {
		// 如果加载失败，使用FixedZone创建东八区
		ShanghaiLocation = time.FixedZone("CST", 8*3600)
	}
}

// Now 获取当前上海时区时间
func Now() time.Time {
	return time.Now().In(ShanghaiLocation)
}

// FormatTime 格式化时间为上海时区的字符串
// 格式：yyyy-MM-dd HH:mm:ss
func FormatTime(t time.Time) string {
	return t.In(ShanghaiLocation).Format("2006-01-02 15:04:05")
}

// FormatTimePtr 格式化时间指针为上海时区的字符串
func FormatTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	formatted := FormatTime(*t)
	return &formatted
}

// ParseTime 解析时间字符串为上海时区时间
// 支持格式：yyyy-MM-dd 或 yyyy-MM-dd HH:mm:ss
func ParseTime(timeStr string) (time.Time, error) {
	// 尝试解析日期格式
	t, err := time.ParseInLocation("2006-01-02", timeStr, ShanghaiLocation)
	if err == nil {
		return t, nil
	}
	
	// 尝试解析日期时间格式
	t, err = time.ParseInLocation("2006-01-02 15:04:05", timeStr, ShanghaiLocation)
	if err == nil {
		return t, nil
	}
	
	return time.Time{}, err
}

// ToShanghaiTime 将任意时区的时间转换为上海时区
func ToShanghaiTime(t time.Time) time.Time {
	return t.In(ShanghaiLocation)
}
