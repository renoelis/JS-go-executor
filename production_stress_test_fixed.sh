#!/bin/bash

# ============================================================================
# Flow-CodeBlock Go 生产环境压力测试脚本（兼容bash 3.2）
# ============================================================================
# 测试目标: https://api.renoelis.top/flow/codeblock
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
API_URL="https://api.renoelis.top/flow/codeblock"
RESULTS_DIR="stress_test_results_$(date +%Y%m%d_%H%M%S)"
SUMMARY_FILE="${RESULTS_DIR}/summary.txt"
DETAIL_FILE="${RESULTS_DIR}/detail.log"

# Token池 - 10个相同限制的token
TOKENS=(
    "flow_858f92813b1240a1b53c099b50f4322861a5eab65544f9f947570f48eebfab1b"
    "flow_0a1020832701485dab5509fe3f680e1a34a424a305b4c2c8f56bcc971c7729d2"
    "flow_ca2a5416c9624421a991a0f2119c684dd32fb82c6f7d361954292182cd923558"
    "flow_44c400fd7d4044f38ecf97044eebb7cbefefd28dfee9569fcd9495d62c394e3c"
    "flow_d2c2dcf1854742ac9054d1025a782702b4f61662f6aed50d6e0c0f38871aecc7"
    "flow_e1272b71afea4f4cb36824df04ab278b329e369b99f13230c0fec769f310c29b"
    "flow_86135ee03f87492ca5d43250e74ffb32f1bb6fff7f24aa8a56cb1b564356a9e3"
    "flow_f7271ca9a62444299487d83b29939358735a8ac2666b86ad74e9b93fa129d671"
    "flow_662b80dc4d264c9b935f9f73ff535455ceb7cc50cd1a3501de2d3c9e39fb03c5"
    "flow_4890094c8caa40028ba000a26d49e8edc699eec9a64e0528b93d03726cdec6b3"
)

