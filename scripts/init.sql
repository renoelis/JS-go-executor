-- Flow-CodeBlock Go 数据库初始化脚本
-- 设置字符集
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `flow_codeblock_go` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `flow_codeblock_go`;

-- ==================== 访问令牌表 ====================
CREATE TABLE IF NOT EXISTS `access_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `ws_id` VARCHAR(255) NOT NULL COMMENT '工作空间ID',
  `email` VARCHAR(255) NOT NULL COMMENT '用户邮箱',
  `access_token` VARCHAR(255) NOT NULL COMMENT '访问令牌',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `expires_at` TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间',
  `operation_type` ENUM('add','set','unlimited') NOT NULL COMMENT '操作类型：add=增加天数，set=设置到具体日期，unlimited=永不过期',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否激活：1=激活，0=禁用',
  `rate_limit_per_minute` INT DEFAULT NULL COMMENT '每分钟请求限制数，NULL表示不限制',
  `rate_limit_burst` INT DEFAULT NULL COMMENT '每秒请求限制数（突发限制），NULL表示不限制',
  `rate_limit_window_seconds` INT DEFAULT 60 COMMENT '限流时间窗口(秒)，默认60秒',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_access_token` (`access_token`),
  KEY `idx_ws_id` (`ws_id`),
  KEY `idx_email` (`email`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_rate_limit` (`rate_limit_per_minute`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='访问令牌表';

-- ==================== 限流历史记录表（冷数据层） ====================
CREATE TABLE IF NOT EXISTS `token_rate_limit_history` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `token_key` VARCHAR(255) NOT NULL COMMENT 'Token键（格式：前缀_token）',
  `request_count` INT NOT NULL COMMENT '请求次数',
  `time_window` INT NOT NULL COMMENT '时间窗口(秒)',
  `record_date` DATE NOT NULL COMMENT '记录日期',
  `record_hour` TINYINT NOT NULL COMMENT '记录小时(0-23)',
  `first_request_at` TIMESTAMP NOT NULL COMMENT '首次请求时间',
  `last_request_at` TIMESTAMP NOT NULL COMMENT '最后请求时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_token_date_hour` (`token_key`, `record_date`, `record_hour`),
  KEY `idx_token_key` (`token_key`),
  KEY `idx_record_date` (`record_date`),
  KEY `idx_record_hour` (`record_hour`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token限流历史记录表(冷数据层)';

-- ==================== 查看表结构（验证创建成功） ====================
SELECT '✅ 表结构创建完成，开始验证...' AS status;
SHOW CREATE TABLE `access_tokens`;
SHOW CREATE TABLE `token_rate_limit_history`;

-- ==================== 插入测试数据（用于验证数据库连接和表结构） ====================
SELECT '📝 开始插入测试数据...' AS status;

-- 插入测试Token 1：永不过期，不限流
INSERT INTO `access_tokens` (
  `ws_id`, 
  `email`, 
  `access_token`, 
  `operation_type`, 
  `rate_limit_per_minute`, 
  `rate_limit_burst`
) VALUES (
  'test_workspace_001',
  'test@example.com',
  'flow_test_token_unlimited_access_12345678',
  'unlimited',
  NULL,
  NULL
) ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 插入测试Token 2：有限流（60次/分钟，10次/秒）
INSERT INTO `access_tokens` (
  `ws_id`, 
  `email`, 
  `access_token`, 
  `expires_at`,
  `operation_type`, 
  `rate_limit_per_minute`, 
  `rate_limit_burst`,
  `rate_limit_window_seconds`
) VALUES (
  'test_workspace_002',
  'limited@example.com',
  'flow_test_token_limited_access_87654321',
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  'add',
  60,
  10,
  60
) ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- ==================== 验证测试数据插入成功 ====================
SELECT '🔍 验证测试数据插入...' AS status;
SELECT 
  id,
  ws_id,
  email,
  access_token,
  operation_type,
  rate_limit_per_minute,
  rate_limit_burst,
  expires_at,
  created_at
FROM `access_tokens` 
WHERE `access_token` LIKE 'flow_test_token%';

-- ==================== 清理测试数据 ====================
SELECT '🗑️  开始清理测试数据...' AS status;

-- 删除测试Token
DELETE FROM `access_tokens` 
WHERE `access_token` LIKE 'flow_test_token%';

-- 验证测试数据已删除
SELECT '✅ 测试数据清理完成，验证删除结果...' AS status;
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ 测试数据已成功清理，数据库初始化完成！'
    ELSE '⚠️  警告：仍有测试数据残留'
  END AS cleanup_status,
  COUNT(*) AS remaining_test_tokens
FROM `access_tokens` 
WHERE `access_token` LIKE 'flow_test_token%';

-- ==================== 重置 AUTO_INCREMENT ====================
SELECT '🔄 重置 AUTO_INCREMENT 计数器...' AS status;

-- 重置 access_tokens 表的 AUTO_INCREMENT 为 1
ALTER TABLE `access_tokens` AUTO_INCREMENT = 1;

-- 重置 token_rate_limit_history 表的 AUTO_INCREMENT 为 1
ALTER TABLE `token_rate_limit_history` AUTO_INCREMENT = 1;

-- 验证 AUTO_INCREMENT 重置结果
SELECT '✅ AUTO_INCREMENT 重置完成，当前值：' AS status;
SELECT 
  TABLE_NAME,
  AUTO_INCREMENT AS current_value
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'flow_codeblock_go' 
  AND TABLE_NAME IN ('access_tokens', 'token_rate_limit_history');

-- ==================== 最终验证 ====================
-- 显示当前所有Token（应该为空）
SELECT '📊 当前数据库中的Token数量：' AS status;
SELECT COUNT(*) AS total_tokens FROM `access_tokens`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 初始化完成提示 ====================
SELECT '🎉 数据库初始化完成！' AS status;
SELECT '📝 下一步：使用管理员API创建正式Token' AS next_step;
SELECT 'POST /flow/tokens -H "Authorization: Bearer YOUR_ADMIN_TOKEN"' AS api_endpoint;
