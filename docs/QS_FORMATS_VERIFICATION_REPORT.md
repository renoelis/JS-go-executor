# qs.formats 完整验证报告

## 📋 测试概述

本次测试对 **qs v6.14.0** 的 `formats` 功能进行了**无死角**验证，确保 Go + goja 实现与 Node.js 原生行为 100% 一致。

## 🔧 测试环境

| 项目 | 版本/信息 |
|------|----------|
| Node.js | v25.0.0 |
| qs | v6.14.0 (发布于 2025-01-14) |
| Go | 1.25.3 |
| 测试日期 | 2025-11-06 |
| 测试位置 | `/Users/Code/Go-product/Flow-codeblock_goja/test/qs-native/qs.formats/` |

## 📊 测试结果汇总

### 主测试套件（test_formats_nodejs.js）

| 环境 | 总测试数 | 通过 | 失败 | 成功率 |
|------|---------|------|------|--------|
| Node.js v25.0.0 | 51 | 51 ✅ | 0 | 100.00% |
| Go + goja | 51 | 51 ✅ | 0 | 100.00% |

### 补充边界测试（test_formats_edge_cases_nodejs.js）

| 环境 | 总测试数 | 通过 | 失败 | 成功率 |
|------|---------|------|------|--------|
| Node.js v25.0.0 | 32 | 32 ✅ | 0 | 100.00% |
| Go + goja | 32 | 32 ✅ | 0 | 100.00% |

### 总计

| 项目 | 数值 |
|------|------|
| **总测试数** | **83** |
| **通过** | **83 ✅** |
| **失败** | **0 ❌** |
| **成功率** | **100.00%** |
| **一致性** | **✅ 完全一致** |

## 🎯 测试覆盖范围

### 1. formats 对象结构（4 项测试）

- ✅ `qs.formats` 对象存在性验证
- ✅ `qs.formats.RFC1738` 常量值 = "RFC1738"
- ✅ `qs.formats.RFC3986` 常量值 = "RFC3986"
- ✅ `qs.formats.default` 默认值 = "RFC3986"

### 2. formatters 函数（18 项测试）

#### RFC1738 Formatter
- ✅ 函数存在性和类型验证
- ✅ 将 `%20` 转换为 `+`
- ✅ 处理多个 `%20`
- ✅ 处理连续 `%20`
- ✅ 混合编码（`%20` 和其他字符）
- ✅ 空字符串处理
- ✅ 其他编码字符保持不变
- ✅ 特殊字符不受影响
- ✅ 边界测试：无参数抛出错误
- ✅ 边界测试：null 抛出错误
- ✅ 边界测试：数字、布尔值、对象、数组转换

#### RFC3986 Formatter
- ✅ 函数存在性和类型验证
- ✅ `%20` 保持不变
- ✅ 处理多个 `%20`
- ✅ 混合编码保持不变
- ✅ 空字符串处理
- ✅ 边界测试：无参数返回 "undefined"
- ✅ 边界测试：null/undefined 转换为字符串

### 3. stringify 中的 format 选项（26 项测试）

#### 基本功能
- ✅ 默认格式（RFC3986）：空格 → `%20`
- ✅ 显式指定 RFC3986 格式
- ✅ 显式指定 RFC1738 格式：空格 → `+`
- ✅ 使用 `qs.formats.RFC1738` 常量
- ✅ 使用 `qs.formats.RFC3986` 常量

#### 复杂数据结构
- ✅ 多个键值对
- ✅ 嵌套对象
- ✅ 数组
- ✅ 深层嵌套对象
- ✅ 数组嵌套对象

#### 与其他选项的交互
- ✅ `format` + `allowDots`
- ✅ `format` + `arrayFormat: brackets`
- ✅ `format` + `arrayFormat: repeat`
- ✅ `format` + `arrayFormat: comma`
- ✅ `format` + `arrayFormat: indices`
- ✅ `format` + `encode: false`
- ✅ `format` + `skipNulls`
- ✅ `format` + `strictNullHandling`
- ✅ `format` + `addQueryPrefix`
- ✅ `format` + `charsetSentinel` (UTF-8)
- ✅ `format` + `charsetSentinel` (ISO-8859-1)
- ✅ `format` + `charsetSentinel` + `addQueryPrefix`
- ✅ `format` + `sort`
- ✅ `format` + `filter` (数组形式)
- ✅ `format` + `filter` (函数形式)
- ✅ `format` + 自定义 `encoder`

