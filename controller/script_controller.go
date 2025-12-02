package controller

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/middleware"
	"flow-codeblock-go/model"
	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ScriptController 脚本管理控制器
type ScriptController struct {
	scriptService      *service.ScriptService
	tokenService       *service.TokenService
	rateLimiterService *service.RateLimiterService
	quotaService       *service.QuotaService
	statsService       *service.ScriptStatsService
	executor           *service.JSExecutor
	cfg                *config.Config
}

// NewScriptController 创建控制器
func NewScriptController(
	scriptService *service.ScriptService,
	tokenService *service.TokenService,
	rateLimiterService *service.RateLimiterService,
	quotaService *service.QuotaService,
	statsService *service.ScriptStatsService,
	executor *service.JSExecutor,
	cfg *config.Config,
) *ScriptController {
	return &ScriptController{
		scriptService:      scriptService,
		tokenService:       tokenService,
		rateLimiterService: rateLimiterService,
		quotaService:       quotaService,
		statsService:       statsService,
		executor:           executor,
		cfg:                cfg,
	}
}

// parseDateRange 解析查询参数中的日期范围（默认最近7天）
func (c *ScriptController) parseDateRange(ctx *gin.Context) (time.Time, time.Time, error) {
	dateStr := ctx.Query("date")
	startStr := ctx.Query("start_date")
	endStr := ctx.Query("end_date")

	layout := "2006-01-02"
	now := utils.Now()
	defaultStart := now.AddDate(0, 0, -6)
	defaultEnd := now

	parse := func(val string) (time.Time, error) {
		return time.ParseInLocation(layout, val, time.Local)
	}

	switch {
	case dateStr != "":
		d, err := parse(dateStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("日期格式错误，需YYYY-MM-DD")
		}
		return d, d, nil
	case startStr != "" || endStr != "":
		start := defaultStart
		end := defaultEnd
		var err error
		if startStr != "" {
			start, err = parse(startStr)
			if err != nil {
				return time.Time{}, time.Time{}, fmt.Errorf("start_date 格式错误，需YYYY-MM-DD")
			}
		}
		if endStr != "" {
			end, err = parse(endStr)
			if err != nil {
				return time.Time{}, time.Time{}, fmt.Errorf("end_date 格式错误，需YYYY-MM-DD")
			}
		}
		if end.Before(start) {
			return time.Time{}, time.Time{}, fmt.Errorf("end_date 不能早于 start_date")
		}
		return start, end, nil
	default:
		return defaultStart, defaultEnd, nil
	}
}

type uploadScriptRequest struct {
	CodeBase64  string   `json:"code_base64" binding:"required"`
	Description string   `json:"description"`
	IPWhitelist []string `json:"ip_whitelist"`
}

type updateScriptRequest struct {
	CodeBase64        *string   `json:"code_base64"`
	Description       string    `json:"description"`
	RollbackToVersion *int      `json:"rollback_to_version"`
	IPWhitelist       *[]string `json:"ip_whitelist"`
}

// UploadScript 上传脚本
func (c *ScriptController) UploadScript(ctx *gin.Context) {
	tokenInfo, exists := middleware.GetTokenInfo(ctx)
	if !exists || tokenInfo == nil {
		utils.RespondError(ctx, http.StatusUnauthorized, utils.ErrorTypeAuthentication, "未找到Token信息", nil)
		return
	}

	var req uploadScriptRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, fmt.Sprintf("参数错误: %v", err), nil)
		return
	}

	script, err := c.scriptService.CreateScript(ctx.Request.Context(), tokenInfo, req.CodeBase64, req.Description, req.IPWhitelist)
	if err != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeBadRequest, err.Error(), nil)
		return
	}

	resp := map[string]interface{}{
		"script_id": script.ID,
		"version":   script.Version,
	}
	utils.RespondSuccess(ctx, resp, "脚本上传成功")
}

