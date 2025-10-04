# 🔒 安全修复方案（兼容嵌入库）

## 问题分析

### 核心矛盾

1. **安全需求**：必须禁用 `Function` 和 `globalThis` 防止用户代码沙箱逃逸
2. **兼容性需求**：嵌入库（lodash、qs等）需要使用 `Function('return this')()` 来获取全局对象

### 当前执行流程

```go
// setupRuntime 的执行顺序
func (e *JSExecutor) setupRuntime(runtime *goja.Runtime) {
    runtime.Set("__strict__", true)
    e.setupNodeJSModules(runtime)           // ← 步骤1: 加载 require 系统
    e.setupGlobalObjects(runtime)           // ← 步骤2: 设置全局对象
    e.setupSecurityRestrictions(runtime)    // ← 步骤3: 设置安全限制（禁用危险功能）
    // ...
}

func (e *JSExecutor) setupNodeJSModules(runtime *goja.Runtime) {
    e.registry.Enable(runtime)  // ← 这里会加载所有嵌入库（lodash、qs等）
    // 此时 Function 和 globalThis 还可用！
}
```

### 为什么嵌入库需要这些功能？

**lodash.min.js 第458行**:
```javascript
var root = freeGlobal || freeSelf || Function('return this')();
```

**qs.min.js**:
```javascript
var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : 
                     typeof window !== 'undefined' ? window : 
                     typeof global !== 'undefined' ? global : 
                     typeof self !== 'undefined' ? self : {};
```

---

## ✅ 解决方案：分阶段加载

### 核心思路

1. **阶段1（可信环境）**：加载嵌入库时，允许 `Function` 和 `globalThis`
2. **阶段2（隔离）**：嵌入库加载完成后，冻结导出的API
3. **阶段3（限制）**：执行用户代码前，禁用危险功能

### 方案 1: 预编译嵌入库（推荐）⭐

**原理**：在服务启动时预先加载所有嵌入库，保存其导出对象，然后在用户 runtime 中直接注入

```go
// ============================================
// 1. 在 JSExecutor 中添加预编译缓存
// ============================================
type JSExecutor struct {
    // ... 现有字段
    
    // 预编译的库导出（在初始化时一次性加载）
    preloadedLibs map[string]interface{}
    preloadMutex  sync.RWMutex
}

// ============================================
// 2. 在初始化时预加载所有库
// ============================================
func NewJSExecutor(cfg *config.Config) *JSExecutor {
    executor := &JSExecutor{
        // ... 现有初始化
        preloadedLibs: make(map[string]interface{}),
    }
    
    // 注册所有模块（保持现有逻辑）
    executor.cryptoEnhancer.RegisterCryptoModule(executor.registry)
    executor.axiosEnhancer.RegisterAxiosModule(executor.registry)
    // ... 其他模块
    
    // 🔒 关键：预加载所有库的导出
    executor.preloadEmbeddedLibraries()
    
    // 初始化 Runtime 池
    executor.initRuntimePool()
    
    return executor
}

// ============================================
// 3. 预加载库的实现
// ============================================
func (e *JSExecutor) preloadEmbeddedLibraries() {
    log.Println("🔐 预加载嵌入库（可信环境）...")
    
    // 创建一个临时的、完全权限的 runtime
    trustedRuntime := goja.New()
    
    // ✅ 在这个环境中，Function 和 globalThis 可用
    e.registry.Enable(trustedRuntime)
    
    // 提取所有库的导出
    libNames := []string{
        "lodash", 
        "qs", 
        "axios", 
        "pinyin", 
        "uuid",
        // 其他需要预加载的库
    }
    
    for _, libName := range libNames {
        code := fmt.Sprintf(`require('%s')`, libName)
        libExport, err := trustedRuntime.RunString(code)
        if err != nil {
            log.Printf("⚠️  预加载 %s 失败: %v", libName, err)
            continue
        }
        
        // 保存导出对象（goja.Value 是安全的跨 runtime 引用）
        e.preloadMutex.Lock()
        e.preloadedLibs[libName] = libExport.Export()
        e.preloadMutex.Unlock()
        
        log.Printf("✅ 预加载 %s 成功", libName)
    }
    
    log.Printf("✅ 预加载完成，共 %d 个库", len(e.preloadedLibs))
}

// ============================================
// 4. 修改 setupRuntime：先禁用，再注入
// ============================================
func (e *JSExecutor) setupRuntime(runtime *goja.Runtime) {
    runtime.Set("__strict__", true)
    
    // 🔒 关键改动：先设置安全限制
    e.setupSecurityRestrictions(runtime)
    
    // 然后设置 Node.js 基础模块（不包含嵌入库）
    e.setupNodeJSModules(runtime)
    
    // 注入预加载的库（通过自定义 require）
    e.injectPreloadedLibraries(runtime)
    
    // 设置其他全局对象
    e.setupGlobalObjects(runtime)
    
    // 注册 Fetch API
    if err := e.fetchEnhancer.RegisterFetchAPI(runtime); err != nil {
        log.Printf("⚠️  Fetch API 注册失败: %v", err)
    }
}

// ============================================
// 5. 注入预加载的库
// ============================================
func (e *JSExecutor) injectPreloadedLibraries(runtime *goja.Runtime) {
    e.preloadMutex.RLock()
    defer e.preloadMutex.RUnlock()
    
    // 创建一个自定义的 require 包装器
    runtime.RunString(`
        var __preloadedLibs = {};
        var __originalRequire = typeof require !== 'undefined' ? require : undefined;
        
        // 重写 require
        var require = function(moduleName) {
            // 优先使用预加载的库
            if (__preloadedLibs[moduleName]) {
                return __preloadedLibs[moduleName];
            }
            
            // 回退到原始 require（用于 Node.js 内置模块）
            if (__originalRequire) {
                return __originalRequire(moduleName);
            }
            
            throw new Error('Module not found: ' + moduleName);
        };
    `)
    
    // 注入每个预加载的库
    for libName, libExport := range e.preloadedLibs {
        runtime.Set("__tempLib", libExport)
        runtime.RunString(fmt.Sprintf(`
            __preloadedLibs['%s'] = __tempLib;
        `, libName))
    }
    
    runtime.RunString(`delete __tempLib;`)
    
    log.Println("✅ 预加载库注入完成")
}

// ============================================
// 6. 加强安全限制
// ============================================
func (e *JSExecutor) setupSecurityRestrictions(runtime *goja.Runtime) {
    // 🔒 完全禁用危险功能
    runtime.Set("eval", goja.Undefined())
    runtime.Set("Function", goja.Undefined())
    runtime.Set("globalThis", goja.Undefined())
    runtime.Set("window", goja.Undefined())
    runtime.Set("self", goja.Undefined())
    
    // 🔒 冻结关键原型，防止构造器链攻击
    runtime.RunString(`
        (function() {
            'use strict';
            
            // 冻结 Object 原型
            if (Object.freeze && Object.prototype) {
                Object.freeze(Object.prototype);
            }
            
            // 冻结 Array 原型
            if (Array.prototype) {
                Object.freeze(Array.prototype);
            }
            
            // 删除危险的构造器访问（更激进的方案）
            try {
                delete Object.prototype.constructor;
                delete Array.prototype.constructor;
                delete String.prototype.constructor;
                delete Number.prototype.constructor;
                delete Boolean.prototype.constructor;
            } catch (e) {
                // 静默失败
            }
        })();
    `)
    
    log.Println("🔒 安全限制已启用")
}
```

