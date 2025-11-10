# Buffer 方法 name/length 属性审计报告

## 问题描述

在 Node.js 中，所有函数都应该有正确的 `name` 和 `length` 属性：
```javascript
Buffer.prototype.reverse.name;   // "reverse"
Buffer.prototype.reverse.length; // 0
```

但在 Go + goja 实现中，如果直接使用 `prototype.Set()` 设置函数，会导致 name 属性显示为 Go 的函数签名。

## 正确的实现模式

### ✅ 正确模式（已实现）
```go
// 模式 1：使用辅助函数 setFunctionNameAndLength
readInt8Func := func(call goja.FunctionCall) goja.Value {
    // ... 实现 ...
}
readInt8Value := runtime.ToValue(readInt8Func)
setFunctionNameAndLength(runtime, readInt8Value, "readInt8", 1)
prototype.Set("readInt8", readInt8Value)

// 模式 2：直接设置 DefineDataProperty
reverseFunc := func(call goja.FunctionCall) goja.Value {
    // ... 实现 ...
}
reverseValue := runtime.ToValue(reverseFunc)
if fnObj := reverseValue.ToObject(runtime); fnObj != nil {
    fnObj.DefineDataProperty("name", runtime.ToValue("reverse"), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
    fnObj.DefineDataProperty("length", runtime.ToValue(0), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
}
prototype.Set("reverse", reverseValue)
```

### ❌ 错误模式（需要修复）
```go
prototype.Set("write", func(call goja.FunctionCall) goja.Value {
    // ... 实现 ...
})
```

## 审计结果

### write_methods.go（17 个方法）

| 方法名 | 行号 | 状态 | length 参数 |
|--------|------|------|-------------|
| `write` | 18 | ❌ 需要修复 | 1-4（可变） |
| `slice` | 211 | ❌ 需要修复 | 0-2 |
| `indexOf` | 297 | ❌ 需要修复 | 1-3 |
| `toString` | 601 | ❌ 需要修复 | 0-3 |
| `copy` | 721 | ❌ 需要修复 | 1-4 |
| `compare` | 1169 | ❌ 需要修复 | 1-5 |
| `equals` | 1474 | ❌ 需要修复 | 1 |
| `fill` | 1700 | ❌ 需要修复 | 1-3 |
| `toJSON` | 2263 | ❌ 需要修复 | 0 |
| `includes` | 2298 | ❌ 需要修复 | 1-3 |
| `lastIndexOf` | 2339 | ❌ 需要修复 | 1-3 |
| `swap16` | 2713 | ❌ 需要修复 | 0 |
| `swap32` | 2778 | ❌ 需要修复 | 0 |
| `swap64` | 2847 | ❌ 需要修复 | 0 |
| `reverse` | 2915 | ✅ **已修复** | 0 |
| `subarray` | 3012 | ❌ 需要修复 | 0-2 |
| `set` | 3097 | ❌ 需要修复 | 1-2 |

### iterator_methods.go（3 个方法）

| 方法名 | 行号 | 状态 | length 参数 |
|--------|------|------|-------------|
| `entries` | 31 | ❌ 需要修复 | 0 |
| `keys` | 168 | ✅ **已修复** | 0 |
| `values` | 171 | ❌ 需要修复 | 0 |

### bigint_methods.go（14 个方法）

| 方法名 | 行号 | 状态 | length 参数 |
|--------|------|------|-------------|
| `valueOf` | 102 | ❌ 需要修复 | 0 |
| `toString` | 114 | ❌ 需要修复 | 0-1 |
| `readBigInt64BE` | 255 | ✅ **已修复** | 1 |
| `readBigInt64LE` | 296 | ✅ **已修复** | 1 |
| `readBigUInt64BE` | 331 | ✅ **已修复** | 1 |
| `readBigUint64BE` | 342 | ✅ **已修复** | 1 |
| `readBigUInt64LE` | 376 | ✅ **已修复** | 1 |
| `readBigUint64LE` | 387 | ✅ **已修复** | 1 |
| `writeBigInt64BE` | 390 | ❌ 需要修复 | 1-2 |
| `writeBigInt64LE` | 429 | ❌ 需要修复 | 1-2 |
| `writeBigUInt64BE` | 500 | ✅ **已修复** | 1-2 |
| `writeBigUint64BE` | 502 | ✅ **已修复** | 1-2 |
| `writeBigUInt64LE` | 537 | ✅ **已修复** | 1-2 |
| `writeBigUint64LE` | 539 | ✅ **已修复** | 1-2 |

### numeric_methods.go（约 40+ 个方法）

**好消息**: numeric_methods.go 中的大部分方法已经使用了 `setFunctionNameAndLength` 辅助函数，都是 ✅ **已修复** 状态！

