#!/bin/bash

# ====================================================================================
# Flow-CodeBlock Go版本 - 本地开发环境快速启动脚本
# ====================================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 配置文件
COMPOSE_FILE="docker-compose.yml"

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

function print_section() {
    echo ""
    echo -e "${CYAN}=========================================="
    echo -e "  $1"
    echo -e "==========================================${NC}"
    echo ""
}

# 标题
print_section "Flow-CodeBlock Go 本地开发环境"

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

print_success "Docker 环境正常"
echo ""

# 2. 检查配置文件
print_info "检查配置文件..."
if [ ! -f "$COMPOSE_FILE" ]; then
    print_error "找不到 $COMPOSE_FILE"
    exit 1
fi
print_success "配置文件存在"
echo ""

# 3. 检查是否已有容器在运行
print_info "检查现有容器..."
if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    print_warning "检测到正在运行的容器"
    echo ""
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    read -p "是否停止并重新启动？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "停止现有容器..."
        docker-compose -f "$COMPOSE_FILE" down
        print_success "容器已停止"
    else
        print_warning "保持现有容器运行"
        exit 0
    fi
fi
echo ""

# 4. 构建镜像
print_section "构建 Docker 镜像"
print_info "开始构建..."
if docker-compose -f "$COMPOSE_FILE" build; then
    print_success "镜像构建完成"
else
    print_error "镜像构建失败"
    exit 1
fi
echo ""

# 5. 启动服务
print_section "启动服务"
print_info "启动 MySQL, Redis 和 Go 服务..."
if docker-compose -f "$COMPOSE_FILE" up -d; then
    print_success "服务启动成功"
else
    print_error "服务启动失败"
    exit 1
fi
echo ""

# 6. 等待服务就绪
print_section "等待服务就绪"
print_info "等待 MySQL 启动（最多60秒）..."
for i in {1..60}; do
    if docker exec flow-mysql-dev mysqladmin ping -h localhost -u flow_user -pflow_password_dev &> /dev/null; then
        print_success "MySQL 已就绪"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 60 ]; then
        echo ""
        print_warning "MySQL 启动超时"
    fi
done
echo ""

print_info "等待 Redis 启动..."
for i in {1..30}; do
    if docker exec flow-redis-dev redis-cli -a flow_redis_dev ping &> /dev/null 2>&1; then
        print_success "Redis 已就绪"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo ""
        print_warning "Redis 启动超时"
    fi
done
echo ""

print_info "等待 Go 服务启动（最多60秒）..."
for i in {1..60}; do
    if curl -sf http://localhost:3002/health > /dev/null 2>&1; then
        print_success "Go 服务已就绪"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 60 ]; then
        echo ""
        print_warning "Go 服务启动超时，请检查日志"
    fi
done
echo ""

# 7. 显示服务状态
print_section "服务状态"
docker-compose -f "$COMPOSE_FILE" ps
echo ""

# 8. 健康检查
print_section "健康检查"
HEALTH_RESPONSE=$(curl -s http://localhost:3002/health)
echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# 9. 显示有用信息
print_section "🎉 开发环境启动完成"

echo "📝 服务信息:"
echo ""
echo "  🚀 Go 服务:"
echo "     地址: http://localhost:3002"
echo ""
echo "  🗄️  MySQL:"
echo "     主机: localhost:3306"
echo "     数据库: flow_codeblock_go"
echo "     用户名: flow_user"
echo "     密码: flow_password_dev"
echo ""
echo "  💾 Redis:"
echo "     主机: localhost:6379"
echo "     密码: flow_redis_dev"
echo ""

print_section "📚 常用命令"

echo "  查看日志（所有服务）:"
echo "    docker-compose logs -f"
echo ""
echo "  查看日志（Go服务）:"
echo "    docker-compose logs -f flow-codeblock-go-dev"
echo ""
echo "  查看日志（MySQL）:"
echo "    docker-compose logs -f flow-mysql-dev"
echo ""
echo "  查看日志（Redis）:"
echo "    docker-compose logs -f flow-redis-dev"
echo ""
echo "  健康检查:"
echo "    curl http://localhost:3002/health | jq ."
echo ""
echo "  系统状态（需要 ADMIN_TOKEN）:"
echo "    curl -H \"accessToken: 9560D6C9-264A-45E4-B8BF-BF4957860484\" \\"
echo "         http://localhost:3002/flow/health | jq ."
echo ""
echo "  执行代码测试:"
echo "    curl -X POST http://localhost:3002/flow/codeblock \\"
echo "         -H \"Content-Type: application/json\" \\"
echo "         -H \"accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e\" \\"
echo "         -d '{\"code\": \"console.log(\\\"Hello World\\\")\", \"input\": {}}' | jq ."
echo ""
echo "  停止服务:"
echo "    docker-compose stop"
echo ""
echo "  停止并删除容器:"
echo "    docker-compose down"
echo ""
echo "  停止并删除容器和数据:"
echo "    docker-compose down -v"
echo ""
echo "  重启服务:"
echo "    docker-compose restart"
echo ""

print_section "🔧 开发提示"

echo "  1. 开发环境已启用 console 输出（ALLOW_CONSOLE=true）"
echo "  2. 开发环境使用 debug 模式（GIN_MODE=debug）"
echo "  3. 开发环境不会自动重启（restart=no）"
echo "  4. 资源限制较宽松，适合本地测试"
echo "  5. 使用简单密码，不要用于生产环境"
echo ""

print_section "⚠️  安全提醒"

echo "  ⚠️  开发环境配置"
echo "  - ADMIN_TOKEN: 9560D6C9-264A-45E4-B8BF-BF4957860484"
echo "  - 仅用于本地开发测试"
echo "  - 绝不暴露到公网"
echo "  - 生产环境请使用 docker-compose.prod.yml"
echo ""

print_success "开发环境已就绪，开始编码吧！🚀"
echo ""