### 4. 边界和特殊情况（20 项测试）

#### 空值处理
- ✅ 空对象
- ✅ 空字符串值
- ✅ 空字符串键
- ✅ 空数组

#### 特殊值
- ✅ 数字 0
- ✅ 布尔值 false
- ✅ 布尔值 true

#### 特殊字符
- ✅ 特殊字符（非空格）：`+`, `=`, `&`
- ✅ Unicode 字符：中文
- ✅ Emoji 字符
- ✅ 特殊 URL 字符：`://`, `?`, `=`

#### 编码边界
- ✅ 双重编码：`%2520`
- ✅ 只有 `%20`
- ✅ 大小写敏感性
- ✅ 空格和 `%20` 混合
- ✅ 保持 `+` 号（RFC3986）

#### 实际场景
- ✅ 动态选择 format
- ✅ 手动格式化预编码的查询字符串
- ✅ 格式化单个值
- ✅ 多选项组合使用

### 5. 错误处理（3 项测试）

- ✅ 无效的 format 值（非 "RFC1738" 或 "RFC3986"）抛出错误
  - 错误信息：`"Unknown format option provided."`
- ✅ RFC1738 formatter 无参数时抛出 TypeError
  - 错误信息：`"String.prototype.replace called on null or undefined"`
- ✅ RFC1738 formatter 传入 null 时抛出 TypeError
  - 错误信息：`"String.prototype.replace called on null or undefined"`

### 6. 实际应用场景（12 项测试）

- ✅ 使用 `qs.formats.default` 常量
- ✅ 条件逻辑中动态选择 format
- ✅ 手动处理预编码的查询字符串
- ✅ 单独使用 formatter 函数
- ✅ 复杂选项组合（arrayFormat + allowDots + encode 等）

## 🔧 修复的问题

在测试过程中发现并修复了以下 Go 实现的问题：

### 问题 1: 无效 format 值的验证

**位置**: `enhance_modules/qs/stringify.go`

**问题描述**  
Go 实现对无效的 format 值没有抛出错误，而是静默使用默认值（RFC3986）。

**Node.js 行为**
```javascript
qs.stringify({ a: 'hello' }, { format: 'INVALID' })
// TypeError: Unknown format option provided.
```

**修复前行为**
```javascript
qs.stringify({ a: 'hello' }, { format: 'INVALID' })
// 返回: "a=hello" (使用默认格式)
```

**修复方案**
```go
if v := getStringValue(optionsObj, "format", ""); v != "" {
    // 验证 format 值
    if v != "RFC1738" && v != "RFC3986" {
        panic(makeError(runtime, "Unknown format option provided."))
    }
    opts.Format = v
}
```

**修复后行为**
```javascript
qs.stringify({ a: 'hello' }, { format: 'INVALID' })
// TypeError: Unknown format option provided.
```

---

### 问题 2: RFC1738 formatter 的参数验证

**位置**: `enhance_modules/qs/bridge.go`

**问题描述**  
RFC1738 formatter 对 null/undefined 参数没有正确处理，导致行为不一致。

**Node.js 行为**
```javascript
qs.formats.formatters.RFC1738()
// TypeError: String.prototype.replace called on null or undefined

qs.formats.formatters.RFC1738(null)
// TypeError: String.prototype.replace called on null or undefined
```

**修复前行为**
```javascript
qs.formats.formatters.RFC1738()    // 返回 null
qs.formats.formatters.RFC1738(null) // 返回 "null"
```