---

### 方案 2: 修改嵌入库代码（备选）

**原理**：在构建时自动修改嵌入库的源码，移除对 `Function` 和 `globalThis` 的依赖

```go
// assets/embedded.go 中添加预处理
//go:generate go run preprocess_libs.go

// preprocess_libs.go
package main

func preprocessLodash(source string) string {
    // 替换 Function('return this')()
    source = strings.ReplaceAll(source,
        "Function('return this')()",
        "_safeGlobalObject")
    
    // 在开头注入安全的全局对象
    return `
var _safeGlobalObject = {
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Date: Date,
    RegExp: RegExp,
    Error: Error,
    Promise: Promise,
    // ... 其他安全的全局对象
};
` + source
}
```

**优点**：
- ✅ 完全消除运行时风险
- ✅ 性能最优（无需动态检测）

**缺点**：
- ❌ 维护成本高（每次更新库都要重新处理）
- ❌ 可能破坏库的功能

---

### 方案 3: 双层 Runtime（最安全但复杂）

**原理**：使用两个 runtime，嵌入库在可信 runtime 中执行，用户代码在受限 runtime 中执行

```go
type DualRuntimeExecutor struct {
    // 可信 runtime：用于运行嵌入库
    trustedRuntime *goja.Runtime
    
    // 受限 runtime 池：用于运行用户代码
    userRuntimePool chan *goja.Runtime
}

func (e *DualRuntimeExecutor) Execute(userCode string) {
    // 1. 在受限 runtime 中运行用户代码
    userRuntime := <-e.userRuntimePool
    defer func() { e.userRuntimePool <- userRuntime }()
    
    // 2. 用户代码只能通过消息传递调用库函数
    userRuntime.Set("callLib", func(libName, funcName string, args ...interface{}) interface{} {
        // 在可信 runtime 中执行库函数
        return e.executeInTrusted(libName, funcName, args...)
    })
}
```

**优点**：
- ✅ 最安全（完全隔离）

**缺点**：
- ❌ 复杂度极高
- ❌ 性能损失大（跨 runtime 调用）
- ❌ 改变了用户 API

---

