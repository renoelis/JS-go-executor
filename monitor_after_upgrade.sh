#!/bin/bash

# 升级后监控脚本
# 持续监控内存使用，确保安全

echo "==========================================="
echo "配置升级后监控"
echo "==========================================="
echo ""
echo "新配置:"
echo "  MAX_FORMDATA_SIZE_MB: 10MB → 15MB"
echo "  MAX_BLOB_FILE_SIZE_MB: 8MB → 12MB"
echo "  MAX_FILE_SIZE_MB: 8MB → 12MB"
echo ""
echo "开始监控..."
echo ""

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 监控循环
count=0
max_memory_mb=0
avg_memory_mb=0
total_memory_mb=0

while true; do
    count=$((count + 1))
    
    # 获取内存使用
    memory_info=$(docker stats flow-codeblock-go-dev --no-stream --format "{{.MemUsage}}")
    
    # 提取数字（例如 "1.5GiB / 2GiB"）
    current_mb=$(echo $memory_info | awk '{print $1}' | sed 's/GiB//' | awk '{printf "%.0f", $1 * 1024}')
    limit_mb=$(echo $memory_info | awk '{print $3}' | sed 's/GiB//' | awk '{printf "%.0f", $1 * 1024}')
    percentage=$(echo "scale=1; $current_mb * 100 / $limit_mb" | bc)
    
    # 计算统计
    if [ $current_mb -gt $max_memory_mb ]; then
        max_memory_mb=$current_mb
    fi
    total_memory_mb=$((total_memory_mb + current_mb))
    avg_memory_mb=$((total_memory_mb / count))
    
    # 清屏并显示
    clear
    echo "==========================================="
    echo "内存监控 - 配置升级后"
    echo "==========================================="
    echo ""
    echo "时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "监控次数: $count"
    echo ""
    echo "当前内存: ${current_mb}MB / ${limit_mb}MB (${percentage}%)"
    echo "最大内存: ${max_memory_mb}MB"
    echo "平均内存: ${avg_memory_mb}MB"
    echo ""
    
    # 状态评估
    if [ $(echo "$percentage < 60" | bc) -eq 1 ]; then
        echo -e "${GREEN}✅ 状态: 安全 (< 60%)${NC}"
    elif [ $(echo "$percentage < 75" | bc) -eq 1 ]; then
        echo -e "${YELLOW}⚠️  状态: 警告 (60-75%)${NC}"
    else
        echo -e "${RED}❌ 状态: 危险 (> 75%)${NC}"
        echo ""
        echo "建议: 考虑降低配置或升级容器内存"
    fi
    
    echo ""
    echo "最近5条日志错误:"
    echo "─────────────────────────────────────────"
    docker logs flow-codeblock-go-dev --tail 100 2>&1 | grep -i "error\|fatal\|panic" | tail -5 | sed 's/^/  /' || echo "  无错误"
    
    echo ""
    echo "─────────────────────────────────────────"
    echo "按 Ctrl+C 停止监控"
    echo ""
    
    # 每5秒刷新
    sleep 5
done
