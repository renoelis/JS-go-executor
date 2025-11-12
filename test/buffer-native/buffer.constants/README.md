# Buffer.constants 测试套件使用指南

## 快速开始

### 执行所有测试
```bash
cd test/buffer-native/buffer.constants
bash run_all_node.sh
```

### 执行单个测试文件
```bash
node part1_basic.js
node part2_values.js
# ... 等
```

## 测试文件说明

| 文件名 | 用例数 | 主要内容 |
|--------|--------|----------|
| part1_basic.js | 15 | 基本属性、类型、存在性验证 |
| part2_values.js | 15 | 常量值范围、关系、一致性 |
| part3_immutability.js | 15 | 不可变性、属性保护 |
| part4_edge_cases.js | 20 | 访问方式、对象方法、序列化 |
| part5_compatibility.js | 20 | Node.js 规范、跨模块一致性 |
| part6_exact_values.js | 15 | 精确值验证、别名检查 |
| part7_behavior_edges.js | 20 | 边界行为、错误处理 |
| part8_advanced_scenarios.js | 20 | 现代 JS 特性、数据结构 |
| part9_extreme_cases.js | 20 | 极端场景、TypedArray 一致性 |

## 核心知识点

### constants 位置
```javascript
// ✅ 正确
const buffer = require('buffer');
const constants = buffer.constants;

// ❌ 错误
const { Buffer } = require('buffer');
const constants = Buffer.constants; // undefined!
```

### 核心常量值
```javascript
constants.MAX_LENGTH         // 9007199254740991 (2^53 - 1)
constants.MAX_STRING_LENGTH  // 536870888 (2^29 - 24)
```

### 属性特性
- **只读**: 不可修改
- **不可配置**: 不可删除或重定义
- **稳定**: 值在运行时不变

### 常见用途
```javascript
// 检查 Buffer 长度是否合法
if (size > 0 && size <= constants.MAX_LENGTH) {
  const buf = Buffer.alloc(size);
}

// 检查字符串转换长度
if (buffer.length <= constants.MAX_STRING_LENGTH) {
  const str = buffer.toString('utf8');
}
```

## 预期所有测试通过

在 Node.js v25.0.0 环境下，所有 160 个测试用例应该 100% 通过。

如果测试失败：
1. 确认 Node.js 版本 >= v8.0.0
2. 检查是否在正确的目录执行
3. 查看具体错误消息中的 error 和 stack 字段

## 测试输出格式

每个测试文件返回 JSON 格式结果：
```json
{
  "success": true,
  "summary": {
    "total": 15,
    "passed": 15,
    "failed": 0,
    "successRate": "100.00%"
  },
  "tests": [
    {
      "name": "测试名称",
      "status": "✅"
    }
  ]
}
```

## 与 Go+goja 环境对比

虽然当前测试仅在 Node.js 环境运行，但测试格式已为 Go+goja 对比预留：
- 统一的 ✅/❌ 标记
- JSON 格式输出便于自动化比对
- 详细的 error.message 和 error.stack

在未来可以直接在 goja 环境中运行相同脚本，对比行为差异。
