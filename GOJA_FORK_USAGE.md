# Goja Fork 使用说明

## 问题背景

goja 的 TypedArray 实现对极大值（如 `Number.MAX_VALUE`）的转换有 bug：

```javascript
// Bug 行为
const arr = new Uint8Array(1);
arr[0] = Number.MAX_VALUE;
console.log(arr[0]); // 255 (错误，应该是 0)
```

## 修复方案

我们 fork 了 goja 并修复了这个问题：
- Fork 仓库：https://github.com/renoelis/goja
- 修复 commit：`bf0abe8fa39c34743161c32ba6ab4e1f0a3ef114`
- 修复时间：2025-11-08 14:59:48

### 修复的函数

在 `runtime.go` 中修复了以下函数：
- `toUint8` - Uint8Array 转换
- `toInt8` - Int8Array 转换
- `toUint16` - Uint16Array 转换
- `toInt16` - Int16Array 转换
- `toUint32` - Uint32Array 转换
- `toInt32` - Int32Array 转换

### 修复原理

使用 `math.Mod` 替代 `int64` 转换，避免溢出：

```go
// 修复前
func toUint8(v Value) uint8 {
    // ...
    return uint8(int64(f))  // 溢出！
}

// 修复后
func toUint8(v Value) uint8 {
    // ...
    intPart := math.Trunc(f)
    mod := math.Mod(intPart, 256)
    if mod < 0 {
        mod += 256
    }
    return uint8(mod)
}
```

## 为什么不能直接从 GitHub 下载？

### 原因 1：Go Proxy 缓存延迟

Go 的代理服务器需要时间索引新提交：

```bash
# 尝试下载会失败
go get github.com/renoelis/goja@bf0abe8fa39c
# 错误：unknown revision bf0abe8fa39c
```

**解决时间**：通常需要 10-30 分钟，最长可能需要几小时

### 原因 2：网络 TLS 版本限制

你的网络环境对 TLS 版本有限制：

```
remote error: tls: protocol version not supported
```

这导致无法访问：
- `proxy.golang.org`（官方代理）
- `goproxy.cn`（国内代理）

### 原因 3：伪版本号格式

Go 的伪版本号格式：`v0.0.0-时间戳-commit哈希前12位`

正确的版本号应该是：
```
v0.0.0-20251108145948-bf0abe8fa39c
```

但由于网络问题，即使使用正确版本号也无法下载。

## 当前解决方案（已更新）

使用远程仓库替换：

```go
// go.mod
replace github.com/dop251/goja => github.com/renoelis/goja v0.0.1-typedarray-fix
```

### 优点
- ✅ 标准化，符合 Go 模块最佳实践
- ✅ 团队协作方便，无需提交整个 fork_goja 目录
- ✅ CI/CD 自动化流程更顺畅
- ✅ 版本管理清晰，通过 Git 标签控制版本
- ✅ 代码集中管理，便于追踪变更

### 缺点
- ❌ 依赖网络（但可通过代理解决）
- ❌ Go 代理可能需要时间索引新标签（通常几分钟）

### 历史方案（本地路径）

之前使用的本地路径方案：

```go
// go.mod（已弃用）
replace github.com/dop251/goja => ./fork_goja/goja
```

**优点**：
- ✅ 不依赖网络
- ✅ 立即生效
- ✅ 便于调试和修改

**缺点**：
- ❌ 需要提交 fork_goja 目录到版本控制（增加仓库体积）
- ❌ 团队成员需要同步整个目录
- ❌ 无法使用 `go get -u` 更新
- ❌ CI/CD 需要特殊处理

## 生产环境部署方案

### 方案 1：等待 Go Proxy 索引（推荐）

等待 10-30 分钟后，使用远程版本：

```go
// go.mod
replace github.com/dop251/goja => github.com/renoelis/goja v0.0.0-20251108145948-bf0abe8fa39c
```

验证是否可用：

```bash
# 使用国内代理
GOPROXY=https://goproxy.cn,direct go get github.com/renoelis/goja@bf0abe8fa39c

# 或使用官方代理
GOPROXY=https://proxy.golang.org,direct go get github.com/renoelis/goja@bf0abe8fa39c
```

### 方案 2：使用 Git 标签

在 fork 仓库创建标签：

```bash
cd fork_goja/goja
git tag v0.0.1-fix-typedarray
git push origin v0.0.1-fix-typedarray
```

然后在 go.mod 中使用：

```go
replace github.com/dop251/goja => github.com/renoelis/goja v0.0.1-fix-typedarray
```

### 方案 3：提交 PR 到官方仓库

将修复提交到官方 goja 仓库：
- 仓库：https://github.com/dop251/goja
- 创建 PR 说明问题和修复
- 等待合并后使用官方版本

## Docker 部署注意事项

### 当前方案（本地路径）

```dockerfile
# Dockerfile.local
FROM alpine:latest
COPY ./flow-codeblock-go .
```

需要先交叉编译：

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o flow-codeblock-go cmd/main.go
```

### 未来方案（远程依赖）

恢复使用标准 Dockerfile：

```dockerfile
# Dockerfile
FROM golang:1.25.3-alpine AS builder
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o flow-codeblock-go ./cmd/main.go
```

## 测试结果

修复后的测试结果：

```
总测试数: 191
通过: 189
失败: 2
成功率: 98.95%
```

修复前 Number.MAX_VALUE 测试失败，修复后通过：

```javascript
// 测试代码
const arr = new Uint8Array(5);
arr[0] = Infinity;        // 0 ✅
arr[1] = -Infinity;       // 0 ✅
arr[2] = NaN;             // 0 ✅
arr[3] = Number.MAX_VALUE; // 0 ✅ (修复前是 255)
arr[4] = Number.MIN_VALUE; // 0 ✅
```

## 当前状态

1. ✅ Fork 仓库已创建：https://github.com/renoelis/goja
2. ✅ 版本标签已创建：v0.0.1-typedarray-fix
3. ✅ 依赖已更新（golang.org/x/text v0.30.0, sourcemap v2.1.4）
4. ✅ 项目已切换为使用远程仓库
5. ✅ 验证编译通过

## 后续计划

1. ✅ ~~等待 Go Proxy 索引完成~~（已完成，可直接使用）
2. ✅ ~~验证远程版本可用~~（已验证）
3. ✅ ~~更新 go.mod 使用远程版本~~（已完成）
4. 🚀 提交 PR 到官方 goja 仓库（可选）
5. 🎯 等待官方合并后切换回官方版本（长期目标）

## 相关链接

- **Fork 仓库**：https://github.com/renoelis/goja
- **官方仓库**：https://github.com/dop251/goja
- **修复 Commit**：https://github.com/renoelis/goja/commit/bf0abe8fa39c34743161c32ba6ab4e1f0a3ef114
- **测试文档**：[test/buffer-native/buf.index/TEST_SUMMARY.md](test/buffer-native/buf.index/TEST_SUMMARY.md)
