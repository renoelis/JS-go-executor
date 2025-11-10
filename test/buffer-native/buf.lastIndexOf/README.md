# Buffer.prototype.lastIndexOf() 完整测试套件

## 概述

本测试套件对 Node.js v25.0.0 的 `Buffer.prototype.lastIndexOf()` API 进行了全面的功能验证，确保 Go + goja 实现与 Node.js 官方行为 100% 一致。

## 测试覆盖

### 测试文件列表

| 文件 | 测试数 | 覆盖范围 |
|------|--------|----------|
| `part1_basic.js` | 6 | 基本功能测试 |
| `part2_encoding.js` | 23 | 编码支持（utf8, hex, base64, latin1, ascii, utf16le 等） |
| `part3_byteoffset.js` | 24 | byteOffset 参数测试（正数、负数、边界） |
| `part4_value_types.js` | 31 | value 参数类型（string, number, Buffer, Uint8Array） |
| `part5_edge_cases.js` | 36 | 边界情况和特殊场景 |
| `part6_compatibility.js` | 28 | 兼容性测试 |
| `part7_additional_edge_cases.js` | 43 | 额外边界情况 |
| `part8_official_examples.js` | 32 | Node.js 官方文档示例 |
| `part9_empty_value_behavior.js` | 29 | 空值行为测试 |
| `part10_advanced_type_coercion.js` | 37 | 高级类型转换和 TypedArray 错误处理 |
| `part11_final_missing_tests.js` | 39 | 补充测试（ArrayBuffer、编码别名、多字节字符等） |
| `part12_error_handling.js` | 21 | 错误处理（无效类型、无效编码、特殊值） |
| `part13_special_cases.js` | 35 | 特殊场景（编码别名、参数识别、零宽度字符等） |
| **总计** | **384** | **全方位覆盖** |

## API 规格

### 函数签名

```javascript
buf.lastIndexOf(value[, byteOffset][, encoding])
```

### 参数

- **value** `<string> | <Buffer> | <Uint8Array> | <integer>`
  - 要搜索的值
  - 支持类型：字符串、Buffer、Uint8Array、0-255 的整数
  - 不支持：null, undefined, boolean, Symbol, Function, Array, Object, BigInt, 其他 TypedArray

- **byteOffset** `<integer>`
  - 从哪个位置开始向前搜索
  - 默认值：`buf.length - 1`
  - 负数：从末尾计算 (`buf.length + byteOffset`)
  - 超出范围：自动调整

- **encoding** `<string>`
  - 字符串编码方式
  - 默认值：`'utf8'`
  - 支持：utf8, utf-8, hex, base64, base64url, ascii, latin1, binary, utf16le, ucs2, ucs-2, utf-16le
  - 大小写不敏感

### 返回值

- `<integer>` - 最后一次出现的索引位置，未找到返回 -1
- 空字符串/空 Buffer 返回 byteOffset 或 buf.length

## 测试覆盖的功能点

### ✅ 基本功能
- 查找字符串、数字、Buffer
- 多次出现时返回最后一个
- 未找到返回 -1
- 空值处理

### ✅ 编码支持
- UTF-8（默认）
- HEX（十六进制）
- BASE64 / BASE64URL
- LATIN1 / BINARY
- ASCII
- UTF-16LE / UCS-2
- 编码别名（utf-8, utf8, UTF8 等）
- 大小写不敏感

### ✅ byteOffset 参数
- 正数、负数、零
- 超出范围处理
- NaN、Infinity、-Infinity
- 浮点数转整数
- 布尔值转数字

### ✅ value 类型
- 字符串（单字符、多字符、空字符串）
- 数字（0-255、超出范围取模、负数、浮点数）
- Buffer（单字节、多字节、空 Buffer）
- Uint8Array
- 特殊数字（NaN, Infinity, -Infinity）

### ✅ 错误处理
- 无效类型：null, undefined, boolean, Symbol, Function, Array, Object, BigInt
- 无效 TypedArray：Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array, Uint8ClampedArray, DataView
- 无效编码名称
- ArrayBuffer 直接作为 value

### ✅ 边界情况
- 空 Buffer
- 单字节 Buffer
- 搜索值大于 Buffer
- 重叠匹配
- UTF-16 对齐
- 大 Buffer 性能
- 多字节字符（中文、emoji、韩文、日文）
- 特殊字符（换行符、制表符、null 字节、零宽度字符）

### ✅ 兼容性
- Node.js 官方文档示例
- 与 indexOf 的对称性
- Buffer 子类和不同构造方式
- SharedArrayBuffer 支持

## 运行测试

### 本地 Node.js 环境

```bash
# 运行单个测试文件
node test/buffer-native/buf.lastIndexOf/part1_basic.js

# 运行所有测试
for file in test/buffer-native/buf.lastIndexOf/part*.js; do
  node "$file"
done
```

### Go + goja 环境

```bash
# 一键运行所有测试
bash test/buffer-native/buf.lastIndexOf/run_all_tests.sh
```

### 单个测试示例

```bash
CODE=$(base64 < test/buffer-native/buf.lastIndexOf/part1_basic.js)
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --header 'accessToken: flow_c52895974d8a41fbafaa74e4d6f6c9434cd674b8199dc259dc2cbf4efc173b15' \
  --data "{\"codebase64\": \"$CODE\", \"input\": {}}" | jq '.'
```

## 测试结果

```
==========================================
buf.lastIndexOf API 完整测试
==========================================
总测试数: 384
通过: 384
失败: 0
成功率: 100.00%

🎉 所有测试通过！buf.lastIndexOf API 与 Node.js v25.0.0 完全兼容！
```

## Go 实现修复记录

### 修复的问题

1. **Symbol 类型检测** - 使用 `*goja.Symbol` 类型断言
2. **Function 类型检测** - 使用 `goja.AssertFunction`
3. **BigInt 类型检测** - 通过 `ExportType().String()` 检测 `*big.Int`
4. **Uint8ClampedArray 拒绝** - 添加到不支持的 TypedArray 列表

### 修改的文件

- `enhance_modules/buffer/write_methods.go` - lastIndexOf 实现

## 注意事项

1. 测试脚本禁用关键词：`Object.getPrototypeOf`, `constructor`, `eval`, `Reflect`, `Proxy`
2. 所有测试必须使用 `return` 返回结果
3. 错误信息必须包含 `error.message` 和 `error.stack`
4. 测试结果格式统一使用 JSON

## 参考文档

- [Node.js v25.0.0 Buffer Documentation](https://nodejs.org/api/buffer.html#buflastindexofvalue-byteoffset-encoding)
- [ECMAScript Specification](https://tc39.es/ecma262/)
