#!/bin/bash

# ====================================================================================
# Flow-CodeBlock Go版本 - 本地开发环境重新部署脚本(包含统计功能)
# 功能: 删除数据卷 -> 重新部署 -> 初始化统计表
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
print_section "🔄 Flow-CodeBlock Go 重新部署(清空数据)"

# 确认操作
print_warning "此操作将删除所有数据卷(MySQL数据、Redis数据)!"
print_warning "这意味着所有Token、统计数据、限流记录都将被清空!"
echo ""
read -p "确认要继续吗？(yes/N): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    print_info "操作已取消"
    exit 0
fi
echo ""

# 1. 停止并删除所有容器和数据卷
print_section "停止服务并清理数据"
print_info "停止所有容器..."
docker-compose -f "$COMPOSE_FILE" down -v
print_success "容器和数据卷已删除"
echo ""

# 2. 清理未使用的镜像(可选)
print_info "是否清理未使用的Docker镜像？(可节省磁盘空间)"
read -p "清理未使用的镜像？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_info "清理未使用的镜像..."
    docker image prune -f
    print_success "镜像清理完成"
fi
echo ""

# 3. 构建镜像
print_section "构建 Docker 镜像"
print_info "开始构建..."
if docker-compose -f "$COMPOSE_FILE" build --no-cache; then
    print_success "镜像构建完成"
else
    print_error "镜像构建失败"
    exit 1
fi
echo ""

# 4. 启动服务
print_section "启动服务"
print_info "启动 MySQL, Redis 和 Go 服务..."
if docker-compose -f "$COMPOSE_FILE" up -d; then
    print_success "服务启动成功"
else
    print_error "服务启动失败"
    exit 1
fi
echo ""

# 5. 等待服务就绪
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
        print_error "MySQL 启动超时"
        exit 1
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

# 6. 初始化数据库表
print_section "初始化数据库表"

# 6.1 初始化基础表(Token表等)
print_info "初始化基础表..."
if docker exec -i flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go < scripts/init.sql; then
    print_success "基础表初始化完成"
else
    print_warning "基础表初始化可能已完成或有警告"
fi
echo ""

# 6.2 初始化统计表(新增)
print_info "初始化统计表..."
if docker exec -i flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go < scripts/stats_tables.sql; then
    print_success "统计表初始化完成"
else
    print_error "统计表初始化失败"
    print_info "请检查 scripts/stats_tables.sql 文件是否存在"
    exit 1
fi
echo ""

# 7. 验证表结构
print_section "验证数据库表"
print_info "检查已创建的表..."
TABLES=$(docker exec flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go -e "SHOW TABLES;" 2>/dev/null | grep -v "Tables_in")
echo "$TABLES"
echo ""

# 检查统计表是否存在
if echo "$TABLES" | grep -q "code_execution_stats" && \
   echo "$TABLES" | grep -q "module_usage_stats" && \
   echo "$TABLES" | grep -q "user_activity_stats"; then
    print_success "所有统计表已成功创建"
else
    print_warning "部分统计表可能未创建成功"
fi
echo ""

# 8. 等待 Go 服务启动
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
        echo ""
        print_info "查看日志:"
        echo "  docker-compose logs -f flow-codeblock-go"
        exit 1
    fi
done
echo ""

# 9. 显示服务状态
print_section "服务状态"
docker-compose -f "$COMPOSE_FILE" ps
echo ""

# 10. 健康检查
print_section "健康检查"
HEALTH_RESPONSE=$(curl -s http://localhost:3002/health)
echo "$HEALTH_RESPONSE" | jq . 2>/dev/null || echo "$HEALTH_RESPONSE"
echo ""

# 11. 测试统计功能
print_section "🧪 测试统计功能"
TODAY=$(date +%Y-%m-%d)

print_info "测试1: 查询今天的模块统计(应该返回空数据)..."
STATS_RESPONSE=$(curl -s -X GET "http://localhost:3002/flow/stats/modules?date=$TODAY" \
  -H "accessToken: dev_admin_token_for_testing_only")
echo "$STATS_RESPONSE" | jq . 2>/dev/null || echo "$STATS_RESPONSE"
echo ""

if echo "$STATS_RESPONSE" | grep -q '"success":true'; then
    print_success "统计API响应正常"
else
    print_warning "统计API可能未正常工作，请检查"
fi
echo ""

# 12. 显示有用信息
print_section "🎉 重新部署完成"

echo "📝 服务信息:"
echo ""
echo "  🚀 Go 服务:"
echo "     地址: http://localhost:3002"
echo "     管理Token: dev_admin_token_for_testing_only"
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

print_section "📊 统计功能测试"

echo "  测试统计API:"
echo "    ./test_stats_api.sh"
echo ""
echo "  查看模块统计:"
echo "    curl -X GET \"http://localhost:3002/flow/stats/modules?date=\$(date +%Y-%m-%d)\" \\"
echo "         -H \"accessToken: dev_admin_token_for_testing_only\" | jq ."
echo ""
echo "  查看用户统计:"
echo "    curl -X GET \"http://localhost:3002/flow/stats/users?date=\$(date +%Y-%m-%d)\" \\"
echo "         -H \"accessToken: dev_admin_token_for_testing_only\" | jq ."
echo ""

print_section "📚 常用命令"

echo "  查看日志（所有服务）:"
echo "    docker-compose logs -f"
echo ""
echo "  查看日志（Go服务）:"
echo "    docker-compose logs -f flow-codeblock-go"
echo ""
echo "  连接到MySQL:"
echo "    docker exec -it flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go"
echo ""
echo "  查看统计表数据:"
echo "    docker exec flow-mysql-dev mysql -u flow_user -pflow_password_dev flow_codeblock_go \\"
echo "      -e \"SELECT * FROM module_usage_stats WHERE stat_date = CURDATE();\""
echo ""
echo "  停止服务:"
echo "    docker-compose stop"
echo ""
echo "  停止并删除容器和数据:"
echo "    docker-compose down -v"
echo ""

print_section "✨ 新功能提醒"

echo "  ✅ 统计功能已启用"
echo "     - 自动记录模块使用情况"
echo "     - 自动记录用户活跃度"
echo "     - 支持日期范围查询"
echo "     - 支持分页查询"
echo ""
echo "  📊 统计表已创建:"
echo "     - code_execution_stats (执行明细)"
echo "     - module_usage_stats (模块使用聚合)"
echo "     - user_activity_stats (用户活跃度聚合)"
echo ""
echo "  📖 详细文档:"
echo "     - STATS_FEATURE.md (使用文档)"
echo "     - STATS_IMPLEMENTATION_SUMMARY.md (实现总结)"
echo ""

print_success "环境已就绪，统计功能已启用！🚀"
echo ""

