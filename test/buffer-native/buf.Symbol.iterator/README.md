# Buffer Symbol.iterator 完整测试套件

## 📊 快速概览

| 项目 | 数值 |
|-----|------|
| 测试套件 | 12 个 |
| 测试用例 | 198 个 |
| 通过率 | 100% |
| Node.js 版本 | v25.0.0 |
| 测试类型 | 功能 + 性能 + 内存 + 边缘 |

## 📁 文件导航

### 测试脚本（按顺序）

1. **part1_basic_iteration.js** (10 用例)
   - 基本迭代功能：for...of、next()、扩展运算符
   - 不同编码转换后的迭代

2. **part2_input_types.js** (10 用例)
   - 不同输入类型：TypedArray、ArrayBuffer、Array
   - Buffer 创建方法：alloc、allocUnsafe、concat
   - 视图：slice、subarray

3. **part3_boundary_empty.js** (13 用例)
   - 边界情况：空 Buffer、单字节、大 Buffer
   - 控制流：break、continue
   - 迭代器独立性

4. **part4_iterator_protocol.js** (14 用例)
   - 迭代器协议：next 返回值、done 状态
   - 可迭代协议：Symbol.iterator 返回自身
   - 与其他迭代方法对比：entries、values、keys

5. **part5_error_handling.js** (14 用例)
   - 错误场景：非 Buffer 对象调用
   - Unicode 字符：多字节、emoji、损坏序列
   - 与 Set/Map 结合

6. **part6_documentation_compliance.js** (14 用例)
   - 文档合规性验证
   - 更多 TypedArray 类型
   - 更多编码方式
   - Buffer.from 参数组合

7. **part7_node_behavior_edges.js** (14 用例)
   - Node 特定行为：poolSize、字节序
   - Buffer 操作：compare、toString、toJSON
   - 视图行为：slice/subarray 修改反映

8. **part8_combination_scenarios.js** (23 用例)
   - 组合场景：多层视图嵌套
   - 生成器函数组合
   - Buffer 操作方法：copyWithin、swap*
   - 数组方法组合：some、every、find

9. **part9_extreme_compatibility.js** (23 用例)
   - 极端场景：超大 Buffer（500K）
   - SharedArrayBuffer
   - ASCII 全字符集
   - 异步组合：Promise.all

10. **part10_deep_edge_cases.js** (26 用例) 🆕
    - **核心发现：buf[Symbol.iterator] === buf.values**
    - Object.freeze/seal/preventExtensions
    - 迭代器元数据完整性
    - WeakMap/WeakSet 兼容性
    - Uint8Array 等价性验证

11. **part11_iterator_lifecycle.js** (20 用例) 🆕
    - 迭代器生命周期管理
    - 状态隔离与持久化
    - **实时反映 Buffer 修改**
    - Proxy 不兼容验证
    - 并发迭代场景

12. **part12_performance_memory.js** (17 用例) 🆕
    - 性能基准：1MB/15ms，10MB/111ms
    - 创建开销：0.01µs/个
    - 扩展运算符性能
    - GC 压力测试
    - 热路径/冷路径对比

### 文档文件

- **README.md** (本文件)
  - 快速导航和概览

- **TEST_REPORT.md**
  - 初始 5 轮测试报告（125 用例）
  - 各轮次详细说明

- **DEEP_TEST_REPORT.md**
  - 深度查缺补漏完整报告（198 用例）
  - 关键发现汇总
  - 覆盖维度清单

- **DEEP_SUMMARY.md**
  - 对比总结表
  - 新增维度说明
  - Go+goja 实现指导

### 执行脚本

- **run_all_node.sh**
  - 一键运行所有测试
  - 自动统计结果

## 🚀 快速开始

### 运行所有测试
```bash
cd test/buffer-native/buf.Symbol.iterator
./run_all_node.sh
```

### 运行单个测试
```bash
node part1_basic_iteration.js
node part10_deep_edge_cases.js
node part12_performance_memory.js
```