TOKEN_COUNT=${#TOKENS[@]}

# 测试代码库 - 使用普通数组（兼容bash 3.2）
CODE_NAMES=(
    "simple_calc"
    "date_format"
    "lodash_ops"
    "crypto_hash"
    "uuid_gen"
    "qs_parse"
    "buffer_ops"
    "json_ops"
    "array_ops"
    "string_ops"
    "promise_chain"
    "math_calc"
    "date_ops"
    "regex_ops"
    "complex_obj"
)

CODE_BASE64=(
    "cmV0dXJuIHsgcmVzdWx0OiBpbnB1dC5hICsgaW5wdXQuYiwgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfTs="
    "Y29uc3QgeyBmb3JtYXQgfSA9IHJlcXVpcmUoJ2RhdGUtZm5zJyk7CmNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGZvcm1hdHRlZFRpbWU6IGZvcm1hdChub3csICJ5eXl5OiBNTTpkZCBISDptbTpzcyIpIH07"
    "Y29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpOwpjb25zdCBhcnIgPSBbMSwgMiwgMywgNCwgNSwgNiwgNywgOCwgOSwgMTBdOwpjb25zdCBjaHVua2VkID0gXy5jaHVuayhhcnIsIDMpOwpjb25zdCB1bmlxID0gXy51bmlxKFsxLCAyLCAyLCAzLCAzLCA0XSk7CmNvbnN0IHN1bSA9IF8uc3VtKGFycik7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGNodW5rZWQsIHVuaXEsIHN1bSB9Ow=="
    "Y29uc3QgQ3J5cHRvSlMgPSByZXF1aXJlKCdjcnlwdG8tanMnKTsKY29uc3QgdGV4dCA9ICdIZWxsbyBGbG93LUNvZGVCbG9jayc7CnJldHVybiB7CiAgICBzdWNjZXNzOiB0cnVlLAogICAgbWQ1OiBDcnlwdG9KUy5NRDUodGV4dCkudG9TdHJpbmcoKSwKICAgIHNoYTI1NjogQ3J5cHRvSlMuU0hBMjU2KHRleHQpLnRvU3RyaW5nKCksCiAgICBzaGE1MTI6IENyeXB0b0pTLlNIQTUxMih0ZXh0KS50b1N0cmluZygpCn07"
    "Y29uc3QgeyB2NCwgdjUgfSA9IHJlcXVpcmUoJ3V1aWQnKTsKcmV0dXJuIHsKICAgIHN1Y2Nlc3M6IHRydWUsCiAgICB1dWlkdjQ6IHY0KCksCiAgICB1dWlkdjU6IHY1KCdIZWxsbycsIHY1LkROUyksCiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKQp9Ow=="
    "Y29uc3QgcXMgPSByZXF1aXJlKCdxcycpOwpjb25zdCBxdWVyeSA9ICdhPTEmYj0yJmM9MyZkc2VbMF09eCZhcnJbMV09eSc7CmNvbnN0IHBhcnNlZCA9IHFzLnBhcnNlKHF1ZXJ5KTsKY29uc3Qgc3RyaW5naWZpZWQgPSBxcy5zdHJpbmdpZnkocGFyc2VkKTsKcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgcGFyc2VkLCBzdHJpbmdpZmllZCB9Ow=="
    "Y29uc3QgQnVmZmVyID0gcmVxdWlyZSgnYnVmZmVyJykuQnVmZmVyOwpjb25zdCBidWYxID0gQnVmZmVyLmZyb20oJ0hlbGxvJyk7CmNvbnN0IGJ1ZjIgPSBCdWZmZXIuYWxsb2MoMTApOwpidWYxLmNvcHkoYnVmMik7CmNvbnN0IGJ1ZjMgPSBCdWZmZXIuY29uY2F0KFtidWYxLCBidWYyXSk7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGxlbmd0aDogYnVmMy5sZW5ndGgsIGNvbnRlbnQ6IGJ1ZjMudG9TdHJpbmcoJ2Jhc2U2NCcpIH07"
    "Y29uc3QgZGF0YSA9IHsgdXNlcjogJ3Rlc3QnLCBhZ2U6IDI1LCB0YWdzOiBbJ2EnLCAnYicsICdjJ10sIG1ldGE6IHsgY3JlYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpIH0gfTsKY29uc3QganNvblN0ciA9IEpTT04uc3RyaW5naWZ5KGRhdGEpOwpjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb25TdHIpOwpyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBvcmlnaW5hbDogZGF0YSwgcGFyc2VkLCBzaXplOiBqc29uU3RyLmxlbmd0aCB9Ow=="
    "Y29uc3QgYXJyID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogMTAwIH0sIChfLCBpKSA9PiBpICsgMSk7CmNvbnN0IGZpbHRlcmVkID0gYXJyLmZpbHRlcih4ID0+IHggJSAyID09PSAwKTsKY29uc3QgbWFwcGVkID0gZmlsdGVyZWQubWFwKHggPT4geCAqIDIpOwpjb25zdCBzdW0gPSBtYXBwZWQucmVkdWNlKChhY2MsIHgpID0+IGFjYyArIHgsIDApOwpyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBvcmlnaW5hbDogYXJyLmxlbmd0aCwgZmlsdGVyZWQ6IGZpbHRlcmVkLmxlbmd0aCwgc3VtIH07"
    "Y29uc3Qgc3RyID0gJ0hlbGxvIFdvcmxkIEZyb20gRmxvdy1Db2RlQmxvY2sgR28hJzsKY29uc3QgdXBwZXIgPSBzdHIudG9VcHBlckNhc2UoKTsKY29uc3QgbG93ZXIgPSBzdHIudG9Mb3dlckNhc2UoKTsKY29uc3Qgd29yZHMgPSBzdHIuc3BsaXQoJyAnKTsKY29uc3QgcmV2ZXJzZWQgPSBzdHIuc3BsaXQoJycpLnJldmVyc2UoKS5qb2luKCcnKTsKcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgdXBwZXIsIGxvd2VyLCB3b3JkQ291bnQ6IHdvcmRzLmxlbmd0aCwgcmV2ZXJzZWQgfTs="
    "cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7CiAgICBzZXRUaW1lb3V0KCgpID0+IHsKICAgICAgICByZXNvbHZlKDEwKTsKICAgIH0sIDEwKTsKfSkudGhlbih2YWwgPT4gdmFsICogMikKICAgLnRoZW4odmFsID0+IHZhbCArIDUpCiAgIC50aGVuKHZhbCA9PiAoeyBzdWNjZXNzOiB0cnVlLCByZXN1bHQ6IHZhbCwgZXhwZWN0ZWQ6IDI1IH0pKTs="
    "Y29uc3QgcmVzdWx0cyA9IHsKICAgIHNxcnQ6IE1hdGguc3FydCgxNjApLAogICAgcG93OiBNYXRoLnBvdygyLCAxMCksCiAgICByYW5kb206IE1hdGgucmFuZG9tKCksCiAgICBmbG9vcjogTWF0aC5mbG9vcig5Ljk5KSwKICAgIGNlaWw6IE1hdGguY2VpbCg5LjAxKSwKICAgIG1heDogTWF0aC5tYXgoMSwgMiwgMywgNCwgNSksCiAgICBtaW46IE1hdGgubWluKDEsIDIsIDMsIDQsIDUpLAogICAgc2luOiBNYXRoLnNpbihNYXRoLlBJIC8gMikKfTsKcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgcmVzdWx0cyB9Ow=="
    "Y29uc3Qgbm93ID0gbmV3IERhdGUoKTsKY29uc3QgeWVzdGVyZGF5ID0gbmV3IERhdGUobm93LmdldFRpbWUoKSAtIDg2NDAwMDAwKTsKY29uc3QgdG9tb3Jyb3cgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpICsgODY0MDAwMDApOwpyZXR1cm4gewogICAgc3VjY2VzczogdHJ1ZSwKICAgIG5vdzogbm93LnRvSVNPU3RyaW5nKCksCiAgICB5ZXN0ZXJkYXk6IHllc3RlcmRheS50b0lTT1N0cmluZygpLAogICAgdG9tb3Jyb3c6IHRvbW9ycm93LnRvSVNPU3RyaW5nKCksCiAgICB0aW1lc3RhbXA6IG5vdy5nZXRUaW1lKCkKfTs="
    "Y29uc3QgdGV4dCA9ICdFbWFpbDogdGVzdEBleGFtcGxlLmNvbSwgUGhvbmU6IDEzODAwMTM4MDAwJzsKY29uc3QgZW1haWxNYXRjaCA9IHRleHQubWF0Y2goL1tcdytcLi1dK0BbXHcrXC5dK1wuXHcrLyk7CmNvbnN0IHBob25lTWF0Y2ggPSB0ZXh0Lm1hdGNoKC9cZHsxMX0vKTsKY29uc3QgcmVwbGFjZWQgPSB0ZXh0LnJlcGxhY2UoL1xkezExfS8sICcqKioqKioqKioqKicpOwpyZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBlbWFpbDogZW1haWxNYXRjaFswXSwgcGhvbmU6IHBob25lTWF0Y2hbMF0sIHJlcGxhY2VkIH07"
    "Y29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpOwpjb25zdCBvYmogPSB7CiAgICB1c2VyOiB7IG5hbWU6ICdKb2huJywgYWdlOiAzMCwgZW1haWw6ICdqb2huQGV4YW1wbGUuY29tJyB9LAogICAgc2V0dGluZ3M6IHsgdGhlbWU6ICdkYXJrJywgbGFuZzogJ3poJyB9LAogICAgdGFnczogWydhJywgJ2InLCAnYyddCn07CmNvbnN0IHBpY2tlZCA9IF8ucGljayhvYmosIFsndXNlcicsICd0YWdzJ10pOwpjb25zdCBtZXJnZWQgPSBfLm1lcmdlKHt9LCBvYmosIHsgdXNlcjogeyBhZ2U6IDMxIH0gfSK7CnJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG9yaWdpbmFsOiBvYmosIHBpY2tlZCwgbWVyZ2VkIH07"
)

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

# 获取随机测试代码
get_random_test_code() {
    local idx=$((RANDOM % ${#CODE_NAMES[@]}))
    echo "${CODE_NAMES[$idx]}|${CODE_BASE64[$idx]}"
}

# 执行单个测试请求
execute_request() {
    local token=$1
    local code_name=$2
    local code_base64=$3
    local request_id=$4
    
    local start_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    
    local response=$(curl -s -w "\n%{http_code}" --max-time 30 \
        --location "$API_URL" \
        --header "accessToken: $token" \
        --header "Content-Type: application/json" \
        --data "{\"input\": {}, \"codebase64\": \"$code_base64\"}" \
        2>&1)
    
    local end_time=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    local duration=$((end_time - start_time))
    
    local http_code=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | sed '$d')
    
    echo "$request_id|$code_name|$http_code|$duration|$body"
}

print_header "开始完整压力测试"
print_info "测试时间: $(date '+%Y-%m-%d %H:%M:%S')"
print_info "Token数量: $TOKEN_COUNT"
print_info "代码类型: ${#CODE_NAMES[@]}"

# 创建结果目录
mkdir -p "$RESULTS_DIR"

print_success "✅ 压力测试脚本已准备就绪（兼容bash 3.2）"
print_info "结果目录: $RESULTS_DIR"

