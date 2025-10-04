#!/bin/bash

# xlsx 模块测试运行脚本

echo "========================================"
echo "🧪 xlsx 模块测试套件"
echo "========================================"
echo ""

# 检查服务是否运行
check_service() {
    response=$(curl -s http://localhost:3002/health 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "✅ Go 执行器服务正在运行"
        return 0
    else
        echo "❌ Go 执行器服务未运行"
        echo "请先启动服务: cd go-executor && go run cmd/main.go"
        return 1
    fi
}

# 运行测试
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo ""
    echo "----------------------------------------"
    echo "▶️  运行: $test_name"
    echo "----------------------------------------"
    
    # 读取测试文件
    code=$(cat "$test_file")
    
    # Base64 编码
    code_base64=$(echo "$code" | base64)
    
    # 发送请求
    response=$(curl -s -X POST http://localhost:3002/flow/codeblock \
        -H "Content-Type: application/json" \
        -d "{
            \"input\": {},
            \"codebase64\": \"$code_base64\"
        }")
    
    # 解析响应
    success=$(echo "$response" | grep -o '"success":[^,}]*' | cut -d':' -f2)
    
    if [ "$success" = "true" ]; then
        echo "✅ $test_name 通过"
        
        # 显示执行时间
        exec_time=$(echo "$response" | grep -o '"executionTime":[^,}]*' | cut -d':' -f2)
        if [ -n "$exec_time" ]; then
            echo "⏱️  执行时间: ${exec_time}ms"
        fi
        
        return 0
    else
        echo "❌ $test_name 失败"
        echo "$response" | jq '.' 2>/dev/null || echo "$response"
        return 1
    fi
}

# 主测试流程
main() {
    # 检查服务
    check_service
    if [ $? -ne 0 ]; then
        exit 1
    fi
    
    echo ""
    echo "开始运行测试..."
    
    # 测试计数
    total_tests=0
    passed_tests=0
    
    # 测试 1: 基础功能测试
    total_tests=$((total_tests + 1))
    run_test "test/xlsx/basic-xlsx-test.js" "基础功能测试"
    if [ $? -eq 0 ]; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # 测试 2: 流式功能测试
    total_tests=$((total_tests + 1))
    run_test "test/xlsx/stream-xlsx-test.js" "流式功能测试"
    if [ $? -eq 0 ]; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # 测试总结
    echo ""
    echo "========================================"
    echo "📊 测试总结"
    echo "========================================"
    echo "总测试数: $total_tests"
    echo "通过测试: $passed_tests"
    echo "失败测试: $((total_tests - passed_tests))"
    
    if [ $passed_tests -eq $total_tests ]; then
        echo ""
        echo "🎉 所有测试通过！"
        echo "========================================"
        exit 0
    else
        echo ""
        echo "❌ 部分测试失败"
        echo "========================================"
        exit 1
    fi
}

# 运行主函数
main