## 📊 方案对比

| 方案 | 安全性 | 性能 | 兼容性 | 复杂度 | 推荐度 |
|-----|--------|------|--------|--------|--------|
| **方案1: 预编译** | 🟢 高 | 🟢 优 | 🟢 好 | 🟡 中 | ⭐⭐⭐⭐⭐ |
| **方案2: 修改源码** | 🟢 最高 | 🟢 最优 | 🟡 中 | 🔴 高 | ⭐⭐⭐ |
| **方案3: 双层Runtime** | 🟢 最高 | 🔴 差 | 🔴 差 | 🔴 极高 | ⭐⭐ |
| **现状: 字符串检测** | 🔴 低 | 🟢 优 | 🟢 好 | 🟢 低 | ❌ |

---

## 🎯 推荐实施方案

### 立即实施：方案1（预编译嵌入库）

**理由**：
- ✅ 安全：用户 runtime 中完全没有 `Function` 和 `constructor.constructor`
- ✅ 兼容：嵌入库在预加载时有完整权限
- ✅ 性能：预加载只执行一次，后续直接注入对象
- ✅ 可维护：不需要修改第三方库源码

### 实施步骤

1. **第一步：添加预加载机制**
   ```bash
   # 修改 executor_service.go
   - 添加 preloadedLibs 字段
   - 实现 preloadEmbeddedLibraries()
   - 实现 injectPreloadedLibraries()
   ```

2. **第二步：调整加载顺序**
   ```bash
   # 修改 setupRuntime()
   - 先调用 setupSecurityRestrictions()
   - 再调用 injectPreloadedLibraries()
   ```

3. **第三步：加强安全限制**
   ```bash
   # 修改 setupSecurityRestrictions()
   - 禁用 Function、globalThis
   - 冻结 Object.prototype
   - 删除 constructor 属性
   ```

4. **第四步：测试验证**
   ```bash
   # 运行安全测试
   go run test/security/final-bypass-test.js
   
   # 运行功能测试
   go run test/libs/lodash-test.js
   go run test/libs/qs-test.js
   ```

---

## 🔬 预期测试结果

### 安全测试（应该全部失败）

```javascript
// test/security/final-bypass-test.js
var k = 'constr' + 'uctor';
var ctor = obj[k][k];
// 预期: undefined（constructor 已被删除）

Function('return this')();
// 预期: ReferenceError: Function is not defined
```

### 功能测试（应该全部通过）

```javascript
// test/libs/lodash-test.js
var _ = require('lodash');
console.log(_.chunk([1, 2, 3, 4], 2));
// 预期: [[1, 2], [3, 4]]

// test/libs/qs-test.js
var qs = require('qs');
console.log(qs.stringify({ a: 1, b: 2 }));
// 预期: "a=1&b=2"
```

---

## ⚠️ 注意事项

### 1. goja.Value 的跨 runtime 限制

**问题**：`goja.Value` 不能直接在不同 runtime 之间共享

**解决**：
```go
// 错误做法 ❌
preloadedLibs[libName] = libExport  // goja.Value

// 正确做法 ✅
preloadedLibs[libName] = libExport.Export()  // interface{}
// 然后在注入时：
runtime.ToValue(preloadedLibs[libName])
```

### 2. 某些库可能需要特殊处理

**crypto-js**：自己实现了密码学算法，不依赖全局对象 ✅  
**axios**：可能需要访问 `XMLHttpRequest` 或 `http` 模块 ⚠️  
**xlsx**：已经是 Go 原生实现，不受影响 ✅

### 3. EventLoop 中的处理

EventLoop 也需要同样的预加载机制：

```go
func (e *JSExecutor) executeWithEventLoop(code string, input map[string]interface{}) {
    loop := eventloop.NewEventLoop(eventloop.WithRegistry(e.registry))
    
    loop.Run(func(runtime *goja.Runtime) {
        // 先设置安全限制
        e.setupSecurityRestrictions(runtime)
        
        // 再注入预加载的库
        e.injectPreloadedLibraries(runtime)
        
        // ...
    })
}
```

---

## 📝 总结

**当前问题**：
- 🔴 字符串检测容易绕过
- 🔴 构造器链攻击成功
- 🔴 可以执行任意代码

**修复后**：
- 🟢 用户 runtime 完全没有 `Function` 和 `constructor`
- 🟢 嵌入库正常工作（预加载环境中有完整权限）
- 🟢 性能无损失（预加载只执行一次）
- 🟢 兼容性良好（用户代码 API 不变）

**需要实施的代码修改**：
- `executor_service.go`：添加预加载逻辑
- `executor_helpers.go`：调整加载顺序，加强安全限制

---

**下一步行动**：
1. 实施方案 1 的代码修改
2. 运行安全测试验证
3. 运行功能测试验证
4. 更新文档

是否立即开始实施？





