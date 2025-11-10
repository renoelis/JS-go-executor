# Buffer.prototype.toJSON 测试套件

本目录包含针对 Node.js v25.0.0 中 `Buffer.prototype.toJSON()` 方法的**生产级完整测试套件**。

## 📊 测试概览

- **总测试数**: 263 个测试用例
- **测试文件**: 15 个
- **覆盖深度**: 生产级 (Production-Grade)
- **成功率**: 100%
- **Node.js 版本**: v25.0.0

## 测试文件结构

### 基础测试 (Part 1-8, 111 测试)

| 文件名 | 职责说明 | 测试数量 |
|--------|----------|----------|
| `part1_toJSON_basic.js` | 基本功能测试,包括各种创建方式、编码方式的 Buffer | 10 |
| `part2_toJSON_stringify.js` | JSON.stringify 集成测试,嵌套对象、数组等场景 | 10 |
| `part3_toJSON_typedarray.js` | TypedArray 相关测试,包括视图、ArrayBuffer、不同 TypedArray 类型 | 10 |
| `part4_toJSON_edge_cases.js` | 边界和极端情况,包括所有字节值、多字节字符、大 Buffer 等 | 15 |
| `part5_toJSON_errors.js` | 错误情况和 this 绑定测试,包括在不同对象上调用的行为 | 15 |
| `part6_toJSON_special_cases.js` | 特殊场景测试,包括返回对象结构、重建 Buffer、循环引用等 | 15 |
| `part7_toJSON_combinations.js` | 组合测试,包括与其他 Buffer 方法配合使用的场景 | 17 |
| `part8_toJSON_extreme_cases.js` | 极端场景和历史行为,包括多语言文本、编码边界、Buffer 操作后的 toJSON | 19 |

### 深度测试 (Part 9-15, 152 测试)

| 文件名 | 职责说明 | 测试数量 |
|--------|----------|----------|
| `part9_toJSON_method_properties.js` | 方法属性测试,包括 length、name、描述符、原型链 | 20 |
| `part10_toJSON_advanced_types.js` | 高级类型支持,包括 SharedArrayBuffer、DataView、BigInt、极端索引 | 19 |
| `part11_toJSON_encoding_edge_cases.js` | 编码边界情况,包括 base64/hex/latin1/ascii 各种边界和无效输入 | 25 |
| `part12_toJSON_special_indices.js` | 特殊索引测试,包括 NaN/Infinity/浮点数索引、视图共享内存 | 21 |
| `part13_toJSON_buffer_methods.js` | Buffer 方法边界,包括 concat/of/from 的各种边界情况 | 26 |
| `part14_toJSON_deep_scenarios.js` | 深层场景,包括深层嵌套、循环引用、Symbol、自定义属性 | 20 |
| `part15_toJSON_overrides.js` | 方法覆盖与错误处理,包括覆盖 toJSON、Buffer 池行为 | 21 |

**总计**: 263 个测试用例

## API 覆盖维度

### 1. 功能与用途
- ✅ 返回 `{ type: 'Buffer', data: [...] }` 格式的对象
- ✅ 与 `JSON.stringify()` 自动集成
- ✅ data 字段包含 0-255 的字节值数组

### 2. 支持的输入类型
- ✅ Buffer (通过 Buffer.from、Buffer.alloc、Buffer.allocUnsafe 等创建)
- ✅ Uint8Array / TypedArray
- ✅ ArrayBuffer
- ✅ Buffer 视图 (slice、subarray)
- ✅ 各种编码创建的 Buffer (utf8、hex、base64、latin1、ascii、utf16le、ucs2、base64url)

### 3. 返回值特性
- ✅ 返回普通对象,不是 Buffer 实例
- ✅ data 是普通数组,不是 TypedArray
- ✅ 返回的对象可以被修改,不影响原 Buffer
- ✅ 多次调用返回独立的对象
- ✅ 只包含 type 和 data 两个属性

### 4. 错误类型与抛出条件
- ✅ 在 null/undefined 上调用会抛出 TypeError
- ✅ 在普通对象上调用不会抛错,但返回空数据
- ✅ 在数组上调用会尝试处理为类数组对象
- ✅ toJSON 是 Buffer 特有方法,不存在于 Uint8Array

