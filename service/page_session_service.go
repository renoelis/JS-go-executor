package service

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"flow-codeblock-go/utils"
)

// PageSessionData Session数据结构
type PageSessionData struct {
	SessionID string    `json:"session_id"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"user_agent"`
	CreatedAt time.Time `json:"created_at"`
	LastUsed  time.Time `json:"last_used"`
}

// PageSessionService Session服务
type PageSessionService struct {
	redisClient *redis.Client
	enabled     bool
	ttl         time.Duration
	secret      string
}

// NewPageSessionService 创建Session服务
func NewPageSessionService(redisClient *redis.Client, enabled bool, ttl time.Duration, secret string) *PageSessionService {
	if !enabled {
		utils.Info("Session服务未启用")
		return &PageSessionService{enabled: false}
	}

	if redisClient == nil {
		utils.Warn("Redis未配置，Session服务无法启用")
		return &PageSessionService{enabled: false}
	}

	if secret == "" {
		utils.Warn("SESSION_SECRET未配置，Session服务无法启用")
		return &PageSessionService{enabled: false}
	}

	utils.Info("Session服务已启用", zap.Duration("ttl", ttl))

	return &PageSessionService{
		redisClient: redisClient,
		enabled:     true,
		ttl:         ttl,
		secret:      secret,
	}
}

// IsEnabled 检查服务是否启用
func (s *PageSessionService) IsEnabled() bool {
	return s.enabled
}

// CreateSession 创建Session
func (s *PageSessionService) CreateSession(ctx context.Context, ip, userAgent string) (sessionID, signedCookie string, err error) {
	if !s.enabled {
		return "", "", fmt.Errorf("Session服务未启用")
	}

	// 1. 频率限制检查（5分钟内最多5个）
	rateLimitKey := fmt.Sprintf("page_session_rate:%s", ip)
	count, err := s.redisClient.Incr(ctx, rateLimitKey).Result()
	if err != nil {
		utils.Error("Session频率限制检查失败", zap.Error(err))
		return "", "", fmt.Errorf("系统错误，请稍后再试")
	}

	if count == 1 {
		s.redisClient.Expire(ctx, rateLimitKey, 5*time.Minute)
	}

	if count > 5 {
		utils.Warn("IP创建Session过于频繁", zap.String("ip", ip), zap.Int64("count", count))
		return "", "", fmt.Errorf("请求过于频繁，请稍后再试")
	}

	// 2. 生成随机Session ID
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", "", fmt.Errorf("生成Session ID失败")
	}
	sessionID = hex.EncodeToString(b)

	// 3. 保存Session数据到Redis
	now := time.Now()
	sessionData := PageSessionData{
		SessionID: sessionID,
		IP:        ip,
		UserAgent: userAgent,
		CreatedAt: now,
		LastUsed:  now,
	}

	jsonData, err := json.Marshal(sessionData)
	if err != nil {
		return "", "", fmt.Errorf("序列化Session数据失败")
	}

	redisKey := fmt.Sprintf("page_session:%s", sessionID)
	if err := s.redisClient.Set(ctx, redisKey, jsonData, s.ttl).Err(); err != nil {
		utils.Error("保存Session到Redis失败", zap.Error(err))
		return "", "", fmt.Errorf("系统错误，请稍后再试")
	}

	// 4. 生成签名Cookie
	signedCookie = s.signCookie(sessionID)

	utils.Info("创建页面Session",
		zap.String("session_id", sessionID[:16]+"..."),
		zap.String("ip", ip),
		zap.Duration("ttl", s.ttl),
	)

	return sessionID, signedCookie, nil
}