// UpdateScript 更新脚本或回滚
func (c *ScriptController) UpdateScript(ctx *gin.Context) {
	tokenInfo, exists := middleware.GetTokenInfo(ctx)
	if !exists || tokenInfo == nil {
		utils.RespondError(ctx, http.StatusUnauthorized, utils.ErrorTypeAuthentication, "未找到Token信息", nil)
		return
	}

	scriptID := ctx.Param("scriptId")
	var req updateScriptRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, fmt.Sprintf("参数错误: %v", err), nil)
		return
	}

	// 互斥校验
	if req.RollbackToVersion != nil && req.CodeBase64 != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, "code_base64 与 rollback_to_version 不能同时提供", nil)
		return
	}

	rollback := 0
	if req.RollbackToVersion != nil {
		rollback = *req.RollbackToVersion
	}

	result, err := c.scriptService.UpdateScript(ctx.Request.Context(), tokenInfo, scriptID, req.CodeBase64, req.Description, rollback, req.IPWhitelist)
	if err != nil {
		status := http.StatusBadRequest
		if err == service.ErrTokenExpired {
			status = http.StatusGone
		}
		utils.RespondError(ctx, status, utils.ErrorTypeBadRequest, err.Error(), nil)
		return
	}

	resp := map[string]interface{}{
		"script_id":        scriptID,
		"version":          result.NewVersion,
		"previous_version": result.PrevVersion,
		"code_changed":     result.CodeChanged,
	}
	utils.RespondSuccess(ctx, resp, "脚本更新成功")
}

// DeleteScript 删除脚本
func (c *ScriptController) DeleteScript(ctx *gin.Context) {
	tokenInfo, exists := middleware.GetTokenInfo(ctx)
	if !exists || tokenInfo == nil {
		utils.RespondError(ctx, http.StatusUnauthorized, utils.ErrorTypeAuthentication, "未找到Token信息", nil)
		return
	}

	scriptID := ctx.Param("scriptId")
	if err := c.scriptService.DeleteScript(ctx.Request.Context(), tokenInfo, scriptID); err != nil {
		status := http.StatusBadRequest
		if err == service.ErrTokenExpired {
			status = http.StatusGone
		}
		utils.RespondError(ctx, status, utils.ErrorTypeBadRequest, err.Error(), nil)
		return
	}

	utils.RespondSuccess(ctx, gin.H{"script_id": scriptID}, "脚本及其所有版本已删除")
}

// GetScript 获取脚本详情（支持历史版本）
func (c *ScriptController) GetScript(ctx *gin.Context) {
	tokenInfo, exists := middleware.GetTokenInfo(ctx)
	if !exists || tokenInfo == nil {
		utils.RespondError(ctx, http.StatusUnauthorized, utils.ErrorTypeAuthentication, "未找到Token信息", nil)
		return
	}

	scriptID := ctx.Param("scriptId")
	versionStr := ctx.Query("version")
	requestedVersion := -1
	if versionStr != "" {
		if v, err := strconv.Atoi(versionStr); err == nil {
			requestedVersion = v
		} else {
			utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, "版本号必须为整数", nil)
			return
		}
	}

	script, err := c.scriptService.GetScriptWithCache(ctx.Request.Context(), scriptID)
	if err != nil {
		utils.RespondError(ctx, http.StatusNotFound, utils.ErrorTypeNotFound, "脚本不存在", nil)
		return
	}
	if script.Token != tokenInfo.AccessToken {
		utils.RespondError(ctx, http.StatusForbidden, utils.ErrorTypeAuthorization, "无权访问该脚本", nil)
		return
	}

	targetVersion := 0
	if requestedVersion == 0 {
		targetVersion = script.Version
	} else if requestedVersion > 0 {
		targetVersion = requestedVersion
	}

	availableVersions, err := c.scriptService.ListVersionNumbers(ctx.Request.Context(), scriptID)
	if err != nil {
		availableVersions = []int{}
	}

	var versionList []model.CodeScriptVersion
	if targetVersion > 0 {
		v, err := c.scriptService.GetVersionWithCache(ctx.Request.Context(), scriptID, targetVersion)
		if err != nil {
			utils.RespondError(ctx, http.StatusNotFound, utils.ErrorTypeNotFound, err.Error(), nil)
			return
		}
		versionList = []model.CodeScriptVersion{*v}
	} else {
		versionList, err = c.scriptService.ListVersions(ctx.Request.Context(), scriptID, 0)
		if err != nil {
			utils.RespondError(ctx, http.StatusNotFound, utils.ErrorTypeNotFound, err.Error(), nil)
			return
		}
	}

	if len(versionList) == 0 {
		utils.RespondError(ctx, http.StatusNotFound, utils.ErrorTypeNotFound, "脚本版本不存在", nil)
		return
	}

	for i := range versionList {
		if versionList[i].Version == script.Version {
			versionList[i].Description = script.Description
			versionList[i].CodeBase64 = script.CodeBase64
			versionList[i].CodeLength = script.CodeLength
			versionList[i].CodeHash = script.CodeHash
		}
	}

	if len(availableVersions) == 0 {
		for _, v := range versionList {
			availableVersions = append(availableVersions, v.Version)
		}
	}

	versionDetails := make([]gin.H, 0, len(versionList))
	for _, v := range versionList {
		updatedAt := v.CreatedAt
		if v.Version == script.Version {
			updatedAt = script.UpdatedAt
		}
		versionDetails = append(versionDetails, gin.H{
			"id":           script.ID,
			"version":      v.Version,
			"description":  v.Description,
			"code_base64":  v.CodeBase64,
			"code_length":  v.CodeLength,
			"code_hash":    v.CodeHash,
			"created_at":   utils.FormatTime(v.CreatedAt),
			"updated_at":   utils.FormatTime(updatedAt),
			"ip_whitelist": script.IPWhitelist,
		})
	}

	resp := gin.H{
		"available_versions": availableVersions,
		"current_version":    script.Version,
		"data":               versionDetails,
	}

	utils.RespondSuccess(ctx, resp, "")
}

