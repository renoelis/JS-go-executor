-- 修复 current_scripts 可能为 NULL 导致配额失效的问题
-- 1) 将历史 NULL 数据重置为 0
-- 2) 将列改为 NOT NULL DEFAULT 0，避免再次出现空值

DROP PROCEDURE IF EXISTS fix_current_scripts_not_null;
DELIMITER //
CREATE PROCEDURE fix_current_scripts_not_null()
BEGIN
    -- 仅当列存在时执行修复
    IF EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'access_tokens'
          AND COLUMN_NAME = 'current_scripts'
    ) THEN
        -- 数据自愈：将历史空值回填为 0
        UPDATE access_tokens SET current_scripts = 0 WHERE current_scripts IS NULL;

        -- 如果列可为 NULL 或默认值不是 0，则调整约束
        IF EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'access_tokens'
              AND COLUMN_NAME = 'current_scripts'
              AND (IS_NULLABLE = 'YES' OR COLUMN_DEFAULT IS NULL OR COLUMN_DEFAULT <> '0')
        ) THEN
            ALTER TABLE `access_tokens` MODIFY `current_scripts` INT NOT NULL DEFAULT 0 COMMENT '当前脚本数量';
        END IF;
    END IF;
END //
DELIMITER ;

CALL fix_current_scripts_not_null();
DROP PROCEDURE IF EXISTS fix_current_scripts_not_null;
