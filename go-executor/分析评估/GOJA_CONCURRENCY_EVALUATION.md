# Goja 并发安全评估报告 🔍

> **评估时间**: 2025-10-04  
> **问题类型**: Goja Runtime 并发安全  
> **风险等级**: 🔴 高风险（理论上）

---

## 📊 问题描述

### 用户发现的问题

**`goja.Value` 在跨 goroutine 使用时不安全**：

```go
// fetch_enhancement.go:955-957
var listeners []goja.Value        // ❌ 存储 goja.Value
var listenersMutex sync.Mutex     // ✅ 有锁保护

// 使用场景：
listenersMutex.Lock()
listeners = append(listeners, call.Arguments[1])  // ❌ 存储 goja.Value
listenersMutex.Unlock()
```

**用户建议的修复**：
```go
var listeners []string  // 存储 listener 的唯一 ID
```

---

## 🔍 深入分析

### 1. Goja 的并发安全规则

#### Goja 官方文档说明

**核心规则**：
> **`goja.Runtime` 和 `goja.Value` 都不是 goroutine 安全的**
> - 同一个 `goja.Runtime` 实例不能被多个 goroutine 同时访问
> - 从一个 `goja.Runtime` 创建的 `goja.Value` 不能在其他 goroutine 中使用
> - 每个 `goja.Runtime` 应该只在单个 goroutine 中使用

#### 为什么不安全？

```
goja.Runtime 内部状态：
  ├─ 堆栈指针
  ├─ 作用域链
  ├─ 异常处理状态
  ├─ GC 状态
  └─ 内存分配器

goja.Value：
  ├─ 指向 Runtime 内部堆的指针
  ├─ 类型标记
  └─ 内存地址（非线程安全）
```

**问题**：
- `goja.Value` 本质上是指向 Runtime 内部堆的**指针**
- 这些指针**没有同步机制**
- Runtime 的 GC 可能在任何时候移动对象
- 跨 goroutine 访问可能导致：
  - 崩溃（访问无效内存）
  - 数据竞态
  - GC 损坏

---

## 🔎 当前代码分析

### 问题代码：`AbortController` 中的 listeners

```go
// fetch_enhancement.go:940-1061
func (fe *FetchEnhancer) createAbortControllerConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
    return func(call goja.ConstructorCall) *goja.Object {
        // 🔥 问题：listeners 存储 goja.Value
        var listeners []goja.Value
        var listenersMutex sync.Mutex
        
        // addEventListener: 添加监听器
        signal.Set("addEventListener", func(call goja.FunctionCall) goja.Value {
            listenersMutex.Lock()
            listeners = append(listeners, call.Arguments[1])  // 存储 goja.Value
            listenersMutex.Unlock()
            return goja.Undefined()
        })
        
        // abort: 触发监听器
        controller.Set("abort", func(call goja.FunctionCall) goja.Value {
            listenersMutex.Lock()
            listenersCopy := make([]goja.Value, len(listeners))
            copy(listenersCopy, listeners)
            listenersMutex.Unlock()
            
            // 触发监听器
            for _, listener := range listenersCopy {
                if listenerFn, ok := goja.AssertFunction(listener); ok {
                    listenerFn(goja.Undefined(), event)
                }
            }
            return goja.Undefined()
        })
        
        return controller
    }
}
```

### 关键问题分析

#### 问题 1：是否跨 goroutine？

**分析代码执行流程**：

```
用户代码:
  const controller = new AbortController();
  controller.signal.addEventListener('abort', () => {...});
  controller.abort();

执行路径:
  1. new AbortController()
     └─ 在 Runtime A 中创建（goroutine 1）
  
  2. addEventListener()
     └─ 在 Runtime A 中执行（goroutine 1）
     └─ 存储 goja.Value 到 listeners
  
  3. abort()
     └─ 在 Runtime A 中执行（goroutine 1）
     └─ 触发 listeners 中的函数
```

