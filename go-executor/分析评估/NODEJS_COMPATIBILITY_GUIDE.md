# Node.js 兼容性指南

> 📘 本文档说明在 **Goja (Go JavaScript Runtime)** 环境中与标准 Node.js 环境的差异，以及需要特别处理的写法。

## 🎯 核心差异总览

我们的环境是 **Goja + 自定义模块增强**，而不是标准 Node.js。虽然我们尽力保持 API 兼容，但由于底层实现不同，某些写法需要调整。

| 类别 | 标准 Node.js | 我们的环境 | 原因 |
|------|-------------|-----------|------|
| **运行时** | V8 引擎 | Goja (Go) | 底层实现不同 |
| **HTTP 客户端** | axios (基于 http 模块) | axios (基于 fetch API) | 实现方式不同 |
| **模块加载** | CommonJS + ES6 | CommonJS only | Goja 限制 |
| **Buffer 处理** | 原生 Buffer | 兼容实现 | 需显式转换 |

---

## 📦 模块导入差异

### 1. date-fns 模块

#### ❌ 标准 Node.js 写法（在我们环境中**不支持**）

```javascript
// ES6 解构导入（不支持）
const { format, parse, isValid } = require('date-fns');

format(new Date(), 'yyyy-MM-dd');
```

**错误原因**：我们使用的是 webpack UMD 打包版本，导出的是整个对象，不支持解构。

#### ✅ 在我们环境中的正确写法

```javascript
// 方式 1: 整体导入后提取（推荐）
const dateFns = require('date-fns');
const format = dateFns.format;
const parse = dateFns.parse;
const isValid = dateFns.isValid;

format(new Date(), 'yyyy-MM-dd');
```

```javascript
// 方式 2: 直接使用对象属性
const dateFns = require('date-fns');

dateFns.format(new Date(), 'yyyy-MM-dd');
dateFns.parse('2025-01-01', 'yyyy-MM-dd', new Date());
dateFns.isValid(new Date());
```

#### 📝 适用的所有 date-fns 函数

```javascript
const dateFns = require('date-fns');

// 所有这些函数都需要通过 dateFns.xxx 调用
dateFns.format()
dateFns.parse()
dateFns.isValid()
dateFns.addDays()
dateFns.subDays()
dateFns.startOfDay()
dateFns.endOfDay()
dateFns.differenceInDays()
dateFns.compareAsc()
// ... 等等
```

---

## 🌐 axios 与 Buffer 处理

### 2. arraybuffer 响应类型

#### ⚠️ 标准 Node.js 写法（在我们环境中需要**额外转换**）

```javascript
const axios = require('axios');
const XLSX = require('xlsx');

// 在标准 Node.js 中
const response = await axios.get(url, { responseType: 'arraybuffer' });
console.log(Buffer.isBuffer(response.data));  // true

// 可以直接使用
const workbook = XLSX.read(response.data, { type: 'buffer' });  // ✅ 正常
```

**差异原因**：
- **Node.js axios** 使用 `http`/`https` 模块，返回 `Buffer` 对象
- **我们的 axios** 使用 `fetch` API，返回 `ArrayBuffer` 对象

#### ✅ 在我们环境中的正确写法

```javascript
const axios = require('axios');
const xlsx = require('xlsx');  // 注意：小写

// 在我们的环境中
const response = await axios.get(url, { responseType: 'arraybuffer' });
console.log(Buffer.isBuffer(response.data));  // false（这是 ArrayBuffer）

// 必须先转换为 Buffer
const buffer = Buffer.from(response.data);  // ArrayBuffer → Buffer
const workbook = xlsx.read(buffer);  // ✅ 现在可以正常使用
```

#### 📝 完整示例：下载并解析 Excel

