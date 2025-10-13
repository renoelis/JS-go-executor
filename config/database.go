package config

import (
	"context"
	"fmt"
	"time"

	"flow-codeblock-go/utils"

	"github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// DatabaseConfig 数据库配置
type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	Database        string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// LoadDatabaseConfig 从环境变量加载数据库配置
func LoadDatabaseConfig() *DatabaseConfig {
	return &DatabaseConfig{
		Host:            getEnvString("DB_HOST", "localhost"),
		Port:            getEnvInt("DB_PORT", 3306),
		User:            getEnvString("DB_USER", "flow_user"),
		Password:        getEnvString("DB_PASSWORD", "flow_password"),
		Database:        getEnvString("DB_NAME", "flow_codeblock_go"),
		MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 100),
		MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 20),
		ConnMaxLifetime: time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME_MIN", 60)) * time.Minute,
		ConnMaxIdleTime: time.Duration(getEnvInt("DB_CONN_MAX_IDLE_TIME_MIN", 10)) * time.Minute,
	}
}

// InitDatabase 初始化数据库连接
func InitDatabase(cfg *DatabaseConfig) (*sqlx.DB, error) {
	// 🔥 使用 mysql.Config 构建 DSN（类型安全、更清晰）
	// 优势：
	//   1. 结构化配置，避免手写 DSN 字符串
	//   2. 自动处理特殊字符（包括密码中的 @/:? 等）
	//   3. 类型安全，减少拼写错误
	//   4. 更易维护和阅读
	mysqlCfg := mysql.NewConfig()
	mysqlCfg.User = cfg.User
	mysqlCfg.Passwd = cfg.Password
	mysqlCfg.Net = "tcp"
	mysqlCfg.Addr = fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	mysqlCfg.DBName = cfg.Database
	mysqlCfg.ParseTime = true
	mysqlCfg.Params = map[string]string{
		"charset": "utf8mb4",
	}

	// 设置时区为上海（东八区）
	loc, err := time.LoadLocation("Asia/Shanghai")
	if err != nil {
		// 如果加载失败，使用 FixedZone（兜底方案）
		loc = time.FixedZone("CST", 8*3600)
	}
	mysqlCfg.Loc = loc

	dsn := mysqlCfg.FormatDSN()

	// 连接数据库
	db, err := sqlx.Connect("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("数据库连接失败: %w", err)
	}

	// 🔥 时区已在 DSN 中设置（通过 mysqlCfg.Loc），无需再执行 SET time_zone
	// 优势：减少一次数据库往返，连接更快

	// 配置连接池
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	// 测试连接
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("数据库连接测试失败: %w", err)
	}

	utils.Info("数据库连接成功",
		zap.String("host", cfg.Host),
		zap.Int("port", cfg.Port),
		zap.String("database", cfg.Database),
		zap.Int("max_open_conns", cfg.MaxOpenConns),
		zap.Int("max_idle_conns", cfg.MaxIdleConns),
	)

	return db, nil
}

// TestConnection 测试数据库连接
func TestConnection(db *sqlx.DB) error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("数据库连接测试失败: %w", err)
	}

	return nil
}

// GetDatabaseStats 获取数据库连接池统计信息
func GetDatabaseStats(db *sqlx.DB) map[string]interface{} {
	stats := db.Stats()
	return map[string]interface{}{
		"max_open_connections": stats.MaxOpenConnections,
		"open_connections":     stats.OpenConnections,
		"in_use":               stats.InUse,
		"idle":                 stats.Idle,
		"wait_count":           stats.WaitCount,
		"wait_duration":        stats.WaitDuration.String(),
		"max_idle_closed":      stats.MaxIdleClosed,
		"max_lifetime_closed":  stats.MaxLifetimeClosed,
	}
}
