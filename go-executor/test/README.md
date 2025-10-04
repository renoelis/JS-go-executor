# 📚 Fetch API 测试套件

> 全面的 Fetch API 功能测试、性能测试和错误处理测试

---

## 🚀 快速开始

```bash
# 1. 启动 Flow-codeblock 服务
cd ../flow-codeblock
npm start

# 2. 运行基础测试（推荐先运行）
cd ../test
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat fetch-comprehensive-test.js | base64)\"
  }"

# 查看 RUN_ALL_TESTS.md 获取更多命令
```

---

## 📁 文件导航

### 🧪 测试脚本（按优先级排序）

| 优先级 | 文件 | 测试数 | 说明 |
|-------|------|-------|------|
| ⭐⭐⭐ | [fetch-comprehensive-test.js](./fetch-comprehensive-test.js) | 10 | **必测** - 基础功能、CRUD、错误处理 |
| ⭐⭐⭐ | [fetch-concurrent-test.js](./fetch-concurrent-test.js) | 5 | **必测** - 并发请求、连接池性能 |
| ⭐⭐ | [fetch-timeout-test.js](./fetch-timeout-test.js) | 6 | 超时控制、大数据传输 |
| ⭐⭐ | [fetch-redirect-auth-test.js](./fetch-redirect-auth-test.js) | 9 | 重定向、401/403 认证失败 |
| ⭐ | [fetch-formdata-test.js](./fetch-formdata-test.js) | 1 | 文件上传（可选，取决于环境） |

### 📖 文档

| 文档 | 用途 |
|------|------|
| [TEST_SUMMARY.md](./TEST_SUMMARY.md) | 📊 **总览** - 测试覆盖、预期结果、报告模板 |
| [COMPREHENSIVE_TEST_GUIDE.md](./COMPREHENSIVE_TEST_GUIDE.md) | 📚 **详细指南** - 每个测试的说明、验证点 |
| [RUN_ALL_TESTS.md](./RUN_ALL_TESTS.md) | 🚀 **运行指南** - 如何执行测试、故障排查 |
| [FETCH_FINAL_VALIDATION_REPORT.md](./FETCH_FINAL_VALIDATION_REPORT.md) | 📝 之前的测试结果报告 |

---

## 🎯 测试覆盖范围

### HTTP 方法
✅ GET | ✅ POST | ✅ PUT | ✅ PATCH | ✅ DELETE

### 响应格式
✅ JSON Object | ✅ JSON Array | ✅ Text/HTML | ✅ Binary (ArrayBuffer)

### 错误场景
✅ 404 (友好错误) | ✅ 401/403 (认证) | ✅ 500/503 (服务器错误) | ✅ Network Error

### 高级功能
✅ 并发请求 | ✅ 连接池 | ✅ 大数据传输 | ✅ 重定向 | ⚠️ 文件上传

---

## 📊 测试统计

```
总测试场景: 31+
预期通过率: 85-95%

基础功能测试:     10 个  (必须 > 90%)
并发请求测试:      5 个  (必须 100%)
超时和大数据:      6 个  (建议 > 85%)
重定向认证:        9 个  (建议 > 85%)
FormData:          1 个  (可选)
```

---

## 🔑 关键改进验证

### 1. 友好的错误信息 ⭐⭐⭐

**测试文件**: `fetch-comprehensive-test.js` - 测试 8

**场景**: GET 404 → 尝试 `response.json()`

**改进**:
```
旧: "Invalid JSON: invalid character 'p' after..."
新: "Failed to parse JSON (HTTP 404): ... Body preview: 404 page not found"
```

✅ 现在用户能立即看到是 404 错误！

---

### 2. 并发性能 ⭐⭐⭐

**测试文件**: `fetch-concurrent-test.js`

**场景**: 并发 5 个 GET vs 顺序 5 个 GET

**预期性能提升**: 3-5 倍

```
并发执行: ~500-800ms
顺序执行: ~2500-3500ms
```

---

### 3. HTTP 连接池优化 ⭐⭐

