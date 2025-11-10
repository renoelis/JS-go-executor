# Blob/File API 测试说明

## 📁 文件结构

```
test/Blob/
├── blob_file_compliance_test.js  # 主测试文件
├── run_blob_tests.sh             # 测试运行脚本
└── README.md                      # 本文档
```

## 🧪 测试文件说明

### blob_file_compliance_test.js

**功能**: 测试 Blob/File API 的 W3C 规范符合性

**测试覆盖**:
- ✅ P0-1: type 规范化 (4 个测试)
- ✅ P0-2: slice() 默认类型 (3 个测试)
- ✅ P0-3: parts 类型支持 (6 个测试)
- ✅ P1-1: 属性只读 (4 个测试)
- ✅ P1-2: bytes() 方法 (3 个测试)
- ✅ P1-3: lastModifiedDate 删除 (1 个测试)
- ✅ P2-1: endings 选项 (2 个测试)
- ✅ P2-2: Symbol.toStringTag (2 个测试)
- ✅ P2-3: stream() 方法 (2 个测试)
- ✅ 综合测试 (3 个测试)

**总计**: 30 个测试用例

## 🚀 运行测试

### 方法 1: 使用运行脚本

```bash
cd test/Blob
chmod +x run_blob_tests.sh
./run_blob_tests.sh
```

### 方法 2: 直接运行

```bash
# 从项目根目录
./flow-codeblock-go --test test/Blob/blob_file_compliance_test.js

# 或者使用你的测试命令
node test/Blob/blob_file_compliance_test.js  # 如果支持 Node.js
```

## 📊 返回值格式

测试脚本使用 `return` 返回结构化结果：

```javascript
{
    passed: 28,           // 通过的测试数量
    failed: 2,            // 失败的测试数量
    total: 30,            // 总测试数量
    successRate: "93.3%", // 成功率
    details: {            // 每个测试的详细结果
        "type 应该转为小写": true,
        "type 包含非法字符应该返回空字符串": true,
        // ... 更多测试
    },
    logs: [               // 所有调试日志
        "========================================",
        "  Blob/File API 规范符合性测试",
        "========================================",
        "",
        "--- P0-1: type 规范化 ---",
        "✅ type 应该转为小写",
        // ... 更多日志
    ],
    note: "Blob/File API 符合 W3C File API 规范"
}
```

## 📝 测试示例

### 示例 1: type 规范化

```javascript
// 测试: type 应该转为小写
const blob = new Blob(['test'], { type: 'Text/Plain' });
console.log(blob.type); // 输出: "text/plain"
```

### 示例 2: slice() 默认类型

```javascript
// 测试: slice() 不传 contentType 应该返回空字符串
const blob = new Blob(['hello'], { type: 'text/plain' });
const sliced = blob.slice(0, 3);
console.log(sliced.type); // 输出: ""
```

### 示例 3: parts 类型支持

```javascript
// 测试: 支持 Uint8Array
const u8 = new Uint8Array([65, 66, 67]);
const blob = new Blob([u8]);
console.log(blob.size); // 输出: 3
```

### 示例 4: bytes() 方法

```javascript
// 测试: bytes() 返回 Uint8Array
const blob = new Blob([new Uint8Array([65, 66, 67])]);
const bytes = await blob.bytes();
console.log(bytes instanceof Uint8Array); // 输出: true
console.log(bytes.length); // 输出: 3
```

## 🔍 调试技巧

### 查看详细日志

测试脚本会输出详细的调试信息：

```
========================================
  Blob/File API 规范符合性测试
========================================

--- P0-1: type 规范化 ---
✅ type 应该转为小写
✅ type 包含非法字符应该返回空字符串
✅ type 包含中文应该返回空字符串
✅ File type 也应该规范化

--- P0-2: slice() 默认类型 ---
✅ Blob.slice() 不传 contentType 应该返回空字符串
...
```

### 查看失败原因

如果测试失败，会显示错误信息：

```
❌ type 应该转为小写
   错误: 期望 'text/plain'，实际 'Text/Plain'
```

### 获取返回值

```javascript
// 在 Goja 中
const result = require('./test/Blob/blob_file_compliance_test.js');
console.log('通过:', result.passed);
console.log('失败:', result.failed);
console.log('详情:', JSON.stringify(result.details, null, 2));
```

## 📋 测试清单

### P0 修复（关键）

- [x] type 规范化（ASCII 小写 + 非法字符过滤）
- [x] slice() 默认类型为空字符串
- [x] 支持 ArrayBuffer/TypedArray/DataView/Blob

### P1 修复（重要）

- [x] 属性只读（size, type, name, lastModified）
- [x] bytes() 方法返回 Promise<Uint8Array>
- [x] 删除非标准的 lastModifiedDate

### P2 修复（增强）

- [x] endings 选项（transparent/native）
- [x] Symbol.toStringTag
- [x] stream() 方法占位符

## 🐛 已知问题

1. **stream() 方法**: 当前仅为占位符，调用会抛出错误提示需要 Streams API
2. **原型链**: Goja 中的原型链可能与浏览器略有不同
3. **异步测试**: 部分异步测试可能需要特殊处理

## 📚 参考资料

- [W3C File API Specification](https://w3c.github.io/FileAPI/)
- [MDN: Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [MDN: File](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [修复完成报告](../../BLOB_FILE_API_FIXES_COMPLETE.md)
- [规范符合性评审](../../BLOB_FILE_SPEC_COMPLIANCE_REVIEW.md)

## 🎯 成功标准

测试通过的标准：
- ✅ 所有 30 个测试用例通过
- ✅ 成功率达到 100%
- ✅ 无错误日志
- ✅ 返回值结构正确

## 💡 提示

- 测试脚本模仿 `test/Buffer/test_byteLength_optimization.js` 的格式
- 使用 `return` 返回结构化结果和调试日志
- 所有日志都会被收集到 `logs` 数组中
- 可以通过 `details` 对象查看每个测试的详细结果
