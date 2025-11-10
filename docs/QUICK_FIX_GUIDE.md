# Goja ToUint8 Bug 快速修复指南

## 一键修复（推荐）

运行自动化脚本：

```bash
cd /Users/Code/Go-product/Flow-codeblock_goja
./scripts/fix_goja_touint8.sh
```

脚本会自动完成：
1. ✅ 克隆你的 fork 仓库
2. ✅ 创建修复分支 `fix-touint8-ecmascript-compliance`
3. ✅ 应用修复补丁
4. ✅ 提交并推送到 GitHub

## 手动修复（如果自动化失败）

### 步骤 1: 克隆并修改 fork 仓库

```bash
# 克隆你的 fork
cd /tmp
git clone https://github.com/renoelis/goja.git
cd goja

# 创建修复分支
git checkout -b fix-touint8-ecmascript-compliance

# 编辑 runtime.go（约第 1032 行）
vim runtime.go
```

找到 `toUint8` 函数，将：

```go
return uint8(int64(f))
```

替换为：

```go
// ✅ 修复：符合 ECMAScript 规范 7.1.11 ToUint8
modulo := math.Mod(f, 256)
if modulo < 0 {
    modulo += 256
}
return uint8(int64(modulo))
```

### 步骤 2: 提交并推送

```bash
git add runtime.go
git commit -m "fix: ToUint8 should modulo 256 per ECMAScript spec"
git push origin fix-touint8-ecmascript-compliance

# 记录 commit hash
git rev-parse HEAD
```

### 步骤 3: 更新项目依赖

回到项目目录：

```bash
cd /Users/Code/Go-product/Flow-codeblock_goja
```

编辑 `go.mod`，在文件末尾添加：

```go
// 使用 fork 版本的 goja 以修复 ToUint8 bug
replace github.com/dop251/goja => github.com/renoelis/goja <COMMIT_HASH>
```

将 `<COMMIT_HASH>` 替换为上一步记录的 commit hash。

### 步骤 4: 更新依赖并编译

```bash
# 清理缓存
go clean -modcache

# 更新依赖
go mod tidy

# 编译
go build -o flow-codeblock-go cmd/main.go
```

### 步骤 5: 验证修复

```bash
# 重启服务
docker-compose down
docker-compose build
docker-compose up -d

# 等待服务启动
sleep 5

# 运行测试
cd test/buffer-native/buf.index
./run_all_tests.sh
```

## 验证修复是否成功

创建测试脚本：

```bash
cat > /tmp/verify_fix.js << 'EOF'
const { Buffer } = require('buffer');

const tests = [
  { name: 'Number.MAX_VALUE', value: Number.MAX_VALUE, expected: 0 },
  { name: 'Number.MIN_VALUE', value: Number.MIN_VALUE, expected: 0 },
  { name: 'Infinity', value: Infinity, expected: 0 },
  { name: '-Infinity', value: -Infinity, expected: 0 },
  { name: 'NaN', value: NaN, expected: 0 },
];

const results = tests.map(t => {
  const buf = Buffer.alloc(1);
  const arr = new Uint8Array(1);
  
  buf[0] = t.value;
  arr[0] = t.value;
  
  return {
    name: t.name,
    buffer: buf[0],
    uint8array: arr[0],
    expected: t.expected,
    bufferMatch: buf[0] === t.expected,
    uint8Match: arr[0] === t.expected,
    consistent: buf[0] === arr[0],
    pass: buf[0] === t.expected && arr[0] === t.expected
  };
});

const allPass = results.every(r => r.pass);

console.log(JSON.stringify({
  allPass,
  results
}, null, 2));

return { allPass, results };
EOF

# 运行验证
CODE=$(base64 < /tmp/verify_fix.js)
curl -s --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --header 'accessToken: flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15' \
  --data "{\"codebase64\": \"$CODE\", \"input\": {}}" | jq '.result'
```

期望输出：

```json
{
  "allPass": true,
  "results": [
    {
      "name": "Number.MAX_VALUE",
      "buffer": 0,
      "uint8array": 0,
      "expected": 0,
      "bufferMatch": true,
      "uint8Match": true,
      "consistent": true,
      "pass": true
    },
    ...
  ]
}
```

## 故障排除

### 问题 1: go mod tidy 报错

```bash
# 清理所有缓存
go clean -modcache
rm -rf ~/go/pkg/mod/github.com/renoelis
rm go.sum

# 重新下载
go mod download
go mod tidy
```

### 问题 2: 编译错误

```bash
# 确保使用正确的 Go 版本
go version  # 应该是 1.25.0+

# 重新生成依赖
rm go.sum
go mod tidy
go build -o flow-codeblock-go cmd/main.go
```

### 问题 3: Docker 构建失败

```bash
# 完全清理并重建
docker-compose down
docker system prune -f
docker-compose build --no-cache
docker-compose up -d
```

## 相关文档

- [详细修复指南](./GOJA_FORK_FIX_GUIDE.md)
- [Bug 分析报告](./GOJA_TOUINT8_BUG_ANALYSIS.md)
- [ECMAScript ToUint8 规范](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8)
