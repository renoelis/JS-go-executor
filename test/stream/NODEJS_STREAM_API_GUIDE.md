## Node.js Stream API 完整支持指南

## 🎯 概述

项目现在**同时支持两种 Stream API**：

1. ✅ **Node.js Stream API**（事件风格）- `.on('data')`, `.on('end')`
2. ✅ **Web Streams API**（Promise 风格）- `.getReader().read()`

您可以根据自己的习惯选择任意一种 API！

---

## 🆕 Node.js Stream API（推荐）

### 基本用法

```javascript
const axios = require('axios');

const response = await axios.get(url, { responseType: 'stream' });

// 监听 'data' 事件接收数据
response.data.on('data', (chunk) => {
  console.log('收到数据:', chunk.length, '字节');
});

// 监听 'end' 事件处理完成
response.data.on('end', () => {
  console.log('下载完成');
});

// 监听 'error' 事件处理错误
response.data.on('error', (error) => {
  console.error('错误:', error.message);
});
```

### 完整示例：下载并处理JSON

```javascript
const axios = require('axios');

async function downloadJSON(url) {
  const response = await axios.get(url, { responseType: 'stream' });
  
  return new Promise((resolve, reject) => {
    let chunks = [];
    
    response.data.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    response.data.on('end', () => {
      const data = Buffer.concat(chunks);
      const json = JSON.parse(data.toString('utf-8'));
      resolve(json);
    });
    
    response.data.on('error', reject);
  });
}

// 使用
const data = await downloadJSON('https://api.example.com/data.json');
console.log(data);
```

---

## 📋 支持的 API

### 事件监听

#### `.on(event, callback)`
注册事件监听器（可多次触发）

```javascript
stream.on('data', (chunk) => {
  // 接收数据块（Buffer）
});

stream.on('end', () => {
  // 流结束
});

stream.on('error', (error) => {
  // 错误处理
});

stream.on('close', () => {
  // 流关闭
});
```

**支持链式调用：**
```javascript
stream
  .on('data', handleData)
  .on('end', handleEnd)
  .on('error', handleError);
```

#### `.once(event, callback)`
注册一次性监听器（只触发一次）

```javascript
stream.once('data', (firstChunk) => {
  console.log('第一块数据:', firstChunk.length);
  // 即使后续还有 data 事件，这个回调也不会再执行
});
```

### 流控制

#### `.pause()`
暂停流（停止触发 'data' 事件）

```javascript
stream.on('data', (chunk) => {
  // 处理数据...
  
  if (needPause) {
    stream.pause(); // 暂停
  }
});
```

#### `.resume()`
恢复流（继续触发 'data' 事件）

```javascript
setTimeout(() => {
  stream.resume(); // 恢复
}, 1000);
```

#### `.destroy()`
销毁流（立即停止并清理）

```javascript
stream.destroy();
// 会触发 'close' 事件
```

### 管道传输

#### `.pipe(destination)` *(简化版)*
将流数据导向目标

```javascript
const stream = response.data;
stream.pipe(writableStream);
```

---

## 🆚 两种 API 对比

### Node.js Stream API（事件风格）

```javascript
const res = await axios.get(url, { responseType: 'stream' });

let chunks = [];

res.data.on('data', (chunk) => {
  chunks.push(chunk);
});

res.data.on('end', () => {
  const buffer = Buffer.concat(chunks);
  console.log('完成:', buffer.length);
});

res.data.on('error', (err) => {
  console.error('错误:', err);
});
```

**优点：**
- ✅ 符合 Node.js 习惯
- ✅ 事件驱动，代码清晰
- ✅ 支持 `.pause()` / `.resume()` 流控制
- ✅ 与 Node.js 生态兼容

**适用场景：**
- Node.js 开发者
- 需要流控制（暂停/恢复）
- 复杂的流处理逻辑

---

### Web Streams API（Promise 风格）

```javascript
const res = await axios.get(url, { responseType: 'stream' });

const reader = res.data.getReader();
let chunks = [];

while (true) {
  const { done, value } = await reader.read();
  if (value) chunks.push(Buffer.from(value));
  if (done) break;
}

const buffer = Buffer.concat(chunks);
console.log('完成:', buffer.length);
```

**优点：**
- ✅ 符合 Web 标准
- ✅ async/await 语法
- ✅ 浏览器兼容
- ✅ 与 FormData 集成（`formData.append('file', stream)`）

**适用场景：**
- Web 开发者
- 需要浏览器兼容
- 需要与 FormData 集成

---

## 💡 使用建议

### 何时使用 Node.js Stream API？

**推荐场景：**
1. ✅ **文件下载并处理**
```javascript
response.data
  .on('data', chunk => process(chunk))
  .on('end', () => finish());
```

2. ✅ **需要流控制**
```javascript
stream.on('data', chunk => {
  if (缓冲区满) {
    stream.pause(); // 暂停
    // 等待缓冲区清空后...
    stream.resume(); // 恢复
  }
});
```

3. ✅ **与 Node.js 库集成**
```javascript
const fs = require('fs');
response.data.pipe(fs.createWriteStream('file.pdf'));
```

### 何时使用 Web Streams API？

**推荐场景：**
1. ✅ **简单的流式读取**
```javascript
const reader = response.data.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  process(value);
}
```

