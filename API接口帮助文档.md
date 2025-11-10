调用本接口，执行JavaScript代码并返回结果

## 权限说明
调用本接口前，确保您已获取到有效的访问令牌（accessToken）。

令牌格式示例：
```
flow_d3f9b65725704d0f8324df7c58ce89cd46bdb44a94c77b85615526cfc961c1e7
```

如需申请令牌或遇到权限问题，请联系管理员。

## 请求
请求方式：POST

### 接口地址
接口请求路径：

```
POST /flow/codeblock
```

**请求头（Header）**

| 参数 | 必须 | 说明 |
| :---: | :---: | :---: |
| accessToken | 是 | 调用接口凭证 |
| Content-Type | 是 | 固定值：application/json |
| X-Request-ID | 否 | 自定义请求ID（可选） |

## 请求体（Body）

| 参数 | 必须 | 类型 | 说明 |
| :---: | :---: | :---: | :---: |
| input | 是 | object | 输入数据（任意JSON对象），大小 < 1MB |
| codebase64 | 是 | string | Base64编码的JavaScript代码，解码后 < 64KB |

请求示例：

```json
{
  "input": {
    "age": 25,
    "name": "张三"
  },
  "codebase64": "cmV0dXJuIHsgcmVzdWx0OiBpbnB1dC5hZ2UgKiAyLCBtZXNzYWdlOiBgSGVsbG8sICR7aW5wdXQubmFtZX0hYCB9Ow=="
}
```

### input 参数说明
input 可以是任意合法的JSON对象，在代码中通过 input 变量直接访问。

示例：
```javascript
// 在代码中访问 input
const userName = input.name;      // "张三"
const userAge = input.age;        // 25
```

### codebase64 参数说明
JavaScript代码经过Base64编码后的字符串。

编码方式：

| 环境 | 编码方法 |
| :---: | :---: |
| Node.js | Buffer.from(code).toString('base64') |
| 浏览器 | btoa(code) |
| 命令行 | echo -n "code" \| base64 |
| Python | base64.b64encode(code.encode()).decode() |

## 返回
### 成功返回

| 参数 | 必含 | 类型 | 说明 |
| :---: | :---: | :---: | :---: |
| success | 是 | boolean | 固定值：true |
| result | 是 | any | 代码返回的结果 |
| timing | 是 | object | 执行时间统计 |
| timing.executionTime | 是 | number | 代码执行耗时（毫秒） |
| timing.totalTime | 是 | number | 总耗时（毫秒） |
| timestamp | 是 | string | 执行时间（东八区） |
| request_id | 是 | string | 请求唯一标识（UUID格式） |

成功返回示例：

```json
{
  "success": true,
  "result": {
    "result": 50,
    "message": "Hello, 张三!"
  },
  "timing": {
    "executionTime": 12,
    "totalTime": 15
  },
  "timestamp": "2025-10-07 16:30:00",
  "request_id": "96ff0a85-d8dd-440a-923f-59690bcb8e0d"
}
```

### 失败返回

| 参数 | 必含 | 类型 | 说明 |
| :---: | :---: | :---: | :---: |
| success | 是 | boolean | 固定值：false |
| error | 是 | object | 错误信息 |
| error.type | 是 | string | 错误类型 |
| error.message | 是 | string | 错误描述 |
| timing | 是 | object | 执行时间统计 |
| timestamp | 是 | string | 执行时间 |
| request_id | 是 | string | 请求唯一标识 |

失败返回示例：

```json
{
  "success": false,
  "error": {
    "type": "SyntaxError",
    "message": "Unexpected token '}'"
  },
  "timing": {
    "executionTime": 0,
    "totalTime": 3
  },
  "timestamp": "2025-10-07 16:30:00",
  "request_id": "96ff0a85-d8dd-440a-923f-59690bcb8e0d"
}
```

### 错误类型说明

| error.type | 说明 | 常见原因 |
| :---: | :---: | :---: |
| SyntaxError | 语法错误 | 代码语法不正确 |
| ReferenceError | 引用错误 | 使用了未定义的变量 |
| TypeError | 类型错误 | 操作类型不匹配 |
| TimeoutError | 超时错误 | 执行时间超过60秒 |
| ValidationError | 参数错误 | 请求参数格式不正确 |
| AuthenticationError | 认证失败 | Token无效或已过期 |

### HTTP 状态码

| 状态码 | 说明 | 处理建议 |
| :---: | :---: | :---: |
| 200 | 成功 | 正常处理响应 |
| 400 | 请求参数错误 | 检查请求格式和参数 |
| 401 | Token认证失败 | 检查accessToken是否正确 |
| 403 | Token已过期或无权限 | 联系管理员续期或更换Token |
| 429 | 请求过于频繁 | 降低请求频率，等待后重试 |
| 500 | 服务器内部错误 | 联系技术支持，提供request_id |
| 503 | 服务暂时不可用 | 稍后重试 |

