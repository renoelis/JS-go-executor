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

-- ==================== 插入测试数据（可选） ====================
-- 插入一个测试Token（永不过期，不限流）
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

-- 插入一个测试Token（有限流：60次/分钟，10次/秒）
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

SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 查看表结构 ====================
SHOW CREATE TABLE `access_tokens`;
SHOW CREATE TABLE `token_rate_limit_history`;

-- ==================== 查看测试数据 ====================
SELECT * FROM `access_tokens` WHERE `access_token` LIKE 'flow_test_token%';
