-- 脚本管理功能相关表结构及字段扩展
-- 1. 脚本主表
CREATE TABLE IF NOT EXISTS `code_scripts` (
    `id` VARCHAR(22) PRIMARY KEY COMMENT 'Base62 UUID（22位，含校验位）',
    `token` VARCHAR(255) NOT NULL COMMENT '绑定的访问Token',
    `ws_id` VARCHAR(255) NOT NULL COMMENT '工作空间ID',
    `email` VARCHAR(255) NOT NULL COMMENT '用户邮箱',
    `description` TEXT COMMENT '脚本描述',
    `code_base64` LONGTEXT NOT NULL COMMENT 'Base64编码的代码',
    `code_hash` VARCHAR(64) COMMENT '代码SHA256哈希值（对解码后源码）',
    `code_length` INT COMMENT '代码长度（字节）',
    `version` INT DEFAULT 1 COMMENT '当前版本号',
    `ip_whitelist` JSON COMMENT '可选IP白名单（数组）',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_token` (`token`),
    KEY `idx_ws_id_email` (`ws_id`, `email`),
    UNIQUE KEY `uk_token_codehash` (`token`, `code_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='代码脚本主表';

-- 2. 脚本版本历史表
CREATE TABLE IF NOT EXISTS `code_script_versions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `script_id` VARCHAR(22) NOT NULL COMMENT '脚本ID',
    `version` INT NOT NULL COMMENT '版本号',
    `code_base64` LONGTEXT NOT NULL COMMENT 'Base64编码的代码',
    `code_hash` VARCHAR(64) COMMENT '代码SHA256哈希值（对解码后源码）',
    `code_length` INT COMMENT '代码长度（字节）',
    `description` TEXT COMMENT '版本描述',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_script_version` (`script_id`, `version`),
    KEY `idx_script_id` (`script_id`),
    CONSTRAINT `fk_script_id` FOREIGN KEY (`script_id`)
        REFERENCES `code_scripts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本版本历史表';

-- 3. 脚本执行统计表
CREATE TABLE IF NOT EXISTS `script_execution_stats` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `script_id` VARCHAR(22) NOT NULL COMMENT '脚本ID',
    `token` VARCHAR(255) NOT NULL COMMENT '绑定的Token',
    `execution_status` ENUM('success', 'failed') NOT NULL COMMENT '执行状态',
    `execution_time_ms` INT NOT NULL COMMENT '执行耗时(毫秒)',
    `execution_date` DATE NOT NULL COMMENT '执行日期',
    `execution_time` DATETIME NOT NULL COMMENT '执行时间',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_script_date` (`script_id`, `execution_date`),
    KEY `idx_token_date` (`token`, `execution_date`),
    KEY `idx_execution_date` (`execution_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='脚本执行统计表';

-- 4. access_tokens 扩展字段（MySQL 8.0 兼容写法）
-- 使用存储过程安全添加列（如果不存在）
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
DELIMITER //
CREATE PROCEDURE add_column_if_not_exists()
BEGIN
    -- 添加 max_scripts 列
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'access_tokens' 
        AND COLUMN_NAME = 'max_scripts'
    ) THEN
        ALTER TABLE `access_tokens` ADD COLUMN `max_scripts` INT DEFAULT 50 COMMENT '最大脚本数量限制';
    END IF;
    
    -- 添加 current_scripts 列
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'access_tokens' 
        AND COLUMN_NAME = 'current_scripts'
    ) THEN
        ALTER TABLE `access_tokens` ADD COLUMN `current_scripts` INT NOT NULL DEFAULT 0 COMMENT '当前脚本数量';
    END IF;
    
    -- 添加索引（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'access_tokens' 
        AND INDEX_NAME = 'idx_token_scripts'
    ) THEN
        ALTER TABLE `access_tokens` ADD KEY `idx_token_scripts` (`access_token`, `current_scripts`);
    END IF;
END //
DELIMITER ;

CALL add_column_if_not_exists();
DROP PROCEDURE IF EXISTS add_column_if_not_exists;
