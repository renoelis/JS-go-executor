#!/opt/homebrew/bin/bash

# ============================================================================
# Flow-CodeBlock Go 大输出并发压力测试脚本 (优化版本)
# ============================================================================
# 测试目标: 测试同时并发输出大量内容时的服务内存压力
# 测试内容: 每次请求返回12000个对象的JSON数组（约1-2MB）
# 
# 版本改进:
# - 添加了超时控制，防止请求卡住
# - 添加了实时进度显示
# - 改进了进程管理和清理
# - 添加了更详细的错误处理
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 配置
API_URL="http://localhost:3002/flow/codeblock"
ACCESS_TOKEN="flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e"
RESULTS_DIR="large_output_stress_$(date +%Y%m%d_%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/summary.txt"
DETAIL_FILE="${RESULTS_DIR}/detail.log"
MEMORY_LOG="${RESULTS_DIR}/memory.log"

# 大输出测试代码 - 返回12000个对象的数组
LARGE_OUTPUT_CODE="Ly8g55u05o6l6L+U5Zue5pWw57uE77yM6Kem5Y+RIGpzb25pdGVyIOa1geW8j+W6j+WIl+WMlgpjb25zdCBpdGVtcyA9IFtdOwpmb3IgKGxldCBpID0gMDsgaSA8IDEyMDAwOyBpKyspIHsKICBpdGVtcy5wdXNoKHsKICAgIGlkOiBpLAogICAgbmFtZTogYEl0ZW0gJHtpfWAsCiAgICBkZXNjcmlwdGlvbjogYFRoaXMgaXMgYSBkZXNjcmlwdGlvbiBmb3IgaXRlbSAke2l9YCwKICAgIHRhZ3M6IFsndGFnMScsICd0YWcyJywgJ3RhZzMnXSwKICAgIHByaWNlOiBNYXRoLnJhbmRvbSgpICogMTAwCiAgfSk7Cn0KCnJldHVybiBpdGVtczsgIC8vIOKchSDpobbnuqfmlbDnu4TvvIzop6blj5HmtYHlvI8="

# 打印函数
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_info() {
    echo -e "${CYAN}ℹ  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠  $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_stat() {
    echo -e "${MAGENTA}📊 $1${NC}"
}

clear_line() {
    echo -ne "\r\033[K"
}

# 初始化测试环境
init_test_env() {
    print_header "初始化测试环境"
    
    # 创建结果目录
    mkdir -p "$RESULTS_DIR"
    
    # 初始化统计文件
    {
        echo "=================================================="
        echo "Flow-CodeBlock Go 大输出并发压力测试报告"
        echo "=================================================="
        echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "测试目标: $API_URL"
        echo "测试内容: 每次返回12000个对象（约1-2MB JSON）"
        echo "=================================================="
        echo ""
    } > "$SUMMARY_FILE"
    
    # 初始化内存日志
    {
        echo "时间戳,已用内存,总内存,内存使用率,进程内存"
        echo "=================================================="
    } > "$MEMORY_LOG"
    
    print_success "结果目录创建: $RESULTS_DIR"
    print_info "摘要文件: $SUMMARY_FILE"
    print_info "详细日志: $DETAIL_FILE"
    print_info "内存日志: $MEMORY_LOG"
}

# 检查依赖
check_dependencies() {
    print_header "检查依赖工具"
    
    local deps=("curl" "jq" "bc" "docker")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if command -v "$dep" &> /dev/null; then
            print_success "$dep 已安装"
        else
            print_error "$dep 未安装"
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        print_error "缺少依赖: ${missing[*]}"
        print_info "请安装: brew install ${missing[*]}"
        exit 1
    fi
}

# 监控Docker容器内存
monitor_docker_memory() {
    local container_name="flow-codeblock-go-dev"
    
    while true; do
        # 获取系统内存信息
        local mem_info=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages free:\s+(\d+)/ and printf("%.2f", $1 * $size / 1048576), exit')
        
        # 获取Docker容器内存（如果存在）
        local container_mem=""
        if docker ps --format "{{.Names}}" | grep -q "^${container_name}$"; then
            container_mem=$(docker stats --no-stream --format "{{.MemUsage}}" "$container_name" 2>/dev/null || echo "N/A")
        else
            container_mem="容器未运行"
        fi
        
        # 记录内存日志
        echo "$(date '+%Y-%m-%d %H:%M:%S'),$container_mem" >> "$MEMORY_LOG"
        
        sleep 5
    done
}

