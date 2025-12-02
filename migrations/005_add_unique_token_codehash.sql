-- 为 code_scripts 增加唯一索引，避免同一 Token 下重复的 code_hash
-- 如存在历史重复数据，执行前需先清理，否则索引创建会失败。

DROP PROCEDURE IF EXISTS add_unique_token_codehash;
DELIMITER //
CREATE PROCEDURE add_unique_token_codehash()
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'code_scripts'
          AND INDEX_NAME = 'uk_token_codehash'
    ) THEN
        ALTER TABLE `code_scripts` ADD UNIQUE KEY `uk_token_codehash` (`token`, `code_hash`);
    END IF;
END //
DELIMITER ;

CALL add_unique_token_codehash();
DROP PROCEDURE IF EXISTS add_unique_token_codehash;