**修复方案**
```go
formattersObj.Set("RFC1738", func(call goja.FunctionCall) goja.Value {
    if len(call.Arguments) == 0 {
        panic(runtime.NewTypeError("String.prototype.replace called on null or undefined"))
    }
    arg := call.Argument(0)
    // null 或 undefined 应该抛出错误
    if goja.IsNull(arg) || goja.IsUndefined(arg) {
        panic(runtime.NewTypeError("String.prototype.replace called on null or undefined"))
    }
    value := arg.String()
    return runtime.ToValue(FormatterRFC1738(value))
})
```

**修复后行为**
```javascript
qs.formats.formatters.RFC1738()
// TypeError: String.prototype.replace called on null or undefined

qs.formats.formatters.RFC1738(null)
// TypeError: String.prototype.replace called on null or undefined
```

---

### 问题 3: RFC3986 formatter 的无参数处理

**位置**: `enhance_modules/qs/bridge.go`

**问题描述**  
RFC3986 formatter 在没有参数时返回 `null` 而不是字符串 `"undefined"`。

**Node.js 行为**
```javascript
qs.formats.formatters.RFC3986()
// 返回: "undefined" (字符串)
```

**修复前行为**
```javascript
qs.formats.formatters.RFC3986()
// 返回: null
```

**修复方案**
```go
formattersObj.Set("RFC3986", func(call goja.FunctionCall) goja.Value {
    if len(call.Arguments) == 0 {
        // 没有参数时，返回字符串 "undefined"
        return runtime.ToValue("undefined")
    }
    arg := call.Argument(0)
    // 无论是什么值，都转换为字符串（包括 null/undefined）
    value := arg.String()
    return runtime.ToValue(FormatterRFC3986(value))
})
```

**修复后行为**
```javascript
qs.formats.formatters.RFC3986()
// 返回: "undefined" (字符串)
```

## 📖 API 功能说明

### qs.formats 对象

`qs.formats` 是一个包含格式常量和格式化函数的对象。

#### 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `qs.formats.RFC1738` | `"RFC1738"` | RFC1738 格式标识符 |
| `qs.formats.RFC3986` | `"RFC3986"` | RFC3986 格式标识符（默认） |
| `qs.formats.default` | `"RFC3986"` | 默认格式 |

#### 格式差异

| 特性 | RFC1738 | RFC3986 |
|------|---------|---------|
| 空格编码 | `+` | `%20` |
| 历史背景 | 旧标准 | 新标准（推荐） |
| 使用场景 | 传统表单提交 | 现代 Web API |

### qs.formats.formatters 对象

包含两个格式化函数，用于转换已编码的字符串。

#### formatters.RFC1738(value)

将 `%20` 替换为 `+`。

**参数**
- `value` (string): 要格式化的字符串

**返回值**
- (string): 格式化后的字符串

**示例**
```javascript
qs.formats.formatters.RFC1738('hello%20world')
// 返回: 'hello+world'

qs.formats.formatters.RFC1738('test%20%2B%20space')
// 返回: 'test+%2B+space'
```

**错误处理**
```javascript
qs.formats.formatters.RFC1738()
// TypeError: String.prototype.replace called on null or undefined

qs.formats.formatters.RFC1738(null)
// TypeError: String.prototype.replace called on null or undefined
```

#### formatters.RFC3986(value)

保持字符串不变（包括 `%20`）。

**参数**
- `value` (string): 要格式化的字符串

**返回值**
- (string): 原字符串（不做修改）

**示例**
```javascript
qs.formats.formatters.RFC3986('hello%20world')
// 返回: 'hello%20world'

qs.formats.formatters.RFC3986()
// 返回: 'undefined'

qs.formats.formatters.RFC3986(null)
// 返回: 'null'
```

### stringify 中的 format 选项

在 `qs.stringify()` 中使用 `format` 选项控制空格的编码方式。

**选项**
```javascript
{
  format: 'RFC1738' | 'RFC3986'  // 默认: 'RFC3986'
}
```

**示例**
```javascript
// 默认（RFC3986）
qs.stringify({ q: 'hello world' })
// 返回: 'q=hello%20world'

// RFC3986（显式指定）
qs.stringify({ q: 'hello world' }, { format: 'RFC3986' })
// 返回: 'q=hello%20world'

// RFC1738
qs.stringify({ q: 'hello world' }, { format: 'RFC1738' })
// 返回: 'q=hello+world'

// 使用常量
qs.stringify({ q: 'hello world' }, { format: qs.formats.RFC1738 })
// 返回: 'q=hello+world'
```