# 执行单个大输出请求
execute_large_output_request() {
    local request_id=$1
    
    local start_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    
    # 执行请求（添加更严格的超时控制）
    local response=$(timeout 70 curl -s -w "\n%{http_code}\n%{time_total}\n%{size_download}" \
        --max-time 65 \
        --connect-timeout 10 \
        --location "$API_URL" \
        --header "accessToken: $ACCESS_TOKEN" \
        --header "Content-Type: application/json" \
        --data "{\"input\": {}, \"codebase64\": \"$LARGE_OUTPUT_CODE\"}" \
        2>&1)
    
    local curl_exit=$?
    local end_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    local duration=$((end_time - start_time))
    
    # 检查超时
    if [ $curl_exit -eq 124 ] || [ $curl_exit -eq 28 ]; then
        echo "TIMEOUT|$duration|0"
        return 1
    fi
    
    # 解析响应 (兼容 macOS)
    local http_code=$(echo "$response" | tail -n 3 | head -n 1 | tr -d '\r\n')
    local time_total=$(echo "$response" | tail -n 2 | head -n 1 | tr -d '\r\n')
    local size_download=$(echo "$response" | tail -n 1 | tr -d '\r\n')
    
    # 验证http_code
    if ! [[ "$http_code" =~ ^[0-9]+$ ]]; then
        http_code="ERROR"
    fi
    
    # 计算响应大小（MB）
    local size_mb="0"
    if [ -n "$size_download" ] && [[ "$size_download" =~ ^[0-9]+$ ]]; then
        size_mb=$(echo "scale=2; $size_download / 1048576" | bc 2>/dev/null || echo "0")
    fi
    
    # 记录详细日志
    {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Request #$request_id"
        echo "  HTTP Code: $http_code"
        echo "  Duration: ${duration}ms"
        echo "  Time Total: ${time_total}s"
        echo "  Download Size: ${size_mb}MB"
        echo ""
    } >> "$DETAIL_FILE"
    
    # 返回结果
    echo "$http_code|$duration|$size_mb"
}

# 测试1: 单个大输出请求测试
test_single_large_output() {
    print_header "测试1: 单个大输出请求测试"
    
    print_info "测试目的: 验证单个大输出请求的响应"
    print_info "预期输出: 12000个对象，约1-2MB JSON"
    
    echo "=== 测试1: 单个大输出请求测试 ===" >> "$SUMMARY_FILE"
    
    local result=$(execute_large_output_request "1-single")
    IFS='|' read -r http_code duration size_mb <<< "$result"
    
    if [ "$http_code" = "200" ]; then
        print_success "请求成功"
        print_stat "HTTP状态码: $http_code"
        print_stat "响应时间: ${duration}ms"
        print_stat "响应大小: ${size_mb}MB"
    else
        print_error "请求失败"
        print_error "HTTP状态码: $http_code"
    fi
    
    {
        echo "  HTTP状态码: $http_code"
        echo "  响应时间: ${duration}ms"
        echo "  响应大小: ${size_mb}MB"
        echo ""
    } >> "$SUMMARY_FILE"
    
    sleep 2
}

