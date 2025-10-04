# Axios 模块测试套件

基于 Fetch API 的 Axios 兼容层完整测试。

## 📋 测试文件列表

### 1. `basic-request-test.js` - 基础请求测试
测试所有 HTTP 方法和基本功能：
- ✅ GET 请求
- ✅ POST 请求（自动 JSON 序列化）
- ✅ PUT 请求
- ✅ DELETE 请求
- ✅ 自定义配置（headers, params）
- ✅ HTTP 错误处理（404）

**运行方式**：
```bash
# 从项目根目录运行
cd test/axios
node ../../test-runner.js basic-request-test.js
```

### 2. `interceptor-test.js` - 拦截器测试
测试请求/响应拦截器功能：
- ✅ 请求拦截器
- ✅ 响应拦截器
- ✅ 多个拦截器链
- ✅ 错误拦截器
- ✅ 移除拦截器

**运行方式**：
```bash
node ../../test-runner.js interceptor-test.js
```

### 3. `cancel-test.js` - 请求取消测试
测试 CancelToken 功能（基于 AbortController）：
- ✅ 基础取消功能（CancelToken.source）
- ✅ 使用 executor 函数取消
- ✅ 延迟取消（模拟超时）
- ✅ 多个请求共享 CancelToken
- ✅ 已取消的 token 不能重复使用
- ✅ 正常完成的请求不受影响

**运行方式**：
```bash
node ../../test-runner.js cancel-test.js
```

### 4. `instance-test.js` - 实例和配置测试
测试 axios.create、baseURL、defaults 等功能：
- ✅ 创建自定义实例
- ✅ baseURL 配置
- ✅ params 查询参数
- ✅ 全局 defaults 配置
- ✅ 实例 defaults 配置
- ✅ 配置优先级（请求 > 实例 > 全局）
- ✅ auth 基础认证
- ✅ 多个实例独立性

**运行方式**：
```bash
node ../../test-runner.js instance-test.js
```

### 5. `security-test.js` - 安全性优化验证测试 🆕
测试所有安全修复是否生效：
- ✅ URL 协议注入防护（javascript: 等）
- ✅ 敏感信息保护（密码隐藏）
- ✅ 参数类型验证
- ✅ AbortController 兼容性检查
- ✅ 数组参数边界检查
- ✅ 合法 URL 验证

**运行方式**：
```bash
node ../../test-runner.js security-test.js
```

## 🚀 功能覆盖

### ✅ 已实现功能

| 功能分类 | 功能项 | 状态 |
|---------|--------|------|
| **HTTP 方法** | GET/POST/PUT/DELETE/PATCH/HEAD/OPTIONS | ✅ 完全支持 |
| **拦截器** | 请求拦截器 | ✅ 完全支持 |
| **拦截器** | 响应拦截器 | ✅ 完全支持 |
| **拦截器** | 错误拦截器 | ✅ 完全支持 |
| **配置系统** | 全局配置（defaults） | ✅ 完全支持 |
| **配置系统** | 实例配置（create） | ✅ 完全支持 |
| **配置系统** | 请求级配置 | ✅ 完全支持 |
| **配置系统** | 配置合并和优先级 | ✅ 完全支持 |
| **请求配置** | baseURL | ✅ 完全支持 |
| **请求配置** | params（查询参数） | ✅ 完全支持 |
| **请求配置** | headers（自定义头） | ✅ 完全支持 |
| **请求配置** | timeout（超时） | ✅ 完全支持 |
| **请求配置** | auth（基础认证） | ✅ 完全支持 |
| **数据转换** | 自动 JSON 序列化 | ✅ 完全支持 |
| **数据转换** | 自动 JSON 解析 | ✅ 完全支持 |
| **数据转换** | FormData 支持 | ✅ 完全支持 |
| **数据转换** | URLSearchParams 支持 | ✅ 完全支持 |
| **错误处理** | HTTP 错误自动 reject | ✅ 完全支持 |
| **错误处理** | validateStatus 自定义 | ✅ 完全支持 |
| **请求取消** | CancelToken.source | ✅ 完全支持 |
| **请求取消** | CancelToken executor | ✅ 完全支持 |
| **请求取消** | axios.isCancel | ✅ 完全支持 |
| **并发控制** | axios.all | ✅ 完全支持 |
| **并发控制** | axios.spread | ✅ 完全支持 |
| **响应类型** | json（默认） | ✅ 完全支持 |
| **响应类型** | text | ✅ 完全支持 |
| **响应类型** | blob | ✅ 完全支持 |
| **响应类型** | arraybuffer | ✅ 完全支持 |

### ⚠️ 不支持功能

| 功能 | 原因 | 替代方案 |
|------|------|----------|
| 上传进度 | 需要底层 Fetch API 支持 | 暂不支持 |
| 下载进度 | 需要底层 Fetch API 支持 | 暂不支持 |
| XSRF 保护 | 服务端执行环境不需要 | - |

## 📊 测试统计

- **测试文件数**: 5 个
- **测试用例数**: 33 个
- **功能覆盖率**: 95%+
- **安全覆盖率**: 100%（v6.0.1）
- **代码量**: ~580 行（axios.js 核心实现，优化后）

## 🔧 使用示例

### 基础使用

```javascript
const axios = require('axios');

// GET 请求
axios.get('https://api.example.com/users')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('错误:', error.message);
  });

// POST 请求
axios.post('https://api.example.com/users', {
  name: 'John',
  email: 'john@example.com'
})
  .then(response => {
    console.log('创建成功:', response.data);
  });
```

### 创建实例

```javascript
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Authorization': 'Bearer token123'
  }
});

api.get('/users').then(response => {
  console.log(response.data);
});
```

### 使用拦截器

```javascript
// 请求拦截器
axios.interceptors.request.use(
  config => {
    config.headers['X-Request-Time'] = Date.now();
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器
axios.interceptors.response.use(
  response => {
    console.log('请求耗时:', Date.now() - response.config.headers['X-Request-Time']);
    return response;
  },
  error => Promise.reject(error)
);
```

### 取消请求

```javascript
const CancelToken = axios.CancelToken;
const source = CancelToken.source();

axios.get('/api/data', {
  cancelToken: source.token
}).catch(error => {
  if (axios.isCancel(error)) {
    console.log('请求被取消:', error.message);
  }
});

// 取消请求
source.cancel('用户取消了操作');
```

## 💡 注意事项

1. **异步语法限制**: goja 不支持 async/await，请使用 Promise
2. **网络要求**: 测试需要网络访问 jsonplaceholder.typicode.com
3. **超时配置**: 默认无超时，建议生产环境配置合理的 timeout
4. **错误处理**: 始终添加 .catch() 处理错误

## 🎯 与标准 axios 的差异

| 特性 | 标准 axios | 本实现 | 说明 |
|------|-----------|--------|------|
| 核心 API | 完整 | 95%+ | 覆盖所有常用功能 |
| 底层实现 | XHR/http | Fetch API | 更现代、性能更好 |
| 上传进度 | 支持 | 不支持 | 底层限制 |
| 下载进度 | 支持 | 不支持 | 底层限制 |
| 代码大小 | ~15KB | ~10KB | 更轻量 |

## 📚 相关文档

- [Axios 官方文档](https://axios-http.com/)
- [项目 Fetch API 文档](../../FETCH_API_USAGE_GUIDE.md)
- [模块增强文档](../../go-executor/ENHANCED_MODULES.md)

