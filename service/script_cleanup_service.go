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
	db            *sqlx.DB
	cfg           *config.Config
	scriptService *ScriptService
}

// NewScriptCleanupService 创建服务
func NewScriptCleanupService(db *sqlx.DB, cfg *config.Config, scriptService *ScriptService) *ScriptCleanupService {
	return &ScriptCleanupService{db: db, cfg: cfg, scriptService: scriptService}
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

	candidates, err := s.listExpiredTokenScripts(ctx, cutoff)
	if err != nil {
		return 0, err
	}
	if len(candidates) == 0 {
		return 0, nil
	}

	// 使用 BINARY 避免不同表字符集/排序规则导致的非法比对错误
	result, err := s.db.ExecContext(ctx, `
		DELETE cs FROM code_scripts cs
		INNER JOIN access_tokens at ON BINARY cs.token = BINARY at.access_token
		WHERE (
			(at.expires_at IS NOT NULL AND at.expires_at < ?)
			OR (at.is_active = 0 AND at.updated_at < ?)
		)
	`, cutoff, cutoff)
	if err != nil {
		return 0, err
	}
	affected, _ := result.RowsAffected()
	s.handlePostDelete(ctx, candidates)
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
	candidates, err := s.listOrphanScripts(ctx)
	if err != nil {
		return 0, err
	}
	if len(candidates) == 0 {
		return 0, nil
	}

	result, err := s.db.ExecContext(ctx, `
		DELETE cs FROM code_scripts cs
		LEFT JOIN access_tokens at ON BINARY cs.token = BINARY at.access_token
		WHERE at.access_token IS NULL
	`)
	if err != nil {
		return 0, err
	}
	affected, _ := result.RowsAffected()
	s.handlePostDelete(ctx, candidates)
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

type scriptTokenPair struct {
	ID    string `db:"id"`
	Token string `db:"token"`
}

func (s *ScriptCleanupService) listExpiredTokenScripts(ctx context.Context, cutoff time.Time) ([]scriptTokenPair, error) {
	pairs := []scriptTokenPair{}
	err := s.db.SelectContext(ctx, &pairs, `
		SELECT cs.id, cs.token
		FROM code_scripts cs
		INNER JOIN access_tokens at ON BINARY cs.token = BINARY at.access_token
		WHERE (
			(at.expires_at IS NOT NULL AND at.expires_at < ?)
			OR (at.is_active = 0 AND at.updated_at < ?)
		)
	`, cutoff, cutoff)
	return pairs, err
}

func (s *ScriptCleanupService) listOrphanScripts(ctx context.Context) ([]scriptTokenPair, error) {
	pairs := []scriptTokenPair{}
	err := s.db.SelectContext(ctx, &pairs, `
		SELECT cs.id, cs.token
		FROM code_scripts cs
		LEFT JOIN access_tokens at ON BINARY cs.token = BINARY at.access_token
		WHERE at.access_token IS NULL
	`)
	return pairs, err
}

func (s *ScriptCleanupService) handlePostDelete(ctx context.Context, pairs []scriptTokenPair) {
	if len(pairs) == 0 {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	tokenScripts := make(map[string][]string)
	tokenSet := make(map[string]struct{})
	for _, p := range pairs {
		if p.Token == "" {
			continue
		}
		tokenScripts[p.Token] = append(tokenScripts[p.Token], p.ID)
		tokenSet[p.Token] = struct{}{}
	}

	tokens := make([]string, 0, len(tokenSet))
	for token := range tokenSet {
		tokens = append(tokens, token)
	}

	s.rebuildCurrentScripts(ctx, tokens)

	if s.scriptService != nil && len(tokenScripts) > 0 {
		s.scriptService.ClearCachesAfterBulkDelete(ctx, tokenScripts)
	}
}

func (s *ScriptCleanupService) rebuildCurrentScripts(ctx context.Context, tokens []string) {
	if s.db == nil || len(tokens) == 0 {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	for _, token := range tokens {
		var count int
		if err := s.db.GetContext(ctx, &count, `SELECT COUNT(*) FROM code_scripts WHERE token = ?`, token); err != nil {
			utils.Warn("重算脚本配额失败",
				zap.String("token", utils.MaskToken(token)),
				zap.Error(err))
			continue
		}

		if _, err := s.db.ExecContext(ctx, `
			UPDATE access_tokens
			SET current_scripts = ?
			WHERE access_token = ?
		`, count, token); err != nil {
			utils.Warn("写回脚本配额失败",
				zap.String("token", utils.MaskToken(token)),
				zap.Error(err))
			continue
		}
	}
}
