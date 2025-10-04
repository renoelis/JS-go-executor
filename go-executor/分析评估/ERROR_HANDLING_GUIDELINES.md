# 错误处理规范

## 📋 概述

本文档定义了 enhance_modules 中错误处理的统一规范，确保错误类型正确、错误信息清晰、代码行为一致。

## 🎯 错误处理策略

### 1. JavaScript 层面（goja 函数中）

在直接暴露给 JavaScript 的函数中，使用 `panic` 抛出错误：

#### 规则 A: 用户输入错误 → `runtime.NewTypeError()`

**适用场景**：
- 参数数量不足
- 参数类型错误
- 参数值无效（如空字符串、负数等）
- 对象属性缺失或无效
- 资源大小超限（用户可控）

**示例**：
```go
// ✅ 正确：参数缺失
if len(call.Arguments) < 1 {
    panic(runtime.NewTypeError("xlsx.read() requires buffer argument"))
}

// ✅ 正确：对象无效
if fileVal == nil || goja.IsUndefined(fileVal) {
    panic(runtime.NewTypeError("invalid workbook object"))
}

// ✅ 正确：大小超限
if int64(length) > xe.maxBufferSize {
    panic(runtime.NewTypeError(fmt.Sprintf(
        "Buffer size exceeds maximum limit: %d > %d bytes (%d MB)",
        length, xe.maxBufferSize, xe.maxBufferSize/1024/1024,
    )))
}

// ✅ 正确：参数类型错误
callbackFunc, ok := goja.AssertFunction(callback)
if !ok {
    panic(runtime.NewTypeError("callback must be a function"))
}
```

#### 规则 B: 系统/库错误 → `runtime.NewGoError()`

**适用场景**：
- 文件系统错误
- 网络错误
- 库调用失败（如 excelize、crypto 等）
- 内部状态错误
- 不可恢复的系统错误

**示例**：
```go
// ✅ 正确：库调用失败
file, err := excelize.OpenReader(bytes.NewReader(data))
if err != nil {
    panic(runtime.NewGoError(fmt.Errorf("failed to read Excel: %w", err)))
}

// ✅ 正确：写入失败
if err := file.Write(buffer); err != nil {
    panic(runtime.NewGoError(fmt.Errorf("failed to write Excel: %w", err)))
}

// ✅ 正确：随机数生成失败
randomBytes := make([]byte, size)
if _, err := rand.Read(randomBytes); err != nil {
    panic(runtime.NewGoError(fmt.Errorf("failed to generate random bytes: %w", err)))
}

// ✅ 正确：回调执行失败
_, err := callbackFunc(goja.Undefined(), rowObj, runtime.ToValue(rowIndex))
if err != nil {
    panic(runtime.NewGoError(err))
}
```

### 2. Go 层面（内部函数）

在 Go 层面的内部函数中，使用标准的 `error` 返回值：

#### 规则 C: 返回 `error`

**适用场景**：
- 不直接暴露给 JavaScript 的内部函数
- 可能失败的 I/O 操作
- 数据验证函数
- 资源管理函数

**示例**：
```go
// ✅ 正确：内部函数返回 error
func (sfd *StreamingFormData) CreateReader() (io.Reader, error) {
    if sfd == nil || sfd.config == nil {
        return nil, fmt.Errorf("StreamingFormData or config is nil")
    }
    
    if sfd.totalSize > sfd.config.MaxFormDataSize {
        return nil, fmt.Errorf("FormData size exceeds limit: %d > %d bytes",
            sfd.totalSize, sfd.config.MaxFormDataSize)
    }
    
    // ... 其他逻辑
    return reader, nil
}

// ✅ 正确：在调用处处理 error
reader, err := sfd.CreateReader()
if err != nil {
    panic(runtime.NewGoError(fmt.Errorf("failed to create reader: %w", err)))
}
```

## 📊 错误类型对照表

| 错误场景 | 错误类型 | 示例 |
|---------|---------|------|
| 参数数量不足 | `TypeError` | `xlsx.read() requires buffer argument` |
| 参数类型错误 | `TypeError` | `callback must be a function` |
| 对象属性无效 | `TypeError` | `invalid workbook object` |
| 值范围错误 | `TypeError` | `size must be between 1 and 1048576` |
| Buffer 大小超限 | `TypeError` | `Buffer size exceeds maximum limit` |
| 文件读取失败 | `GoError` | `failed to read Excel: ...` |
| 文件写入失败 | `GoError` | `failed to write Excel: ...` |
| 库调用失败 | `GoError` | `failed to create row iterator: ...` |
| 随机数生成失败 | `GoError` | `failed to generate random bytes: ...` |
| 回调执行失败 | `GoError` | 直接传递 callback 的 error |
| 内部函数失败 | `error` (返回值) | `return fmt.Errorf("...")` |

## ✅ 良好实践

### 1. 错误消息格式

