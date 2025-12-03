package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"flow-codeblock-go/model"

	"github.com/jmoiron/sqlx"
)

// ScriptRepository 脚本数据访问层
type ScriptRepository struct {
	db *sqlx.DB
}

// NewScriptRepository 创建实例
func NewScriptRepository(db *sqlx.DB) *ScriptRepository {
	return &ScriptRepository{db: db}
}

// CreateScriptTx 在事务中创建脚本
func (r *ScriptRepository) CreateScriptTx(ctx context.Context, tx *sqlx.Tx, script *model.CodeScript) error {
	_, err := tx.NamedExecContext(ctx, `
		INSERT INTO code_scripts (
			id, token, ws_id, email, description,
			code_base64, code_hash, code_length, version, ip_whitelist
		) VALUES (
			:id, :token, :ws_id, :email, :description,
			:code_base64, :code_hash, :code_length, :version, :ip_whitelist
		)
	`, script)
	return err
}

// CreateVersionTx 保存脚本版本
func (r *ScriptRepository) CreateVersionTx(ctx context.Context, tx *sqlx.Tx, version *model.CodeScriptVersion) error {
	_, err := tx.NamedExecContext(ctx, `
		INSERT INTO code_script_versions (
			script_id, version, code_base64, code_hash, code_length, description
		) VALUES (
			:script_id, :version, :code_base64, :code_hash, :code_length, :description
		)
	`, version)
	return err
}

// GetScriptByID 查询脚本
func (r *ScriptRepository) GetScriptByID(ctx context.Context, scriptID string) (*model.CodeScript, error) {
	var script model.CodeScript
	err := r.db.GetContext(ctx, &script, `
		SELECT id, token, ws_id, email, description, code_base64, code_hash, code_length, version, ip_whitelist, created_at, updated_at
		FROM code_scripts WHERE id = ?
	`, scriptID)
	if err != nil {
		return nil, err
	}
	return &script, nil
}

// GetScriptByHash 按Token+代码哈希查重
func (r *ScriptRepository) GetScriptByHash(ctx context.Context, token, codeHash string) (*model.CodeScript, error) {
	var script model.CodeScript
	err := r.db.GetContext(ctx, &script, `
		SELECT id, token, ws_id, email, description, code_base64, code_hash, code_length, version, ip_whitelist, created_at, updated_at
		FROM code_scripts
		WHERE token = ? AND code_hash = ?
		LIMIT 1
	`, token, codeHash)
	if err != nil {
		return nil, err
	}
	return &script, nil
}

// GetScriptByHashTx 按Token+代码哈希查重（事务内）
func (r *ScriptRepository) GetScriptByHashTx(ctx context.Context, tx *sqlx.Tx, token, codeHash string) (*model.CodeScript, error) {
	var script model.CodeScript
	err := tx.GetContext(ctx, &script, `
		SELECT id, token, ws_id, email, description, code_base64, code_hash, code_length, version, ip_whitelist, created_at, updated_at
		FROM code_scripts
		WHERE token = ? AND code_hash = ?
		LIMIT 1
	`, token, codeHash)
	if err != nil {
		return nil, err
	}
	return &script, nil
}

// GetScriptForUpdate 锁定脚本记录
func (r *ScriptRepository) GetScriptForUpdate(ctx context.Context, tx *sqlx.Tx, scriptID string) (*model.CodeScript, error) {
	var script model.CodeScript
	err := tx.GetContext(ctx, &script, `
		SELECT id, token, ws_id, email, description, code_base64, code_hash, code_length, version, ip_whitelist, created_at, updated_at
		FROM code_scripts WHERE id = ? FOR UPDATE
	`, scriptID)
	if err != nil {
		return nil, err
	}
	return &script, nil
}

// UpdateScriptTx 更新脚本
func (r *ScriptRepository) UpdateScriptTx(ctx context.Context, tx *sqlx.Tx, script *model.CodeScript) error {
	_, err := tx.NamedExecContext(ctx, `
		UPDATE code_scripts
		SET description=:description, code_base64=:code_base64, code_hash=:code_hash,
		    code_length=:code_length, version=:version, ip_whitelist=:ip_whitelist
		WHERE id=:id
	`, script)
	return err
}

