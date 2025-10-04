# 📏 文件大小限制配置指南

## 🎯 概览

本文档详细说明了 Flow-CodeBlock Go Executor 中所有与文件大小相关的限制配置。

### ✅ 已实现的限制

| 限制类型 | 默认值 | 环境变量 | 说明 |
|---------|--------|---------|------|
| **代码长度** | 64 KB | `MAX_CODE_LENGTH` | 用户提交的 JavaScript 代码长度 |
| **输入数据** | 2 MB | `MAX_INPUT_SIZE` | 代码执行时的输入参数大小 |
| **输出结果** | 5 MB | `MAX_RESULT_SIZE` | 代码执行返回的结果大小 |
| **FormData 总大小** | 100 MB | `MAX_FORMDATA_SIZE_MB` | 整个 FormData 请求的总大小 |
| **单文件大小** | 50 MB | `MAX_FILE_SIZE_MB` | FormData 中单个文件的大小 |
| **Blob/File 对象** | 100 MB | `MAX_BLOB_FILE_SIZE_MB` | Blob 或 File 对象的最大大小 |

---

## 📋 详细配置说明

### 1. 代码长度限制

**环境变量**: `MAX_CODE_LENGTH`  
**默认值**: `65535` (64 KB)  
**适用范围**: 用户提交的 JavaScript 代码

```javascript
// ✅ 允许
const code = "..."; // 代码长度 < 64KB

// ❌ 拒绝
const code = "..."; // 代码长度 > 64KB
// 错误：Code length exceeds limit: 70000 > 65535 bytes
```

**配置建议**:
- 开发环境: `65535` (64 KB)
- 生产环境: `131072` (128 KB)
- 大型应用: `262144` (256 KB)

---

### 2. 输入数据限制

**环境变量**: `MAX_INPUT_SIZE`  
**默认值**: `2097152` (2 MB)  
**适用范围**: API 请求的 `input` 参数

```javascript
// API 请求
POST /flow/codeblock
{
  "code": "...",
  "input": {
    // ✅ 允许：总大小 < 2MB
    "data": "...",
    "params": {...}
  }
}

// ❌ 拒绝：input 序列化后 > 2MB
// 错误：Input size exceeds limit: 2500000 > 2097152 bytes
```

**配置建议**:
- 小数据场景: `1048576` (1 MB)
- 平衡场景: `2097152` (2 MB) - 默认
- 大数据场景: `10485760` (10 MB)

---

### 3. 输出结果限制

**环境变量**: `MAX_RESULT_SIZE`  
**默认值**: `5242880` (5 MB)  
**适用范围**: JavaScript 代码的返回值

```javascript
// ✅ 允许
return {
  data: [...], // 序列化后 < 5MB
  count: 100
};

// ❌ 拒绝
return {
  data: hugeArray, // 序列化后 > 5MB
  count: 1000000
};
// 错误：Result size exceeds limit: 6000000 > 5242880 bytes
```

**配置建议**:
- 快速响应: `2097152` (2 MB)
- 平衡场景: `5242880` (5 MB) - 默认
- 大数据导出: `20971520` (20 MB)

---

### 4. FormData 总大小限制 ⭐

**环境变量**: `MAX_FORMDATA_SIZE_MB`  
**默认值**: `100` (MB)  
**适用范围**: 整个 FormData 请求（包括所有文件和字段）

```javascript
const FormData = require('form-data');
const formData = new FormData();

// ✅ 允许
formData.append('file1', blob1); // 40 MB
formData.append('file2', blob2); // 30 MB
formData.append('data', 'text'); // 1 KB
// 总计: 70 MB < 100 MB

// ❌ 拒绝
formData.append('file1', blob1); // 60 MB
formData.append('file2', blob2); // 50 MB
// 总计: 110 MB > 100 MB
// 错误：FormData size exceeds limit: 115343360 > 104857600 bytes
```

