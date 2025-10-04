# Console 控制功能文档

## 📋 功能概述

Console 控制功能允许通过环境变量控制用户代码是否可以使用 `console` 对象进行日志输出。

### 设计目标

1. **开发环境友好**：开发环境默认允许 `console`，便于开发者调试代码
2. **生产环境安全**：生产环境默认禁用 `console`，提升性能和安全性
3. **灵活控制**：支持通过环境变量显式覆盖默认行为
4. **友好提示**：当 `console` 被禁用时，提供清晰的错误信息

## 🎯 使用场景

| 环境 | 默认行为 | 典型用例 |
|------|---------|---------|
| **开发环境** | ✅ 允许 console | 本地开发、调试代码 |
| **生产环境** | ❌ 禁止 console | 线上运行、性能优先 |
| **测试环境** | 根据需要配置 | 集成测试、压测 |

## ⚙️ 配置方式

### 1. 环境变量

#### `ENVIRONMENT` 

控制运行环境，影响 `console` 的默认行为。

**可选值**：
- `development`：开发环境（默认允许 console）
- `production`：生产环境（默认禁用 console）

**示例**：
```bash
# 开发环境
ENVIRONMENT=development ./flow-codeblock-go

# 生产环境
ENVIRONMENT=production ./flow-codeblock-go
```

#### `ALLOW_CONSOLE`

显式控制是否允许 `console`，优先级高于 `ENVIRONMENT`。

**支持的值**：
- **true**: `true`, `TRUE`, `True`, `1`, `yes`, `YES`, `Yes`, `on`, `ON`, `On`
- **false**: `false`, `FALSE`, `False`, `0`, `no`, `NO`, `No`, `off`, `OFF`, `Off`

**示例**：
```bash
# 生产环境中启用 console（用于临时调试）
ENVIRONMENT=production ALLOW_CONSOLE=true ./flow-codeblock-go

# 开发环境中禁用 console（用于性能测试）
ENVIRONMENT=development ALLOW_CONSOLE=false ./flow-codeblock-go

# 使用简写形式
ALLOW_CONSOLE=1 ./flow-codeblock-go    # 等同于 true
ALLOW_CONSOLE=yes ./flow-codeblock-go  # 等同于 true
```

### 2. 配置优先级

```
ALLOW_CONSOLE 环境变量 > ENVIRONMENT 默认值
```

**决策逻辑**：
```go
// 如果设置了 ALLOW_CONSOLE，使用显式值
// 否则根据 ENVIRONMENT 决定：
//   - development → true
//   - production → false
```

## 📊 行为对比

### 允许 Console（AllowConsole = true）

**配置**：
```bash
ENVIRONMENT=development  # 或
ALLOW_CONSOLE=true
```

**用户代码**：
```javascript
console.log("Debug message");
console.warn("Warning");
console.error("Error details");
return {success: true};
```

**执行结果**：
```json
{
  "success": true,
  "result": {
    "success": true
  },
  "timing": {"executionTime": 5, "totalTime": 10},
  "timestamp": "2025-10-05T01:13:46+08:00"
}
```

**说明**：
- ✅ `console` 正常工作
- ✅ 日志会输出到服务器控制台（不影响返回结果）
- ✅ 支持所有 console 方法：`log`, `info`, `warn`, `error`, `debug`, `trace`, `dir`, `table`

### 禁止 Console（AllowConsole = false）

**配置**：
```bash
ENVIRONMENT=production  # 或
ALLOW_CONSOLE=false
```

**用户代码**：
```javascript
console.log("This will fail");
return {success: true};
```

**执行结果**：
```json
{
  "success": false,
  "error": {
    "type": "RuntimeError",
    "message": "代码执行panic: console 在当前环境中不可用。如需调试，请联系管理员启用 console 支持（设置 ALLOW_CONSOLE=true 或 ENVIRONMENT=development）"
  },
  "timing": {"executionTime": 1, "totalTime": 2},
  "timestamp": "2025-10-05T01:13:50+08:00"
}
```

**说明**：
- ❌ 调用 `console` 会抛出 `RuntimeError`
- ✅ 错误信息明确说明原因和解决方法
- ✅ 不使用 `console` 的代码正常执行

## 🔍 实现细节

### 1. 配置加载

**文件**：`config/config.go`

```go
// Console 控制策略：
// - 开发环境（development）：默认允许 console，便于调试
// - 生产环境（production）：默认禁止 console，提升性能和安全性
// - 可通过 ALLOW_CONSOLE 环境变量显式覆盖
allowConsole := getEnvBool("ALLOW_CONSOLE", cfg.Environment == "development")

cfg.Executor = ExecutorConfig{
    // ... 其他配置
    AllowConsole: allowConsole, // 🔥 Console 控制
}
```

### 2. Runtime 设置

**文件**：`service/executor_service.go`

```go
func (e *JSExecutor) setupNodeJSModules(runtime *goja.Runtime) {
    e.registry.Enable(runtime)
    
    // 🔥 Console 控制：根据配置决定是否启用
    if e.allowConsole {
        console.Enable(runtime)  // ✅ 启用真实的 console
    } else {
        e.setupConsoleStub(runtime)  // ✅ 使用占位符提供错误提示
    }
    
    // ... 其他模块
}
```

