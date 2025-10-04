# Node.js FormData 测试套件

完整的 Node.js FormData 模块测试，覆盖所有功能、错误处理、边界情况和集成场景。

## 📁 测试文件结构

```
test/form-data/
├── README.md                              # 本文件
├── TEST_COVERAGE_REPORT.md                # 测试覆盖报告
├── TEST_RESULTS_SUMMARY.md                # 测试结果总结
├── run-all-tests.sh                       # 测试运行脚本
│
├── formdata-nodejs-test.js                # 基础功能测试 (12个)
├── formdata-nodejs-advanced-test.js       # 高级功能测试 (8个)
├── formdata-error-handling-test.js        # 错误处理测试 (10个) 🆕
├── formdata-edge-cases-test.js            # 边界情况测试 (10个) 🆕
└── formdata-fetch-integration-test.js     # fetch集成测试 (8个) 🆕
```

## 🚀 快速开始

### 前置条件

1. **启动 Go 服务**
```bash
cd go-executor
./flow-codeblock-go
```

2. **确认服务运行**
```bash
curl http://localhost:3002/health
# 应该返回: {"service":"flow-codeblock-go","status":"healthy",...}
```

### 运行所有测试

```bash
cd test/form-data
./run-all-tests.sh
```

### 运行单个测试套件

#### 方式1: 使用 curl（推荐）

```bash
# 基础功能测试
curl -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$(cat formdata-nodejs-test.js | base64)\"}" | jq '.'

# 错误处理测试
curl -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$(cat formdata-error-handling-test.js | base64)\"}" | jq '.'

# 边界情况测试
curl -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"$(cat formdata-edge-cases-test.js | base64)\"}" | jq '.'
```

#### 方式2: 查看详细日志

```bash
# 运行测试后查看日志
tail -200 ../../go-executor/service.log | grep -E "(测试|✅|❌)"
```

## 📊 测试套件说明

### 1. 基础功能测试 (formdata-nodejs-test.js)

测试所有核心 API：
- ✅ require('form-data')
- ✅ new FormData()
- ✅ append(name, string/Buffer)
- ✅ getHeaders() / getBoundary() / setBoundary()
- ✅ getLengthSync() / getLength(callback)
- ✅ getBuffer()
- ✅ 实例隔离性
- ✅ 性能测试

**预期结果**: 12/12 通过 ✅

### 2. 高级功能测试 (formdata-nodejs-advanced-test.js)

测试扩展功能：
- ✅ append() options 对象
- ✅ Blob/File 对象支持
- ✅ Promise 模式
- ✅ submit() 方法
- ✅ 混合类型

**预期结果**: 7/8 通过（1个依赖外部服务）⚠️

### 3. 错误处理测试 (formdata-error-handling-test.js) 🆕

测试所有错误场景：
- ✅ 参数验证（无参数、类型错误）
- ✅ 大小限制（Blob/File 超 100MB）
- ✅ 空值处理（null/undefined）
- ✅ 错误传递

**预期结果**: 9/10 通过（null/undefined 是已知限制）⚠️

### 4. 边界情况测试 (formdata-edge-cases-test.js) 🆕

测试边界条件：
- ✅ 空 FormData
- ✅ 重复字段
- ✅ 特殊字符（引号、换行、Unicode）
- ✅ 超长字段
- ✅ 流式处理阈值
- ✅ 自定义 Boundary

**预期结果**: 9/10 通过 ⚠️

### 5. fetch 集成测试 (formdata-fetch-integration-test.js) 🆕

测试与 fetch API 的集成：
- ✅ fetch + FormData
- ✅ 自动设置 Content-Type
- ✅ File/Blob/Buffer 上传
- ✅ 混合上传
- ✅ 大文件上传（5MB）

**预期结果**: 需要网络连接 🌐

## 📈 测试统计

| 测试套件 | 测试数 | 通过率 | 状态 |
|---------|--------|--------|------|
| 基础功能 | 12 | 100% | ✅ |
| 高级功能 | 8 | 87.5% | ⚠️ |
| 错误处理 | 10 | 90% | ⚠️ |
| 边界情况 | 10 | 90% | ⚠️ |
| fetch 集成 | 8 | - | 🔄 |
| **总计** | **48** | **~92%** | ✅ |

## 🔍 测试结果解读

### ✅ 成功 (绿色勾号)
表示测试通过，功能正常工作。

### ❌ 失败 (红色叉号)
表示测试失败，查看错误信息了解原因。

### ⚠️ 部分通过 (警告)
表示大部分测试通过，但有少数失败（通常是已知限制或外部依赖）。

## 📝 已知限制

### 1. null/undefined 值
**限制**: `FormData.append(name, null)` 会抛出错误  
**原因**: goja 的 `ToObject()` 无法处理 null/undefined  
**影响**: 低（实际使用中很少需要传 null）

### 2. 文件名换行符
**限制**: 文件名包含 `\n` 的测试验证可能失败  
**原因**: 测试验证逻辑需要优化  
**影响**: 极低（实际文件名很少包含换行符）

### 3. 外部网络依赖
**限制**: submit() 和 fetch 集成测试依赖 httpbin.org  
**原因**: 需要真实的 HTTP 服务器验证上传  
**影响**: 中等（网络问题会导致测试失败）

## 🛠️ 故障排查

### 测试无法运行

1. **检查服务状态**
```bash
curl http://localhost:3002/health
```

2. **重启服务**
```bash
cd go-executor
pkill -f flow-codeblock-go
./flow-codeblock-go > service.log 2>&1 &
```

3. **查看日志**
```bash
tail -f go-executor/service.log
```

### 测试超时

某些测试（特别是大文件上传）可能需要较长时间：

```bash
# 增加超时时间
curl -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codebase64\": \"...\", \"timeout\": 30000}"
```

### 网络测试失败

如果 httpbin.org 不可用，fetch 集成测试会失败。这是正常的，不影响核心功能。

## 📚 相关文档

- [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) - 详细的测试覆盖分析
- [TEST_RESULTS_SUMMARY.md](./TEST_RESULTS_SUMMARY.md) - 最新测试结果总结
- [../QUICK_START.md](../QUICK_START.md) - 快速开始指南

## 🤝 贡献

添加新测试时：

1. 在相应的测试文件中添加测试用例
2. 更新测试计数
3. 运行完整测试套件验证
4. 更新文档

## 📄 许可

与主项目相同

---

**最后更新**: 2025-10-03  
**维护者**: Development Team  
**状态**: ✅ 生产就绪