## 调用示例

### 示例1：简单计算

JavaScript代码：
```javascript
return {
  sum: input.a + input.b,
  product: input.a * input.b
};
```

完整请求：
```bash
curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {"a": 10, "b": 20},
    "codebase64": "cmV0dXJuIHsgc3VtOiBpbnB1dC5hICsgaW5wdXQuYiwgcHJvZHVjdDogaW5wdXQuYSAqIGlucHV0LmIgfTs="
  }'
```

返回结果：
```json
{
  "success": true,
  "result": {
    "sum": 30,
    "product": 200
  },
  "timing": {
    "executionTime": 3,
    "totalTime": 5
  },
  "timestamp": "2025-10-07 16:30:00",
  "request_id": "a1b2c3d4-..."
}
```

### 示例2：HTTP请求（使用fetch）

JavaScript代码：
```javascript
const response = await fetch('https://api.github.com/users/octocat');
const data = await response.json();

return {
  username: data.login,
  name: data.name,
  followers: data.followers
};
```

完整请求：
```bash
CODE=$(cat << 'EOF'
const response = await fetch('https://api.github.com/users/octocat');
const data = await response.json();
return {
  username: data.login,
  name: data.name,
  followers: data.followers
};
EOF
)

CODE_BASE64=$(echo -n "$CODE" | base64)

curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_your_token_here" \
  -H "Content-Type: application/json" \
  -d "{
    \"input\": {},
    \"codebase64\": \"$CODE_BASE64\"
  }"
```

返回结果：
```json
{
  "success": true,
  "result": {
    "username": "octocat",
    "name": "The Octocat",
    "followers": 12345
  },
  "timing": {
    "executionTime": 450,
    "totalTime": 455
  },
  "timestamp": "2025-10-07 16:30:00",
  "request_id": "b2c3d4e5-..."
}
```

### 示例3：HTTP请求（使用axios）

JavaScript代码：
```javascript
const axios = require('axios');

const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');

return {
  postId: response.data.id,
  title: response.data.title,
  statusCode: response.status
};
```

Node.js调用示例：
```javascript
const axios = require('axios');

const code = `
const axios = require('axios');
const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
return {
  postId: response.data.id,
  title: response.data.title,
  statusCode: response.status
};
`;

const codebase64 = Buffer.from(code).toString('base64');

const response = await axios.post('http://localhost:3002/flow/codeblock', {
  input: {},
  codebase64
}, {
  headers: {
    'accessToken': 'flow_your_token_here',
    'Content-Type': 'application/json'
  }
});

console.log(response.data);
```

返回结果：
```json
{
  "success": true,
  "result": {
    "postId": 1,
    "title": "sunt aut facere repellat provident occaecati...",
    "statusCode": 200
  },
  "timing": {
    "executionTime": 320,
    "totalTime": 325
  },
  "timestamp": "2025-10-07 16:30:00",
  "request_id": "c3d4e5f6-..."
}
```

### 示例4：数据处理（使用lodash）

JavaScript代码：
```javascript
const _ = require('lodash');

const users = input.users;

// 按年龄分组
const groupedByAge = _.groupBy(users, 'age');

// 计算平均年龄
const avgAge = _.meanBy(users, 'age');

// 过滤活跃用户
const activeUsers = _.filter(users, { isActive: true });

return {
  groupedByAge,
  avgAge,
  activeCount: activeUsers.length
};
```

完整请求：
```bash
curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "users": [
        {"name": "张三", "age": 25, "isActive": true},
        {"name": "李四", "age": 30, "isActive": false},
        {"name": "王五", "age": 25, "isActive": true}
      ]
    },
    "codebase64": "Y29uc3QgXyA9IHJlcXVpcmUoJ2xvZGFzaCcpOw0KY29uc3QgdXNlcnMgPSBpbnB1dC51c2VyczsNCmNvbnN0IGdyb3VwZWRCeUFnZSA9IF8uZ3JvdXBCeSh1c2VycywgJ2FnZScpOw0KY29uc3QgYXZnQWdlID0gXy5tZWFuQnkodXNlcnMsICdhZ2UnKTsNCmNvbnN0IGFjdGl2ZVVzZXJzID0gXy5maWx0ZXIodXNlcnMsIHsgaXNBY3RpdmU6IHRydWUgfSk7DQpyZXR1cm4geyBncm91cGVkQnlBZ2UsIGF2Z0FnZSwgYWN0aXZlQ291bnQ6IGFjdGl2ZVVzZXJzLmxlbmd0aCB9Ow=="
  }'
```