### 3. Console 占位符

当 `console` 被禁用时，会注册一个占位符对象，所有方法都会抛出友好的错误：

```go
func (e *JSExecutor) setupConsoleStub(runtime *goja.Runtime) {
    consoleStub := runtime.NewObject()
    
    errorFunc := func(call goja.FunctionCall) goja.Value {
        panic(&model.ExecutionError{
            Type:    "ConsoleDisabledError",
            Message: "console 在当前环境中不可用。如需调试，请联系管理员启用 console 支持（设置 ALLOW_CONSOLE=true 或 ENVIRONMENT=development）",
        })
    }
    
    // 为所有常用方法提供相同的错误提示
    consoleStub.Set("log", errorFunc)
    consoleStub.Set("info", errorFunc)
    consoleStub.Set("warn", errorFunc)
    consoleStub.Set("error", errorFunc)
    // ... 其他方法
    
    runtime.Set("console", consoleStub)
}
```

## 📝 测试用例

### 测试场景矩阵

| 场景 | ENVIRONMENT | ALLOW_CONSOLE | 预期结果 | 测试状态 |
|------|-------------|---------------|---------|---------|
| 1 | development | (未设置) | console 可用 | ✅ 通过 |
| 2 | production | (未设置) | console 不可用 | ✅ 通过 |
| 3 | production | true | console 可用 | ✅ 通过 |
| 4 | development | false | console 不可用 | ✅ 通过 |
| 5 | production | 1, yes, on | console 可用 | ✅ 通过 |

### 运行测试

```bash
cd go-executor
./test_console_control.sh
```

**测试内容**：
1. ✅ 开发环境默认允许 console
2. ✅ 生产环境默认禁止 console
3. ✅ `ALLOW_CONSOLE` 可以覆盖默认行为
4. ✅ 多种布尔值格式兼容（true/1/yes/on）
5. ✅ 不使用 console 的代码不受影响
6. ✅ 错误提示清晰友好

## 🚀 部署建议

### 开发环境

```bash
# Docker Compose
environment:
  - ENVIRONMENT=development
  # console 默认可用，无需额外配置
```

### 生产环境

```bash
# Docker Compose
environment:
  - ENVIRONMENT=production
  # console 默认禁用，保障性能和安全
```

### 临时调试

如果生产环境需要临时启用 console 进行问题排查：

```bash
# 方式 1: 重启服务时设置环境变量
ALLOW_CONSOLE=true docker-compose restart

# 方式 2: 修改 docker-compose.yml
environment:
  - ENVIRONMENT=production
  - ALLOW_CONSOLE=true  # 临时启用
```

**⚠️ 警告**：调试完成后应立即移除 `ALLOW_CONSOLE=true`。

## 📈 性能影响

### Console 启用时

- **性能开销**：
  - `console.log` 调用：~10-50μs（写入 stdout）
  - 多次调用会累积延迟
  - 大量日志可能影响整体吞吐量

### Console 禁用时

- **性能优势**：
  - 无 console I/O 开销
  - 减少字符串格式化操作
  - 提升代码执行速度

**建议**：
- 开发环境：启用 console（便于调试）
- 生产环境：禁用 console（性能优先）
- 性能测试：禁用 console（真实模拟生产环境）

## ⚠️ 注意事项

### 1. Console 输出去向

当 `console` 启用时，输出会写入：
- **标准输出（stdout）**：`console.log`, `console.info`, `console.debug`
- **标准错误（stderr）**：`console.error`, `console.warn`

**不会**包含在 API 响应中，仅用于服务器端日志。

### 2. 错误类型

禁用 console 时的错误类型是 `RuntimeError`，而不是自定义的 `ConsoleDisabledError`。
这是因为 `panic` 会被 `recover` 捕获并包装为 `RuntimeError`。

### 3. 代码兼容性

如果用户代码中检查了 `console` 是否存在：

```javascript
// ✅ 这样的代码仍然会失败（因为 console 存在，但调用会抛出错误）
if (typeof console !== 'undefined') {
    console.log("test");  // 💥 抛出错误
}

// ✅ 推荐：使用 try-catch 保护
try {
    console.log("debug info");
} catch (e) {
    // console 不可用时静默失败
}
```

### 4. 配置更改

更改 `ENVIRONMENT` 或 `ALLOW_CONSOLE` 需要**重启服务**才能生效。

## 📚 相关文档

- [环境变量配置说明](env.example)
- [Docker 部署指南](DOCKER.md)
- [开发者指南](README.md)

## ✅ 验证清单

部署前验证：

- [ ] 开发环境配置了 `ENVIRONMENT=development`
- [ ] 生产环境配置了 `ENVIRONMENT=production`
- [ ] 测试了 console 在各环境下的行为
- [ ] 确认错误提示友好清晰
- [ ] 文档已更新（env.example, README.md）

---

**版本**：v1.0.0  
**更新日期**：2025-10-05  
**功能状态**：✅ 已实现并测试