// ListScripts 列表查询
func (c *ScriptController) ListScripts(ctx *gin.Context) {
	tokenInfo, exists := middleware.GetTokenInfo(ctx)
	if !exists || tokenInfo == nil {
		utils.RespondError(ctx, http.StatusUnauthorized, utils.ErrorTypeAuthentication, "未找到Token信息", nil)
		return
	}

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(ctx.DefaultQuery("size", "20"))
	sort := ctx.DefaultQuery("sort", "updated_at")
	order := ctx.DefaultQuery("order", "desc")
	keyword := ctx.Query("keyword")

	if page <= 0 {
		page = 1
	}
	if size <= 0 {
		size = 20
	}
	if size > 100 {
		size = 100
	}

	scripts, total, err := c.scriptService.ListScripts(ctx.Request.Context(), tokenInfo.AccessToken, page, size, sort, order, keyword)
	if err != nil {
		utils.RespondError(ctx, http.StatusInternalServerError, utils.ErrorTypeInternal, err.Error(), nil)
		return
	}

	items := make([]gin.H, 0, len(scripts))
	for _, s := range scripts {
		items = append(items, gin.H{
			"id":          s.ID,
			"description": s.Description,
			"version":     s.Version,
			"code_length": s.CodeLength,
			"updated_at":  utils.FormatTime(s.UpdatedAt),
		})
	}

	maxScripts := 50
	if tokenInfo.MaxScripts != nil && *tokenInfo.MaxScripts > 0 {
		maxScripts = *tokenInfo.MaxScripts
	}

	totalPages := (total + int64(size) - 1) / int64(size)
	remaining := maxScripts - int(total)
	if remaining < 0 {
		remaining = 0
	}

	resp := gin.H{
		"scripts":      items,
		"total":        total,
		"current_page": page,
		"total_pages":  totalPages,
		"max_allowed":  maxScripts,
		"remaining":    remaining,
	}
	utils.RespondSuccess(ctx, resp, "")
}

// GetScriptStatsSummary 汇总统计（当前Token下）
func (c *ScriptController) GetScriptStatsSummary(ctx *gin.Context) {
	tokenInfo, exists := middleware.GetTokenInfo(ctx)
	if !exists || tokenInfo == nil {
		utils.RespondError(ctx, http.StatusUnauthorized, utils.ErrorTypeAuthentication, "未找到Token信息", nil)
		return
	}
	if c.statsService == nil {
		utils.RespondError(ctx, http.StatusServiceUnavailable, utils.ErrorTypeInternal, "统计服务未就绪", nil)
		return
	}

	start, end, err := c.parseDateRange(ctx)
	if err != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, err.Error(), nil)
		return
	}

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "10"))

	stats, err := c.statsService.GetOverallStats(ctx.Request.Context(), tokenInfo.AccessToken, start, end, page, size)
	if err != nil {
		utils.RespondError(ctx, http.StatusInternalServerError, utils.ErrorTypeInternal, err.Error(), nil)
		return
	}
	utils.RespondSuccess(ctx, stats, "")
}