**配置建议**:
- 小文件场景: `50` (MB)
- 平衡场景: `100` (MB) - 默认
- 大文件场景: `200-500` (MB)
- 极限场景: `1000` (MB) - 需要足够内存

**⚠️ 重要提示**:
- FormData 大小包括所有内容（文件 + 表单字段 + 边界符）
- 实际可用文件空间略小于配置值
- 建议预留 10-20% 的空间给元数据

---

### 5. 单文件大小限制 ⭐⭐

**环境变量**: `MAX_FILE_SIZE_MB`  
**默认值**: `50` (MB)  
**适用范围**: FormData 中单个文件的大小

```javascript
const FormData = require('form-data');
const formData = new FormData();

// ✅ 允许
formData.append('file', blob, 'file.xlsx'); // 30 MB < 50 MB

// ❌ 拒绝
formData.append('file', blob, 'large.xlsx'); // 60 MB > 50 MB
// 错误：文件 large.xlsx 大小超过限制: 62914560 > 52428800 字节
```

**配置建议**:
- 小文件场景: `25` (MB)
- 平衡场景: `50` (MB) - 默认
- 大文件场景: `100-200` (MB)
- Excel 处理: `50-100` (MB)

**⚠️ 关系说明**:
```
MAX_FILE_SIZE_MB 应该 ≤ MAX_FORMDATA_SIZE_MB / 2

原因：确保至少能上传 2 个最大文件
```

**推荐配置组合**:
```bash
# 方案 1: 小文件场景
MAX_FORMDATA_SIZE_MB=50
MAX_FILE_SIZE_MB=25

# 方案 2: 平衡场景（默认）
MAX_FORMDATA_SIZE_MB=100
MAX_FILE_SIZE_MB=50

# 方案 3: 大文件场景
MAX_FORMDATA_SIZE_MB=200
MAX_FILE_SIZE_MB=100

# 方案 4: Excel 处理场景
MAX_FORMDATA_SIZE_MB=200
MAX_FILE_SIZE_MB=100

# 方案 5: 极限场景
MAX_FORMDATA_SIZE_MB=500
MAX_FILE_SIZE_MB=250
```

---

### 6. Blob/File 对象大小限制 ⭐⭐⭐

**环境变量**: `MAX_BLOB_FILE_SIZE_MB`  
**默认值**: `100` (MB)  
**适用范围**: JavaScript 中创建的 Blob 或 File 对象

```javascript
// ✅ 允许：Blob 大小 < 100 MB
const blob = new Blob([data], { type: 'application/octet-stream' });
// data.length < 100 MB

// ❌ 拒绝：Blob 大小 > 100 MB
const blob = new Blob([hugeData], { type: 'application/octet-stream' });
// hugeData.length > 100 MB
// 错误：Blob size exceeds limit: 110000000 > 104857600 bytes
```

**应用场景**:
1. **直接创建 Blob**:
   ```javascript
   const blob = new Blob([excelBuffer], {
     type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
   });
   ```

2. **创建 File 对象**:
   ```javascript
   const file = new File([data], 'document.pdf', { type: 'application/pdf' });
   ```

3. **FormData 上传**:
   ```javascript
   formData.append('file', blob, 'data.xlsx');
   ```

**配置建议**:
- 小文件场景: `50` (MB)
- 平衡场景: `100` (MB) - 默认
- 大文件场景: `200-500` (MB)
- Excel 处理: `100-200` (MB)

**⚠️ 关系说明**:
```
MAX_BLOB_FILE_SIZE_MB 应该 ≤ MAX_FILE_SIZE_MB

原因：Blob/File 对象最终会通过 FormData 上传
```

---

## 🎯 限制检查位置

### 1. 代码长度检查

**位置**: `executor_service.go`  
**时机**: 代码提交时

```go
if len(codeStr) > executor.maxCodeLength {
    return nil, fmt.Errorf("代码长度超过限制: %d > %d 字节", 
        len(codeStr), executor.maxCodeLength)
}
```

### 2. 输入数据检查