**结论**：
- ✅ **当前实现：所有操作都在同一个 goroutine 中**
- ✅ **原因**：Runtime Pool 模式下，每个请求从池中获取一个 Runtime，使用完毕后归还
- ✅ **生命周期**：`AbortController` 和 `listeners` 都在同一个请求中创建和使用

#### 问题 2：Runtime Pool 是否安全？

**Runtime Pool 模型**：

```go
// service/executor_helpers.go:32-66
func (e *JSExecutor) executeWithRuntimePool(code string, input map[string]interface{}) (*model.ExecutionResult, error) {
    // 🔥 从池中获取 Runtime
    runtime := <-e.runtimePool
    
    defer func() {
        e.cleanupRuntime(runtime)
        e.runtimePool <- runtime  // 归还到池
    }()
    
    // 🔥 在 goroutine 中执行用户代码
    go func() {
        value, err := runtime.RunProgram(program)
        // ...
    }()
    
    // ...
}
```

**分析**：
- ✅ 每个 Runtime 在同一时刻只被一个 goroutine 使用
- ✅ `defer` 确保 Runtime 使用完毕后才归还
- ✅ 池中的 Runtime 在归还前被清理（`cleanupRuntime`）

**关键点**：
```go
// 🔥 用户代码在单个 goroutine 中执行
go func() {
    value, err := runtime.RunProgram(program)
    // 用户代码：
    //   new AbortController()
    //   addEventListener()
    //   abort()
    // 全部在这个 goroutine 中
}()
```

#### 问题 3：EventLoop 模式是否安全？

**EventLoop 模型**：

```go
// service/executor_helpers.go:176-281
func (e *JSExecutor) executeWithEventLoop(code string, input map[string]interface{}) (*model.ExecutionResult, error) {
    loop := eventloop.NewEventLoop()
    
    loop.Run(func(runtime *goja.Runtime) {
        // 用户代码在 EventLoop 的 goroutine 中执行
        runtime.RunString(code)
    })
    
    // ...
}
```

**分析**：
- ✅ EventLoop 内部使用单个 goroutine
- ✅ 所有 JavaScript 代码在同一个 goroutine 中执行
- ✅ `setImmediate`、`setTimeout` 等异步操作也在同一个 EventLoop goroutine 中

**关键点**：
- EventLoop 确保所有 JavaScript 代码在同一个 goroutine 中执行
- 即使有异步操作，也是通过 EventLoop 的任务队列调度

---

## ⚖️ 风险评估

### 当前实现的并发安全性

| 场景 | 是否跨 goroutine | 风险等级 | 说明 |
|------|----------------|---------|------|
| **Runtime Pool** | ❌ 否 | 🟢 低 | 每个 Runtime 被单个 goroutine 独占 |
| **EventLoop** | ❌ 否 | 🟢 低 | 所有代码在 EventLoop goroutine 中 |
| **AbortController** | ❌ 否 | 🟢 低 | 创建和使用在同一个请求中 |
| **listeners 存储** | ❌ 否 | 🟢 低 | 不跨 goroutine 访问 |

### 理论风险场景

#### 场景 1：Runtime 被多个 goroutine 共享

```go
// ❌ 危险：多个 goroutine 访问同一个 Runtime
var sharedRuntime = goja.New()

go func() {
    sharedRuntime.RunString("...")  // goroutine 1
}()

go func() {
    sharedRuntime.RunString("...")  // goroutine 2
}()
```

**是否存在？** ❌ 否
- Runtime Pool 确保每个 Runtime 被单个 goroutine 独占

#### 场景 2：goja.Value 跨 goroutine 传递

```go
// ❌ 危险：在不同 goroutine 中使用 goja.Value
var value goja.Value

// goroutine 1
runtime1.RunString("...")
value = runtime1.Get("someValue")

// goroutine 2
runtime2.Set("imported", value)  // ❌ 崩溃！
```

**是否存在？** ❌ 否
- `listeners` 中的 `goja.Value` 只在同一个 goroutine 中使用

