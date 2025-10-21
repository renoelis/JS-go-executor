package service

import (
	"context"
	"fmt"

	"flow-codeblock-go/utils"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// RedisConfigService Redis配置管理服务
type RedisConfigService struct {
	client *redis.Client
}

// NewRedisConfigService 创建Redis配置服务
func NewRedisConfigService(client *redis.Client) *RedisConfigService {
	return &RedisConfigService{
		client: client,
	}
}

// EnsureAOFEnabled 确保AOF持久化已启用
// 如果未启用，自动启用并持久化配置
func (s *RedisConfigService) EnsureAOFEnabled(ctx context.Context) error {
	utils.Info("检查Redis AOF持久化配置...")

	// 1. 检查当前AOF状态
	appendonly, err := s.client.ConfigGet(ctx, "appendonly").Result()
	if err != nil {
		return fmt.Errorf("获取Redis配置失败: %w", err)
	}

	// ConfigGet返回map[string]string
	currentValue, ok := appendonly["appendonly"]
	if !ok {
		return fmt.Errorf("Redis配置返回格式异常：未找到appendonly配置")
	}

	// 2. 如果已启用，直接返回
	if currentValue == "yes" {
		utils.Info("✅ Redis AOF持久化已启用")
		s.logAOFConfig(ctx)
		return nil
	}

	// 3. 未启用，自动启用
	utils.Warn("⚠️  Redis AOF持久化未启用，正在自动启用...",
		zap.String("current_value", currentValue))

	// 3.1 启用AOF
	if err := s.client.ConfigSet(ctx, "appendonly", "yes").Err(); err != nil {
		return fmt.Errorf("启用AOF失败: %w", err)
	}

	utils.Info("✅ Redis AOF持久化已启用")

	// 3.2 持久化配置到redis.conf（Docker环境下可能失败，这是正常的）
	if err := s.client.ConfigRewrite(ctx).Err(); err != nil {
		// 如果是"没有配置文件"的错误，只记录DEBUG日志
		if err.Error() == "ERR The server is running without a config file" {
			utils.Debug("Redis使用命令行参数启动（无配置文件），AOF已通过命令行启用",
				zap.String("note", "这是Docker环境的正常行为"))
		} else {
			utils.Warn("⚠️  无法持久化配置到redis.conf（可能是权限问题）",
				zap.Error(err),
				zap.String("impact", "Redis重启后需要重新启用AOF"),
				zap.String("solution", "建议手动在redis.conf中设置 appendonly yes"))
		}
	} else {
		utils.Info("✅ AOF配置已持久化到redis.conf")
	}

	// 4. 验证配置
	s.logAOFConfig(ctx)

	return nil
}

// logAOFConfig 记录AOF配置详情
func (s *RedisConfigService) logAOFConfig(ctx context.Context) {
	// 获取AOF相关配置
	configs := []string{
		"appendonly",
		"appendfsync",
		"auto-aof-rewrite-percentage",
		"auto-aof-rewrite-min-size",
	}

	configMap := make(map[string]string)
	for _, key := range configs {
		result, err := s.client.ConfigGet(ctx, key).Result()
		if err == nil {
			if value, ok := result[key]; ok {
				configMap[key] = value
			}
		}
	}

	utils.Info("Redis AOF配置详情",
		zap.String("appendonly", configMap["appendonly"]),
		zap.String("appendfsync", configMap["appendfsync"]),
		zap.String("auto-aof-rewrite-percentage", configMap["auto-aof-rewrite-percentage"]),
		zap.String("auto-aof-rewrite-min-size", configMap["auto-aof-rewrite-min-size"]))
}

// OptimizeAOFConfig 优化AOF配置（可选）
func (s *RedisConfigService) OptimizeAOFConfig(ctx context.Context) error {
	utils.Info("优化Redis AOF配置...")

	// 推荐配置
	configs := map[string]string{
		"appendfsync":                 "everysec", // 每秒同步（推荐，平衡性能和安全）
		"auto-aof-rewrite-percentage": "100",      // AOF文件增长100%时重写
		"auto-aof-rewrite-min-size":   "64mb",     // 最小64MB才重写
	}

	for key, value := range configs {
		// 获取当前值
		current, err := s.client.ConfigGet(ctx, key).Result()
		if err != nil {
			utils.Warn("获取配置失败", zap.String("key", key), zap.Error(err))
			continue
		}

		currentValue, ok := current[key]
		if !ok {
			continue
		}

		// 如果已经是推荐值，跳过
		if currentValue == value {
			utils.Debug("配置已是推荐值", zap.String("key", key), zap.String("value", value))
			continue
		}

		// 设置推荐值
		if err := s.client.ConfigSet(ctx, key, value).Err(); err != nil {
			utils.Warn("设置配置失败", zap.String("key", key), zap.Error(err))
			continue
		}

		utils.Info("配置已优化",
			zap.String("key", key),
			zap.String("old_value", currentValue),
			zap.String("new_value", value))
	}

	// 尝试持久化（Docker环境下可能失败，这是正常的）
	if err := s.client.ConfigRewrite(ctx).Err(); err != nil {
		// 如果是"没有配置文件"的错误，只记录DEBUG日志
		if err.Error() == "ERR The server is running without a config file" {
			utils.Debug("Redis使用命令行参数启动（无配置文件），配置已通过命令行生效",
				zap.String("note", "这是Docker环境的正常行为"))
		} else {
			utils.Warn("⚠️  无法持久化优化配置到redis.conf",
				zap.Error(err),
				zap.String("solution", "建议手动在redis.conf中设置"))
		}
	} else {
		utils.Info("✅ 优化配置已持久化到redis.conf")
	}

	return nil
}

// CheckRedisInfo 检查Redis基本信息
func (s *RedisConfigService) CheckRedisInfo(ctx context.Context) error {
	info, err := s.client.Info(ctx, "server", "persistence").Result()
	if err != nil {
		return fmt.Errorf("获取Redis信息失败: %w", err)
	}

	utils.Info("Redis服务器信息（摘要）",
		zap.String("info", info[:min(len(info), 500)])) // 只显示前500字符

	return nil
}

// min 辅助函数
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
