# Flow-codeblock 帮助文档

## 📖 文档导航

- [功能简介](#功能简介)
- [支持模块](#支持模块)
- [代码编写规则](#代码编写规则)
- [效果展示](#效果展示)
- [注意事项](#注意事项)

---

## 🎯 功能简介

Flow-codeblock 是一个**高性能的 JavaScript 代码执行服务**，基于 Go + goja 实现，提供安全、稳定的代码运行环境。

### 核心特性

- ✅ **高性能**：基于 Go 原生实现，执行速度快（简单计算 < 5ms）
- ✅ **安全沙箱**：5 层安全防护机制，完全隔离的运行环境
- ✅ **丰富模块**：内置 axios、xlsx、crypto、lodash 等常用库
- ✅ **异步支持**：完整支持 Promise、async/await、fetch 等异步操作
- ✅ **智能并发**：根据服务器内存自动计算最佳并发数（100-2000）
- ✅ **流式处理**：支持大文件流式读写，内存占用降低 80%

### 适用场景

| 场景 | 说明 | 示例 |
|------|------|------|
| **数据处理** | JSON 数据转换、过滤、聚合 | 订单数据统计、用户信息筛选 |
| **HTTP 请求** | 调用外部 API 获取数据 | 获取天气信息、调用第三方服务 |
| **Excel 处理** | 读取、解析、生成 Excel 文件 | 报表生成、数据导入导出 |
| **数据加密** | 加密、解密、签名、验证 | 密码加密、API 签名 |
| **业务流程** | 复杂的业务逻辑串联 | 登录→查询→处理→上传 |

---

## 📦 支持模块

### 🔥 无需 require（直接使用）

这些模块已经全局可用，直接调用即可：

| 模块 | 说明 | 使用示例 |
|------|------|---------|
| **fetch** | HTTP 请求（Web 标准） | `await fetch('https://api.example.com')` |
| **Buffer** | 二进制数据处理 | `Buffer.from('hello').toString('base64')` |
| **FormData** | 表单数据（Web 标准） | `new FormData()` |
| **URL** | URL 解析（Web 标准）| `new URL('https://example.com/path?a=1')` |
| **URLSearchParams** | 查询参数解析 | `new URLSearchParams('a=1&b=2')` |
| **Headers** | HTTP Headers 对象 | `new Headers({ 'Content-Type': 'application/json' })` |
| **Request** | HTTP Request 对象 | `new Request(url, { method: 'POST' })` |
| **Blob/File** | 文件对象 | `new Blob([data])` |
| **AbortController** | 请求取消控制器 | `new AbortController()` |

### 📚 需要 require 的模块

这些模块需要显式引入：

| 模块 | 说明 | 引入方式 |
|------|------|---------|
| **axios** | HTTP 客户端库 | `const axios = require('axios');` |
| **xlsx** | Excel 文件处理（Go 原生实现） | `const xlsx = require('xlsx');` |
| **crypto** | 加密算法（77+ 种） | `const crypto = require('crypto');` |
| **lodash** | JavaScript 工具库（300+ 函数） | `const _ = require('lodash');` |
| **date-fns** | 日期处理库（200+ 函数） | `const dateFns = require('date-fns');` |
| **qs** | 查询字符串解析 | `const qs = require('qs');` |
| **uuid** | UUID 生成器 | `const uuid = require('uuid');` |
| **form-data** | Node.js FormData（配合 axios） | `const FormData = require('form-data');` |

### ⚠️ 限制说明

| 模块 | 状态 | 原因 | 替代方案 |
|------|------|------|---------|
| **console** | ⚠️ 生产环境禁用 | 安全限制 | 使用 `return` 返回调试信息 |
| **url** | ⚠️ 部分支持 | 仅支持 Web 标准 | ✅ 使用 `new URL()` 代替 `url.parse()` |
| **fs** | ❌ 禁用 | 文件系统访问 | 使用 fetch 下载，返回 Base64 |
| **path** | ❌ 禁用 | 文件路径操作 | 使用字符串操作 |
| **child_process** | ❌ 禁用 | 系统命令执行 | 无替代方案 |
| **os** | ❌ 禁用 | 系统信息访问 | 无替代方案 |
| **eval/Function** | ❌ 禁用 | 代码注入风险 | 无替代方案 |

---

## 📝 代码编写规则

### 1. 必须使用 return ⭐

**所有代码必须通过 `return` 返回结果**，缺少 return 会报错。

```javascript
// ✅ 正确：返回结果
return { result: 100 };

// ✅ 正确：返回异步结果
async function main() {
  const data = await fetch('https://api.example.com').then(r => r.json());
  return data;
}
return main();

// ❌ 错误：没有 return
let result = 100;  // 不会返回任何结果

// ❌ 错误：返回 undefined
return undefined;  // 报错：返回值不能是 undefined
```

### 2. 异步操作必须 await ⭐

Promise 必须等待完成，否则会返回 undefined。

```javascript
// ✅ 正确：等待异步完成
async function main() {
  const response = await fetch('https://api.example.com/data');
  const data = await response.json();
  return data;
}
return main();

// ❌ 错误：没有 await，Promise 被忽略
fetch('https://api.example.com/data').then(r => r.json());
return;  // 返回 undefined
```

### 3. 资源必须释放 ⭐

使用 Excel 等资源后必须调用 `close()` 释放。

```javascript
// ✅ 正确：使用 try-finally 确保释放
const xlsx = require('xlsx');

async function main() {
  const response = await fetch('https://example.com/data.xlsx');
  const buffer = Buffer.from(await response.arrayBuffer());
  
  const workbook = xlsx.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  // 手动释放资源（推荐）
  if (workbook && typeof workbook.close === 'function') {
    workbook.close();
  }
  
  return { success: true, rowCount: data.length, data };
}
return main();

// ✅ 也可以：不调用 close（有 GC 自动清理）
const workbook = xlsx.read(buffer);
return xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
```

### 4. 禁用 console ⚠️

生产环境默认禁用 console，使用 return 代替。

```javascript
// ❌ 错误：生产环境报错 "console is not defined"
console.log("调试信息");

// ✅ 正确：通过 return 返回调试信息
return {
  debug: "这是调试信息",
  result: data
};
```

### 5. 错误处理

建议使用 try-catch 处理可能的错误。

```javascript
// ✅ 推荐：使用 try-catch
async function main() {
  try {
    const data = await fetch('https://api.example.com/data').then(r => r.json());
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
return main();

// ⚠️ 不推荐：直接抛出错误（会被服务捕获）
const data = await fetch('https://api.example.com/data').then(r => r.json());
return data;  // 如果失败，返回错误对象
```

### 6. 模块引入

需要的模块必须显式 require，除了全局可用的模块。

```javascript
// ✅ 正确：require 需要的模块
const axios = require('axios');
const xlsx = require('xlsx');
const _ = require('lodash');

// ✅ 正确：全局模块无需 require
const data = await fetch(url);  // fetch 无需 require
const buffer = Buffer.from([1, 2, 3]);  // Buffer 无需 require
const formData = new FormData();  // FormData 无需 require

// ❌ 错误：使用了未 require 的模块
const data = _.groupBy(users, 'age');  // ReferenceError: _ is not defined
```

---

## 🎬 效果展示

### 示例 1：基础计算

**代码：**
```javascript
return {
  sum: input.a + input.b,
  product: input.a * input.b,
  message: `计算完成: ${input.a} + ${input.b} = ${input.a + input.b}`
};
```

**输入 (input)：**
```json
{
  "a": 10,
  "b": 20
}
```

**输出 (result)：**
```json
{
  "sum": 30,
  "product": 200,
  "message": "计算完成: 10 + 20 = 30"
}
```

---

### 示例 2：HTTP 请求（fetch）

**代码：**
```javascript
async function main() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
  const data = await response.json();
  return {
    success: true,
    data: data
  };
}
return main();
```

**输出：**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "id": 1,
    "title": "delectus aut autem",
    "completed": false
  }
}
```

---

### 示例 3：HTTP 请求（axios）

**代码：**
```javascript
const axios = require('axios');

async function main() {
  try {
    const response = await axios.get('https://jsonplaceholder.typicode.com/users/1');
    return {
      success: true,
      userName: response.data.name,
      email: response.data.email
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();
```

**输出：**
```json
{
  "success": true,
  "userName": "Leanne Graham",
  "email": "Sincere@april.biz"
}
```

---

### 示例 4：多个接口依次调用

**代码：**
```javascript
const axios = require('axios');

async function main() {
  try {
    // 步骤 1: 获取用户信息
    const userResponse = await axios.get('https://jsonplaceholder.typicode.com/users/1');
    const userId = userResponse.data.id;
    
    // 步骤 2: 根据 userId 获取文章列表
    const postsResponse = await axios.get(`https://jsonplaceholder.typicode.com/posts?userId=${userId}`);
    
    // 步骤 3: 获取第一篇文章的评论
    const firstPostId = postsResponse.data[0].id;
    const commentsResponse = await axios.get(`https://jsonplaceholder.typicode.com/comments?postId=${firstPostId}`);
    
    return {
      success: true,
      userName: userResponse.data.name,
      postCount: postsResponse.data.length,
      firstPostTitle: postsResponse.data[0].title,
      commentCount: commentsResponse.data.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return main();
```

**输出：**
```json
{
  "success": true,
  "userName": "Leanne Graham",
  "postCount": 10,
  "firstPostTitle": "sunt aut facere repellat provident...",
  "commentCount": 5
}
```

---

### 示例 5：Excel 文件处理

**代码：**
```javascript
const axios = require('axios');
const xlsx = require('xlsx');

async function main() {
  let workbook;
  
  try {
    // 步骤 1: 下载 Excel 文件
    const response = await axios.get('https://example.com/data.xlsx', {
      responseType: 'arraybuffer'
    });
    
    // 步骤 2: 解析 Excel
    workbook = xlsx.read(response.data);  // ⭐ 直接使用 ArrayBuffer，无需转换
    
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    // 步骤 3: 数据处理
    const filtered = data.filter(row => row.年龄 >= 25);
    
    return {
      success: true,
      totalRows: data.length,
      filteredRows: filtered.length,
      sample: filtered.slice(0, 3)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (workbook) workbook.close();  // ⭐ 必须释放资源
  }
}
return main();
```

**输出：**
```json
{
  "success": true,
  "totalRows": 100,
  "filteredRows": 67,
  "sample": [
    { "姓名": "张三", "年龄": 25, "城市": "北京" },
    { "姓名": "李四", "年龄": 30, "城市": "上海" },
    { "姓名": "王五", "年龄": 28, "城市": "深圳" }
  ]
}
```

---

### 示例 6：创建 Excel 文件

**代码：**
```javascript
const xlsx = require('xlsx');

function main() {
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
    
    // 写入 Buffer（内存中）
    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
    
    // 转换为 Base64 返回（前端可以下载）
    return {
      success: true,
      fileName: "员工信息.xlsx",
      size: buffer.length,
      base64: buffer.toString('base64')
    };
  } finally {
    if (workbook) workbook.close();
  }
}
return main();
```

**输出：**
```json
{
  "success": true,
  "fileName": "员工信息.xlsx",
  "size": 5432,
  "base64": "UEsDBBQABgAIAAAAIQBi7p1o..."
}
```

---

### 示例 7：数据加密（SHA256）

**代码：**
```javascript
const crypto = require('crypto');

function main() {
  const data = "hello world";
  
  // SHA256 哈希
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  
  // HMAC 签名
  const hmac = crypto.createHmac('sha256', 'secret-key').update(data).digest('hex');
  
  return {
    success: true,
    original: data,
    sha256: hash,
    hmac: hmac
  };
}
return main();
```

**输出：**
```json
{
  "success": true,
  "original": "hello world",
  "sha256": "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
  "hmac": "734cc62f32841568f45715aeb9f4d7891324e6d948e4c6c60c0621cdac48623a"
}
```

---

### 示例 8：使用 lodash 处理数据

**代码：**
```javascript
const _ = require('lodash');

function main() {
  const users = [
    { name: "张三", age: 25, city: "北京" },
    { name: "李四", age: 30, city: "上海" },
    { name: "王五", age: 25, city: "北京" },
    { name: "赵六", age: 30, city: "深圳" }
  ];
  
  // 按年龄分组
  const groupedByAge = _.groupBy(users, 'age');
  
  // 按年龄排序
  const sortedByAge = _.sortBy(users, ['age', 'name']);
  
  // 提取特定字段
  const names = _.map(users, 'name');
  
  return {
    success: true,
    original: users,
    groupedByAge: groupedByAge,
    sortedByAge: sortedByAge,
    names: names
  };
}
return main();
```

**输出：**
```json
{
  "success": true,
  "original": [ ... ],
  "groupedByAge": {
    "25": [ { "name": "张三", "age": 25, ... }, { "name": "王五", "age": 25, ... } ],
    "30": [ { "name": "李四", "age": 30, ... }, { "name": "赵六", "age": 30, ... } ]
  },
  "sortedByAge": [ ... ],
  "names": ["张三", "李四", "王五", "赵六"]
}
```

---

## ⚠️ 注意事项

### 1. 必须遵守的规则 ⭐

| 规则 | 说明 | 后果 |
|------|------|------|
| **必须有 return** | 所有代码必须返回结果 | 报错：`代码中缺少 return 语句` |
| **异步必须 await** | Promise 必须等待完成 | 返回 undefined 或 Promise 对象 |
| **资源必须释放** | Excel 用完调用 `close()` | 内存泄漏，服务性能下降 |
| **禁用 console** | 生产环境不能用 console | 报错：`console is not defined` |
| **模块要 require** | 除全局模块外都需要 require | 报错：`xxx is not defined` |

### 2. URL 模块使用说明 ⚠️

`URL` 构造函数（全局可用）支持 Web 标准 API，但 `url` 模块只支持部分功能：

#### ✅ 支持的功能

```javascript
// 1. URL 构造函数（无需 require，推荐）⭐
const parsedUrl = new URL('https://example.com/path?query=1&name=test');

// 访问各种属性
const result = {
  href: parsedUrl.href,           // "https://example.com/path?query=1&name=test"
  protocol: parsedUrl.protocol,   // "https:"
  hostname: parsedUrl.hostname,   // "example.com"
  pathname: parsedUrl.pathname,   // "/path"
  search: parsedUrl.search,       // "?query=1&name=test"
  searchParams: parsedUrl.searchParams  // URLSearchParams 对象
};

// 2. URLSearchParams（无需 require）
const params = new URLSearchParams('query=1&name=test');
const query = params.get('query');  // "1"

// 3. url 模块的域名转换（需要 require）
const url = require('url');
const asciiDomain = url.domainToASCII('中文域名.com');    // "xn--fiq228c.com"
const unicodeDomain = url.domainToUnicode('xn--fiq228c.com'); // "中文域名.com"
```

#### ❌ 不支持的功能（Node.js 传统 API）

```javascript
const url = require('url');

// ❌ 以下方法都不支持
url.parse('https://example.com/path');     // 报错：Object has no member 'parse'
url.format({ protocol: 'https', host: 'example.com' }); // 不支持
url.resolve('https://example.com/', '/path');  // 不支持
```

#### 🔄 迁移方案

如果您习惯使用 `url.parse()`，请改用 `new URL()`：

```javascript
// ❌ 旧写法（不支持）
const url = require('url');
const parsed = url.parse('https://example.com/path?query=1');

// ✅ 新写法（推荐）
const parsed = new URL('https://example.com/path?query=1');

// 属性对照：
// parsed.protocol  → parsed.protocol
// parsed.hostname  → parsed.hostname
// parsed.pathname  → parsed.pathname
// parsed.search    → parsed.search
// parsed.query     → parsed.searchParams（需调用 .get()）
```

### 3. 常见错误及解决方案

#### 错误 1：console is not defined

```javascript
// ❌ 错误
console.log("调试信息");

// ✅ 解决方案
return {
  debug: "调试信息",
  result: data
};
```

#### 错误 2：返回值不能是 undefined

```javascript
// ❌ 错误
return undefined;

// ❌ 错误：没有 return
let result = 100;

// ✅ 解决方案
return { result: 100 };
return null;  // null 是允许的
```

#### 错误 3：xxx is not defined

```javascript
// ❌ 错误：未 require 模块
const data = _.groupBy(users, 'age');

// ✅ 解决方案
const _ = require('lodash');
const data = _.groupBy(users, 'age');
```

#### 错误 4：Promise 未等待

```javascript
// ❌ 错误：没有 await
fetch(url).then(r => r.json());
return;  // 返回 undefined

// ✅ 解决方案
const data = await fetch(url).then(r => r.json());
return data;
```

#### 错误 5：Excel 资源未释放

```javascript
// ❌ 错误：忘记 close()
const workbook = xlsx.read(buffer);
return xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
// 内存泄漏！

// ✅ 解决方案
let workbook;
try {
  workbook = xlsx.read(buffer);
  return xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);
} finally {
  if (workbook) workbook.close();
}
```

### 3. 性能优化建议

| 场景 | 建议 | 原因 |
|------|------|------|
| **小文件（< 1K 行）** | 使用基础 API | 简单直接，性能足够 |
| **大文件（> 10K 行）** | 使用流式 API | 内存占用降低 80% |
| **哈希/HMAC** | 使用 Go 原生 crypto | 性能比 crypto-js 快 5-10x |
| **小文件下载（< 1MB）** | fetch: `response.arrayBuffer()`<br>axios: `responseType: 'arraybuffer'` | 一次性读取，性能最佳 |
| **大文件下载（> 1MB）** | fetch: `response.body.getReader()`<br>axios: `responseType: 'stream'` + form-data | 流式读取，内存占用低 |
| **并发请求** | 使用 `Promise.all()` | 并行执行，提高效率 |

### 4. 限制和配额

#### 基础限制

| 限制项 | 默认值 | 说明 |
|--------|--------|------|
| **代码长度** | 64KB | 单次提交的代码最大长度 |
| **Input 大小** | 1MB | input 参数的最大大小 |
| **Result 大小** | 5MB | 返回结果的最大大小 |
| **执行超时** | 30秒 | 单次代码执行的最大时间 |
| **HTTP 超时** | 30秒 | 单个 fetch/axios 请求的最大时间 |

#### 下载限制（v2.3+）

| 限制项 | 默认值 | 适用场景 | 说明 |
|--------|--------|---------|------|
| **缓冲读取限制** | 1MB | `response.arrayBuffer()`<br>`response.blob()`<br>`response.text()`<br>`response.json()` | 一次性读取到内存的文件大小限制 |
| **流式读取限制** | 1MB* | `response.body.getReader()` | 流式读取的累计大小限制 |

**\* 注意**：流式读取默认支持 100MB，但当前环境配置为 1MB。可通过 `MAX_STREAMING_SIZE_MB` 调整。

#### 上传限制（v2.3+）

| 限制项 | 默认值 | 适用场景 | 说明 |
|--------|--------|---------|------|
| **缓冲上传限制** | 1MB | • Web FormData + Blob/File<br>• Node.js form-data + Buffer | 文件内容完整载入内存后上传 |
| **流式上传限制** | 5MB* | • Node.js form-data + Stream<br>• Node.js form-data + response.body | 流式上传（边下边传）的大小限制 |

**\* 注意**：流式上传默认支持 100MB，但当前环境配置为 5MB。可通过 `MAX_STREAMING_FORMDATA_MB` 调整。

#### 其他文件限制

| 限制项 | 默认值 | 说明 |
|--------|--------|------|
| **Excel 文件** | 无特殊限制 | 受下载/上传限制约束 |
| **Blob/File** | 无特殊限制 | 受下载/上传限制约束 |

#### CORS 访问控制（v2.3+）

| 访问方式 | 是否允许 | 说明 |
|---------|---------|------|
| **服务端调用** | ✅ 始终允许 | 后端 API（curl、Go、Python 等） |
| **同域前端** | ✅ 始终允许 | Origin 与服务器域名相同 |
| **白名单域名** | ✅ 可配置 | 通过 `ALLOWED_ORIGINS` 环境变量配置 |
| **其他跨域** | ❌ 拒绝 | 返回 403 Forbidden |

**配置示例**：
```bash
# 只允许服务端和同域调用（推荐）
ALLOWED_ORIGINS=

# 额外允许特定域名
ALLOWED_ORIGINS=https://your-frontend.com,https://admin.company.com
```

### 5. 安全限制

以下操作被**完全禁用**：

| 操作 | 原因 | 替代方案 |
|------|------|---------|
| `eval()` | 代码注入风险 | 无 |
| `Function()` | 代码注入风险 | 无 |
| `fs` 模块 | 文件系统访问 | 使用 fetch 下载 |
| `child_process` | 系统命令执行 | 无 |
| `global` / `globalThis` | 全局对象访问 | 无 |
| `__proto__` | 原型链操作 | 无 |
| `Proxy` / `Reflect` | 可能绕过限制 | 无 |

### 6. 调试技巧

由于生产环境禁用 console，推荐以下调试方法：

#### 方法 1：返回中间结果

```javascript
async function main() {
  const step1 = await fetch(url1).then(r => r.json());
  const step2 = await fetch(url2).then(r => r.json());
  
  return {
    success: true,
    debug: {
      step1: step1,
      step2: step2
    },
    result: processData(step1, step2)
  };
}
return main();
```

#### 方法 2：返回执行日志

```javascript
async function main() {
  const logs = [];
  
  logs.push('开始执行');
  const data = await fetch(url).then(r => r.json());
  logs.push(`获取到 ${data.length} 条数据`);
  
  const filtered = data.filter(item => item.age > 25);
  logs.push(`筛选后剩余 ${filtered.length} 条`);
  
  return {
    success: true,
    logs: logs,
    result: filtered
  };
}
return main();
```

#### 方法 3：返回错误详情

```javascript
async function main() {
  try {
    const data = await riskyOperation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        name: error.name,
        stack: error.stack  // 错误堆栈
      }
    };
  }
}
return main();
```

### 7. 推荐的代码结构

```javascript
// 引入需要的模块
const axios = require('axios');
const xlsx = require('xlsx');
const _ = require('lodash');

// 主函数
async function main() {
  // 资源变量声明
  let workbook;
  
  try {
    // 业务逻辑
    const result = await someAsyncOperation();
    
    // 返回成功结果
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    // 返回错误信息
    return {
      success: false,
      error: error.message
    };
    
  } finally {
    // 释放资源
    if (workbook) workbook.close();
  }
}

// 执行主函数
return main();
```

---

## 📞 获取帮助

### 完整文档

- [代码规则详细说明](./code规则.md)
- [API 接口文档](./API接口完整文档.md)
- [增强模块文档](./ENHANCED_MODULES.md)

### 在线测试工具

访问：`http://your-server:3002/flow/test-tool`

---

## 🛠️ 在线测试工具使用指南

### 工具简介

Flow-CodeBlock 提供了一个功能强大的**在线测试工具**，帮助您快速测试和调试 JavaScript 代码，无需配置任何开发环境。

**访问地址**: `http://your-server:3002/flow/test-tool`

### 工具特性

- ✅ **可视化编辑器** - 基于 Ace Editor，支持语法高亮、代码补全
- ✅ **全屏编辑模式** - 沉浸式编写代码体验
- ✅ **实时执行** - 一键运行代码，查看执行结果
- ✅ **Base64 编解码** - 自动处理 Base64 编码/解码
- ✅ **示例代码库** - 7+ 个完整示例，一键加载
- ✅ **Token 查询** - 快速查询和填充 Token
- ✅ **结果复制** - 一键复制执行结果、Input 参数
- ✅ **JSON 高亮** - Postman 风格的 JSON 语法高亮

---

### 快速开始（5 步）

#### 第 1 步：输入 Access Token

在"认证配置"区域输入您的 Access Token：

```
🔐 认证配置
Access Token *
┌──────────────────────────────────┐
│ flow_your_token_here             │
└──────────────────────────────────┘
```

**如何获取 Token？**
- 方式 1：点击 **"🎯 申请开通服务"** 按钮
- 方式 2：点击 **"🔍 查询 Token"** 按钮，输入 Workspace ID 和 Email 查询

#### 第 2 步：填写 Input 参数

在"Input 参数"区域输入 JSON 格式的数据：

```json
{
  "name": "张三",
  "age": 25,
  "items": [1, 2, 3, 4, 5]
}
```

**快捷方式**: 点击 **"✨ 完整示例"** 按钮，自动加载示例 Input 和代码。

#### 第 3 步：编写 JavaScript 代码

在"JavaScript 代码"区域编写代码（支持 Ace Editor）：

```javascript
// 简单计算示例
return {
  result: input.age * 2,
  name: input.name,
  itemCount: input.items.length
};
```

**提示**: 
- 点击 **"🖥️ 全屏编辑"** 进入全屏模式
- 按 `Ctrl/Cmd + S` 保存并关闭全屏编辑器
- 按 `ESC` 取消全屏编辑

#### 第 4 步：运行代码

点击 **"▶️ 运行代码"** 按钮，系统会自动：
1. 验证 Access Token
2. 验证 Input JSON 格式
3. 自动将代码编码为 Base64
4. 发送请求到服务器
5. 显示执行结果

#### 第 5 步：查看结果

在"执行结果"区域查看返回数据：

```json
{
  "success": true,
  "result": {
    "result": 50,
    "name": "张三",
    "itemCount": 5
  },
  "timing": {
    "executionTime": 15,
    "totalTime": 15
  },
  "timestamp": "2025-10-07 10:30:00"
}
```

**统计信息**:
- ⏱️ **执行时间**: 15ms
- ✅ **状态**: 成功
- 🆔 **Request ID**: 96ff0a85...

**快捷操作**:
- 点击 **"📋 复制结果"** 按钮，一键复制执行结果到剪贴板

---

### 功能详解

#### 1. 认证配置区域

**API 服务地址**
- 默认地址会自动填充（通常是当前服务器地址）
- 支持自定义修改（如切换到测试环境）

**Access Token**
- 必填项，用于身份验证
- 支持通过"查询 Token"功能快速获取

**操作按钮**:
- 🎯 **申请开通服务** - 跳转到服务申请页面
- 🔍 **查询 Token** - 通过 Workspace ID 和 Email 查询已有 Token

#### 2. Input 参数区域

**功能**:
- 输入 JSON 格式的测试数据
- 代码中通过 `input` 对象访问这些数据

**示例加载** (7 种完整示例):
| 按钮 | 说明 | Input 示例 |
|------|------|-----------|
| ✨ 简单计算 | 基础数据操作 | `{ name, age, items }` |
| ✨ Axios 请求 | 使用 axios 发送 HTTP 请求 | `{ postId, userId }` |
| ✨ Fetch 请求 | 使用 fetch API | `{ userId, action }` |
| ✨ Lodash 工具 | 使用 lodash 处理数组 | `{ users, targetCity }` |
| ✨ 数据加密 | 使用 crypto-js 加密 | `{ text, secretKey }` |
| ✨ 日期处理 | 使用 date-fns | `{ startDate, endDate }` |
| ✨ Excel 处理 | 读取 Excel 文件 | `{ excelUrl, sheetIndex }` |

**快捷按钮**:
- 📋 **复制内容** - 复制当前 Input 到剪贴板
- 🗑️ **清空输入** - 清空 Input 区域

#### 3. JavaScript 代码区域

**编辑器特性**:
- 🎨 语法高亮（JavaScript）
- 💡 代码补全（自动提示）
- 🔢 行号显示
- 🎯 自动缩进
- ⚡ 实时语法检查

**全屏编辑器**:
- 点击 **"🖥️ 全屏编辑"** 进入沉浸式编辑模式
- 使用深色主题（Monokai）
- 支持快捷键 `Ctrl/Cmd + S` 保存
- 按 `ESC` 或点击 **"❌ 取消"** 关闭

**快捷按钮**:
- 🗑️ **清空代码** - 清空编辑器
- 🔒 **编码为 Base64** - 手动编码当前代码
- ▶️ **运行代码** - 执行代码（会自动编码）

#### 4. 执行结果区域

**显示内容**:
- JSON 格式的执行结果（带语法高亮）
- 执行统计信息（时间、状态、Request ID）
- 成功/失败标识（绿色/红色边框）

**JSON 语法高亮**:
```json
{
  "success": true,          // 布尔值 - 蓝色加粗
  "result": {               // 键名 - 深蓝色
    "name": "张三",         // 字符串 - 绿色
    "age": 25,              // 数字 - 棕色
    "active": null          // null - 灰色加粗
  }
}
```

**快捷按钮**:
- 📋 **复制结果** - 复制完整的执行结果（纯文本）

#### 5. Base64 编码结果区域

**功能**:
- 显示代码的 Base64 编码结果
- 用于 API 调用时的 `codebase64` 参数

**操作按钮**:
- 📋 **复制 Base64** - 复制 Base64 字符串
- 🔓 **解码验证** - 将 Base64 解码回原始代码
- 🗑️ **清空** - 清空编码和解码结果

**解码验证结果**:
- 自动对比解码结果与原始代码
- ✅ 完全一致 → "解码验证通过"
- ⚠️ 不一致 → "解码结果与原始代码不匹配"

---

### 高级功能

#### 1. Token 查询功能

点击 **"🔍 查询 Token"** 按钮，打开查询弹窗：

**步骤**:
1. 输入 **Workspace ID**（必填）
2. 输入 **Email**（必填）
3. 点击 **"🔍 查询"** 按钮

**查询结果**:
- **单个 Token**: 直接显示详细信息
- **多个 Token**: 显示下拉选择器

**Token 详情**:
```
Token 值: flow_xxxxxxxxxxxx
状态: ✅ 有效 / ❌ 已禁用
失效时间: 2025-12-31 23:59:59 / 永久有效
每分钟请求限制: 60 次/分钟
突发请求限制: 10 次
创建时间: 2024-10-01 10:00:00
```

**快捷操作**:
- 点击 **"✅ 使用此 Token 填充"** - 自动填充到 Access Token 输入框

**关闭弹窗**:
- 点击右上角 **"×"** 按钮
- 注意：点击遮罩层不会关闭弹窗（需点击 × 按钮）

#### 2. 示例代码加载

**完整示例**（推荐 ⭐）:
- 点击 Input 区域的 **"✨ 完整示例"** 按钮
- 自动填充 Input 数据 + JavaScript 代码
- 立即可以运行，查看效果

**示例列表**:
| 示例 | 功能 | 难度 |
|------|------|------|
| ✨ 简单计算 | 基础数据操作和计算 | ⭐ 入门 |
| ✨ Axios 请求 | 发送 HTTP GET 请求 | ⭐⭐ 进阶 |
| ✨ Fetch 请求 | Fetch API GET/POST | ⭐⭐ 进阶 |
| ✨ Lodash 工具 | 数组筛选、排序、统计 | ⭐⭐ 进阶 |
| ✨ 数据加密 | AES 加密、哈希算法 | ⭐⭐⭐ 高级 |
| ✨ 日期处理 | date-fns 日期计算 | ⭐⭐⭐ 高级 |
| ✨ Excel 处理 | 从 URL 读取 Excel | ⭐⭐⭐⭐ 专家 |

#### 3. 快捷键支持

| 快捷键 | 功能 | 适用范围 |
|--------|------|---------|
| `Ctrl/Cmd + S` | 保存代码 | 全屏编辑器 |
| `ESC` | 关闭全屏 | 全屏编辑器 |
| `Tab` | 缩进 | 编辑器 |
| `Shift + Tab` | 反缩进 | 编辑器 |

---

### 常见问题

#### Q1: 为什么点击"运行代码"后没有反应？

**A**: 可能的原因：
1. **未填写 Access Token** → 检查是否已填写
2. **Input JSON 格式错误** → 检查 JSON 格式是否正确
3. **网络连接问题** → 检查 API 服务地址是否正确
4. **Token 已过期** → 使用"查询 Token"功能检查状态

#### Q2: 如何查看详细的错误信息？

**A**: 
- 查看"执行结果"区域的红色错误提示
- 错误信息包含：错误类型、详细描述、Request ID
- 使用 Request ID 追踪具体请求

#### Q3: 示例代码可以直接使用吗？

**A**: 是的！
- 点击 **"✨ 完整示例"** 按钮
- Input 和代码会同时填充
- 直接点击 **"▶️ 运行代码"** 即可
- 所有示例都经过测试，可以直接运行

#### Q4: Base64 编码结果有什么用？

**A**: 
- 用于 API 调用的 `codebase64` 参数
- 点击"运行代码"时会自动编码
- 手动编码可用于调试或外部调用

#### Q5: 如何复制执行结果？

**A**: 
- 方式 1: 点击 **"📋 复制结果"** 按钮（推荐）
- 方式 2: 手动选择结果区域的文本复制
- 复制的是纯文本格式（去除 HTML 高亮）

#### Q6: 全屏编辑器的代码会自动保存吗？

**A**: 不会自动保存！
- 必须点击 **"✅ 保存并关闭"** 才会保存
- 或使用快捷键 `Ctrl/Cmd + S` 保存
- 点击 **"❌ 取消"** 或 `ESC` 会丢弃修改

#### Q7: 测试工具支持移动端吗？

**A**: 部分支持
- ✅ 可以在手机浏览器访问
- ✅ 可以查看结果、复制代码
- ⚠️ 编辑体验不如桌面端
- 💡 推荐使用桌面浏览器（Chrome/Edge/Safari）

---

### 使用技巧

#### 技巧 1: 快速测试 API

```javascript
// 测试外部 API 是否可访问
const axios = require('axios');

async function testAPI() {
  try {
    const start = Date.now();
    const response = await axios.get('https://api.example.com/health');
    const duration = Date.now() - start;
    
    return {
      success: true,
      status: response.status,
      duration: duration + 'ms',
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
return testAPI();
```

#### 技巧 2: 调试复杂逻辑

```javascript
// 返回中间步骤的调试信息
async function complexLogic() {
  const steps = [];
  
  steps.push('步骤 1: 开始执行');
  const data = await fetchData();
  steps.push(`步骤 2: 获取到 ${data.length} 条数据`);
  
  const filtered = data.filter(x => x.age > 25);
  steps.push(`步骤 3: 筛选后剩余 ${filtered.length} 条`);
  
  return {
    success: true,
    steps: steps,
    result: filtered
  };
}
return complexLogic();
```

#### 技巧 3: 性能测试

```javascript
// 测试代码执行性能
function performanceTest() {
  const start = Date.now();
  
  // 执行需要测试的代码
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }
  
  const duration = Date.now() - start;
  
  return {
    result: sum,
    duration: duration + 'ms',
    operations: 1000000,
    opsPerSec: Math.round(1000000 / duration * 1000)
  };
}
return performanceTest();
```

#### 技巧 4: 批量测试

```javascript
// 测试多个场景
const testCases = [
  { name: '测试1', value: 10 },
  { name: '测试2', value: 20 },
  { name: '测试3', value: 30 }
];

const results = testCases.map(test => {
  try {
    const result = test.value * 2;
    return {
      name: test.name,
      success: true,
      result: result
    };
  } catch (error) {
    return {
      name: test.name,
      success: false,
      error: error.message
    };
  }
});

return {
  total: testCases.length,
  passed: results.filter(r => r.success).length,
  results: results
};
```

---

### 最佳实践

#### 1. 开发流程建议

**步骤 1**: 从简单示例开始
- 点击 **"✨ 简单计算"** 示例
- 运行查看结果
- 理解 Input 和 return 的关系

**步骤 2**: 修改示例代码
- 在示例基础上修改
- 逐步增加复杂度
- 及时测试验证

**步骤 3**: 编写完整功能
- 使用全屏编辑器
- 添加错误处理
- 测试各种场景

**步骤 4**: 复制到生产环境
- 复制 Base64 编码结果
- 或复制代码到项目中
- 通过 API 调用

#### 2. 调试技巧

✅ **使用 return 返回调试信息**
```javascript
return {
  debug: {
    step1: data1,
    step2: data2
  },
  result: finalResult
};
```

✅ **分段测试**
```javascript
// 先测试第一步
return step1();

// 确认无误后再测试完整流程
return completeFlow();
```

✅ **捕获所有错误**
```javascript
try {
  // 业务逻辑
} catch (error) {
  return {
    success: false,
    error: error.message,
    stack: error.stack  // 包含堆栈信息
  };
}
```

#### 3. 性能优化

⚡ **使用完整示例学习**
- 示例代码都是经过优化的
- 包含最佳实践和错误处理
- 可以直接作为模板使用

⚡ **避免不必要的请求**
- 使用测试工具验证后再部署
- 减少生产环境的调试请求

⚡ **合理使用全屏编辑器**
- 编写复杂代码时使用全屏模式
- 提高编写效率和代码质量

---

### 工具截图说明

#### 主界面布局

```
┌─────────────────────────────────────────────────────────┐
│  🚀 Flow-CodeBlock 代码执行测试工具                      │
│  支持 JavaScript ES6+、异步操作、HTTP 请求、加密等      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📌 使用说明              🔐 认证配置                    │
│  1. 输入 Token           API 服务地址: [_________]      │
│  2. 填写 Input           Access Token: [_________]       │
│  3. 编写代码             [🎯 申请服务] [🔍 查询Token]   │
│  4. 运行测试                                            │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📥 Input 参数                      [📋 复制内容]       │
│  ✨ 简单计算 | ✨ Axios | ✨ Fetch | ✨ Lodash ...    │
│  ┌────────────────────────────────────────────┐        │
│  │ {                                           │        │
│  │   "name": "张三",                           │        │
│  │   "age": 25                                 │        │
│  │ }                                           │        │
│  └────────────────────────────────────────────┘        │
│  [🗑️ 清空输入]                                         │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  💻 JavaScript 代码           [🖥️ 全屏编辑]            │
│  ┌────────────────────────────────────────────┐        │
│  │ // 计算年龄的两倍                           │        │
│  │ return {                                    │        │
│  │   result: input.age * 2,                   │        │
│  │   name: input.name                         │        │
│  │ };                                          │        │
│  └────────────────────────────────────────────┘        │
│  [🗑️ 清空] [🔒 Base64] [▶️ 运行代码]                  │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 执行结果                        [📋 复制结果]       │
│  ┌────────────────────────────────────────────┐        │
│  │ {                                           │        │
│  │   "success": true,                         │        │
│  │   "result": {                              │        │
│  │     "result": 50,                          │        │
│  │     "name": "张三"                          │        │
│  │   }                                         │        │
│  │ }                                           │        │
│  └────────────────────────────────────────────┘        │
│  执行时间: 15ms | 状态: ✅ 成功 | Request ID: 96ff..   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

### 相关链接

- 📚 [Flow-CodeBlock 帮助文档](./Flow-codeblock帮助文档.md)
- 📖 [代码规则详细说明](./code规则.md)
- 🔌 [API 接口文档](./API接口完整文档.md)
- 🤖 [轻翼AI：代码块AI助手](https://ai-assistant-url)

---

## 📋 快速参考卡片

### 必记规则

1. ✅ **必须有 return** - 所有代码都要返回结果
2. ✅ **异步用 await** - Promise 必须等待
3. ✅ **资源要释放** - Excel 用完调用 `close()`
4. ✅ **模块要 require** - 除了 fetch, Buffer, FormData
5. ❌ **禁用 console** - 生产环境不能用（用 return 代替）

### 常用模块速查

```javascript
// 无需 require（直接使用）
Buffer.from([1,2,3])          // Buffer 操作
fetch('https://...')          // HTTP 请求
new FormData()                // 表单数据
new URL('https://...')        // URL 解析（Web 标准）
new URLSearchParams('a=1')    // 查询参数

// 需要 require
const axios = require('axios');      // HTTP 库
const crypto = require('crypto');    // 加密
const xlsx = require('xlsx');        // Excel
const dateFns = require('date-fns'); // 日期
const qs = require('qs');            // 查询字符串
const _ = require('lodash');         // 工具库
const uuid = require('uuid');        // UUID
```

### 错误排查

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `console is not defined` | 生产环境禁用 | 使用 `return` 返回信息 |
| `xxx is not defined` | 模块未 require | 添加 `const xxx = require('xxx')` |
| `Object has no member 'parse'` | url.parse() 不支持 | 使用 `new URL()` 代替 |
| `代码中缺少 return` | 没有返回值 | 添加 `return` 语句 |
| `返回值不能是 undefined` | return 了 undefined | 返回其他值或对象 |
| `超时` | 执行时间过长 | 优化代码或调整超时配置 |

---

## 🎓 学习路径

1. **第 1 步**：阅读本文档的"功能简介"和"代码编写规则"
2. **第 2 步**：尝试"效果展示"中的简单示例（示例 1-3）
3. **第 3 步**：学习异步操作和模块使用（示例 4-8）
4. **第 4 步**：查看完整的[代码规则文档](./code规则.md)
5. **第 5 步**：在线测试工具实践

---

**文档版本**: v1.0  
**最后更新**: 2025-10-07  
**适用版本**: Flow-codeblock v2.2+