**位置**: `executor_service.go`  
**时机**: API 请求解析时

```go
inputJSON, _ := json.Marshal(input)
if len(inputJSON) > executor.maxInputSize {
    return nil, fmt.Errorf("输入数据超过限制: %d > %d 字节", 
        len(inputJSON), executor.maxInputSize)
}
```

### 3. 输出结果检查

**位置**: `executor_service.go`  
**时机**: 代码执行完成后

```go
resultJSON, _ := json.Marshal(result)
if len(resultJSON) > executor.maxResultSize {
    return nil, fmt.Errorf("结果大小超过限制: %d > %d 字节", 
        len(resultJSON), executor.maxResultSize)
}
```

### 4. FormData 大小检查

**位置**: `formdata_streaming.go`  
**时机**: FormData 构建过程中

```go
if sfd.totalSize > sfd.config.MaxFormDataSize {
    return fmt.Errorf("FormData 大小超过限制: %d > %d 字节",
        sfd.totalSize, sfd.config.MaxFormDataSize)
}
```

### 5. 单文件大小检查

**位置**: `formdata_streaming.go`  
**时机**: 添加文件到 FormData 时

```go
// 缓冲模式
if int64(len(data)) > sfd.config.MaxFileSize {
    return fmt.Errorf("文件 %s 大小超过限制: %d > %d 字节",
        filename, len(data), sfd.config.MaxFileSize)
}

// 流式模式
if size > sfd.config.MaxFileSize {
    return fmt.Errorf("文件 %s 大小超过限制: %d > %d 字节",
        filename, size, sfd.config.MaxFileSize)
}
```

### 6. Blob/File 对象检查

**位置**: `blob_file_api.go`  
**时机**: 创建 Blob/File 对象时

```go
// Blob 构造器
if len(blob.data) > int(maxBlobSize) {
    panic(runtime.NewTypeError(fmt.Sprintf(
        "Blob size exceeds limit: %d > %d bytes", 
        len(blob.data), maxBlobSize)))
}

// File 构造器
if len(file.data) > int(maxFileSize) {
    panic(runtime.NewTypeError(fmt.Sprintf(
        "File size exceeds limit: %d > %d bytes", 
        len(file.data), maxFileSize)))
}
```

---

## 🔧 配置方法

### 方式 1: 环境变量（推荐）

创建 `.env` 文件：

```bash
# 代码和数据限制
MAX_CODE_LENGTH=131072           # 128 KB
MAX_INPUT_SIZE=10485760          # 10 MB
MAX_RESULT_SIZE=20971520         # 20 MB

# 文件上传限制
MAX_FORMDATA_SIZE_MB=200         # 200 MB
MAX_FILE_SIZE_MB=100             # 100 MB
MAX_BLOB_FILE_SIZE_MB=100        # 100 MB

# 流式处理
FORMDATA_STREAMING_THRESHOLD_MB=1  # 1 MB
FORMDATA_BUFFER_SIZE=2097152      # 2 MB
```

### 方式 2: Docker Compose

```yaml
services:
  go-executor:
    image: flow-codeblock-go
    environment:
      - MAX_CODE_LENGTH=131072
      - MAX_INPUT_SIZE=10485760
      - MAX_RESULT_SIZE=20971520
      - MAX_FORMDATA_SIZE_MB=200
      - MAX_FILE_SIZE_MB=100
      - MAX_BLOB_FILE_SIZE_MB=100
```

### 方式 3: 命令行参数

```bash
MAX_CODE_LENGTH=131072 \
MAX_INPUT_SIZE=10485760 \
MAX_FORMDATA_SIZE_MB=200 \
./flow-codeblock-go
```

---

## 📊 推荐配置场景

### 场景 1: 小型应用（开发/测试）