返回结果：
```json
{
  "success": true,
  "result": {
    "groupedByAge": {
      "25": [
        {"name": "张三", "age": 25, "isActive": true},
        {"name": "王五", "age": 25, "isActive": true}
      ],
      "30": [
        {"name": "李四", "age": 30, "isActive": false}
      ]
    },
    "avgAge": 26.67,
    "activeCount": 2
  },
  "timing": {
    "executionTime": 8,
    "totalTime": 12
  },
  "timestamp": "2025-10-07 16:30:00",
  "request_id": "d4e5f6g7-..."
}
```

### 示例5：数据加密（使用crypto-js）

JavaScript代码：
```javascript
const CryptoJS = require('crypto-js');

const text = input.text;
const password = input.password;

// AES加密
const encrypted = CryptoJS.AES.encrypt(text, password).toString();

// AES解密（验证）
const decrypted = CryptoJS.AES.decrypt(encrypted, password).toString(CryptoJS.enc.Utf8);

// MD5哈希
const md5Hash = CryptoJS.MD5(text).toString();

return {
  encrypted,
  decrypted,
  md5Hash,
  matches: text === decrypted
};
```

完整请求：
```bash
curl -X POST http://localhost:3002/flow/codeblock \
  -H "accessToken: flow_your_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "text": "Hello, World!",
      "password": "my-secret-key"
    },
    "codebase64": "Y29uc3QgQ3J5cHRvSlMgPSByZXF1aXJlKCdjcnlwdG8tanMnKTsNCmNvbnN0IHRleHQgPSBpbnB1dC50ZXh0Ow0KY29uc3QgcGFzc3dvcmQgPSBpbnB1dC5wYXNzd29yZDsNCmNvbnN0IGVuY3J5cHRlZCA9IENyeXB0b0pTLkFFUy5lbmNyeXB0KHRleHQsIHBhc3N3b3JkKS50b1N0cmluZygpOw0KY29uc3QgZGVjcnlwdGVkID0gQ3J5cHRvSlMuQUVTLmRlY3J5cHQoZW5jcnlwdGVkLCBwYXNzd29yZCkudG9TdHJpbmcoQ3J5cHRvSlMuZW5jLlV0ZjgpOw0KY29uc3QgbWQ1SGFzaCA9IENyeXB0b0pTLk1ENSh0ZXh0KS50b1N0cmluZygpOw0KcmV0dXJuIHsgZW5jcnlwdGVkLCBkZWNyeXB0ZWQsIG1kNUhhc2gsIG1hdGNoZXM6IHRleHQgPT09IGRlY3J5cHRlZCB9Ow=="
  }'
```

返回结果：
```json
{
  "success": true,
  "result": {
    "encrypted": "U2FsdGVkX1+xT4...",
    "decrypted": "Hello, World!",
    "md5Hash": "65a8e27d8879283831b664bd8b7f0ad4",
    "matches": true
  },
  "timing": {
    "executionTime": 15,
    "totalTime": 18
  },
  "timestamp": "2025-10-07 16:30:00",
  "request_id": "e5f6g7h8-..."
}
```

### 示例6：多接口串联

JavaScript代码：
```javascript
// 第一步：获取用户信息
const userResponse = await fetch(`https://api.example.com/users/${input.userId}`);
const user = await userResponse.json();

// 第二步：获取用户订单
const ordersResponse = await fetch(`https://api.example.com/orders?userId=${input.userId}`);
const orders = await ordersResponse.json();

// 第三步：计算总金额
const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0);

