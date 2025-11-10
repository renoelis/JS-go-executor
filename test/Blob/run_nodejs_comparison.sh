#!/bin/bash

# Node.js 环境对比测试脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

function print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_section() {
    echo ""
    echo -e "${CYAN}=========================================="
    echo -e "  $1"
    echo -e "==========================================${NC}"
    echo ""
}

print_section "Node.js 环境对比测试"

# 检查 Node.js 版本
print_info "检查 Node.js 版本..."
NODE_VERSION=$(node --version)
print_success "Node.js 版本: $NODE_VERSION"

# 运行测试
print_section "运行测试"
print_info "执行 blob_refinement_test.js..."

node test/Blob/blob_refinement_test.js

print_section "测试完成"