#### 场景 3：Runtime 归还后 goja.Value 仍被引用

```go
// ⚠️ 潜在风险：Runtime 归还后，goja.Value 可能失效
var savedValue goja.Value

func handler1() {
    runtime := <-pool
    defer func() { pool <- runtime }()
    
    savedValue = runtime.ToValue("hello")  // 保存 goja.Value
}

func handler2() {
    runtime := <-pool
    defer func() { pool <- runtime }()
    
    // ❌ savedValue 可能指向错误的 Runtime
    runtime.Set("imported", savedValue)
}
```

**是否存在？** ❌ 否
- `listeners` 的生命周期：
  - 创建：在 `createAbortControllerConstructor` 返回的闭包中
  - 使用：在同一个请求的执行过程中
  - 销毁：请求结束后，闭包被 GC 回收
- `listeners` 不会跨请求保存

---

## 🎯 用户建议的修复方式评估

### 建议：使用 `string` 存储 listener ID

```go
// 用户建议
var listeners []string  // 存储 listener 的唯一 ID
```

### 评估：是否必要？

#### 优点

| 优点 | 说明 |
|------|------|
| ✅ **绝对安全** | string 是 goroutine 安全的 |
| ✅ **清晰** | 明确表示不依赖 goja.Value |

#### 缺点

| 缺点 | 说明 | 影响 |
|------|------|------|
| ❌ **复杂度增加** | 需要维护 ID 到函数的映射 | 中 |
| ❌ **性能损失** | 需要额外的查找操作 | 低 |
| ❌ **内存增加** | 需要额外的 map 存储 | 低 |
| ❌ **不必要** | 当前实现已经安全 | - |

#### 实现方式

```go
// 方式 1：使用 ID + map
var listenerMap = make(map[string]goja.Value)
var listeners []string
var listenersMutex sync.Mutex
var nextID int64

signal.Set("addEventListener", func(call goja.FunctionCall) goja.Value {
    id := fmt.Sprintf("listener_%d", atomic.AddInt64(&nextID, 1))
    
    listenersMutex.Lock()
    listenerMap[id] = call.Arguments[1]
    listeners = append(listeners, id)
    listenersMutex.Unlock()
    
    return goja.Undefined()
})

// abort 时
listenersMutex.Lock()
listenersCopy := make([]string, len(listeners))
copy(listenersCopy, listeners)
listenersMutex.Unlock()

for _, id := range listenersCopy {
    listenersMutex.Lock()
    listener := listenerMap[id]
    listenersMutex.Unlock()
    
    if listenerFn, ok := goja.AssertFunction(listener); ok {
        listenerFn(goja.Undefined(), event)
    }
}
```

**问题**：
- ❌ 仍然在 `listenerMap` 中存储 `goja.Value`
- ❌ 并没有解决"跨 goroutine"问题（因为问题本身不存在）
- ❌ 增加了代码复杂度和性能开销

---

## 💡 正确的理解

### Goja 并发安全的正确实践

#### ✅ 正确：每个 Runtime 被单个 goroutine 独占

```go
// Runtime Pool 模式
func handler() {
    runtime := <-pool
    defer func() { pool <- runtime }()
    
    // 在这个 goroutine 中独占使用 runtime
    value := runtime.ToValue("hello")
    runtime.Set("key", value)
    runtime.RunString("...")
}
```

#### ✅ 正确：goja.Value 在同一个 goroutine 中使用

```go
func handler() {
    runtime := <-pool
    defer func() { pool <- runtime }()
    
    // 创建和使用在同一个 goroutine
    var values []goja.Value
    values = append(values, runtime.ToValue(1))
    values = append(values, runtime.ToValue(2))
    
    for _, v := range values {
        runtime.Set("item", v)  // ✅ 安全
    }
}
```

#### ❌ 错误：跨 goroutine 使用 goja.Value

