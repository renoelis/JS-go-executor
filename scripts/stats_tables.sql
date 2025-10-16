-- Flow-CodeBlock Go 统计功能数据库表
-- 创建日期: 2025-10-15
-- 功能: 代码执行统计、模块使用统计、用户活跃度统计

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

USE `flow_codeblock_go`;

-- ==================== 表1: 代码执行统计表 ====================
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

-- ==================== 表2: 模块使用统计表(按天聚合) ====================
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

-- ==================== 表3: 用户活跃度统计表(按天聚合) ====================
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

-- ==================== 验证表结构 ====================
SELECT '✅ 统计表创建完成，开始验证...' AS status;

SHOW CREATE TABLE `code_execution_stats`;
SHOW CREATE TABLE `module_usage_stats`;
SHOW CREATE TABLE `user_activity_stats`;

-- 验证表是否为空
SELECT '📊 验证表初始状态...' AS status;
SELECT 
  '代码执行统计表' AS table_name,
  COUNT(*) AS record_count 
FROM `code_execution_stats`
UNION ALL
SELECT 
  '模块使用统计表' AS table_name,
  COUNT(*) AS record_count 
FROM `module_usage_stats`
UNION ALL
SELECT 
  '用户活跃度统计表' AS table_name,
  COUNT(*) AS record_count 
FROM `user_activity_stats`;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '🎉 统计功能数据库表初始化完成！' AS status;
SELECT '📝 下一步: 启动服务后统计数据将自动记录' AS next_step;

