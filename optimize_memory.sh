#!/bin/bash

# ============================================================================
# 内存优化脚本
# ============================================================================
# 用途: 快速应用内存优化配置并重启服务
# 使用: ./optimize_memory.sh [--aggressive]
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

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

# 检查.env文件是否存在
check_env_file() {
    if [ ! -f .env ]; then
        print_error ".env 文件不存在"
        print_info "请从 .env.example 复制一份："
        print_info "  cp .env.example .env"
        exit 1
    fi
}

# 备份当前配置
backup_env() {
    local backup_file=".env.backup.$(date +%Y%m%d_%H%M%S)"
    cp .env "$backup_file"
    print_success "已备份当前配置到: $backup_file"
}

# 检查当前内存使用
check_memory() {
    print_header "检查当前内存使用"
    
    if docker ps | grep -q flow-codeblock-go-dev; then
        local mem_info=$(docker stats --no-stream --format "{{.MemUsage}}" flow-codeblock-go-dev 2>/dev/null)
        print_info "当前内存使用: $mem_info"
        
        # 提取使用百分比
        local mem_percent=$(docker stats --no-stream --format "{{.MemPerc}}" flow-codeblock-go-dev 2>/dev/null | sed 's/%//')
        
        if (( $(echo "$mem_percent > 75" | bc -l) )); then
            print_warning "内存使用率较高: ${mem_percent}%"
            print_warning "建议重启容器以清理内存"
            return 1
        else
            print_success "内存使用率正常: ${mem_percent}%"
            return 0
        fi
    else
        print_warning "容器未运行"
        return 0
    fi
}

# 应用优化配置
apply_optimization() {
    local mode=$1  # standard 或 aggressive
    
    print_header "应用内存优化配置"
    
    if [ "$mode" = "aggressive" ]; then
        print_warning "使用激进模式 (适合低内存环境)"
        
        # Runtime池配置 (激进)
        sed -i.bak 's/^RUNTIME_POOL_SIZE=.*/RUNTIME_POOL_SIZE=20/' .env
        sed -i.bak 's/^MIN_RUNTIME_POOL_SIZE=.*/MIN_RUNTIME_POOL_SIZE=10/' .env
        sed -i.bak 's/^MAX_RUNTIME_POOL_SIZE=.*/MAX_RUNTIME_POOL_SIZE=30/' .env
        
        # GC配置 (激进)
        sed -i.bak 's/^GOGC=.*/GOGC=50/' .env
        sed -i.bak 's/^GOMEMLIMIT=.*/GOMEMLIMIT=1800MiB/' .env
        sed -i.bak 's/^GC_TRIGGER_INTERVAL=.*/GC_TRIGGER_INTERVAL=8/' .env
        sed -i.bak 's/^MAX_RUNTIME_REUSE_COUNT=.*/MAX_RUNTIME_REUSE_COUNT=1/' .env
        
        print_info "已应用激进优化配置："
        print_info "  - Runtime池: 20-30 (节省约1.2GB)"
        print_info "  - GOGC: 50 (更频繁GC)"
        print_info "  - GOMEMLIMIT: 1800MiB"
        print_info "  - GC触发间隔: 8"
        
    else
        print_info "使用标准模式 (平衡性能和内存)"
        
        # Runtime池配置 (标准)
        sed -i.bak 's/^RUNTIME_POOL_SIZE=.*/RUNTIME_POOL_SIZE=30/' .env
        sed -i.bak 's/^MIN_RUNTIME_POOL_SIZE=.*/MIN_RUNTIME_POOL_SIZE=20/' .env
        sed -i.bak 's/^MAX_RUNTIME_POOL_SIZE=.*/MAX_RUNTIME_POOL_SIZE=50/' .env
        
        # GC配置 (标准)
        sed -i.bak 's/^GOGC=.*/GOGC=75/' .env
        sed -i.bak 's/^GOMEMLIMIT=.*/GOMEMLIMIT=1800MiB/' .env
        sed -i.bak 's/^GC_TRIGGER_INTERVAL=.*/GC_TRIGGER_INTERVAL=10/' .env
        sed -i.bak 's/^MAX_RUNTIME_REUSE_COUNT=.*/MAX_RUNTIME_REUSE_COUNT=2/' .env
        
        print_info "已应用标准优化配置："
        print_info "  - Runtime池: 30-50 (节省约1GB)"
        print_info "  - GOGC: 75 (适中的GC频率)"
        print_info "  - GOMEMLIMIT: 1800MiB"
        print_info "  - GC触发间隔: 10"
    fi
    
    # 删除sed的备份文件
    rm -f .env.bak
    
    print_success "配置已更新"
}