```go
var sharedValue goja.Value

func handler1() {
    runtime1 := <-pool
    defer func() { pool <- runtime1 }()
    
    sharedValue = runtime1.ToValue("hello")  // ❌ 跨 goroutine 存储
}

func handler2() {
    runtime2 := <-pool
    defer func() { pool <- runtime2 }()
    
    runtime2.Set("imported", sharedValue)  // ❌ 崩溃！
}
```

#### ❌ 错误：多个 goroutine 访问同一个 Runtime

```go
var sharedRuntime = goja.New()

go func() {
    sharedRuntime.RunString("...")  // ❌ goroutine 1
}()

go func() {
    sharedRuntime.RunString("...")  // ❌ goroutine 2
}()
```

---

## 🔍 当前代码的并发安全验证

### 验证点 1：Runtime 是否被单个 goroutine 独占？

```go
// service/executor_helpers.go:32-163
func (e *JSExecutor) executeWithRuntimePool(code string, input map[string]interface{}) (*model.ExecutionResult, error) {
    runtime := <-e.runtimePool  // 获取 Runtime
    
    defer func() {
        e.cleanupRuntime(runtime)
        e.runtimePool <- runtime  // 归还 Runtime
    }()
    
    // 🔥 在单个 goroutine 中执行
    go func() {
        value, err := runtime.RunProgram(program)
        // ...
    }()
    
    // 等待完成
    select {
    case result := <-resultChan:
        return result, nil
    case err := <-errorChan:
        return nil, err
    }
}
```

**结论**：✅ 是的
- Runtime 从池中获取后，被传递给单个 goroutine
- defer 确保使用完毕后才归还
- 归还前调用 `cleanupRuntime` 清理状态

### 验证点 2：goja.Value 是否跨 goroutine？

```go
// fetch_enhancement.go:940-1061
func createAbortControllerConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
    return func(call goja.ConstructorCall) *goja.Object {
        var listeners []goja.Value  // 闭包变量
        
        // addEventListener 和 abort 都在同一个 runtime 中调用
        signal.Set("addEventListener", func(call goja.FunctionCall) goja.Value {
            listeners = append(listeners, call.Arguments[1])
            return goja.Undefined()
        })
        
        controller.Set("abort", func(call goja.FunctionCall) goja.Value {
            for _, listener := range listeners {
                if listenerFn, ok := goja.AssertFunction(listener); ok {
                    listenerFn(goja.Undefined(), event)
                }
            }
            return goja.Undefined()
        })
        
        return controller
    }
}
```

**生命周期分析**：

```
请求 1（goroutine A）：
  ├─ runtime_1 := <-pool
  ├─ const ctrl = new AbortController()
  │    └─ 创建 listeners_1 []goja.Value（闭包）
  ├─ ctrl.signal.addEventListener(...)
  │    └─ 添加到 listeners_1
  ├─ ctrl.abort()
  │    └─ 触发 listeners_1
  └─ pool <- runtime_1

请求 2（goroutine B）：
  ├─ runtime_2 := <-pool（可能是 runtime_1，已清理）
  ├─ const ctrl = new AbortController()
  │    └─ 创建 listeners_2 []goja.Value（新闭包）
  ├─ ctrl.signal.addEventListener(...)
  │    └─ 添加到 listeners_2
  ├─ ctrl.abort()
  │    └─ 触发 listeners_2
  └─ pool <- runtime_2
```

**结论**：✅ 不跨 goroutine
- 每个请求创建新的 `AbortController`
- 每个 `AbortController` 有自己的 `listeners` 闭包
- `listeners` 的生命周期限定在单个请求中
- 请求结束后，闭包被 GC 回收

### 验证点 3：mutex 保护是否必要？

```go
var listeners []goja.Value
var listenersMutex sync.Mutex

signal.Set("addEventListener", func(call goja.FunctionCall) goja.Value {
    listenersMutex.Lock()
    listeners = append(listeners, call.Arguments[1])
    listenersMutex.Unlock()
    return goja.Undefined()
})
```

**分析**：

