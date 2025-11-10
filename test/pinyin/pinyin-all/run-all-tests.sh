#!/bin/bash

# Pinyin 完整测试套件运行脚本

echo "========================================"
echo "  运行 Pinyin 完整测试套件"
echo "========================================"
echo ""

# 测试文件列表
tests=(
  "test-pinyin-compare.js"
  "test-pinyin-style.js"
  "test-pinyin-mode.js"
  "test-pinyin-options.js"
  "test-pinyin-segment.js"
)

# 运行每个测试
for test in "${tests[@]}"; do
  echo "----------------------------------------"
  echo "运行: $test"
  echo "----------------------------------------"
  node "test/pinyin/pinyin-all/$test"
  echo ""
done

echo "========================================"
echo "  所有测试运行完成"
echo "========================================"
