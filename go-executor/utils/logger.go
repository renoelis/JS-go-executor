package utils

import (
	"log"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Logger *zap.Logger

// InitLogger 初始化日志系统
// env: "development" 或 "production"
func InitLogger(env string) error {
	var config zap.Config

	if env == "production" {
		// 🔥 生产环境: JSON格式，INFO级别，便于日志收集 (ELK/Loki)
		config = zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		config.EncoderConfig.TimeKey = "time"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		// 🔥 开发环境: 彩色输出，DEBUG级别，友好可读
		config = zap.NewDevelopmentConfig()
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	}

	// 输出配置
	config.OutputPaths = []string{"stdout"}
	config.ErrorOutputPaths = []string{"stderr"}

	// 添加调用位置（文件名和行号）
	config.EncoderConfig.CallerKey = "caller"
	config.EncoderConfig.EncodeCaller = zapcore.ShortCallerEncoder

	var err error
	Logger, err = config.Build(
		zap.AddCallerSkip(1), // 跳过包装函数，显示真实调用位置
	)
	if err != nil {
		return err
	}

	return nil
}

// GetLoggerWithExecutionID 创建带 execution_id 的 logger
func GetLoggerWithExecutionID(executionID string) *zap.Logger {
	if Logger == nil {
		// Fallback: 如果未初始化，使用默认 logger
		Logger, _ = zap.NewDevelopment()
	}
	return Logger.With(zap.String("execution_id", executionID))
}

// 便捷方法 (全局 logger)
func Debug(msg string, fields ...zap.Field) {
	if Logger != nil {
		Logger.Debug(msg, fields...)
	}
	// Debug 级别静默失败是可接受的（仅用于开发调试）
}

func Info(msg string, fields ...zap.Field) {
	if Logger != nil {
		Logger.Info(msg, fields...)
	} else {
		// Fallback: 如果 logger 未初始化，使用标准库 log
		// 注意：仅 Info/Warn/Error/Fatal 需要 fallback，Debug 可以静默
		log.Printf("[INFO] %s\n", msg)
	}
}

func Warn(msg string, fields ...zap.Field) {
	if Logger != nil {
		Logger.Warn(msg, fields...)
	} else {
		// Fallback: 确保警告信息一定能输出（即使 logger 未初始化）
		log.Printf("[WARN] %s\n", msg)
	}
}

func Error(msg string, fields ...zap.Field) {
	if Logger != nil {
		Logger.Error(msg, fields...)
	} else {
		// Fallback: 错误信息必须输出
		log.Printf("[ERROR] %s\n", msg)
	}
}

func Fatal(msg string, fields ...zap.Field) {
	if Logger != nil {
		Logger.Fatal(msg, fields...)
	} else {
		// Fallback: 致命错误必须输出
		log.Fatalf("[FATAL] %s\n", msg)
	}
}

// Sync 刷新日志缓冲区
func Sync() error {
	if Logger != nil {
		return Logger.Sync()
	}
	return nil
}