```javascript
const axios = require('axios');
const xlsx = require('xlsx');

function processExcel(url) {
  return axios.get(url, { responseType: 'arraybuffer' })
    .then(function(response) {
      // 🔥 关键步骤：ArrayBuffer → Buffer
      const buffer = Buffer.from(response.data);
      
      // 现在可以正常使用
      const workbook = xlsx.read(buffer);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);
      
      return data;
    });
}
```

#### 📝 上传 Excel 到 OSS

```javascript
const axios = require('axios');
const xlsx = require('xlsx');

function uploadExcel(targetUrl, data) {
  // 生成 Excel
  const workbook = xlsx.utils.book_new();
  const sheet = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  
  // 写入 Buffer
  const buffer = xlsx.write(workbook, { type: 'buffer' });
  
  // 上传（buffer 可以直接作为 data）
  return axios.put(targetUrl, buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  });
}
```

---

## 📋 模块命名差异

### 3. xlsx 模块名称

#### ✅ 两种写法都支持

```javascript
// 小写（推荐，与变量名一致）
const xlsx = require('xlsx');

// 大写（也支持）
const XLSX = require('xlsx');  // 注意：模块名是小写，但变量名可以大写
```

**说明**：
- 模块名始终是小写 `'xlsx'`
- 但变量名可以使用大写 `XLSX` 或小写 `xlsx`
- 推荐使用小写 `xlsx` 以保持一致性

---

## 🔄 Buffer 与 ArrayBuffer 转换

### 4. 二进制数据类型转换

#### 📚 类型对比

| 类型 | 来源 | 使用场景 | 转换需求 |
|------|------|---------|---------|
| `ArrayBuffer` | 浏览器标准 | fetch API、XMLHttpRequest | ⚠️ 需要转换 |
| `Buffer` | Node.js 标准 | fs、http、stream | ✅ 直接使用 |
| `Uint8Array` | 浏览器标准 | TypedArray 操作 | ⚠️ 需要转换 |

#### ✅ 转换方法

```javascript
// 1. ArrayBuffer → Buffer
const arrayBuffer = response.arrayBuffer();  // 来自 fetch
const buffer = Buffer.from(arrayBuffer);

// 2. Uint8Array → Buffer
const uint8Array = new Uint8Array([1, 2, 3]);
const buffer = Buffer.from(uint8Array);

// 3. Buffer → ArrayBuffer
const buffer = Buffer.from([1, 2, 3]);
const arrayBuffer = buffer.buffer.slice(
  buffer.byteOffset,
  buffer.byteOffset + buffer.byteLength
);

// 4. 字符串 → Buffer
const buffer = Buffer.from('hello', 'utf8');

// 5. Base64 → Buffer
const buffer = Buffer.from('aGVsbG8=', 'base64');
```

#### 📝 实际应用场景

```javascript
// 场景 1: fetch API 下载文件
fetch(url)
  .then(res => res.arrayBuffer())
  .then(arrayBuffer => {
    const buffer = Buffer.from(arrayBuffer);  // 转换
    // 现在可以用 buffer 做任何操作
  });

// 场景 2: axios 下载文件
axios.get(url, { responseType: 'arraybuffer' })
  .then(response => {
    const buffer = Buffer.from(response.data);  // 转换
    // 处理 buffer
  });

// 场景 3: 创建 Blob 后上传
const blob = new Blob([buffer], { type: 'application/octet-stream' });
// Blob 可以直接用于 FormData 或 axios.post
```

---

## 🚫 不支持的功能

### 5. 禁用的 Node.js 模块

#### ❌ 完全禁用的模块（代码解析级拦截）

以下模块出于**安全考虑**被完全禁用，在代码解析阶段就会被拦截：

```javascript
// 文件系统模块（禁用）
const fs = require('fs');  // ❌ SecurityError: 禁止使用 fs 模块

// 路径模块（禁用）
const path = require('path');  // ❌ SecurityError: 禁止使用 path 模块

// 子进程模块（禁用）
const child_process = require('child_process');  // ❌ SecurityError: 禁止使用 child_process 模块

// 操作系统模块（禁用）
const os = require('os');  // ❌ SecurityError: 禁止使用 os 模块

// 网络模块（禁用）
const net = require('net');      // ❌ SecurityError: 禁止使用 net 模块
const http = require('http');    // ❌ SecurityError: 禁止使用 http 模块
const https = require('https');  // ❌ SecurityError: 禁止使用 https 模块
```