### 运行指定类型测试
```bash
# 基础功能测试（Part 1-5）
node part{1..5}_*.js

# 深度测试（Part 10-12）
node part1{0..2}_*.js

# 性能测试
node part12_performance_memory.js
```

## 🎯 关键发现

### 必须知道的核心特性

1. **buf[Symbol.iterator] === buf.values**
   ```javascript
   const buf = Buffer.from([1,2,3]);
   console.log(buf[Symbol.iterator] === buf.values); // true
   ```

2. **迭代器实时反映修改**
   ```javascript
   const buf = Buffer.from([1,2,3]);
   const iter = buf[Symbol.iterator]();
   iter.next(); // {value: 1, done: false}
   buf[1] = 99;
   iter.next(); // {value: 99, done: false} ← 看到新值！
   ```

3. **TypedArray 不支持 Proxy**
   ```javascript
   const buf = Buffer.from([1,2,3]);
   const proxy = new Proxy(buf, {});
   [...proxy]; // TypeError: this is not a typed array
   ```

4. **迭代器元数据**
   ```javascript
   const iter = Buffer.from([1])[Symbol.iterator]();
   console.log(iter.constructor.name);        // "Iterator"
   console.log(iter[Symbol.toStringTag]);     // "Array Iterator"
   console.log(Object.keys(iter).length);     // 0 (无可枚举属性)
   ```

## 📈 性能基准

| 操作 | 规模 | 耗时 | 速率 |
|------|------|------|------|
| 迭代 | 1MB | 15ms | ~67 MB/s |
| 迭代 | 10MB | 111ms | ~90 MB/s |
| 创建迭代器 | 100K 个 | 1ms | 100M 个/s |
| 扩展运算符 | 50K | 1ms | 50M 元素/s |
| GC 压力 | 10K 次 | 0ms | 极快 |

## ✅ 测试覆盖清单

- [x] 所有基本功能
- [x] 所有输入类型
- [x] 所有边界条件
- [x] 所有错误路径
- [x] 所有编码方式
- [x] 所有 Buffer 操作
- [x] 所有迭代器协议
- [x] 所有极端场景
- [x] 所有深度边缘
- [x] 所有生命周期
- [x] 所有性能基准
- [x] 所有内存行为

## 🔧 用于 Go+goja 实现

### 必须实现

1. `buf[Symbol.iterator] === buf.values`
2. 迭代器返回 `{value: number, done: boolean}`
3. 迭代器通过 `Symbol.iterator` 返回自身
4. 迭代器实时反映 Buffer 修改
5. 每次调用返回新实例
6. 状态完全隔离

### 应该抛错

1. 非 Buffer 对象调用 → TypeError
2. Proxy 包装后迭代 → TypeError
3. Object.freeze/seal → TypeError

### 性能目标

- 迭代速度：≈15ms/MB
- 创建开销：≈0.01µs/个
- 内存：轻量级 GC 友好

## 📚 测试策略

### 5 轮查缺补漏（初始）

1. **第 1 轮**：基础完整覆盖（Part 1-5，61 用例）
2. **第 2 轮**：文档对照补漏（Part 6，14 用例）
3. **第 3 轮**：实际行为验证（Part 7，14 用例）
4. **第 4 轮**：组合场景补充（Part 8，23 用例）
5. **第 5 轮**：极端场景挑刺（Part 9，23 用例）

### 深度查缺补漏（新增）

6. **深度边缘**：元数据、Proxy、WeakMap 等（Part 10，26 用例）
7. **生命周期**：状态管理、修改反映等（Part 11，20 用例）
8. **性能压力**：大规模、GC、基准测试（Part 12，17 用例）

## 📞 联系与反馈

如发现问题或有改进建议，请在项目中提 issue。

---

**最后更新**：2025-11-10
**Node.js 版本**：v25.0.0
**测试状态**：✅ 198/198 通过（100%）