// GetScriptExecutionStats 单脚本统计
func (c *ScriptController) GetScriptExecutionStats(ctx *gin.Context) {
	tokenInfo, exists := middleware.GetTokenInfo(ctx)
	if !exists || tokenInfo == nil {
		utils.RespondError(ctx, http.StatusUnauthorized, utils.ErrorTypeAuthentication, "未找到Token信息", nil)
		return
	}
	if c.statsService == nil {
		utils.RespondError(ctx, http.StatusServiceUnavailable, utils.ErrorTypeInternal, "统计服务未就绪", nil)
		return
	}

	scriptID := ctx.Param("scriptId")
	if err := utils.ValidateScriptID(scriptID); err != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, err.Error(), nil)
		return
	}
	start, end, err := c.parseDateRange(ctx)
	if err != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, err.Error(), nil)
		return
	}

	stats, err := c.statsService.GetScriptStats(ctx.Request.Context(), tokenInfo.AccessToken, scriptID, start, end)
	if err != nil {
		status := http.StatusInternalServerError
		if errors.Is(err, sql.ErrNoRows) {
			status = http.StatusNotFound
		} else if strings.Contains(err.Error(), "无权") {
			status = http.StatusForbidden
		}
		utils.RespondError(ctx, status, utils.ErrorTypeInternal, err.Error(), nil)
		return
	}
	utils.RespondSuccess(ctx, stats, "")
}