**替代方案**：
- **文件操作** → 使用 `axios` 从 URL 下载/上传到 OSS
- **HTTP 请求** → 使用 `axios` 或 `fetch` API
- **其他** → 无替代方案

#### ⚠️ 受限的全局对象

以下全局对象虽然存在，但在**用户代码中访问会被拦截**：

```javascript
// 危险函数（禁用）
eval('code');  // ❌ 完全禁用

// 构造器访问（禁用）
Function('code');  // ❌ SecurityError: Function构造器可执行任意代码

// 全局对象访问（禁用）
global.something;      // ❌ SecurityError: global对象访问被禁止
globalThis.something;  // ❌ SecurityError: globalThis对象访问被禁止
window.something;      // ❌ SecurityError: window对象访问被禁止
self.something;        // ❌ SecurityError: self对象访问被禁止

// 原型链操作（禁用）
obj.__proto__;                    // ❌ SecurityError: 原型链操作可能导致安全问题
obj.constructor.constructor;      // ❌ SecurityError: 构造器访问可能导致代码注入

// 无限循环（禁用）
while(true) {}  // ❌ SecurityError: 代码可能包含无限循环
for(;;) {}      // ❌ SecurityError: 代码可能包含无限循环
```

#### ⚠️ process 模块的限制

`process` 模块可用，但危险功能已被禁用：

```javascript
const process = require('process');

// ✅ 可用
console.log(process.version);  // Node.js 版本信息
console.log(process.platform); // 平台信息

// ❌ 已禁用
process.exit(0);    // undefined（已禁用）
process.abort();    // undefined（已禁用）
process.env;        // {}（空对象）
process.argv;       // []（空数组）
```

---

### 6. ES6+ 语法限制

#### ❌ 不支持的语法

```javascript
// ES6 模块导入（不支持）
import { format } from 'date-fns';
import axios from 'axios';

// async/await（不支持，建议使用 Promise）
async function test() {
  const result = await axios.get(url);  // ❌ SyntaxNotSupported
}

// 类的私有字段（不支持）
class MyClass {
  #privateField = 123;  // ❌ 不支持
}

// 可选链（不支持）
const value = obj?.property?.nested;  // ❌ 不支持

// 空值合并运算符（不支持）
const value = null ?? 'default';  // ❌ 不支持

// BigInt 字面量（不支持）
const bigNum = 123456789012345678901234567890n;  // ❌ 不支持
```

#### ⚠️ BigInt 的限制

虽然提供了 `BigInt` 构造函数，但有重要限制：

```javascript
// ✅ BigInt 构造函数可用
const big1 = BigInt('123456789012345678901234567890');
const big2 = BigInt(123);

// ❌ BigInt 字面量语法不支持
const big3 = 123n;  // ❌ SyntaxError: 不支持 'n' 后缀

// ⚠️ BigInt 严格相等比较有问题
const a = BigInt(100);
const b = BigInt(100);
console.log(a === b);  // ⚠️ 可能返回 false（这是已知问题）

// ✅ 建议：使用字符串比较或转换为字符串后比较
console.log(a.toString() === b.toString());  // ✅ 正确
console.log(String(a) === String(b));        // ✅ 正确

// ✅ 数学运算可用（但要注意返回的是新对象）
const sum = BigInt(100) + BigInt(200);  // 可能无法正确比较
```

**建议**：
- 避免使用 `===` 直接比较两个 BigInt 对象
- 使用 `.toString()` 或 `String()` 转换后再比较
- 或者使用 `.valueOf()` 转换为 number（如果在安全范围内）