2. ✅ **FormData 集成**
```javascript
const formData = new FormData();
formData.append('file', response.data); // 直接传 stream
```

3. ✅ **浏览器风格代码**
```javascript
// 与浏览器 Fetch API 一致
const response = await fetch(url);
const reader = response.body.getReader();
```

---

## 🔍 实际使用案例

### 案例 1：下载大文件（Node.js 风格）

```javascript
const axios = require('axios');
const fs = require('fs');

async function downloadFile(url, outputPath) {
  const response = await axios.get(url, { responseType: 'stream' });
  
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(outputPath);
    let downloadedBytes = 0;
    
    response.data.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      console.log(`已下载: ${downloadedBytes} 字节`);
    });
    
    response.data.on('end', () => {
      console.log('下载完成！');
      resolve(downloadedBytes);
    });
    
    response.data.on('error', reject);
    
    // 写入文件
    response.data.pipe(writer);
  });
}

// 使用
await downloadFile('https://example.com/large-file.pdf', './file.pdf');
```

### 案例 2：流式处理 + 限流（Node.js 风格）

```javascript
const axios = require('axios');

async function processStreamWithBackpressure(url) {
  const response = await axios.get(url, { responseType: 'stream' });
  
  let processing = false;
  
  response.data.on('data', async (chunk) => {
    if (processing) {
      response.data.pause(); // 暂停接收
    }
    
    processing = true;
    await processChunk(chunk); // 耗时操作
    processing = false;
    
    response.data.resume(); // 恢复接收
  });
  
  response.data.on('end', () => {
    console.log('处理完成');
  });
}

async function processChunk(chunk) {
  // 模拟耗时处理
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('处理了', chunk.length, '字节');
}
```

### 案例 3：文件上传（Web Streams + FormData）

```javascript
const axios = require('axios');
const FormData = require('form-data');

async function uploadFile(downloadUrl, uploadUrl) {
  // 1. 流式下载
  const res = await axios.get(downloadUrl, { responseType: 'stream' });
  
  // 2. 直接传入 FormData（Web Streams 特性）
  const formData = new FormData();
  formData.append('file', res.data);
  
  // 3. 上传
  const result = await axios.post(uploadUrl, formData, {
    headers: { ...formData.getHeaders() }
  });
  
  return result.data;
}
```

---

## 🎯 迁移指南

### 从手动读取流迁移到 Node.js API

**旧代码（手动）：**
```javascript
const res = await axios.get(url, { responseType: 'stream' });
const reader = res.data.getReader();

let chunks = [];
while (true) {
  const { done, value } = await reader.read();
  if (value) chunks.push(Buffer.from(value));
  if (done) break;
}

const buffer = Buffer.concat(chunks);
```

**新代码（Node.js API）：**
```javascript
const res = await axios.get(url, { responseType: 'stream' });

return new Promise((resolve) => {
  let chunks = [];
  
  res.data
    .on('data', chunk => chunks.push(chunk))
    .on('end', () => resolve(Buffer.concat(chunks)));
});
```

**改进：**
- 代码更简洁（从 8 行减少到 6 行）
- 更符合 Node.js 习惯
- 自动处理流控制

---

## 📊 性能对比

| 特性 | Node.js API | Web Streams API |
|------|-------------|-----------------|
| **代码量** | 少 ✅ | 多 |
| **内存占用** | 低 ✅ | 低 ✅ |
| **易用性** | 高（事件）✅ | 中（Promise）|
| **流控制** | 支持 ✅ | 不支持 |
| **FormData 集成** | 支持 ✅ | 支持 ✅ |
| **浏览器兼容** | 不适用 | 兼容 ✅ |

---

## ✅ 最佳实践

### 1. 始终监听 'error' 事件

```javascript
// ✅ 正确
stream.on('data', handleData);
stream.on('end', handleEnd);
stream.on('error', handleError); // 必需

// ❌ 错误：不监听 error，可能导致未捕获异常
stream.on('data', handleData);
stream.on('end', handleEnd);
```

### 2. 使用 Promise 包装（推荐）

```javascript
function streamToPromise(stream) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// 使用
const buffer = await streamToPromise(response.data);
```

### 3. 及时清理资源

```javascript
try {
  // 使用 stream...
} catch (error) {
  stream.destroy(); // 清理
  throw error;
}
```

---

## 🎉 总结

现在您可以：

1. ✅ 使用 **Node.js 风格** `.on('data')` / `.on('end')`
2. ✅ 使用 **Web Streams 风格** `.getReader().read()`
3. ✅ 直接将 stream 传入 **FormData**
4. ✅ 使用 **流控制** `.pause()` / `.resume()`
5. ✅ 完全兼容 **真实 Node.js** 的用法

**两种 API 共存，任您选择！** 🚀

---

## 📚 相关文档

- [AXIOS_STREAM_GUIDE.md](./AXIOS_STREAM_GUIDE.md) - Axios Stream 基础指南
- [FORMDATA_STREAM_GUIDE.md](./FORMDATA_STREAM_GUIDE.md) - FormData + Stream 集成
- [STREAM_SUPPORT_IMPLEMENTATION.md](../../STREAM_SUPPORT_IMPLEMENTATION.md) - 实现细节

---

**享受 Node.js 风格的流式处理吧！** 🎉



