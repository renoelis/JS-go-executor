#!/bin/bash

# dayjs 集成测试脚本

echo "========================================"
echo "  Dayjs 模块集成测试"
echo "========================================"
echo ""

# 测试服务器地址
SERVER_URL="${SERVER_URL:-http://localhost:8080}"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
test_case() {
    local name="$1"
    local code="$2"
    local input="${3:-{}}"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "测试 $TOTAL_TESTS: $name ... "
    
    # 发送请求
    RESPONSE=$(curl -s -X POST "$SERVER_URL/api/execute" \
        -H "Content-Type: application/json" \
        -d "{\"code\": $(echo "$code" | jq -Rs .), \"input\": $input}")
    
    # 检查响应
    if echo "$RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 通过${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        # 显示结果
        echo "$RESPONSE" | jq -C '.result' 2>/dev/null | sed 's/^/    /'
    else
        echo -e "${RED}❌ 失败${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        # 显示错误
        echo "$RESPONSE" | jq -C '.error // .message' 2>/dev/null | sed 's/^/    /'
    fi
    echo ""
}

echo "开始测试..."
echo ""

# 测试 1: 基本 dayjs 功能
test_case "基本 dayjs 加载和格式化" \
"const dayjs = require('dayjs');
const now = dayjs();
return {
  formatted: now.format('YYYY-MM-DD HH:mm:ss'),
  timestamp: now.valueOf(),
  valid: true
};"

# 测试 2: 日期加减
test_case "日期加减操作" \
"const dayjs = require('dayjs');
const now = dayjs('2024-01-15');
return {
  original: now.format('YYYY-MM-DD'),
  add7Days: now.add(7, 'day').format('YYYY-MM-DD'),
  sub1Month: now.subtract(1, 'month').format('YYYY-MM-DD')
};"

# 测试 3: 日期差异计算
test_case "日期差异计算" \
"const dayjs = require('dayjs');
const start = dayjs('2024-01-01');
const end = dayjs('2024-06-30');
return {
  daysDiff: end.diff(start, 'day'),
  monthsDiff: end.diff(start, 'month'),
  yearsDiff: end.diff(start, 'year')
};"

# 测试 4: 日期比较
test_case "日期比较功能" \
"const dayjs = require('dayjs');
const date1 = dayjs('2024-01-15');
const date2 = dayjs('2024-06-20');
return {
  date1IsBefore: date1.isBefore(date2),
  date2IsAfter: date1.isAfter(date2),
  isSameDay: date1.isSame(date1, 'day')
};"

# 测试 5: 月初月末
test_case "月初月末时间" \
"const dayjs = require('dayjs');
const date = dayjs('2024-02-15');
return {
  original: date.format('YYYY-MM-DD'),
  startOfMonth: date.startOf('month').format('YYYY-MM-DD'),
  endOfMonth: date.endOf('month').format('YYYY-MM-DD')
};"

# 测试 6: 综合应用（类似原 date-fns 示例）
test_case "综合日期处理" \
"const dayjs = require('dayjs');

const start = dayjs(input.startDate);
const end = dayjs(input.endDate);
const now = dayjs();

return {
  daysBetween: end.diff(start, 'day'),
  formatted: {
    start: start.format('YYYY-MM-DD'),
    end: end.format('YYYY-MM-DD')
  },
  operations: {
    nextWeek: now.add(1, 'week').format('YYYY-MM-DD'),
    lastMonth: now.subtract(1, 'month').format('YYYY-MM-DD')
  },
  comparisons: {
    endIsAfter: end.isAfter(start),
    startIsBefore: start.isBefore(end)
  }
};" \
'{"startDate": "2024-01-15", "endDate": "2024-06-20"}'

# 总结
echo "========================================"
echo "  测试结果总结"
echo "========================================"
echo -e "总测试数: $TOTAL_TESTS"
echo -e "${GREEN}通过: $PASSED_TESTS${NC}"
echo -e "${RED}失败: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 所有测试通过！${NC}"
    exit 0
else
    echo -e "${RED}⚠️  有测试失败，请检查日志${NC}"
    exit 1
fi


