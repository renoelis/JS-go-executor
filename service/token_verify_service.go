package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"flow-codeblock-go/utils"
)

// VerificationCodeData 验证码数据结构
type VerificationCodeData struct {
	Code      string    `json:"code"`
	CreatedAt time.Time `json:"created_at"`
	IP        string    `json:"ip"`
	Attempts  int       `json:"attempts"`
}

// TokenVerifyService 验证码服务
type TokenVerifyService struct {
	redisClient       *redis.Client
	emailService      *EmailWebhookService
	enabled           bool
	codeLength        int           // 验证码长度（默认6位）
	codeTTL           time.Duration // 验证码有效期（默认5分钟）
	cooldownTTL       time.Duration // 冷却时间（默认60秒）
	maxAttempts       int           // 最大尝试次数（默认3次）
	emailRateLimit    int           // 邮箱频率限制（每小时，默认3次）
	ipRateLimit       int           // IP频率限制（每小时，默认10次）
	emailRateLimitTTL time.Duration // 邮箱频率限制TTL
	ipRateLimitTTL    time.Duration // IP频率限制TTL
}

// NewTokenVerifyService 创建验证码服务
func NewTokenVerifyService(
	redisClient *redis.Client,
	emailService *EmailWebhookService,
	enabled bool,
	codeLength int,
	codeExpiry time.Duration,
	maxAttempts int,
	cooldownTime time.Duration,
	rateLimitEmail int,
	rateLimitIP int,
) *TokenVerifyService {
	if !enabled {
		utils.Info("验证码服务未启用")
		return &TokenVerifyService{enabled: false}
	}

	if redisClient == nil {
		utils.Warn("Redis未配置，验证码服务无法启用")
		return &TokenVerifyService{enabled: false}
	}

	if !emailService.IsEnabled() {
		utils.Warn("邮件服务未启用，验证码服务无法启用")
		return &TokenVerifyService{enabled: false}
	}

	utils.Info("验证码服务已启用",
		zap.Int("code_length", codeLength),
		zap.Duration("code_expiry", codeExpiry),
		zap.Duration("cooldown", cooldownTime),
		zap.Int("max_attempts", maxAttempts),
		zap.Int("rate_limit_email", rateLimitEmail),
		zap.Int("rate_limit_ip", rateLimitIP),
	)

	return &TokenVerifyService{
		redisClient:       redisClient,
		emailService:      emailService,
		enabled:           true,
		codeLength:        codeLength,
		codeTTL:           codeExpiry,
		cooldownTTL:       cooldownTime,
		maxAttempts:       maxAttempts,
		emailRateLimit:    rateLimitEmail,
		ipRateLimit:       rateLimitIP,
		emailRateLimitTTL: 1 * time.Hour,
		ipRateLimitTTL:    1 * time.Hour,
	}
}

// IsEnabled 检查服务是否启用
func (s *TokenVerifyService) IsEnabled() bool {
	return s.enabled
}

// SendVerificationCode 发送验证码
func (s *TokenVerifyService) SendVerificationCode(ctx context.Context, wsID, email, ip string) error {
	if !s.enabled {
		return fmt.Errorf("验证码服务未启用")
	}

	// 1. 检查冷却时间（同一邮箱+ws_id，60秒内只能请求1次）
	cooldownKey := fmt.Sprintf("token_verify_cooldown:%s:%s", email, wsID)
	exists, err := s.redisClient.Exists(ctx, cooldownKey).Result()
	if err != nil {
		utils.Error("检查冷却时间失败", zap.Error(err))
		return fmt.Errorf("系统错误，请稍后再试")
	}

	if exists > 0 {
		ttl, _ := s.redisClient.TTL(ctx, cooldownKey).Result()
		return fmt.Errorf("请求过于频繁，请 %d 秒后再试", int(ttl.Seconds()))
	}

	// 2. 检查邮箱频率限制（每小时3次）
	emailRateKey := fmt.Sprintf("token_verify_rate:%s", email)
	emailCount, err := s.redisClient.Incr(ctx, emailRateKey).Result()
	if err != nil {
		utils.Error("检查邮箱频率失败", zap.Error(err))
		return fmt.Errorf("系统错误")
	}

	if emailCount == 1 {
		s.redisClient.Expire(ctx, emailRateKey, s.emailRateLimitTTL)
	}

	if emailCount > int64(s.emailRateLimit) {
		ttl, _ := s.redisClient.TTL(ctx, emailRateKey).Result()
		utils.Warn("邮箱请求验证码过于频繁",
			zap.String("email", maskEmail(email)),
			zap.Int64("count", emailCount),
		)
		return fmt.Errorf("该邮箱请求过于频繁，请 %d 分钟后再试", int(ttl.Minutes()))
	}

	// 3. 检查IP频率限制（每小时10次）
	ipRateKey := fmt.Sprintf("token_verify_rate:ip:%s", ip)
	ipCount, err := s.redisClient.Incr(ctx, ipRateKey).Result()
	if err != nil {
		utils.Error("检查IP频率失败", zap.Error(err))
		return fmt.Errorf("系统错误")
	}

	if ipCount == 1 {
		s.redisClient.Expire(ctx, ipRateKey, s.ipRateLimitTTL)
	}

	if ipCount > int64(s.ipRateLimit) {
		ttl, _ := s.redisClient.TTL(ctx, ipRateKey).Result()
		utils.Warn("IP请求验证码过于频繁",
			zap.String("ip", ip),
			zap.Int64("count", ipCount),
		)
		return fmt.Errorf("请求过于频繁，请 %d 分钟后再试", int(ttl.Minutes()))
	}

	// 4. 生成验证码（使用配置的长度）
	code := s.generateVerificationCode()

	// 5. 保存验证码到Redis
	codeData := VerificationCodeData{
		Code:      code,
		CreatedAt: time.Now(),
		IP:        ip,
		Attempts:  0,
	}

	jsonData, err := json.Marshal(codeData)
	if err != nil {
		utils.Error("序列化验证码数据失败", zap.Error(err))
		return fmt.Errorf("系统错误")
	}

	codeKey := fmt.Sprintf("token_verify_code:%s:%s", email, wsID)
	if err := s.redisClient.Set(ctx, codeKey, jsonData, s.codeTTL).Err(); err != nil {
		utils.Error("保存验证码失败", zap.Error(err))
		return fmt.Errorf("系统错误")
	}

	// 6. 设置冷却时间
	if err := s.redisClient.Set(ctx, cooldownKey, "1", s.cooldownTTL).Err(); err != nil {
		utils.Warn("设置冷却时间失败", zap.Error(err))
		// 不返回错误，继续执行
	}

	// 7. 调用Webhook发送邮件
	requestID, err := s.emailService.SendVerificationCode(ctx, wsID, email, code)
	if err != nil {
		utils.Error("发送验证码邮件失败",
			zap.Error(err),
			zap.String("email", maskEmail(email)),
		)
		return fmt.Errorf("邮件发送失败：%v", err)
	}

	utils.Info("验证码发送成功",
		zap.String("email", maskEmail(email)),
		zap.String("ws_id", wsID),
		zap.String("request_id", requestID),
	)

	return nil
}

