-- ==================== Token配额系统迁移脚本 ====================
-- 版本: v1.0.0
-- 日期: 2025-10-18
-- 说明: 增加基于次数的Token配额支持

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE `flow_codeblock_go`;

-- ==================== 第1步：修改 access_tokens 表 ====================
SELECT '📝 开始修改 access_tokens 表...' AS status;

ALTER TABLE `access_tokens`
-- 配额类型（默认time保证向后兼容）
ADD COLUMN `quota_type` ENUM('time', 'count', 'hybrid') 
  DEFAULT 'time' 
  COMMENT '配额类型: time=仅时间限制, count=仅次数限制, hybrid=时间+次数双重限制' 
  AFTER `operation_type`,

-- 总配额（NULL表示不限次数）
ADD COLUMN `total_quota` INT DEFAULT NULL 
  COMMENT '总配额次数（仅count/hybrid有效，NULL表示不限次数）' 
  AFTER `quota_type`,

-- 剩余配额（NULL表示不限次数）
ADD COLUMN `remaining_quota` INT DEFAULT NULL 
  COMMENT '剩余配额次数（冷备份，热数据在Redis）' 
  AFTER `total_quota`,

-- 最后同步时间
ADD COLUMN `quota_synced_at` TIMESTAMP NULL 
  COMMENT 'Redis配额最后同步到DB的时间' 
  AFTER `remaining_quota`,

-- 索引优化
ADD INDEX `idx_quota_type` (`quota_type`),
ADD INDEX `idx_remaining_quota` (`remaining_quota`);

SELECT '✅ access_tokens 表修改完成' AS status;

-- 验证字段添加
SELECT '🔍 验证新增字段...' AS status;
SHOW COLUMNS FROM `access_tokens` LIKE 'quota%';

-- ==================== 第2步：创建审计日志表 ====================
SELECT '📝 开始创建 token_quota_logs 表...' AS status;

CREATE TABLE IF NOT EXISTS `token_quota_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `token` VARCHAR(255) NOT NULL COMMENT 'Token（完整存储）',
  `ws_id` VARCHAR(255) NOT NULL COMMENT '工作空间ID',
  `email` VARCHAR(255) NOT NULL COMMENT '用户邮箱',
  
  -- 配额信息
  `quota_before` INT NOT NULL COMMENT '操作前剩余配额',
  `quota_after` INT NOT NULL COMMENT '操作后剩余配额',
  `quota_change` INT NOT NULL COMMENT '配额变化量（负数=消耗，正数=充值）',
  
  -- 操作信息
  `action` ENUM('consume', 'refund', 'recharge', 'init') NOT NULL 
    COMMENT '动作类型: consume=消耗, refund=退款, recharge=充值, init=初始化',
  `request_id` VARCHAR(64) DEFAULT NULL COMMENT '关联的执行请求ID',
  
  -- 执行结果（仅consume时有值）
  `execution_success` TINYINT(1) DEFAULT NULL COMMENT '执行是否成功: 1=成功, 0=失败, NULL=不适用',
  `execution_error_type` VARCHAR(100) DEFAULT NULL COMMENT '错误类型（仅失败时记录）',
  `execution_error_message` VARCHAR(500) DEFAULT NULL COMMENT '错误消息（仅失败时记录）',
  
  -- 时间字段
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',
  
  PRIMARY KEY (`id`),
  KEY `idx_token_created` (`token`, `created_at`),
  KEY `idx_ws_id_created` (`ws_id`, `created_at`),
  KEY `idx_email_created` (`email`, `created_at`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Token配额消耗审计日志';

SELECT '✅ token_quota_logs 表创建完成' AS status;

-- 验证表结构
SELECT '🔍 验证表结构...' AS status;
SHOW CREATE TABLE `token_quota_logs`;

-- ==================== 第3步：数据迁移（现有Token设置为time模式） ====================
SELECT '📝 开始数据迁移...' AS status;

-- 确保所有现有Token都是time模式（已通过DEFAULT处理）
UPDATE `access_tokens` 
SET `quota_type` = 'time' 
WHERE `quota_type` IS NULL;

SELECT '✅ 数据迁移完成' AS status;

-- 验证迁移结果
SELECT 
  COUNT(*) AS total_tokens,
  SUM(CASE WHEN quota_type = 'time' THEN 1 ELSE 0 END) AS time_mode_tokens,
  SUM(CASE WHEN quota_type = 'count' THEN 1 ELSE 0 END) AS count_mode_tokens,
  SUM(CASE WHEN quota_type = 'hybrid' THEN 1 ELSE 0 END) AS hybrid_mode_tokens
FROM `access_tokens`;

-- ==================== 第4步：创建测试数据（验证功能） ====================
SELECT '📝 插入测试数据...' AS status;

-- 测试Token 1：次数限制模式（1000次）
INSERT INTO `access_tokens` (
  `ws_id`, 
  `email`, 
  `access_token`, 
  `operation_type`,
  `quota_type`,
  `total_quota`,
  `remaining_quota`,
  `rate_limit_per_minute`, 
  `rate_limit_burst`
) VALUES (
  'test_workspace_quota_001',
  'quota_test@example.com',
  'flow_test_quota_count_mode_1000_times_12345',
  'unlimited',
  'count',
  1000,
  1000,
  60,
  10
) ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

-- 测试Token 2：时间+次数双重限制（30天 + 5000次）
INSERT INTO `access_tokens` (
  `ws_id`, 
  `email`, 
  `access_token`, 
  `expires_at`,
  `operation_type`,
  `quota_type`,
  `total_quota`,
  `remaining_quota`,
  `rate_limit_per_minute`, 
  `rate_limit_burst`
) VALUES (
  'test_workspace_quota_002',
  'hybrid_test@example.com',
  'flow_test_quota_hybrid_mode_30days_5000times',
  DATE_ADD(NOW(), INTERVAL 30 DAY),
  'add',
  'hybrid',
  5000,
  5000,
  100,
  20
) ON DUPLICATE KEY UPDATE `updated_at` = CURRENT_TIMESTAMP;

SELECT '✅ 测试数据插入完成' AS status;

-- 验证测试数据
SELECT 
  id,
  ws_id,
  email,
  access_token,
  quota_type,
  total_quota,
  remaining_quota,
  expires_at,
  created_at
FROM `access_tokens` 
WHERE `access_token` LIKE 'flow_test_quota%';

-- ==================== 第5步：清理测试数据 ====================
SELECT '🗑️  清理测试数据...' AS status;

DELETE FROM `access_tokens` 
WHERE `access_token` LIKE 'flow_test_quota%';

SELECT '✅ 测试数据清理完成' AS status;

-- ==================== 迁移完成 ====================
SET FOREIGN_KEY_CHECKS = 1;

SELECT '🎉 配额系统迁移完成！' AS status;
SELECT '📊 迁移统计：' AS info;
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  AUTO_INCREMENT,
  CREATE_TIME,
  UPDATE_TIME
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'flow_codeblock_go' 
  AND TABLE_NAME IN ('access_tokens', 'token_quota_logs');

SELECT '📝 下一步：' AS next_step;
SELECT '1. 配置Redis AOF持久化: appendonly yes' AS step1;
SELECT '2. 重启应用服务，加载新的配额功能' AS step2;
SELECT '3. 创建count模式Token进行测试' AS step3;
