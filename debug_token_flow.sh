#!/bin/bash

# Token获取流程调试脚本

API_URL="http://localhost:3002"
ADMIN_TOKEN="9560D6C9-264A-45E4-B8BF-BF4957860484"

echo "=========================================="
echo "Token获取流程调试"
echo "=========================================="
echo ""

# 1. 检查数据库中的token值
echo "1️⃣ 检查数据库中code_execution_stats表的token字段:"
echo "-----------------------------"
docker exec flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go \
  -e "SELECT 
        execution_id, 
        LEFT(token, 20) as token_prefix,
        LENGTH(token) as token_length,
        ws_id, 
        email,
        has_require
      FROM code_execution_stats 
      WHERE execution_date = CURDATE() 
      ORDER BY execution_time DESC 
      LIMIT 5;"
echo ""
echo ""

# 2. 检查user_activity_stats表的token字段
echo "2️⃣ 检查数据库中user_activity_stats表的token字段:"
echo "-----------------------------"
docker exec flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go \
  -e "SELECT 
        LEFT(token, 20) as token_prefix,
        LENGTH(token) as token_length,
        ws_id,
        email,
        total_calls,
        require_calls,
        basic_calls
      FROM user_activity_stats 
      WHERE stat_date = CURDATE();"
echo ""
echo ""

# 3. 检查access_tokens表中的token
echo "3️⃣ 检查access_tokens表中的token:"
echo "-----------------------------"
docker exec flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go \
  -e "SELECT 
        id,
        ws_id,
        email,
        LEFT(access_token, 30) as access_token_prefix,
        LENGTH(access_token) as token_length,
        is_active
      FROM access_tokens 
      WHERE is_active = 1 
      LIMIT 5;"
echo ""
echo ""

# 4. 查看Go服务日志中的Token相关信息
echo "4️⃣ 查看Go服务日志(最近50行,包含Token关键字):"
echo "-----------------------------"
docker logs flow-codeblock-go-dev --tail 50 2>&1 | grep -i "token\|统计记录" | tail -20
echo ""
echo ""

# 5. 测试一次执行并查看日志
echo "5️⃣ 执行测试代码并观察Token获取:"
echo "-----------------------------"

# 先创建一个测试token(如果不存在)
TEST_TOKEN=$(curl -s -X POST "$API_URL/flow/tokens" \
  -H "accessToken: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ws_id": "debug_workspace",
    "email": "debug@example.com",
    "operation": "add",
    "days": 30,
    "rate_limit_per_minute": 60,
    "rate_limit_burst": 10
  }' | jq -r '.data.access_token // empty')

if [ -z "$TEST_TOKEN" ]; then
  echo "⚠️  创建Token失败，尝试查询现有Token..."
  TEST_TOKEN=$(curl -s -X GET "$API_URL/flow/query-token?ws_id=debug_workspace&email=debug@example.com" | jq -r '.data[0].access_token // empty')
fi

if [ -z "$TEST_TOKEN" ]; then
  echo "❌ 无法获取测试Token"
  exit 1
fi

echo "✅ 使用Token: ${TEST_TOKEN:0:20}..."
echo ""

# 执行测试代码
echo "执行测试代码..."
curl -s -X POST "$API_URL/flow/codeblock" \
  -H "Content-Type: application/json" \
  -H "accessToken: $TEST_TOKEN" \
  -d '{
    "codebase64": "Y29uc3QgYXhpb3MgPSByZXF1aXJlKCdheGlvcycpOwpyZXR1cm4gJ3Rlc3Qgb2snOw==",
    "input": {}
  }' | jq .

echo ""
echo "等待2秒让统计数据写入..."
sleep 2
echo ""

# 6. 查看最新的统计记录
echo "6️⃣ 查看最新的code_execution_stats记录:"
echo "-----------------------------"
docker exec flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go \
  -e "SELECT 
        execution_id,
        CASE 
          WHEN token = '' THEN '[空字符串]'
          WHEN token IS NULL THEN '[NULL]'
          ELSE CONCAT(LEFT(token, 10), '...', RIGHT(token, 4))
        END as token_display,
        LENGTH(token) as token_length,
        ws_id,
        email,
        modules_used
      FROM code_execution_stats 
      ORDER BY created_at DESC 
      LIMIT 3;"
echo ""

# 7. 查看Go服务的最新统计日志
echo "7️⃣ 查看统计记录日志(最新10条):"
echo "-----------------------------"
docker logs flow-codeblock-go-dev --tail 100 2>&1 | grep "统计记录" | tail -10
echo ""

echo "=========================================="
echo "调试完成"
echo "=========================================="

