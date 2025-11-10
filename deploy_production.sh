#!/bin/bash

# ====================================================================================
# Flow-CodeBlock Go版本 - 生产环境一键部署脚本
# ====================================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置文件
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# 打印函数
function print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 标题
echo ""
echo "=========================================="
echo "  Flow-CodeBlock Go 生产环境部署"
echo "=========================================="
echo ""

# 1. 检查 Docker
print_info "检查 Docker 环境..."
if ! command -v docker &> /dev/null; then
    print_error "Docker 未安装！请先安装 Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose 未安装！请先安装 Docker Compose"
    exit 1
fi

print_success "Docker 环境检查通过"
echo "  Docker 版本: $(docker --version)"
echo "  Docker Compose 版本: $(docker-compose --version)"
echo ""

# 2. 检查配置文件
print_info "检查配置文件..."
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "找不到 $COMPOSE_FILE"
    exit 1
fi
print_success "配置文件检查通过"
echo ""

# 3. 生成密码
print_info "生成安全密码..."

ADMIN_TOKEN=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 24)
REDIS_PASSWORD=$(openssl rand -base64 24)

print_success "密码生成完成"
echo ""

# 4. 显示密码
echo "=========================================="
echo "  🔒 请妥善保存以下密码"
echo "=========================================="
echo ""
echo "ADMIN_TOKEN:"
echo "  $ADMIN_TOKEN"
echo ""
echo "DB_PASSWORD:"
echo "  $DB_PASSWORD"
echo ""
echo "MYSQL_ROOT_PASSWORD:"
echo "  $MYSQL_ROOT_PASSWORD"
echo ""
echo "REDIS_PASSWORD:"
echo "  $REDIS_PASSWORD"
echo ""
echo "=========================================="
echo ""

# 5. 保存到文件
print_info "保存密码到 .env.prod 文件..."
cat > "$ENV_FILE" <<EOF
# Flow-CodeBlock Go 生产环境密码
# 生成时间: $(date)
# ⚠️ 请妥善保管此文件，不要提交到版本控制！

ADMIN_TOKEN=$ADMIN_TOKEN
DB_PASSWORD=$DB_PASSWORD
MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
EOF

chmod 600 "$ENV_FILE"
print_success "密码已保存到 $ENV_FILE (权限: 600)"
echo ""

# 6. 询问是否继续
read -p "是否继续部署？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "部署已取消"
    echo ""
    echo "密码已保存到 $ENV_FILE，您可以稍后手动部署："
    echo "  1. 编辑 $COMPOSE_FILE，替换密码"
    echo "  2. 运行: docker-compose -f $COMPOSE_FILE up -d"
    exit 0
fi
echo ""

# 7. 创建网络（如果不存在）
print_info "检查 Docker 网络..."
if ! docker network inspect api-proxy_proxy_net &> /dev/null; then
    print_warning "网络 api-proxy_proxy_net 不存在"
    read -p "是否创建网络？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker network create api-proxy_proxy_net
        print_success "网络创建成功"
    else
        print_error "需要网络才能部署，已取消"
        exit 1
    fi
else
    print_success "网络已存在"
fi
echo ""

# 8. 询问是否自动替换密码
read -p "是否自动替换 docker-compose.prod.yml 中的密码？(推荐) (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "备份原配置文件..."
    cp "$COMPOSE_FILE" "${COMPOSE_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    print_info "替换密码..."
    # 使用临时文件避免 sed 在 macOS 上的差异
    sed -e "s/ADMIN_TOKEN=PLEASE_CHANGE_THIS_IN_PRODUCTION_USE_STRONG_RANDOM_TOKEN/ADMIN_TOKEN=$ADMIN_TOKEN/" \
        -e "s/DB_PASSWORD=flow_password_2024/DB_PASSWORD=$DB_PASSWORD/g" \
        -e "s/MYSQL_PASSWORD=flow_password_2024/MYSQL_PASSWORD=$DB_PASSWORD/" \
        -e "s/MYSQL_ROOT_PASSWORD=root_password_2024/MYSQL_ROOT_PASSWORD=$MYSQL_ROOT_PASSWORD/" \
        -e "s/REDIS_PASSWORD=flow_redis_2024/REDIS_PASSWORD=$REDIS_PASSWORD/g" \
        -e "s/-a flow_redis_2024/-a $REDIS_PASSWORD/" \
        -e "s/--requirepass flow_redis_2024/--requirepass $REDIS_PASSWORD/" \
        -e "s/-pflow_password_2024/-p$DB_PASSWORD/" \
        "$COMPOSE_FILE" > "${COMPOSE_FILE}.tmp"
    mv "${COMPOSE_FILE}.tmp" "$COMPOSE_FILE"
    
    print_success "密码替换完成"
    echo ""
else
    print_warning "请手动编辑 $COMPOSE_FILE 替换密码"
    echo "参考 $ENV_FILE 中的密码"
    echo ""
    read -p "按回车键继续..."
fi

# 9. 构建镜像
print_info "构建 Docker 镜像..."
docker-compose -f "$COMPOSE_FILE" build
print_success "镜像构建完成"
echo ""

# 10. 启动服务
print_info "启动服务..."
docker-compose -f "$COMPOSE_FILE" up -d
print_success "服务启动完成"
echo ""

# 11. 等待服务就绪
print_info "等待服务就绪（最多60秒）..."
for i in {1..60}; do
    if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
        print_success "服务已就绪！"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 60 ]; then
        echo ""
        print_warning "服务启动超时，请检查日志"
    fi
done
echo ""

# 12. 健康检查
print_info "执行健康检查..."
HEALTH_STATUS=$(curl -s http://localhost:3002/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
if [ "$HEALTH_STATUS" = "healthy" ]; then
    print_success "健康检查通过: $HEALTH_STATUS"
else
    print_warning "健康检查状态: $HEALTH_STATUS"
fi
echo ""

# 13. 显示服务状态
print_info "服务状态:"
docker-compose -f "$COMPOSE_FILE" ps
echo ""

# 14. 完成提示
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
echo ""
echo "📝 重要信息："
echo ""
echo "1. 管理员 Token (用于访问管理接口):"
echo "   $ADMIN_TOKEN"
echo ""
echo "2. 服务地址:"
echo "   http://localhost:3002"
echo ""
echo "3. 健康检查:"
echo "   curl http://localhost:3002/health"
echo ""
echo "4. 管理接口示例:"
echo "   curl -H \"accessToken: $ADMIN_TOKEN\" \\"
echo "        http://localhost:3002/flow/health | jq ."
echo ""
echo "5. 查看日志:"
echo "   docker-compose -f $COMPOSE_FILE logs -f"
echo ""
echo "6. 停止服务:"
echo "   docker-compose -f $COMPOSE_FILE stop"
echo ""
echo "7. 重启服务:"
echo "   docker-compose -f $COMPOSE_FILE restart"
echo ""
echo "=========================================="
echo "  ⚠️  安全提示"
echo "=========================================="
echo ""
echo "1. 密码已保存到: $ENV_FILE"
echo "2. 原配置已备份（如有修改）"
echo "3. 请将 $ENV_FILE 添加到 .gitignore"
echo "4. 定期更换密码（建议 3-6 个月）"
echo "5. 启用 HTTPS (使用 Nginx 反向代理)"
echo "6. 配置防火墙限制访问"
echo ""
echo "详细文档: PRODUCTION_DEPLOYMENT.md"
echo ""