#### ✅ 推荐的替代写法

```javascript
// 使用 CommonJS
const dateFns = require('date-fns');
const axios = require('axios');

// 使用 Promise 链
function test() {
  return axios.get(url)
    .then(function(result) {
      return result.data;
    });
}

// 使用闭包模拟私有变量
function MyClass() {
  var privateField = 123;  // 闭包变量
  
  this.getPrivate = function() {
    return privateField;
  };
}

// 使用传统的属性检查
const value = obj && obj.property && obj.property.nested;

// 使用三元运算符
const value = (variable !== null && variable !== undefined) ? variable : 'default';
```

---

### 7. 全局可用的对象和函数

#### ✅ 标准全局对象（完全支持）

```javascript
// 数学对象
Math.random();
Math.floor(3.14);
Math.max(1, 2, 3);

// JSON 操作
JSON.stringify({ key: 'value' });
JSON.parse('{"key":"value"}');

// 类型转换
parseInt('123');
parseFloat('3.14');
isNaN(value);
isFinite(value);

// URL 编码
encodeURIComponent('hello world');
decodeURIComponent('hello%20world');

// Base64 编码/解码
btoa('hello');       // 编码为 Base64
atob('aGVsbG8=');    // 从 Base64 解码

// 时间对象
new Date();
Date.now();

// 数组和对象
Array.isArray([]);
Object.keys({});
Object.values({});
```

#### ✅ Buffer 对象（全局可用）

```javascript
// Buffer 是全局对象，无需 require
const buf = Buffer.from('hello');
const buf2 = Buffer.from([1, 2, 3]);
const buf3 = Buffer.alloc(10);

console.log(Buffer.isBuffer(buf));  // true
```

#### ✅ 可用的 Node.js 模块

```javascript
// URL 模块（完整支持）
const url = require('url');
const parsed = url.parse('https://example.com/path?q=1');

// process 模块（受限支持）
const process = require('process');
console.log(process.version);   // ✅ 可用
console.log(process.platform);  // ✅ 可用
```

---

## 📊 完整示例：Excel 处理流程

### 8. 从下载到上传的完整流程

```javascript
// 导入模块（注意写法）
const axios = require('axios');
const xlsx = require('xlsx');       // 小写
const dateFns = require('date-fns'); // 不能解构

// 提取常用函数
const format = dateFns.format;
const parse = dateFns.parse;

function processExcelWorkflow(sourceUrl, targetUrl) {
  return new Promise(function(resolve, reject) {
    // Step 1: 从 OSS 下载 Excel
    axios.get(sourceUrl, { responseType: 'arraybuffer' })
      .then(function(response) {
        // Step 2: ArrayBuffer → Buffer（关键转换）
        const buffer = Buffer.from(response.data);
        
        // Step 3: 读取 Excel
        const workbook = xlsx.read(buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        // Step 4: 业务逻辑处理
        const processed = data.map(function(row) {
          return {
            id: row.id,
            name: row.name,
            amount: parseFloat(row.amount) || 0,
            date: format(new Date(), 'yyyy-MM-dd'),  // 使用 date-fns
            category: row.amount > 1000 ? 'VIP' : 'Normal'
          };
        });
        
        // Step 5: 生成新 Excel
        const newWorkbook = xlsx.utils.book_new();
        const newSheet = xlsx.utils.json_to_sheet(processed);
        xlsx.utils.book_append_sheet(newWorkbook, newSheet, 'Processed');
        
        // Step 6: 写入 Buffer
        const outputBuffer = xlsx.write(newWorkbook, { type: 'buffer' });
        
        // Step 7: 上传到 OSS
        return axios.put(targetUrl, outputBuffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }
        });
      })
      .then(function() {
        resolve({ success: true, message: '处理完成' });
      })
      .catch(function(error) {
        console.log('错误详情:', error.message);
        reject({ success: false, error: error.message });
      });
  });
}

// 使用
const sourceUrl = 'https://oss.example.com/source.xlsx';
const targetUrl = 'https://oss.example.com/result.xlsx';

return processExcelWorkflow(sourceUrl, targetUrl);
```