// DeleteScriptTx 删除脚本
func (r *ScriptRepository) DeleteScriptTx(ctx context.Context, tx *sqlx.Tx, scriptID string) error {
	_, err := tx.ExecContext(ctx, `DELETE FROM code_scripts WHERE id = ?`, scriptID)
	return err
}

// ListScripts 查询脚本列表（按Token）
func (r *ScriptRepository) ListScripts(ctx context.Context, token string, page, size int, sort, order, keyword string) ([]model.CodeScript, int64, error) {
	offset := (page - 1) * size
	sortField := map[string]string{
		"created_at":  "created_at",
		"updated_at":  "updated_at",
		"version":     "version",
		"code_length": "code_length",
	}[strings.ToLower(sort)]
	if sortField == "" {
		sortField = "updated_at"
	}
	orderVal := "DESC"
	if strings.ToLower(order) == "asc" {
		orderVal = "ASC"
	}

	keywordLike := "%"
	if keyword != "" {
		keywordLike = fmt.Sprintf("%%%s%%", keyword)
	}

	var total int64
	if err := r.db.GetContext(ctx, &total, `
		SELECT COUNT(*) FROM code_scripts WHERE token = ? AND (description LIKE ? OR id LIKE ?)
	`, token, keywordLike, keywordLike); err != nil {
		return nil, 0, err
	}

	scripts := make([]model.CodeScript, 0)
	query := fmt.Sprintf(`
		SELECT id, token, ws_id, email, description, version, code_length, updated_at, created_at
		FROM code_scripts
		WHERE token = ? AND (description LIKE ? OR id LIKE ?)
		ORDER BY %s %s
		LIMIT ? OFFSET ?
	`, sortField, orderVal)

	if err := r.db.SelectContext(ctx, &scripts, query, token, keywordLike, keywordLike, size, offset); err != nil {
		return nil, 0, err
	}

	return scripts, total, nil
}

// GetVersion 获取指定版本
func (r *ScriptRepository) GetVersion(ctx context.Context, scriptID string, version int) (*model.CodeScriptVersion, error) {
	var v model.CodeScriptVersion
	err := r.db.GetContext(ctx, &v, `
		SELECT id, script_id, version, code_base64, code_hash, code_length, description, created_at
		FROM code_script_versions
		WHERE script_id = ? AND version = ?
	`, scriptID, version)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

// ListVersionNumbers 返回脚本的版本号列表（升序）
func (r *ScriptRepository) ListVersionNumbers(ctx context.Context, scriptID string) ([]int, error) {
	versions := make([]int, 0)
	if err := r.db.SelectContext(ctx, &versions, `
		SELECT version FROM code_script_versions WHERE script_id = ? ORDER BY version ASC
	`, scriptID); err != nil {
		return nil, err
	}
	return versions, nil
}

// ListVersions 返回脚本的版本详情列表（默认升序）
func (r *ScriptRepository) ListVersions(ctx context.Context, scriptID string, targetVersion int) ([]model.CodeScriptVersion, error) {
	versions := make([]model.CodeScriptVersion, 0)
	query := `
		SELECT id, script_id, version, code_base64, code_hash, code_length, description, created_at
		FROM code_script_versions
		WHERE script_id = ?
	`
	args := []interface{}{scriptID}
	if targetVersion > 0 {
		query += " AND version = ?"
		args = append(args, targetVersion)
	}
	query += " ORDER BY version ASC"

	if err := r.db.SelectContext(ctx, &versions, query, args...); err != nil {
		return nil, err
	}
	return versions, nil
}

// TrimOldVersions 删除超出保留数量的旧版本
func (r *ScriptRepository) TrimOldVersionsTx(ctx context.Context, tx *sqlx.Tx, scriptID string, keep int) error {
	if keep <= 0 {
		return nil
	}

	var maxVersion sql.NullInt64
	if err := tx.GetContext(ctx, &maxVersion, `
		SELECT MAX(version) FROM code_script_versions WHERE script_id = ?
	`, scriptID); err != nil {
		return err
	}
	if !maxVersion.Valid {
		return nil
	}

	cutoff := int(maxVersion.Int64) - keep + 1
	if cutoff <= 1 {
		return nil
	}

	_, err := tx.ExecContext(ctx, `
		DELETE FROM code_script_versions
		WHERE script_id = ? AND version < ?
	`, scriptID, cutoff)
	return err
}
