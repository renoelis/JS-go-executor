#!/opt/homebrew/bin/bash

# ============================================================================
# Flow-CodeBlock Go 测试环境压力测试脚本
# ============================================================================
# 测试目标: http://localhost:3002/flow/codeblock
# 测试配置: 每分钟300次, 突发50次/秒, 60秒滚动窗口
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 配置
API_URL="http://localhost:3002/flow/codeblock"
RESULTS_DIR="stress_test_results_$(date +%Y%m%d_%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/summary.txt"
DETAIL_FILE="${RESULTS_DIR}/detail.log"

# Token池 - 10个相同限制的token
TOKENS=(
    "flow_ab14495456a64fb9b496061d5086c14ffc586a548c1bfc3a6cd1a182c1f54866"
    "flow_5e5a3d3eb01e4cad998c37d8c2a062b51b418eceec8e358d66e08c65eb140925"
    "flow_58c08935678f4442b6c0f943938207d3ea6dd4c3cfcf0e3ff360ca28d8a2888f"
    "flow_e4f982912048466ab64e941b4d003e71d03bab3e46e03b5bf1de1c184baf3cd0"
    "flow_f4d3eb96ebd44ca48d05545d4384a706946c6c13c8e351192084ca670b57ee33"
    "flow_2ffa79a0da064ea790f935cc3f7f10eb0339559b60ccd33e6c4915e5d12d2a71"
    "flow_ddc360a07cf746fba83ee646209c160b4a5c1a68a1d5603c18cf02aac2b1bfb0"
    "flow_679cdf2982644af68547e6aa3bd55c40d9b85b95876e6d4738d532f97c5cb8b5"
    "flow_cd3f1066414b4dc9abde935d2d60ced105c28ae7e64b06d4f3991dc0394e75fa"
    "flow_428c1b3fc2294a429cac89363a2b09dbdfa40dd945e1cfadaa01c063e71cda36"
)