**配置**:
```go
MaxIdleConns: 100
MaxIdleConnsPerHost: 10
IdleConnTimeout: 90s
HTTP/2: enabled
```

**测试**: `fetch-concurrent-test.js` - 测试 4 (10 个并发)

---

## 🏃 快速测试命令

### 方法 1: 单个测试

```bash
# 测试 1: 基础功能（推荐先运行）
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --data "{
    \"input\": {},
    \"codebase64\": \"$(cat fetch-comprehensive-test.js | base64)\"
  }"
```

### 方法 2: 使用脚本

查看 [RUN_ALL_TESTS.md](./RUN_ALL_TESTS.md) 获取完整的测试脚本。

---

## 📝 测试清单

### 测试前准备
- [ ] Go Executor 已编译并运行
- [ ] 网络连接正常
- [ ] 测试接口可访问

### 第一阶段：核心功能
- [ ] `fetch-comprehensive-test.js` - 基础功能
- [ ] `fetch-concurrent-test.js` - 并发性能

**目标**: 通过率 > 90%

### 第二阶段：健壮性
- [ ] `fetch-timeout-test.js` - 超时和大数据
- [ ] `fetch-redirect-auth-test.js` - 重定向和认证

**目标**: 通过率 > 85%

### 第三阶段：高级功能
- [ ] `fetch-formdata-test.js` - 文件上传（可选）

**目标**: 尽力而为

### 测试后
- [ ] 填写测试报告
- [ ] 记录性能数据
- [ ] 提出改进建议

---

## 🎨 测试接口

| 接口 | 用途 |
|------|------|
| `jsonplaceholder.typicode.com` | RESTful API 测试 |
| `httpbin.org` | HTTP 各种场景 |
| `kc.oalite.com` | 自定义 POST 接口 |

---

## 🔧 故障排查

### 常见问题

**Q: 连接被拒绝？**
```bash
# 确保 Flow-codeblock 服务运行
cd ../flow-codeblock && npm start

# 检查端口是否被占用
lsof -i :3002
```

**Q: base64 编码问题？**
```bash
# macOS/Linux 使用不同的 base64 命令
# macOS: base64
# Linux: base64 -w 0

# 或使用 Node.js
node -e "console.log(Buffer.from(require('fs').readFileSync('test.js')).toString('base64'))"
```

**Q: FormData 测试失败？**
- 正常，Goja 环境可能不支持 FormData API

**Q: 超时测试失败？**
- 正常，AbortController 可能不支持

**Q: 网络错误测试失败？**
- 检查网络连接和 DNS 设置

更多故障排查，查看 [RUN_ALL_TESTS.md](./RUN_ALL_TESTS.md)

---

## 📈 预期结果

### 性能基准

| 指标 | 目标值 |
|-----|--------|
| 单个 GET | < 500ms |
| 并发 5 个 | < 1000ms |
| 100KB 下载 | < 1s |
| 1MB 下载 | < 3s |

### 通过率

```
总通过率: 85-95%

✅ 基础功能: 90-100%
✅ 并发测试: 100%
✅ 超时大数据: 80-100%
✅ 重定向认证: 85-100%
⚠️ FormData: 0-100% (取决于环境)
```

---

## 📚 相关资源

### 项目文档
- [Flow-codeblock README](../flow-codeblock/README.md)
- [Go Executor README](../go-executor/README.md)
- [Fetch 实现代码](../go-executor/fetch_enhancement.go)
- [完成报告](../COMPREHENSIVE_TEST_SUITE_COMPLETE.md)

### 外部资源
- [Fetch API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [HTTP Status Codes](https://httpstatuses.com/)

---

## 🎉 贡献

发现问题或有改进建议？

1. 查看现有文档
2. 运行相关测试
3. 提出改进方案
4. 更新测试用例

---

## 📞 联系方式

- **项目**: Flow-codeblock-goja
- **测试套件版本**: 1.0.0
- **最后更新**: 2025-10-01

---

**开始测试**: 从 [RUN_ALL_TESTS.md](./RUN_ALL_TESTS.md) 开始 🚀