// VerifyCode 验证验证码
func (s *TokenVerifyService) VerifyCode(ctx context.Context, wsID, email, code string) error {
	if !s.enabled {
		return fmt.Errorf("验证码服务未启用")
	}

	if code == "" {
		return fmt.Errorf("验证码不能为空")
	}

	// 1. 从Redis获取验证码数据
	codeKey := fmt.Sprintf("token_verify_code:%s:%s", email, wsID)
	jsonData, err := s.redisClient.Get(ctx, codeKey).Result()
	if err != nil {
		if err == redis.Nil {
			return fmt.Errorf("验证码不存在或已过期")
		}
		utils.Error("读取验证码失败", zap.Error(err))
		return fmt.Errorf("系统错误")
	}

	var codeData VerificationCodeData
	if err := json.Unmarshal([]byte(jsonData), &codeData); err != nil {
		utils.Error("验证码数据反序列化失败", zap.Error(err))
		return fmt.Errorf("验证码数据损坏")
	}

	// 2. 检查尝试次数
	if codeData.Attempts >= s.maxAttempts {
		utils.Warn("验证码尝试次数超限",
			zap.String("email", maskEmail(email)),
			zap.Int("attempts", codeData.Attempts),
		)
		// 删除验证码
		s.redisClient.Del(ctx, codeKey)
		return fmt.Errorf("验证码错误次数过多，请重新获取")
	}

	// 3. 验证码比对
	if codeData.Code != code {
		// 增加尝试次数
		codeData.Attempts++
		updatedData, _ := json.Marshal(codeData)
		s.redisClient.Set(ctx, codeKey, updatedData, s.codeTTL)

		remaining := s.maxAttempts - codeData.Attempts
		utils.Warn("验证码错误",
			zap.String("email", maskEmail(email)),
			zap.Int("attempts", codeData.Attempts),
			zap.Int("remaining", remaining),
		)

		if remaining > 0 {
			return fmt.Errorf("验证码错误，剩余 %d 次尝试机会", remaining)
		} else {
			// 删除验证码
			s.redisClient.Del(ctx, codeKey)
			return fmt.Errorf("验证码错误次数过多，请重新获取")
		}
	}

	// 4. 验证通过，删除验证码（一次性使用）
	if err := s.redisClient.Del(ctx, codeKey).Err(); err != nil {
		utils.Warn("删除验证码失败", zap.Error(err))
		// 不返回错误，继续执行
	}

	utils.Info("验证码验证通过",
		zap.String("email", maskEmail(email)),
		zap.String("ws_id", wsID),
	)

	return nil
}

// generateVerificationCode 生成验证码（支持可配置长度）
func (s *TokenVerifyService) generateVerificationCode() string {
	// 使用时间作为随机种子
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	// 计算最大值：10^codeLength
	maxValue := 1
	for i := 0; i < s.codeLength; i++ {
		maxValue *= 10
	}

	code := r.Intn(maxValue)

	// 格式化为指定长度的字符串（前面补0）
	format := fmt.Sprintf("%%0%dd", s.codeLength)
	return fmt.Sprintf(format, code)
}