#### TypeError 消息
```go
// ✅ 简洁明了，说明需要什么
panic(runtime.NewTypeError("xlsx.read() requires buffer argument"))

// ✅ 说明具体问题
panic(runtime.NewTypeError("invalid workbook object"))

// ✅ 包含上下文信息
panic(runtime.NewTypeError(fmt.Sprintf(
    "Buffer size exceeds maximum limit: %d > %d bytes (%d MB). Adjust MAX_BLOB_FILE_SIZE_MB if needed.",
    length, xe.maxBufferSize, xe.maxBufferSize/1024/1024,
)))
```

#### GoError 消息
```go
// ✅ 使用 %w 包装原始错误
panic(runtime.NewGoError(fmt.Errorf("failed to read Excel: %w", err)))

// ✅ 提供操作上下文
panic(runtime.NewGoError(fmt.Errorf("failed to create row iterator: %w", err)))

// ✅ 直接传递原始错误（如果已经足够清晰）
panic(runtime.NewGoError(err))
```

### 2. 错误检查顺序

```go
// ✅ 推荐顺序
func makeExampleFunc(runtime *goja.Runtime) func(goja.FunctionCall) goja.Value {
    return func(call goja.FunctionCall) goja.Value {
        // 1. 首先检查参数数量 (TypeError)
        if len(call.Arguments) < 2 {
            panic(runtime.NewTypeError("function requires 2 arguments"))
        }
        
        // 2. 然后检查参数类型 (TypeError)
        callback, ok := goja.AssertFunction(call.Argument(1))
        if !ok {
            panic(runtime.NewTypeError("second argument must be a function"))
        }
        
        // 3. 验证参数值 (TypeError)
        value := call.Argument(0).ToInteger()
        if value <= 0 {
            panic(runtime.NewTypeError("value must be positive"))
        }
        
        // 4. 执行可能失败的操作 (GoError)
        result, err := someOperation(value)
        if err != nil {
            panic(runtime.NewGoError(fmt.Errorf("operation failed: %w", err)))
        }
        
        return runtime.ToValue(result)
    }
}
```

### 3. 特殊情况处理

#### 场景 A: fetch API 中的 Promise reject
```go
// ✅ fetch 使用 Promise.reject 而非 panic
if errorMsg != "" {
    rejectFunc(createErrorResponse(runtime, errorMsg))
    return
}
```

#### 场景 B: recover 防护
```go
// ✅ 在可能多次调用的地方使用 recover
defer func() {
    if r := recover(); r != nil {
        // channel 已经被关闭，忽略 panic
        log.Printf("⚠️  忽略重复 close 错误: %v", r)
    }
}()
```

#### 场景 C: 资源清理
```go
// ✅ 在 close() 中不 panic
func close() {
    if fileWrapper != nil && !fileWrapper.closed {
        if err := fileWrapper.file.Close(); err != nil {
            log.Printf("⚠️  关闭 Excel 文件失败: %v", err)  // 记录日志，不 panic
        }
        fileWrapper.closed = true
        fileWrapper.file = nil
    }
}
```

## ❌ 常见错误

### 错误 1: 混淆 TypeError 和 GoError

```go
// ❌ 错误：用户输入错误应该用 TypeError
if len(call.Arguments) < 1 {
    panic(runtime.NewGoError(fmt.Errorf("missing argument")))
}

// ✅ 正确
if len(call.Arguments) < 1 {
    panic(runtime.NewTypeError("function requires at least 1 argument"))
}
```

### 错误 2: 在内部函数中使用 panic

```go
// ❌ 错误：内部函数应该返回 error
func (sfd *StreamingFormData) CreateReader() (io.Reader, error) {
    if sfd == nil {
        panic(fmt.Errorf("StreamingFormData is nil"))  // ❌
    }
    // ...
}

// ✅ 正确
func (sfd *StreamingFormData) CreateReader() (io.Reader, error) {
    if sfd == nil {
        return nil, fmt.Errorf("StreamingFormData is nil")  // ✅
    }
    // ...
}
```

### 错误 3: 错误消息不清晰

```go
// ❌ 错误：消息太模糊
panic(runtime.NewTypeError("invalid input"))

// ✅ 正确：说明具体问题
panic(runtime.NewTypeError("workbook parameter is required"))

// ✅ 更好：提供上下文和建议
panic(runtime.NewTypeError("invalid workbook object: missing _file property"))
```

## 📋 检查清单

在编写或审查代码时，请检查：

- [ ] JavaScript 直接调用的函数使用 `panic`
- [ ] Go 内部函数使用 `return error`
- [ ] 用户输入错误使用 `TypeError`
- [ ] 系统/库错误使用 `GoError`
- [ ] 错误消息清晰、具体
- [ ] GoError 使用 `%w` 包装原始错误
- [ ] 资源清理函数不抛出 panic
- [ ] Promise-based API 使用 reject 而非 panic

## 📚 相关文档

- [Goja 错误处理](https://github.com/dop251/goja#error-handling)
- [Go 错误处理最佳实践](https://go.dev/blog/error-handling-and-go)
- `SECURITY_FIXES.md` - 安全相关的错误处理

---

**最后更新**: 2025-10-04  
**适用范围**: 所有 enhance_modules 文件

