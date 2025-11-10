#!/bin/bash

# Pinyin 测试运行脚本

echo "🚀 启动 Flow-codeblock 服务..."

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"

cd "$PROJECT_ROOT"

# 检查服务是否已运行
if ! curl -s http://localhost:8099/health > /dev/null 2>&1; then
    echo "⚠️  服务未运行，正在启动..."
    # 后台启动服务
    ./flow-codeblock-go > /tmp/flow-codeblock.log 2>&1 &
    SERVER_PID=$!
    
    # 等待服务启动
    echo "等待服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:8099/health > /dev/null 2>&1; then
            echo "✅ 服务启动成功！"
            break
        fi
        sleep 1
        echo -n "."
    done
    
    if ! curl -s http://localhost:8099/health > /dev/null 2>&1; then
        echo ""
        echo "❌ 服务启动失败！"
        exit 1
    fi
else
    echo "✅ 服务已运行"
fi

echo ""
echo "🧪 开始运行 Pinyin 测试..."
echo ""

# 运行测试
curl -X POST http://localhost:8099/api/execute \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "code": "$(cat $SCRIPT_DIR/pinyin_comprehensive_test.js)",
  "timeout": 30000
}
EOF

echo ""
echo ""
echo "✅ 测试完成！"

# 如果是脚本启动的服务，询问是否关闭
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    read -p "是否关闭测试服务？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kill $SERVER_PID
        echo "✅ 服务已关闭"
    fi
fi