示例：
- `readInt8` ✅
- `writeInt8` ✅  
- `readUInt8` ✅
- `writeUInt8` ✅
- `readInt16BE/LE` ✅
- `readInt32BE/LE` ✅
- `readFloatBE/LE` ✅
- `readDoubleBE/LE` ✅
- 等等...

## 统计总结

| 文件 | 总方法数 | 已修复 | 需要修复 | 修复率 |
|------|---------|--------|---------|--------|
| write_methods.go | 17 | 1 | 16 | 5.9% |
| iterator_methods.go | 3 | 1 | 2 | 33.3% |
| bigint_methods.go | 14 | 10 | 4 | 71.4% |
| numeric_methods.go | 40+ | 40+ | 0 | 100% ✅ |
| **合计** | **74+** | **52+** | **22** | **70.3%** |

## 修复优先级

### P0 - 高优先级（常用方法）
1. `toString` - 最常用
2. `slice` - 常用
3. `indexOf` - 常用
4. `includes` - 常用
5. `fill` - 常用
6. `copy` - 常用
7. `equals` - 常用
8. `compare` - 常用

### P1 - 中优先级
9. `write` - 常用但复杂
10. `lastIndexOf`
11. `subarray`
12. `set`
13. `swap16/32/64`
14. `toJSON`

### P2 - 低优先级（少用或特殊）
15. `entries`
16. `values`
17. `valueOf`
18. BigInt 写入方法

## 修复建议

### 方案 1：使用现有的辅助函数（推荐）

`utils.go` 已经提供了 `setFunctionNameAndLength` 函数：

```go
func setFunctionNameAndLength(runtime *goja.Runtime, fn goja.Value, name string, length int) {
    if fnObj := fn.ToObject(runtime); fnObj != nil {
        fnObj.DefineDataProperty("name", runtime.ToValue(name), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
        fnObj.DefineDataProperty("length", runtime.ToValue(length), goja.FLAG_FALSE, goja.FLAG_FALSE, goja.FLAG_TRUE)
    }
}
```

**使用示例**：
```go
// 修复前
prototype.Set("slice", func(call goja.FunctionCall) goja.Value {
    // ... 实现 ...
})

// 修复后
sliceFunc := func(call goja.FunctionCall) goja.Value {
    // ... 实现 ...
}
sliceValue := runtime.ToValue(sliceFunc)
setFunctionNameAndLength(runtime, sliceValue, "slice", 0) // length=0 表示可选参数
prototype.Set("slice", sliceValue)
```

### 方案 2：批量修复脚本

可以编写一个 Go 代码生成工具来批量修复这些方法。

## Node.js 函数 length 规则

在 Node.js 中，`length` 表示**必需参数**的数量：

```javascript
// 只有必需参数
function foo(a, b) {}
foo.length; // 2

// 有可选参数
function bar(a, b, c = 0) {}
bar.length; // 2 (只计算 a, b)

// 所有参数可选
function baz(a = 0, b = 0) {}
baz.length; // 0
```

### Buffer 方法的 length 值

| 方法 | Node.js length | 说明 |
|------|----------------|------|
| `reverse()` | 0 | 无必需参数 |
| `slice(start, end)` | 0 | 所有参数可选 |
| `indexOf(value, byteOffset, encoding)` | 1 | value 必需 |
| `fill(value, offset, end, encoding)` | 1 | value 必需 |
| `write(string, offset, length, encoding)` | 1 | string 必需 |
| `equals(otherBuffer)` | 1 | otherBuffer 必需 |
| `compare(target, ...)` | 1 | target 必需 |
| `copy(target, ...)` | 1 | target 必需 |
| `toString(encoding, start, end)` | 0 | 所有可选 |
| `toJSON()` | 0 | 无参数 |
| `includes(value, ...)` | 1 | value 必需 |
| `lastIndexOf(value, ...)` | 1 | value 必需 |
| `swap16/32/64()` | 0 | 无参数 |
| `subarray(start, end)` | 0 | 所有可选 |
| `set(array, offset)` | 1 | array 必需 |
| `entries/keys/values()` | 0 | 无参数 |

## 下一步行动

1. ✅ 已完成：修复 `reverse` 方法
2. 🔄 建议：按优先级逐步修复其他方法
3. 📝 建议：添加测试验证所有方法的 name 和 length 属性
4. 🤖 建议：考虑编写自动化工具统一修复

## 参考资料

- Node.js Function.length: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/length
- Node.js Function.name: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/name
- goja DefineDataProperty: https://pkg.go.dev/github.com/dop251/goja#Object.DefineDataProperty
