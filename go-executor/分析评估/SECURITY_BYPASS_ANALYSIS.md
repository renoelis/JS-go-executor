# 🔒 安全绕过分析报告

## ⚠️ 严重问题：字符串检测可被轻易绕过

### 📍 问题位置

**文件**: `go-executor/service/executor_helpers.go:401-471`  
**方法**: `validateCodeSecurity()`  
**检测方式**: `strings.Contains(code, pattern)`

---

## 🚨 当前安全漏洞

### 1. 字符串拼接绕过

#### 当前检测
```go
{"Function(", "Function构造器可执行任意代码"}
```

#### 绕过方式
```javascript
// ❌ 被检测：直接使用
Function('return this')();

// ✅ 绕过检测：字符串拼接
var F = 'Func' + 'tion';
globalThis[F]('return this')();

// ✅ 绕过检测：模板字符串
var cmd = `${'Func'}${'tion'}`;
globalThis[cmd]('return this')();

// ✅ 绕过检测：数组拼接
var parts = ['F', 'u', 'n', 'c', 't', 'i', 'o', 'n'];
var F = parts.join('');
globalThis[F]('return this')();
```

### 2. 计算属性绕过

#### 当前检测
```go
{"globalThis.", "globalThis对象访问被禁止"}
{"globalThis[", "globalThis对象访问被禁止"}
```

#### 绕过方式
```javascript
// ❌ 被检测
globalThis.Function
globalThis['Function']

// ✅ 绕过检测：使用 this
(function() { 
    return this; 
})().Function('return this')();

// ✅ 绕过检测：间接引用
var g = (0, eval)('this');  // 如果 eval 可用
var g = new Function('return this')();  // 如果能绕过 Function 检测

// ✅ 绕过检测：构造器链
({}).constructor.constructor('return this')();
```

### 3. 编码绕过

#### 绕过方式
```javascript
// ✅ 使用 Unicode 编码
var F = '\u0046\u0075\u006e\u0063\u0074\u0069\u006f\u006e';
globalThis[F]('return this')();

// ✅ 使用 Hex 编码
var F = String.fromCharCode(70,117,110,99,116,105,111,110);
globalThis[F]('return this')();

// ✅ 使用 Base64
var F = atob('RnVuY3Rpb24=');
globalThis[F]('return this')();
```

### 4. 间接执行绕过

#### 绕过方式
```javascript
// ✅ 通过对象原型
var proto = Object.getPrototypeOf({});
var ctor = proto.constructor;
ctor.constructor('malicious code')();

// ✅ 通过数组方法
[].constructor.constructor('return this')();

// ✅ 通过正则表达式
/x/.constructor.constructor('return this')();

// ✅ 通过 Promise
Promise.constructor.constructor('return this')();
```

### 5. 注释和空白字符绕过

#### 当前检测
```go
{"Function(", "..."}
```

#### 绕过方式
```javascript
// ✅ 添加空格
Function /*comment*/ ('return this')();

// ✅ 换行符
Function
('return this')();

// ✅ Tab 和其他空白
Function	('return this')();
```

---

## 🔬 实际测试验证

### 测试 1: 字符串拼接绕过

```javascript
// 测试代码
var F = 'Func' + 'tion';
var dangerous = globalThis[F];
return typeof dangerous;  // 返回 "function" - 绕过成功！
```

**结果**: ✅ 绕过成功，未被检测

### 测试 2: 构造器链绕过

```javascript
// 测试代码
var ctor = ({}).constructor.constructor;
return ctor('return "escaped"')();  // 返回 "escaped" - 沙箱逃逸！
```

**结果**: ✅ 绕过成功，沙箱逃逸

### 测试 3: 编码绕过

```javascript
// 测试代码
var F = String.fromCharCode(70,117,110,99,116,105,111,110);
return globalThis[F]('return this')();  // 返回全局对象 - 严重漏洞！
```

**结果**: ✅ 绕过成功，获取全局对象

---

## 💥 安全风险评估

### 风险等级: 🔴 **严重 (Critical)**

| 风险类型 | 严重程度 | 利用难度 | 影响范围 |
|---------|---------|---------|---------|
| **沙箱逃逸** | 🔴 严重 | 🟢 简单 | 完全控制 |
| **任意代码执行** | 🔴 严重 | 🟢 简单 | 完全控制 |
| **原型污染** | 🟡 高 | 🟡 中等 | 数据泄露 |
| **DoS 攻击** | 🟡 高 | 🟢 简单 | 服务中断 |

### 可能的攻击场景

#### 1. 获取全局对象
```javascript
var g = ({}).constructor.constructor('return this')();
// 现在可以访问所有全局对象和方法
```

