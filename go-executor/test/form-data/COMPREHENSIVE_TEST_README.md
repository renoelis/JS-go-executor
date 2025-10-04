# FormData 综合测试使用指南

## 🎯 快速开始

### 运行完整测试套件

```bash
cd /Users/Code/Go-product/Flow-codeblock_goja
./test/form-data/run-comprehensive-test.sh
```

### 预期输出

```
🧪 FormData 综合测试 (Node.js v22.2.0 标准)
============================================================

📦 准备测试...
🚀 执行测试...

============================================================
📊 测试结果
============================================================
总计: 36 个测试
通过: 36 个 ✅
失败: 0 个 ❌

分类统计:
  Node.js FormData: 12/12 通过
  Web API FormData: 12/12 通过
  错误处理测试:   12/12 通过

🎉 所有测试通过!
```

---

## 📚 测试文件说明

### 主要文件

| 文件 | 说明 | 测试数量 |
|------|------|----------|
| `formdata-comprehensive-test.js` | 综合测试脚本 | 36 |
| `formdata-iterator-debug.js` | 迭代器调试脚本 | 诊断用 |
| `formdata-error-handling-test.js` | 原有错误处理测试 | 10 |
| `run-comprehensive-test.sh` | 测试执行脚本 | - |

### 辅助文件

- `FORMDATA_COMPREHENSIVE_TEST_REPORT.md` - 详细测试报告
- `COMPREHENSIVE_TEST_README.md` - 本文档

---

## 🧪 测试分类详解

### Part 1: Node.js FormData (12个测试)

测试 `require('form-data')` 模块的所有功能:

```javascript
const FormData = require('form-data');
const form = new FormData();

// 基础功能
form.append('name', 'value');           // 字符串
form.append('file', buffer, 'file.txt'); // Buffer
form.append('blob', blob, 'blob.dat');  // Blob
form.append('upload', file);             // File

// Node.js 特有方法
const headers = form.getHeaders();       // Content-Type头
const boundary = form.getBoundary();     // 边界字符串
form.setBoundary('custom-123');         // 自定义边界
form.getLength((err, length) => {});    // 异步获取长度
const buffer = form.getBuffer();         // 获取完整Buffer
```

### Part 2: Web API FormData (12个测试)

测试浏览器标准 FormData API:

```javascript
const form = new FormData();

// 基础操作
form.append('key', 'value');
form.set('key', 'new-value');    // 替换
form.delete('key');              // 删除
form.has('key');                 // 检查存在
form.get('key');                 // 获取单个值
form.getAll('key');              // 获取所有值

// 迭代器 (标准 for...of 语法) ✅
for (const key of form.keys()) {
    console.log(key);
}

for (const value of form.values()) {
    console.log(value);
}

for (const [key, value] of form.entries()) {
    console.log(key, value);
}

// 回调遍历
form.forEach((value, key) => {
    console.log(key, value);
});
```

### Part 3: 错误处理 (12个测试)

测试各种边界情况和错误处理:

```javascript
// 参数错误
form.append();          // ❌ TypeError
form.set();             // ❌ TypeError
form.setBoundary();     // ❌ TypeError
form.getLength('not-a-function');  // ❌ TypeError

// 不存在的键
form.get('nonexistent');      // ✅ 返回 null
form.getAll('nonexistent');   // ✅ 返回 []
form.delete('nonexistent');   // ✅ 不抛错

// 特殊值
form.append('field', null);       // ✅ 序列化为 "null"
form.append('field', undefined);  // ✅ 序列化为 "undefined"
form.append('empty', Buffer.from([]));  // ✅ 空Buffer

// 大量数据
for (let i = 0; i < 100; i++) {
    form.append('field' + i, 'value' + i);
}
// ✅ 支持大量字段
```

---

## 🔬 迭代器测试重点

### 标准 `for...of` 语法

所有迭代器方法都支持标准的 `for...of` 语法:

```javascript
// ✅ keys() - 遍历所有键
for (const key of form.keys()) {
    console.log(key);
}

// ✅ values() - 遍历所有值
for (const value of form.values()) {
    console.log(value);
}

// ✅ entries() - 遍历键值对 (支持解构)
for (const [key, value] of form.entries()) {
    console.log(key, value);
}
```

### 手动迭代 (备选方案)

如果需要更精细的控制:

