# Axios 流式响应测试

## 📁 文件说明

### 测试文件

1. **example-simple.js** - 简单示例
   - 基本的流式读取演示
   - 适合快速了解用法
   - 运行时间: ~1 秒

2. **test-axios-stream.js** - 完整测试
   - 包含 3 个测试场景
   - 测试流式 API 完整性
   - 与 xlsx 模块集成测试
   - 运行时间: ~5 秒

### 文档文件

1. **AXIOS_STREAM_GUIDE.md** - 使用指南
   - 完整的 API 文档
   - 使用场景说明
   - 代码示例
   - 故障排查

## 🚀 快速开始

### 方式 1: 使用测试工具（推荐）

1. 启动服务：
   ```bash
   cd /Users/Code/Go-product/Flow-codeblock_goja
   ./start.sh
   ```

2. 打开测试工具：
   ```
   http://localhost:8080/test-tool
   ```

3. 复制并运行示例：
   - 简单示例: `test/stream/example-simple.js`
   - 完整测试: `test/stream/test-axios-stream.js`

### 方式 2: 使用 API

```bash
# 运行简单示例
curl -X POST http://localhost:8080/api/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Token: your-token" \
  -d '{
    "code": "$(cat test/stream/example-simple.js)",
    "timeout": 30000
  }'
```

## 📚 示例代码

### 最简示例

```javascript
const axios = require('axios');

// 发起流式请求
const response = await axios.get(url, { 
  responseType: 'stream' 
});

// 读取数据
const reader = response.data.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  console.log(`读取了 ${value.length} 字节`);
}
```

### 配合 xlsx 使用

```javascript
const axios = require('axios');
const xlsx = require('xlsx');

// 1. 流式下载 Excel
const response = await axios.get(excelUrl, { 
  responseType: 'stream' 
});

// 2. 读取所有数据
const reader = response.data.getReader();
let chunks = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  chunks.push(Buffer.from(value));
}

// 3. 解析 Excel
const buffer = Buffer.concat(chunks);
const workbook = xlsx.read(buffer);
const data = xlsx.utils.sheet_to_json(workbook.Sheets['Sheet1']);

console.log(`读取了 ${data.length} 行数据`);
```

## 🆚 对比

### 非流式模式（原有）

```javascript
// 适合小文件（< 50MB）
const response = await axios.get(url, { 
  responseType: 'arraybuffer' 
});

const workbook = xlsx.read(response.data);
```

**优点**: 简单  
**缺点**: 内存占用高

### 流式模式（新增）

```javascript
// 适合大文件（> 50MB）
const response = await axios.get(url, { 
  responseType: 'stream' 
});

const reader = response.data.getReader();
// 分块读取...
```

**优点**: 内存占用低  
**缺点**: 代码稍复杂

## 📊 性能建议

| 文件大小 | 推荐模式 |
|---------|---------|
| < 10MB  | 非流式（arraybuffer）|
| 10-50MB | 看需求 |
| > 50MB  | 流式（stream）|

## ⚠️ 注意事项

1. **流只能读取一次**
   - 读取后无法回退
   - 如果需要重试，请重新发起请求

2. **向后兼容**
   - 旧代码使用 `responseType: 'arraybuffer'` 不受影响
   - 新功能为可选增强

3. **内存管理**
   - 虽然流式读取，但如果存储所有 chunks，还是会占用内存
   - 真正节省内存需要边读边处理

## 🔗 相关文档

- [完整使用指南](AXIOS_STREAM_GUIDE.md)
- [实现总结](../../STREAM_SUPPORT_IMPLEMENTATION.md)
- [xlsx 文档](../xlsx/README.md)

## 📝 更新日志

### v1.2 (2025-10-06)

- ✨ 新增 `responseType: 'stream'` 支持
- ✨ 实现 ReadableStream API
- ✨ 支持流式读取大文件
- ✅ 向后兼容

## 🆘 常见问题

**Q: 什么时候使用流式模式？**  
A: 处理大文件（> 50MB）或需要边下载边处理时使用。

**Q: 流式模式会更快吗？**  
A: 不会更快，但内存占用更低，适合大文件。

**Q: 旧代码需要修改吗？**  
A: 不需要，完全向后兼容。

**Q: 如何显示下载进度？**  
A: 在 `reader.read()` 循环中累计字节数并计算百分比。

## 💡 最佳实践

1. **优先使用非流式**（小文件）
   ```javascript
   const response = await axios.get(url, { responseType: 'arraybuffer' });
   ```

2. **大文件必须流式**
   ```javascript
   const response = await axios.get(url, { responseType: 'stream' });
   ```

3. **提供进度反馈**
   ```javascript
   while (true) {
     const { done, value } = await reader.read();
     if (done) break;
     console.log(`进度: ${totalBytes} 字节`);
   }
   ```

## 🎯 总结

- ✅ 简单场景：使用 `responseType: 'arraybuffer'`
- ✅ 大文件场景：使用 `responseType: 'stream'`
- ✅ 根据实际需求选择合适模式

**记住**: 简单优先，按需使用！



