# Axios 流式响应支持指南

## 📋 功能概述

**版本**: v1.2  
**更新日期**: 2025-10-06  
**更新类型**: 新功能（向后兼容）

现在 axios 支持 `responseType: 'stream'`，可以流式读取大文件，避免内存占用过高。

## 🎯 使用场景

### 适用场景

1. **大文件下载**（> 50MB）
   - Excel 文件处理
   - 大型 JSON 数据
   - 二进制文件下载

2. **流式数据处理**
   - 边下载边处理
   - 实时进度显示
   - 内存优化

3. **配合 xlsx 流式 API**
   - `xlsx.readStream()` 批量处理
   - 大表格分批加载

### 不适用场景

- 小文件（< 10MB）：使用普通模式更简单
- 需要重试的场景：流式读取后无法重试

## 📚 基本用法

### 1. 流式读取基础

```javascript
const axios = require('axios');

// 发起流式请求
const response = await axios.get(url, { 
  responseType: 'stream' 
});

// 获取流读取器
const reader = response.data.getReader();

// 逐块读取
while (true) {
  const { done, value } = await reader.read();
  
  if (done) {
    console.log('读取完成');
    break;
  }
  
  // value 是 Uint8Array
  console.log(`读取了 ${value.length} 字节`);
  
  // 转换为 Buffer
  const buffer = Buffer.from(value);
  
  // 处理数据...
}
```

### 2. 一次性读取全部数据

```javascript
const response = await axios.get(url, { 
  responseType: 'stream' 
});

const reader = response.data.getReader();
let chunks = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(Buffer.from(value));
}

// 合并所有数据
const allData = Buffer.concat(chunks);
```

### 3. 配合 xlsx 使用

#### 方式 A: 读取全部后处理

```javascript
const axios = require('axios');
const xlsx = require('xlsx');

// 1. 流式下载
const response = await axios.get(excelUrl, { 
  responseType: 'stream' 
});

const reader = response.data.getReader();
let chunks = [];

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(Buffer.from(value));
}

// 2. 合并数据
const buffer = Buffer.concat(chunks);

// 3. 解析 Excel
const workbook = xlsx.read(buffer);
const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);

console.log(`读取了 ${data.length} 行数据`);
```

#### 方式 B: 批量流式处理

```javascript
const axios = require('axios');
const xlsx = require('xlsx');

// 1. 流式下载
const response = await axios.get(excelUrl, { 
  responseType: 'stream' 
});

const reader = response.data.getReader();
let chunks = [];

// 2. 边下载边收集
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  chunks.push(Buffer.from(value));
  
  // 可选：显示进度
  const totalBytes = chunks.reduce((sum, c) => sum + c.length, 0);
  console.log(`已下载: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
}

// 3. 合并后批量处理
const buffer = Buffer.concat(chunks);

// 4. 使用 xlsx 批量读取
xlsx.readStream(buffer, 'Sheet1', (rows, startIndex) => {
  console.log(`处理第 ${startIndex} - ${startIndex + rows.length} 行`);
  
  rows.forEach(row => {
    // 处理每一行
    console.log(row);
  });
}, { batchSize: 1000 });
```

## 🆚 对比：流式 vs 非流式

### 非流式模式（原有方式）

```javascript
// ✅ 适合小文件（< 50MB）
const response = await axios.get(url, { 
  responseType: 'arraybuffer' 
});

// 一次性加载全部数据到内存
const workbook = xlsx.read(response.data);
```

**优点**：
- 代码简单
- 可以重试
- 支持所有操作

**缺点**：
- 内存占用高
- 大文件可能导致 OOM

### 流式模式（新增）

```javascript
// ✅ 适合大文件（> 50MB）
const response = await axios.get(url, { 
  responseType: 'stream' 
});

// 分块读取，内存占用低
const reader = response.data.getReader();
// ... 分块处理
```

**优点**：
- 内存占用低
- 支持超大文件
- 可以边下载边处理

**缺点**：
- 代码复杂一些
- 无法重试（已读取的数据无法回退）

## 📊 性能建议

| 文件大小 | 推荐模式 | 理由 |
|---------|---------|------|
| < 10MB  | 非流式 | 简单快速，内存占用可接受 |
| 10-50MB | 看需求 | 如果内存充足，非流式更简单 |
| > 50MB  | 流式 | 避免内存溢出，必须使用流式 |

## 🔍 完整示例

### 示例 1: 下载大型 Excel 并处理

```javascript
const axios = require('axios');
const xlsx = require('xlsx');