// 返回汇总结果
return {
  user: {
    id: user.id,
    name: user.name,
    email: user.email
  },
  orderCount: orders.length,
  totalAmount,
  avgOrderAmount: totalAmount / orders.length
};
```

## 限流策略

### IP级别限流（智能切换）

| 状态 | 限流策略 | 说明 |
| :---: | :---: | :---: |
| 认证失败 | 50 QPS，突发100 | 严格限制未认证流量 |
| 认证成功 | 200 QPS，突发400 | 宽松限制已认证流量 |

### Token级别限流

| 参数 | 默认值 | 说明 |
| :---: | :---: | :---: |
| 每分钟限制 | 60次 | 可在创建Token时自定义 |
| 突发限制 | 10次 | 可在创建Token时自定义 |
| 限流窗口 | 60秒 | 可在创建Token时自定义 |

自定义限流参数示例：
```json
{
  "ws_id": "workspace_001",
  "email": "user@example.com",
  "operation": "add",
  "days": 365,
  "rate_limit_per_minute": 120,
  "rate_limit_burst": 20,
  "rate_limit_window_seconds": 60
}
```

超限响应：
```json
{
  "error": "Too Many Requests",
  "message": "已超过速率限制，请稍后重试",
  "retry_after": 30
}
```

## 内置模块

系统内置以下模块，可以直接使用 require() 引入：

| 模块名 | 说明 | 示例 |
| :---: | :---: | :---: |
| axios | HTTP客户端 | const axios = require('axios'); |
| lodash | 数据处理工具库 | const _ = require('lodash'); |
| crypto-js | 加密库 | const CryptoJS = require('crypto-js'); |
| date-fns | 日期处理库 | const dateFns = require('date-fns'); |
| uuid | UUID生成器 | const uuid = require('uuid'); |
| qs | 查询字符串解析 | const qs = require('qs'); |
| xlsx | Excel处理库 | const xlsx = require('xlsx'); |
| pinyin | 拼音转换库 | const pinyin = require('pinyin'); |

## 注意事项

### 代码编写要求

1. 代码必须包含 return 语句返回结果
   ```javascript
   // 错误示例
   const result = input.a + input.b;
   
   // 正确示例
   return input.a + input.b;
   ```

2. 返回值不能是 undefined
   ```javascript
   // 错误示例
   return undefined;
   return;
   
   // 正确示例
   return null;
   return {};
   return { message: "执行完成" };
   ```

3. 生产环境禁止使用 console.log()
   ```javascript
   // 错误示例（会报错：console is not defined）
   console.log('debug info');
   
   // 正确示例（通过return返回调试信息）
   return {
     result: calculatedValue,
     debug: {
       step1: intermediateValue1,
       step2: intermediateValue2
     }
   };
   ```

4. 支持 ES6+ 语法（箭头函数、解构、模板字符串等）
   ```javascript
   // 正确示例
   const { name, age } = input;
   const message = `${name}的年龄是${age}岁`;
   const doubled = input.numbers.map(n => n * 2);
   return { message, doubled };
   ```

5. 支持 async/await 异步操作
   ```javascript
   // 正确示例
   const response = await fetch(input.url);
   const data = await response.json();
   return data;
   ```

### 限制说明

1. input参数大小限制：< 1MB
2. codebase64解码后代码大小限制：< 64KB
3. 代码执行超时时间：60秒
4. 限流保护：Token级别和IP级别双重限流

### 性能优化建议

1. 并行执行多个异步请求
   ```javascript
   // 不推荐：串行执行
   const user = await fetch('/api/user/1').then(r => r.json());
   const posts = await fetch('/api/posts?userId=1').then(r => r.json());
   
   // 推荐：并行执行
   const [user, posts] = await Promise.all([
     fetch('/api/user/1').then(r => r.json()),
     fetch('/api/posts?userId=1').then(r => r.json())
   ]);
   ```

2. 避免在代码中硬编码敏感信息
   ```javascript
   // 不推荐：硬编码密钥
   const apiKey = 'sk-1234567890abcdef';
   
   // 推荐：从input参数传入
   const apiKey = input.apiKey;
   ```

3. 验证输入数据
   ```javascript
   // 推荐：验证输入数据
   if (!input.userId || typeof input.userId !== 'number') {
     return {
       error: 'Invalid userId',
       message: 'userId必须是数字'
     };
   }
   ```

### 错误处理建议

1. 使用 try-catch 捕获错误
   ```javascript
   try {
     const response = await fetch(input.url);
     const data = await response.json();
     return { success: true, data };
   } catch (error) {
     return {
       success: false,
       error: {
         message: error.message,
         url: input.url
       }
     };
   }
   ```

2. 遇到问题时记录 request_id
   request_id 是请求的唯一标识，联系技术支持时请提供此信息，方便快速定位问题。

3. 实现重试机制应对限流
   ```javascript
   // 重试示例（Node.js）
   async function executeWithRetry(requestData, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await axios.post('http://localhost:3002/flow/codeblock', requestData, {
           headers: { 'accessToken': 'your_token' }
         });
         return response.data;
       } catch (error) {
         if (error.response?.status === 429) {
           const retryAfter = error.response.data.retry_after || 30;
           await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
         } else {
           throw error;
         }
       }
     }
     throw new Error('重试次数已用完');
   }
   ```

### 安全防护

系统已内置5层安全防护：
1. 沙箱隔离：代码运行在隔离环境中
2. SSRF防护：自动拦截内网访问
3. 资源限制：限制内存和执行时间
4. 敏感API禁用：禁用file系统、process等危险API
5. 限流保护：防止滥用

### 相关文档

- Flow-CodeBlock帮助文档：完整的功能介绍和使用指南
- 代码编写规则：详细的代码规范和模块说明
- API接口完整文档：所有接口的详细说明

如有疑问，请联系技术支持团队。
