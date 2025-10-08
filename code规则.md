# JS 执行服务完整使用指南

## 📚 目录导航

1. [快速开始](#快速开始)
2. [支持的模块和功能](#支持的模块和功能)
3. [使用限制和注意事项](#使用限制和注意事项)
4. [代码规范](#代码规范)
5. [示例集合](#示例集合)

---

# 快速开始

## 🚀 5 分钟上手

### 1. 最简单的示例

```js
// 基础计算
return { result: 1 + 1 };
```

### 2. 使用 input 参数

```js
// 通过 API 传入 input
return {
  sum: input.a + input.b,
  message: `计算结果: ${input.a} + ${input.b} = ${input.a + input.b}`
};
```

### 3. HTTP 请求

```js
// 使用 fetch（无需 require）
async function main() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  const data = await response.json();
  return { success: true, data };
}
return main();
```

### 4. 使用第三方库

```js
// 使用 axios
const axios = require('axios');

async function main() {
  const response = await axios.get('https://jsonplaceholder.typicode.com/users/1');
  return { success: true, user: response.data };
}
return main();
```

### 5. 处理 Excel 文件

```js
const xlsx = require('xlsx');

async function main() {
  // 下载 Excel
  const response = await fetch('https://example.com/data.xlsx');
  const buffer = Buffer.from(await response.arrayBuffer());
  
  let workbook;
  try {
    // 读取并解析
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return { success: true, rowCount: data.length, data: data.slice(0, 5) };
  } finally {
    if (workbook) workbook.close();  // ⭐ 必须调用
  }
}
return main();
```

---

## 📋 快速参考卡片

### 必记规则 ⭐

1. **必须有 return** - 所有代码都要返回结果
2. **异步用 await** - Promise 必须等待
3. **资源要释放** - Excel 用完调用 `close()`
4. **模块要 require** - 除了 fetch, Buffer, FormData
5. **禁用 console** - 生产环境不能用（用 return 代替）

### 常用模块速查

```js
// 无需 require（直接使用）
Buffer.from([1,2,3])          // Buffer 操作
fetch('https://...')          // HTTP 请求
new FormData()                // Web API FormData（配合 fetch）
new URL('https://...')        // URL 解析（Web 标准）⭐ 推荐
new URLSearchParams('a=1')    // 查询参数解析

// 需要 require
const axios = require('axios');           // HTTP 库
const crypto = require('crypto');         // 加密
const xlsx = require('xlsx');             // Excel
const dateFns = require('date-fns');     // 日期处理
const qs = require('qs');                // 查询字符串
const FormData = require('form-data');   // Node.js FormData（配合 axios）
const _ = require('lodash');             // 工具库
const uuid = require('uuid');            // UUID
const url = require('url');              // ⚠️ 仅 domainToASCII/Unicode，不支持 parse/format
```

### 错误排查速查

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `console is not defined` | 生产环境禁用 console | 使用 `return` 返回调试信息 |
| `xxx is not defined` | 模块未 require | 添加 `const xxx = require('xxx')` |
| `代码中缺少 return` | 没有返回值 | 添加 `return` 语句 |
| `返回值不能是 undefined` | return 了 undefined | 返回其他值或对象 |
| `禁止使用 fs 模块` | 使用了禁用模块 | 使用 fetch 下载文件 |
| `workbook is not defined` | 资源未正确声明 | `let workbook;` 放在 try 外 |
| `超时` | 执行时间过长 | 优化代码或增加超时配置 |

---

## ⚙️ 环境配置参考

### 核心配置项

#### 基础配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `ENVIRONMENT` | `production` | 运行环境（`development` 或 `production`） |
| `ALLOW_CONSOLE` | 跟随环境 | 是否允许 console（开发: true，生产: false） |
| `MAX_CODE_LENGTH` | 65535 | 代码最大长度（64KB） |
| `MAX_INPUT_SIZE` | 1048576 | Input 参数最大大小（1MB） |
| `MAX_RESULT_SIZE` | 5242880 | 返回结果最大大小（5MB） |

#### 超时配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `EXECUTION_TIMEOUT_MS` | 60000 | 代码执行超时（60秒 = 1分钟） |
| `FETCH_TIMEOUT_MS` | 30000 | HTTP 请求超时（30秒） |
| `CONCURRENCY_WAIT_TIMEOUT_SEC` | 10 | 并发槽位等待超时（秒） |
| `RUNTIME_POOL_ACQUIRE_TIMEOUT_SEC` | 5 | Runtime 池获取超时（秒） |

#### 文件大小配置

| 环境变量 | 默认值 | 应用场景 |
|---------|--------|---------|
| `MAX_FORMDATA_SIZE_MB` | 10 | FormData 总大小限制 |
| `MAX_BLOB_FILE_SIZE_MB` | 5 | Blob/File/Excel 文件大小限制 |
| `MAX_FILE_SIZE_MB` | 5 | FormData 中单个文件大小限制 |
| `FORMDATA_STREAMING_THRESHOLD_MB` | 1 | 流式处理启用阈值（MB） |
| `FORMDATA_BUFFER_SIZE` | 524288 | FormData IO 缓冲区（512KB，字节单位） |

#### 并发和性能配置

| 环境变量 | 默认值 | 说明 |
|---------|--------|------|
| `MAX_CONCURRENT_EXECUTIONS` | 🔥 智能计算 | 最大并发执行数（基于内存自动计算） |
| `RUNTIME_POOL_SIZE` | 100 | Runtime 池初始大小 |
| `MIN_RUNTIME_POOL_SIZE` | 100 | Runtime 池最小大小（自动扩缩容） |
| `MAX_RUNTIME_POOL_SIZE` | 200 | Runtime 池最大大小（上限 500） |
| `RUNTIME_IDLE_TIMEOUT_MIN` | 5 | Runtime 空闲超时（分钟） |

#### 🔥 MAX_CONCURRENT_EXECUTIONS 智能计算说明

系统会**自动根据可用内存计算最佳并发数**，无需手动配置。如果需要自定义，可以通过环境变量显式指定。

**计算逻辑**:
```
步骤 1: 读取系统内存统计（runtime.MemStats）
步骤 2: 估算系统总内存 = m.Sys × 2.5
步骤 3: 计算可用内存 = 系统总内存 × 0.75（预留 25% 给系统）
步骤 4: 计算并发数 = 可用内存(GB) × 1024 / 10MB

边界限制:
  - 最小值: 100（保证小内存机器可用）
  - 最大值: 2000（防止过度并发）
  - 每个请求平均内存: 10MB（保守估计）
```

**示例计算**:

| 服务器配置 | 估算内存 | 可用内存 | 计算并发 | 最终值 |
|-----------|---------|---------|---------|--------|
| 2核4G | 4GB | 3GB | 307 | 307 |
| 4核8G | 8GB | 6GB | 614 | 614 |
| 8核16G | 16GB | 12GB | 1228 | 1228 |
| 16核32G | 32GB | 24GB | 2457 | 2000（上限） |

**启动日志示例**:
```
[INFO] 智能并发限制计算完成
  estimated_total_gb: 8.2
  available_gb: 6.15
  recommended_concurrent: 614
```

**显式指定并发数**:
```bash
# 如果自动计算的值不合适，可以显式指定
MAX_CONCURRENT_EXECUTIONS=800
```

**注意**: 
- ✅ 所有配置项均支持通过环境变量调整
- ✅ 修改环境变量后需要重启服务生效
- 🔥 推荐使用智能计算的默认值，除非有特殊需求

---

# 支持的模块和功能

## 🎯 概述

本服务基于 **Go + goja** 实现，提供高性能的 JavaScript 代码执行环境。所有模块均经过严格的安全审查和性能优化。

---

## 📦 Node.js 原生模块（goja_nodejs 提供）

### ✅ 完全支持的模块

| 模块名 | 支持程度 | 说明 | 使用方式 |
|--------|---------|------|----------|
| **Buffer** | ✅ 100% | Node.js Buffer API 完整实现 | `Buffer.from()`, `Buffer.alloc()` 等 |
| **console** | ⚠️ 受限 | 开发环境默认启用，生产环境禁用 | `console.log()`, `console.error()` 等 |
| **process** | ⚠️ 部分 | 提供基础环境信息 | `process.env`, `process.version` |
| **url** | ⚠️ 仅 Web API | 仅支持 `URL` 和 `URLSearchParams` 构造函数 | `new URL()`, `new URLSearchParams()` |

### ⚠️ console 模块使用说明

```js
// 环境行为：
// - 开发环境（ENVIRONMENT=development）：默认允许 console
// - 生产环境（ENVIRONMENT=production）：默认禁用 console
// - 可通过 ALLOW_CONSOLE 环境变量显式控制

// ✅ 开发环境
console.log("调试信息");  // 正常输出

// ❌ 生产环境（禁用 console）
console.log("信息");  // 抛出错误: console is not defined

// 解决方案：使用 return 返回调试信息
return {
  debug: "调试信息",
  result: data
};
```

---

### ⚠️ url 模块使用说明

**重要**: goja_nodejs 的 url 模块**不支持 Node.js 传统的 `url.parse()` 方法**，仅支持 Web 标准的 `URL` 和 `URLSearchParams` 构造函数。

#### ❌ 不支持的方法（Node.js 传统 API）

```js
const url = require('url');

// ❌ 不支持
url.parse('https://example.com/path?query=1');     // Object has no member 'parse'
url.format({ protocol: 'https', host: 'example.com' }); // 不支持
url.resolve('https://example.com/', '/path');      // 不支持
```

#### ✅ 支持的方法（Web 标准 API + 额外工具）

根据测试结果，url 模块提供以下方法：
- ✅ `URL` 构造函数（Web 标准）
- ✅ `URLSearchParams` 构造函数（Web 标准）
- ✅ `domainToASCII(domain)` - 将域名转换为 ASCII（Punycode）
- ✅ `domainToUnicode(domain)` - 将域名从 Punycode 转换为 Unicode

```js
// 方式 1: 无需 require，直接使用全局 URL 构造函数（推荐）⭐
const parsedUrl = new URL('https://example.com/path?query=1&name=test');

// 访问 URL 属性
const result = {
  href: parsedUrl.href,           // "https://example.com/path?query=1&name=test"
  protocol: parsedUrl.protocol,   // "https:"
  hostname: parsedUrl.hostname,   // "example.com"
  port: parsedUrl.port,           // ""
  pathname: parsedUrl.pathname,   // "/path"
  search: parsedUrl.search,       // "?query=1&name=test"
  hash: parsedUrl.hash,           // ""
  origin: parsedUrl.origin        // "https://example.com"
};

// 方式 2: URLSearchParams 解析查询参数
const params = new URLSearchParams('query=1&name=test');
const query = params.get('query');  // "1"
const name = params.get('name');    // "test"

// 方式 3: 从 URL 对象获取 searchParams
const urlObj = new URL('https://example.com/path?query=1&name=test');
const query = urlObj.searchParams.get('query');  // "1"
const name = urlObj.searchParams.get('name');    // "test"

// 方式 4: 域名转换（需要 require）
const url = require('url');
const asciiDomain = url.domainToASCII('中文域名.com');    // "xn--fiq228c.com"
const unicodeDomain = url.domainToUnicode('xn--fiq228c.com'); // "中文域名.com"
```

#### 🔄 Node.js `url.parse()` 替代方案

如果您需要类似 `url.parse()` 的功能，使用 Web 标准的 `URL` 构造函数：

```js
// ❌ 旧的 Node.js 写法（不支持）
const url = require('url');
const parsed = url.parse('https://example.com/path?query=1');

// ✅ 新的 Web 标准写法（推荐）
const parsed = new URL('https://example.com/path?query=1');

// 属性映射对照表
// url.parse() → new URL()
// parsed.protocol  → parsed.protocol
// parsed.host      → parsed.host
// parsed.hostname  → parsed.hostname
// parsed.port      → parsed.port
// parsed.pathname  → parsed.pathname
// parsed.search    → parsed.search
// parsed.query     → parsed.searchParams（需要调用 .get()）
// parsed.hash      → parsed.hash
```

#### 📝 完整示例：URL 解析

```js
function parseURL(urlString) {
  try {
    const parsed = new URL(urlString);
    
    // 获取所有查询参数
    const queryParams = {};
    for (const [key, value] of parsed.searchParams) {
      queryParams[key] = value;
    }
    
    return {
      success: true,
      url: {
        href: parsed.href,
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        origin: parsed.origin
      },
      queryParams: queryParams
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

return parseURL('https://example.com:8080/path/to/page?query=1&name=test#section');
```

期望输出：
```json
{
  "result": {
    "success": true,
    "url": {
      "href": "https://example.com:8080/path/to/page?query=1&name=test#section",
      "protocol": "https:",
      "hostname": "example.com",
      "port": "8080",
      "pathname": "/path/to/page",
      "search": "?query=1&name=test",
      "hash": "#section",
      "origin": "https://example.com:8080"
    },
    "queryParams": {
      "query": "1",
      "name": "test"
    }
  }
}
```

---

## 🚀 Go 原生实现的增强模块

### 1. Buffer 增强模块

**实现方式**: Go 原生实现  
**兼容性**: 100% Node.js Buffer API 兼容

```js
// 创建 Buffer
const buf1 = Buffer.from('hello');
const buf2 = Buffer.alloc(10);
const buf3 = Buffer.from([1, 2, 3, 4]);

// 编码转换
const base64 = buf1.toString('base64');
const hex = buf1.toString('hex');

// Buffer 操作
buf1.slice(0, 2);
buf1.copy(buf2);
Buffer.concat([buf1, buf2]);
```

**性能**: 直接使用 Go 的 byte 数组，性能优异

---

### 2. Crypto 增强模块（双模式）

**实现方式**: Go crypto + crypto-js 混合模式  
**支持算法**: 77+ 种加密算法

#### 模式 A: Go 原生 crypto（高性能）

```js
const crypto = require('crypto');

// ✅ Go 原生实现（推荐，性能更好）

// 1. 哈希算法
const hash = crypto.createHash('sha256').update('data').digest('hex');
const hmac = crypto.createHmac('sha256', 'key').update('data').digest('hex');

// 2. RSA 密钥生成
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048  // 支持 1024, 2048, 4096
});

// 3. RSA 加密/解密
const encrypted = crypto.publicEncrypt(publicKey, Buffer.from('secret data'));
const decrypted = crypto.privateDecrypt(privateKey, encrypted);

// 4. RSA 签名/验证
const sign = crypto.createSign('SHA256');
sign.update('data to sign');
const signature = sign.sign(privateKey);

const verify = crypto.createVerify('SHA256');
verify.update('data to sign');
const isValid = verify.verify(publicKey, signature);

// 5. 随机数生成
const randomBytes = crypto.randomBytes(32);  // 生成 32 字节随机数
```

**Go 原生支持的算法**：
- **Hash**: md5, sha1, sha256, sha512
- **HMAC**: hmac-md5, hmac-sha1, hmac-sha256, hmac-sha512
- **RSA**: 密钥生成、加密/解密、签名/验证
- **随机数**: randomBytes（安全随机数生成）

#### 模式 B: crypto-js（对称加密）

```js
const crypto = require('crypto');

// ✅ crypto-js 实现（用于对称加密）

// AES 加密/解密
const encrypted = crypto.AES.encrypt('message', 'secret key').toString();
const decrypted = crypto.AES.decrypt(encrypted, 'secret key').toString(crypto.enc.Utf8);

// DES 加密
const desEncrypted = crypto.DES.encrypt('message', 'secret').toString();

// TripleDES 加密
const tripleDesEncrypted = crypto.TripleDES.encrypt('message', 'secret').toString();
```

**crypto-js 支持的算法**：
- **对称加密**: AES, DES, TripleDES, RC4
- **哈希**: SHA1, SHA256, SHA512, SHA3, RIPEMD160
- **HMAC**: HmacMD5, HmacSHA1, HmacSHA256, HmacSHA512
- **其他**: PBKDF2, EvpKDF

**注意事项**:
- ✅ **RSA 使用 Go 原生实现**（高性能，推荐）
- ✅ **对称加密（AES/DES）使用 crypto-js**
- ✅ **哈希和 HMAC 优先使用 Go 原生**（性能更好）
- ✅ 所有算法均已预编译，首次使用无延迟

---

### 3. Fetch 增强模块（完整实现）

**实现方式**: Go net/http 封装  
**兼容性**: 95%+ Fetch API 标准

```js
// GET 请求
const response = await fetch('https://api.example.com/data');
const data = await response.json();

// POST 请求
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'Tom' })
});

// 文件上传（Web API FormData）
const formData = new FormData();
formData.append('file', fileBuffer, 'file.txt');
formData.append('name', 'example');
const response = await fetch('https://upload.example.com', {
  method: 'POST',
  body: formData
});

// 使用 Headers 对象
const headers = new Headers();
headers.append('Content-Type', 'application/json');
headers.append('Authorization', 'Bearer token');

const response = await fetch('https://api.example.com/data', {
  headers: headers
});

// 使用 Request 对象
const request = new Request('https://api.example.com/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'Tom' })
});

const response = await fetch(request);

// 请求取消
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

const response = await fetch(url, {
  signal: controller.signal
});
```

**支持的功能**:
- ✅ 所有 HTTP 方法（GET, POST, PUT, DELETE, PATCH 等）
- ✅ Request/Response 对象
- ✅ Headers 对象
- ✅ FormData（Web API 标准，无需 require）
- ✅ Blob/File 对象
- ✅ AbortController（请求取消）
- ✅ 流式上传/下载
- ✅ multipart/form-data
- ✅ application/x-www-form-urlencoded
- ✅ setTimeout/setInterval（EventLoop 提供）

**性能配置**:
- 默认超时: 300 秒（可配置 `FETCH_TIMEOUT_MS`）
- 最大文件大小: 100MB（可配置 `MAX_BLOB_FILE_SIZE_MB`）
- 流式阈值: 1MB（可配置 `FORMDATA_STREAMING_THRESHOLD_MB`）

---

### 3.1 FormData 模块（两种实现）

本服务提供**两种 FormData 实现**，分别对应不同的使用场景：

#### A. Web API FormData（浏览器标准）

**实现方式**: Go 原生实现  
**加载方式**: 自动可用，无需 require  
**使用场景**: 配合 fetch 使用（推荐）

```js
// 创建 FormData（无需 require）
const formData = new FormData();

// 添加文本字段
formData.append('name', 'Tom');
formData.append('age', '25');

// 添加文件
formData.append('avatar', fileBuffer, 'avatar.jpg');

// 配合 fetch 使用
const response = await fetch('https://api.example.com/upload', {
  method: 'POST',
  body: formData  // 自动设置 Content-Type
});
```

**特点**:
- ✅ 完全符合 Web 标准
- ✅ 自动设置正确的 `boundary`
- ✅ 支持 `append()`, `delete()`, `get()`, `has()`, `set()` 等方法
- ✅ 与 fetch 无缝集成

#### B. Node.js FormData（form-data 模块）

**实现方式**: Go 原生实现，兼容 Node.js form-data API  
**加载方式**: 需要 `require('form-data')`  
**使用场景**: 需要流式处理或配合 axios 使用

```js
const FormData = require('form-data');

// 创建 FormData
const formData = new FormData();

// 添加字段
formData.append('name', 'Tom');
formData.append('file', fileBuffer, {
  filename: 'document.pdf',
  contentType: 'application/pdf'
});

// 配合 axios 使用（推荐）
const axios = require('axios');
const response = await axios.post('https://api.example.com/upload', formData, {
  headers: formData.getHeaders()  // 获取正确的 headers
});

// 或配合 fetch 使用
const response = await fetch('https://api.example.com/upload', {
  method: 'POST',
  headers: formData.getHeaders(),
  body: formData.getBuffer()  // 获取 Buffer
});
```

**特点**:
- ✅ 兼容 Node.js form-data API
- ✅ 支持流式处理（大文件友好）
- ✅ 提供 `getHeaders()` 方法（包含正确的 boundary）
- ✅ 提供 `getBuffer()` 方法（获取完整数据）
- ✅ 与 axios 无缝集成

#### 两种 FormData 对比

| 特性 | Web API FormData | Node.js FormData |
|------|-----------------|------------------|
| 加载方式 | 无需 require | `require('form-data')` |
| 使用场景 | 配合 fetch | 配合 axios 或需要流式处理 |
| 文件上传 | ✅ 支持 | ✅ 支持 |
| 流式处理 | ❌ 不支持 | ✅ 支持 |
| getHeaders() | ❌ 无此方法 | ✅ 支持 |
| getBuffer() | ❌ 无此方法 | ✅ 支持 |
| 标准符合度 | 100% Web 标准 | 100% Node.js API |

#### 使用建议

```js
// ✅ 推荐：fetch + Web API FormData
const formData = new FormData();
formData.append('file', buffer, 'file.txt');
await fetch(url, { method: 'POST', body: formData });

// ✅ 推荐：axios + Node.js FormData
const FormData = require('form-data');
const formData = new FormData();
formData.append('file', buffer, 'file.txt');
await axios.post(url, formData, { headers: formData.getHeaders() });

// ⚠️ 可用但不推荐：混用
// fetch 也可以使用 Node.js FormData，但需要手动处理 headers
```

---

### 4. XLSX 增强模块（Excel 处理）

**实现方式**: Go excelize v2.9.1 封装  
**兼容性**: SheetJS/xlsx API 兼容

```js
const xlsx = require('xlsx');

// 读取 Excel（从 URL）
const response = await fetch('https://example.com/data.xlsx');
const buffer = Buffer.from(await response.arrayBuffer());

let workbook;
try {
  workbook = xlsx.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  return { success: true, data: data };
} finally {
  // ⭐ 必须调用 close() 释放资源
  if (workbook) workbook.close();
}

// 创建 Excel
let wb;
try {
  wb = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet([
    { 姓名: "张三", 年龄: 25 },
    { 姓名: "李四", 年龄: 30 }
  ]);
  xlsx.utils.book_append_sheet(wb, sheet, "Sheet1");
  
  const buffer = xlsx.write(wb, { type: 'buffer' });
  return { base64: buffer.toString('base64') };
} finally {
  if (wb) wb.close();
}

// 流式读取（大文件）
xlsx.readStream(buffer, 'Sheet1', (rows, startIndex) => {
  // 批量处理行数据
}, { batchSize: 500 });
```

**性能指标**:
- 读取速度: 55K+ 行/秒
- 写入速度: 17K+ 行/秒
- 内存占用: 比 SheetJS 降低 80%（流式模式）

**支持的功能**:
- ✅ 读取 Excel (.xlsx, .xlsm, .xlsb)
- ✅ 写入 Excel
- ✅ 多 Sheet 操作
- ✅ 流式读取（大文件优化）
- ✅ 流式写入
- ✅ 数据读取和写入（纯数据操作）
- ❌ 公式计算（暂不支持）
- ❌ 样式读取（暂不支持）
- ❌ 样式写入（暂不支持）
- ❌ 图表操作（暂不支持）

**重要提示**: 
- ⚠️ 必须调用 `workbook.close()` 释放资源
- ⚠️ 文件大小限制: 100MB（可配置）
- ⚠️ 创建的 Excel 仅存在于内存中，需返回 Base64 或上传到 OSS
- ⚠️ **仅支持数据层面的读写**，不支持公式、样式、图表等高级功能

---

## 📚 JavaScript 库（预编译嵌入）

### 5. axios

**实现方式**: axios.js v1.7.9 嵌入  
**兼容性**: 95%+ axios API

```js
const axios = require('axios');

// GET 请求
const response = await axios.get('https://api.example.com/users/1');
console.log(response.data);

// POST 请求
const response = await axios.post('https://api.example.com/users', {
  name: 'Tom',
  age: 20
}, {
  headers: {
    'Content-Type': 'application/json'
  }
});

// 带配置的请求
const response = await axios({
  method: 'post',
  url: 'https://api.example.com/upload',
  data: formData,
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  timeout: 10000
});
```

**支持的功能**:
- ✅ 所有 HTTP 方法
- ✅ 请求/响应拦截器
- ✅ 自动 JSON 转换
- ✅ 超时设置
- ✅ 取消请求
- ✅ FormData 上传
- ⚠️ 文件上传推荐使用 axios（比 fetch 更稳定）

---

### 6. date-fns（按需加载）

**实现方式**: date-fns v2.30.0 嵌入  
**加载方式**: 首次 `require('date-fns')` 时加载

```js
const dateFns = require('date-fns');

// 日期格式化
const formatted = dateFns.format(new Date(), 'yyyy-MM-dd HH:mm:ss');

// 日期计算
const nextWeek = dateFns.addDays(new Date(), 7);
const nextMonth = dateFns.addMonths(new Date(), 1);
const diff = dateFns.differenceInDays(date1, date2);

// 日期比较
const isAfter = dateFns.isAfter(date1, date2);
const isBefore = dateFns.isBefore(date1, date2);

// 日期解析
const parsed = dateFns.parse('2024-10-06', 'yyyy-MM-dd', new Date());
```

**支持的功能**:
- ✅ 200+ 日期处理函数
- ✅ 日期格式化和解析
- ✅ 日期计算和比较
- ✅ 不可变操作
- ✅ 函数式编程
- ❌ **国际化/本地化**（locale 未包含，仅英文）

---

### 7. qs（按需加载）

**实现方式**: qs v6.13.1 嵌入  
**加载方式**: 首次 `require('qs')` 时加载

```js
const qs = require('qs');

// 序列化对象
const str = qs.stringify({ name: 'Tom', age: 20 });
// 输出: "name=Tom&age=20"

// 解析字符串
const obj = qs.parse('name=Tom&age=20');
// 输出: { name: 'Tom', age: '20' }

// 复杂对象
const nested = qs.stringify({ user: { name: 'Tom', age: 20 } });
// 输出: "user[name]=Tom&user[age]=20"
```

---

### 8. lodash（按需加载）

**实现方式**: lodash v4.17.21 嵌入  
**加载方式**: 首次 `require('lodash')` 时加载

```js
const _ = require('lodash');

// 数组操作
const grouped = _.groupBy(users, 'age');
const sorted = _.sortBy(users, ['age', 'name']);
const chunked = _.chunk(array, 3);

// 对象操作
const picked = _.pick(obj, ['name', 'age']);
const merged = _.merge(obj1, obj2);

// 函数操作
const debounced = _.debounce(func, 300);
const throttled = _.throttle(func, 1000);
```

**支持的功能**:
- ✅ 300+ 工具函数
- ✅ 数组、对象、字符串、函数、数学等
- ✅ 链式调用
- ✅ 深拷贝、深比较

---

### 9. uuid（按需加载）

**实现方式**: uuid v9.0.1 嵌入  
**加载方式**: 首次 `require('uuid')` 时加载

```js
const uuid = require('uuid');

// UUID v4（随机）
const id1 = uuid.v4();
// 输出: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"

// UUID v1（时间戳）
const id2 = uuid.v1();
// 输出: "6c84fb90-12c4-11e1-840d-7b25c5ee775a"
```

---

## ❌ 不支持的模块

### Node.js 核心模块（安全限制）

以下模块因安全原因被**完全禁用**：

| 模块名 | 禁用原因 | 替代方案 |
|--------|---------|---------|
| `fs` | 文件系统访问 | 使用 fetch 下载，返回 Base64 上传 |
| `path` | 文件路径操作 | 使用字符串操作 |
| `child_process` | 执行系统命令 | 无替代方案（安全限制） |
| `os` | 系统信息访问 | 无替代方案（安全限制） |
| `net` | 网络底层操作 | 使用 fetch 或 axios |
| `http`/`https` | HTTP 模块 | 使用 fetch 或 axios |
| `stream` | 流操作 | 使用 Buffer 或 Blob |
| `vm` | 虚拟机 | 无替代方案（安全限制） |
| `cluster` | 集群管理 | 无替代方案（安全限制） |
| `worker_threads` | 工作线程 | 无替代方案（安全限制） |

### 浏览器 API（不适用）

以下浏览器 API **不支持**（非浏览器环境）：

- ❌ `localStorage` / `sessionStorage`
- ❌ `document` / `window`
- ❌ `XMLHttpRequest`（请使用 fetch）
- ❌ `WebSocket`
- ❌ DOM 操作相关 API

---

## 🔒 安全限制

### 禁用的危险函数

以下函数和对象因安全原因被**完全禁用**：

```js
// ❌ 禁止使用的函数
eval("code");                    // 错误: eval函数可执行任意代码
new Function("code");            // 错误: Function构造器可执行任意代码
Function.constructor("code");    // 错误: Function构造器可执行任意代码

// ❌ 禁止的全局对象访问
global.xxx;                      // 错误: global对象访问被禁止
globalThis.xxx;                  // 错误: globalThis对象访问被禁止
window.xxx;                      // 错误: window对象访问被禁止
self.xxx;                        // 错误: self对象访问被禁止

// ❌ 禁止的原型链操作
Object.getPrototypeOf(obj);      // 错误: 原型获取操作被禁止
Object.setPrototypeOf(obj, {}); // 错误: 原型设置操作被禁止
obj.__proto__;                   // 错误: __proto__访问被禁止

// ❌ 禁止的 Reflect/Proxy
new Proxy(obj, handler);         // 错误: Proxy可能绕过安全限制
Reflect.construct(func, args);   // 错误: Reflect.construct可能导致代码注入

// ❌ 禁止的动态导入
import("module");                // 错误: 动态import被禁止
```

### 安全检查机制

代码执行前会进行**5层安全检查**：

1. **静态代码分析**: 检测危险模式和语法
2. **沙箱初始化**: 删除危险函数和对象
3. **模块拦截**: 禁用危险 Node.js 模块
4. **原型链保护**: 冻结关键对象原型
5. **Runtime 隔离**: 每个请求使用独立 Runtime

---

# 使用限制和注意事项

## ⚙️ 系统限制

### 1. 代码和数据限制

| 限制项 | 默认值 | 环境变量 | 说明 |
|--------|--------|---------|------|
| 代码长度 | 64KB | `MAX_CODE_LENGTH` | 单次提交的代码最大长度 |
| Input 大小 | 2MB | `MAX_INPUT_SIZE` | input 参数的最大大小 |
| Result 大小 | 5MB | `MAX_RESULT_SIZE` | 返回结果的最大大小 |
| 执行超时 | 300 秒 | `EXECUTION_TIMEOUT_MS` | 单次代码执行的最大时间 |
| 并发限制 | 智能计算 | `MAX_CONCURRENT_EXECUTIONS` | 最大并发执行数 |

### 2. 网络请求限制

| 限制项 | 默认值 | 环境变量 | 说明 |
|--------|--------|---------|------|
| Fetch 超时 | 300 秒 | `FETCH_TIMEOUT_MS` | 单个 HTTP 请求超时 |
| 文件大小 | 100MB | `MAX_BLOB_FILE_SIZE_MB` | 单个文件最大大小 |
| FormData 大小 | 100MB | `MAX_FORMDATA_SIZE_MB` | FormData 最大大小 |

### 3. Excel 处理限制

| 限制项 | 默认值 | 说明 |
|--------|--------|------|
| 文件大小 | 100MB | 单个 Excel 文件最大大小 |
| 读取性能 | 55K 行/秒 | 基准性能 |
| 写入性能 | 17K 行/秒 | 基准性能 |
| 资源管理 | 必须 close() | 不调用会导致内存泄漏 |

---

## ⚠️ 重要注意事项

### 1. 必须使用 return

```js
// ✅ 正确
return { result: 123 };
return Promise.resolve(data);

// ❌ 错误：没有 return
let result = 123;  // 不会返回任何结果

// ❌ 错误：使用了未定义的变量
qf_output = { result: 123 };  // qf_output 未定义
```

### 2. console 使用限制

```js
// 生产环境禁用 console
try {
  console.log("debug");  // 可能抛出错误
} catch (e) {
  // 使用 return 代替
  return { debug: "信息", result: data };
}
```

### 3. 资源管理（重要 ⭐）

```js
// ✅ 正确：Excel 资源管理
let workbook;
try {
  workbook = xlsx.read(buffer);
  const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
  return { data };
} finally {
  if (workbook) workbook.close();  // ⭐ 必须调用
}

// ❌ 错误：忘记 close()
const workbook = xlsx.read(buffer);
return xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
// 内存泄漏！
```

### 4. 异步代码必须 await

```js
// ✅ 正确：等待异步完成
const data = await fetch(url).then(r => r.json());
return data;

// ❌ 错误：没有 await
fetch(url).then(r => r.json());  // Promise 被忽略
return;  // 返回 undefined
```

### 5. Buffer 类型转换

```js
// ✅ 正确：从 fetch 获取 Buffer
const response = await fetch(url);
const buffer = Buffer.from(await response.arrayBuffer());

// ✅ 正确：从 axios 获取 Buffer
const response = await axios.get(url, { responseType: 'arraybuffer' });
const buffer = Buffer.from(response.data);

// ❌ 错误：直接使用 response.data
const buffer = response.data;  // 类型可能不正确
```

### 6. 错误处理

```js
// ✅ 推荐：使用 try-catch
try {
  const data = await riskyOperation();
  return { success: true, data };
} catch (error) {
  return { 
    success: false, 
    error: error.message 
  };
}

// ⚠️ 不推荐：直接抛出错误（会被服务捕获）
const data = await riskyOperation();  // 如果失败，返回错误对象
```

---

## 🎯 最佳实践

### 1. 优先使用原生实现

```js
// ✅ 推荐：使用 Go 原生 crypto（性能更好）
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update(data).digest('hex');

// ⚠️ 可用但不推荐：crypto-js（性能较低）
const hash = crypto.SHA256(data).toString();
```

### 2. 大文件使用流式处理

```js
// ✅ 推荐：流式读取大 Excel（> 10K 行）
xlsx.readStream(buffer, 'Sheet1', (rows, startIndex) => {
  // 批量处理
}, { batchSize: 500 });

// ⚠️ 不推荐：一次性读取（内存占用高）
const workbook = xlsx.read(buffer);
const data = xlsx.utils.sheet_to_json(sheet);  // 10K+ 行会占用大量内存
```

### 3. 合理设置超时

```js
// ✅ 推荐：设置合理的超时时间
const response = await axios.get(url, {
  timeout: 30000  // 30 秒
});

// ⚠️ 注意：默认超时是 300 秒
const response = await fetch(url);  // 可能等待很久
```

### 4. 返回格式化的结果

```js
// ✅ 推荐：结构化的返回结果
return {
  success: true,
  data: result,
  timestamp: new Date().toISOString(),
  count: result.length
};

// ⚠️ 不推荐：直接返回原始数据
return result;  // 不利于调试和错误处理
```

---

## 🔍 常见问题

### Q1: 为什么 console.log 不工作？

**A**: 生产环境默认禁用 console。解决方案：
- 使用 `return { debug: "信息" }` 返回调试信息
- 开发环境可以使用 console（设置 `ENVIRONMENT=development`）

### Q2: 如何上传文件到服务器？

**A**: Excel/文件操作流程：
1. 使用 fetch/axios 下载文件到 Buffer
2. 使用 xlsx.read() 或其他模块处理
3. 返回 Base64 字符串或上传到 OSS

```js
// 下载 → 处理 → 返回 Base64
const response = await fetch(excelUrl);
const buffer = Buffer.from(await response.arrayBuffer());
const workbook = xlsx.read(buffer);
// 处理...
const outputBuffer = xlsx.write(workbook, { type: 'buffer' });
return { base64: outputBuffer.toString('base64') };
```

### Q3: 为什么我的代码报 "xxx is not defined"？

**A**: 可能的原因：
1. 使用了未 require 的模块（如 lodash, uuid）
2. 使用了不支持的 Node.js 模块（如 fs, path）
3. 使用了浏览器 API（如 document, window）
4. 在生产环境使用了 console

### Q4: 如何处理大文件？

**A**: 
- Excel: 使用 `xlsx.readStream()` 流式处理
- HTTP: 使用 `responseType: 'arraybuffer'` 一次性下载
- 注意文件大小限制（默认 100MB）

### Q5: 代码执行超时怎么办？

**A**: 
- 默认超时 300 秒，检查是否有死循环或长时间请求
- 优化算法，减少不必要的计算
- 使用流式处理代替一次性加载
- 检查网络请求是否设置了超时

---

## 📋 模块快速参考

### 支持的模块总览

| 模块名 | 类型 | 加载方式 | 是否需要 require | 主要功能 |
|--------|------|---------|-----------------|---------|
| **Buffer** | Node.js 原生 | 自动 | ❌ 无需 | 二进制数据处理 |
| **console** | Node.js 原生 | 自动（受限） | ❌ 无需 | 日志输出（生产环境禁用） |
| **process** | Node.js 原生 | 自动 | ❌ 无需 | 环境信息 |
| **url** | Node.js 原生 | 自动 | ❌ 无需 | URL 解析 |
| **crypto** | Go 原生 + JS | 按需 | ✅ 需要 | 加密算法（77+ 种） |
| **fetch** | Go 原生 | 自动 | ❌ 无需 | HTTP 请求（推荐） |
| **axios** | JavaScript | 按需 | ✅ 需要 | HTTP 请求库 |
| **xlsx** | Go excelize | 按需 | ✅ 需要 | Excel 处理 |
| **dateFns** | JavaScript | 按需 | ✅ 需要 | 日期处理 |
| **qs** | JavaScript | 按需 | ✅ 需要 | 查询字符串 |
| **FormData (Web)** | Go 原生 | 自动 | ❌ 无需 | Web 标准表单（配合 fetch） |
| **FormData (Node.js)** | Go 原生 | 按需 | ✅ 需要 | Node.js form-data（配合 axios） |
| **Headers** | Go 原生 | 自动 | ❌ 无需 | HTTP Headers 对象 |
| **Request** | Go 原生 | 自动 | ❌ 无需 | HTTP Request 对象 |
| **lodash** | JavaScript | 按需 | ✅ 需要 | 工具函数库 |
| **uuid** | JavaScript | 按需 | ✅ 需要 | UUID 生成 |
| **Blob/File** | Go 原生 | 自动 | ❌ 无需 | 文件对象 |
| **AbortController** | Go 原生 | 自动 | ❌ 无需 | 请求取消 |
| **URL** | Go 原生 | 自动 | ❌ 无需 | URL 解析（Web 标准） |
| **URLSearchParams** | Go 原生 | 自动 | ❌ 无需 | 查询参数解析 |

---

## 🚀 模块使用建议

### HTTP 请求选择

| 场景 | 推荐模块 | 原因 |
|------|---------|------|
| 简单 GET/POST | `fetch` | 原生支持，无需 require |
| 复杂配置 | `axios` | API 更友好，自动 JSON 转换 |
| 文件上传 | `axios` + FormData | 更稳定可靠 |
| 文件下载 | `fetch` 或 `axios` | 都支持，fetch 更轻量 |
| 需要拦截器 | `axios` | fetch 不支持拦截器 |

### 加密算法选择

| 场景 | 推荐方式 | 原因 |
|------|---------|------|
| SHA256/MD5 哈希 | Go 原生 crypto | 性能更好（5-10x） |
| HMAC 签名 | Go 原生 crypto | 性能更好 |
| RSA 加密/解密 | Go 原生 crypto | 高性能，原生支持 |
| RSA 签名/验证 | Go 原生 crypto | 高性能，原生支持 |
| AES 加密 | crypto-js | Go 原生不支持对称加密 |
| DES/3DES 加密 | crypto-js | Go 原生不支持对称加密 |

### Excel 处理选择

| 文件大小 | 推荐 API | 原因 |
|---------|---------|------|
| < 1K 行 | 基础 API (`xlsx.read` + `sheet_to_json`) | 简单直接 |
| 1K-10K 行 | 基础 API 或流式 API | 都可以 |
| > 10K 行 | 流式 API (`readStream`, `readBatches`) | 内存占用降低 80% |
| 导出大文件 | `createWriteStream()` | 逐行写入，内存友好 |

---

## 📦 已移除的模块

| 模块名 | 移除版本 | 原因 | 影响 |
|--------|---------|------|------|
| **pinyin** | v2.2 | 不常用，占用 1.6GB 内存（20 Runtime） | 无，使用率极低 |

---

## 🔧 JavaScript 语法支持

### ✅ 完全支持的语法

- ✅ ES5 完整语法
- ✅ ES6+ 主要特性：
  - `let` / `const` 变量声明
  - 箭头函数 `() => {}`
  - 模板字符串 `` `hello ${name}` ``
  - 解构赋值 `const {name, age} = obj`
  - 扩展运算符 `...args`
  - 类定义 `class MyClass {}`
  - Promise / async / await
  - for...of 循环
  - Map / Set / WeakMap / WeakSet
  - Symbol（基础支持）

### ⚠️ 部分支持的语法

| 特性 | 支持状态 | 说明 |
|------|---------|------|
| **模块系统** | ⚠️ 仅支持 CommonJS | 使用 `require()`，不支持 ES6 `import/export` |
| **Generator** | ⚠️ 基础支持 | `function*` 和 `yield`，部分场景可用 |
| **装饰器** | ❌ 不支持 | TypeScript/ES7 装饰器 |
| **BigInt** | ⚠️ 受限 | 字面量支持，但构造函数有限制（见下方详细说明） |
| **正则表达式** | ✅ 大部分支持 | 后行断言等高级特性可能不支持 |

#### ⚠️ BigInt 支持说明

**支持的功能**:
- ✅ BigInt 字面量：`const a = 100n;`
- ✅ BigInt 构造函数：`BigInt(100)` 返回原生 bigint ⭐ 已修复
- ✅ typeof 检测：`typeof 100n === "bigint"`
- ✅ BigInt 之间的比较：`100n === 100n` → true
- ✅ 字面量和构造函数比较：`BigInt(100) === 100n` → true ⭐ 已修复
- ✅ 基础算术运算：`100n + 200n`
- ✅ Buffer BigInt 方法：`buffer.readBigInt64BE()` 返回原生 bigint

**限制和注意事项**:
- ⚠️ BigInt 不能直接序列化为 JSON（需转换为字符串）
- ⚠️ BigInt 和 Number 不能混合运算（必须显式转换）

**正确用法示例**:

```js
// ✅ 正确：使用字面量
const a = 100n;
const b = 100n;
console.log(a === b);  // true

// ✅ 正确：使用构造函数（已修复）⭐
const a = 100n;
const b = BigInt(100);
console.log(a === b);  // true ✅（修复后）
console.log(typeof b); // "bigint" ✅

// ✅ 正确：Number 转 BigInt
const num = 100;
const bigNum = BigInt(num);
console.log(bigNum === 100n);  // true ✅（修复后）

// ✅ 正确：算术运算
const sum = 100n + 200n;  // 300n
const sum2 = BigInt(100) + BigInt(200);  // 300n ✅

// ❌ 错误：混合运算（仍不支持）
const result = 100n + 100;  // TypeError

// ✅ 正确：先转换类型
const result = 100n + BigInt(100);  // 200n
const result2 = Number(100n) + 100;  // 200

// ⚠️ 注意：BigInt 不能序列化为 JSON
return { value: 100n };  // ❌ JSON.stringify 报错

// ✅ 正确：转换为字符串
return { value: "100" };  // 或
return { value: (100n).toString() };
```

**技术实现**:
- 🔥 `BigInt()` 构造函数通过 `runtime.RunString("数字n")` 创建原生 bigint
- 🔥 `Buffer.readBigInt64BE()` 等方法也返回原生 bigint
- 🔥 有降级方案确保兼容性

**在本项目中的建议**:
1. **字面量和构造函数都可以使用** - 已修复，两者兼容 ✅
2. **可以直接使用 === 比较** - BigInt(100) === 100n 返回 true ✅
3. **返回 BigInt 时仍需转换为字符串** - JSON 序列化限制（JavaScript 语言限制）

### ❌ 不支持的语法

- ❌ ES6 模块 (`import` / `export`)
- ❌ 动态 `import()`
- ❌ 顶层 `await`（需要使用 async 函数包装）
- ❌ 装饰器 (`@decorator`)
- ❌ TypeScript 语法（需要先编译为 JavaScript）
- ❌ JSX 语法

### 正确的模块使用方式

```js
// ✅ 正确：使用 CommonJS
const axios = require('axios');
const _ = require('lodash');

// ❌ 错误：使用 ES6 模块
import axios from 'axios';  // 不支持
export default function() {}  // 不支持

// ✅ 正确：异步函数
async function main() {
  const data = await fetch(url);
  return data;
}
return main();

// ❌ 错误：顶层 await
const data = await fetch(url);  // 不支持
return data;
```

---

## 🌐 全局对象和函数

### ✅ 可用的全局对象

| 对象/函数 | 说明 | 示例 |
|-----------|------|------|
| **Math** | 数学函数库 | `Math.random()`, `Math.floor()` |
| **JSON** | JSON 解析和序列化 | `JSON.parse()`, `JSON.stringify()` |
| **Date** | 日期对象 | `new Date()`, `Date.now()` |
| **parseInt** | 字符串转整数 | `parseInt("123")` |
| **parseFloat** | 字符串转浮点数 | `parseFloat("3.14")` |
| **isNaN** | 检查是否为 NaN | `isNaN(value)` |
| **isFinite** | 检查是否为有限数 | `isFinite(123)` |
| **setTimeout** | 延时执行 | `setTimeout(fn, 1000)` |
| **setInterval** | 定时执行 | `setInterval(fn, 1000)` |
| **clearTimeout** | 清除延时 | `clearTimeout(timer)` |
| **clearInterval** | 清除定时器 | `clearInterval(timer)` |
| **encodeURIComponent** | URI 编码 | `encodeURIComponent('中文')` |
| **decodeURIComponent** | URI 解码 | `decodeURIComponent('%E4%B8%AD')` |
| **btoa** | Base64 编码 | `btoa('hello')` |
| **atob** | Base64 解码 | `atob('aGVsbG8=')` |
| **Promise** | Promise 对象 | `new Promise((resolve) => {})` |
| **Array** | 数组对象 | `new Array()`, `[1,2,3]` |
| **Object** | 对象操作 | `Object.keys()`, `Object.assign()` |
| **String** | 字符串对象 | `new String()`, `"abc"` |
| **Number** | 数字对象 | `new Number()`, `123` |
| **Boolean** | 布尔对象 | `new Boolean()`, `true` |
| **RegExp** | 正则表达式 | `new RegExp()`, `/abc/` |
| **Error** | 错误对象 | `new Error('message')` |
| **URL** | URL 解析（Web 标准）⭐ | `new URL('https://example.com')` |
| **URLSearchParams** | 查询参数解析 | `new URLSearchParams('a=1')` |
| **Headers** | HTTP Headers 对象 | `new Headers({ 'Content-Type': 'application/json' })` |
| **Request** | HTTP Request 对象 | `new Request('https://api.com', { method: 'POST' })` |
| **Blob** | 二进制数据对象 | `new Blob([data])` |
| **File** | 文件对象 | `new File([data], 'file.txt')` |
| **FormData** | Web 表单数据 | `new FormData()` |
| **AbortController** | 请求取消控制器 | `new AbortController()` |
| **fetch** | HTTP 请求函数 | `fetch('https://api.com')` |

### ❌ 不可用的全局对象

| 对象 | 原因 | 替代方案 |
|------|------|---------|
| `window` | 安全限制 | 无 |
| `global` | 安全限制 | 无 |
| `globalThis` | 安全限制 | 无 |
| `self` | 安全限制 | 无 |
| `document` | 非浏览器环境 | 无 |
| `localStorage` | 非浏览器环境 | 使用外部存储 API |
| `sessionStorage` | 非浏览器环境 | 使用外部存储 API |
| `navigator` | 非浏览器环境 | 无 |
| `location` | 非浏览器环境 | 无 |

---

## 🔐 认证和限流

### 1. Token 认证

代码执行接口需要 Token 认证：

```bash
# HTTP Header
accessToken: flow_xxxxxxxxxxxx
```

**获取方式**: 联系管理员创建 Token

### 2. 限流策略

| 限流类型 | 默认限制 | 说明 |
|---------|---------|------|
| **Token 限流** | 根据 Token 配置 | 每个 Token 独立配额 |
| **IP 限流（认证前）** | 10 次/秒 | 防止暴力破解 |
| **IP 限流（认证后）** | 200 次/秒 | 防止滥用 |
| **全局 IP 限流** | 50 次/秒 | 公开接口限制 |

### 3. 并发限制

| 限制项 | 说明 |
|--------|------|
| 系统并发 | 基于内存智能计算（通常 500-2000） |
| 单 IP 并发 | 无硬性限制，通过限流控制 |
| 熔断保护 | 系统过载时自动拒绝请求 |

---

## 💾 数据传输限制

### 输入限制

```js
// Input 参数（通过 API 传入）
{
  "input": {
    // ⚠️ 总大小限制: 2MB（默认）
    "data": "...",
    "config": {...}
  }
}
```

### 输出限制

```js
// 返回结果
return {
  // ⚠️ 总大小限制: 5MB（默认）
  result: data
};
```

### 文件传输限制

| 配置项 | 默认值 | 环境变量 | 应用场景 | 说明 |
|--------|--------|---------|---------|------|
| **MaxFormDataSize** | 10MB | `MAX_FORMDATA_SIZE_MB` | FormData 总大小 | Node.js FormData 或 Web FormData 的总大小限制 |
| **MaxBlobFileSize** | 5MB | `MAX_BLOB_FILE_SIZE_MB` | Blob/File 对象 | 单个 Blob 或 File 对象的大小限制，也用于 Excel 文件 |
| **MaxFileSize** | 5MB | `MAX_FILE_SIZE_MB` | FormData 单文件 | FormData 中单个文件字段的大小限制 |
| **StreamingThreshold** | 1MB | `FORMDATA_STREAMING_THRESHOLD_MB` | 流式阈值 | 超过此大小启用流式处理（降低内存） |
| **FormDataBufferSize** | 512KB | `FORMDATA_BUFFER_SIZE` | IO 缓冲区 | FormData 流式复制时的 IO 缓冲区大小（字节） |

#### 配置项详细说明

**1. MaxFormDataSize（FormData 总大小）**
```js
// 限制整个 FormData 的总大小
const FormData = require('form-data');
const formData = new FormData();
formData.append('file1', buffer1);  // 1MB
formData.append('file2', buffer2);  // 5MB
formData.append('file3', buffer3);  // 5MB
// 总计 11MB > 10MB（MaxFormDataSize）→ 报错
```

**2. MaxBlobFileSize（Blob/File/Excel 限制）**
```js
// 用于三种场景：
// a) Blob 对象
const blob = new Blob([largeData]);  // 限制 5MB

// b) File 对象
const file = new File([data], 'file.txt');  // 限制 5MB

// c) Excel 文件读取
const xlsx = require('xlsx');
const buffer = Buffer.from(excelData);  // 限制 5MB
const workbook = xlsx.read(buffer);
```

**3. MaxFileSize（FormData 单文件限制）**
```js
// 限制 FormData 中每个文件字段的大小
const FormData = require('form-data');
const formData = new FormData();
formData.append('avatar', buffer1);     // 单个文件 < 5MB ✅
formData.append('document', buffer2);   // 单个文件 < 5MB ✅
// 每个文件都必须 < 5MB（MaxFileSize）
// 但总大小仍需 < 10MB（MaxFormDataSize）
```

**4. StreamingThreshold（流式阈值）**
```js
// FormData 超过 1MB 自动启用流式处理
// - < 1MB: 缓冲模式（性能更好，一次性读入内存）
// - ≥ 1MB: 流式模式（内存友好，使用 io.Pipe 流式传输）
```

**5. FormDataBufferSize（IO 缓冲区大小）**

**含义**: 在流式处理 FormData 时，每次读写数据的缓冲区大小。

**作用场景**:
```js
// 当 FormData 大小 ≥ StreamingThreshold (1MB) 时
const FormData = require('form-data');
const formData = new FormData();
formData.append('file', largeBuffer);  // 假设 10MB

// 流式复制过程：
// 1. 从 largeBuffer 读取数据
// 2. 每次读取 FormDataBufferSize (2MB) 大小
// 3. 写入到 HTTP 请求流
// 4. 循环直到全部数据传输完成
```

**性能影响**:
- **缓冲区太小**（如 64KB）: IO 次数多，性能降低
- **缓冲区太大**（如 10MB）: 内存占用高，浪费资源
- **推荐值** 512KB: 平衡性能和内存

**内存计算**:
```
单个请求的 FormData 内存占用 ≈ BufferSize
并发 100 个 FormData 请求 ≈ 100 × 512KB = 50MB
```


#### 三者关系图示

```
FormData 总大小 (MaxFormDataSize: 10MB)
├─ 文件1 (MaxFileSize: 5MB) ✅
├─ 文件2 (MaxFileSize: 5MB) ✅
└─ 文本字段
   └─ 总计必须 < 10MB

单个 Blob/File/Excel (MaxBlobFileSize: 5MB)
```

#### 使用建议

| 文件大小 | 传输方式 | 建议 |
|---------|---------|------|
| < 1MB | Base64 或 Buffer | 直接传输，性能最好 |
| 1MB - 10MB | Buffer + FormData | 使用流式处理（自动） |
| 10MB - 50MB | Buffer + FormData | 注意单文件限制 |
| 50MB - 100MB | 直接 Blob/Buffer | 不通过 FormData，直接上传 |
| > 100MB | OSS 分片上传 | 超过任何限制，必须使用外部存储 |

#### 配置示例

```bash
# 生产环境（保守）
MAX_FORMDATA_SIZE_MB=50
MAX_BLOB_FILE_SIZE_MB=50
MAX_FILE_SIZE_MB=20

# 开发环境（宽松）
MAX_FORMDATA_SIZE_MB=200
MAX_BLOB_FILE_SIZE_MB=200
MAX_FILE_SIZE_MB=100
```

---

## ⏱️ 性能和超时

### 执行超时

| 场景 | 默认超时 | 环境变量 | 说明 |
|------|---------|---------|------|
| **代码执行** | 60 秒 | `EXECUTION_TIMEOUT_MS` | 单次代码执行的最大时间（含所有网络请求） |
| **HTTP 请求** | 30 秒 | `FETCH_TIMEOUT_MS` | 单个 fetch/axios 请求的最大时间 |
| **并发等待** | 10 秒 | `CONCURRENCY_WAIT_TIMEOUT_SEC` | 系统繁忙时，等待获取执行槽位的最大时间 |
| **Runtime 获取** | 5 秒 | `RUNTIME_POOL_ACQUIRE_TIMEOUT_SEC` | 从 Runtime 池获取 Runtime 的超时时间 |

#### 超时详细说明

**1. 代码执行超时（EXECUTION_TIMEOUT_MS）**
```js
// 整个代码执行的总时间限制（包括所有操作）
async function main() {
  const data1 = await fetch(url1);  // 耗时 10 秒
  const data2 = await fetch(url2);  // 耗时 10 秒
  const result = processData(data1, data2);  // 耗时 30 秒
  return result;
}
// 总计耗时 50 秒 < 60 秒 ✅
```

**2. HTTP 请求超时（FETCH_TIMEOUT_MS）**
```js
// 每个 HTTP 请求的超时时间
const response = await fetch(slowUrl);  // 最多等待 30 秒
// 如果超过 30 秒，该请求会超时失败
```

**3. 并发等待超时（10 秒，硬编码）**

**含义**: 当系统并发数达到上限时，新请求等待获取执行槽位的超时时间。

**触发条件**: 
- 当前并发执行数 ≥ `MAX_CONCURRENT_EXECUTIONS`（如 1000）
- 新请求需要排队等待

**执行流程**:
```
新请求到达 → 步骤 1: 并发槽位控制（10 秒超时）
              ↓
           获取成功 → 步骤 2: Runtime 池获取（5 秒超时）
              ↓
           获取成功 → 执行代码
```

**场景示例**:
```
系统状态：
- 并发限制: MAX_CONCURRENT_EXECUTIONS=1000
- 当前并发: 1000 个请求正在执行
- Runtime 池: 200 个 Runtime（可能都在使用中）

新请求到达：
【步骤 1】获取并发槽位（最多等待 10 秒）
  - 尝试获取 semaphore
  - 等待其他请求完成释放槽位
  - 超时: 返回 "系统繁忙，请稍后重试"

【步骤 2】获取 Runtime（最多等待 5 秒）
  - 从 Runtime 池获取可用 Runtime
  - 如果池空，等待其他请求归还 Runtime
  - 超时: 创建临时 Runtime 继续执行
```

**错误示例（并发槽位超时）**:
```json
{
  "success": false,
  "error": {
    "type": "ConcurrencyError",
    "message": "系统繁忙，请稍后重试"
  }
}
```

**4. Runtime 获取超时（5 秒，硬编码）**

**含义**: 从 Runtime 池中获取可用 Runtime 的超时时间。

**触发场景**:
- 已通过并发控制（有执行槽位）
- 但 Runtime 池中暂时没有可用的 Runtime
- 等待其他请求归还 Runtime 到池中

**处理策略**:
```
等待 Runtime（最多 5 秒）
├─ 5 秒内获取到 → 使用池中的 Runtime ✅
└─ 5 秒后仍未获取 → 创建临时 Runtime 继续执行 ⚠️
```

**注意**: 
- Runtime 获取超时**不会返回错误**
- 而是创建一个临时 Runtime 继续执行（确保请求成功）
- 临时 Runtime 执行完后会被丢弃（GC 回收）

#### 两个超时的关系

| 阶段 | 超时时间 | 超时后的行为 | 是否会失败 |
|------|---------|------------|-----------|
| **1. 并发槽位获取** | 10 秒 | 返回错误："系统繁忙" | ✅ 会失败 |
| **2. Runtime 获取** | 5 秒 | 创建临时 Runtime 继续执行 | ❌ 不会失败 |

**执行顺序**: 先获取并发槽位（第 1 步），成功后再获取 Runtime（第 2 步）。

**配置说明**: ✅ 这两个超时时间已支持环境变量配置：
- `CONCURRENCY_WAIT_TIMEOUT_SEC` (默认 10 秒) - 并发槽位等待超时
- `RUNTIME_POOL_ACQUIRE_TIMEOUT_SEC` (默认 5 秒) - Runtime 获取超时

**调优建议**:
- 高负载场景: 减少等待时间（5-8 秒），快速失败
- 低负载场景: 增加等待时间（15-20 秒），提高成功率
- 开发调试: 增加到 15-30 秒，方便调试

---

## 🏭 生产环境配置推荐

### 根据服务器规格选择配置

#### 1. 小型服务器（2核4G）

**适用场景**: 轻量级应用，QPS < 100

```bash
# Runtime 池配置
RUNTIME_POOL_SIZE=50
MIN_RUNTIME_POOL_SIZE=25
MAX_RUNTIME_POOL_SIZE=100
# MAX_CONCURRENT_EXECUTIONS=400  # 🔥 可选，系统会智能计算（推荐不设置）

# 超时配置（保守）
EXECUTION_TIMEOUT_MS=30000   # 0.5分钟
FETCH_TIMEOUT_MS=20000        

# 文件大小限制（保守）
MAX_FORMDATA_SIZE_MB=50
MAX_BLOB_FILE_SIZE_MB=50
MAX_FILE_SIZE_MB=20

# 资源优化
GOGC=75                        # 更频繁 GC，降低内存峰值
```

**预期性能**:
- 并发能力: ~307 并发（智能计算）
- 内存占用: ~1.5-2GB
- 响应时间: 10-50ms（简单代码）

---

#### 2. 中型服务器（4核8G）⭐ 推荐

**适用场景**: 中等负载，QPS 100-500

```bash
# Runtime 池配置
RUNTIME_POOL_SIZE=100
MIN_RUNTIME_POOL_SIZE=50
MAX_RUNTIME_POOL_SIZE=200
# MAX_CONCURRENT_EXECUTIONS=800  # 🔥 可选，系统会智能计算（推荐不设置）

# 超时配置（标准）
EXECUTION_TIMEOUT_MS=60000    # 1 分钟
FETCH_TIMEOUT_MS=30000        # 0.5 分钟

# 文件大小限制（标准）
MAX_FORMDATA_SIZE_MB=100
MAX_BLOB_FILE_SIZE_MB=100
MAX_FILE_SIZE_MB=50

# 资源配置
GOGC=75                        # 平衡内存和性能
```

**预期性能**:
- 并发能力: ~614 并发（智能计算）
- 内存占用: ~3-4GB
- 响应时间: 5-30ms（简单代码）

**Docker 资源限制**:
```yaml
deploy:
  resources:
    limits:
      memory: 6G
      cpus: '3.0'
```

---

#### 3. 大型服务器（8核16G）

**适用场景**: 高负载，QPS > 500

```bash
# Runtime 池配置
RUNTIME_POOL_SIZE=200
MIN_RUNTIME_POOL_SIZE=100
MAX_RUNTIME_POOL_SIZE=300
# MAX_CONCURRENT_EXECUTIONS=1600  # 🔥 可选，系统会智能计算（推荐不设置）

# 超时配置（宽松）
EXECUTION_TIMEOUT_MS=300000    # 5 分钟
FETCH_TIMEOUT_MS=300000        # 5 分钟

# 文件大小限制（宽松）
MAX_FORMDATA_SIZE_MB=200
MAX_BLOB_FILE_SIZE_MB=200
MAX_FILE_SIZE_MB=100

# 资源配置
GOGC=100                       # 标准 GC，性能优先
```

**预期性能**:
- 并发能力: ~1228 并发（智能计算）
- 内存占用: ~6-8GB
- 响应时间: 5-20ms（简单代码）

**Docker 资源限制**:
```yaml
deploy:
  resources:
    limits:
      memory: 12G
      cpus: '6.0'
```

---

### 配置参数计算公式

#### 1. Runtime 池大小（RUNTIME_POOL_SIZE）

```
推荐值 = 可用内存(GB) × 30 个/GB

计算依据：
- 每个 Runtime ≈ 3-5MB（含嵌入模块）
- 1GB 内存 ≈ 200-300 个 Runtime
- 预留 50% 内存给其他用途
```

**示例**:
- 4GB 可用内存 → 120 个 Runtime（保守）
- 8GB 可用内存 → 240 个 Runtime（保守）

#### 2. 最大并发数（MAX_CONCURRENT_EXECUTIONS）🔥 智能计算

**系统会自动根据可用内存计算最佳并发数，无需手动配置！**

```
🔥 智能计算公式（系统自动执行）:
1. 读取系统内存统计（runtime.MemStats）
2. 估算系统总内存 = m.Sys × 2.5
3. 计算可用内存 = 系统总内存 × 0.75（预留 25% 给系统）
4. 计算并发数 = 可用内存(GB) × 1024 / 10MB

边界限制：
  - 最小值: 100
  - 最大值: 2000
  - 每个请求平均内存: 10MB
```

**示例**:
- 4核8G 服务器 → 智能计算约 614 并发
- 8核16G 服务器 → 智能计算约 1228 并发
- 16核32G 服务器 → 智能计算约 2000 并发（上限）

**手动配置**（可选）:
```bash
# 如果智能计算的值不合适，可以显式指定
MAX_CONCURRENT_EXECUTIONS=800
```

#### 3. 执行超时（EXECUTION_TIMEOUT_MS）



---

### 性能优化建议

#### 1. 内存优化

```bash
# 更频繁的 GC，降低内存峰值
GOGC=75

# 减少缓存大小
TOKEN_CACHE_HOT_SIZE=300
RATE_LIMIT_HOT_SIZE=300
CODE_CACHE_SIZE=50
```

#### 2. 高并发优化

```bash
# 增大 Runtime 池
RUNTIME_POOL_SIZE=300
MAX_RUNTIME_POOL_SIZE=500

# 增大并发限制
MAX_CONCURRENT_EXECUTIONS=2500
```

#### 3. 低延迟优化

```bash
# 较小的超时（快速失败）
EXECUTION_TIMEOUT_MS=60000     # 1 分钟
FETCH_TIMEOUT_MS=30000         # 30 秒

# 启用熔断器（快速拒绝）
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_TIMEOUT_SEC=5
```

---

### 监控和调优

#### 关键指标

| 指标 | 健康范围 | 告警阈值 | 说明 |
|------|---------|---------|------|
| Runtime 池使用率 | < 70% | > 85% | 长期高位需扩容 |
| 并发执行数 | < 80% | > 90% | 接近上限需增加配置 |
| 平均响应时间 | < 100ms | > 500ms | 检查代码性能 |
| 并发等待超时率 | < 1% | > 5% | 系统过载，需扩容 |
| 内存使用率 | < 75% | > 90% | 可能 OOM，需优化 |

#### 调优步骤

1. **观察 1-2 周实际负载**
2. **查看监控指标** (`/flow/stats` 接口)
3. **根据 QPS 和响应时间调整**
4. **逐步增加配置，观察效果**

---

### 快速配置模板

#### 保守配置（稳定优先）

```bash
RUNTIME_POOL_SIZE=100
MAX_CONCURRENT_EXECUTIONS=500
EXECUTION_TIMEOUT_MS=120000
MAX_BLOB_FILE_SIZE_MB=50
```

#### 标准配置（平衡）⭐ 推荐

```bash
RUNTIME_POOL_SIZE=200
MAX_CONCURRENT_EXECUTIONS=1600
EXECUTION_TIMEOUT_MS=180000
MAX_BLOB_FILE_SIZE_MB=100
```

#### 激进配置（性能优先）

```bash
RUNTIME_POOL_SIZE=300
MAX_CONCURRENT_EXECUTIONS=2500
EXECUTION_TIMEOUT_MS=300000
MAX_BLOB_FILE_SIZE_MB=200
```

---

### 性能基准

| 操作类型 | 性能指标 |
|---------|---------|
| 简单计算 | < 5ms |
| HTTP 请求 | 取决于网络 |
| Excel 读取 | 55K 行/秒 |
| Excel 写入 | 17K 行/秒 |
| 加密操作（SHA256） | < 1ms（Go 原生） |

---

## 🛡️ 安全机制

### 5 层沙箱防护

1. **静态代码分析**: 执行前检测 40+ 种危险模式
2. **沙箱初始化**: 删除 `eval`, `globalThis`, `Reflect`, `Proxy`
3. **模块拦截**: 禁用 `fs`, `child_process` 等危险模块
4. **原型链保护**: 冻结 `Function` 对象
5. **Runtime 隔离**: 每个请求独立 Runtime

### 被禁用的操作

详见 [安全限制](#安全限制) 章节。

---

## 📝 代码编写要求

### 必须遵守的规则

1. ✅ **必须有 return**: 所有代码必须通过 `return` 返回结果
2. ✅ **异步必须 await**: 使用 `await` 等待 Promise 完成
3. ✅ **资源必须释放**: Excel 使用后必须调用 `workbook.close()`
4. ✅ **错误要处理**: 使用 `try-catch` 处理可能的错误
5. ❌ **不能用 console**: 生产环境禁用（除非配置允许）

### 推荐的代码结构

```js
const axios = require('axios');  // 按需引入模块

async function main() {
  try {
    // 业务逻辑
    const result = await someAsyncOperation();
    
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

return main();  // ⭐ 必须 return
```

---

## 🎓 学习资源

### 官方文档

- [API 接口文档](API接口完整文档.md)
- [增强模块文档](ENHANCED_MODULES.md)
- [在线测试工具](http://your-server:3002/flow/test-tool)

### 示例代码

- 简单计算示例
- HTTP 请求示例（axios, fetch）
- Excel 处理示例
- 数据加密示例
- 日期处理示例

详见本文档后续的 [示例集合](#示例集合) 章节。

---

# 代码规范

## 基础规则

用户上传的 JS 代码，必须通过 **`return`** 输出最终结果。
如果 `return` 返回的是 Promise，服务会自动等待该 Promise **resolve/reject** 后再返回结果。

---

## 1. 必须有 return

* 所有代码必须有一个 `return`。
* 缺少 `return` → 报错：

  ```json
  { "error": "代码中缺少 return" }
  ```

 ❌  不允许代码中使用console

---

## 2. 支持的返回值类型

### ✅ 允许的返回值

1. **基本类型**

   * `return 123;` → `{ "result": 123 }`
   * `return "abc";` → `{ "result": "abc" }`
   * `return true;` → `{ "result": true }`
   * `return null;` → `{ "result": null }`

2. **变量引用**

   ```js
   let a = 100;
   return a;
   ```

   输出：

   ```json
   { "result": 100 }
   ```
   
   **说明**：`return a;` 返回变量 `a` 的值。如需同时返回变量名和值，请使用对象：
   
   ```js
   let a = 100;
   return { a: a };  // 或使用 ES6 简写: { a }
   ```
   
   输出：
   
   ```json
   { "result": { "a": 100 } }
   ```

3. **对象 / 数组**

   ```js
   return { name: "Tom", age: 20 };
   return [1, 2, 3];
   ```

   输出：

   ```json
   { "result": { "name": "Tom", "age": 20 } }
   { "result": [1, 2, 3] }
   ```

4. **函数调用结果**

   ```js
   function foo() { return { x: 10 }; }
   return foo();
   ```

   输出：

   ```json
   { "result": { "x": 10 } }
   ```

5. **Promise**

   * 如果 `resolve(value)` → `{ "result": value }`
   * 如果 `reject(error)` → `{ "error": error.message }`

   **示例：**

   ```js
   function asyncTask() {
     return new Promise((resolve, reject) => {
       setTimeout(() => resolve({ ok: true }), 1000);
     });
   }

   return asyncTask();
   ```

   输出：

   ```json
   { "result": { "ok": true } }
   ```

---

### ❌ 禁止的返回值

* `return undefined;` → 报错：

  ```json
  { "error": "返回值不能是 undefined" }
  ```
* `return myFunc;`（返回函数本身） → 报错。
* `return Symbol("id");` 或 `return 10n;`（无法序列化） → 报错。


---

## 4. 错误处理

* **用户 throw 错误**：

  ```js
  throw new Error("bad");
  ```

  输出：

  ```json
  { "error": "bad" }
  ```

* **Promise reject**：

  ```js
  return Promise.reject(new Error("fail"));
  ```

  输出：

  ```json
  { "error": "fail" }
  ```

---

## 5. 输出规则总结

* `return 基本类型 / 对象 / 数组` → `{ "result": 值 }`
* `return 变量` → `{ "result": 变量的值 }`
* `return 函数调用` → 执行函数，取结果 → `{ "result": 值 }`
* `return Promise` → 等待结果

  * resolve → `{ "result": 值 }`
  * reject → `{ "error": "消息" }`
* `throw` → `{ "error": "消息" }`
* `return undefined` → `{ "error": "返回值不能是 undefined" }`
* 缺少 `return` → `{ "error": "代码中缺少 return 语句" }`

---
太好了 👍 那我帮你整理一套 **Promise 异步执行的测试示例集**，涵盖不同返回场景，你可以直接拿来做测试用例。

---

# JS 执行服务 Promise 测试示例集

## 1. 返回基本类型（Promise resolve）

```js
function testNumber() {
  return new Promise(resolve => {
    setTimeout(() => resolve(123), 500);
  });
}
return testNumber();
```

期望输出：

```json
{ "result": 123 }
```

```js
function testString() {
  return Promise.resolve("hello");
}
return testString();
```

期望输出：

```json
{ "result": "hello" }
```

---

## 2. 返回对象 / 数组

```js
function testObject() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ name: "Tom", age: 20 }), 500);
  });
}
return testObject();
```

期望输出：

```json
{ "result": { "name": "Tom", "age": 20 } }
```

```js
function testArray() {
  return Promise.resolve([1, 2, 3]);
}
return testArray();
```

期望输出：

```json
{ "result": [1, 2, 3] }
```

---

## 3. 返回 null

```js
function testNull() {
  return Promise.resolve(null);
}
return testNull();
```

期望输出：

```json
{ "result": null }
```

---

## 4. 返回变量值（包裹 Promise）

```js
let x = 42;
function testVar() {
  return new Promise(resolve => resolve(x));
}
return testVar();
```

期望输出：

```json
{ "result": 42 }
```

**说明**：如需返回变量名和值，请使用对象：

```js
let x = 42;
function testVar() {
  return new Promise(resolve => resolve({ x: x }));  // 或 { x }
}
return testVar();
```

期望输出：

```json
{ "result": { "x": 42 } }
```

---

## 5. Promise reject（错误捕获）

```js
function testReject() {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error("fail test")), 500);
  });
}
return testReject();
```

期望输出：

```json
{ "error": "fail test" }
```

```js
function testRejectString() {
  return Promise.reject("simple fail");
}
return testRejectString();
```

期望输出：

```json
{ "error": "simple fail" }
```

---

## 6. 抛出异常（同步 throw）

```js
function testThrow() {
  throw new Error("bad code");
}
return testThrow();
```

期望输出：

```json
{ "error": "bad code" }
```

---

## 7. 返回 undefined（禁止）

```js
function testUndefined() {
  return Promise.resolve(undefined);
}
return testUndefined();
```

期望输出：

```json
{ "error": "返回值不能是 undefined" }
```

---


好问题 👍
既然你用 Goja 并且允许 **Promise 返回**，那用户自然可能会在代码里写 `fetch`（只要你在 Goja runtime 里注入了一个 `fetch` polyfill 或者绑定 Go 内置 HTTP）。
我帮你整理一套 **fetch 相关的 Promise 测试用例**，覆盖常见情况。

---

# JS 执行服务 Promise + fetch 测试示例集


---

## 1. fetch 成功返回 JSON

```js
function testFetchJson() {
  return fetch("https://jsonplaceholder.typicode.com/todos/1")
    .then(response => response.json())
    .then(data => data);
}
return testFetchJson();
```

期望输出：

```json
{ "result": { "userId": 1, "id": 1, "title": "...", "completed": false } }
```

---

## 2. fetch 成功返回文本

```js
function testFetchText() {
  return fetch("https://httpbin.org/get")
    .then(response => response.text())
    .then(text => text);
}
return testFetchText();
```

期望输出：

```json
{ "result": "{ \"args\":{}, ... }" }   // 返回字符串
```

---

## 3. fetch 请求错误（404）

```js
function testFetch404() {
  return fetch("https://jsonplaceholder.typicode.com/invalid-url")
    .then(response => {
      if (!response.ok) {
        throw new Error("请求失败，状态码：" + response.status);
      }
      return response.json();
    });
}
return testFetch404();
```

期望输出：

```json
{ "error": "请求失败，状态码：404" }
```

---

## 4. fetch 网络错误

```js
function testFetchNetworkError() {
  return fetch("http://127.0.0.1:9999")  // 假设端口不可用
    .then(res => res.json())
    .catch(err => {
      return Promise.reject(new Error("网络错误: " + err.message));
    });
}
return testFetchNetworkError();
```

期望输出：

```json
{ "error": "网络错误: ..." }
```

---

## 5. fetch + POST 请求（带 body）

```js
function testFetchPost() {
  return fetch("https://httpbin.org/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Tom", age: 20 })
  })
  .then(res => res.json())
  .then(data => data.json);
}
return testFetchPost();
```

期望输出：

```json
{ "result": { "name": "Tom", "age": 20 } }
```

---

## 6. fetch + Promise.all（并发请求）

```js
function testFetchAll() {
  return Promise.all([
    fetch("https://jsonplaceholder.typicode.com/todos/1").then(r => r.json()),
    fetch("https://jsonplaceholder.typicode.com/todos/2").then(r => r.json())
  ]);
}
return testFetchAll();
```

期望输出：

```json
{ "result": [ { "id": 1, ... }, { "id": 2, ... } ] }
```

---

# JS 执行服务 async/await 测试示例集

## 1. async 函数返回基本类型

```js
async function testAsyncNumber() {
  return 123;
}
return testAsyncNumber();
```

期望输出：

```json
{ "result": 123 }
```

```js
async function testAsyncString() {
  const result = await Promise.resolve("hello world");
  return result;
}
return testAsyncString();
```

期望输出：

```json
{ "result": "hello world" }
```

---

## 2. async 函数返回对象 / 数组

```js
async function testAsyncObject() {
  const data = await new Promise(resolve => {
    setTimeout(() => resolve({ name: "Tom", age: 20 }), 500);
  });
  return data;
}
return testAsyncObject();
```

期望输出：

```json
{ "result": { "name": "Tom", "age": 20 } }
```

```js
async function testAsyncArray() {
  const arr = await Promise.resolve([1, 2, 3]);
  return arr;
}
return testAsyncArray();
```

期望输出：

```json
{ "result": [1, 2, 3] }
```

---

## 3. async/await 错误处理（try/catch）

```js
async function testAsyncError() {
  try {
    const data = await Promise.reject(new Error("async fail"));
    return data;
  } catch (err) {
    throw new Error("捕获到错误: " + err.message);
  }
}
return testAsyncError();
```

期望输出：

```json
{ "error": "捕获到错误: async fail" }
```

```js
async function testAsyncThrow() {
  throw new Error("直接抛出错误");
}
return testAsyncThrow();
```

期望输出：

```json
{ "error": "直接抛出错误" }
```

---

## 4. async/await + fetch（GET 请求）

```js
async function testAsyncFetch() {
  const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  const data = await response.json();
  return data;
}
return testAsyncFetch();
```

期望输出：

```json
{ "result": { "userId": 1, "id": 1, "title": "...", "completed": false } }
```

---

## 5. async/await + fetch（POST 请求）

```js
async function testAsyncPost() {
  const response = await fetch("https://httpbin.org/post", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Tom", age: 20 })
  });
  const result = await response.json();
  return result.json;
}
return testAsyncPost();
```

期望输出：

```json
{ "result": { "name": "Tom", "age": 20 } }
```

---

## 6. async/await + fetch（错误处理）

```js
async function testAsyncFetchError() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/invalid-url");
    if (!response.ok) {
      throw new Error("请求失败，状态码：" + response.status);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    throw new Error("请求异常: " + err.message);
  }
}
return testAsyncFetchError();
```

期望输出：

```json
{ "error": "请求异常: 请求失败，状态码：404" }
```

---

## 7. async/await + 多个异步操作（顺序执行）

```js
async function testAsyncSequential() {
  const todo1 = await fetch("https://jsonplaceholder.typicode.com/todos/1").then(r => r.json());
  const todo2 = await fetch("https://jsonplaceholder.typicode.com/todos/2").then(r => r.json());
  return { first: todo1.title, second: todo2.title };
}
return testAsyncSequential();
```

期望输出：

```json
{ "result": { "first": "...", "second": "..." } }
```

---

## 8. async/await + Promise.all（并发执行）

```js
async function testAsyncParallel() {
  const [todo1, todo2] = await Promise.all([
    fetch("https://jsonplaceholder.typicode.com/todos/1").then(r => r.json()),
    fetch("https://jsonplaceholder.typicode.com/todos/2").then(r => r.json())
  ]);
  return { first: todo1, second: todo2 };
}
return testAsyncParallel();
```

期望输出：

```json
{ "result": { "first": { "id": 1, ... }, "second": { "id": 2, ... } } }
```

---

## 9. async 立即执行函数表达式（IIFE）

```js
return (async () => {
  const data = await Promise.resolve({ status: "ok" });
  return data;
})();
```

期望输出：

```json
{ "result": { "status": "ok" } }
```

```js
return (async () => {
  const response = await fetch("https://jsonplaceholder.typicode.com/todos/1");
  const todo = await response.json();
  return { id: todo.id, title: todo.title };
})();
```

期望输出：

```json
{ "result": { "id": 1, "title": "..." } }
```

---

## 10. async/await 处理复杂业务逻辑

```js
async function testComplexLogic() {
  // 第一步：获取用户信息
  const userResponse = await fetch("https://jsonplaceholder.typicode.com/users/1");
  const user = await userResponse.json();
  
  // 第二步：获取用户的待办事项
  const todosResponse = await fetch("https://jsonplaceholder.typicode.com/todos?userId=" + user.id);
  const todos = await todosResponse.json();
  
  // 第三步：处理数据
  const completedCount = todos.filter(todo => todo.completed).length;
  
  return {
    userName: user.name,
    totalTodos: todos.length,
    completed: completedCount,
    pending: todos.length - completedCount
  };
}
return testComplexLogic();
```

期望输出：

```json
{ 
  "result": { 
    "userName": "Leanne Graham",
    "totalTodos": 20,
    "completed": 10,
    "pending": 10
  }
}
```

---

## async/await 与 Promise 的对比

| 特性 | Promise 写法 | async/await 写法 |
|------|-------------|-----------------|
| 可读性 | 链式调用 `.then()` | 同步风格，更直观 |
| 错误处理 | `.catch()` | `try/catch` |
| 并发执行 | `Promise.all([...])` | `await Promise.all([...])` |
| 顺序执行 | 多个 `.then()` 链 | 多个 `await` 语句 |
| 返回值 | 返回 Promise 对象 | 返回 Promise 对象（隐式） |

**推荐使用场景：**

* **简单异步操作** → 使用 `Promise.resolve()` 或 `.then()`
* **复杂业务逻辑** → 使用 `async/await`，代码更清晰
* **并发请求** → 使用 `Promise.all()` 配合 `async/await`
* **错误处理** → `async/await` + `try/catch` 更符合传统编程习惯

---

# JS 执行服务 axios 测试示例集

## 1. axios GET 请求（Promise 写法）

```js
const axios = require("axios");

function testAxiosGet() {
  return axios.get("https://jsonplaceholder.typicode.com/todos/1")
    .then(response => {
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    })
    .catch(error => {
      throw new Error("请求失败: " + error.message);
    });
}
return testAxiosGet();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "status": 200,
    "data": { "userId": 1, "id": 1, "title": "...", "completed": false }
  }
}
```

---

## 2. axios GET 请求（async/await 写法）

```js
const axios = require("axios");

async function testAxiosGetAsync() {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/todos/1");
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    throw new Error("请求失败: " + error.message);
  }
}
return testAxiosGetAsync();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "status": 200,
    "data": { "userId": 1, "id": 1, "title": "...", "completed": false }
  }
}
```

---

## 3. axios POST 请求（Promise 写法）

```js
const axios = require("axios");

function testAxiosPost() {
  const data = {
    title: "New Todo",
    completed: false,
    userId: 1
  };

  return axios.post("https://jsonplaceholder.typicode.com/todos", data)
    .then(response => {
      return {
        success: true,
        status: response.status,
        data: response.data
      };
    })
    .catch(error => {
      throw new Error("POST 请求失败: " + error.message);
    });
}
return testAxiosPost();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "status": 201,
    "data": { "id": 201, "title": "New Todo", "completed": false, "userId": 1 }
  }
}
```

---

## 4. axios POST 请求（async/await 写法）

```js
const axios = require("axios");

async function testAxiosPostAsync() {
  const data = {
    title: "New Todo",
    completed: false,
    userId: 1
  };

  try {
    const response = await axios.post("https://jsonplaceholder.typicode.com/todos", data);
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    throw new Error("POST 请求失败: " + error.message);
  }
}
return testAxiosPostAsync();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "status": 201,
    "data": { "id": 201, "title": "New Todo", "completed": false, "userId": 1 }
  }
}
```

---

## 5. axios 带自定义 headers

```js
const axios = require("axios");

async function testAxiosWithHeaders() {
  const config = {
    method: "post",
    url: "https://httpbin.org/post",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer YOUR_TOKEN",
      "Custom-Header": "custom-value"
    },
    data: {
      name: "Tom",
      age: 20
    }
  };

  try {
    const response = await axios(config);
    return {
      success: true,
      receivedData: response.data.json,
      receivedHeaders: response.data.headers
    };
  } catch (error) {
    throw new Error("请求失败: " + error.message);
  }
}
return testAxiosWithHeaders();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "receivedData": { "name": "Tom", "age": 20 },
    "receivedHeaders": { "Content-Type": "application/json", ... }
  }
}
```

---

## 6. axios 并发请求（Promise.all）

```js
const axios = require("axios");

async function testAxiosConcurrent() {
  try {
    const [todo1, todo2, todo3] = await Promise.all([
      axios.get("https://jsonplaceholder.typicode.com/todos/1"),
      axios.get("https://jsonplaceholder.typicode.com/todos/2"),
      axios.get("https://jsonplaceholder.typicode.com/todos/3")
    ]);

    return {
      success: true,
      results: [
        todo1.data,
        todo2.data,
        todo3.data
      ]
    };
  } catch (error) {
    throw new Error("并发请求失败: " + error.message);
  }
}
return testAxiosConcurrent();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "results": [
      { "id": 1, "title": "...", ... },
      { "id": 2, "title": "...", ... },
      { "id": 3, "title": "...", ... }
    ]
  }
}
```

---

## 7. axios 错误处理（404）

```js
const axios = require("axios");

async function testAxios404() {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/invalid-url");
    return response.data;
  } catch (error) {
    if (error.response) {
      // 服务器返回了错误状态码
      throw new Error("请求失败，状态码：" + error.response.status);
    } else if (error.request) {
      // 请求已发送但没有收到响应
      throw new Error("网络错误：未收到响应");
    } else {
      // 其他错误
      throw new Error("请求配置错误: " + error.message);
    }
  }
}
return testAxios404();
```

期望输出：

```json
{ "error": "请求失败，状态码：404" }
```

---

## 8. axios 带查询参数

```js
const axios = require("axios");

async function testAxiosQueryParams() {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/todos", {
      params: {
        userId: 1,
        completed: true
      }
    });

    return {
      success: true,
      count: response.data.length,
      data: response.data
    };
  } catch (error) {
    throw new Error("查询失败: " + error.message);
  }
}
return testAxiosQueryParams();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "count": 10,
    "data": [ { "userId": 1, "completed": true, ... }, ... ]
  }
}
```

---

## 9. axios PUT 请求（更新数据）

```js
const axios = require("axios");

async function testAxiosPut() {
  const updatedData = {
    id: 1,
    title: "Updated Todo",
    completed: true,
    userId: 1
  };

  try {
    const response = await axios.put(
      "https://jsonplaceholder.typicode.com/todos/1",
      updatedData
    );

    return {
      success: true,
      message: "更新成功",
      data: response.data
    };
  } catch (error) {
    throw new Error("更新失败: " + error.message);
  }
}
return testAxiosPut();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "更新成功",
    "data": { "id": 1, "title": "Updated Todo", "completed": true, "userId": 1 }
  }
}
```

---

## 10. axios DELETE 请求

```js
const axios = require("axios");

async function testAxiosDelete() {
  try {
    const response = await axios.delete("https://jsonplaceholder.typicode.com/todos/1");

    return {
      success: true,
      message: "删除成功",
      status: response.status
    };
  } catch (error) {
    throw new Error("删除失败: " + error.message);
  }
}
return testAxiosDelete();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "删除成功",
    "status": 200
  }
}
```

---

## 11. axios 超时设置

```js
const axios = require("axios");

async function testAxiosTimeout() {
  try {
    const response = await axios.get("https://jsonplaceholder.typicode.com/todos/1", {
      timeout: 5000  // 5秒超时
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("请求超时");
    }
    throw new Error("请求失败: " + error.message);
  }
}
return testAxiosTimeout();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "data": { "userId": 1, "id": 1, ... }
  }
}
```

---

## 12. axios 使用完整配置对象

```js
const axios = require("axios");

async function testAxiosFullConfig() {
  const config = {
    method: "post",
    url: "https://httpbin.org/post",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Custom-Agent/1.0"
    },
    data: {
      username: "testuser",
      email: "test@example.com"
    },
    timeout: 10000,
    validateStatus: function (status) {
      return status >= 200 && status < 300;  // 只接受 2xx 状态码
    }
  };

  try {
    const response = await axios(config);
    return {
      success: true,
      status: response.status,
      data: response.data.json
    };
  } catch (error) {
    throw new Error("请求失败: " + error.message);
  }
}
return testAxiosFullConfig();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "status": 200,
    "data": { "username": "testuser", "email": "test@example.com" }
  }
}
```

---

## axios 常用配置项说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `method` | 请求方法 | `"get"`, `"post"`, `"put"`, `"delete"` |
| `url` | 请求地址 | `"https://api.example.com/data"` |
| `headers` | 自定义请求头 | `{ "Authorization": "Bearer token" }` |
| `params` | URL 查询参数 | `{ userId: 1, page: 2 }` |
| `data` | 请求体数据 | `{ name: "Tom", age: 20 }` |
| `timeout` | 超时时间（毫秒） | `5000` |
| `responseType` | 响应数据类型 | `"json"`, `"text"`, `"blob"`, `"arraybuffer"` |

---

## axios 响应对象结构

```js
{
  data: {},        // 服务器返回的数据
  status: 200,     // HTTP 状态码
  statusText: "OK", // HTTP 状态消息
  headers: {},     // 响应头
  config: {},      // 请求配置
  request: {}      // 原始请求对象
}
```

---

## axios vs fetch 对比

| 特性 | axios | fetch |
|------|-------|-------|
| 浏览器支持 | 需要引入库 | 原生支持 |
| Promise API | ✅ | ✅ |
| 请求拦截 | ✅ 支持 | ❌ 不支持 |
| 响应拦截 | ✅ 支持 | ❌ 不支持 |
| 自动转换 JSON | ✅ 自动 | ❌ 需手动调用 `.json()` |
| 超时设置 | ✅ 内置 | ❌ 需手动实现 |
| 错误处理 | HTTP 错误自动 reject | 仅网络错误 reject |
| 上传进度 | ✅ 支持 | ❌ 不支持 |

**推荐使用场景：**

* **简单 GET 请求** → `fetch` 或 `axios` 都可以
* **需要拦截器** → 使用 `axios`
* **需要进度监控** → 使用 `axios`
* **复杂请求配置** → 使用 `axios`
* **轻量级场景** → 使用 `fetch`（无需额外引入）

---

# JS 执行服务 axios 依次执行多个接口示例

## 常见错误示范 ❌

```js
// ❌ 错误 1: 最后没有 return await
async function first() {
  const response = await axios.get('https://api.example.com/user');
  await second();  // 调用了，但没有返回结果
}
first();  // ❌ 缺少 return

// ❌ 错误 2: 函数之间没有传递数据
async function first() {
  const response = await axios.get('https://api.example.com/user');
  // response.data 没有返回，second() 无法使用
  await second();
}

// ❌ 错误 3: 使用了 qf_output（未定义的变量）
qf_output = { res };  // ❌ qf_output 未定义，应该使用 return
```

---

## 正确示范 1: 链式调用（推荐 ⭐）

```js
const axios = require('axios');

async function sequentialRequests() {
  try {
    // 第一个接口：获取用户信息
    const userResponse = await axios.get('https://jsonplaceholder.typicode.com/users/1');
    const userId = userResponse.data.id;
    
    // 第二个接口：根据 userId 获取文章列表（依赖第一个接口的结果）
    const postsResponse = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
    const firstPostId = postsResponse.data[0].id;
    
    // 第三个接口：根据 postId 获取评论（依赖第二个接口的结果）
    const commentsResponse = await axios.get(`https://jsonplaceholder.typicode.com/comments?postId=${firstPostId}`);
    
    // 返回最终结果
    return {
      success: true,
      user: userResponse.data,
      postCount: postsResponse.data.length,
      firstPost: postsResponse.data[0],
      commentCount: commentsResponse.data.length,
      sampleComments: commentsResponse.data.slice(0, 3)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

return sequentialRequests();  // ⭐ 必须 return
```

期望输出：

```json
{
  "result": {
    "success": true,
    "user": { "id": 1, "name": "Leanne Graham", ... },
    "postCount": 10,
    "firstPost": { "id": 1, "title": "...", ... },
    "commentCount": 5,
    "sampleComments": [ {...}, {...}, {...} ]
  }
}
```

---

## 正确示范 2: 函数拆分

```js
const axios = require('axios');

// 第一个接口函数
async function getUserInfo() {
  const response = await axios.get('https://jsonplaceholder.typicode.com/users/1');
  return response.data;  // ⭐ 必须返回数据
}

// 第二个接口函数（依赖第一个接口的结果）
async function getUserPosts(userId) {
  const response = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
  return response.data;  // ⭐ 必须返回数据
}

// 第三个接口函数（依赖第二个接口的结果）
async function getPostComments(postId) {
  const response = await axios.get(`https://jsonplaceholder.typicode.com/comments?postId=${postId}`);
  return response.data;  // ⭐ 必须返回数据
}

// 主函数：依次调用
async function main() {
  try {
    // 步骤 1: 获取用户信息
    const user = await getUserInfo();
    
    // 步骤 2: 根据用户 ID 获取文章
    const posts = await getUserPosts(user.id);
    
    // 步骤 3: 根据第一篇文章 ID 获取评论
    const comments = await getPostComments(posts[0].id);
    
    return {
      success: true,
      userName: user.name,
      postCount: posts.length,
      firstPostTitle: posts[0].title,
      commentCount: comments.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

return main();  // ⭐ 必须 return await 或 return
```

期望输出：

```json
{
  "result": {
    "success": true,
    "userName": "Leanne Graham",
    "postCount": 10,
    "firstPostTitle": "sunt aut facere repellat provident...",
    "commentCount": 5
  }
}
```

---

## 正确示范 3: 真实业务场景（登录 → 获取数据 → 提交）

```js
const axios = require('axios');

async function businessWorkflow() {
  try {
    // 步骤 1: 登录获取 token
    const loginResponse = await axios.post('https://httpbin.org/post', {
      username: 'admin',
      password: 'password123'
    });
    
    const token = loginResponse.data.json.username;  // 模拟 token
    
    // 步骤 2: 使用 token 获取用户数据
    const userResponse = await axios.get('https://jsonplaceholder.typicode.com/users/1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const userId = userResponse.data.id;
    
    // 步骤 3: 获取用户的文章列表
    const postsResponse = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
    
    // 步骤 4: 提交统计结果
    const submitResponse = await axios.post('https://httpbin.org/post', {
      userId: userId,
      userName: userResponse.data.name,
      postCount: postsResponse.data.length,
      processTime: new Date().toISOString()
    });
    
    return {
      success: true,
      message: '业务流程执行完成',
      token: token,
      user: userResponse.data.name,
      postCount: postsResponse.data.length,
      submitResult: submitResponse.data.json
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      step: '执行过程中出错'
    };
  }
}

return businessWorkflow();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "业务流程执行完成",
    "token": "admin",
    "user": "Leanne Graham",
    "postCount": 10,
    "submitResult": { "userId": 1, "userName": "Leanne Graham", ... }
  }
}
```

---

## 正确示范 4: 带重试机制的依次调用

```js
const axios = require('axios');

// 带重试的请求函数
async function requestWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      return response.data;
    } catch (error) {
      if (i === maxRetries - 1) {
        // 最后一次重试失败，抛出错误
        throw error;
      }
      // 等待后重试（递增等待时间）
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function sequentialWithRetry() {
  try {
    // 依次调用，每个接口都有重试机制
    const user = await requestWithRetry('https://jsonplaceholder.typicode.com/users/1');
    
    const posts = await requestWithRetry(`https://jsonplaceholder.typicode.com/posts?userId=${user.id}`);
    
    const comments = await requestWithRetry(`https://jsonplaceholder.typicode.com/comments?postId=${posts[0].id}`);
    
    return {
      success: true,
      message: '所有接口调用成功（含重试机制）',
      user: user.name,
      postCount: posts.length,
      commentCount: comments.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: '接口调用失败，已重试 3 次'
    };
  }
}

return sequentialWithRetry();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "所有接口调用成功（含重试机制）",
    "user": "Leanne Graham",
    "postCount": 10,
    "commentCount": 5
  }
}
```

---

## 正确示范 5: OSS 文件处理流程（下载 → 处理 → 上传）

```js
const axios = require('axios');
const xlsx = require('xlsx');

async function ossWorkflow() {
  let workbook;
  
  try {
    // 步骤 1: 从 OSS 下载 Excel 文件
    const downloadResponse = await axios.get(
      'https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx',
      { 
        responseType: 'arraybuffer',
        timeout: 30000
      }
    );
    
    const fileSize = downloadResponse.data.byteLength;
    
    // 步骤 2: 解析 Excel 文件
    const buffer = Buffer.from(downloadResponse.data);
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // 步骤 3: 处理数据（过滤、统计等）
    const processedData = data.filter(row => row.年龄 >= 25);
    
    // 步骤 4: 创建新的 Excel
    const newWorkbook = xlsx.utils.book_new();
    const newSheet = xlsx.utils.json_to_sheet(processedData);
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, '处理结果');
    const newBuffer = xlsx.write(newWorkbook, { type: 'buffer' });
    
    newWorkbook.close();
    
    // 步骤 5: 上传处理结果（模拟）
    const uploadResponse = await axios.post('https://httpbin.org/post', {
      fileName: 'processed_data.xlsx',
      originalSize: fileSize,
      originalRows: data.length,
      processedRows: processedData.length,
      processedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'OSS 文件处理流程完成',
      downloadSize: fileSize,
      originalRows: data.length,
      processedRows: processedData.length,
      uploadResult: uploadResponse.data.json
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (workbook) workbook.close();
  }
}

return ossWorkflow();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "OSS 文件处理流程完成",
    "downloadSize": 15234,
    "originalRows": 100,
    "processedRows": 67,
    "uploadResult": { "fileName": "processed_data.xlsx", ... }
  }
}
```

---

## 关键要点总结

### ✅ 必须做的事情

1. **每个函数必须返回数据**
   ```js
   async function getUser() {
     const res = await axios.get(url);
     return res.data;  // ⭐ 必须返回
   }
   ```

2. **主函数必须 return**
   ```js
   async function main() {
     const result = await someFunction();
     return result;  // ⭐ 必须返回
   }
   return main();  // ⭐ 必须 return
   ```

3. **使用 await 等待异步完成**
   ```js
   const user = await getUser();  // ⭐ 必须 await
   const posts = await getPosts(user.id);  // ⭐ 依次执行
   ```

4. **添加错误处理**
   ```js
   try {
     // 异步操作
   } catch (error) {
     return { success: false, error: error.message };
   }
   ```

### ❌ 不要做的事情

1. **不要忘记 return**
   ```js
   // ❌ 错误
   first();
   
   // ✅ 正确
   return first();
   ```

2. **不要使用未定义的变量**
   ```js
   // ❌ 错误
   qf_output = { res };
   
   // ✅ 正确
   return { res };
   ```

3. **不要忘记 await**
   ```js
   // ❌ 错误（没有等待完成）
   getUser();
   getPosts();
   
   // ✅ 正确（依次等待）
   const user = await getUser();
   const posts = await getPosts(user.id);
   ```

---

# JS 执行服务 xlsx 测试示例集

## 1. xlsx 读取 Excel 文件（基础用法）

```js
const xlsx = require("xlsx");

async function readExcelBasic() {
  // 假设从 fetch 或 axios 获取 Excel 文件
  const response = await fetch("https://example.com/data.xlsx");
  const buffer = Buffer.from(await response.arrayBuffer());
  
  let workbook;  // ⭐ 在 try 外部声明
  try {
    // 读取 workbook
    workbook = xlsx.read(buffer);
    
    // 获取第一个 sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 转换为 JSON
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      sheetName: sheetName,
      rowCount: data.length,
      data: data
    };
  } finally {
    // ⭐ 重要：必须调用 close() 释放资源
    if (workbook) {
      workbook.close();
    }
  }
}
return readExcelBasic();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "sheetName": "Sheet1",
    "rowCount": 100,
    "data": [
      { "姓名": "张三", "年龄": 25, "城市": "北京" },
      { "姓名": "李四", "年龄": 30, "城市": "上海" },
      ...
    ]
  }
}
```

---

## 2. xlsx 支持的输入类型（4 种方式）⭐

xlsx 模块支持多种输入类型，您可以根据数据来源选择最方便的方式。

### 📋 输入类型对比表

| 输入类型 | 数据来源 | 是否需要转换 | 推荐度 | 性能 | 说明 |
|---------|---------|------------|--------|------|------|
| **ArrayBuffer** | axios/fetch 下载 | ❌ 不需要 | ⭐⭐⭐⭐⭐ | 最快 | 最简洁，无需转换 |
| **Node.js Buffer** | 传统写法/input | ⚠️ 可能需要 | ⭐⭐⭐⭐ | 快 | 兼容性最好 |
| **Uint8Array** | 二进制处理 | ❌ 不需要 | ⭐⭐⭐ | 快 | 适合TypedArray操作 |
| **Base64 字符串** | input 参数传入 | ✅ 需要 | ⭐⭐⭐ | 一般 | 适合跨系统传输 |

### 🎯 推荐用法速查

```js
// ✅ 最佳实践（axios + ArrayBuffer）⭐ 推荐
const response = await axios.get(url, { responseType: 'arraybuffer' });
const workbook = xlsx.read(response.data);  // 直接使用，无需转换

// ✅ 传统写法（axios + Buffer）
const response = await axios.get(url, { responseType: 'arraybuffer' });
const buffer = Buffer.from(response.data);  // 额外转换（非必须）
const workbook = xlsx.read(buffer);

// ✅ fetch 写法
const response = await fetch(url);
const arrayBuffer = await response.arrayBuffer();
const workbook = xlsx.read(arrayBuffer);  // 直接使用

// ✅ Base64 转换（input 传入）
const buffer = Buffer.from(input.buffer, 'base64');
const workbook = xlsx.read(buffer);
```

---

### ✅ 方式 1：ArrayBuffer（推荐 ⭐ 最简洁）

**适用场景**: axios 或 fetch 下载 Excel 文件

**优点**: 
- ✅ 无需转换，一步到位
- ✅ 性能最好（少一次内存复制）
- ✅ 代码最简洁
- ✅ 内存占用最小

#### 1.1 axios + ArrayBuffer（推荐写法）

```js
const axios = require("axios");
const xlsx = require("xlsx");

async function readExcelFromUrl_Best() {
  let workbook;
  try {
    // ⭐ 使用 responseType: 'arraybuffer'
    const response = await axios.get("https://example.com/data.xlsx", {
      responseType: "arraybuffer"  // 关键配置
    });
    
    // ⭐ 直接传入 response.data，无需 Buffer.from() 转换
    workbook = xlsx.read(response.data);  // ✅ 最简洁的写法
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      method: "ArrayBuffer (axios)",
      rowCount: data.length,
      data: data.slice(0, 5)
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromUrl_Best();
```

#### 1.2 fetch + ArrayBuffer

```js
const xlsx = require("xlsx");

async function readExcelFromUrl_Fetch() {
  let workbook;
  try {
    const response = await fetch("https://example.com/data.xlsx");
    const arrayBuffer = await response.arrayBuffer();
    
    // ⭐ 直接传入 arrayBuffer
    workbook = xlsx.read(arrayBuffer);  // ✅ 无需 Buffer.from()
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      method: "ArrayBuffer (fetch)",
      rowCount: data.length,
      data: data.slice(0, 5)
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromUrl_Fetch();
```

---

### ✅ 方式 2：Node.js Buffer（传统写法）

**适用场景**: 
- 需要对二进制数据进行额外处理
- 兼容旧代码
- 从 Base64 转换

```js
const axios = require("axios");
const xlsx = require("xlsx");

async function readExcelFromUrl_Buffer() {
  let workbook;
  try {
    const response = await axios.get("https://example.com/data.xlsx", {
      responseType: "arraybuffer"
    });
    
    // 转换为 Buffer（可选，实际上不是必需的）
    const buffer = Buffer.from(response.data);
    
    workbook = xlsx.read(buffer);  // ✅ 也支持 Buffer
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      method: "Node.js Buffer",
      rowCount: data.length,
      data: data.slice(0, 5)
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromUrl_Buffer();
```

**注意**: `Buffer.from(response.data)` 这一步实际上是可选的，因为 `response.data` 已经是 ArrayBuffer，可以直接传给 `xlsx.read()`。

---

### ✅ 方式 3：Uint8Array（TypedArray）

**适用场景**: 
- 需要对二进制数据进行位操作
- 与其他二进制 API 集成

```js
const xlsx = require("xlsx");

function readExcelFromUint8Array() {
  let workbook;
  try {
    // 假设从某处获得 Uint8Array
    const uint8Array = new Uint8Array([...]); // 实际二进制数据
    
    // ⭐ 直接传入 Uint8Array
    workbook = xlsx.read(uint8Array);  // ✅ 支持 TypedArray
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      method: "Uint8Array",
      rowCount: data.length,
      data: data
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromUint8Array();
```

---

### ✅ 方式 4：从 URL 下载 Excel 文件（使用 fetch）

```js
const xlsx = require("xlsx");

async function readExcelFromUrl() {
  // 从 URL 下载 Excel 文件
  const url = "https://example.com/data.xlsx";
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  
  let workbook;
  try {
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      rowCount: data.length,
      data: data
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromUrl();
```

---

### 方式 2：从 URL 下载 Excel 文件（使用 axios）

```js
const axios = require("axios");
const xlsx = require("xlsx");

async function readExcelFromUrlAxios() {
  // 使用 axios 下载，responseType 必须设置为 'arraybuffer'
  const response = await axios.get("https://example.com/data.xlsx", {
    responseType: "arraybuffer"
  });
  
  // 将 arrayBuffer 转换为 Buffer
  const buffer = Buffer.from(response.data);
  
  let workbook;
  try {
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      rowCount: data.length,
      data: data
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromUrlAxios();
```

---

### 方式 3：从 input 参数获取（外部传入）

```js
const xlsx = require("xlsx");

// 假设外部通过 input.buffer 传入 Buffer
// input.buffer 可能是：
// - Base64 编码的字符串
// - Buffer 对象
// - ArrayBuffer

async function readExcelFromInput() {
  let buffer;
  
  // 判断 input.buffer 的类型并转换
  if (typeof input.buffer === 'string') {
    // 如果是 Base64 字符串
    buffer = Buffer.from(input.buffer, 'base64');
  } else if (input.buffer instanceof ArrayBuffer) {
    // 如果是 ArrayBuffer
    buffer = Buffer.from(input.buffer);
  } else {
    // 如果已经是 Buffer
    buffer = input.buffer;
  }
  
  let workbook;
  try {
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      rowCount: data.length,
      sample: data.slice(0, 3)
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromInput();
```

**调用示例（外部传入）：**

```json
{
  "buffer": "UEsDBBQABgAIAAAAIQBi7p1o...(Base64编码的Excel文件)"
}
```

---

### 方式 4：从 OSS/云存储下载（完整示例）

```js
const axios = require("axios");
const xlsx = require("xlsx");

async function readExcelFromOSS() {
  // 从华为云 OBS 下载 Excel 文件
  const ossUrl = "https://qingliu-obs.obs.cn-north-1.myhuaweicloud.com/documents/data/invite/13569E7/afff4c5a-b13e-48dc-acac-31d95d193c38.xlsx";
  
  let workbook;
  try {
    // 下载文件
    const response = await axios.get(ossUrl, {
      responseType: "arraybuffer",
      timeout: 30000  // 30秒超时
    });
    
    // 转换为 Buffer
    const buffer = Buffer.from(response.data);
    
    // 读取 Excel
    workbook = xlsx.read(buffer);
    
    // 获取所有 sheet 名称
    const sheetNames = workbook.SheetNames;
    
    // 读取第一个 sheet
    const sheet = workbook.Sheets[sheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      sheetNames: sheetNames,
      firstSheetName: sheetNames[0],
      rowCount: data.length,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
      sample: data.slice(0, 5)  // 返回前 5 行
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return readExcelFromOSS();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "sheetNames": ["Sheet1", "Sheet2"],
    "firstSheetName": "Sheet1",
    "rowCount": 100,
    "columns": ["姓名", "年龄", "城市", "部门"],
    "sample": [
      { "姓名": "张三", "年龄": 25, "城市": "北京", "部门": "技术部" },
      { "姓名": "李四", "年龄": 30, "城市": "上海", "部门": "市场部" },
      ...
    ]
  }
}
```

---

### 方式 5：读取多个 Sheet

```js
const xlsx = require("xlsx");

async function readMultipleSheets() {
  // 从 URL 下载
  const response = await fetch("https://example.com/data.xlsx");
  const buffer = Buffer.from(await response.arrayBuffer());
  
  let workbook;
  try {
    workbook = xlsx.read(buffer);
    
    const result = {};
    
    // 遍历所有 sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      result[sheetName] = {
        rowCount: data.length,
        data: data
      };
    }
    
    return {
      success: true,
      totalSheets: workbook.SheetNames.length,
      sheets: result
    };
  } finally {
    if (workbook) {
      workbook.close();
    }
  }
}
return readMultipleSheets();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "totalSheets": 3,
    "sheets": {
      "Sheet1": { "rowCount": 100, "data": [...] },
      "Sheet2": { "rowCount": 50, "data": [...] },
      "Sheet3": { "rowCount": 75, "data": [...] }
    }
  }
}
```

---

## 3. xlsx 读取为数组格式（不使用 header）

```js
const xlsx = require("xlsx");

function readAsArray(buffer) {
  let workbook;
  try {
    workbook = xlsx.read(buffer);
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // 使用 header: 1 参数，返回数组格式
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    return {
      success: true,
      headers: data[0],  // 第一行作为 header
      rows: data.slice(1)  // 剩余行作为数据
    };
  } finally {
    if (workbook) {
      workbook.close();
    }
  }
}
return readAsArray(input.buffer);
```

期望输出：

```json
{
  "result": {
    "success": true,
    "headers": ["姓名", "年龄", "城市"],
    "rows": [
      ["张三", 25, "北京"],
      ["李四", 30, "上海"],
      ["王五", 28, "深圳"]
    ]
  }
}
```

---

## 4. xlsx 创建新 Excel 文件（返回 Buffer）

**重要说明：** 
- ⭐ `xlsx.write()` 创建的是 **Buffer 对象**（内存中的二进制数据）
- ⭐ **不会保存到文件系统**，只存在于内存中
- ⭐ 需要通过其他方式（如上传到 OSS、返回给前端等）来保存或传输

```js
const xlsx = require("xlsx");

function createExcel() {
  let workbook;
  try {
    // 创建新 workbook
    workbook = xlsx.utils.book_new();
    
    // 准备数据
    const data = [
      { 姓名: "张三", 年龄: 25, 城市: "北京" },
      { 姓名: "李四", 年龄: 30, 城市: "上海" },
      { 姓名: "王五", 年龄: 28, 城市: "深圳" }
    ];
    
    // 将 JSON 转换为 sheet
    const sheet = xlsx.utils.json_to_sheet(data);
    
    // 添加 sheet 到 workbook
    xlsx.utils.book_append_sheet(workbook, sheet, "员工信息");
    
    // ⭐ 写入 Buffer（内存中的二进制数据）
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    // ⭐ Buffer 可以：
    // 1. 转换为 Base64 返回给前端
    // 2. 通过 API 上传到 OSS/云存储
    // 3. 通过 HTTP 响应返回（如果支持）
    
    return {
      success: true,
      message: "Excel 文件创建成功",
      size: buffer.length,
      // 选项 1: 返回 Base64（前端可以下载）
      base64: buffer.toString('base64')
    };
  } finally {
    if (workbook) {
      workbook.close();
    }
  }
}
return createExcel();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "Excel 文件创建成功",
    "size": 5432,
    "base64": "UEsDBBQABgAIAAAAIQBi7p1o..."
  }
}
```

---

## 4.1 创建后如何使用 Buffer？

### 方式 1：返回 Base64 给前端（推荐）

```js
const xlsx = require("xlsx");

function createExcelForDownload() {
  let workbook;
  try {
    workbook = xlsx.utils.book_new();
    
    const data = [
      { 姓名: "张三", 年龄: 25, 城市: "北京" },
      { 姓名: "李四", 年龄: 30, 城市: "上海" }
    ];
    
    const sheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, sheet, "员工信息");
    
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    // 转换为 Base64，前端可以直接下载
    return {
      success: true,
      fileName: "员工信息.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      base64: buffer.toString('base64'),
      size: buffer.length
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return createExcelForDownload();
```

**前端使用示例（JavaScript）：**

```javascript
// 调用您的 API 获取结果
const result = await callYourAPI();

// 将 Base64 转换为 Blob
const byteCharacters = atob(result.base64);
const byteNumbers = new Array(byteCharacters.length);
for (let i = 0; i < byteCharacters.length; i++) {
  byteNumbers[i] = byteCharacters.charCodeAt(i);
}
const byteArray = new Uint8Array(byteNumbers);
const blob = new Blob([byteArray], { type: result.mimeType });

// 创建下载链接
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = result.fileName;
a.click();
URL.revokeObjectURL(url);
```

---

### 方式 2：上传到 OSS/云存储

```js
const axios = require("axios");
const xlsx = require("xlsx");

async function createAndUploadToOSS() {
  let workbook;
  try {
    // 创建 Excel
    workbook = xlsx.utils.book_new();
    
    const data = [
      { 姓名: "张三", 年龄: 25 },
      { 姓名: "李四", 年龄: 30 }
    ];
    
    const sheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, sheet, "数据");
    
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    // 上传到 OSS（假设已获取上传 URL）
    const uploadUrl = "https://your-oss.com/upload-url";
    
    const uploadResponse = await axios.put(uploadUrl, buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    });
    
    return {
      success: true,
      message: "Excel 已上传到 OSS",
      ossUrl: uploadUrl.split('?')[0],  // 去除签名参数
      size: buffer.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return createAndUploadToOSS();
```

---

### 方式 3：通过 POST 请求发送

```js
const axios = require("axios");
const xlsx = require("xlsx");

async function createAndSendViaAPI() {
  let workbook;
  try {
    // 创建 Excel
    workbook = xlsx.utils.book_new();
    
    const data = [
      { 产品: "手机", 销量: 100 },
      { 产品: "电脑", 销量: 50 }
    ];
    
    const sheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, sheet, "销售数据");
    
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    // 通过 API 发送（例如：发送邮件附件）
    const response = await axios.post("https://api.example.com/send-email", {
      to: "user@example.com",
      subject: "销售报表",
      attachment: {
        filename: "销售数据.xlsx",
        content: buffer.toString('base64'),
        encoding: 'base64'
      }
    });
    
    return {
      success: true,
      message: "Excel 已通过邮件发送",
      response: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return createAndSendViaAPI();
```

---

### 方式 4：创建后立即读取（测试用）

```js
const xlsx = require("xlsx");

function createAndReadBack() {
  let workbook;
  let newWorkbook;
  
  try {
    // 创建 Excel
    workbook = xlsx.utils.book_new();
    
    const data = [
      { 姓名: "张三", 年龄: 25 },
      { 姓名: "李四", 年龄: 30 }
    ];
    
    const sheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, sheet, "测试数据");
    
    // 写入 Buffer
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    // 立即读取回来验证
    newWorkbook = xlsx.read(buffer);
    const readSheet = newWorkbook.Sheets[newWorkbook.SheetNames[0]];
    const readData = xlsx.utils.sheet_to_json(readSheet);
    
    return {
      success: true,
      message: "创建并读取成功",
      originalData: data,
      readBackData: readData,
      matched: JSON.stringify(data) === JSON.stringify(readData)
    };
  } finally {
    if (workbook) workbook.close();
    if (newWorkbook) newWorkbook.close();
  }
}
return createAndReadBack();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "Excel 文件创建成功",
    "size": 5432
  }
}
```

---

## 5. xlsx 创建多 Sheet Excel

```js
const xlsx = require("xlsx");

function createMultiSheetExcel() {
  let workbook;
  try {
    workbook = xlsx.utils.book_new();
    
    // Sheet 1: 员工信息
    const employees = [
      { 姓名: "张三", 部门: "技术部", 薪资: 10000 },
      { 姓名: "李四", 部门: "市场部", 薪资: 8000 }
    ];
    const sheet1 = xlsx.utils.json_to_sheet(employees);
    xlsx.utils.book_append_sheet(workbook, sheet1, "员工信息");
    
    // Sheet 2: 部门统计
    const departments = [
      { 部门: "技术部", 人数: 50, 平均薪资: 12000 },
      { 部门: "市场部", 人数: 30, 平均薪资: 9000 }
    ];
    const sheet2 = xlsx.utils.json_to_sheet(departments);
    xlsx.utils.book_append_sheet(workbook, sheet2, "部门统计");
    
    // 写入 Buffer
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    return {
      success: true,
      sheets: workbook.SheetNames,
      size: buffer.length
    };
  } finally {
    if (workbook) {
      workbook.close();
    }
  }
}
return createMultiSheetExcel();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "sheets": ["员工信息", "部门统计"],
    "size": 6789
  }
}
```

---

## 6. xlsx 流式读取（大文件优化）

```js
const xlsx = require("xlsx");

async function readExcelStream(buffer) {
  const allRows = [];
  let totalProcessed = 0;
  
  // 流式读取，批量处理（默认每批 100 行）
  const result = xlsx.readStream(buffer, "Sheet1", (rows, startIndex) => {
    // rows 是一个数组，包含多行数据
    totalProcessed += rows.length;
    
    // 处理这一批数据
    rows.forEach(row => {
      allRows.push(row);
    });
    
    console.log(`已处理 ${totalProcessed} 行数据`);
  });
  
  return {
    success: result.success,
    totalRows: result.rowsProcessed,
    batchSize: result.batchSize,
    sample: allRows.slice(0, 3)  // 返回前 3 行作为示例
  };
}
return readExcelStream(input.buffer);
```

期望输出：

```json
{
  "result": {
    "success": true,
    "totalRows": 10000,
    "batchSize": 100,
    "sample": [
      { "姓名": "张三", "年龄": 25 },
      { "姓名": "李四", "年龄": 30 },
      { "姓名": "王五", "年龄": 28 }
    ]
  }
}
```

---

## 7. xlsx 流式读取（自定义批次大小）

```js
const xlsx = require("xlsx");

async function readExcelLargeBatch(buffer) {
  let totalRows = 0;
  const summary = [];
  
  // 自定义批次大小为 500 行
  const result = xlsx.readStream(buffer, "Sheet1", (rows, startIndex) => {
    totalRows += rows.length;
    
    // 统计每批数据
    summary.push({
      batchIndex: Math.floor(startIndex / 500),
      startRow: startIndex,
      rowCount: rows.length
    });
  }, { batchSize: 500 });
  
  return {
    success: true,
    totalRows: totalRows,
    batchSize: 500,
    batches: summary.length,
    batchSummary: summary
  };
}
return readExcelLargeBatch(input.buffer);
```

期望输出：

```json
{
  "result": {
    "success": true,
    "totalRows": 10000,
    "batchSize": 500,
    "batches": 20,
    "batchSummary": [
      { "batchIndex": 0, "startRow": 1, "rowCount": 500 },
      { "batchIndex": 1, "startRow": 501, "rowCount": 500 },
      ...
    ]
  }
}
```

---

## 8. xlsx 分批读取（readBatches）

```js
const xlsx = require("xlsx");

async function readExcelBatches(buffer) {
  const batches = [];
  
  const result = xlsx.readBatches(buffer, "Sheet1", { batchSize: 1000 }, (batch, batchIndex) => {
    // 处理每一批数据
    batches.push({
      index: batchIndex,
      rowCount: batch.length,
      firstRow: batch[0],
      lastRow: batch[batch.length - 1]
    });
  });
  
  return {
    success: result.success,
    totalRows: result.totalRows,
    totalBatches: result.totalBatches,
    batchInfo: batches
  };
}
return readExcelBatches(input.buffer);
```

期望输出：

```json
{
  "result": {
    "success": true,
    "totalRows": 5000,
    "totalBatches": 5,
    "batchInfo": [
      { "index": 0, "rowCount": 1000, "firstRow": {...}, "lastRow": {...} },
      { "index": 1, "rowCount": 1000, "firstRow": {...}, "lastRow": {...} },
      ...
    ]
  }
}
```

---

## 9. xlsx 流式写入（大量数据导出）

```js
const xlsx = require("xlsx");

function writeExcelStream() {
  // 创建流式写入器
  const stream = xlsx.createWriteStream();
  
  // 添加 sheet
  stream.addSheet("大量数据");
  
  // 写入 header
  stream.writeRow(["编号", "姓名", "分数", "等级"]);
  
  // 逐行写入数据（模拟大量数据）
  for (let i = 1; i <= 10000; i++) {
    stream.writeRow([
      i,
      `学生${i}`,
      Math.floor(Math.random() * 100),
      i % 3 === 0 ? "A" : "B"
    ]);
  }
  
  // 完成写入，获取 Buffer
  const buffer = stream.finalize();
  
  return {
    success: true,
    message: "流式写入完成",
    rowsWritten: 10000,
    size: buffer.length
  };
}
return writeExcelStream();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "message": "流式写入完成",
    "rowsWritten": 10000,
    "size": 245678
  }
}
```

---

## 10. xlsx 数据过滤和处理

```js
const xlsx = require("xlsx");

async function filterExcelData(buffer) {
  let workbook;
  let newWorkbook;
  
  try {
    workbook = xlsx.read(buffer);
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // 数据过滤和处理
    const filtered = data
      .filter(row => row.年龄 >= 25 && row.年龄 <= 35)
      .map(row => ({
        姓名: row.姓名,
        年龄: row.年龄,
        分类: row.年龄 < 30 ? "青年" : "中年"
      }));
    
    // 创建新 workbook
    newWorkbook = xlsx.utils.book_new();
    const newSheet = xlsx.utils.json_to_sheet(filtered);
    xlsx.utils.book_append_sheet(newWorkbook, newSheet, "筛选结果");
    
    // 写入 Buffer
    const outputBuffer = xlsx.write(newWorkbook, { type: "buffer" });
    
    return {
      success: true,
      originalCount: data.length,
      filteredCount: filtered.length,
      sample: filtered.slice(0, 3)
    };
  } finally {
    if (workbook) {
      workbook.close();
    }
    if (newWorkbook) {
      newWorkbook.close();
    }
  }
}
return filterExcelData(input.buffer);
```

期望输出：

```json
{
  "result": {
    "success": true,
    "originalCount": 1000,
    "filteredCount": 350,
    "sample": [
      { "姓名": "张三", "年龄": 25, "分类": "青年" },
      { "姓名": "李四", "年龄": 30, "分类": "中年" },
      { "姓名": "王五", "年龄": 28, "分类": "青年" }
    ]
  }
}
```

---

## 11. xlsx 与 axios 集成（下载 Excel）

```js
const axios = require("axios");
const xlsx = require("xlsx");

async function downloadAndParseExcel() {
  let workbook;
  
  try {
    // 下载 Excel 文件
    const response = await axios.get("https://example.com/data.xlsx", {
      responseType: "arraybuffer"
    });
    
    // 转换为 Buffer
    const buffer = Buffer.from(response.data);
    
    // 解析 Excel
    workbook = xlsx.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    return {
      success: true,
      status: response.status,
      dataCount: data.length,
      data: data.slice(0, 5)  // 返回前 5 条
    };
  } catch (error) {
    throw new Error("下载或解析失败: " + error.message);
  } finally {
    if (workbook) {
      workbook.close();
    }
  }
}
return downloadAndParseExcel();
```

期望输出：

```json
{
  "result": {
    "success": true,
    "status": 200,
    "dataCount": 500,
    "data": [
      { "产品": "手机", "销量": 100, "金额": 50000 },
      { "产品": "电脑", "销量": 50, "金额": 80000 },
      ...
    ]
  }
}
```

---

## 12. xlsx 错误处理和资源管理

```js
const xlsx = require("xlsx");

async function safeReadExcel(buffer) {
  let workbook;
  
  try {
    // 读取 Excel
    workbook = xlsx.read(buffer);
    
    // 检查是否有数据
    if (workbook.SheetNames.length === 0) {
      throw new Error("Excel 文件中没有工作表");
    }
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // 数据验证
    if (data.length === 0) {
      throw new Error("工作表中没有数据");
    }
    
    return {
      success: true,
      sheetName: sheetName,
      rowCount: data.length,
      columns: Object.keys(data[0]),
      sample: data[0]
    };
    
  } catch (error) {
    // 错误处理
    return {
      success: false,
      error: error.message,
      errorType: error.name
    };
    
  } finally {
    // ⭐ 确保资源被释放（无论成功还是失败）
    if (workbook) {
      workbook.close();
    }
  }
}
return safeReadExcel(input.buffer);
```

期望输出（成功）：

```json
{
  "result": {
    "success": true,
    "sheetName": "Sheet1",
    "rowCount": 100,
    "columns": ["姓名", "年龄", "城市"],
    "sample": { "姓名": "张三", "年龄": 25, "城市": "北京" }
  }
}
```

期望输出（失败）：

```json
{
  "result": {
    "success": false,
    "error": "Excel 文件中没有工作表",
    "errorType": "Error"
  }
}
```

---

## xlsx 常用 API 说明

| API | 说明 | 示例 |
|-----|------|------|
| `xlsx.read(buffer)` | 读取 Excel 文件 | `const wb = xlsx.read(buffer)` |
| `xlsx.write(workbook, options)` | 写入 Excel 文件 | `xlsx.write(wb, { type: 'buffer' })` |
| `xlsx.utils.sheet_to_json(sheet, opts)` | Sheet 转 JSON | `xlsx.utils.sheet_to_json(sheet)` |
| `xlsx.utils.json_to_sheet(data)` | JSON 转 Sheet | `xlsx.utils.json_to_sheet(data)` |
| `xlsx.utils.book_new()` | 创建新 workbook | `const wb = xlsx.utils.book_new()` |
| `xlsx.utils.book_append_sheet(wb, ws, name)` | 添加 Sheet | `xlsx.utils.book_append_sheet(wb, ws, 'Sheet1')` |
| `xlsx.readStream(buffer, sheet, callback, opts)` | 流式读取 | `xlsx.readStream(buffer, 'Sheet1', fn)` |
| `xlsx.readBatches(buffer, sheet, opts, callback)` | 分批读取 | `xlsx.readBatches(buffer, 'Sheet1', {}, fn)` |
| `xlsx.createWriteStream()` | 创建写入流 | `const stream = xlsx.createWriteStream()` |
| `workbook.close()` | 释放资源 | `workbook.close()` ⭐ **必须调用** |

---

## xlsx 性能特点

| 特性 | 基础 API | 流式 API |
|------|---------|---------|
| **读取速度** | 55K+ 行/秒 | 55K+ 行/秒 |
| **写入速度** | 17K+ 行/秒 | 17K+ 行/秒 |
| **内存占用** | 一次性加载全部 | 批量处理，降低 80% |
| **适用场景** | 小文件（< 10K 行） | 大文件（> 10K 行） |
| **使用难度** | 简单 | 中等 |

---

## xlsx 最佳实践

### 1. 资源管理（⭐ 重要）

```js
// ✅ 正确：使用 try-finally 确保资源释放
let workbook;  // 在 try 外部声明
try {
  workbook = xlsx.read(buffer);
  // 处理数据...
  return result;
} finally {
  if (workbook) {  // 检查是否已初始化
    workbook.close();  // 必须调用
  }
}

// ❌ 错误：忘记调用 close()，会导致内存泄漏
const workbook = xlsx.read(buffer);
const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
return data;  // 资源未释放！
```

### 2. 大文件处理

```js
// ✅ 对于大文件（> 10K 行），使用流式 API
xlsx.readStream(buffer, 'Sheet1', (rows, startIndex) => {
  // 批量处理
}, { batchSize: 500 });

// ❌ 小文件也用流式会增加复杂度
let workbook;
try {
  workbook = xlsx.read(buffer);  // 小文件直接读取即可
  // 处理数据...
} finally {
  if (workbook) workbook.close();
}
```

### 3. 错误处理

```js
// ✅ 完整的错误处理
let workbook;
try {
  workbook = xlsx.read(buffer);
  // ... 处理
  return result;
} catch (error) {
  throw new Error("Excel 处理失败: " + error.message);
} finally {
  if (workbook) {
    workbook.close();
  }
}

// ❌ 没有错误处理和资源管理
const workbook = xlsx.read(buffer);  // 文件损坏时会崩溃，且资源未释放
```

---

## xlsx 与其他库对比

| 特性 | xlsx (本项目) | SheetJS/xlsx | ExcelJS |
|------|--------------|--------------|---------|
| 底层实现 | Go excelize | JavaScript | JavaScript |
| 读取性能 | ⭐⭐⭐⭐⭐ 55K+ 行/秒 | ⭐⭐⭐ 20K 行/秒 | ⭐⭐⭐ 15K 行/秒 |
| 写入性能 | ⭐⭐⭐⭐⭐ 17K+ 行/秒 | ⭐⭐⭐ 8K 行/秒 | ⭐⭐⭐ 10K 行/秒 |
| 内存占用 | ⭐⭐⭐⭐⭐ 低 | ⭐⭐⭐ 中等 | ⭐⭐⭐ 中等 |
| 流式处理 | ✅ 支持 | ❌ 不支持 | ✅ 支持 |
| API 兼容 | ✅ SheetJS 兼容 | ✅ 标准 API | ❌ 独立 API |

**推荐使用场景：**

* **小文件（< 1K 行）** → 使用基础 API（`xlsx.read` + `sheet_to_json`）
* **中等文件（1K-10K 行）** → 使用基础 API 或流式 API
* **大文件（> 10K 行）** → 使用流式 API（`readStream`、`readBatches`）
* **超大文件导出（> 10K 行）** → 使用流式写入（`createWriteStream`）
* **资源受限环境** → 优先使用流式 API，降低内存占用

---


