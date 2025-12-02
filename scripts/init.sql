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
  `max_scripts` INT DEFAULT 50 COMMENT '最大脚本数量限制',
  `current_scripts` INT NOT NULL DEFAULT 0 COMMENT '当前脚本数量',
  -- 🔥 配额相关字段
  `quota_type` ENUM('time', 'count', 'hybrid') DEFAULT 'time' COMMENT '配额类型: time=仅时间限制, count=仅次数限制, hybrid=时间+次数双重限制',
  `total_quota` INT DEFAULT NULL COMMENT '总配额次数（仅count/hybrid有效，NULL表示不限次数）',
  `remaining_quota` INT DEFAULT NULL COMMENT '剩余配额次数（冷备份，热数据在Redis）',
  `quota_synced_at` TIMESTAMP NULL COMMENT 'Redis配额最后同步到DB的时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_access_token` (`access_token`),
  KEY `idx_ws_id` (`ws_id`),
  KEY `idx_email` (`email`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_rate_limit` (`rate_limit_per_minute`),
  KEY `idx_quota_type` (`quota_type`),
  KEY `idx_remaining_quota` (`remaining_quota`),
  KEY `idx_token_scripts` (`access_token`, `current_scripts`),
  -- 🔥 性能优化复合索引（代码审查修复 - 问题7）
  KEY `idx_quota_check` (`is_active`, `quota_type`, `remaining_quota`) COMMENT '配额检查复合索引',
  KEY `idx_ws_email` (`ws_id`, `email`) COMMENT 'ws_id和email复合索引'
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

-- ==================== 脚本管理相关表 ====================
-- 脚本主表
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码脚本主表';

-- 脚本版本历史表
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='脚本版本历史表';

-- 脚本执行统计表
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='脚本执行统计表';

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

-- ==================== 表3: 代码执行统计表 ====================
-- 用途: 记录每次代码执行的详细信息,包括使用的模块、执行状态等
CREATE TABLE IF NOT EXISTS `code_execution_stats` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `execution_id` VARCHAR(64) NOT NULL COMMENT '执行ID(request_id)',
  `token` VARCHAR(255) NOT NULL COMMENT '访问Token',
  `ws_id` VARCHAR(255) NOT NULL COMMENT '工作空间ID',
  `email` VARCHAR(255) NOT NULL COMMENT '用户邮箱',
  
  -- 模块使用统计
  `has_require` TINYINT(1) DEFAULT 0 COMMENT '是否使用require: 1=是, 0=否(基本功能)',
  `modules_used` JSON DEFAULT NULL COMMENT '使用的模块列表: ["axios","lodash"]',
  `module_count` INT DEFAULT 0 COMMENT '使用的模块数量',
  
  -- 执行信息
  `execution_status` ENUM('success','failed') NOT NULL COMMENT '执行状态',
  `execution_time_ms` INT DEFAULT NULL COMMENT '执行耗时(毫秒)',
  `code_length` INT DEFAULT NULL COMMENT '代码长度(字节)',
  `is_async` TINYINT(1) DEFAULT 0 COMMENT '是否异步代码: 1=是, 0=否',
  
  -- 时间字段
  `execution_date` DATE NOT NULL COMMENT '执行日期(用于按天统计)',
  `execution_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '执行时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_execution_id` (`execution_id`),
  KEY `idx_token_date` (`token`, `execution_date`),
  KEY `idx_ws_id_date` (`ws_id`, `execution_date`),
  KEY `idx_email_date` (`email`, `execution_date`),
  KEY `idx_execution_date` (`execution_date`),
  KEY `idx_has_require` (`has_require`),
  KEY `idx_execution_status` (`execution_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='代码执行统计表';

-- ==================== 表4: 模块使用统计表(按天聚合) ====================
-- 用途: 按天统计各模块的使用情况,用于生成模块使用报告
CREATE TABLE IF NOT EXISTS `module_usage_stats` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `module_name` VARCHAR(100) NOT NULL COMMENT '模块名称(basic_feature表示基本功能)',
  
  -- 使用次数统计
  `usage_count` INT DEFAULT 0 COMMENT '使用次数',
  `unique_tokens` INT DEFAULT 0 COMMENT '使用的唯一Token数',
  `unique_users` INT DEFAULT 0 COMMENT '使用的唯一用户数(ws_id+email)',
  
  -- 成功/失败统计
  `success_count` INT DEFAULT 0 COMMENT '成功次数',
  `failed_count` INT DEFAULT 0 COMMENT '失败次数',
  
  -- 时间字段
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date_module` (`stat_date`, `module_name`),
  KEY `idx_stat_date` (`stat_date`),
  KEY `idx_module_name` (`module_name`),
  KEY `idx_usage_count` (`usage_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='模块使用统计表(按天聚合)';

-- ==================== 表5: Token配额消耗审计日志表 ====================
-- 用途: 记录每次配额消耗的详细信息，用于审计和查询
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
  KEY `idx_created_at` (`created_at`),
  -- 🔥 性能优化复合索引（代码审查修复 - 问题7）
  KEY `idx_ws_action_time` (`ws_id`, `action`, `created_at` DESC) COMMENT '工作区和操作类型复合索引',
  KEY `idx_email_action_time` (`email`, `action`, `created_at` DESC) COMMENT '用户和操作类型复合索引',
  KEY `idx_action_created` (`action`, `created_at` DESC) COMMENT '操作类型和时间复合索引'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Token配额消耗审计日志';

-- ==================== 表6: 用户活跃度统计表(按天聚合) ====================
-- 用途: 按天统计每个用户的活跃情况,用于生成用户活跃度报告
CREATE TABLE IF NOT EXISTS `user_activity_stats` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `stat_date` DATE NOT NULL COMMENT '统计日期',
  `token` VARCHAR(255) NOT NULL COMMENT '访问Token',
  `ws_id` VARCHAR(255) NOT NULL COMMENT '工作空间ID',
  `email` VARCHAR(255) NOT NULL COMMENT '用户邮箱',
  
  -- 调用统计
  `total_calls` INT DEFAULT 0 COMMENT '总调用次数',
  `success_calls` INT DEFAULT 0 COMMENT '成功调用次数',
  `failed_calls` INT DEFAULT 0 COMMENT '失败调用次数',
  
  -- 模块使用统计
  `require_calls` INT DEFAULT 0 COMMENT '使用require的次数',
  `basic_calls` INT DEFAULT 0 COMMENT '基本功能调用次数',
  
  -- 性能统计
  `avg_execution_time_ms` INT DEFAULT NULL COMMENT '平均执行时间(毫秒)',
  `total_execution_time_ms` BIGINT DEFAULT 0 COMMENT '总执行时间(毫秒)',
  
  -- 时间字段
  `first_call_at` TIMESTAMP NULL COMMENT '当天首次调用时间',
  `last_call_at` TIMESTAMP NULL COMMENT '当天最后调用时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date_token` (`stat_date`, `token`),
  KEY `idx_stat_date` (`stat_date`),
  KEY `idx_token` (`token`),
  KEY `idx_ws_id_date` (`ws_id`, `stat_date`),
  KEY `idx_email_date` (`email`, `stat_date`),
  KEY `idx_total_calls` (`total_calls`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='用户活跃度统计表(按天聚合)';

-- ==================== 验证所有表结构 ====================
SELECT '✅ 统计表创建完成，开始验证...' AS status;
SHOW CREATE TABLE `code_execution_stats`;
SHOW CREATE TABLE `module_usage_stats`;
SHOW CREATE TABLE `user_activity_stats`;

SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 初始化完成提示 ====================
SELECT '🎉 数据库初始化完成！' AS status;
SELECT '📝 下一步：' AS next_step;
SELECT '1. 配置Redis AOF持久化: appendonly yes' AS step1;
SELECT '2. 使用管理员API创建Token' AS step2;
SELECT 'POST /flow/tokens -H "Authorization: Bearer YOUR_ADMIN_TOKEN"' AS api_endpoint;
SELECT '3. 支持配额类型: time(时间), count(次数), hybrid(时间+次数)' AS quota_types;

-- ==================== 性能优化索引说明 ====================
-- 代码审查修复 - 问题7: 添加复合索引优化查询性能
-- 
-- access_tokens 表：
--   - idx_quota_check: 优化配额检查查询 (is_active, quota_type, remaining_quota)
--   - idx_ws_email: 优化Token查询 (ws_id, email)
-- 
-- token_quota_logs 表：
--   - idx_ws_action_time: 优化工作区统计查询 (ws_id, action, created_at)
--   - idx_email_action_time: 优化用户统计查询 (email, action, created_at)
--   - idx_action_created: 优化按操作类型统计 (action, created_at)
-- 
-- 使用示例：
--   EXPLAIN SELECT * FROM access_tokens WHERE is_active = 1 AND quota_type = 'count' AND remaining_quota > 0;
--   EXPLAIN SELECT * FROM token_quota_logs WHERE ws_id = 'xxx' AND action = 'consume' AND created_at >= '2025-10-01';
-- 
-- 参考文档：docs/CODE_REVIEW_FIXES.md