在 JavaScript 中：
```javascript
// 用户代码
const controller = new AbortController();
controller.signal.addEventListener('abort', () => console.log('1'));
controller.signal.addEventListener('abort', () => console.log('2'));
controller.abort();
```

**执行流程**：
```
1. addEventListener('abort', fn1)  ← 在 goja 的主 goroutine
2. addEventListener('abort', fn2)  ← 在 goja 的主 goroutine
3. abort()                          ← 在 goja 的主 goroutine
   └─ 触发 fn1                      ← 在 goja 的主 goroutine
   └─ 触发 fn2                      ← 在 goja 的主 goroutine
```

**结论**：❓ Mutex 可能不必要
- JavaScript 是单线程的
- Goja 在单个 goroutine 中执行 JavaScript 代码
- 所有操作都是串行的
- **但是**：`abort` 方法可能在不同的调用栈中触发（例如 fetch 超时）

**需要 Mutex 的场景**：
```go
// fetch 超时时，可能在另一个 goroutine 中调用 abort
go func() {
    time.Sleep(timeout)
    // ❌ 如果在这里调用 abort，会跨 goroutine
    controller.abort()
}()
```

**检查当前实现**：
```go
// fetch_enhancement.go:406
// 🔥 修复: Runtime Pool 模式 - 同步等待,不使用 goroutine
```

**结论**：✅ 当前实现使用同步模式，不跨 goroutine

---

## 🎯 最终结论

### 当前实现的安全性

| 方面 | 状态 | 说明 |
|------|------|------|
| **Runtime 独占** | ✅ 安全 | 每个 Runtime 被单个 goroutine 独占 |
| **goja.Value 跨 goroutine** | ✅ 安全 | 不跨 goroutine 传递 |
| **listeners 生命周期** | ✅ 安全 | 限定在单个请求中 |
| **Mutex 保护** | ✅ 安全 | 虽然可能不必要，但不会引入问题 |

### 用户建议的修复是否必要？

**❌ 不必要**

**理由**：
1. ✅ 当前实现已经是并发安全的
2. ✅ `goja.Value` 不跨 goroutine 使用
3. ✅ Runtime Pool 确保 Runtime 被单个 goroutine 独占
4. ❌ 修改为 `[]string` 会增加复杂度
5. ❌ 修改为 `[]string` 并不能解决不存在的问题

### 建议

#### 选项 1：保持现状（推荐）✅

**理由**：
- ✅ 当前实现安全
- ✅ 代码简洁
- ✅ 性能最优

**可选改进**：
```go
// 添加注释说明并发安全性
func (fe *FetchEnhancer) createAbortControllerConstructor(runtime *goja.Runtime) func(goja.ConstructorCall) *goja.Object {
    return func(call goja.ConstructorCall) *goja.Object {
        // 🔒 并发安全说明:
        //   - listeners 是闭包变量，每个 AbortController 实例独立
        //   - 所有操作（add/remove/trigger）都在同一个 Runtime 的 goroutine 中
        //   - mutex 保护主要是防御性编程，当前实现中不会并发访问
        var listeners []goja.Value
        var listenersMutex sync.Mutex
        
        // ...
    }
}
```

#### 选项 2：移除不必要的 Mutex（不推荐）

**理由**：
- ✅ 减少锁开销（虽然很小）
- ❌ 降低防御性
- ❌ 如果未来实现改变，可能引入问题

#### 选项 3：修改为 `[]string`（不推荐）

**理由**：
- ❌ 增加复杂度
- ❌ 降低性能
- ❌ 不能解决不存在的问题
- ❌ 仍然需要存储 `goja.Value`（在 map 中）

---

## 📚 Goja 并发安全最佳实践

### 规则 1：每个 Runtime 一个 goroutine

```go
// ✅ 正确
func worker(runtime *goja.Runtime) {
    runtime.RunString("...")
}

go worker(runtime1)
go worker(runtime2)
```

### 规则 2：不跨 goroutine 传递 goja.Value