#### 2. 访问 Go 运行时
```javascript
// 如果 goja 暴露了 Go 对象
var g = ({}).constructor.constructor('return this')();
// 可能访问 Go 的内部结构
```

#### 3. 原型污染
```javascript
Object.prototype.isAdmin = true;
// 污染所有对象
```

#### 4. 资源耗尽
```javascript
// 绕过 while(true) 检测
function loop() { loop(); }
loop();  // 栈溢出

// 或者
var a = [];
while(1) { a.push(new Array(1000000)); }  // 内存耗尽
```

---

## ✅ 安全修复方案

### 方案 1: 在运行时层面禁用（推荐）✨

**优点**: 无法绕过，最安全  
**缺点**: 可能影响某些嵌入库

```go
// executor_service.go:322-327
func (e *JSExecutor) disableUnsafeFeatures(runtime *goja.Runtime) {
    // 🔒 完全禁用危险功能（无法绕过）
    runtime.Set("eval", goja.Undefined())
    runtime.Set("Function", goja.Undefined())     // ✅ 必须禁用
    runtime.Set("globalThis", goja.Undefined())   // ✅ 必须禁用
    runtime.Set("window", goja.Undefined())       // ✅ 必须禁用
    runtime.Set("self", goja.Undefined())         // ✅ 必须禁用
    
    // 🔒 禁用 constructor.constructor 访问
    // 方式1: 冻结关键对象
    runtime.RunString(`
        Object.freeze(Object.prototype);
        Object.freeze(Array.prototype);
        Object.freeze(Function.prototype);
    `)
    
    // 方式2: 删除 constructor 访问（激进）
    runtime.RunString(`
        delete Object.prototype.constructor;
        delete Array.prototype.constructor;
    `)
}
```

### 方案 2: AST 级别检测（最彻底）

使用 goja 的解析器在 AST 层面检测：

```go
import (
    "github.com/dop251/goja/parser"
    "github.com/dop251/goja/ast"
)

func (e *JSExecutor) validateCodeAST(code string) error {
    // 解析代码为 AST
    program, err := parser.ParseFile(nil, "", code, 0)
    if err != nil {
        return err
    }
    
    // 遍历 AST 检测危险模式
    visitor := &SecurityVisitor{
        dangerousPatterns: []string{
            "Function",
            "eval",
            "constructor",
            "__proto__",
            "globalThis",
            "window",
            "self",
        },
    }
    
    ast.Walk(visitor, program)
    
    if visitor.HasDangerousPattern {
        return &model.ExecutionError{
            Type: "SecurityError",
            Message: "代码包含危险的安全模式",
        }
    }
    
    return nil
}

type SecurityVisitor struct {
    HasDangerousPattern bool
    dangerousPatterns   []string
}

func (v *SecurityVisitor) Visit(node ast.Node) ast.Visitor {
    switch n := node.(type) {
    case *ast.Identifier:
        // 检测标识符
        for _, pattern := range v.dangerousPatterns {
            if n.Name == pattern {
                v.HasDangerousPattern = true
                return nil
            }
        }
    case *ast.CallExpression:
        // 检测函数调用
        // ...
    case *ast.MemberExpression:
        // 检测成员访问
        // ...
    }
    return v
}
```

### 方案 3: 两层防御（平衡方案）

```go
// 第一层: 运行时禁用（主要防御）
func (e *JSExecutor) setupSecureRuntime(runtime *goja.Runtime) {
    // 完全禁用核心危险功能
    runtime.Set("eval", goja.Undefined())
    runtime.Set("Function", goja.Undefined())
    
    // 为嵌入库创建受限的全局对象
    runtime.RunString(`
        // 创建一个受限的 globalThis
        var _restrictedGlobal = {
            Promise: Promise,
            setTimeout: setTimeout,
            console: console,
            // 只暴露安全的 API
        };
        
        // 隐藏原始的 globalThis
        var globalThis = undefined;
        var window = undefined;
        var self = undefined;
    `)
}

// 第二层: 代码检测（辅助防御）
func (e *JSExecutor) validateCodeSecurity(code string) error {
    // 保留当前的字符串检测作为辅助
    // 但不应该作为唯一的防御
    // ...
}
```

### 方案 4: 白名单模式（最严格）

```go
// 只允许使用明确列出的功能
func (e *JSExecutor) setupWhitelistRuntime(runtime *goja.Runtime) {
    // 1. 清空全局对象
    runtime.RunString(`
        var _safe = {
            // 明确允许的 API
            console: console,
            Promise: Promise,
            setTimeout: setTimeout,
            require: require,
            // ... 其他安全 API
        };
        
        // 清空其他所有内容
        this = undefined;
        globalThis = undefined;
    `)
    
    // 2. 只注入白名单中的对象
    // ...
}
```

