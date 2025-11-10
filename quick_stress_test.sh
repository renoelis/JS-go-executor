#!/bin/bash

# 快速压力测试脚本

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://localhost:3002"
ADMIN_TOKEN="qingflow7676"

echo -e "${BLUE}=== Go-Executor 快速压力测试 ===${NC}\n"

# 1. 创建无限制Token
echo -e "${YELLOW}[1/4] 创建测试Token...${NC}"
response=$(curl -s -X POST "$BASE_URL/flow/tokens" \
    -H "accessToken: $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"ws_id":"stress","email":"stress@test.com","operation":"unlimited"}')

TOKEN=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Token创建失败${NC}"
    echo "响应: $response"
    exit 1
fi

echo -e "${GREEN}✓ Token: ${TOKEN:0:30}...${NC}\n"

# 2. 单线程100请求
echo -e "${YELLOW}[2/4] 单线程性能测试（100请求）...${NC}"
start=$(date +%s%N)
success=0

for i in {1..100}; do
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/flow/codeblock" \
        -H "accessToken: $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"codebase64":"cmV0dXJuIGlucHV0LmEgKyBpbnB1dC5i","input":{"a":1,"b":2}}')
    
    [ "$http_code" = "200" ] && success=$((success + 1))
done

end=$(date +%s%N)
duration=$(( (end - start) / 1000000 ))
qps=$(( 100 * 1000 / duration ))

echo -e "${GREEN}✓ 完成${NC}"
echo -e "${BLUE}  成功: $success/100${NC}"
echo -e "${BLUE}  耗时: ${duration}ms${NC}"
echo -e "${BLUE}  QPS: $qps${NC}"
echo -e "${BLUE}  平均延迟: $((duration / 100))ms${NC}\n"

# 3. 10并发测试
echo -e "${YELLOW}[3/4] 10并发测试（500请求）...${NC}"
start=$(date +%s%N)

for i in {1..10}; do
    (
        for j in {1..50}; do
            curl -s -o /dev/null -X POST "$BASE_URL/flow/codeblock" \
                -H "accessToken: $TOKEN" \
                -H "Content-Type: application/json" \
                -d '{"codebase64":"cmV0dXJuIDE=","input":{}}'
        done
    ) &
done
wait

end=$(date +%s%N)
duration=$(( (end - start) / 1000000 ))
qps=$(( 500 * 1000 / duration ))

echo -e "${GREEN}✓ 完成${NC}"
echo -e "${BLUE}  总请求: 500${NC}"
echo -e "${BLUE}  耗时: ${duration}ms${NC}"
echo -e "${BLUE}  QPS: $qps${NC}"
echo -e "${BLUE}  平均延迟: $((duration / 500))ms${NC}\n"

# 4. 获取统计
echo -e "${YELLOW}[4/4] 获取系统统计...${NC}"
cache=$(curl -s "$BASE_URL/flow/cache/stats" -H "accessToken: $ADMIN_TOKEN")
rate=$(curl -s "$BASE_URL/flow/rate-limit/stats" -H "accessToken: $ADMIN_TOKEN")

hot_hit=$(echo "$cache" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['performance']['hot_hit_rate'])" 2>/dev/null)
total_hit=$(echo "$cache" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['performance']['total_hit_rate'])" 2>/dev/null)

echo -e "${GREEN}✓ 统计获取成功${NC}"
echo -e "${BLUE}  热缓存命中率: ${hot_hit}%${NC}"
echo -e "${BLUE}  总缓存命中率: ${total_hit}%${NC}\n"

# 清理
curl -s -X DELETE "$BASE_URL/flow/tokens/$TOKEN" -H "accessToken: $ADMIN_TOKEN" > /dev/null

echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   压力测试完成！                               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
