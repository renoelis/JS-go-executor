#!/bin/bash

# Axios 完整测试套件运行脚本
# 运行所有 axios 测试文件

echo "========================================"
echo "Axios 完整测试套件"
echo "========================================"
echo ""

# 测试 API 端口
API_PORT=3002
API_URL="http://localhost:${API_PORT}/flow/codeblock"
HEALTH_URL="http://localhost:${API_PORT}/health"

# 检查服务是否运行
echo "检查服务状态..."
if curl -s -f "${HEALTH_URL}" > /dev/null 2>&1; then
    echo "✓ 服务运行中"
else
    echo "⚠️  服务未运行，请先启动服务"
    echo "   cd go-executor && ./server"
    exit 1
fi

echo ""
echo "开始运行测试..."
echo ""

# 测试文件列表
tests=(
    "basic-request-test.js"
    "interceptor-test.js"
    "cancel-test.js"
    "instance-test.js"
    "security-test.js"
    "http-methods-complete-test.js"
    "real-file-upload-test.js"
    # "formdata-upload-test.js"
    # "nodejs-formdata-test.js"
    "concurrent-test.js"
    "timeout-error-test.js"
    "response-types-test.js"
    "urlsearchparams-test.js"
    "request-body-formats-test.js"
    "response-handling-test.js"
    "headers-test.js"
    "validate-status-test.js"
    "transformers-test.js"
)

# 测试名称映射
get_test_name() {
    case "$1" in
        "basic-request-test.js")
            echo "基础请求测试"
            ;;
        "interceptor-test.js")
            echo "拦截器测试"
            ;;
        "cancel-test.js")
            echo "请求取消测试"
            ;;
        "instance-test.js")
            echo "实例和配置测试"
            ;;
        "security-test.js")
            echo "安全性测试"
            ;;
        "http-methods-complete-test.js")
            echo "HTTP 方法完整性测试"
            ;;
        "formdata-upload-test.js")
            echo "FormData 文件上传测试"
            ;;
        "concurrent-test.js")
            echo "并发请求测试"
            ;;
        "timeout-error-test.js")
            echo "超时和错误处理测试"
            ;;
        "response-types-test.js")
            echo "响应类型测试"
            ;;
        "nodejs-formdata-test.js")
            echo "Node.js FormData 模块测试"
            ;;
        "urlsearchparams-test.js")
            echo "URLSearchParams 支持测试"
            ;;
        "request-body-formats-test.js")
            echo "请求体格式测试"
            ;;
        "response-handling-test.js")
            echo "响应处理完整性测试"
            ;;
        "headers-test.js")
            echo "特殊请求头测试"
            ;;
        "validate-status-test.js")
            echo "状态码验证测试"
            ;;
        "transformers-test.js")
            echo "数据转换器测试"
            ;;
        *)
            echo "$1"
            ;;
    esac
}

# 运行测试
total_tests=0
total_passed=0
total_failed=0
test_results=()

for i in "${!tests[@]}"; do
    test_file="${tests[$i]}"
    test_name=$(get_test_name "$test_file")
    test_num=$((i + 1))
    
    echo "[$test_num/${#tests[@]}] 运行: $test_name"
    echo "文件: $test_file"
    echo "----------------------------------------"
    
    # Base64 编码测试文件
    if [ ! -f "$test_file" ]; then
        echo "❌ 测试文件不存在: $test_file"
        test_results+=("$test_name:SKIP:文件不存在")
        echo ""
        continue
    fi
    
    test_code=$(cat "$test_file" | base64)
    
    # 执行测试
    response=$(curl -s --location "$API_URL" \
        --header 'Content-Type: application/json' \
        --data "{\"input\": {}, \"codebase64\": \"$test_code\"}")
    
    # 解析结果
    if echo "$response" | grep -q '"success":true'; then
        passed=$(echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('result', {}).get('passed', 0))" 2>/dev/null)
        failed=$(echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('result', {}).get('failed', 0))" 2>/dev/null)
        total=$(echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('result', {}).get('total', 0))" 2>/dev/null)
        
        if [ -z "$passed" ] || [ -z "$failed" ]; then
            echo "⚠️  无法解析测试结果"
            test_results+=("$test_name:ERROR:解析失败")
        elif [ "$failed" -eq 0 ]; then
            echo -e "\033[0;32m✅ 通过: $passed/$total\033[0m"
            total_tests=$((total_tests + total))
            total_passed=$((total_passed + passed))
            test_results+=("$test_name:PASS:$passed/$total")
        else
            echo -e "\033[0;31m❌ 失败: $failed/$total (通过: $passed)\033[0m"
            total_tests=$((total_tests + total))
            total_passed=$((total_passed + passed))
            total_failed=$((total_failed + failed))
            test_results+=("$test_name:FAIL:$passed/$total")
        fi
    else
        echo "❌ 测试执行失败"
        error_msg=$(echo "$response" | python3 -c "import sys,json; r=json.load(sys.stdin); print(r.get('error', 'Unknown error'))" 2>/dev/null)
        echo "   错误: $error_msg"
        test_results+=("$test_name:ERROR:$error_msg")
    fi
    
    echo ""
done

# 打印总结
echo "========================================"
echo "测试总结"
echo "========================================"
echo "测试文件: ${#tests[@]} 个"
echo "总测试用例: $total_tests 个"
echo -e "通过: \033[0;32m$total_passed\033[0m 个"

if [ $total_failed -gt 0 ]; then
    echo -e "失败: \033[0;31m$total_failed\033[0m 个"
fi

echo ""
echo "详细结果:"
for result in "${test_results[@]}"; do
    IFS=':' read -r name status detail <<< "$result"
    case "$status" in
        PASS)
            echo -e "  \033[0;32m✅ $name: $detail\033[0m"
            ;;
        FAIL)
            echo -e "  \033[0;31m❌ $name: $detail\033[0m"
            ;;
        ERROR)
            echo -e "  \033[0;33m⚠️  $name: $detail\033[0m"
            ;;
        SKIP)
            echo -e "  \033[0;33m⊘  $name: $detail\033[0m"
            ;;
    esac
done

echo ""
echo "========================================"

# 计算通过率
if [ $total_tests -gt 0 ]; then
    pass_rate=$((total_passed * 100 / total_tests))
    echo "通过率: $pass_rate%"
fi

# 返回状态码
if [ $total_failed -eq 0 ] && [ $total_tests -gt 0 ]; then
    echo -e "\033[0;32m✅ 所有测试通过！\033[0m"
    exit 0
else
    echo -e "\033[0;31m❌ 部分测试失败\033[0m"
    exit 1
fi