return new Promise(async (resolve, reject) => {
  try {
    console.log('开始下载 Excel 文件...');
    
    // 1. 流式下载
    const response = await axios.get(
      'https://example.com/large-file.xlsx',
      { responseType: 'stream' }
    );
    
    console.log(`状态码: ${response.status}`);
    console.log(`文件类型: ${response.headers['content-type']}`);
    
    // 2. 读取流
    const reader = response.data.getReader();
    let chunks = [];
    let totalBytes = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('✅ 下载完成');
        break;
      }
      
      const buffer = Buffer.from(value);
      chunks.push(buffer);
      totalBytes += buffer.length;
      
      // 显示进度
      console.log(`已下载: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    }
    
    // 3. 合并数据
    const excelBuffer = Buffer.concat(chunks);
    console.log(`总大小: ${(excelBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    // 4. 解析 Excel
    const workbook = xlsx.read(excelBuffer);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    console.log(`✅ 成功读取 ${data.length} 行数据`);
    console.log('前 5 行数据:', data.slice(0, 5));
    
    resolve({
      success: true,
      rows: data.length,
      size: excelBuffer.length,
      data: data
    });
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    reject(error);
  }
});
```

### 示例 2: 带进度条的下载

```javascript
const axios = require('axios');

return new Promise(async (resolve, reject) => {
  try {
    const url = 'https://example.com/large-file.xlsx';
    
    // 1. 获取文件大小（可选）
    const headResponse = await axios.head(url);
    const totalSize = parseInt(headResponse.headers['content-length'] || '0');
    
    console.log(`文件总大小: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 2. 流式下载
    const response = await axios.get(url, { responseType: 'stream' });
    const reader = response.data.getReader();
    
    let chunks = [];
    let downloadedBytes = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const buffer = Buffer.from(value);
      chunks.push(buffer);
      downloadedBytes += buffer.length;
      
      // 计算进度
      const progress = totalSize > 0 
        ? ((downloadedBytes / totalSize) * 100).toFixed(2) 
        : '未知';
      
      console.log(`下载进度: ${progress}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    console.log('✅ 下载完成！');
    
    const allData = Buffer.concat(chunks);
    resolve({
      success: true,
      size: allData.length,
      data: allData
    });
    
  } catch (error) {
    console.error('❌ 下载失败:', error.message);
    reject(error);
  }
});
```

## ⚠️ 注意事项

1. **流只能读取一次**
   - 读取后无法回退
   - 如果需要重试，请使用非流式模式

2. **内存管理**
   - 虽然流式读取，但如果合并所有 chunks，还是会占用内存
   - 真正节省内存需要边读边处理，不要全部存储

3. **错误处理**
   ```javascript
   try {
     const reader = response.data.getReader();
     while (true) {
       const { done, value } = await reader.read();
       if (done) break;
       // 处理...
     }
   } catch (error) {
     console.error('读取失败:', error);
     // 流式读取失败后无法重试
   }
   ```

4. **兼容性**
   - 新功能，确保使用最新版本
   - 旧代码使用 `responseType: 'arraybuffer'` 仍然有效

## 🚀 最佳实践

### 1. 优先使用非流式（简单场景）

```javascript
// ✅ 推荐：小文件直接使用 arraybuffer
const response = await axios.get(url, { responseType: 'arraybuffer' });
const workbook = xlsx.read(response.data);
```

### 2. 大文件必须流式

```javascript
// ✅ 推荐：大文件使用流式
const response = await axios.get(url, { responseType: 'stream' });
// 分块处理...
```

### 3. 提供进度反馈

```javascript
// ✅ 推荐：显示下载进度
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // 更新进度
  console.log(`进度: ${progress}%`);
}
```

## 📖 API 参考

### axios 配置

```javascript
{
  responseType: 'stream',  // 启用流式响应
  // 其他配置...
}
```

### ReadableStream API

```javascript
// 获取读取器
const reader = response.data.getReader();

// 读取数据块
const { done, value } = await reader.read();
// done: boolean - 是否读取完成
// value: Uint8Array - 数据块（如果 done=true，则为 undefined）

// 取消流
await reader.cancel();
```

## 🔗 相关文档

- [xlsx 模块文档](../xlsx/README.md)
- [axios 完整 API](../../API接口完整文档.md)
- [性能优化指南](../../PRODUCTION_OPTIMIZATION_200_RUNTIMES.md)

## 📝 更新日志

### v1.2 (2025-10-06)

- ✨ 新增 `responseType: 'stream'` 支持
- ✨ 实现 ReadableStream API
- ✨ 支持流式读取大文件
- ✨ 配合 xlsx 流式处理
- 📝 添加完整使用文档
- ✅ 向后兼容，不影响现有代码

## 🆘 故障排查

### 问题 1: "getReader is not a function"

**原因**: response.data 不是流对象

**解决**:
```javascript
// ❌ 错误
responseType: 'arraybuffer'  // 这不是流

// ✅ 正确
responseType: 'stream'  // 这才是流
```

### 问题 2: 流读取失败

**原因**: 网络中断或超时

**解决**:
```javascript
try {
  const { done, value } = await reader.read();
  // 处理...
} catch (error) {
  console.error('读取失败，无法重试');
  // 流式读取失败后，需要重新发起请求
}
```

### 问题 3: 内存占用仍然很高

**原因**: 虽然流式读取，但把所有 chunks 都存储了

**解决**:
```javascript
// ❌ 错误：还是存储了所有数据
let chunks = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(value);  // 还是占用内存！
}

// ✅ 正确：边读边处理，不存储
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // 立即处理，不存储
  processChunk(value);
}
```

## 💡 总结

- ✅ 小文件（< 50MB）：使用 `responseType: 'arraybuffer'`
- ✅ 大文件（> 50MB）：使用 `responseType: 'stream'`
- ✅ 需要进度显示：使用流式模式
- ✅ 配合 xlsx：两种模式都支持

**关键原则**: 根据文件大小选择合适的模式，优先使用简单模式！