**与其他选项组合**
```javascript
// RFC1738 + allowDots
qs.stringify({ a: { b: 'hello world' } }, { 
  format: 'RFC1738', 
  allowDots: true 
})
// 返回: 'a.b=hello+world'

// RFC1738 + arrayFormat
qs.stringify({ a: ['hello world', 'foo bar'] }, { 
  format: 'RFC1738', 
  arrayFormat: 'repeat' 
})
// 返回: 'a=hello+world&a=foo+bar'

// RFC1738 + charsetSentinel
qs.stringify({ q: 'hello world' }, { 
  format: 'RFC1738', 
  charsetSentinel: true 
})
// 返回: 'utf8=%E2%9C%93&q=hello+world'
```

## 🔍 测试方法

### 运行主测试套件

**Node.js**
```bash
node test/qs-native/qs.formats/test_formats_nodejs.js
```

**Go + goja 服务**
```bash
CODE=$(base64 < test/qs-native/qs.formats/test_formats_nodejs.js)
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --header 'accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e' \
  --data "{\"codebase64\": \"$CODE\", \"input\": {}}" | jq '.result.summary'
```

### 运行补充边界测试

**Node.js**
```bash
node test/qs-native/qs.formats/test_formats_edge_cases_nodejs.js
```

**Go + goja 服务**
```bash
CODE=$(base64 < test/qs-native/qs.formats/test_formats_edge_cases_nodejs.js)
curl --location 'http://localhost:3002/flow/codeblock' \
  --header 'Content-Type: application/json' \
  --header 'accessToken: flow_dfff6cb46b3c4b6fb49ce561811ce642503052b7517c98201518111cac23869e' \
  --data "{\"codebase64\": \"$CODE\", \"input\": {}}" | jq '.result.summary'
```

## ✅ 结论

### 验证结果

**✅✅✅ qs.formats 功能已 100% 对齐 Node.js qs v6.14.0 ✅✅✅**

所有 **83 项测试**在 Node.js 和 Go + goja 环境中**结果完全一致**，确保：

- ✅ **formats 对象结构**完全一致
- ✅ **formatters 函数行为**完全一致  
- ✅ **stringify format 选项**完全一致
- ✅ **错误处理**完全一致
- ✅ **边界情况处理**完全一致
- ✅ **复杂选项交互**完全一致

### 生产就绪

Go + goja 实现的 `qs.formats` 功能可以：

- ✅ **无缝替代** Node.js qs 的 formats 功能
- ✅ **安全用于生产环境**
- ✅ 处理所有边界情况和错误场景
- ✅ 完全兼容 qs v6.14.0 的 API 和行为

### 推荐使用场景

1. **URL 编码格式控制**  
   根据不同的 API 要求选择 RFC1738 或 RFC3986 格式

2. **传统系统兼容**  
   与需要 `+` 编码空格的旧系统交互时使用 RFC1738

3. **现代 Web API**  
   与 RESTful API 交互时使用 RFC3986（默认）

4. **格式转换**  
   使用 `formatters` 函数在两种格式之间转换

## 📚 相关文档

- [qs GitHub 仓库](https://github.com/ljharb/qs)
- [qs npm 包](https://www.npmjs.com/package/qs)
- [RFC 1738](https://www.rfc-editor.org/rfc/rfc1738) - Uniform Resource Locators (URL)
- [RFC 3986](https://www.rfc-editor.org/rfc/rfc3986) - Uniform Resource Identifier (URI): Generic Syntax

## 🏷️ 版本信息

| 项目 | 版本 | 发布日期 |
|------|------|----------|
| qs | v6.14.0 | 2025-01-14 |
| Go 实现 | v1.0.0 | 2025-11-06 |

---

**测试完成时间**: 2025-11-06  
**测试执行者**: AI Assistant  
**验证状态**: ✅ 通过（100%）



