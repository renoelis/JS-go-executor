# Buffer.prototype.slice 测试套件

## 概述

这是一个全面的 `Buffer.prototype.slice` API 测试套件，用于验证 Go + goja 环境与 Node.js v25.0.0 的完全兼容性。

**测试结果：✅ 635/635 通过（100%）**

## 快速开始

### Node.js 本地测试
```bash
bash run_all_node.sh
```

### Go + goja 服务测试
```bash
bash run_all_tests.sh
```

## 测试文件

| 文件 | 测试数 | 覆盖内容 |
|------|--------|----------|
| part1_slice_basic.js | 26 | 基本功能、负索引、边界、视图特性 |
| part2_slice_types.js | 28 | 参数类型、特殊值转换 |
| part3_slice_errors.js | 20 | 错误处理、上下文验证 |
| part4_slice_encodings.js | 22 | UTF-8、Base64、Hex 等编码 |
| part5_slice_safety.js | 22 | 内存安全、零拷贝 |
| part6_slice_docs_supplement.js | 15 | 官方文档示例、TypedArray 对比 |
| part7_slice_edge_behaviors.js | 28 | 边界行为、Symbol |
| part8_slice_combinations.js | 28 | 与其他方法组合 |
| part9_slice_extreme.js | 27 | 极端场景、多字节字符 |
| part10_slice_deep_supplement.js | 34 | 深度补充测试 |
| part11_slice_method_interactions.js | 36 | 方法交互完整测试 |
| part12_slice_exhaustive.js | 34 | 穷举测试 |
| part13_slice_advanced.js | 40 | 高级特性、原型链 |
| part14_slice_edge_cases.js | 40 | 边界情况深度测试 |
| part15_slice_operator_tests.js | 43 | 运算符、极端嵌套 |
| part16_final_coverage.js | 41 | 规范对齐、类型验证 |
| part17_deep_edge_cases.js | 59 | 深度边界、属性描述符 |
| part18_performance_edge.js | 45 | 性能场景、批量操作 |
| part19_final_gaps.js | 47 | 最终查缺、读写方法 |
| **总计** | **635** | |

## 测试覆盖

### 核心功能
- ✅ slice()、slice(start)、slice(start, end)
- ✅ 正/负索引、边界处理
- ✅ 零拷贝视图特性
- ✅ 参数类型自动转换

### 编码支持
- ✅ UTF-8（ASCII、中文、emoji）
- ✅ Base64、Hex、Latin1
- ✅ Binary、ASCII、UTF-16LE

### 方法交互
- ✅ 读写方法（fill、write、read*、write*）
- ✅ 查找方法（indexOf、includes）
- ✅ 转换方法（toString、swap*）
- ✅ 数组方法（map、filter、reduce）

### 安全性
- ✅ 内存共享验证
- ✅ 边界检查
- ✅ 错误处理
- ✅ 不可变性

## 代码规范

- ✅ 无禁用词（Object.getPrototypeOf、constructor、eval、Reflect、Proxy）
- ✅ 统一测试框架
- ✅ 统一结果格式
- ✅ 完整错误栈

## 详细报告

查看 [TEST_COVERAGE_REPORT.md](./TEST_COVERAGE_REPORT.md) 获取完整的测试覆盖报告。

## 兼容性

- **Node.js**: v25.0.0
- **Go + goja**: 完全兼容
- **测试通过率**: 100%

## 维护

测试套件持续维护，确保与 Node.js 最新版本保持一致。
