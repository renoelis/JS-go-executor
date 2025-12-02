package service

import (
	"context"
	"time"

	"flow-codeblock-go/config"
	"flow-codeblock-go/utils"

	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"
)

// ScriptCleanupService 脚本清理服务
type ScriptCleanupService struct {
	db  *sqlx.DB
	cfg *config.Config
}

// NewScriptCleanupService 创建服务
func NewScriptCleanupService(db *sqlx.DB, cfg *config.Config) *ScriptCleanupService {
	return &ScriptCleanupService{db: db, cfg: cfg}
}

// CleanupExpiredTokenScripts 清理过期/禁用Token的脚本
func (s *ScriptCleanupService) CleanupExpiredTokenScripts(ctx context.Context) (int64, error) {
	if s == nil || s.db == nil {
		return 0, nil
	}
	retention := s.cfg.Script.TokenExpiredScriptRetentionDays
	if retention <= 0 {
		retention = 180
	}
	cutoff := time.Now().AddDate(0, 0, -retention)

	result, err := s.db.ExecContext(ctx, `
		DELETE cs FROM code_scripts cs
		INNER JOIN access_tokens at ON cs.token = at.access_token
		WHERE (
			(at.expires_at IS NOT NULL AND at.expires_at < ?)
			OR at.is_active = 0
		)
	`, cutoff)
	if err != nil {
		return 0, err
	}
	affected, _ := result.RowsAffected()
	if affected > 0 {
		utils.Info("过期Token脚本清理完成",
			zap.Int64("deleted_scripts", affected),
			zap.Time("cutoff_time", cutoff))
	}
	return affected, nil
}

// CleanupOrphanedScripts 清理孤儿脚本
func (s *ScriptCleanupService) CleanupOrphanedScripts(ctx context.Context) (int64, error) {
	if s == nil || s.db == nil {
		return 0, nil
	}
	result, err := s.db.ExecContext(ctx, `
		DELETE cs FROM code_scripts cs
		LEFT JOIN access_tokens at ON cs.token = at.access_token
		WHERE at.access_token IS NULL
	`)
	if err != nil {
		return 0, err
	}
	affected, _ := result.RowsAffected()
	if affected > 0 {
		utils.Info("孤儿脚本清理完成",
			zap.Int64("deleted_scripts", affected))
	}
	return affected, nil
}

// RunFullCleanup 执行完整清理
func (s *ScriptCleanupService) RunFullCleanup(ctx context.Context) error {
	if _, err := s.CleanupExpiredTokenScripts(ctx); err != nil {
		return err
	}
	if _, err := s.CleanupOrphanedScripts(ctx); err != nil {
		return err
	}
	return nil
}
