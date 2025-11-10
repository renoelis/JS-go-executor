#!/bin/bash

# ============================================================================
# Flow-CodeBlock Go 生产环境快速压力测试脚本
# ============================================================================
# 用于快速验证系统性能和限流功能
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置
API_URL="https://api.renoelis.top/flow/codeblock"
RESULTS_FILE="quick_stress_$(date +%Y%m%d_%H%M%S).log"

# Token池
TOKENS=(
    "flow_858f92813b1240a1b53c099b50f4322861a5eab65544f9f947570f48eebfab1b"
    "flow_0a1020832701485dab5509fe3f680e1a34a424a305b4c2c8f56bcc971c7729d2"
    "flow_ca2a5416c9624421a991a0f2119c684dd32fb82c6f7d361954292182cd923558"
    "flow_44c400fd7d4044f38ecf97044eebb7cbefefd28dfee9569fcd9495d62c394e3c"
    "flow_d2c2dcf1854742ac9054d1025a782702b4f61662f6aed50d6e0c0f38871aecc7"
)

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

# 快速测试：高并发突发
test_burst_concurrent() {
    print_header "快速测试：高并发突发 (测试限流)"
    
    local concurrency=5
    local requests_per_worker=15
    local total=$((concurrency * requests_per_worker))
    
    print_info "并发数: $concurrency"
    print_info "总请求: $total"
    print_info "目标: 快速突发，触发限流"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    
    # 并发发送
    for i in $(seq 0 $((concurrency - 1))); do
        (
            local token="${TOKENS[$i]}"
            local success=0
            local rate_limited=0
            local failed=0
            
            for j in $(seq 1 $requests_per_worker); do
                response=$(curl -s -w "\n%{http_code}" --max-time 30 \
                    --location "$API_URL" \
                    --header "accessToken: $token" \
                    --header "Content-Type: application/json" \
                    --data '{"input": {"a": 10, "b": 20}, "codebase64": "cmV0dXJuIHsgcmVzdWx0OiBpbnB1dC5hICsgaW5wdXQuYiwgdGltZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH07"}' \
                    2>&1)
                
                http_code=$(echo "$response" | tail -n 1)
                
                if [ "$http_code" = "200" ]; then
                    success=$((success + 1))
                elif [ "$http_code" = "429" ]; then
                    rate_limited=$((rate_limited + 1))
                else
                    failed=$((failed + 1))
                fi
            done
            
            echo "$success $rate_limited $failed" > "$temp_dir/result_$i.txt"
        ) &
    done
    
    wait
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 统计结果
    local total_success=0
    local total_rate_limited=0
    local total_failed=0
    
    for i in $(seq 0 $((concurrency - 1))); do
        if [ -f "$temp_dir/result_$i.txt" ]; then
            read success rate_limited failed < "$temp_dir/result_$i.txt"
            total_success=$((total_success + success))
            total_rate_limited=$((total_rate_limited + rate_limited))
            total_failed=$((total_failed + failed))
        fi
    done
    
    rm -rf "$temp_dir"
    
    local qps=$(echo "scale=2; $total / $duration" | bc)
    
    print_success "测试完成"
    echo ""
    print_info "总请求: $total"
    print_success "成功: $total_success"
    print_warning "限流: $total_rate_limited"
    print_error "失败: $total_failed"
    print_info "耗时: ${duration}秒"
    print_info "QPS: $qps"
    
    {
        echo "=== 高并发突发测试 ==="
        echo "时间: $(date)"
        echo "总请求: $total"
        echo "成功: $total_success"
        echo "限流: $total_rate_limited"
        echo "失败: $total_failed"
        echo "耗时: ${duration}秒"
        echo "QPS: $qps"
        echo ""
    } >> "$RESULTS_FILE"
    
    if [ $total_rate_limited -gt 0 ]; then
        print_success "✅ 限流功能工作正常"
    fi
}

