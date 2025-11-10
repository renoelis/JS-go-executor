# Goja Fork 修复指南

## 步骤 1: 在你的 fork 仓库中创建修复分支

```bash
# 克隆你的 fork
cd /tmp
git clone https://github.com/renoelis/goja.git
cd goja

# 创建修复分支
git checkout -b fix-touint8-ecmascript-compliance

# 查看当前 commit
git log --oneline -1
```

## 步骤 2: 修复 runtime.go 中的 toUint8 函数

编辑文件 `runtime.go`，找到 `toUint8` 函数（约在第 1023 行）：

### 原始代码（错误）：
```go
func toUint8(v Value) uint8 {
	v = v.ToNumber()
	if i, ok := v.(valueInt); ok {
		return uint8(i)
	}

	if f, ok := v.(valueFloat); ok {
		f := float64(f)
		if !math.IsNaN(f) && !math.IsInf(f, 0) {
			return uint8(int64(f))  // ❌ 错误：没有对 256 取模
		}
	}
	return 0
}
```

### 修复后的代码：
```go
func toUint8(v Value) uint8 {
	v = v.ToNumber()
	if i, ok := v.(valueInt); ok {
		return uint8(i)
	}

	if f, ok := v.(valueFloat); ok {
		f := float64(f)
		if !math.IsNaN(f) && !math.IsInf(f, 0) {
			// ✅ 修复：符合 ECMAScript 规范 7.1.11 ToUint8
			// 步骤 4: Let int8bit be int modulo 2^8
			modulo := math.Mod(f, 256)
			// 处理负数：JavaScript 的模运算对负数返回正值
			if modulo < 0 {
				modulo += 256
			}
			return uint8(int64(modulo))
		}
	}
	return 0
}
```

## 步骤 3: 提交并推送修复

```bash
# 提交修改
git add runtime.go
git commit -m "fix: ToUint8 should modulo 256 per ECMAScript spec

- Fixes incorrect conversion of large float values (e.g., Number.MAX_VALUE)
- Implements ECMAScript 2026 spec 7.1.11 ToUint8 step 4
- int64 overflow was causing Number.MAX_VALUE to convert to 255 instead of 0
- Now correctly applies modulo 256 before conversion

Ref: https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8"

# 推送到你的 fork
git push origin fix-touint8-ecmascript-compliance
```

## 步骤 4: 更新项目的 go.mod

回到你的项目目录，更新 `go.mod`：

```bash
cd /Users/Code/Go-product/Flow-codeblock_goja
```

在 `go.mod` 文件末尾添加 replace 指令：

```go
// 使用 fork 版本的 goja 以修复 ToUint8 bug
replace github.com/dop251/goja => github.com/renoelis/goja fix-touint8-ecmascript-compliance
```

## 步骤 5: 更新依赖

```bash
# 清理缓存
go clean -modcache

# 更新依赖
go mod tidy

# 下载新版本
go get github.com/renoelis/goja@fix-touint8-ecmascript-compliance
```

## 步骤 6: 验证修复

```bash
# 重新编译
go build -o flow-codeblock-go cmd/main.go

# 运行测试
cd test/buffer-native/buf.index
./run_all_tests.sh
```

## 步骤 7: 验证 Number.MAX_VALUE 转换

创建测试文件验证修复：

```bash
cat > /tmp/test_fix.js << 'EOF'
const { Buffer } = require('buffer');

const buf = Buffer.alloc(1);
const arr = new Uint8Array(1);

buf[0] = Number.MAX_VALUE;
arr[0] = Number.MAX_VALUE;

console.log(JSON.stringify({
  buffer: buf[0],
  uint8array: arr[0],
  expected: 0,
  fixed: buf[0] === 0 && arr[0] === 0
}, null, 2));
EOF

CODE=$(base64 < /tmp/test_fix.js)
curl -s --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --header 'accessToken: flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15' \
  --data "{\"codebase64\": \"$CODE\", \"input\": {}}" | jq '.result'
```

期望输出：
```json
{
  "buffer": 0,
  "uint8array": 0,
  "expected": 0,
  "fixed": true
}
```

## 步骤 8: （可选）向上游提交 PR

如果修复验证成功，可以向原始 goja 仓库提交 PR：

1. 访问 https://github.com/dop251/goja
2. 点击 "New Pull Request"
3. 选择你的 fork 和 `fix-touint8-ecmascript-compliance` 分支
4. 填写 PR 描述，引用 ECMAScript 规范和测试结果

## 故障排除

### 问题 1: go get 失败

```bash
# 确保分支已推送
git push origin fix-touint8-ecmascript-compliance

# 使用完整的 commit hash
go get github.com/renoelis/goja@<commit-hash>
```

### 问题 2: 依赖冲突

```bash
# 清理所有缓存
go clean -modcache
rm -rf ~/go/pkg/mod/github.com/renoelis

# 重新下载
go mod download
```

### 问题 3: 编译错误

```bash
# 确保 Go 版本正确
go version  # 应该是 1.25.0+

# 重新生成 go.sum
rm go.sum
go mod tidy
```

## 参考资料

- [ECMAScript ToUint8 规范](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-touint8)
- [Goja 项目](https://github.com/dop251/goja)
- [Bug 分析报告](./GOJA_TOUINT8_BUG_ANALYSIS.md)
