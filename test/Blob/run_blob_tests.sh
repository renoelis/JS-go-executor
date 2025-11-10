#!/bin/bash

# Blob/File API 测试运行脚本

echo "========================================"
echo "  运行 Blob/File API 规范符合性测试"
echo "========================================"
echo ""

# 检查可执行文件是否存在
if [ ! -f "../../flow-codeblock-go" ]; then
    echo "❌ 错误: flow-codeblock-go 不存在"
    echo "请先运行: go build -o flow-codeblock-go"
    exit 1
fi

# 运行测试
echo "📝 运行测试文件: blob_file_compliance_test.js"
echo ""

../../flow-codeblock-go --test test/Blob/blob_file_compliance_test.js

# 检查退出码
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 测试执行完成"
else
    echo ""
    echo "❌ 测试执行失败"
    exit 1
fi