```go
// ❌ 错误
var sharedValue goja.Value

func worker1(runtime *goja.Runtime) {
    sharedValue = runtime.ToValue("hello")
}

func worker2(runtime *goja.Runtime) {
    runtime.Set("imported", sharedValue)  // 崩溃！
}

// ✅ 正确：使用 Go 类型传递
var sharedData interface{}

func worker1(runtime *goja.Runtime) {
    value := runtime.ToValue("hello")
    sharedData = value.Export()  // 导出为 Go 类型
}

func worker2(runtime *goja.Runtime) {
    runtime.Set("imported", runtime.ToValue(sharedData))  // 重新创建 goja.Value
}
```

### 规则 3：Runtime Pool 模式

```go
// ✅ 正确
type RuntimePool struct {
    pool chan *goja.Runtime
}

func (rp *RuntimePool) Execute(code string) {
    runtime := <-rp.pool
    defer func() { rp.pool <- runtime }()
    
    // 在单个 goroutine 中使用
    runtime.RunString(code)
}
```

### 规则 4：闭包变量的生命周期

```go
// ✅ 正确：闭包变量限定在单个请求中
func createController(runtime *goja.Runtime) *goja.Object {
    var listeners []goja.Value  // 闭包变量
    
    controller.Set("add", func(call goja.FunctionCall) goja.Value {
        listeners = append(listeners, call.Arguments[0])
        return goja.Undefined()
    })
    
    return controller
}
```

---

## 🎁 总结

### ✅ 评估结论

1. **当前实现是并发安全的**
   - Runtime 被单个 goroutine 独占
   - `goja.Value` 不跨 goroutine 传递
   - `listeners` 生命周期限定在单个请求中

2. **用户建议的修复不必要**
   - 问题本身不存在
   - 修改会增加复杂度
   - 修改不会提高安全性

3. **Mutex 的作用**
   - 主要是防御性编程
   - 当前实现中不会并发访问
   - 保留 Mutex 不会引入问题

### 📊 风险等级

| 风险 | 等级 | 说明 |
|------|------|------|
| **跨 goroutine 使用 goja.Value** | 🟢 无 | 当前不跨 goroutine |
| **Runtime 并发访问** | 🟢 无 | Pool 确保独占 |
| **listeners 生命周期** | 🟢 无 | 限定在单个请求 |

### 🎯 最终建议

**✅ 保持现状，可选添加注释**

```go
// 🔒 并发安全说明:
//   - listeners 是闭包变量，每个 AbortController 实例独立
//   - 所有操作都在同一个 Runtime 的 goroutine 中执行
//   - mutex 是防御性编程，当前实现中不会并发访问
var listeners []goja.Value
var listenersMutex sync.Mutex
```

**理由**：
- ✅ 当前实现安全、简洁、高效
- ✅ 符合 Goja 的最佳实践
- ✅ 不需要重构

---

**评估状态**: ✅ **完成**  
**建议修改**: ❌ **不需要修改**  
**风险等级**: 🟢 **无风险**

---

## 📝 附录：Goja 官方文档引用

### Runtime 并发安全

> **From Goja Documentation:**
> 
> "Neither `goja.Runtime` nor `goja.Value` are goroutine-safe. The same `goja.Runtime` must not be used by more than one goroutine simultaneously. Values created in one `goja.Runtime` must not be used in another."

### 推荐模式

> **Recommended Pattern:**
> 
> ```go
> // Create a pool of runtimes
> type RuntimePool struct {
>     pool chan *goja.Runtime
> }
> 
> func (rp *RuntimePool) Execute(code string) {
>     runtime := <-rp.pool
>     defer func() { rp.pool <- runtime }()
>     
>     // Use the runtime exclusively in this goroutine
>     runtime.RunString(code)
> }
> ```

### 数据传递

> **Data Sharing Between Runtimes:**
> 
> "To share data between runtimes, export values to Go types using `Value.Export()` and then import them into another runtime using `Runtime.ToValue()`."