# 测试2: 低并发大输出测试（5并发）
test_low_concurrency() {
    print_header "测试2: 低并发大输出测试（5并发）"
    
    local concurrency=5
    local requests_per_thread=5  # 减少到5次，加快测试
    local total=$((concurrency * requests_per_thread))
    
    print_info "并发数: $concurrency"
    print_info "每线程请求数: $requests_per_thread"
    print_info "总请求数: $total"
    print_info "预计总输出: 约${total}0-$((total * 2))MB"
    
    echo "=== 测试2: 低并发大输出测试 ===" >> "$SUMMARY_FILE"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    local pids=()
    
    # 启动并发进程
    for i in $(seq 1 $concurrency); do
        (
            local success=0
            local failed=0
            local total_size=0
            local total_time=0
            
            for j in $(seq 1 $requests_per_thread); do
                echo -ne "\r  线程 $i: 请求 $j/$requests_per_thread" >&2
                
                local result=$(execute_large_output_request "2-$i-$j")
                IFS='|' read -r http_code duration size_mb <<< "$result"
                
                if [ "$http_code" = "200" ]; then
                    success=$((success + 1))
                    total_time=$((total_time + duration))
                    # 安全的浮点数加法
                    if [ -n "$size_mb" ] && [ "$size_mb" != "0" ]; then
                        total_size=$(echo "$total_size + $size_mb" | bc 2>/dev/null || echo "$total_size")
                    fi
                else
                    failed=$((failed + 1))
                fi
                
                sleep 0.2  # 减少延迟，加快测试
            done
            
            echo "$success $failed $total_time $total_size" > "$temp_dir/result_$i.txt"
        ) &
        pids+=($!)
    done
    
    # 等待所有进程，带超时和进度显示
    print_info "等待所有并发请求完成..."
    local wait_count=0
    local max_wait=300  # 最多等待5分钟
    while [ ${#pids[@]} -gt 0 ] && [ $wait_count -lt $max_wait ]; do
        local alive_pids=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                alive_pids+=("$pid")
            fi
        done
        pids=("${alive_pids[@]}")
        
        if [ ${#pids[@]} -eq 0 ]; then
            break
        fi
        
        printf "\r  剩余进程: %2d/%d, 等待时间: %3ds" "${#pids[@]}" "$concurrency" "$wait_count"
        sleep 1
        wait_count=$((wait_count + 1))
    done
    clear_line
    
    # 如果超时，强制终止
    if [ ${#pids[@]} -gt 0 ]; then
        print_warning "部分进程超时，强制终止 (剩余: ${#pids[@]})"
        for pid in "${pids[@]}"; do
            kill -9 "$pid" 2>/dev/null || true
        done
    else
        print_success "所有并发进程已完成 (用时: ${wait_count}s)"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 统计结果
    local total_success=0
    local total_failed=0
    local total_time=0
    local total_size=0
    
    for i in $(seq 1 $concurrency); do
        if [ -f "$temp_dir/result_$i.txt" ]; then
            read success failed time size < "$temp_dir/result_$i.txt"
            total_success=$((total_success + success))
            total_failed=$((total_failed + failed))
            total_time=$((total_time + time))
            # 安全的浮点数加法
            if [ -n "$size" ] && [ "$size" != "0" ]; then
                total_size=$(echo "$total_size + $size" | bc 2>/dev/null || echo "$total_size")
            fi
        fi
    done
    
    rm -rf "$temp_dir"
    
    local avg_time=0
    if [ $total_success -gt 0 ]; then
        avg_time=$(echo "scale=2; $total_time / $total_success" | bc 2>/dev/null || echo "0")
    fi
    local qps=$(echo "scale=2; $total / $duration" | bc 2>/dev/null || echo "0")
    
    print_success "测试完成"
    print_stat "总耗时: ${duration}秒"
    print_stat "成功: $total_success, 失败: $total_failed"
    print_stat "总输出: ${total_size}MB"
    print_stat "平均响应时间: ${avg_time}ms"
    print_stat "QPS: $qps"
    
    {
        echo "  并发数: $concurrency"
        echo "  总请求数: $total"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  总耗时: ${duration}秒"
        echo "  总输出: ${total_size}MB"
        echo "  平均响应时间: ${avg_time}ms"
        echo "  QPS: $qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试3: 中等并发大输出测试（10并发）
test_medium_concurrency() {
    print_header "测试3: 中等并发大输出测试（10并发）"
    
    local concurrency=10
    local requests_per_thread=5  # 减少到5次，加快测试
    local total=$((concurrency * requests_per_thread))
    
    print_info "并发数: $concurrency"
    print_info "每线程请求数: $requests_per_thread"
    print_info "总请求数: $total"
    print_info "预计总输出: 约$((total * 1))-$((total * 2))MB"
    
    echo "=== 测试3: 中等并发大输出测试 ===" >> "$SUMMARY_FILE"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    local pids=()
    
    # 启动并发进程
    for i in $(seq 1 $concurrency); do
        (
            local success=0
            local failed=0
            local total_size=0
            local total_time=0
            
            for j in $(seq 1 $requests_per_thread); do
                echo -ne "\r  线程 $i: 请求 $j/$requests_per_thread" >&2
                
                local result=$(execute_large_output_request "3-$i-$j")
                IFS='|' read -r http_code duration size_mb <<< "$result"
                
                if [ "$http_code" = "200" ]; then
                    success=$((success + 1))
                    total_time=$((total_time + duration))
                    # 安全的浮点数加法
                    if [ -n "$size_mb" ] && [ "$size_mb" != "0" ]; then
                        total_size=$(echo "$total_size + $size_mb" | bc 2>/dev/null || echo "$total_size")
                    fi
                else
                    failed=$((failed + 1))
                fi
                
                sleep 0.3
            done
            
            echo "$success $failed $total_time $total_size" > "$temp_dir/result_$i.txt"
        ) &
        pids+=($!)
    done
    
    # 等待所有进程，带超时和进度显示
    print_info "等待所有并发请求完成..."
    local wait_count=0
    local max_wait=400
    while [ ${#pids[@]} -gt 0 ] && [ $wait_count -lt $max_wait ]; do
        local alive_pids=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                alive_pids+=("$pid")
            fi
        done
        pids=("${alive_pids[@]}")
        
        if [ ${#pids[@]} -eq 0 ]; then
            break
        fi
        
        printf "\r  剩余进程: %2d/%d, 等待时间: %3ds" "${#pids[@]}" "$concurrency" "$wait_count"
        sleep 1
        wait_count=$((wait_count + 1))
    done
    clear_line
    
    # 如果超时，强制终止
    if [ ${#pids[@]} -gt 0 ]; then
        print_warning "部分进程超时，强制终止 (剩余: ${#pids[@]})"
        for pid in "${pids[@]}"; do
            kill -9 "$pid" 2>/dev/null || true
        done
    else
        print_success "所有并发进程已完成 (用时: ${wait_count}s)"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 统计结果
    local total_success=0
    local total_failed=0
    local total_time=0
    local total_size=0
    
    for i in $(seq 1 $concurrency); do
        if [ -f "$temp_dir/result_$i.txt" ]; then
            read success failed time size < "$temp_dir/result_$i.txt"
            total_success=$((total_success + success))
            total_failed=$((total_failed + failed))
            total_time=$((total_time + time))
            # 安全的浮点数加法
            if [ -n "$size" ] && [ "$size" != "0" ]; then
                total_size=$(echo "$total_size + $size" | bc 2>/dev/null || echo "$total_size")
            fi
        fi
    done
    
    rm -rf "$temp_dir"
    
    local avg_time=0
    if [ $total_success -gt 0 ]; then
        avg_time=$(echo "scale=2; $total_time / $total_success" | bc 2>/dev/null || echo "0")
    fi
    local qps=$(echo "scale=2; $total / $duration" | bc 2>/dev/null || echo "0")
    
    print_success "测试完成"
    print_stat "总耗时: ${duration}秒"
    print_stat "成功: $total_success, 失败: $total_failed"
    print_stat "总输出: ${total_size}MB"
    print_stat "平均响应时间: ${avg_time}ms"
    print_stat "QPS: $qps"
    
    {
        echo "  并发数: $concurrency"
        echo "  总请求数: $total"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  总耗时: ${duration}秒"
        echo "  总输出: ${total_size}MB"
        echo "  平均响应时间: ${avg_time}ms"
        echo "  QPS: $qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试4: 高并发大输出测试（20并发）
test_high_concurrency() {
    print_header "测试4: 高并发大输出测试（20并发）"
    
    local concurrency=20
    local requests_per_thread=5
    local total=$((concurrency * requests_per_thread))
    
    print_info "并发数: $concurrency"
    print_info "每线程请求数: $requests_per_thread"
    print_info "总请求数: $total"
    print_info "预计总输出: 约$((total * 1))-$((total * 2))MB"
    print_warning "高并发测试，请注意观察服务内存和CPU使用情况"
    
    echo "=== 测试4: 高并发大输出测试 ===" >> "$SUMMARY_FILE"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    local pids=()
    
    # 启动并发进程
    for i in $(seq 1 $concurrency); do
        (
            local success=0
            local failed=0
            local total_size=0
            local total_time=0
            
            for j in $(seq 1 $requests_per_thread); do
                echo -ne "\r  线程 $i: 请求 $j/$requests_per_thread" >&2
                
                local result=$(execute_large_output_request "4-$i-$j")
                IFS='|' read -r http_code duration size_mb <<< "$result"
                
                if [ "$http_code" = "200" ]; then
                    success=$((success + 1))
                    total_time=$((total_time + duration))
                    # 安全的浮点数加法
                    if [ -n "$size_mb" ] && [ "$size_mb" != "0" ]; then
                        total_size=$(echo "$total_size + $size_mb" | bc 2>/dev/null || echo "$total_size")
                    fi
                else
                    failed=$((failed + 1))
                fi
                
                sleep 0.2
            done
            
            echo "$success $failed $total_time $total_size" > "$temp_dir/result_$i.txt"
        ) &
        pids+=($!)
    done
    
    # 等待所有进程，带超时和进度显示
    print_info "等待所有并发请求完成..."
    local wait_count=0
    local max_wait=500
    while [ ${#pids[@]} -gt 0 ] && [ $wait_count -lt $max_wait ]; do
        local alive_pids=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                alive_pids+=("$pid")
            fi
        done
        pids=("${alive_pids[@]}")
        
        if [ ${#pids[@]} -eq 0 ]; then
            break
        fi
        
        printf "\r  剩余进程: %2d/%d, 等待时间: %3ds" "${#pids[@]}" "$concurrency" "$wait_count"
        sleep 1
        wait_count=$((wait_count + 1))
    done
    clear_line
    
    # 如果超时，强制终止
    if [ ${#pids[@]} -gt 0 ]; then
        print_warning "部分进程超时，强制终止 (剩余: ${#pids[@]})"
        for pid in "${pids[@]}"; do
            kill -9 "$pid" 2>/dev/null || true
        done
    else
        print_success "所有并发进程已完成 (用时: ${wait_count}s)"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 统计结果
    local total_success=0
    local total_failed=0
    local total_time=0
    local total_size=0
    
    for i in $(seq 1 $concurrency); do
        if [ -f "$temp_dir/result_$i.txt" ]; then
            read success failed time size < "$temp_dir/result_$i.txt"
            total_success=$((total_success + success))
            total_failed=$((total_failed + failed))
            total_time=$((total_time + time))
            # 安全的浮点数加法
            if [ -n "$size" ] && [ "$size" != "0" ]; then
                total_size=$(echo "$total_size + $size" | bc 2>/dev/null || echo "$total_size")
            fi
        fi
    done
    
    rm -rf "$temp_dir"
    
    local avg_time=0
    if [ $total_success -gt 0 ]; then
        avg_time=$(echo "scale=2; $total_time / $total_success" | bc 2>/dev/null || echo "0")
    fi
    local qps=$(echo "scale=2; $total / $duration" | bc 2>/dev/null || echo "0")
    
    print_success "测试完成"
    print_stat "总耗时: ${duration}秒"
    print_stat "成功: $total_success, 失败: $total_failed"
    print_stat "总输出: ${total_size}MB"
    print_stat "平均响应时间: ${avg_time}ms"
    print_stat "QPS: $qps"
    
    {
        echo "  并发数: $concurrency"
        echo "  总请求数: $total"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  总耗时: ${duration}秒"
        echo "  总输出: ${total_size}MB"
        echo "  平均响应时间: ${avg_time}ms"
        echo "  QPS: $qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试5: 持续压力测试（10并发，持续1分钟）
test_sustained_load() {
    print_header "测试5: 持续压力测试（10并发，持续1分钟）"
    
    local concurrency=10
    local duration_seconds=60  # 减少到1分钟，加快测试
    
    print_info "并发数: $concurrency"
    print_info "持续时间: ${duration_seconds}秒"
    print_warning "长时间持续大输出，重点观察内存变化"
    
    echo "=== 测试5: 持续压力测试 ===" >> "$SUMMARY_FILE"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration_seconds))
    local temp_dir=$(mktemp -d)
    local pids=()
    
    # 启动并发进程
    for i in $(seq 1 $concurrency); do
        (
            local success=0
            local failed=0
            local total_size=0
            local total_time=0
            local count=0
            
            while [ $(date +%s) -lt $end_time ]; do
                echo -ne "\r  线程 $i: 请求 #$count" >&2
                
                local result=$(execute_large_output_request "5-$i-$count")
                IFS='|' read -r http_code duration size_mb <<< "$result"
                
                if [ "$http_code" = "200" ]; then
                    success=$((success + 1))
                    total_time=$((total_time + duration))
                    # 安全的浮点数加法
                    if [ -n "$size_mb" ] && [ "$size_mb" != "0" ]; then
                        total_size=$(echo "$total_size + $size_mb" | bc 2>/dev/null || echo "$total_size")
                    fi
                else
                    failed=$((failed + 1))
                fi
                
                count=$((count + 1))
                sleep 0.5  # 减少延迟，增加请求频率
            done
            
            echo "$success $failed $total_time $total_size" > "$temp_dir/result_$i.txt"
        ) &
        pids+=($!)
    done
    
    # 显示进度
    while [ $(date +%s) -lt $end_time ]; do
        local elapsed=$(($(date +%s) - start_time))
        local remaining=$((duration_seconds - elapsed))
        
        # 检查有多少进程还在运行
        local alive_count=0
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                alive_count=$((alive_count + 1))
            fi
        done
        
        echo -ne "\r  运行中... 已运行: ${elapsed}s, 剩余: ${remaining}s, 活跃线程: $alive_count/$concurrency"
        sleep 5
    done
    echo ""
    
    # 等待所有进程，带超时
    print_info "等待所有进程完成..."
    local wait_count=0
    local max_wait=120
    while [ ${#pids[@]} -gt 0 ] && [ $wait_count -lt $max_wait ]; do
        local alive_pids=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                alive_pids+=("$pid")
            fi
        done
        pids=("${alive_pids[@]}")
        
        if [ ${#pids[@]} -eq 0 ]; then
            break
        fi
        
        printf "\r  等待剩余进程: %2d/%d" "${#pids[@]}" "$concurrency"
        sleep 1
        wait_count=$((wait_count + 1))
    done
    clear_line
    
    # 如果超时，强制终止
    if [ ${#pids[@]} -gt 0 ]; then
        print_warning "部分进程超时，强制终止 (剩余: ${#pids[@]})"
        for pid in "${pids[@]}"; do
            kill -9 "$pid" 2>/dev/null || true
        done
    else
        print_success "所有进程已完成"
    fi
    
    local actual_duration=$(($(date +%s) - start_time))
    
    # 统计结果
    local total_success=0
    local total_failed=0
    local total_time=0
    local total_size=0
    
    for i in $(seq 1 $concurrency); do
        if [ -f "$temp_dir/result_$i.txt" ]; then
            read success failed time size < "$temp_dir/result_$i.txt"
            total_success=$((total_success + success))
            total_failed=$((total_failed + failed))
            total_time=$((total_time + time))
            # 安全的浮点数加法
            if [ -n "$size" ] && [ "$size" != "0" ]; then
                total_size=$(echo "$total_size + $size" | bc 2>/dev/null || echo "$total_size")
            fi
        fi
    done
    
    rm -rf "$temp_dir"
    
    local total_requests=$((total_success + total_failed))
    local avg_time=0
    if [ $total_success -gt 0 ]; then
        avg_time=$(echo "scale=2; $total_time / $total_success" | bc 2>/dev/null || echo "0")
    fi
    local qps=$(echo "scale=2; $total_requests / $actual_duration" | bc 2>/dev/null || echo "0")
    local success_rate=0
    if [ $total_requests -gt 0 ]; then
        success_rate=$(echo "scale=2; $total_success * 100 / $total_requests" | bc 2>/dev/null || echo "0")
    fi
    
    print_success "持续压力测试完成"
    print_stat "实际耗时: ${actual_duration}秒"
    print_stat "总请求数: $total_requests"
    print_stat "成功: $total_success, 失败: $total_failed"
    print_stat "成功率: ${success_rate}%"
    print_stat "总输出: ${total_size}MB"
    print_stat "平均响应时间: ${avg_time}ms"
    print_stat "平均QPS: $qps"
    
    {
        echo "  并发数: $concurrency"
        echo "  持续时间: ${actual_duration}秒"
        echo "  总请求数: $total_requests"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  成功率: ${success_rate}%"
        echo "  总输出: ${total_size}MB"
        echo "  平均响应时间: ${avg_time}ms"
        echo "  平均QPS: $qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试6: 极限并发测试（30并发）
test_extreme_concurrency() {
    print_header "测试6: 极限并发测试（30并发）"
    
    local concurrency=30
    local requests_per_thread=3
    local total=$((concurrency * requests_per_thread))
    
    print_info "并发数: $concurrency"
    print_info "每线程请求数: $requests_per_thread"
    print_info "总请求数: $total"
    print_warning "极限并发测试，可能会导致服务压力过大"
    
    echo "=== 测试6: 极限并发测试 ===" >> "$SUMMARY_FILE"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    local pids=()
    
    # 启动并发进程
    for i in $(seq 1 $concurrency); do
        (
            local success=0
            local failed=0
            local total_size=0
            local total_time=0
            
            for j in $(seq 1 $requests_per_thread); do
                echo -ne "\r  线程 $i: 请求 $j/$requests_per_thread" >&2
                
                local result=$(execute_large_output_request "6-$i-$j")
                IFS='|' read -r http_code duration size_mb <<< "$result"
                
                if [ "$http_code" = "200" ]; then
                    success=$((success + 1))
                    total_time=$((total_time + duration))
                    # 安全的浮点数加法
                    if [ -n "$size_mb" ] && [ "$size_mb" != "0" ]; then
                        total_size=$(echo "$total_size + $size_mb" | bc 2>/dev/null || echo "$total_size")
                    fi
                else
                    failed=$((failed + 1))
                fi
                
                sleep 0.1
            done
            
            echo "$success $failed $total_time $total_size" > "$temp_dir/result_$i.txt"
        ) &
        pids+=($!)
    done
    
    # 等待所有进程，带超时和进度显示
    print_info "等待所有并发请求完成..."
    local wait_count=0
    local max_wait=600
    while [ ${#pids[@]} -gt 0 ] && [ $wait_count -lt $max_wait ]; do
        local alive_pids=()
        for pid in "${pids[@]}"; do
            if kill -0 "$pid" 2>/dev/null; then
                alive_pids+=("$pid")
            fi
        done
        pids=("${alive_pids[@]}")
        
        if [ ${#pids[@]} -eq 0 ]; then
            break
        fi
        
        printf "\r  剩余进程: %2d/%d, 等待时间: %3ds" "${#pids[@]}" "$concurrency" "$wait_count"
        sleep 1
        wait_count=$((wait_count + 1))
    done
    clear_line
    
    # 如果超时，强制终止
    if [ ${#pids[@]} -gt 0 ]; then
        print_warning "部分进程超时，强制终止 (剩余: ${#pids[@]})"
        for pid in "${pids[@]}"; do
            kill -9 "$pid" 2>/dev/null || true
        done
    else
        print_success "所有并发进程已完成 (用时: ${wait_count}s)"
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 统计结果
    local total_success=0
    local total_failed=0
    local total_time=0
    local total_size=0
    
    for i in $(seq 1 $concurrency); do
        if [ -f "$temp_dir/result_$i.txt" ]; then
            read success failed time size < "$temp_dir/result_$i.txt"
            total_success=$((total_success + success))
            total_failed=$((total_failed + failed))
            total_time=$((total_time + time))
            # 安全的浮点数加法
            if [ -n "$size" ] && [ "$size" != "0" ]; then
                total_size=$(echo "$total_size + $size" | bc 2>/dev/null || echo "$total_size")
            fi
        fi
    done
    
    rm -rf "$temp_dir"
    
    local avg_time=0
    if [ $total_success -gt 0 ]; then
        avg_time=$(echo "scale=2; $total_time / $total_success" | bc 2>/dev/null || echo "0")
    fi
    local qps=$(echo "scale=2; $total / $duration" | bc 2>/dev/null || echo "0")
    
    print_success "极限并发测试完成"
    print_stat "总耗时: ${duration}秒"
    print_stat "成功: $total_success, 失败: $total_failed"
    print_stat "总输出: ${total_size}MB"
    print_stat "平均响应时间: ${avg_time}ms"
    print_stat "QPS: $qps"
    
    {
        echo "  并发数: $concurrency"
        echo "  总请求数: $total"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  总耗时: ${duration}秒"
        echo "  总输出: ${total_size}MB"
        echo "  平均响应时间: ${avg_time}ms"
        echo "  QPS: $qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 生成最终报告
generate_final_report() {
    print_header "生成最终测试报告"
    
    # 从详细日志中统计数据
    local total=0
    local success=0
    local failed=0
    local total_size=0
    local total_time=0
    
    if [ -f "$DETAIL_FILE" ]; then
        total=$(grep "Request #" "$DETAIL_FILE" | wc -l | tr -d ' ')
        success=$(grep "HTTP Code: 200" "$DETAIL_FILE" | wc -l | tr -d ' ')
        failed=$((total - success))
        
        # 计算总输出大小
        if command -v awk &> /dev/null; then
            total_size=$(grep "Download Size:" "$DETAIL_FILE" | awk '{sum += $3} END {printf "%.2f", sum}' | sed 's/MB//')
            total_time=$(grep "Duration:" "$DETAIL_FILE" | awk '{sum += $2} END {printf "%.0f", sum}' | sed 's/ms//')
        fi
    fi
    
    local success_rate=0
    local avg_latency=0
    
    if [ $total -gt 0 ]; then
        success_rate=$(echo "scale=2; $success * 100 / $total" | bc 2>/dev/null || echo "0")
        if [ "$total_time" != "" ] && [ "$total_time" != "0" ] && [ $success -gt 0 ]; then
            avg_latency=$(echo "scale=2; $total_time / $success" | bc 2>/dev/null || echo "0")
        fi
    fi
    
    {
        echo ""
        echo "=================================================="
        echo "全局统计汇总"
        echo "=================================================="
        echo "总请求数: $total"
        echo "成功请求: $success"
        echo "失败请求: $failed"
        echo "成功率: ${success_rate}%"
        echo ""
        echo "总输出数据: ${total_size}MB"
        echo "平均延迟: ${avg_latency}ms"
        echo ""
        echo "=================================================="
        echo "内存监控"
        echo "=================================================="
        echo "内存日志已保存至: $MEMORY_LOG"
        echo ""
        echo "建议使用以下命令查看Docker容器内存统计:"
        echo "  docker stats --no-stream flow-codeblock-go-dev"
        echo ""
        echo "=================================================="
        echo "测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=================================================="
    } >> "$SUMMARY_FILE"
    
    print_success "测试报告生成完成"
    print_stat "总请求数: $total"
    print_stat "成功率: ${success_rate}%"
    print_stat "总输出: ${total_size}MB"
    print_stat "平均延迟: ${avg_latency}ms"
    
    echo ""
    print_info "查看摘要报告: cat $SUMMARY_FILE"
    print_info "查看详细日志: cat $DETAIL_FILE"
    print_info "查看内存日志: cat $MEMORY_LOG"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║    Flow-CodeBlock Go 大输出并发压力测试                  ║"
    echo "║    每次请求返回12000个对象（约1-2MB）                    ║"
    echo "║    测试日期: $(date +%Y-%m-%d)                                ║"
    echo "║    测试时间: $(date +%H:%M:%S)                                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    init_test_env
    check_dependencies
    
    # 启动内存监控（后台）
    monitor_docker_memory &
    MONITOR_PID=$!
    trap "kill $MONITOR_PID 2>/dev/null || true" EXIT
    
    print_warning "即将开始大输出并发压力测试"
    print_info "内存监控已启动 (PID: $MONITOR_PID)"
    print_info "预计总时间: 约3-5分钟（已优化）"
    print_info "按 Ctrl+C 可随时中断测试"
    echo ""
    read -p "按 Enter 键开始测试..." -t 5 || true
    echo ""
    
    # 执行所有测试
    test_single_large_output
    sleep 2
    
    test_low_concurrency
    sleep 2
    
    test_medium_concurrency
    sleep 3
    
    test_high_concurrency
    sleep 3
    
    test_sustained_load
    sleep 3
    
    test_extreme_concurrency
    
    # 停止内存监控
    if [ -n "$MONITOR_PID" ]; then
        kill $MONITOR_PID 2>/dev/null || true
    fi
    
    # 生成报告
    generate_final_report
    
    print_header "大输出并发压力测试完成"
    print_success "所有测试已完成！"
    
    # 显示最终Docker内存状态
    echo ""
    print_header "当前Docker容器内存状态"
    docker stats --no-stream flow-codeblock-go-dev 2>/dev/null || print_warning "无法获取Docker容器状态"
    
    # 显示摘要
    echo ""
    echo -e "${CYAN}========== 测试摘要 ==========${NC}"
    cat "$SUMMARY_FILE"
}

# 捕获退出信号
cleanup() {
    echo ''
    print_warning '测试被中断，正在清理...'
    
    # 停止内存监控
    if [ -n "$MONITOR_PID" ]; then
        kill $MONITOR_PID 2>/dev/null || true
        wait $MONITOR_PID 2>/dev/null || true
    fi
    
    # 尝试终止所有子进程
    pkill -P $$ 2>/dev/null || true
    
    # 等待子进程退出
    sleep 2
    
    # 强制终止仍在运行的子进程
    pkill -9 -P $$ 2>/dev/null || true
    
    print_info "正在生成报告..."
    generate_final_report 2>/dev/null || print_warning "报告生成失败"
    
    print_success "清理完成"
    exit 1
}

trap cleanup INT TERM

# 执行主函数
main