// ExecuteScript 执行存储脚本（无Token认证）
func (c *ScriptController) ExecuteScript(ctx *gin.Context) {
	startTime := time.Now()
	requestID := ctx.GetString("request_id")
	scriptID := ctx.Param("scriptId")

	if err := utils.ValidateScriptID(scriptID); err != nil {
		utils.RespondError(ctx, http.StatusBadRequest, utils.ErrorTypeValidation, err.Error(), nil)
		return
	}

	// POST请求体大小限制（额外防护）
	if ctx.Request.Method == http.MethodPost && ctx.Request.ContentLength > 0 {
		maxBytes := int64(c.cfg.Server.MaxRequestBodyMB) * 1024 * 1024
		if ctx.Request.ContentLength > maxBytes {
			utils.RespondError(ctx, http.StatusRequestEntityTooLarge, utils.ErrorTypeBadRequest, "请求体过大", nil)
			return
		}
	}

	script, err := c.scriptService.GetScriptWithCache(ctx.Request.Context(), scriptID)
	if err != nil {
		utils.RespondError(ctx, http.StatusNotFound, utils.ErrorTypeNotFound, "脚本不存在", nil)
		return
	}

	if len(script.ParsedIPWhitelist) == 0 {
		script.ParsedIPWhitelist = utils.ParseIPWhitelist(script.IPWhitelist)
	}
	if len(script.IPWhitelist) > 0 && len(script.ParsedIPWhitelist) == 0 {
		utils.RespondError(ctx, http.StatusForbidden, utils.ErrorTypeAuthorization, "IP白名单配置无效", nil)
		return
	}
	if len(script.ParsedIPWhitelist) > 0 && !utils.MatchIPWithParsedRules(ctx.ClientIP(), script.ParsedIPWhitelist) {
		utils.RespondError(ctx, http.StatusForbidden, utils.ErrorTypeAuthorization, "IP不在白名单", nil)
		return
	}

	tokenInfo, err := c.tokenService.GetTokenForScript(ctx.Request.Context(), script.Token)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, service.ErrTokenExpired) || errors.Is(err, service.ErrTokenDisabled) {
			status = http.StatusGone
		} else if errors.Is(err, service.ErrTokenNotFound) {
			status = http.StatusNotFound
		}
		utils.RespondError(ctx, status, utils.ErrorTypeAuthentication, err.Error(), nil)
		return
	}

	// Token级限流
	rateLimitConfig := tokenInfo.GetRateLimitConfig()
	if !rateLimitConfig.Unlimited && c.rateLimiterService != nil {
		allowed, limitInfo, err := c.rateLimiterService.CheckLimit(ctx.Request.Context(), tokenInfo.AccessToken, rateLimitConfig)
		if err == nil {
			ctx.Header("X-RateLimit-Limit", fmt.Sprintf("%d", rateLimitConfig.PerMinute))
			ctx.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", limitInfo.Remaining))
			ctx.Header("X-RateLimit-Reset", limitInfo.ResetTime.Format(time.RFC3339))
			if rateLimitConfig.Burst > 0 {
				ctx.Header("X-RateLimit-Burst-Limit", fmt.Sprintf("%d", rateLimitConfig.Burst))
			}
			if !allowed {
				utils.RespondError(ctx, http.StatusTooManyRequests, utils.ErrorTypeTokenRateLimit, limitInfo.Message, nil)
				return
			}
		}
	}

	var input map[string]interface{}
	if ctx.Request.Method == http.MethodGet {
		query := make(map[string]interface{})
		for k, v := range ctx.Request.URL.Query() {
			if len(v) == 1 {
				query[k] = v[0]
			} else {
				query[k] = v
			}
		}
		input = query
	} else {
		body := make(map[string]interface{})
		if err := ctx.ShouldBindJSON(&body); err == nil {
			input = body
		}
	}

	codeBytes, err := base64.StdEncoding.DecodeString(script.CodeBase64)
	if err != nil {
		utils.RespondError(ctx, http.StatusInternalServerError, utils.ErrorTypeInternal, "脚本代码损坏", nil)
		return
	}
	code := string(codeBytes)

	// 配额消耗（执行即扣）
	if tokenInfo.NeedsQuotaCheck() && c.quotaService != nil {
		if _, _, err := c.quotaService.ConsumeQuota(ctx.Request.Context(), tokenInfo.AccessToken, tokenInfo.WsID, tokenInfo.Email, requestID, true, nil, nil); err != nil {
			utils.RespondError(ctx, http.StatusTooManyRequests, utils.ErrorTypeRateLimit, "配额已用完，请联系管理员充值", nil)
			return
		}
	}

	execCtx := context.WithValue(ctx.Request.Context(), utils.RequestIDKey, requestID)
	executionResult, err := c.executor.Execute(execCtx, code, input)
	totalTime := time.Since(startTime).Milliseconds()

	if err != nil {
		errType := "RuntimeError"
		errMsg := err.Error()
		errStack := ""
		if execErr, ok := err.(*model.ExecutionError); ok {
			errType = execErr.Type
			errMsg = execErr.Message
			errStack = execErr.Stack
		}

		resp := model.ExecuteResponse{
			Success: false,
			Error: &model.ExecuteError{
				Type:    errType,
				Message: errMsg,
				Stack:   errStack,
			},
			Timing: &model.ExecuteTiming{
				ExecutionTime: totalTime,
				TotalTime:     totalTime,
			},
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID,
		}
		ctx.JSON(http.StatusBadRequest, resp)
		if c.statsService != nil {
			c.statsService.RecordExecution(ctx.Request.Context(), scriptID, tokenInfo.AccessToken, "failed", int(totalTime))
		}
		return
	}

	var result interface{}
	if len(executionResult.JSONData) > 0 {
		result = json.RawMessage(executionResult.JSONData)
	} else {
		result = executionResult.Result
	}
	ctx.JSON(http.StatusOK, result)

	if c.statsService != nil {
		c.statsService.RecordExecution(ctx.Request.Context(), scriptID, tokenInfo.AccessToken, "success", int(totalTime))
	}
	utils.Info("脚本执行成功",
		zap.String("request_id", requestID),
		zap.String("script_id", scriptID),
		zap.Int64("execution_time_ms", totalTime),
		zap.String("ws_id", tokenInfo.WsID),
		zap.String("email", tokenInfo.Email))
}
