#!/bin/bash

# ============================================================================
# Flow-CodeBlock Go 压力测试监控脚本
# ============================================================================
# 用于在压力测试期间实时监控服务状态
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# 配置
API_URL="https://api.renoelis.top"
ADMIN_TOKEN="9560D6C9-264A-45E4-B8BF-BF4957860484"
REFRESH_INTERVAL=5  # 刷新间隔（秒）

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo -e "\n${CYAN}▼ $1${NC}"
}

print_metric() {
    echo -e "  ${MAGENTA}├─${NC} $1: ${GREEN}$2${NC}"
}

print_warning_metric() {
    echo -e "  ${MAGENTA}├─${NC} $1: ${YELLOW}$2${NC}"
}

print_error_metric() {
    echo -e "  ${MAGENTA}├─${NC} $1: ${RED}$2${NC}"
}

# 获取健康状态
get_health_status() {
    local response=$(curl -s --max-time 5 \
        -H "accessToken: $ADMIN_TOKEN" \
        "$API_URL/flow/health" 2>&1)
    local status=$?
    
    if [ $status -eq 0 ] && [ -n "$response" ]; then
        echo "$response"
    else
        echo '{"status":"error","error":"无法连接"}'
    fi
}

# 获取缓存统计
get_cache_stats() {
    local response=$(curl -s --max-time 5 \
        -H "accessToken: $ADMIN_TOKEN" \
        "$API_URL/flow/cache/stats" 2>&1)
    
    if [ -n "$response" ]; then
        echo "$response"
    else
        echo '{}'
    fi
}

# 获取限流统计
get_rate_limit_stats() {
    local response=$(curl -s --max-time 5 \
        -H "accessToken: $ADMIN_TOKEN" \
        "$API_URL/flow/rate-limit/stats" 2>&1)
    
    if [ -n "$response" ]; then
        echo "$response"
    else
        echo '{}'
    fi
}