```bash
MAX_CODE_LENGTH=65535              # 64 KB
MAX_INPUT_SIZE=1048576             # 1 MB
MAX_RESULT_SIZE=2097152            # 2 MB
MAX_FORMDATA_SIZE_MB=50            # 50 MB
MAX_FILE_SIZE_MB=25                # 25 MB
MAX_BLOB_FILE_SIZE_MB=50           # 50 MB
FORMDATA_STREAMING_THRESHOLD_MB=1  # 1 MB
```

**适用场景**:
- 快速开发测试
- 小文件处理（< 10 MB）
- 低内存环境

---

### 场景 2: 中型应用（生产环境）⭐

```bash
MAX_CODE_LENGTH=65535              # 64 KB
MAX_INPUT_SIZE=2097152             # 2 MB
MAX_RESULT_SIZE=5242880            # 5 MB
MAX_FORMDATA_SIZE_MB=100           # 100 MB ⬅️ 默认配置
MAX_FILE_SIZE_MB=50                # 50 MB ⬅️ 默认配置
MAX_BLOB_FILE_SIZE_MB=100          # 100 MB
FORMDATA_STREAMING_THRESHOLD_MB=1  # 1 MB
```

**适用场景**:
- 标准生产环境
- Excel 文件处理（< 50 MB）
- 文档管理系统
- 报表生成

---

### 场景 3: 大型应用（高负载）

```bash
MAX_CODE_LENGTH=131072             # 128 KB
MAX_INPUT_SIZE=10485760            # 10 MB
MAX_RESULT_SIZE=20971520           # 20 MB
MAX_FORMDATA_SIZE_MB=200           # 200 MB
MAX_FILE_SIZE_MB=100               # 100 MB
MAX_BLOB_FILE_SIZE_MB=200          # 200 MB
FORMDATA_STREAMING_THRESHOLD_MB=0.5 # 500 KB
```

**适用场景**:
- 大文件处理（50-100 MB）
- 批量数据导入
- 媒体文件处理
- 复杂业务逻辑

---

### 场景 4: Excel 专用场景 ⭐⭐

```bash
MAX_CODE_LENGTH=65535              # 64 KB
MAX_INPUT_SIZE=5242880             # 5 MB
MAX_RESULT_SIZE=10485760           # 10 MB
MAX_FORMDATA_SIZE_MB=200           # 200 MB
MAX_FILE_SIZE_MB=100               # 100 MB
MAX_BLOB_FILE_SIZE_MB=100          # 100 MB
FORMDATA_STREAMING_THRESHOLD_MB=1  # 1 MB
EXECUTION_TIMEOUT_MS=600000        # 10 分钟（大文件处理）
```

**适用场景**:
- Excel 文件导入/导出
- 大数据报表生成
- 批量数据处理
- 支持 50-100 MB Excel 文件

---

### 场景 5: 极限场景（企业级）

```bash
MAX_CODE_LENGTH=262144             # 256 KB
MAX_INPUT_SIZE=20971520            # 20 MB
MAX_RESULT_SIZE=52428800           # 50 MB
MAX_FORMDATA_SIZE_MB=500           # 500 MB
MAX_FILE_SIZE_MB=250               # 250 MB
MAX_BLOB_FILE_SIZE_MB=500          # 500 MB
FORMDATA_STREAMING_THRESHOLD_MB=0.5 # 500 KB
EXECUTION_TIMEOUT_MS=900000        # 15 分钟
```

**适用场景**:
- 超大文件处理（200-500 MB）
- 视频/音频处理
- 大规模数据分析
- 高内存服务器（16 GB+）

---

## ⚠️ 注意事项

### 1. 内存考虑

```
推荐内存 = MAX_FORMDATA_SIZE_MB * MAX_CONCURRENT_EXECUTIONS * 2

例如：
- MAX_FORMDATA_SIZE_MB = 100 MB
- MAX_CONCURRENT_EXECUTIONS = 10
- 推荐内存 = 100 * 10 * 2 = 2 GB
```

### 2. 超时设置

大文件上传需要更长的超时时间：

