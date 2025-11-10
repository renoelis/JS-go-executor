# 📊 Excel + OSS 上传集成测试指南

> 本指南展示如何在 Goja 环境中生成 Excel 并上传到远程 OSS（Cloudflare R2）

---

## 🎯 测试场景

完整的业务流程：
1. **生成业务数据** - 创建订单数据（模拟真实业务场景）
2. **创建 Excel 文件** - 使用 `xlsx` 模块生成多工作表 Excel
3. **上传到 OSS** - 使用 `axios` + FormData 上传到 Cloudflare R2
4. **返回访问 URL** - 获取文件的公开访问地址

---

## 📁 测试文件

### 1. `simple-oss-upload-test.js` 
**推荐使用** - 简化版测试，包含完整的错误处理

```bash
# 运行测试
./run-oss-upload-test.sh

# 或手动运行
cd /Users/Code/Go-product/Flow-codeblock_goja/test/xlsx
./run-oss-upload-test.sh
```

**特点**：
- ✅ 生成 20 条订单数据
- ✅ 创建两个工作表（订单明细 + 汇总数据）
- ✅ 完整的错误处理和日志
- ✅ 返回文件访问 URL

### 2. `real-oss-upload-test.js`
完整版测试，展示所有细节

---

## 🔧 OSS 配置说明

测试使用的 Cloudflare R2 配置（来自用户提供的 curl）：

```javascript
const OSS_CONFIG = {
  uploadUrl: 'https://api.renoelis.top/R2api/upload-direct',
  authorization: 'Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi',
  bucketName: 'renoelis-bucket',
  endpoint: 'https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com',
  accessKeyId: 'dbe49459ff0a510d1b01674c333c11fe',
  secretAccessKey: '69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e',
  customDomain: 'https://bucket.renoelis.dpdns.org'
};
```

**上传路径**：`excel-reports/orders-report-{timestamp}.xlsx`

---

## 🚀 快速开始

### 前提条件

1. **启动 Go 服务**：
   ```bash
   cd /Users/Code/Go-product/Flow-codeblock_goja/go-executor
   ./flow-codeblock-go
   ```

2. **确认服务运行**：
   ```bash
   curl http://localhost:3002/health
   # 应返回 200 OK
   ```

### 运行测试

```bash
cd /Users/Code/Go-product/Flow-codeblock_goja/test/xlsx
./run-oss-upload-test.sh
```

### 预期输出

```
========================================
🧪 Excel + OSS 上传集成测试
========================================

🔍 检查服务状态...
✅ 服务运行正常

========================================
📝 测试 1: 简化版 OSS 上传
========================================

📝 Step 1: 创建业务数据...
   ✅ 已创建 20 条订单数据
   📊 统计: 
      - 已完成: 7
      - 处理中: 7
      - 待支付: 6

📝 Step 2: 生成 Excel 文件...
   ✅ Excel 文件已生成
      - 文件大小: 6234 bytes
      - 工作表数量: 2
      - 工作表名称: 订单明细, 汇总数据

📝 Step 3: 准备上传到 OSS...
   📤 上传信息:
      - 文件名: orders-report-1735974123456.xlsx
      - 对象路径: excel-reports/orders-report-1735974123456.xlsx
      - 文件大小: 6.09 KB

📡 开始上传（使用 FormData）...

========================================
✅ 上传成功！
========================================

📊 上传结果:
   HTTP 状态: 200
   文件地址: https://bucket.renoelis.dpdns.org/excel-reports/orders-report-1735974123456.xlsx

📄 服务器响应:
{
  "success": true,
  "url": "https://bucket.renoelis.dpdns.org/excel-reports/orders-report-1735974123456.xlsx"
}

========================================
🎉 测试完成
========================================

⏱️  执行时间: 1234ms
📊 文件信息:
   - 订单数量: 20
   - 文件大小: 6234 bytes
```

---

## 📝 代码示例

### 核心流程