```javascript
const iterator = form.keys();
let result = iterator.next();

while (!result.done) {
    console.log(result.value);
    result = iterator.next();
}
```

### `forEach` 方法

传统的回调风格:

```javascript
form.forEach(function(value, key, formData) {
    console.log(key + ':', value);
});
```

---

## 🐛 调试工具

### 运行迭代器调试脚本

如果遇到迭代器问题,可以运行诊断脚本:

```bash
cd /Users/Code/Go-product/Flow-codeblock_goja
cat test/form-data/formdata-iterator-debug.js | base64 | tr -d '\n' > /tmp/fd_debug.b64
curl -s -X POST http://localhost:3002/flow/codeblock \
  -H "Content-Type: application/json" \
  -d "{\"input\": {}, \"codeBase64\": \"$(cat /tmp/fd_debug.b64)\", \"timeout\": 60000}" | jq '.'
```

### 诊断输出

调试脚本会输出:
- FormData 实例类型检查
- 迭代器方法存在性检查
- `next()` 方法调用测试
- `Symbol.iterator` 检查
- `for...of` 循环测试
- `forEach` 方法测试

---

## 📊 测试统计

### 覆盖率

| 类别 | 测试数 | 通过数 | 覆盖率 |
|------|--------|--------|--------|
| Node.js FormData | 12 | 12 | 100% |
| Web API FormData | 12 | 12 | 100% |
| 错误处理 | 12 | 12 | 100% |
| **总计** | **36** | **36** | **100%** |

### 功能覆盖

- ✅ 实例创建
- ✅ 字段操作 (append, set, delete, get, getAll, has)
- ✅ Buffer/Blob/File 附件
- ✅ 迭代器 (keys, values, entries)
- ✅ 遍历方法 (forEach)
- ✅ Node.js 特有方法 (getHeaders, getBoundary, setBoundary, getLength, getBuffer)
- ✅ 错误处理
- ✅ 边界情况

---

## 🚀 集成到 CI/CD

### 添加到测试流程

```bash
#!/bin/bash
# test-all.sh

echo "Running FormData comprehensive tests..."
./test/form-data/run-comprehensive-test.sh

if [ $? -ne 0 ]; then
    echo "❌ FormData tests failed"
    exit 1
fi

echo "✅ All FormData tests passed"
```

### GitHub Actions 示例

```yaml
name: FormData Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Go service
        run: |
          cd go-executor
          go build -o server cmd/main.go
      
      - name: Start service
        run: |
          cd go-executor
          ./server &
          sleep 3
      
      - name: Run FormData tests
        run: ./test/form-data/run-comprehensive-test.sh
```

---

## 📖 相关文档

- [FORMDATA_COMPREHENSIVE_TEST_REPORT.md](./FORMDATA_COMPREHENSIVE_TEST_REPORT.md) - 详细测试报告
- [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) - 原有测试覆盖报告
- [README.md](./README.md) - FormData 测试总览

---

## 🆘 故障排除

### 问题: 迭代器报错 "object is not iterable"

**原因**: FormData 迭代器缺少 `Symbol.iterator`

**解决**: 确保使用修复后的 `fetch_enhancement.go`:
```go
// 在 keys(), values(), entries() 方法中添加:
runtime.Set("__tempFormDataIterator", iterator)
runtime.RunString("__tempFormDataIterator[Symbol.iterator] = function() { return this; };")
runtime.Set("__tempFormDataIterator", goja.Undefined())
```

### 问题: 测试失败

1. **检查服务状态**:
   ```bash
   curl http://localhost:3002/health
   ```

2. **重启服务**:
   ```bash
   cd go-executor
   pkill -f './server'
   ./server > service.log 2>&1 &
   ```

3. **查看日志**:
   ```bash
   tail -f go-executor/service.log
   ```

### 问题: 部分测试超时

**解决**: 增加超时时间 (默认 60秒):
```bash
# 在 run-comprehensive-test.sh 中修改
"timeout": 120000  # 120秒
```

---

## ✅ 最佳实践

1. **每次修改 FormData 相关代码后运行测试**
2. **添加新功能时,同步添加测试用例**
3. **保持测试脚本使用标准 Node.js v22.2.0 语法**
4. **错误处理要覆盖所有边界情况**
5. **迭代器测试优先使用 `for...of` 标准语法**

---

**维护者**: Flow-CodeBlock 团队  
**最后更新**: 2025-10-03  
**测试状态**: ✅ 100% 通过








