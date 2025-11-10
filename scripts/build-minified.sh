#!/bin/bash

###############################################################################
# Flow-CodeBlock 前端代码混淆和压缩构建脚本
#
# 功能：
#   1. 安装必要的 npm 依赖
#   2. 运行混淆和压缩脚本
#   3. 生成压缩后的 HTML 文件
#   4. 可选：自动替换原文件并重新生成 embedded.go
#
# 使用方法：
#   ./scripts/build-minified.sh          # 只生成压缩文件
#   ./scripts/build-minified.sh --apply  # 生成并应用压缩文件
###############################################################################

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查是否在项目根目录
if [ ! -f "go.mod" ]; then
    print_error "请在项目根目录运行此脚本"
    exit 1
fi

print_info "开始构建混淆和压缩的前端代码..."
echo ""

# 1. 检查 Node.js 和 npm
print_info "检查 Node.js 和 npm..."
if ! command -v node &> /dev/null; then
    print_error "未找到 Node.js，请先安装 Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "未找到 npm，请先安装 npm"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js $NODE_VERSION, npm $NPM_VERSION"
echo ""

# 2. 安装依赖
print_info "安装 npm 依赖..."
npm install --silent
print_success "依赖安装完成"
echo ""

# 3. 运行混淆和压缩
print_info "运行混淆和压缩脚本..."
npm run minify
echo ""

# 4. 检查是否需要应用
APPLY_CHANGES=false
if [ "$1" == "--apply" ] || [ "$1" == "-a" ]; then
    APPLY_CHANGES=true
fi

if [ "$APPLY_CHANGES" = true ]; then
    print_warning "准备应用压缩后的文件..."
    
    # 确认操作
    read -p "$(echo -e ${YELLOW}是否确认替换原文件？这将覆盖 templates/test-tool.html [y/N]: ${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 备份原文件（额外备份）
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="templates/test-tool.html.backup.$TIMESTAMP"
        cp templates/test-tool.html "$BACKUP_FILE"
        print_success "额外备份已创建: $BACKUP_FILE"
        
        # 替换文件
        cp templates/test-tool.min.html templates/test-tool.html
        print_success "已替换为压缩后的文件"
        
        # 重新生成 embedded.go
        print_info "重新生成 embedded.go..."
        go generate ./assets
        print_success "embedded.go 已更新"
        
        # 显示文件大小对比
        echo ""
        print_info "文件大小对比:"
        ls -lh "$BACKUP_FILE" templates/test-tool.html templates/test-tool.min.html | awk '{print $5, $9}'
        
        echo ""
        print_success "✨ 构建完成并已应用！"
        print_info "原文件备份: $BACKUP_FILE"
        print_info "如需恢复: cp $BACKUP_FILE templates/test-tool.html && go generate ./assets"
    else
        print_warning "已取消应用操作"
        print_info "压缩文件位置: templates/test-tool.min.html"
        print_info "手动应用: cp templates/test-tool.min.html templates/test-tool.html && go generate ./assets"
    fi
else
    print_success "✨ 构建完成！"
    echo ""
    print_info "压缩文件已生成: templates/test-tool.min.html"
    print_info "原始文件备份: templates/test-tool.html.backup"
    echo ""
    print_warning "下一步操作:"
    echo "  1. 测试压缩后的文件: 在浏览器中打开测试工具页面"
    echo "  2. 确认无误后应用: ./scripts/build-minified.sh --apply"
    echo "  3. 或手动应用:"
    echo "     cp templates/test-tool.min.html templates/test-tool.html"
    echo "     go generate ./assets"
fi

echo ""