```bash
# 小文件（< 10 MB）
EXECUTION_TIMEOUT_MS=60000   # 1 分钟

# 中等文件（10-50 MB）
EXECUTION_TIMEOUT_MS=300000  # 5 分钟

# 大文件（50-100 MB）
EXECUTION_TIMEOUT_MS=600000  # 10 分钟

# 超大文件（> 100 MB）
EXECUTION_TIMEOUT_MS=900000  # 15 分钟
```

### 3. 流式处理

大文件建议启用流式处理：

```bash
# 触发流式处理的阈值
FORMDATA_STREAMING_THRESHOLD_MB=1  # 1 MB

# > 1 MB 的文件使用流式模式（省内存）
# < 1 MB 的文件使用缓冲模式（更快）
```

### 4. 限制关系

确保配置合理：

```bash
# ✅ 正确配置
MAX_FILE_SIZE_MB=50
MAX_FORMDATA_SIZE_MB=100      # ≥ MAX_FILE_SIZE_MB * 2
MAX_BLOB_FILE_SIZE_MB=100     # ≥ MAX_FILE_SIZE_MB

# ❌ 错误配置
MAX_FILE_SIZE_MB=100
MAX_FORMDATA_SIZE_MB=50       # ❌ 太小，无法上传最大文件
MAX_BLOB_FILE_SIZE_MB=25      # ❌ 太小，无法创建最大 Blob
```

---

## 🧪 测试验证

### 测试大文件上传

```javascript
const xlsx = require('xlsx');
const FormData = require('form-data');

// 生成大文件（例如 80 MB）
const largeData = [];
for (let i = 0; i < 100000; i++) {
  largeData.push({
    id: i,
    name: 'User ' + i,
    data: 'x'.repeat(800) // 约 800 bytes per row
  });
}

const workbook = xlsx.utils.book_new();
const sheet = xlsx.utils.json_to_sheet(largeData);
xlsx.utils.book_append_sheet(workbook, sheet, 'Data');

const buffer = xlsx.write(workbook, { type: 'buffer' });
console.log('文件大小: ' + (buffer.length / 1024 / 1024).toFixed(2) + ' MB');

// ✅ 如果 buffer.length < MAX_FILE_SIZE_MB，上传成功
// ❌ 如果 buffer.length > MAX_FILE_SIZE_MB，抛出错误
```

---

## 📈 监控和日志

### 错误日志示例

```
# 代码长度超限
错误：代码长度超过限制: 70000 > 65535 字节

# FormData 超限
错误：FormData 大小超过限制: 110000000 > 104857600 字节

# 单文件超限
错误：文件 large.xlsx 大小超过限制: 60000000 > 52428800 字节

# Blob 超限
错误：Blob size exceeds limit: 120000000 > 104857600 bytes
```

### 监控指标

建议监控以下指标：
- 平均文件大小
- 最大文件大小
- 被拒绝的请求数（超限）
- 内存使用情况

---

## 🎉 总结

| 限制类型 | 默认值 | 推荐范围 | 关键点 |
|---------|--------|---------|--------|
| 代码长度 | 64 KB | 64-256 KB | 通常不需要调整 |
| 输入数据 | 2 MB | 1-20 MB | 取决于业务复杂度 |
| 输出结果 | 5 MB | 2-50 MB | 大数据导出需增大 |
| FormData | 100 MB | 50-500 MB | ⭐ 核心配置 |
| 单文件 | 50 MB | 25-250 MB | ⭐⭐ 关键配置 |
| Blob/File | 100 MB | 50-500 MB | ⭐⭐⭐ 重要配置 |

**配置原则**:
1. ✅ **保守起步**: 从默认值开始
2. ✅ **逐步调整**: 根据实际需求增大
3. ✅ **监控优化**: 持续监控并优化
4. ✅ **内存考虑**: 确保服务器有足够内存
5. ✅ **超时配合**: 大文件需要更长超时时间

---

**文档版本**: v1.0.0  
**最后更新**: 2025-10-04  
**适用版本**: Flow-CodeBlock Go Executor v1.0.0+