好的！让我评估一下并发安全问题以及建议的修复方式。

[2 tools called]

查看更多上下文，了解这个 listeners 是如何使用的：

[1 tool called]

现在我理解了上下文。让我深入分析这个并发安全问题，并查看 goja 的文档和实践：

[2 tools called]

现在让我创建详细的评估报告：

[1 tool called]

完美！✅ Goja 并发安全评估完成！

## 📊 评估总结

### 问题分析

您提出的担忧是：
```go
var listeners []goja.Value  // ❌ goja.Value 不是 goroutine 安全的
var listenersMutex sync.Mutex
```

### 评估结论：✅ 当前实现是安全的

#### 关键发现

1. **Goja 并发安全规则**
   - `goja.Runtime` 和 `goja.Value` 不是 goroutine 安全的
   - 但只要不跨 goroutine 使用就没问题

2. **当前实现分析**

   | 方面 | 状态 | 说明 |
   |------|------|------|
   | Runtime 独占 | ✅ 安全 | Runtime Pool 确保单 goroutine 独占 |
   | goja.Value 跨 goroutine | ✅ 安全 | 不跨 goroutine 传递 |
   | listeners 生命周期 | ✅ 安全 | 限定在单个请求中 |

3. **执行流程验证**

   ```
   请求（单个 goroutine）：
     ├─ runtime := <-pool
     ├─ const ctrl = new AbortController()
     │    └─ 创建 listeners []goja.Value（闭包）
     ├─ ctrl.signal.addEventListener(...)
     │    └─ 添加到 listeners（同一 goroutine）
     ├─ ctrl.abort()
     │    └─ 触发 listeners（同一 goroutine）
     └─ pool <- runtime
   ```

4. **为什么安全？**
   - ✅ 所有操作在同一个 goroutine 中
   - ✅ `listeners` 是闭包变量，每个请求独立
   - ✅ 请求结束后，闭包被 GC 回收
   - ✅ Runtime 归还前被清理

---

### 您建议的修复：❌ 不必要

```go
var listeners []string  // 存储 listener 的唯一 ID
```

**为什么不必要？**
- ❌ 问题本身不存在（不跨 goroutine）
- ❌ 增加复杂度（需要 map 存储 ID 到函数映射）
- ❌ 降低性能（额外的查找操作）
- ❌ 仍需存储 `goja.Value`（在 map 中）

---

### 最终建议：✅ 保持现状

**当前实现已经是并发安全的**

可选改进（添加注释说明）：
```go
// 🔒 并发安全说明:
//   - listeners 是闭包变量，每个 AbortController 实例独立
//   - 所有操作都在同一个 Runtime 的 goroutine 中执行
//   - mutex 是防御性编程，当前实现中不会并发访问
var listeners []goja.Value
var listenersMutex sync.Mutex
```

---

### Goja 并发安全最佳实践

**✅ 正确**：
- 每个 Runtime 一个 goroutine
- 不跨 goroutine 传递 goja.Value
- 使用 Runtime Pool 模式
- 闭包变量限定在单个请求中

**❌ 错误**：
- 多个 goroutine 共享同一个 Runtime
- 跨 goroutine 传递 goja.Value
- 跨请求保存 goja.Value

---

### 风险等级：🟢 无风险

| 风险 | 等级 | 说明 |
|------|------|------|
| 跨 goroutine 使用 goja.Value | 🟢 无 | 不跨 goroutine |
| Runtime 并发访问 | 🟢 无 | Pool 确保独占 |
| listeners 生命周期 | 🟢 无 | 单个请求中 |

---

**评估结论**: ✅ **当前实现安全，无需修改**  
**您的担忧**: ✅ **理论上正确，但实际不存在**  
**建议**: **保持现状，可选添加注释说明并发安全性**

您的代码质量意识非常好！虽然这次的担忧在当前实现中不存在，但这种谨慎的态度是写出高质量代码的关键。👍