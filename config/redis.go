package config

import (
	"context"
	"fmt"
	"time"

	"flow-codeblock-go/utils"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

// RedisConfig Redis配置
type RedisConfig struct {
	Enabled      bool
	Host         string
	Port         int
	Password     string
	DB           int
	PoolSize     int
	MinIdleConns int
	DialTimeout  time.Duration
	ReadTimeout  time.Duration
	WriteTimeout time.Duration
	MaxRetries   int
}

// LoadRedisConfig 从环境变量加载Redis配置
func LoadRedisConfig() *RedisConfig {
	return &RedisConfig{
		Enabled:      getEnvBool("REDIS_ENABLED", true),
		Host:         getEnvString("REDIS_HOST", "localhost"),
		Port:         getEnvInt("REDIS_PORT", 6379),
		Password:     getEnvString("REDIS_PASSWORD", ""),
		DB:           getEnvInt("REDIS_DB", 0),
		PoolSize:     getEnvInt("REDIS_POOL_SIZE", 100),
		MinIdleConns: getEnvInt("REDIS_MIN_IDLE_CONNS", 10),
		DialTimeout:  time.Duration(getEnvInt("REDIS_DIAL_TIMEOUT_SEC", 5)) * time.Second,
		ReadTimeout:  time.Duration(getEnvInt("REDIS_READ_TIMEOUT_SEC", 3)) * time.Second,
		WriteTimeout: time.Duration(getEnvInt("REDIS_WRITE_TIMEOUT_SEC", 3)) * time.Second,
		MaxRetries:   getEnvInt("REDIS_MAX_RETRIES", 3),
	}
}

// InitRedis 初始化Redis连接
func InitRedis(cfg *RedisConfig) (*redis.Client, error) {
	if !cfg.Enabled {
		utils.Info("Redis未启用，跳过初始化")
		return nil, nil
	}

	client := redis.NewClient(&redis.Options{
		Addr:         fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password:     cfg.Password,
		DB:           cfg.DB,
		PoolSize:     cfg.PoolSize,
		MinIdleConns: cfg.MinIdleConns,
		DialTimeout:  cfg.DialTimeout,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
		MaxRetries:   cfg.MaxRetries,
	})

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		utils.Warn("Redis连接失败，将在无Redis模式下运行",
			zap.Error(err),
			zap.String("host", cfg.Host),
			zap.Int("port", cfg.Port),
		)
		return nil, nil
	}

	utils.Info("Redis连接成功",
		zap.String("host", cfg.Host),
		zap.Int("port", cfg.Port),
		zap.Int("db", cfg.DB),
		zap.Int("pool_size", cfg.PoolSize),
	)

	return client, nil
}

// TestRedisConnection 测试Redis连接
func TestRedisConnection(client *redis.Client) error {
	if client == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return err
	}

	return nil
}

// GetRedisStats 获取Redis连接池统计信息
func GetRedisStats(client *redis.Client) map[string]interface{} {
	if client == nil {
		return map[string]interface{}{
			"enabled": false,
		}
	}

	stats := client.PoolStats()
	return map[string]interface{}{
		"enabled":     true,
		"hits":        stats.Hits,
		"misses":      stats.Misses,
		"timeouts":    stats.Timeouts,
		"total_conns": stats.TotalConns,
		"idle_conns":  stats.IdleConns,
		"stale_conns": stats.StaleConns,
	}
}
