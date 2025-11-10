-- 性能优化索引添加脚本
-- 修复问题7：缺少必要的数据库索引
-- 执行时间：建议在业务低峰期执行
-- 执行方式：mysql -h host -u user -p database < add_performance_indexes.sql

USE flow_codeblock_go;

-- ========================================
-- 1. access_tokens 表索引优化
-- ========================================

-- 检查索引是否存在
SELECT 
    'Checking existing indexes on access_tokens...' as message;

SHOW INDEX FROM access_tokens;

-- 添加配额检查复合索引
-- 用于优化：SELECT * FROM access_tokens WHERE is_active = 1 AND quota_type IN ('count', 'hybrid') AND remaining_quota > 0
SELECT 
    '添加配额检查复合索引...' as message;

ALTER TABLE access_tokens
ADD INDEX IF NOT EXISTS idx_quota_check (is_active, quota_type, remaining_quota)
COMMENT '配额检查复合索引 - 优化配额验证查询';

-- 添加ws_id和email复合索引
-- 用于优化：SELECT * FROM access_tokens WHERE ws_id = ? AND email = ?
SELECT 
    '添加ws_id和email复合索引...' as message;

ALTER TABLE access_tokens
ADD INDEX IF NOT EXISTS idx_ws_email (ws_id, email)
COMMENT 'ws_id和email复合索引 - 优化Token查询';

-- ========================================
-- 2. token_quota_logs 表索引优化
-- ========================================

-- 检查索引是否存在
SELECT 
    'Checking existing indexes on token_quota_logs...' as message;

SHOW INDEX FROM token_quota_logs;

-- 添加token和创建时间复合索引
-- 用于优化：SELECT * FROM token_quota_logs WHERE token = ? ORDER BY created_at DESC
SELECT 
    '添加token和创建时间复合索引...' as message;

ALTER TABLE token_quota_logs
ADD INDEX IF NOT EXISTS idx_token_created (token, created_at DESC)
COMMENT 'token查询日志复合索引 - 优化配额日志查询';

-- 添加ws_id、action和创建时间复合索引
-- 用于优化：SELECT * FROM token_quota_logs WHERE ws_id = ? AND action = ? AND created_at BETWEEN ? AND ?
SELECT 
    '添加ws_id、action和创建时间复合索引...' as message;

ALTER TABLE token_quota_logs
ADD INDEX IF NOT EXISTS idx_ws_action_time (ws_id, action, created_at DESC)
COMMENT 'ws_id和action查询复合索引 - 优化工作区统计查询';

-- 添加email和创建时间复合索引
-- 用于优化：SELECT * FROM token_quota_logs WHERE email = ? ORDER BY created_at DESC
SELECT 
    '添加email和创建时间复合索引...' as message;

ALTER TABLE token_quota_logs
ADD INDEX IF NOT EXISTS idx_email_created (email, created_at DESC)
COMMENT 'email查询日志复合索引 - 优化用户统计查询';

-- 添加action和创建时间复合索引
-- 用于优化：SELECT * FROM token_quota_logs WHERE action = 'consume' AND created_at >= ?
SELECT 
    '添加action和创建时间复合索引...' as message;

ALTER TABLE token_quota_logs
ADD INDEX IF NOT EXISTS idx_action_created (action, created_at DESC)
COMMENT 'action查询复合索引 - 优化按操作类型统计';

-- ========================================
-- 3. 验证索引
-- ========================================

SELECT 
    '========================================' as message
UNION ALL
SELECT 
    '索引添加完成！' as message
UNION ALL
SELECT 
    '========================================' as message;

-- 显示access_tokens表的所有索引
SELECT 
    'access_tokens 表索引：' as message;

SHOW INDEX FROM access_tokens;

-- 显示token_quota_logs表的所有索引
SELECT 
    'token_quota_logs 表索引：' as message;

SHOW INDEX FROM token_quota_logs;

-- ========================================
-- 4. 索引统计信息
-- ========================================

SELECT 
    '========================================' as message
UNION ALL
SELECT 
    '索引统计信息' as message
UNION ALL
SELECT 
    '========================================' as message;

-- access_tokens表统计
SELECT 
    'access_tokens' as table_name,
    COUNT(*) as index_count,
    SUM(INDEX_LENGTH) / 1024 / 1024 as index_size_mb
FROM 
    information_schema.STATISTICS
WHERE 
    TABLE_SCHEMA = 'flow_codeblock_go'
    AND TABLE_NAME = 'access_tokens'
GROUP BY 
    TABLE_NAME;

-- token_quota_logs表统计
SELECT 
    'token_quota_logs' as table_name,
    COUNT(*) as index_count,
    SUM(INDEX_LENGTH) / 1024 / 1024 as index_size_mb
FROM 
    information_schema.STATISTICS
WHERE 
    TABLE_SCHEMA = 'flow_codeblock_go'
    AND TABLE_NAME = 'token_quota_logs'
GROUP BY 
    TABLE_NAME;

-- ========================================
-- 5. 使用建议
-- ========================================

SELECT 
    '========================================' as message
UNION ALL
SELECT 
    '使用建议' as message
UNION ALL
SELECT 
    '========================================' as message
UNION ALL
SELECT 
    '1. 索引已添加，但可能需要一些时间来构建' as message
UNION ALL
SELECT 
    '2. 使用EXPLAIN查看查询是否使用了新索引' as message
UNION ALL
SELECT 
    '3. 定期运行ANALYZE TABLE更新统计信息' as message
UNION ALL
SELECT 
    '4. 监控索引使用情况，删除未使用的索引' as message
UNION ALL
SELECT 
    '========================================' as message;

-- ========================================
-- 6. 性能测试SQL示例
-- ========================================

-- 测试配额检查索引
EXPLAIN SELECT * FROM access_tokens 
WHERE is_active = 1 AND quota_type IN ('count', 'hybrid') AND remaining_quota > 0
LIMIT 10;

-- 测试Token查询索引
EXPLAIN SELECT * FROM access_tokens 
WHERE ws_id = 'test_ws' AND email = 'test@example.com';

-- 测试配额日志查询索引
EXPLAIN SELECT * FROM token_quota_logs 
WHERE token = 'flow_xxx' 
ORDER BY created_at DESC 
LIMIT 100;

-- 测试工作区统计查询索引
EXPLAIN SELECT * FROM token_quota_logs 
WHERE ws_id = 'test_ws' AND action = 'consume' 
AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- ========================================
-- 完成
-- ========================================

SELECT 
    '✅ 索引添加完成！' as message;