---

## 🎓 最佳实践

### 9. 编写兼容代码的建议

#### ✅ 推荐做法

1. **使用 Promise 链而不是 async/await**
   ```javascript
   // 推荐
   return axios.get(url)
     .then(function(response) { return response.data; });
   
   // 不推荐（可能有问题）
   const response = await axios.get(url);
   ```

2. **显式转换 ArrayBuffer 为 Buffer**
   ```javascript
   // 推荐：总是显式转换
   const buffer = Buffer.from(response.data);
   
   // 不推荐：假设自动转换
   const workbook = xlsx.read(response.data);  // 可能失败
   ```

3. **使用完整的模块对象**
   ```javascript
   // 推荐
   const dateFns = require('date-fns');
   dateFns.format(date, 'yyyy-MM-dd');
   
   // 不推荐
   const { format } = require('date-fns');  // 不支持
   ```

4. **使用 function 关键字而不是箭头函数（在某些场景）**
   ```javascript
   // 推荐（兼容性好）
   .then(function(response) {
     return response.data;
   });
   
   // 可以使用，但在某些 Goja 版本可能有问题
   .then(response => response.data);
   ```

5. **添加详细的错误日志**
   ```javascript
   .catch(function(error) {
     console.log('错误详情:', error.message);
     console.log('错误堆栈:', error.stack);
     return { error: error.message };
   });
   ```

#### ❌ 避免的做法

1. **不要使用 ES6 模块语法**
2. **不要访问文件系统**
3. **不要使用未支持的 ES6+ 特性（可选链、空值合并等）**
4. **不要假设 ArrayBuffer 和 Buffer 可以互换**
5. **不要使用解构导入第三方模块**

---

## 🔍 调试技巧

### 10. 如何排查兼容性问题

#### 步骤 1: 检查数据类型

```javascript
// 检查 axios 响应类型
axios.get(url, { responseType: 'arraybuffer' })
  .then(function(response) {
    console.log('数据类型:', response.data.constructor.name);
    console.log('是否为 Buffer:', Buffer.isBuffer(response.data));
    console.log('是否为 ArrayBuffer:', response.data instanceof ArrayBuffer);
  });
```

#### 步骤 2: 检查模块导入

```javascript
// 检查模块导出内容
const dateFns = require('date-fns');
console.log('date-fns 类型:', typeof dateFns);
console.log('date-fns 键:', Object.keys(dateFns).slice(0, 10));
console.log('format 是否存在:', typeof dateFns.format);
```

#### 步骤 3: 检查 Buffer 操作

```javascript
// 测试 Buffer 创建和转换
const buffer = Buffer.from([1, 2, 3]);
console.log('Buffer 长度:', buffer.length);
console.log('Buffer[0]:', buffer[0]);

const arrayBuffer = new ArrayBuffer(3);
const converted = Buffer.from(arrayBuffer);
console.log('转换成功:', Buffer.isBuffer(converted));
```

#### 步骤 4: 使用 try-catch 捕获错误

```javascript
try {
  const buffer = Buffer.from(response.data);
  const workbook = xlsx.read(buffer);
  console.log('✅ 成功');
} catch (error) {
  console.log('❌ 错误:', error.message);
  console.log('错误堆栈:', error.stack);
}
```

---

## 📚 快速参考表

### 11. 常见操作对照表

