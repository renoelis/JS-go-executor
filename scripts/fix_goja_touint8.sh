#!/bin/bash

# Goja ToUint8 Bug 修复自动化脚本
# 用途：在 fork 的 goja 仓库中创建修复分支并应用补丁

set -e

FORK_REPO="https://github.com/renoelis/goja.git"
WORK_DIR="/tmp/goja-fix-$(date +%s)"
BRANCH_NAME="fix-touint8-ecmascript-compliance"

echo "=========================================="
echo "Goja ToUint8 Bug 修复脚本"
echo "=========================================="
echo ""

# 步骤 1: 克隆 fork 仓库
echo "步骤 1: 克隆 fork 仓库..."
git clone "$FORK_REPO" "$WORK_DIR"
cd "$WORK_DIR"

# 步骤 2: 创建修复分支
echo "步骤 2: 创建修复分支 $BRANCH_NAME..."
git checkout -b "$BRANCH_NAME"

# 步骤 3: 应用修复补丁
echo "步骤 3: 修复 runtime.go 中的 toUint8 函数..."

# 备份原文件
cp runtime.go runtime.go.bak

# 使用 sed 修复 toUint8 函数
# 查找并替换 toUint8 函数中的错误代码
cat > /tmp/touint8_fix.patch << 'EOF'
--- a/runtime.go
+++ b/runtime.go
@@ -1029,7 +1029,13 @@ func toUint8(v Value) uint8 {
 	if f, ok := v.(valueFloat); ok {
 		f := float64(f)
 		if !math.IsNaN(f) && !math.IsInf(f, 0) {
-			return uint8(int64(f))
+			// ✅ 修复：符合 ECMAScript 规范 7.1.11 ToUint8
+			// 步骤 4: Let int8bit be int modulo 2^8
+			modulo := math.Mod(f, 256)
+			// 处理负数：JavaScript 的模运算对负数返回正值
+			if modulo < 0 {
+				modulo += 256
+			}
+			return uint8(int64(modulo))
 		}
 	}
 	return 0
EOF

# 应用补丁（如果 patch 命令可用）
if command -v patch &> /dev/null; then
    patch -p1 < /tmp/touint8_fix.patch
    echo "✅ 补丁应用成功"
else
    echo "⚠️  patch 命令不可用，请手动修改 runtime.go"
    echo ""
    echo "需要修改的位置（约第 1032 行）："
    echo "原代码："
    echo "    return uint8(int64(f))"
    echo ""
    echo "修改为："
    echo "    // ✅ 修复：符合 ECMAScript 规范 7.1.11 ToUint8"
    echo "    modulo := math.Mod(f, 256)"
    echo "    if modulo < 0 {"
    echo "        modulo += 256"
    echo "    }"
    echo "    return uint8(int64(modulo))"
    echo ""
    read -p "请手动修改后按回车继续..."
fi

# 步骤 4: 验证修改
echo "步骤 4: 验证修改..."
if grep -q "math.Mod(f, 256)" runtime.go; then
    echo "✅ 修改已应用"
else
    echo "❌ 修改未应用，请检查"
    exit 1
fi

# 步骤 5: 提交修改
echo "步骤 5: 提交修改..."
git add runtime.go
git commit -m "fix: ToUint8 should modulo 256 per ECMAScript spec

- Fixes incorrect conversion of large float values (e.g., Number.MAX_VALUE)
- Implements ECMAScript 2026 spec 7.1.11 ToUint8 step 4
- int64 overflow was causing Number.MAX_VALUE to convert to 255 instead of 0
- Now correctly applies modulo 256 before conversion

Ref: https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8

Test case:
- Number.MAX_VALUE should convert to 0 (not 255)
- Matches Node.js v25.0.0 behavior
- Aligns Buffer and Uint8Array behavior with ECMAScript standard"

# 步骤 6: 推送到远程
echo "步骤 6: 推送到远程仓库..."
echo ""
echo "即将推送到: $FORK_REPO"
echo "分支: $BRANCH_NAME"
echo ""
read -p "确认推送？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin "$BRANCH_NAME"
    echo "✅ 推送成功"
else
    echo "⚠️  跳过推送，你可以稍后手动推送："
    echo "    cd $WORK_DIR"
    echo "    git push origin $BRANCH_NAME"
fi

# 步骤 7: 获取 commit hash
COMMIT_HASH=$(git rev-parse HEAD)
echo ""
echo "=========================================="
echo "修复完成！"
echo "=========================================="
echo "工作目录: $WORK_DIR"
echo "分支名称: $BRANCH_NAME"
echo "Commit Hash: $COMMIT_HASH"
echo ""
echo "下一步操作："
echo "1. 更新项目的 go.mod，添加以下内容："
echo ""
echo "// 使用 fork 版本的 goja 以修复 ToUint8 bug"
echo "replace github.com/dop251/goja => github.com/renoelis/goja $COMMIT_HASH"
echo ""
echo "2. 运行以下命令更新依赖："
echo "    cd /Users/Code/Go-product/Flow-codeblock_goja"
echo "    go mod tidy"
echo "    go get github.com/renoelis/goja@$COMMIT_HASH"
echo ""
echo "3. 重新编译并测试："
echo "    go build -o flow-codeblock-go cmd/main.go"
echo "    cd test/buffer-native/buf.index"
echo "    ./run_all_tests.sh"
echo ""
echo "=========================================="
