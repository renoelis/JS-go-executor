#!/bin/bash

# ==================== Token配额日志清理脚本 ====================
# 功能：清理6个月前的配额消耗日志
# 用法：./cleanup_quota_logs.sh
# 建议：每天凌晨3点通过crontab自动执行

set -e

# ==================== 配置 ====================
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-flow_codeblock_go}"

# 保留时间（月）
RETENTION_MONTHS=6

# 每批删除数量（避免长事务）
BATCH_SIZE=10000

# ==================== 颜色输出 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==================== 日志函数 ====================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

# ==================== 检查MySQL连接 ====================
check_mysql_connection() {
    log_info "检查MySQL连接..."
    
    if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" > /dev/null 2>&1; then
        log_error "无法连接到MySQL数据库"
        log_error "请检查数据库配置：DB_HOST=$DB_HOST DB_PORT=$DB_PORT DB_USER=$DB_USER"
        exit 1
    fi
    
    log_info "MySQL连接成功"
}

# ==================== 查询待删除记录数 ====================
count_old_logs() {
    log_info "查询待删除记录数..."
    
    COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e \
        "SELECT COUNT(*) FROM token_quota_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL $RETENTION_MONTHS MONTH)")
    
    echo "$COUNT"
}

# ==================== 批量删除日志 ====================
cleanup_logs() {
    local total_deleted=0
    
    log_info "开始清理 $RETENTION_MONTHS 个月前的配额日志..."
    log_info "批次大小：$BATCH_SIZE 条/批"
    
    while true; do
        # 删除一批数据
        DELETED=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -N -e \
            "DELETE FROM token_quota_logs 
             WHERE created_at < DATE_SUB(NOW(), INTERVAL $RETENTION_MONTHS MONTH) 
             LIMIT $BATCH_SIZE; 
             SELECT ROW_COUNT();")
        
        if [ "$DELETED" -eq 0 ]; then
            break
        fi
        
        total_deleted=$((total_deleted + DELETED))
        log_info "已删除 $DELETED 条记录（累计：$total_deleted 条）"
        
        # 短暂休息，避免数据库压力过大
        sleep 0.5
    done
    
    log_info "清理完成！共删除 $total_deleted 条记录"
}

# ==================== 优化表 ====================
optimize_table() {
    log_info "优化表空间..."
    
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e \
        "OPTIMIZE TABLE token_quota_logs;"
    
    log_info "表优化完成"
}

# ==================== 显示统计信息 ====================
show_stats() {
    log_info "查询当前统计信息..."
    
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e \
        "SELECT 
            COUNT(*) AS total_logs,
            MIN(created_at) AS oldest_log,
            MAX(created_at) AS newest_log,
            ROUND(SUM(DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS size_mb
         FROM token_quota_logs, information_schema.TABLES
         WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'token_quota_logs';"
}

# ==================== 主流程 ====================
main() {
    log_info "==================== 配额日志清理脚本 ===================="
    log_info "数据库：$DB_HOST:$DB_PORT/$DB_NAME"
    log_info "保留时间：$RETENTION_MONTHS 个月"
    log_info "批次大小：$BATCH_SIZE 条"
    log_info "=========================================================="
    
    # 1. 检查连接
    check_mysql_connection
    
    # 2. 查询待删除数量
    OLD_COUNT=$(count_old_logs)
    log_info "发现 $OLD_COUNT 条待删除记录"
    
    if [ "$OLD_COUNT" -eq 0 ]; then
        log_info "没有需要清理的记录，退出"
        exit 0
    fi
    
    # 3. 确认删除
    if [ -t 0 ]; then
        # 交互模式
        read -p "确认删除 $OLD_COUNT 条记录？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_warn "用户取消操作"
            exit 0
        fi
    else
        # 非交互模式（crontab）
        log_info "非交互模式，自动执行清理"
    fi
    
    # 4. 执行清理
    cleanup_logs
    
    # 5. 优化表
    optimize_table
    
    # 6. 显示统计
    show_stats
    
    log_info "==================== 清理完成 ===================="
}

# 执行主流程
main