| 操作 | 标准 Node.js | 我们的环境 | 备注 |
|------|-------------|-----------|------|
| **导入 date-fns** | `const { format } = require('date-fns')` | `const dateFns = require('date-fns')`<br>`const format = dateFns.format` | 不支持解构 |
| **导入 xlsx** | `const XLSX = require('xlsx')` | `const xlsx = require('xlsx')` 或 `const XLSX = require('xlsx')` | 两种都支持 |
| **axios arraybuffer** | `response.data` 是 `Buffer` | `Buffer.from(response.data)` | 需要转换 |
| **async/await** | 完全支持 | 建议用 Promise 链 | 兼容性更好 |
| **ES6 模块** | `import/export` | `require/module.exports` | 只支持 CommonJS |
| **文件系统** | `fs.readFileSync()` 等 | ❌ 不支持 | 使用 axios 替代 |
| **禁用模块** | `fs`, `path`, `child_process`, `os`, `net`, `http`, `https` | ❌ 全部禁用 | 代码解析级拦截 |
| **危险函数** | `eval()`, `Function()` | ❌ 禁用 | SecurityError |
| **全局对象访问** | `global`, `globalThis`, `window`, `self` | ❌ 禁用 | SecurityError |
| **Buffer 对象** | `const buf = Buffer.from()` | ✅ 全局可用 | 无需 require |
| **Base64** | `btoa()`, `atob()` | ✅ 全局可用 | 完全支持 |
| **BigInt 字面量** | `123n` | `BigInt('123')` | 不支持字面量 |
| **BigInt 比较** | `a === b` | `a.toString() === b.toString()` | === 不可靠 |
| **可选链** | `obj?.prop` | `obj && obj.prop` | 不支持 ES2020 |
| **空值合并** | `value ?? default` | `value !== undefined ? value : default` | 不支持 ES2020 |

---

## 🎯 总结

### 核心要点

1. **date-fns**: 必须使用 `const dateFns = require('date-fns')` 整体导入
2. **xlsx**: 使用 `require('xlsx')`（变量名可以用 `xlsx` 或 `XLSX`）
3. **ArrayBuffer**: axios 的 `responseType: 'arraybuffer'` 返回 ArrayBuffer，需要用 `Buffer.from()` 转换
4. **Promise**: 优先使用 Promise 链而不是 async/await
5. **文件系统**: 完全禁用，使用 axios + OSS 替代
6. **BigInt**: 构造函数可用，但 `===` 比较不可靠，使用 `.toString()` 比较
7. **ES6+**: 仅支持基础语法，避免使用高级特性

### 迁移清单

从标准 Node.js 代码迁移到我们的环境时，请检查：

- [ ] 所有 `require('date-fns')` 的解构导入改为对象访问
- [ ] 确认 xlsx 模块使用 `require('xlsx')`（变量名 `xlsx` 或 `XLSX` 都可以）
- [ ] 所有 axios arraybuffer 响应添加 `Buffer.from()` 转换
- [ ] 删除所有禁用模块的引用（`fs`, `path`, `child_process`, `os`, `net`, `http`, `https`）
- [ ] 删除所有 `eval()`, `Function()` 调用
- [ ] 删除所有 `global`, `globalThis`, `window`, `self` 访问
- [ ] 删除所有 `__proto__` 和 `constructor.constructor` 访问
- [ ] 删除所有无限循环（`while(true)`, `for(;;)`）
- [ ] 所有文件系统操作改为 HTTP/OSS 操作
- [ ] 所有 BigInt 字面量（`123n`）改为 `BigInt('123')`
- [ ] 所有 BigInt 严格相等比较改为字符串比较
- [ ] 所有 async/await 改为 Promise 链（可选，建议）
- [ ] 所有 ES6+ 高级语法改为 ES5 兼容写法

---

## 📞 获取帮助

如果遇到兼容性问题：

1. 查看本文档的相关章节
2. 检查 [ENHANCED_MODULES.md](./ENHANCED_MODULES.md) 了解模块详细 API
3. 查看 [test/](./test/) 目录中的测试用例作为参考
4. 使用 `console.log()` 打印变量类型和内容进行调试

---

**最后更新**: 2025-10-04  
**适用版本**: Flow-CodeBlock Go Executor v1.0+

