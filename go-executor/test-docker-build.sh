#!/bin/bash

echo "🐳 测试 Docker 构建和 crypto-js 加载"

# 构建 Docker 镜像
echo "📦 构建 Docker 镜像..."
docker build -t flow-codeblock-go-test .

if [ $? -eq 0 ]; then
    echo "✅ Docker 镜像构建成功"
    
    # 启动容器进行测试
    echo "🚀 启动容器进行测试..."
    docker run -d --name flow-test -p 3003:3002 flow-codeblock-go-test
    
    # 等待服务启动
    echo "⏳ 等待服务启动..."
    sleep 5
    
    # 测试 crypto 功能
    echo "🧪 测试 crypto 功能..."
    TEST_CODE='const crypto = require("crypto"); return { crypto_loaded: !!crypto, has_cryptojs: !!crypto.CryptoJS, methods: Object.keys(crypto) };'
    ENCODED_CODE=$(echo "$TEST_CODE" | base64)
    
    RESULT=$(curl -s -X POST http://localhost:3003/flow/codeblock \
        -H "Content-Type: application/json" \
        -d "{\"input\": {}, \"codebase64\": \"$ENCODED_CODE\"}")
    
    echo "📊 测试结果:"
    echo "$RESULT" | python3 -m json.tool
    
    # 清理
    echo "🧹 清理容器..."
    docker stop flow-test
    docker rm flow-test
    
    echo "✅ Docker 部署测试完成"
else
    echo "❌ Docker 镜像构建失败"
    exit 1
fi



