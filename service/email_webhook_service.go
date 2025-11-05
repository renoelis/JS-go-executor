package service

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.uber.org/zap"

	"flow-codeblock-go/utils"
)

// WebhookEmailRequest Webhook请求体
type WebhookEmailRequest struct {
	WsID  string `json:"ws_id"`
	Email string `json:"email"`
	Code  string `json:"code"`
}

// WebhookEmailResponse Webhook响应
type WebhookEmailResponse struct {
	ErrCode int                    `json:"errCode"`
	ErrMsg  interface{}            `json:"errMsg"`
	Result  map[string]interface{} `json:"result"`
}

// EmailWebhookService Webhook邮件服务
type EmailWebhookService struct {
	enabled    bool
	webhookURL string
	timeout    time.Duration
	client     *http.Client
}

// NewEmailWebhookService 创建Webhook邮件服务
func NewEmailWebhookService(enabled bool, webhookURL string, timeout time.Duration) *EmailWebhookService {
	if !enabled {
		utils.Info("Webhook邮件服务未启用")
		return &EmailWebhookService{enabled: false}
	}

	if webhookURL == "" {
		utils.Warn("WEBHOOK_URL未配置，邮件服务无法启用")
		return &EmailWebhookService{enabled: false}
	}

	utils.Info("Webhook邮件服务已启用", zap.String("url", webhookURL[:50]+"..."))

	return &EmailWebhookService{
		enabled:    true,
		webhookURL: webhookURL,
		timeout:    timeout,
		client: &http.Client{
			Timeout: timeout,
		},
	}
}

// IsEnabled 检查服务是否启用
func (s *EmailWebhookService) IsEnabled() bool {
	return s.enabled
}

// SendVerificationCode 发送验证码邮件
func (s *EmailWebhookService) SendVerificationCode(ctx context.Context, wsID, email, code string) (requestID string, err error) {
	if !s.enabled {
		return "", fmt.Errorf("邮件服务未启用")
	}

	// 1. 构建请求数据
	reqData := WebhookEmailRequest{
		WsID:  wsID,
		Email: email,
		Code:  code,
	}

	jsonData, err := json.Marshal(reqData)
	if err != nil {
		utils.Error("序列化Webhook请求失败", zap.Error(err))
		return "", fmt.Errorf("系统错误")
	}

	// 2. 发送HTTP POST请求
	startTime := time.Now()
	req, err := http.NewRequestWithContext(ctx, "POST", s.webhookURL, bytes.NewBuffer(jsonData))
	if err != nil {
		utils.Error("创建Webhook请求失败", zap.Error(err))
		return "", fmt.Errorf("系统错误")
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		utils.Error("调用Webhook失败",
			zap.Error(err),
			zap.Duration("elapsed", time.Since(startTime)),
		)
		return "", fmt.Errorf("邮件发送失败，请稍后再试")
	}
	defer resp.Body.Close()

	// 3. 读取响应
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		utils.Error("读取Webhook响应失败", zap.Error(err))
		return "", fmt.Errorf("邮件发送失败")
	}

	// 4. 检查HTTP状态码
	if resp.StatusCode != http.StatusOK {
		utils.Error("Webhook返回错误状态码",
			zap.Int("status_code", resp.StatusCode),
			zap.String("response", string(bodyBytes)),
		)
		return "", fmt.Errorf("邮件发送失败（状态码：%d）", resp.StatusCode)
	}

	// 5. 解析响应JSON
	var webhookResp WebhookEmailResponse
	if err := json.Unmarshal(bodyBytes, &webhookResp); err != nil {
		utils.Error("解析Webhook响应失败",
			zap.Error(err),
			zap.String("response", string(bodyBytes)),
		)
		return "", fmt.Errorf("邮件服务响应格式错误")
	}

	// 6. 检查业务错误码
	if webhookResp.ErrCode != 0 {
		errMsg := "未知错误"
		if webhookResp.ErrMsg != nil {
			errMsg = fmt.Sprintf("%v", webhookResp.ErrMsg)
		}
		utils.Error("Webhook返回业务错误",
			zap.Int("err_code", webhookResp.ErrCode),
			zap.String("err_msg", errMsg),
		)
		return "", fmt.Errorf("邮件发送失败：%s", errMsg)
	}

	// 7. 提取requestId
	if webhookResp.Result != nil {
		if rid, ok := webhookResp.Result["requestId"].(string); ok {
			requestID = rid
		}
	}

	utils.Info("验证码邮件发送成功",
		zap.String("email", maskEmail(email)),
		zap.String("request_id", requestID),
		zap.Duration("elapsed", time.Since(startTime)),
	)

	return requestID, nil
}

// maskEmail 脱敏邮箱地址
func maskEmail(email string) string {
	if len(email) <= 3 {
		return "***"
	}

	// 找到@符号位置
	atIndex := -1
	for i, ch := range email {
		if ch == '@' {
			atIndex = i
			break
		}
	}

	if atIndex <= 0 {
		return "***"
	}

	// 保留首尾字符，中间用***代替
	if atIndex <= 2 {
		return email[:1] + "***" + email[atIndex:]
	}

	return email[:1] + "***" + email[atIndex-1:]
}
