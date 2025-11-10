#!/bin/bash
# Flow-CodeBlock - 自定义Logo初始化脚本
# 用途：自动创建logo目录并提供使用说明

set -e

echo "================================================"
echo "Flow-CodeBlock 自定义Logo初始化脚本"
echo "================================================"
echo ""

# 检测环境
if [ -f ".env" ]; then
    echo "✅ 检测到 .env 文件"
    source .env 2>/dev/null || true
else
    echo "⚠️  未找到 .env 文件，使用默认配置"
fi

# 获取当前脚本所在目录的父目录（项目根目录）
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "📁 项目根目录: $PROJECT_ROOT"
echo ""

# 方案选择
echo "请选择 Logo 配置方案："
echo ""
echo "1️⃣  使用外部 URL（推荐，适合 CDN）"
echo "   - 无需本地文件"
echo "   - 修改 .env 中的 CUSTOM_LOGO_URL 即可"
echo ""
echo "2️⃣  使用项目内文件（简单，无需卷挂载）"
echo "   - 将 logo 放到 assets/elements/ 目录"
echo "   - 修改 .env 中的 CUSTOM_LOGO_PATH=assets/elements/your-logo.png"
echo ""
echo "3️⃣  使用外部卷挂载（适合动态更换）"
echo "   - 创建独立的 logos 目录"
echo "   - 需要配置 docker-compose 卷挂载"
echo ""

read -p "请输入选项 [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "✅ 选择方案1：外部 URL"
        echo ""
        echo "请按以下步骤操作："
        echo "1. 将 logo 上传到 CDN 或图床"
        echo "2. 编辑 .env 文件，设置："
        echo "   CUSTOM_LOGO_URL=https://your-cdn.com/logo.png"
        echo "3. 重启服务：docker-compose restart"
        echo ""
        ;;
    
    2)
        echo ""
        echo "✅ 选择方案2：项目内文件"
        echo ""
        
        # 创建目标目录（如果不存在）
        ASSETS_DIR="$PROJECT_ROOT/assets/elements"
        if [ ! -d "$ASSETS_DIR" ]; then
            mkdir -p "$ASSETS_DIR"
            echo "✅ 创建目录: $ASSETS_DIR"
        else
            echo "✅ 目录已存在: $ASSETS_DIR"
        fi
        
        echo ""
        echo "请按以下步骤操作："
        echo "1. 将你的 logo 文件复制到："
        echo "   $ASSETS_DIR/custom-logo.png"
        echo ""
        echo "   示例命令："
        echo "   cp /path/to/your-logo.png $ASSETS_DIR/custom-logo.png"
        echo ""
        echo "2. 编辑 .env 文件，设置："
        echo "   CUSTOM_LOGO_PATH=assets/elements/custom-logo.png"
        echo ""
        echo "3. 重启服务：docker-compose restart"
        echo ""
        ;;
    
    3)
        echo ""
        echo "✅ 选择方案3：外部卷挂载"
        echo ""
        
        # 检测是否为生产环境
        if [ "$ENVIRONMENT" = "production" ]; then
            LOGOS_DIR="/data/logos"
            COMPOSE_FILE="docker-compose.prod.yml"
        else
            LOGOS_DIR="$PROJECT_ROOT/logos"
            COMPOSE_FILE="docker-compose.yml"
        fi
        
        # 创建目录
        if [ ! -d "$LOGOS_DIR" ]; then
            mkdir -p "$LOGOS_DIR"
            echo "✅ 创建目录: $LOGOS_DIR"
        else
            echo "✅ 目录已存在: $LOGOS_DIR"
        fi
        
        echo ""
        echo "请按以下步骤操作："
        echo ""
        echo "1. 将你的 logo 文件复制到："
        echo "   $LOGOS_DIR/company-logo.png"
        echo ""
        echo "   示例命令："
        echo "   cp /path/to/your-logo.png $LOGOS_DIR/company-logo.png"
        echo ""
        echo "2. 编辑 $COMPOSE_FILE，取消注释卷挂载："
        echo "   volumes:"
        if [ "$ENVIRONMENT" = "production" ]; then
            echo "     - /data/logos:/app/logos:ro"
        else
            echo "     - ./logos:/app/logos:ro"
        fi
        echo ""
        echo "3. 编辑 .env 文件，设置："
        echo "   CUSTOM_LOGO_PATH=/app/logos/company-logo.png"
        echo ""
        echo "4. 重启服务："
        echo "   docker-compose -f $COMPOSE_FILE down"
        echo "   docker-compose -f $COMPOSE_FILE up -d"
        echo ""
        ;;
    
    *)
        echo "❌ 无效选项，退出"
        exit 1
        ;;
esac

echo "================================================"
echo "✨ 配置说明已显示"
echo "================================================"
echo ""
echo "💡 提示："
echo "- 推荐图片格式: PNG（支持透明背景）"
echo "- 推荐尺寸: 高度 70px 左右，宽度自适应"
echo "- 推荐大小: < 500KB"
echo ""
echo "📚 详细文档: README.md - 测试工具配置部分"
echo ""