TOKEN_COUNT=${#TOKENS[@]}

# 测试代码库 - Base64编码的各种测试代码
declare -A TEST_CODES

# 1. 简单计算
TEST_CODES["simple_calc"]="cmV0dXJuIHsgcmVzdWx0OiBpbnB1dC5hICsgaW5wdXQuYiwgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfTs="

# 2. 日期格式化
TEST_CODES["date_format"]="Y29uc3QgeyBmb3JtYXQgfSA9IHJlcXVpcmUoJ2RhdGUtZm5zJyk7CmNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGZvcm1hdHRlZFRpbWU6IGZvcm1hdChub3csICJ5eXl5OiBNTTpkZCBISDptbTpzcyIpIH07"

# 3. Lodash操作
TEST_CODES["lodash_ops"]="Y29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpOwpjb25zdCBhcnIgPSBbMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTBdOwpjb25zdCBjaHVua2VkID0gXy5jaHVuayhhcnIsIDMpOwpjb25zdCB1bmlxID0gXy51bmlxKFsxLCAyLCAyLCAzLCAzLCA0XSk7CmNvbnN0IHN1bSA9IF8uc3VtKGFycik7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGNodW5rZWQsIHVuaXEsIHN1bSB9Ow=="

# 4. Crypto哈希
TEST_CODES["crypto_hash"]="Y29uc3QgQ3J5cHRvSlMgPSByZXF1aXJlKCdjcnlwdG8tanMnKTsKY29uc3QgdGV4dCA9ICdIZWxsbyBGbG93LUNvZGVCbG9jayc7CnJldHVybiB7CiAgICBzdWNjZXNzOiB0cnVlLAogICAgbWQ1OiBDcnlwdG9KUy5NRDUodGV4dCkudG9TdHJpbmcoKSwKICAgIHNoYTI1NjogQ3J5cHRvSlMuU0hBMjU2KHRleHQpLnRvU3RyaW5nKCksCiAgICBzaGE1MTI6IENyeXB0b0pTLlNIQTUxMih0ZXh0KS50b1N0cmluZygpCn07"

# 5. UUID生成
TEST_CODES["uuid_gen"]="Y29uc3QgeyB2NCwgdjUgfSA9IHJlcXVpcmUoJ3V1aWQnKTsKcmV0dXJuIHsKICAgIHN1Y2Nlc3M6IHRydWUsCiAgICB1dWlkdjQ6IHY0KCksCiAgICB1dWlkdjU6IHY1KCdIZWxsbycsIHY1LkROUyksCiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKQp9Ow=="

# 6. QS解析
TEST_CODES["qs_parse"]="Y29uc3QgcXMgPSByZXF1aXJlKCdxcycpOwpjb25zdCBxdWVyeSA9ICdhPTEmYj0yJmM9MyZhcnJbMF09eCZhcnJbMV09eSc7CmNvbnN0IHBhcnNlZCA9IHFzLnBhcnNlKHF1ZXJ5KTsKY29uc3Qgc3RyaW5naWZpZWQgPSBxcy5zdHJpbmdpZnkocGFyc2VkKTsKcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgcGFyc2VkLCBzdHJpbmdpZmllZCB9Owo="

# 7. Buffer操作
TEST_CODES["buffer_ops"]="Y29uc3QgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyOwpjb25zdCBidWYxID0gQnVmZmVyLmZyb20oJ0hlbGxvJyk7CmNvbnN0IGJ1ZjIgPSBCdWZmZXIuYWxsb2MoMTApOwpidWYxLmNvcHkoYnVmMik7CmNvbnN0IGJ1ZjMgPSBCdWZmZXIuY29uY2F0KFtidWYxLCBidWYyXSk7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGxlbmd0aDogYnVmMy5sZW5ndGgsIGNvbnRlbnQ6IGJ1ZjMudG9TdHJpbmcoJ2Jhc2U2NCcpIH07"

# 8. JSON处理
TEST_CODES["json_ops"]="Y29uc3QgZGF0YSA9IHsgdXNlcjogJ3Rlc3QnLCBhZ2U6IDI1LCB0YWdzOiBbJ2EnLCAnYicsICdjJ10sIG1ldGE6IHsgY3JlYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH0gfTsKY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGRhdGEpOwpjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb25TdHIpOwpyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBvcmlnaW5hbDogZGF0YSwgcGFyc2VkLCBzaXplOiBqc29uU3RyLmxlbmd0aCB9Ow=="

# 9. 数组处理
TEST_CODES["array_ops"]="Y29uc3QgYXJyID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogMTAwIH0sIChfLCBpKSA9PiBpICsgMSk7CmNvbnN0IGZpbHRlcmVkID0gYXJyLmZpbHRlcih4ID0+IHggJSAyID09PSAwKTsKY29uc3QgbWFwcGVkID0gZmlsdGVyZWQubWFwKHggPT4geCAqIDIpOwpjb25zdCBzdW0gPSBtYXBwZWQucmVkdWNlKChhY2MsIHgpID0+IGFjYyArIHgsIDApOwpyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBvcmlnaW5hbDogYXJyLmxlbmd0aCwgZmlsdGVyZWQ6IGZpbHRlcmVkLmxlbmd0aCwgc3VtIH07"

# 10. 字符串处理
TEST_CODES["string_ops"]="Y29uc3Qgc3RyID0gJ0hlbGxvIFdvcmxkIEZyb20gRmxvdy1Db2RlQmxvY2sgR28hJzsKY29uc3QgdXBwZXIgPSBzdHIudG9VcHBlckNhc2UoKTsKY29uc3QgbG93ZXIgPSBzdHIudG9Mb3dlckNhc2UoKTsKY29uc3Qgd29yZHMgPSBzdHIuc3BsaXQoJyAnKTsKY29uc3QgcmV2ZXJzZWQgPSBzdHIuc3BsaXQoJycpLnJldmVyc2UoKS5qb2luKCcnKTsKcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdXBwZXIsIGxvd2VyLCB3b3JkQ291bnQ6IHdvcmRzLmxlbmd0aCwgcmV2ZXJzZWQgfTs="

# 11. Promise链式调用
TEST_CODES["promise_chain"]="cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7CiAgICBzZXRUaW1lb3V0KCgpID0+IHsKICAgICAgICByZXNvbHZlKDEwKTsKICAgIH0sIDEwKTsKfSkudGhlbih2YWwgPT4gdmFsICogMikKICAgLnRoZW4odmFsID0+IHZhbCArIDUpCiAgIC50aGVuKHZhbCA9PiAoeyBzdWNjZXNzOiB0cnVlLCByZXN1bHQ6IHZhbCwgZXhwZWN0ZWQ6IDI1IH0pKTs="

# 12. Math复杂计算
TEST_CODES["math_calc"]="Y29uc3QgcmVzdWx0cyA9IHsKICAgIHNxcnQ6IE1hdGguc3FydCgxNjApLAogICAgcG93OiBNYXRoLnBvdygyLCAxMCksCiAgICByYW5kb206IE1hdGgucmFuZG9tKCksCiAgICBmbG9vcjogTWF0aC5mbG9vcig5Ljk5KSwKICAgIGNlaWw6IE1hdGguY2VpbCg5LjAxKSwKICAgIG1heDogTWF0aC5tYXgoMSwgMiwgMywgNCwgNSksCiAgICBtaW46IE1hdGgubWluKDEsIDIsIDMsIDQsIDUpLAogICAgc2luOiBNYXRoLnNpbihNYXRoLlBJIC8gMikKfTsKcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgcmVzdWx0cyB9Ow=="

# 13. Date操作
TEST_CODES["date_ops"]="Y29uc3Qgbm93ID0gbmV3IERhdGUoKTsKY29uc3QgeWVzdGVyZGF5ID0gbmV3IERhdGUobm93LmdldFRpbWUoKSAtIDg2NDAwMDAwKTsKY29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpICsgODY0MDAwMDApOwpyZXR1cm4gewogICAgc3VjY2VzczogdHJ1ZSwKICAgIG5vdzogbm93LnRvSVNPU3RyaW5nKCksCiAgICB5ZXN0ZXJkYXk6IHllc3RlcmRheS50b0lTT1N0cmluZygpLAogICAgdG9tb3Jyb3c6IHRvbW9ycm93LnRvSVNPU3RyaW5nKCksCiAgICB0aW1lc3RhbXA6IG5vdy5nZXRUaW1lKCkKfTs="

# 14. 正则表达式
TEST_CODES["regex_ops"]="Y29uc3QgdGV4dCA9ICdFbWFpbDogdGVzdEBleGFtcGxlLmNvbSwgUGhvbmU6IDEzODAwMTM4MDAwJzsKY29uc3QgZW1haWxNYXRjaCA9IHRleHQubWF0Y2goL1tcdytcLi1dK0BbXHcrXC5dK1wuXHcrLyk7CmNvbnN0IHBob25lTWF0Y2ggPSB0ZXh0Lm1hdGNoKC9cZHsxMX0vKTsKY29uc3QgcmVwbGFjZWQgPSB0ZXh0LnJlcGxhY2UoL1xkezExfS8sICcqKioqKioqKioqKicpOwpyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBlbWFpbDogZW1haWxNYXRjaFswXSwgcGhvbmU6IHBob25lTWF0Y2hbMF0sIHJlcGxhY2VkIH07Cg=="

# 15. 复杂对象操作
TEST_CODES["complex_obj"]="Y29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpOwpjb25zdCBvYmogPSB7CiAgICB1c2VyOiB7IG5hbWU6ICdKb2huJywgYWdlOiAzMCwgZW1haWw6ICdqb2huQGV4YW1wbGUuY29tJyB9LAogICAgc2V0dGluZ3M6IHsgdGhlbWU6ICdkYXJrJywgbGFuZzogJ3poJyB9LAogICAgdGFnczogWydhJywgJ2InLCAnYyddCn07CmNvbnN0IHBpY2tlZCA9IF8ucGljayhvYmosIFsndXNlcicsICd0YWdzJ10pOwpjb25zdCBtZXJnZWQgPSBfLm1lcmdlKHt9LCBvYmosIHsgdXNlcjogeyBhZ2U6IDMxIH0gfSk7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG9yaWdpbmFsOiBvYmosIHBpY2tlZCwgbWVyZ2VkIH07"

# 全局统计变量
declare -A GLOBAL_STATS
GLOBAL_STATS["total_requests"]=0
GLOBAL_STATS["success_requests"]=0
GLOBAL_STATS["failed_requests"]=0
GLOBAL_STATS["rate_limited"]=0
GLOBAL_STATS["timeout_requests"]=0
GLOBAL_STATS["error_4xx"]=0
GLOBAL_STATS["error_5xx"]=0
GLOBAL_STATS["total_time_ms"]=0

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

print_stat() {
    echo -e "${MAGENTA}📊 $1${NC}"
}

# 初始化测试环境
init_test_env() {
    print_header "初始化测试环境"
    
    # 创建结果目录
    mkdir -p "$RESULTS_DIR"
    
    # 初始化统计文件
    {
        echo "=================================================="
        echo "Flow-CodeBlock Go 生产环境压力测试报告"
        echo "=================================================="
        echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "测试目标: $API_URL"
        echo "Token数量: $TOKEN_COUNT"
        echo "限流配置: 300次/分钟, 50次/秒, 60秒滚动窗口"
        echo "=================================================="
        echo ""
    } > "$SUMMARY_FILE"
    
    print_success "结果目录创建: $RESULTS_DIR"
    print_info "摘要文件: $SUMMARY_FILE"
    print_info "详细日志: $DETAIL_FILE"
}

# 检查依赖
check_dependencies() {
    print_header "检查依赖工具"
    
    local deps=("curl" "jq" "bc" "date")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if command -v "$dep" &> /dev/null; then
            print_success "$dep 已安装"
        else
            print_error "$dep 未安装"
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        print_error "缺少依赖: ${missing[*]}"
        print_info "请安装: brew install ${missing[*]}"
        exit 1
    fi
}

# 获取随机测试代码
get_random_test_code() {
    local keys=("${!TEST_CODES[@]}")
    local random_key=${keys[$RANDOM % ${#keys[@]}]}
    echo "$random_key|${TEST_CODES[$random_key]}"
}

# 获取轮询Token
get_token() {
    local index=$1
    echo "${TOKENS[$((index % TOKEN_COUNT))]}"
}

# 执行单个请求
execute_request() {
    local token=$1
    local code_name=$2
    local code_base64=$3
    local request_id=$4
    
    local start_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    
    # 执行请求
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" \
        --max-time 65 \
        --location "$API_URL" \
        --header "accessToken: $token" \
        --header "Content-Type: application/json" \
        --data "{\"input\": {\"a\": $RANDOM, \"b\": $RANDOM}, \"codebase64\": \"$code_base64\"}" \
        2>&1)
    
    local end_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    local duration=$((end_time - start_time))
    
    # 解析响应
    local http_code=$(echo "$response" | tail -n 2 | head -n 1)
    local time_total=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -2)
    
    # 记录详细日志
    {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Request #$request_id"
        echo "  Token: ${token:0:20}..."
        echo "  Code: $code_name"
        echo "  HTTP Code: $http_code"
        echo "  Duration: ${duration}ms"
        echo "  Time Total: ${time_total}s"
        echo ""
    } >> "$DETAIL_FILE"
    
    # 更新统计
    GLOBAL_STATS["total_requests"]=$((${GLOBAL_STATS["total_requests"]} + 1))
    GLOBAL_STATS["total_time_ms"]=$((${GLOBAL_STATS["total_time_ms"]} + duration))
    
    if [ "$http_code" = "200" ]; then
        GLOBAL_STATS["success_requests"]=$((${GLOBAL_STATS["success_requests"]} + 1))
        echo "success|$duration|$code_name"
    elif [ "$http_code" = "429" ]; then
        GLOBAL_STATS["rate_limited"]=$((${GLOBAL_STATS["rate_limited"]} + 1))
        echo "rate_limited|$duration|$code_name"
    elif [[ "$http_code" =~ ^4 ]]; then
        GLOBAL_STATS["error_4xx"]=$((${GLOBAL_STATS["error_4xx"]} + 1))
        echo "error_4xx|$duration|$code_name"
    elif [[ "$http_code" =~ ^5 ]]; then
        GLOBAL_STATS["error_5xx"]=$((${GLOBAL_STATS["error_5xx"]} + 1))
        echo "error_5xx|$duration|$code_name"
    elif [ -z "$http_code" ] || [ "$http_code" = "000" ]; then
        GLOBAL_STATS["timeout_requests"]=$((${GLOBAL_STATS["timeout_requests"]} + 1))
        echo "timeout|$duration|$code_name"
    else
        GLOBAL_STATS["failed_requests"]=$((${GLOBAL_STATS["failed_requests"]} + 1))
        echo "failed|$duration|$code_name"
    fi
}

# 测试1: 单Token稳定性测试
test_single_token_stability() {
    print_header "测试1: 单Token稳定性测试"
    
    local token="${TOKENS[0]}"
    local total_requests=100
    local success=0
    local failed=0
    
    print_info "Token: ${token:0:30}..."
    print_info "请求数: $total_requests"
    print_info "策略: 稳定速率发送"
    
    echo "=== 测试1: 单Token稳定性测试 ===" >> "$SUMMARY_FILE"
    
    for i in $(seq 1 $total_requests); do
        IFS='|' read -r code_name code_base64 <<< "$(get_random_test_code)"
        local result=$(execute_request "$token" "$code_name" "$code_base64" "1-$i")
        local status=$(echo "$result" | cut -d'|' -f1)
        
        if [ "$status" = "success" ]; then
            success=$((success + 1))
        else
            failed=$((failed + 1))
        fi
        
        # 进度显示
        if [ $((i % 10)) -eq 0 ]; then
            echo -ne "\r  进度: $i/$total_requests (成功: $success, 失败: $failed)"
        fi
        
        # 控制请求速率 - 避免过快触发限流
        sleep 0.25
    done
    
    echo ""
    print_success "测试完成"
    print_stat "成功: $success, 失败: $failed"
    
    {
        echo "  总请求数: $total_requests"
        echo "  成功: $success"
        echo "  失败: $failed"
        echo "  成功率: $(echo "scale=2; $success * 100 / $total_requests" | bc)%"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试2: 多Token并发测试
test_multi_token_concurrent() {
    print_header "测试2: 多Token并发测试"
    
    local concurrency=10
    local requests_per_token=50
    local total=$((concurrency * requests_per_token))
    
    print_info "并发数: $concurrency (使用前$concurrency个Token)"
    print_info "每Token请求数: $requests_per_token"
    print_info "总请求数: $total"
    
    echo "=== 测试2: 多Token并发测试 ===" >> "$SUMMARY_FILE"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    
    # 启动并发进程
    for i in $(seq 0 $((concurrency - 1))); do
        (
            local token="${TOKENS[$i]}"
            local success=0
            local failed=0
            
            for j in $(seq 1 $requests_per_token); do
                IFS='|' read -r code_name code_base64 <<< "$(get_random_test_code)"
                local result=$(execute_request "$token" "$code_name" "$code_base64" "2-$i-$j")
                local status=$(echo "$result" | cut -d'|' -f1)
                
                if [ "$status" = "success" ]; then
                    success=$((success + 1))
                else
                    failed=$((failed + 1))
                fi
                
                sleep 0.1
            done
            
            echo "$success $failed" > "$temp_dir/result_$i.txt"
        ) &
    done
    
    print_info "等待所有并发请求完成..."
    wait
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
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
    
    local qps=$(echo "scale=2; $total / $duration" | bc)
    
    print_success "测试完成"
    print_stat "总耗时: ${duration}秒"
    print_stat "QPS: $qps"
    print_stat "成功: $total_success, 失败: $total_failed"
    
    {
        echo "  并发数: $concurrency"
        echo "  总请求数: $total"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  总耗时: ${duration}秒"
        echo "  QPS: $qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试3: 限流边界测试
test_rate_limit_boundary() {
    print_header "测试3: 限流边界测试"
    
    local token="${TOKENS[0]}"
    local burst_requests=60  # 超过50次/秒的突发限制
    
    print_info "Token: ${token:0:30}..."
    print_info "突发请求数: $burst_requests (限制: 50次/秒)"
    print_info "目标: 测试突发限流触发"
    
    echo "=== 测试3: 限流边界测试 ===" >> "$SUMMARY_FILE"
    
    local success=0
    local rate_limited=0
    local start_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    
    for i in $(seq 1 $burst_requests); do
        IFS='|' read -r code_name code_base64 <<< "$(get_random_test_code)"
        local result=$(execute_request "$token" "$code_name" "$code_base64" "3-$i")
        local status=$(echo "$result" | cut -d'|' -f1)
        
        if [ "$status" = "success" ]; then
            success=$((success + 1))
        elif [ "$status" = "rate_limited" ]; then
            rate_limited=$((rate_limited + 1))
        fi
        
        # 快速发送，不延迟
    done
    
    local end_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    local duration=$((end_time - start_time))
    local actual_qps=$(echo "scale=2; $burst_requests * 1000 / $duration" | bc)
    
    print_success "测试完成"
    print_stat "实际QPS: $actual_qps"
    print_stat "成功: $success, 被限流: $rate_limited"
    
    if [ $rate_limited -gt 0 ]; then
        print_success "限流功能正常触发"
    else
        print_warning "未触发限流（可能请求未达到阈值）"
    fi
    
    {
        echo "  突发请求数: $burst_requests"
        echo "  实际QPS: $actual_qps"
        echo "  成功: $success"
        echo "  被限流: $rate_limited"
        echo "  耗时: ${duration}ms"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试4: 长时间稳定性测试
test_long_term_stability() {
    print_header "测试4: 长时间稳定性测试"
    
    local duration_seconds=180  # 3分钟
    local concurrency=5
    
    print_info "运行时间: ${duration_seconds}秒 (3分钟)"
    print_info "并发数: $concurrency"
    print_info "策略: 持续负载测试"
    
    echo "=== 测试4: 长时间稳定性测试 ===" >> "$SUMMARY_FILE"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + duration_seconds))
    local temp_dir=$(mktemp -d)
    
    # 启动并发进程
    for i in $(seq 0 $((concurrency - 1))); do
        (
            local token="${TOKENS[$i]}"
            local success=0
            local failed=0
            local count=0
            
            while [ $(date +%s) -lt $end_time ]; do
                IFS='|' read -r code_name code_base64 <<< "$(get_random_test_code)"
                local result=$(execute_request "$token" "$code_name" "$code_base64" "4-$i-$count")
                local status=$(echo "$result" | cut -d'|' -f1)
                
                if [ "$status" = "success" ]; then
                    success=$((success + 1))
                else
                    failed=$((failed + 1))
                fi
                
                count=$((count + 1))
                sleep 0.5  # 控制速率
            done
            
            echo "$success $failed" > "$temp_dir/result_$i.txt"
        ) &
    done
    
    # 显示进度
    while [ $(date +%s) -lt $end_time ]; do
        local elapsed=$(($(date +%s) - start_time))
        local remaining=$((duration_seconds - elapsed))
        echo -ne "\r  运行中... 已运行: ${elapsed}s, 剩余: ${remaining}s"
        sleep 5
    done
    echo ""
    
    print_info "等待所有进程完成..."
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
    print_stat "总请求数: $total_requests"
    print_stat "平均QPS: $avg_qps"
    print_stat "成功: $total_success, 失败: $total_failed"
    print_stat "成功率: ${success_rate}%"
    
    {
        echo "  运行时间: ${duration_seconds}秒"
        echo "  总请求数: $total_requests"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  成功率: ${success_rate}%"
        echo "  平均QPS: $avg_qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试5: 代码多样性测试
test_code_diversity() {
    print_header "测试5: 代码多样性测试"
    
    print_info "测试所有${#TEST_CODES[@]}种代码类型"
    print_info "每种代码执行5次"
    
    echo "=== 测试5: 代码多样性测试 ===" >> "$SUMMARY_FILE"
    
    declare -A code_stats
    local token_idx=0
    
    for code_name in "${!TEST_CODES[@]}"; do
        local code_base64="${TEST_CODES[$code_name]}"
        local success=0
        local failed=0
        
        print_info "测试代码: $code_name"
        
        for i in $(seq 1 5); do
            local token=$(get_token $token_idx)
            token_idx=$((token_idx + 1))
            
            local result=$(execute_request "$token" "$code_name" "$code_base64" "5-$code_name-$i")
            local status=$(echo "$result" | cut -d'|' -f1)
            
            if [ "$status" = "success" ]; then
                success=$((success + 1))
            else
                failed=$((failed + 1))
            fi
            
            sleep 0.2
        done
        
        code_stats["$code_name"]="$success|$failed"
        print_stat "  $code_name: 成功 $success, 失败 $failed"
    done
    
    print_success "代码多样性测试完成"
    
    {
        echo "  代码类型数: ${#TEST_CODES[@]}"
        echo "  每种代码执行次数: 5"
        echo ""
        echo "  详细结果:"
        for code_name in "${!code_stats[@]}"; do
            IFS='|' read -r success failed <<< "${code_stats[$code_name]}"
            echo "    $code_name: 成功 $success, 失败 $failed"
        done
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试6: 全Token轮询测试
test_all_tokens_rotation() {
    print_header "测试6: 全Token轮询测试"
    
    local requests_per_token=30
    local total=$((TOKEN_COUNT * requests_per_token))
    
    print_info "Token总数: $TOKEN_COUNT"
    print_info "每Token请求数: $requests_per_token"
    print_info "总请求数: $total"
    
    echo "=== 测试6: 全Token轮询测试 ===" >> "$SUMMARY_FILE"
    
    declare -A token_stats
    
    for idx in "${!TOKENS[@]}"; do
        local token="${TOKENS[$idx]}"
        local success=0
        local failed=0
        
        print_info "测试Token #$((idx + 1)): ${token:0:30}..."
        
        for i in $(seq 1 $requests_per_token); do
            IFS='|' read -r code_name code_base64 <<< "$(get_random_test_code)"
            local result=$(execute_request "$token" "$code_name" "$code_base64" "6-$idx-$i")
            local status=$(echo "$result" | cut -d'|' -f1)
            
            if [ "$status" = "success" ]; then
                success=$((success + 1))
            else
                failed=$((failed + 1))
            fi
            
            sleep 0.25
        done
        
        token_stats["$idx"]="$success|$failed"
        print_stat "  Token #$((idx + 1)): 成功 $success, 失败 $failed"
    done
    
    print_success "全Token轮询测试完成"
    
    {
        echo "  Token总数: $TOKEN_COUNT"
        echo "  每Token请求数: $requests_per_token"
        echo ""
        echo "  各Token统计:"
        for idx in "${!token_stats[@]}"; do
            IFS='|' read -r success failed <<< "${token_stats[$idx]}"
            echo "    Token #$((idx + 1)): 成功 $success, 失败 $failed"
        done
        echo ""
    } >> "$SUMMARY_FILE"
}

# 测试7: 峰值负载测试
test_peak_load() {
    print_header "测试7: 峰值负载测试"
    
    local concurrency=$TOKEN_COUNT  # 使用所有Token
    local requests_per_token=20
    local total=$((concurrency * requests_per_token))
    
    print_info "峰值并发: $concurrency (使用全部Token)"
    print_info "每Token请求数: $requests_per_token"
    print_info "总请求数: $total"
    print_info "策略: 最大压力测试"
    
    echo "=== 测试7: 峰值负载测试 ===" >> "$SUMMARY_FILE"
    
    local temp_dir=$(mktemp -d)
    local start_time=$(date +%s)
    
    # 所有Token同时并发
    for idx in "${!TOKENS[@]}"; do
        (
            local token="${TOKENS[$idx]}"
            local success=0
            local failed=0
            
            for i in $(seq 1 $requests_per_token); do
                IFS='|' read -r code_name code_base64 <<< "$(get_random_test_code)"
                local result=$(execute_request "$token" "$code_name" "$code_base64" "7-$idx-$i")
                local status=$(echo "$result" | cut -d'|' -f1)
                
                if [ "$status" = "success" ]; then
                    success=$((success + 1))
                else
                    failed=$((failed + 1))
                fi
            done
            
            echo "$success $failed" > "$temp_dir/result_$idx.txt"
        ) &
    done
    
    print_info "等待峰值负载测试完成..."
    wait
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # 统计结果
    local total_success=0
    local total_failed=0
    
    for idx in "${!TOKENS[@]}"; do
        if [ -f "$temp_dir/result_$idx.txt" ]; then
            read success failed < "$temp_dir/result_$idx.txt"
            total_success=$((total_success + success))
            total_failed=$((total_failed + failed))
        fi
    done
    
    rm -rf "$temp_dir"
    
    local qps=$(echo "scale=2; $total / $duration" | bc)
    local success_rate=$(echo "scale=2; $total_success * 100 / $total" | bc)
    
    print_success "峰值负载测试完成"
    print_stat "峰值并发: $concurrency"
    print_stat "总耗时: ${duration}秒"
    print_stat "峰值QPS: $qps"
    print_stat "成功: $total_success, 失败: $total_failed"
    print_stat "成功率: ${success_rate}%"
    
    {
        echo "  峰值并发: $concurrency"
        echo "  总请求数: $total"
        echo "  成功: $total_success"
        echo "  失败: $total_failed"
        echo "  成功率: ${success_rate}%"
        echo "  总耗时: ${duration}秒"
        echo "  峰值QPS: $qps"
        echo ""
    } >> "$SUMMARY_FILE"
}

# 生成最终报告
generate_final_report() {
    print_header "生成最终测试报告"
    
    # 从详细日志中统计实际数据（因为子进程无法修改父进程的关联数组）
    local total=0
    local success=0
    local failed=0
    local rate_limited=0
    local timeout=0
    local error_4xx=0
    local error_5xx=0
    local total_time=0
    
    if [ -f "$DETAIL_FILE" ]; then
        # 统计总请求数
        total=$(grep "Request #" "$DETAIL_FILE" | wc -l | tr -d ' ')
        
        # 统计成功的200状态码
        success=$(grep "HTTP Code: 200" "$DETAIL_FILE" | wc -l | tr -d ' ')
        
        # 统计429限流
        rate_limited=$(grep "HTTP Code: 429" "$DETAIL_FILE" | wc -l | tr -d ' ')
        
        # 统计4xx错误（排除429）
        error_4xx=$(grep -E "HTTP Code: 4[0-9]{2}" "$DETAIL_FILE" | grep -v "HTTP Code: 429" | wc -l | tr -d ' ')
        
        # 统计5xx错误
        error_5xx=$(grep -E "HTTP Code: 5[0-9]{2}" "$DETAIL_FILE" | wc -l | tr -d ' ')
        
        # 统计超时（空或000状态码）
        timeout=$(grep -E "HTTP Code: (000|^$)" "$DETAIL_FILE" | wc -l | tr -d ' ')
        
        # 计算失败数
        failed=$((total - success))
        
        # 计算总耗时（从Duration行提取）
        if command -v awk &> /dev/null; then
            total_time=$(grep "Duration:" "$DETAIL_FILE" | awk '{sum += $2} END {printf "%.0f", sum}' | sed 's/ms//')
        fi
    fi
    
    local success_rate=0
    local avg_latency=0
    
    if [ $total -gt 0 ]; then
        success_rate=$(echo "scale=2; $success * 100 / $total" | bc)
        if [ "$total_time" != "" ] && [ "$total_time" != "0" ]; then
            avg_latency=$(echo "scale=2; $total_time / $total" | bc)
        fi
    fi
    
    {
        echo ""
        echo "=================================================="
        echo "全局统计汇总"
        echo "=================================================="
        echo "总请求数: $total"
        echo "成功请求: $success"
        echo "失败请求: $failed"
        echo "限流请求: $rate_limited"
        echo "超时请求: $timeout"
        echo "4xx错误: $error_4xx"
        echo "5xx错误: $error_5xx"
        echo ""
        echo "成功率: ${success_rate}%"
        echo "平均延迟: ${avg_latency}ms"
        echo ""
        echo "=================================================="
        echo "测试完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
        echo "=================================================="
    } >> "$SUMMARY_FILE"
    
    print_success "测试报告生成完成"
    print_stat "总请求数: $total"
    print_stat "成功率: ${success_rate}%"
    print_stat "平均延迟: ${avg_latency}ms"
    print_stat "限流次数: $rate_limited"
    
    echo ""
    print_info "查看摘要报告: cat $SUMMARY_FILE"
    print_info "查看详细日志: cat $DETAIL_FILE"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║    Flow-CodeBlock Go 测试环境压力测试                    ║"
    echo "║    测试日期: $(date +%Y-%m-%d)                                ║"
    echo "║    测试时间: $(date +%H:%M:%S)                                ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    init_test_env
    check_dependencies
    
    print_warning "即将开始压力测试，预计总时间: 约8-10分钟"
    print_info "按 Ctrl+C 可随时中断测试"
    echo ""
    read -p "按 Enter 键开始测试..." -t 5 || true
    echo ""
    
    # 执行所有测试
    test_single_token_stability
    sleep 3
    
    test_multi_token_concurrent
    sleep 3
    
    test_rate_limit_boundary
    sleep 3
    
    test_code_diversity
    sleep 3
    
    test_all_tokens_rotation
    sleep 3
    
    test_peak_load
    sleep 3
    
    test_long_term_stability
    
    # 生成报告
    generate_final_report
    
    print_header "压力测试完成"
    print_success "所有测试已完成！"
    
    # 显示摘要
    echo ""
    echo -e "${CYAN}========== 测试摘要 ==========${NC}"
    cat "$SUMMARY_FILE"
}

# 捕获退出信号
trap "echo ''; print_warning '测试被中断'; generate_final_report; exit 1" INT TERM

# 执行主函数
main