# 快速测试：持续负载
test_sustained_load() {
    print_header "快速测试：持续负载 (60秒)"
    
    local duration_seconds=60
    local concurrency=3
    
    print_info "持续时间: ${duration_seconds}秒"
    print_info "并发数: $concurrency"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration_seconds))
    local temp_dir=$(mktemp -d)
    
    for i in $(seq 0 $((concurrency - 1))); do
        (
            local token="${TOKENS[$i]}"
            local success=0
            local failed=0
            
            while [ $(date +%s) -lt $end_time ]; do
                response=$(curl -s -w "\n%{http_code}" --max-time 30 \
                    --location "$API_URL" \
                    --header "accessToken: $token" \
                    --header "Content-Type: application/json" \
                    --data '{"input": {}, "codebase64": "Y29uc3QgeyBmb3JtYXQgfSA9IHJlcXVpcmUoJ2RhdGUtZm5zJyk7IHJldHVybiB7IHRpbWU6IGZvcm1hdChuZXcgRGF0ZSgpLCAneXl5eS1NTS1kZCBISDptbTpzcycpIH07"}' \
                    2>&1)
                
                http_code=$(echo "$response" | tail -n 1)
                
                if [ "$http_code" = "200" ]; then
                    success=$((success + 1))
                else
                    failed=$((failed + 1))
                fi
                
                sleep 0.5
            done
            
            echo "$success $failed" > "$temp_dir/result_$i.txt"
        ) &
    done
    
    # 进度条
    while [ $(date +%s) -lt $end_time ]; do
        local elapsed=$(($(date +%s) - start_time))
        local remaining=$((duration_seconds - elapsed))
        echo -ne "\r  运行中... ${elapsed}s / ${duration_seconds}s (剩余: ${remaining}s)  "
        sleep 2
    done
    echo ""
    
    wait
    
    # 统计结果
    local total_success=0
    local total_failed=0
    
    for i in $(seq 0 $((concurrency - 1))); do
        if [ -f "$temp_dir/result_$i.txt" ]; then
            read success failed < "$temp_dir/result_$i.txt"
            total_success=$((total_success + success))
            total_failed=$((total_failed + failed))
        fi
    done
    
    rm -rf "$temp_dir"
    
    local total_requests=$((total_success + total_failed))
    local avg_qps=$(echo "scale=2; $total_requests / $duration_seconds" | bc)
    local success_rate=$(echo "scale=2; $total_success * 100 / $total_requests" | bc)
    
    print_success "测试完成"
    echo ""
    print_info "总请求: $total_requests"
    print_success "成功: $total_success"
    print_error "失败: $total_failed"
    print_info "成功率: ${success_rate}%"
    print_info "平均QPS: $avg_qps"
    
    {
        echo "=== 持续负载测试 (60秒) ==="
        echo "时间: $(date)"
        echo "总请求: $total_requests"
        echo "成功: $total_success"
        echo "失败: $total_failed"
        echo "成功率: ${success_rate}%"
        echo "平均QPS: $avg_qps"
        echo ""
    } >> "$RESULTS_FILE"
}

# 快速测试：各种代码类型
test_code_types() {
    print_header "快速测试：多种代码类型"
    
    # 使用数组而不是关联数组，避免中文键名问题
    local code_names=("simple_calc" "date_format" "lodash" "crypto" "uuid")
    local code_labels=("简单计算" "Date格式化" "Lodash" "Crypto" "UUID")
    local code_base64=(
        "cmV0dXJuIHsgcmVzdWx0OiBNYXRoLnBvdygyLCAxMCkgfTs="
        "Y29uc3QgeyBmb3JtYXQgfSA9IHJlcXVpcmUoJ2RhdGUtZm5zJyk7IHJldHVybiB7IHRpbWU6IGZvcm1hdChuZXcgRGF0ZSgpLCAneXl5eS1NTS1kZCcpIH07"
        "Y29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpOyByZXR1cm4geyBjaHVuazogXy5jaHVuayhbMSwgMiwgMywgNF0sIDIpIH07"
        "Y29uc3QgQ3J5cHRvSlMgPSByZXF1aXJlKCdjcnlwdG8tanMnKTsgcmV0dXJuIHsgaGFzaDogQ3J5cHRvSlMuU0hBMjU2KCd0ZXN0JykudG9TdHJpbmcoKSB9Ow=="
        "Y29uc3QgeyB2NCB9ID0gcmVxdWlyZSgndXVpZCcpOyByZXR1cm4geyB1dWlkOiB2NCgpIH07"
    )
    
    local token="${TOKENS[0]}"
    local total=0
    local success=0
    local failed=0
    
    for idx in "${!code_names[@]}"; do
        local code_name="${code_names[$idx]}"
        local code_label="${code_labels[$idx]}"
        local code="${code_base64[$idx]}"
        
        print_info "测试: $code_label"
        
        for i in {1..3}; do
            response=$(curl -s -w "\n%{http_code}" --max-time 30 \
                --location "$API_URL" \
                --header "accessToken: $token" \
                --header "Content-Type: application/json" \
                --data "{\"input\": {}, \"codebase64\": \"$code\"}" \
                2>&1)
            
            http_code=$(echo "$response" | tail -n 1)
            total=$((total + 1))
            
            if [ "$http_code" = "200" ]; then
                success=$((success + 1))
            else
                failed=$((failed + 1))
            fi
            
            sleep 0.3
        done
    done
    
    print_success "测试完成"
    echo ""
    print_info "总请求: $total"
    print_success "成功: $success"
    print_error "失败: $failed"
    
    {
        echo "=== 多种代码类型测试 ==="
        echo "时间: $(date)"
        echo "代码类型: ${#code_names[@]}"
        echo "总请求: $total"
        echo "成功: $success"
        echo "失败: $failed"
        echo ""
    } >> "$RESULTS_FILE"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║    Flow-CodeBlock Go 快速压力测试                        ║"
    echo "║    测试时间: $(date '+%Y-%m-%d %H:%M:%S')                      ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_info "结果将保存到: $RESULTS_FILE"
    print_info "预计总时间: 约2-3分钟"
    echo ""
    
    # 初始化结果文件
    {
        echo "Flow-CodeBlock Go 快速压力测试报告"
        echo "测试时间: $(date)"
        echo "=========================================="
        echo ""
    } > "$RESULTS_FILE"
    
    # 执行测试
    test_burst_concurrent
    sleep 2
    
    test_code_types
    sleep 2
    
    test_sustained_load
    
    print_header "测试完成"
    print_success "所有快速测试已完成！"
    print_info "查看详细结果: cat $RESULTS_FILE"
    
    echo ""
    echo -e "${CYAN}========== 测试摘要 ==========${NC}"
    cat "$RESULTS_FILE"
}

# 执行
main