### 5. 边界与极端输入
- ✅ 空 Buffer (length = 0)
- ✅ 长度为 1 的 Buffer
- ✅ 所有字节值 0-255
- ✅ 大 Buffer (10000+ 字节)
- ✅ 0x00 和 0xFF 边界值
- ✅ 多字节 UTF-8 字符 (中文、emoji 等)
- ✅ 特殊字符 (控制字符、零宽字符、组合字符)

### 6. 安全特性
- ✅ 返回的对象修改不影响原 Buffer
- ✅ 视图修改会反映在 toJSON 结果中(因为共享底层内存)
- ✅ Buffer 不支持 freeze/seal 操作
- ✅ Buffer 支持 preventExtensions

### 7. 兼容性与历史行为
- ✅ 基于 Node.js v25.0.0 标准
- ✅ TypedArray 不能被冻结或密封的行为
- ✅ toJSON 方法只在 Buffer 上存在,不在 Uint8Array 上

### 8. 与其他 API 的集成
- ✅ JSON.stringify / JSON.parse 往返转换
- ✅ Buffer.compare / Buffer.equals 配合使用
- ✅ Buffer.concat 后的 toJSON
- ✅ Buffer.copyBytesFrom 创建的 Buffer
- ✅ buffer.entries() / values() / keys() 的一致性
- ✅ buffer.write / fill / copy 后的 toJSON
- ✅ buffer.swap16 / swap32 / swap64 后的 toJSON

## 执行测试

### 运行所有测试
```bash
./run_all_node.sh
```

### 运行单个测试文件
```bash
node part1_toJSON_basic.js
node part2_toJSON_stringify.js
# ... 其他文件
```

## 查缺补漏记录

### 第 1 轮 (初版完整用例)
创建了 5 个基础测试文件,覆盖:
- 基本功能 (part1)
- JSON.stringify 集成 (part2)
- TypedArray 相关 (part3)
- 边界情况 (part4)
- 错误情况 (part5)

### 第 2 轮 (对照 Node 官方文档补漏)
修正了以下错误假设:
- toJSON 在非 Buffer 对象上调用不会抛错
- toJSON 只存在于 Buffer,不在 Uint8Array
- Buffer 不能被 freeze/seal (TypedArray 限制)
- 普通 Uint8Array 可以通过 call 借用 Buffer.toJSON

### 第 3 轮 (对照 Node 实际行为 + 边缘分支)
新增 part6,补充:
- toJSON 返回对象的结构验证
- 往返转换测试
- byteOffset 不为 0 的视图
- Buffer.allocUnsafeSlow 创建的 Buffer
- 多种编码 (UTF-16、ASCII、latin1)
- 循环引用场景
- 大 Buffer (100000 字节)

### 第 4 轮 (对照已实现的测试脚本本身补漏)
新增 part7,补充:
- 与 Buffer.compare/equals 配合
- Buffer.concat 各种场景
- Buffer.copyBytesFrom 测试
- Map/Set/WeakMap 中的 Buffer
- 与迭代器方法的一致性
- Buffer.byteLength 一致性验证

### 第 5 轮 (极端场景 + 兼容性/历史行为再挑刺)
新增 part8,补充:
- 所有可能的 1 字节值 (0-255)
- 负数索引的 slice
- 长度为 0 的各种边界 subarray
- UTF-8 高位字节 (不同字节长度的字符)
- BOM、替代对、零宽字符、组合字符
- hex/base64 编码边界情况
- latin1 全字符集
- write/fill/copy 后立即 toJSON
- swap16/32/64 后的 toJSON
- 多语言文本支持

## 测试原则

1. **禁用关键词**: 所有测试脚本严格避免使用 `Object.getPrototypeOf`、`constructor`、`eval`、`Reflect`、`Proxy`
2. **统一结果格式**: 每个测试返回 `{ success, summary, tests }` 格式的结果对象
3. **基础断言**: 使用简单的 if 判断,不依赖外部测试框架
4. **可视化输出**: 每个用例打印 ✅ 或 ❌,便于快速查看结果
5. **错误处理**: 使用 try/catch 包裹,捕获所有异常并记录详细堆栈

## 环境要求

- Node.js v25.0.0
- 无外部依赖

## 测试结果

在 Node.js v25.0.0 环境下,所有 111 个测试用例全部通过 ✅

## 后续用途

这些测试脚本可以用于:
1. 验证 Node.js Buffer.prototype.toJSON 的标准行为
2. 对照 Go+goja 环境下的 Buffer 实现
3. 作为 Buffer toJSON 功能的参考文档
4. 回归测试,确保行为一致性