// ValidateAndRenewSession 验证Session并自动续期
func (s *PageSessionService) ValidateAndRenewSession(ctx context.Context, signedCookie, ip, userAgent string) (*PageSessionData, error) {
	if !s.enabled {
		return nil, fmt.Errorf("Session服务未启用")
	}

	if signedCookie == "" {
		return nil, fmt.Errorf("Session Cookie不存在")
	}

	// 1. 验证签名并提取Session ID
	sessionID, err := s.verifyCookie(signedCookie)
	if err != nil {
		utils.Warn("Session签名验证失败", zap.Error(err))
		return nil, fmt.Errorf("Session无效")
	}

	// 2. 从Redis获取Session数据
	redisKey := fmt.Sprintf("page_session:%s", sessionID)
	jsonData, err := s.redisClient.Get(ctx, redisKey).Result()
	if err != nil {
		if err == redis.Nil {
			utils.Warn("Session不存在或已过期", zap.String("session_id", sessionID[:16]+"..."))
			return nil, fmt.Errorf("Session已过期，请刷新页面")
		}
		utils.Error("读取Session失败", zap.Error(err))
		return nil, fmt.Errorf("系统错误")
	}

	var sessionData PageSessionData
	if err := json.Unmarshal([]byte(jsonData), &sessionData); err != nil {
		utils.Error("Session数据反序列化失败", zap.Error(err))
		return nil, fmt.Errorf("Session数据损坏")
	}

	// 3. 验证IP和User-Agent
	if sessionData.IP != ip {
		utils.Warn("Session IP不匹配",
			zap.String("session_ip", sessionData.IP),
			zap.String("request_ip", ip),
		)
		return nil, fmt.Errorf("Session无效（IP不匹配）")
	}

	if sessionData.UserAgent != userAgent {
		utils.Warn("Session User-Agent不匹配",
			zap.String("session_ua", sessionData.UserAgent[:min(50, len(sessionData.UserAgent))]+"..."),
			zap.String("request_ua", userAgent[:min(50, len(userAgent))]+"..."),
		)
		return nil, fmt.Errorf("Session无效（浏览器不匹配）")
	}

	// 4. 更新最后使用时间并续期
	sessionData.LastUsed = time.Now()
	updatedData, _ := json.Marshal(sessionData)
	if err := s.redisClient.Set(ctx, redisKey, updatedData, s.ttl).Err(); err != nil {
		utils.Error("续期Session失败", zap.Error(err))
		// 不返回错误，继续执行（续期失败不影响本次请求）
	}

	utils.Debug("Session验证通过并已续期",
		zap.String("session_id", sessionID[:16]+"..."),
		zap.String("ip", ip),
	)

	return &sessionData, nil
}

// signCookie 生成签名Cookie
// 格式: sessionID|timestamp|signature
func (s *PageSessionService) signCookie(sessionID string) string {
	timestamp := time.Now().Unix()
	message := fmt.Sprintf("%s|%d", sessionID, timestamp)

	// HMAC-SHA256 签名
	h := hmac.New(sha256.New, []byte(s.secret))
	h.Write([]byte(message))
	signature := hex.EncodeToString(h.Sum(nil))

	return fmt.Sprintf("%s|%d|%s", sessionID, timestamp, signature)
}

// verifyCookie 验证签名Cookie
func (s *PageSessionService) verifyCookie(signedCookie string) (string, error) {
	// 解析格式: sessionID|timestamp|signature
	var sessionID string
	var timestamp int64
	var signature string

	_, err := fmt.Sscanf(signedCookie, "%64s|%d|%64s", &sessionID, &timestamp, &signature)
	if err != nil {
		return "", fmt.Errorf("Cookie格式错误")
	}

	// 重新计算签名
	message := fmt.Sprintf("%s|%d", sessionID, timestamp)
	h := hmac.New(sha256.New, []byte(s.secret))
	h.Write([]byte(message))
	expectedSignature := hex.EncodeToString(h.Sum(nil))

	// 比对签名
	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return "", fmt.Errorf("签名验证失败")
	}

	// 检查时间戳有效性（防止使用过旧的Cookie，虽然有TTL，但额外检查）
	if time.Since(time.Unix(timestamp, 0)) > 24*time.Hour {
		return "", fmt.Errorf("Cookie已过期")
	}

	return sessionID, nil
}

// DeleteSession 删除Session
func (s *PageSessionService) DeleteSession(ctx context.Context, sessionID string) error {
	if !s.enabled {
		return nil
	}

	redisKey := fmt.Sprintf("page_session:%s", sessionID)
	return s.redisClient.Del(ctx, redisKey).Err()
}