```javascript
const axios = require('axios');
const xlsx = require('xlsx');
const dateFns = require('date-fns');

// 1. 创建数据
const orders = [
  { 订单编号: 'ORD001', 客户名称: '张三', 订单金额: 1500.50 }
];

// 2. 生成 Excel
const workbook = xlsx.utils.book_new();
const worksheet = xlsx.utils.json_to_sheet(orders);
xlsx.utils.book_append_sheet(workbook, worksheet, '订单数据');
const excelBuffer = xlsx.write(workbook, { type: 'buffer' });

// 3. 上传到 OSS
axios.post('https://api.renoelis.top/R2api/upload-direct', {
  file: excelBuffer,
  bucket_name: 'renoelis-bucket',
  object_key: 'excel-reports/report.xlsx',
  // ... 其他配置
}, {
  headers: {
    'Authorization': 'Bearer xxx',
    'Content-Type': 'multipart/form-data'
  }
})
.then(function(response) {
  const fileUrl = 'https://bucket.renoelis.dpdns.org/excel-reports/report.xlsx';
  console.log('✅ 上传成功: ' + fileUrl);
});
```

---

## ⚠️ 注意事项

### 1. **环境兼容性**

```javascript
// ✅ 正确：使用 Buffer.from() 转换
const buffer = Buffer.from(response.data);

// ❌ 错误：直接使用 ArrayBuffer
const buffer = response.data;  // ArrayBuffer 无法直接用
```

### 2. **date-fns 导入**

```javascript
// ✅ 正确：整体导入
const dateFns = require('date-fns');
dateFns.format(new Date(), 'yyyy-MM-dd');

// ❌ 错误：解构导入
const { format } = require('date-fns');  // 不支持
```

### 3. **Promise 使用**

```javascript
// ✅ 推荐：使用 Promise 链
return axios.post(url, data)
  .then(function(response) {
    return response.data;
  });

// ⚠️ 不推荐：async/await
async function upload() {  // 可能有兼容性问题
  const response = await axios.post(url, data);
}
```

### 4. **FormData 处理**

```javascript
// 在我们的环境中，FormData 需要特殊处理
// 推荐直接传递对象，让 axios 处理
const uploadData = {
  file: excelBuffer,
  bucket_name: 'xxx',
  object_key: 'xxx'
};

axios.post(url, uploadData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## 🐛 故障排查

### 问题 1: 上传失败 - 网络错误

**症状**：
```
❌ 错误: 未收到服务器响应
```

**解决**：
1. 检查服务是否运行：`curl http://localhost:3002/health`
2. 检查网络连接
3. 检查 OSS API 地址是否正确

### 问题 2: 上传失败 - 权限错误

**症状**：
```
HTTP 状态: 403
错误详情: {"error": "Access Denied"}
```

**解决**：
1. 检查 Authorization token 是否正确
2. 检查 access_key_id 和 secret_access_key
3. 检查 bucket 权限配置

### 问题 3: Excel 生成失败

**症状**：
```
❌ invalid Buffer object
```

**解决**：
1. 确认 `xlsx.write()` 使用 `{ type: 'buffer' }`
2. 检查数据格式是否正确
3. 查看完整错误堆栈

### 问题 4: ArrayBuffer 转换错误

**症状**：
```
❌ The "value" argument must be of type Buffer
```

**解决**：
```javascript
// ✅ 正确做法
const buffer = Buffer.from(response.data);  // ArrayBuffer → Buffer
const workbook = xlsx.read(buffer);

// ❌ 错误做法
const workbook = xlsx.read(response.data);  // 直接用 ArrayBuffer
```

---

## 📚 相关文档

- [NODEJS_COMPATIBILITY_GUIDE.md](../../NODEJS_COMPATIBILITY_GUIDE.md) - Node.js 兼容性指南
- [ENHANCED_MODULES.md](../../go-executor/ENHANCED_MODULES.md) - 增强模块文档
- [README.md](./README.md) - XLSX 模块使用指南

---

## 🔗 原始 curl 命令

测试基于以下 curl 命令：

```bash
curl --location 'https://api.renoelis.top/R2api/upload-direct' \
--header 'Authorization: Bearer 304b99ee7a9a41a69b1adb6aee7746d2wGgcrXDvVugwh2kL8qPi' \
--form 'file=@"/path/to/file.xlsx"' \
--form 'bucket_name="renoelis-bucket"' \
--form 'endpoint="https://dde39d55fbdb29f35e42ab2de3318461.r2.cloudflarestorage.com"' \
--form 'access_key_id="dbe49459ff0a510d1b01674c333c11fe"' \
--form 'secret_access_key="69b6ad35a5fd32f9ca5bc8a913701db8cdca6073af3c67b83faa748138f2113e"' \
--form 'custom_domain="https://bucket.renoelis.dpdns.org"' \
--form 'object_key="excel-reports/filename.xlsx"'
```

---

**最后更新**: 2025-10-04  
**测试环境**: Flow-CodeBlock Go Executor v1.0+