---

## 🎯 立即行动建议

### 紧急修复（必须）

1. **禁用 Function 构造器**
```go
runtime.Set("Function", goja.Undefined())
```

2. **禁用全局对象访问**
```go
runtime.Set("globalThis", goja.Undefined())
runtime.Set("window", goja.Undefined())
runtime.Set("self", goja.Undefined())
```

3. **冻结关键原型**
```go
runtime.RunString(`
    Object.freeze(Object.prototype);
    Object.freeze(Array.prototype);
    Object.freeze(Function.prototype);
`)
```

### 中期改进

1. **实现 AST 级别检测**
2. **添加运行时沙箱监控**
3. **实现资源限制（内存、CPU）**

### 长期规划

1. **迁移到更安全的 VM 实现**
2. **实现完整的能力基础安全模型**
3. **添加审计日志和异常检测**

---

## 📝 嵌入库兼容性问题

### 问题

如注释所说，某些嵌入库（如 lodash）需要访问 `Function` 和 `globalThis`：

```javascript
// lodash 内部代码
var root = Function('return this')();
```

### 解决方案 1: 预处理嵌入库

```go
func (e *JSExecutor) setupEmbeddedLibrary(runtime *goja.Runtime, libCode string) {
    // 1. 在安全的临时 runtime 中执行库代码
    tempRuntime := goja.New()
    tempRuntime.Set("Function", tempRuntime.Get("Function"))  // 允许
    
    // 2. 执行库代码
    libExports, err := tempRuntime.RunString(libCode)
    
    // 3. 将导出的安全 API 注入到用户 runtime
    runtime.Set("lodash", libExports)
}
```

### 解决方案 2: 修改嵌入库代码

```go
func preprocessLibraryCode(libCode string) string {
    // 替换危险的全局对象访问
    libCode = strings.ReplaceAll(libCode, 
        "Function('return this')()", 
        "_providedGlobal")
    
    // 提供一个安全的伪全局对象
    return `
        var _providedGlobal = {
            Array: Array,
            Object: Object,
            // ... 其他安全的全局对象
        };
    ` + libCode
}
```

### 解决方案 3: 使用修改过的库版本

为每个嵌入库创建一个"安全版本"，移除危险的全局访问代码。

---

## 🔬 验证方法

### 创建安全测试套件

```javascript
// test/security/bypass-tests.js

// 测试 1: 字符串拼接
var F = 'Func' + 'tion';
try {
    var ctor = globalThis[F];
    return { bypassMethod: 'string-concat', success: true, critical: true };
} catch(e) {
    return { bypassMethod: 'string-concat', success: false };
}

// 测试 2: 构造器链
try {
    var ctor = ({}).constructor.constructor;
    var result = ctor('return "escaped"')();
    return { bypassMethod: 'constructor-chain', success: true, critical: true };
} catch(e) {
    return { bypassMethod: 'constructor-chain', success: false };
}

// 测试 3: 编码绕过
try {
    var F = String.fromCharCode(70,117,110,99,116,105,111,110);
    return { bypassMethod: 'encoding', success: true, critical: true };
} catch(e) {
    return { bypassMethod: 'encoding', success: false };
}

// ... 更多测试
```

---

## 📊 风险对比

| 防御方式 | 安全性 | 绕过难度 | 性能影响 | 兼容性 |
|---------|--------|---------|---------|--------|
| **字符串检测** | 🔴 低 | 🟢 简单 | ✅ 无 | ✅ 好 |
| **运行时禁用** | 🟢 高 | 🔴 困难 | ✅ 无 | ⚠️ 中 |
| **AST 检测** | 🟡 中-高 | 🟡 中等 | ⚠️ 中 | ✅ 好 |
| **白名单模式** | 🟢 最高 | 🔴 极难 | ⚠️ 中 | 🔴 差 |

---

## 🎯 推荐方案

综合安全性、性能和兼容性，推荐使用：

**运行时禁用 + 预处理嵌入库**

```go
// 1. 对用户代码：完全禁用危险功能
runtime.Set("Function", goja.Undefined())
runtime.Set("globalThis", goja.Undefined())

// 2. 对嵌入库：在隔离环境中预执行
embeddedLibs := preloadLibraries()
runtime.Set("lodash", embeddedLibs["lodash"])
```

这种方案：
- ✅ 安全性高（无法绕过）
- ✅ 性能好（无额外检测开销）
- ✅ 兼容性可控（嵌入库单独处理）

---

**结论**: 当前的字符串检测方式**不安全**，建议立即实施运行时禁用方案。

---

**报告作者**: AI Assistant  
**严重程度**: 🔴 Critical  
**建议优先级**: 🔴 P0 - 立即修复