# 显示监控信息
display_monitor() {
    clear
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    print_header "Flow-CodeBlock Go 实时监控 | $timestamp"
    
    # 1. 健康状态
    print_section "服务健康状态"
    
    local health=$(get_health_status)
    # 使用jq或者更精确的grep来获取顶层status字段
    local health_status=$(echo "$health" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "unknown")
    
    if [ "$health_status" = "healthy" ] || [ "$health_status" = "ok" ]; then
        print_metric "状态" "✅ 健康 (${health_status})"
    elif [ "$health_status" = "unknown" ]; then
        print_warning_metric "状态" "⚠️  未知"
    else
        print_error_metric "状态" "❌ 异常 (${health_status})"
    fi
    
    # 提取健康信息（从新的API格式）
    local service=$(echo "$health" | grep -o '"service":"[^"]*"' | cut -d'"' -f4 || echo "")
    local version=$(echo "$health" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "")
    local memory_alloc=$(echo "$health" | grep -o '"alloc":"[^"]*"' | cut -d'"' -f4 || echo "")
    local current_execs=$(echo "$health" | grep -o '"currentExecutions":[0-9]*' | cut -d':' -f2 || echo "")
    local pool_size=$(echo "$health" | grep -o '"poolSize":[0-9]*' | cut -d':' -f2 || echo "")
    local success_rate=$(echo "$health" | grep -o '"successRate":"[^"]*"' | cut -d'"' -f4 || echo "")
    local total_execs=$(echo "$health" | grep -o '"totalExecutions":[0-9]*' | cut -d':' -f2 || echo "")
    
    # 显示关键信息
    if [ -n "$service" ]; then
        print_metric "服务" "$service"
    fi
    
    if [ -n "$version" ]; then
        print_metric "版本" "$version"
    fi
    
    if [ -n "$memory_alloc" ]; then
        print_metric "内存分配" "$memory_alloc"
    fi
    
    if [ -n "$current_execs" ]; then
        print_metric "当前执行" "$current_execs"
    fi
    
    if [ -n "$pool_size" ]; then
        print_metric "Runtime池" "$pool_size"
    fi
    
    if [ -n "$success_rate" ]; then
        print_metric "成功率" "$success_rate"
    fi
    
    if [ -n "$total_execs" ]; then
        print_metric "总执行数" "$total_execs"
    fi
    
    # 2. 缓存统计
    print_section "缓存统计"
    
    local cache_stats=$(get_cache_stats)
    
    if [ -n "$cache_stats" ] && [ "$cache_stats" != "{}" ]; then
        local hot_hit_rate=$(echo "$cache_stats" | grep -o '"hot_hit_rate":[0-9.]*' | cut -d':' -f2 || echo "")
        local total_hit_rate=$(echo "$cache_stats" | grep -o '"total_hit_rate":[0-9.]*' | cut -d':' -f2 || echo "")
        local hot_size=$(echo "$cache_stats" | grep -o '"hot_size":[0-9]*' | cut -d':' -f2 || echo "")
        local hot_hits=$(echo "$cache_stats" | grep -o '"hot_hits":[0-9]*' | cut -d':' -f2 || echo "")
        local hot_misses=$(echo "$cache_stats" | grep -o '"hot_misses":[0-9]*' | cut -d':' -f2 || echo "")
        local redis_hits=$(echo "$cache_stats" | grep -o '"redis_hits":[0-9]*' | cut -d':' -f2 || echo "")
        local db_hits=$(echo "$cache_stats" | grep -o '"db_hits":[0-9]*' | cut -d':' -f2 || echo "")
        
        if [ -n "$hot_hit_rate" ] && [ "$hot_hit_rate" != "0" ]; then
            local hit_rate_int=$(echo "$hot_hit_rate" | cut -d'.' -f1)
            hit_rate_int=${hit_rate_int:-0}
            if [ -n "$hit_rate_int" ] && [ "$hit_rate_int" -ge 80 ] 2>/dev/null; then
                print_metric "热缓存命中率" "${hot_hit_rate}% ✅"
            elif [ "$hit_rate_int" -ge 60 ] 2>/dev/null; then
                print_warning_metric "热缓存命中率" "${hot_hit_rate}% ⚠️"
            else
                print_error_metric "热缓存命中率" "${hot_hit_rate}% ❌"
            fi
        fi
        
        if [ -n "$total_hit_rate" ] && [ "$total_hit_rate" != "0" ]; then
            print_metric "总命中率" "${total_hit_rate}%"
        fi
        
        [ -n "$hot_size" ] && print_metric "缓存大小" "$hot_size"
        [ -n "$hot_hits" ] && print_metric "热缓存命中" "$hot_hits"
        [ -n "$hot_misses" ] && print_metric "热缓存未命中" "$hot_misses"
        [ -n "$redis_hits" ] && print_metric "Redis命中" "$redis_hits"
        [ -n "$db_hits" ] && print_metric "数据库查询" "$db_hits"
    else
        print_warning_metric "状态" "无法获取缓存统计"
    fi
    
    # 3. 限流统计
    print_section "限流统计"
    
    local rate_stats=$(get_rate_limit_stats)
    
    if [ -n "$rate_stats" ] && [ "$rate_stats" != "{}" ]; then
        local hot_rate=$(echo "$rate_stats" | grep -o '"hot_rate":[0-9.]*' | cut -d':' -f2 || echo "")
        local hot_size=$(echo "$rate_stats" | grep -o '"hot_size":[0-9]*' | cut -d':' -f2 || echo "")
        local redis_checks=$(echo "$rate_stats" | grep -o '"redis_checks":[0-9]*' | cut -d':' -f2 || echo "")
        local batch_writes=$(echo "$rate_stats" | grep -o '"batch_writes":[0-9]*' | cut -d':' -f2 || echo "")
        
        if [ -n "$hot_rate" ] && [ "$hot_rate" != "0" ]; then
            local rate_int=$(echo "$hot_rate" | cut -d'.' -f1)
            rate_int=${rate_int:-0}
            if [ -n "$rate_int" ] && [ "$rate_int" -ge 80 ] 2>/dev/null; then
                print_metric "热数据命中率" "${hot_rate}% ✅"
            else
                print_warning_metric "热数据命中率" "${hot_rate}% ⚠️"
            fi
        fi
        
        [ -n "$hot_size" ] && print_metric "限流缓存大小" "$hot_size"
        [ -n "$redis_checks" ] && print_metric "Redis检查" "$redis_checks"
        [ -n "$batch_writes" ] && print_metric "批量写入" "$batch_writes"
    else
        print_warning_metric "状态" "无法获取限流统计"
    fi
    
    # 4. Docker容器状态（如果可用）
    if command -v docker &> /dev/null; then
        print_section "Docker容器状态"
        
        local container_stats=$(docker stats flow-codeblock-go-prod --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}|{{.NetIO}}" 2>/dev/null || echo "")
        
        if [ -n "$container_stats" ]; then
            IFS='|' read -r cpu_perc mem_usage net_io <<< "$container_stats"
            
            # CPU使用率
            local cpu_val=$(echo "$cpu_perc" | sed 's/%//')
            local cpu_int=$(echo "$cpu_val" | cut -d'.' -f1)
            
            if [ "$cpu_int" -lt 70 ]; then
                print_metric "CPU使用率" "$cpu_perc ✅"
            elif [ "$cpu_int" -lt 90 ]; then
                print_warning_metric "CPU使用率" "$cpu_perc ⚠️"
            else
                print_error_metric "CPU使用率" "$cpu_perc ❌"
            fi
            
            print_metric "内存使用" "$mem_usage"
            print_metric "网络I/O" "$net_io"
        else
            print_warning_metric "状态" "无法获取容器统计（需要Docker权限）"
        fi
    fi
    
    # 5. 系统负载（如果是本地）
    if [ -f "/proc/loadavg" ]; then
        print_section "系统负载"
        local load=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
        print_metric "负载" "$load"
    fi
    
    # 底部提示
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}刷新间隔: ${REFRESH_INTERVAL}秒 | 按 Ctrl+C 退出${NC}"
}

# 主循环
main() {
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   Flow-CodeBlock Go 实时监控                               ║"
    echo "║   监控压力测试期间的服务状态                               ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "${YELLOW}正在启动监控...${NC}"
    sleep 2
    
    while true; do
        display_monitor
        sleep $REFRESH_INTERVAL
    done
}

# 捕获退出信号
trap "echo ''; echo -e '${YELLOW}监控已停止${NC}'; exit 0" INT TERM

# 运行
main

