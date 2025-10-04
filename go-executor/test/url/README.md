# Node.js url 模块测试

## 📋 概述

测试 goja_nodejs 实现的 Node.js `url` 模块功能。

**注意**: goja_nodejs 只实现了 **WHATWG URL API**,不支持旧版 Node.js API (`url.parse()`, `url.format()` 等)。

---

## ✅ 支持的 API

### URL 类

```javascript
const url = require('url');

// 创建 URL 对象
const myURL = new url.URL('https://example.com/path?query=value#hash');

// 属性访问
myURL.protocol  // 'https:'
myURL.hostname  // 'example.com'
myURL.port      // ''
myURL.pathname  // '/path'
myURL.search    // '?query=value'
myURL.hash      // '#hash'
myURL.href      // 完整 URL
myURL.origin    // 'https://example.com'
myURL.username  // 用户名
myURL.password  // 密码

// 修改属性
myURL.pathname = '/new/path';
myURL.hash = '#section';

// searchParams (URLSearchParams 对象)
myURL.searchParams.get('query');        // 'value'
myURL.searchParams.set('key', 'val');
myURL.searchParams.append('arr', '1');
```

### URLSearchParams 类

```javascript
const url = require('url');

// 从字符串创建
const params1 = new url.URLSearchParams('foo=1&bar=2');

// 从对象创建
const params2 = new url.URLSearchParams({ foo: '1', bar: '2' });

// 方法
params.get('foo');           // '1'
params.getAll('foo');        // ['1', '3'] (如果有多个值)
params.has('foo');           // true
params.set('foo', 'new');    // 设置/覆盖
params.append('foo', '2');   // 追加
params.delete('foo');        // 删除
params.toString();           // 'foo=1&bar=2'

// 迭代
for (const [key, value] of params) {
    console.log(key, value);
}
```

---

## ❌ 不支持的 API

以下旧版 Node.js URL API **不支持**:

```javascript
// ❌ 不支持
url.parse(urlString, parseQueryString, slashesDenoteHost)
url.format(urlObject)
url.resolve(from, to)

// ✅ 请使用 WHATWG URL API 替代
new url.URL(urlString, base)
```

---

## 🧪 测试文件

| 文件 | 说明 | 测试数量 |
|------|------|---------|
| `url-whatwg-test.js` | WHATWG URL API 完整测试 | 8 个 |
| `url-inspect.js` | 检查 url 模块实际提供的 API | - |
| `url-module-test.js` | 旧版 API 测试(失败,仅供参考) | - |

---

## 🚀 快速开始

### 运行测试

```bash
# 方式 1: 使用测试脚本
./test/url/run-url-test.sh

# 方式 2: 直接使用 curl
cd test/url
curl -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {},
    \"codeBase64\": \"$(cat url-whatwg-test.js | base64)\"
  }" | jq '.'
```

### 测试结果示例

```json
{
  "success": true,
  "result": {
    "success": true,
    "passed": 8,
    "failed": 0,
    "errors": [],
    "message": "所有 url 模块测试通过"
  }
}
```

---

## 📊 测试覆盖

### ✅ 已测试功能

| 测试项 | 功能 | 状态 |
|--------|------|------|
| URL 基础解析 | protocol, hostname, port, pathname 等 | ✅ 通过 |
| 用户名密码 | username, password, origin | ✅ 通过 |
| searchParams 访问 | get(), getAll() 查询参数 | ✅ 通过 |
| URL 动态修改 | 修改 pathname, search, hash | ✅ 通过 |
| 相对路径解析 | 基于 base URL 解析相对路径 | ✅ 通过 |
| URLSearchParams 独立 | 独立创建和使用 URLSearchParams | ✅ 通过 |
| URLSearchParams 动态 | set(), append(), delete() 等操作 | ✅ 通过 |
| 多协议支持 | http, https, ftp, file 等 | ✅ 通过 |

---

## 💡 使用示例

### 示例 1: 解析 URL

```javascript
const url = require('url');

const myURL = new url.URL('https://user:pass@example.com:8080/path?q=search#hash');

console.log(myURL.protocol);   // 'https:'
console.log(myURL.hostname);   // 'example.com'
console.log(myURL.port);       // '8080'
console.log(myURL.pathname);   // '/path'
console.log(myURL.username);   // 'user'
console.log(myURL.password);   // 'pass'
console.log(myURL.searchParams.get('q')); // 'search'
console.log(myURL.hash);       // '#hash'
```

### 示例 2: 构建 URL

```javascript
const url = require('url');

const myURL = new url.URL('https://api.example.com');
myURL.pathname = '/users/123';
myURL.searchParams.set('fields', 'name,email');
myURL.searchParams.set('format', 'json');

console.log(myURL.href);
// 'https://api.example.com/users/123?fields=name%2Cemail&format=json'
```

### 示例 3: 相对路径解析

```javascript
const url = require('url');

const base = 'https://example.com/docs/guide/intro.html';

const page1 = new url.URL('../api/reference.html', base);
console.log(page1.href); 
// 'https://example.com/docs/api/reference.html'

const page2 = new url.URL('/home', base);
console.log(page2.href);
// 'https://example.com/home'
```

### 示例 4: 查询参数处理

```javascript
const url = require('url');

const params = new url.URLSearchParams();
params.set('search', 'javascript');
params.set('category', 'programming');
params.append('tags', 'tutorial');
params.append('tags', 'beginner');

console.log(params.toString());
// 'search=javascript&category=programming&tags=tutorial&tags=beginner'

console.log(params.get('search'));      // 'javascript'
console.log(params.getAll('tags'));     // ['tutorial', 'beginner']
console.log(params.has('category'));    // true
```

---

## 🔗 相关文档

- [WHATWG URL Standard](https://url.spec.whatwg.org/)
- [Node.js URL 文档](https://nodejs.org/api/url.html)
- [MDN URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)
- [goja_nodejs url 模块](https://github.com/dop251/goja_nodejs)

---

## ⚠️ 注意事项

### 1. 只支持 WHATWG URL API

goja_nodejs 实现的是现代 WHATWG URL 标准,不支持 Node.js 旧版 API:

```javascript
// ❌ 不要使用 (会报错)
const url = require('url');
url.parse('https://example.com');  // Error: Object has no member 'parse'

// ✅ 请使用
const myURL = new url.URL('https://example.com');
```

### 2. URL 必须是完整的或有 base

```javascript
// ❌ 错误: 相对 URL 缺少 base
new url.URL('/path');  // 可能报错

// ✅ 正确: 提供 base
new url.URL('/path', 'https://example.com');

// ✅ 或者使用完整 URL
new url.URL('https://example.com/path');
```

### 3. searchParams 自动编码

```javascript
const myURL = new url.URL('https://example.com');
myURL.searchParams.set('name', 'John Doe');

console.log(myURL.search);  // '?name=John+Doe'
console.log(myURL.searchParams.get('name'));  // 'John Doe' (自动解码)
```

---

## 📝 测试统计

- **总测试数**: 8
- **通过**: 8 ✅
- **失败**: 0
- **成功率**: 100%

**最后更新**: 2025-10-03


