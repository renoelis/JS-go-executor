package controller

import (
	"net/http"
	"strconv"

	"flow-codeblock-go/model"
	"flow-codeblock-go/service"
	"flow-codeblock-go/utils"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// StatsController 统计控制器
type StatsController struct {
	statsService *service.StatsService
}

// NewStatsController 创建统计控制器
func NewStatsController(statsService *service.StatsService) *StatsController {
	return &StatsController{
		statsService: statsService,
	}
}

// GetModuleStats 获取模块使用统计
// GET /flow/stats/modules?date=2025-10-15
// GET /flow/stats/modules?start_date=2025-10-01&end_date=2025-10-15
func (c *StatsController) GetModuleStats(ctx *gin.Context) {
	requestID := ctx.GetString("request_id")

	params := &model.StatsQueryParams{
		Date:      ctx.Query("date"),
		StartDate: ctx.Query("start_date"),
		EndDate:   ctx.Query("end_date"),
		Module:    ctx.Query("module"),
		SortBy:    ctx.DefaultQuery("sort_by", "usage_count"),
		Order:     ctx.DefaultQuery("order", "desc"),
	}

	utils.Info("查询模块统计",
		zap.String("request_id", requestID),
		zap.String("date", params.Date),
		zap.String("start_date", params.StartDate),
		zap.String("end_date", params.EndDate))

	result, err := c.statsService.GetModuleStats(ctx.Request.Context(), params)
	if err != nil {
		utils.Error("获取模块统计失败",
			zap.String("request_id", requestID),
			zap.Error(err))
		ctx.JSON(http.StatusBadRequest, model.StatsErrorResponse{
			Success:   false,
			Error:     "StatisticsError",
			Message:   err.Error(),
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID,
		})
		return
	}

	ctx.JSON(http.StatusOK, model.StatsAPIResponse{
		Success:   true,
		Data:      result,
		Timestamp: utils.FormatTime(utils.Now()),
		RequestID: requestID,
	})
}

// GetUserActivityStats 获取用户活跃度统计
// GET /flow/stats/users?date=2025-10-15&page=1&page_size=20
// GET /flow/stats/users?start_date=2025-10-01&end_date=2025-10-15&page=1&page_size=50
func (c *StatsController) GetUserActivityStats(ctx *gin.Context) {
	requestID := ctx.GetString("request_id")

	page, _ := strconv.Atoi(ctx.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(ctx.DefaultQuery("page_size", "20"))
	minCalls, _ := strconv.Atoi(ctx.DefaultQuery("min_calls", "0"))

	params := &model.StatsQueryParams{
		Date:      ctx.Query("date"),
		StartDate: ctx.Query("start_date"),
		EndDate:   ctx.Query("end_date"),
		Page:      page,
		PageSize:  pageSize,
		SortBy:    ctx.DefaultQuery("sort_by", "total_calls"),
		Order:     ctx.DefaultQuery("order", "desc"),
		WsID:      ctx.Query("ws_id"),
		MinCalls:  minCalls,
	}

	utils.Info("查询用户活跃度统计",
		zap.String("request_id", requestID),
		zap.String("date", params.Date),
		zap.String("start_date", params.StartDate),
		zap.String("end_date", params.EndDate),
		zap.Int("page", params.Page),
		zap.Int("page_size", params.PageSize))

	result, err := c.statsService.GetUserActivityStats(ctx.Request.Context(), params)
	if err != nil {
		utils.Error("获取用户活跃度统计失败",
			zap.String("request_id", requestID),
			zap.Error(err))
		ctx.JSON(http.StatusBadRequest, model.StatsErrorResponse{
			Success:   false,
			Error:     "StatisticsError",
			Message:   err.Error(),
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID,
		})
		return
	}

	ctx.JSON(http.StatusOK, model.StatsAPIResponse{
		Success:   true,
		Data:      result,
		Timestamp: utils.FormatTime(utils.Now()),
		RequestID: requestID,
	})
}

// GetModuleDetailStats 获取特定模块的详细统计
// GET /flow/stats/modules/:module_name?start_date=2025-10-01&end_date=2025-10-15
func (c *StatsController) GetModuleDetailStats(ctx *gin.Context) {
	requestID := ctx.GetString("request_id")
	moduleName := ctx.Param("module_name")

	if moduleName == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{
			"success":    false,
			"error":      "ValidationError",
			"message":    "模块名称不能为空",
			"timestamp":  utils.FormatTime(utils.Now()),
			"request_id": requestID,
		})
		return
	}

	params := &model.StatsQueryParams{
		Date:      ctx.Query("date"),
		StartDate: ctx.Query("start_date"),
		EndDate:   ctx.Query("end_date"),
	}

	utils.Info("查询模块详细统计",
		zap.String("request_id", requestID),
		zap.String("module_name", moduleName),
		zap.String("date", params.Date),
		zap.String("start_date", params.StartDate),
		zap.String("end_date", params.EndDate))

	result, err := c.statsService.GetModuleDetailStats(ctx.Request.Context(), moduleName, params)
	if err != nil {
		utils.Error("获取模块详细统计失败",
			zap.String("request_id", requestID),
			zap.String("module_name", moduleName),
			zap.Error(err))
		ctx.JSON(http.StatusBadRequest, model.StatsErrorResponse{
			Success:   false,
			Error:     "StatisticsError",
			Message:   err.Error(),
			Timestamp: utils.FormatTime(utils.Now()),
			RequestID: requestID,
		})
		return
	}

	ctx.JSON(http.StatusOK, model.StatsAPIResponse{
		Success:   true,
		Data:      result,
		Timestamp: utils.FormatTime(utils.Now()),
		RequestID: requestID,
	})
}
