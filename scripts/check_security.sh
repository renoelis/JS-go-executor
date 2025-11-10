#!/bin/bash
# ==============================================================================
# 安全配置检查脚本
# ==============================================================================
# 用途：在服务启动前验证 ADMIN_TOKEN 的安全性
# 使用：./scripts/check_security.sh
# ==============================================================================

set -e

echo ""
echo "🔒 =========================================="
echo "🔒  Flow-CodeBlock 安全配置检查"
echo "🔒 =========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查函数
check_passed=0
check_failed=0

function check_pass() {
    echo -e "${GREEN}✅ $1${NC}"
    ((check_passed++))
}

function check_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((check_failed++))
}

function check_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function check_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ==============================================================================
# 1. 检查 ADMIN_TOKEN 是否设置
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  检查 ADMIN_TOKEN 环境变量"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -z "$ADMIN_TOKEN" ]; then
    check_fail "ADMIN_TOKEN 未设置"
    echo ""
    check_info "ADMIN_TOKEN 是必需的，用于保护管理接口"
    check_info "管理接口包括："
    echo "   - Token 管理（创建/更新/删除/查询）"
    echo "   - 系统监控（健康检查、统计信息）"
    echo "   - 缓存管理（清空缓存、限流缓存）"
    echo ""
    check_info "请使用以下命令生成强密码："
    echo ""
    echo "   方法1（推荐）："
    echo "   export ADMIN_TOKEN=\$(openssl rand -base64 32)"
    echo ""
    echo "   方法2："
    echo "   export ADMIN_TOKEN=\$(pwgen -s 32 1)"
    echo ""
    echo "   方法3："
    echo "   使用密码管理器（如 1Password、LastPass）生成 32 位随机密码"
    echo ""
    exit 1
else
    check_pass "ADMIN_TOKEN 已设置"
fi

echo ""

# ==============================================================================
# 2. 检查 ADMIN_TOKEN 长度
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  检查 ADMIN_TOKEN 长度"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOKEN_LENGTH=${#ADMIN_TOKEN}
REQUIRED_LENGTH=16

if [ $TOKEN_LENGTH -lt $REQUIRED_LENGTH ]; then
    check_fail "ADMIN_TOKEN 长度不足（当前：$TOKEN_LENGTH，要求：$REQUIRED_LENGTH+）"
    echo ""
    check_info "请使用更长的强随机密码："
    echo "   export ADMIN_TOKEN=\$(openssl rand -base64 32)"
    echo ""
    exit 1
else
    check_pass "ADMIN_TOKEN 长度合格（当前：$TOKEN_LENGTH，要求：$REQUIRED_LENGTH+）"
fi

echo ""

# ==============================================================================
# 3. 检查是否包含常见弱密码
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  检查弱密码模式"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 转换为小写进行检查
ADMIN_TOKEN_LOWER=$(echo "$ADMIN_TOKEN" | tr '[:upper:]' '[:lower:]')

# 常见弱密码列表
WEAK_PASSWORDS=(
    "admin"
    "password"
    "123456"
    "qingflow"
    "qingflow7676"
    "test"
    "demo"
    "default"
    "secret"
)

WEAK_FOUND=0
for weak in "${WEAK_PASSWORDS[@]}"; do
    if echo "$ADMIN_TOKEN_LOWER" | grep -q "$weak"; then
        check_fail "包含常见弱密码：\"$weak\""
        WEAK_FOUND=1
    fi
done

if [ $WEAK_FOUND -eq 1 ]; then
    echo ""
    check_info "检测到常见弱密码，容易被攻击者猜测"
    check_info "请使用完全随机的强密码："
    echo "   export ADMIN_TOKEN=\$(openssl rand -base64 32)"
    echo ""
    exit 1
else
    check_pass "未检测到常见弱密码模式"
fi

echo ""

# ==============================================================================
# 4. 检查熵值（可选，提供建议）
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  密码复杂度评估"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查字符多样性
HAS_UPPER=0
HAS_LOWER=0
HAS_DIGIT=0
HAS_SPECIAL=0

if echo "$ADMIN_TOKEN" | grep -q '[A-Z]'; then HAS_UPPER=1; fi
if echo "$ADMIN_TOKEN" | grep -q '[a-z]'; then HAS_LOWER=1; fi
if echo "$ADMIN_TOKEN" | grep -q '[0-9]'; then HAS_DIGIT=1; fi
if echo "$ADMIN_TOKEN" | grep -q '[^a-zA-Z0-9]'; then HAS_SPECIAL=1; fi

CHAR_TYPES=$((HAS_UPPER + HAS_LOWER + HAS_DIGIT + HAS_SPECIAL))

if [ $CHAR_TYPES -ge 3 ]; then
    check_pass "字符多样性良好（包含 $CHAR_TYPES 种字符类型）"
elif [ $CHAR_TYPES -eq 2 ]; then
    check_warn "字符多样性中等（包含 $CHAR_TYPES 种字符类型）"
    check_info "建议使用包含大小写字母、数字和特殊字符的密码"
else
    check_warn "字符多样性较低（仅包含 $CHAR_TYPES 种字符类型）"
    check_info "强烈建议使用 openssl rand -base64 32 生成高熵密码"
fi

echo ""

# ==============================================================================
# 5. 检查是否为示例值
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  检查示例值"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查是否是文档中的示例值
EXAMPLE_TOKENS=(
    "J7k9mP2nQ5wX8vB3cD6fG1hL4sA0tY9uE"
    "YOUR_STRONG_RANDOM_TOKEN_HERE"
)

EXAMPLE_FOUND=0
for example in "${EXAMPLE_TOKENS[@]}"; do
    if [ "$ADMIN_TOKEN" == "$example" ]; then
        check_fail "使用了文档中的示例值"
        EXAMPLE_FOUND=1
    fi
done

if [ $EXAMPLE_FOUND -eq 1 ]; then
    echo ""
    check_info "请勿使用文档中的示例值，必须生成自己的随机密码"
    echo "   export ADMIN_TOKEN=\$(openssl rand -base64 32)"
    echo ""
    exit 1
else
    check_pass "未使用文档示例值"
fi

echo ""

# ==============================================================================
# 总结
# ==============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨  检查完成"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ 通过：$check_passed 项${NC}"
if [ $check_failed -gt 0 ]; then
    echo -e "${RED}❌ 失败：$check_failed 项${NC}"
fi
echo ""

if [ $check_failed -eq 0 ]; then
    echo -e "${GREEN}🎉 所有安全检查通过！${NC}"
    echo ""
    check_info "ADMIN_TOKEN 配置符合安全要求"
    check_info "Token 已脱敏显示：$(echo "$ADMIN_TOKEN" | head -c 6)****$(echo "$ADMIN_TOKEN" | tail -c 6)"
    echo ""
    exit 0
else
    echo -e "${RED}❌ 安全检查未通过，请修复上述问题后重试${NC}"
    echo ""
    exit 1
fi