# 重启服务
restart_service() {
    print_header "重启服务"
    
    print_info "停止容器..."
    docker-compose down
    
    sleep 2
    
    print_info "启动容器（使用新配置）..."
    docker-compose up -d
    
    print_info "等待服务启动..."
    sleep 10
    
    # 等待健康检查通过
    local max_wait=30
    local count=0
    while [ $count -lt $max_wait ]; do
        if docker ps | grep -q flow-codeblock-go-dev; then
            local health=$(docker inspect --format='{{.State.Health.Status}}' flow-codeblock-go-dev 2>/dev/null || echo "none")
            if [ "$health" = "healthy" ]; then
                print_success "服务已启动并通过健康检查"
                return 0
            fi
        fi
        
        echo -ne "\r  等待健康检查... ${count}/${max_wait}秒"
        sleep 1
        count=$((count + 1))
    done
    
    echo ""
    print_warning "健康检查超时，请手动检查服务状态"
    print_info "  docker logs flow-codeblock-go-dev"
}

# 验证优化效果
verify_optimization() {
    print_header "验证优化效果"
    
    if ! docker ps | grep -q flow-codeblock-go-dev; then
        print_error "容器未运行"
        return 1
    fi
    
    sleep 3  # 等待内存稳定
    
    local mem_usage=$(docker stats --no-stream --format "{{.MemUsage}}" flow-codeblock-go-dev)
    local mem_percent=$(docker stats --no-stream --format "{{.MemPerc}}" flow-codeblock-go-dev | sed 's/%//')
    
    print_info "优化后内存使用: $mem_usage"
    print_info "内存使用率: ${mem_percent}%"
    
    if (( $(echo "$mem_percent < 50" | bc -l) )); then
        print_success "内存使用率优秀 (<50%)"
    elif (( $(echo "$mem_percent < 70" | bc -l) )); then
        print_success "内存使用率良好 (<70%)"
    else
        print_warning "内存使用率仍然较高 (>70%)"
        print_info "建议考虑增加容器内存限制或使用激进模式"
    fi
}

# 显示建议
show_recommendations() {
    print_header "后续建议"
    
    echo -e "${CYAN}1. 运行测试前，确认内存使用率 <50%${NC}"
    echo "   docker stats --no-stream flow-codeblock-go-dev"
    echo ""
    
    echo -e "${CYAN}2. 运行测试时，监控内存使用${NC}"
    echo "   watch -n 1 'docker stats --no-stream flow-codeblock-go-dev'"
    echo ""
    
    echo -e "${CYAN}3. 如果测试后内存仍然很高，手动重启${NC}"
    echo "   docker-compose restart flow-codeblock-go"
    echo ""
    
    echo -e "${CYAN}4. 查看详细分析报告${NC}"
    echo "   cat MEMORY_ANALYSIS_REPORT.md"
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║           Flow-CodeBlock Go 内存优化工具                 ║"
    echo "║           Memory Optimization Tool                       ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # 检查参数
    local mode="standard"
    if [ "$1" = "--aggressive" ]; then
        mode="aggressive"
        print_warning "使用激进模式"
    else
        print_info "使用标准模式 (如需激进模式，使用 --aggressive 参数)"
    fi
    
    echo ""
    
    # 执行优化流程
    check_env_file
    
    # 检查当前内存
    if check_memory; then
        read -p "$(echo -e ${CYAN}是否继续优化？[y/N]: ${NC})" -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "已取消"
            exit 0
        fi
    fi
    
    # 备份并应用优化
    backup_env
    apply_optimization "$mode"
    
    # 询问是否重启
    read -p "$(echo -e ${CYAN}是否立即重启服务以应用配置？[y/N]: ${NC})" -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        restart_service
        verify_optimization
    else
        print_warning "配置已更新，但未重启服务"
        print_info "请手动重启: docker-compose down && docker-compose up -d"
    fi
    
    # 显示建议
    show_recommendations
    
    print_success "优化完成！"
}

# 执行主函数
main "$@"





