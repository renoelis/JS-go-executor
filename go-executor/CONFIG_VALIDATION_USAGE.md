# 环境变量校验功能使用指南

## 📋 功能简介

从本版本开始，当环境变量配置错误时，系统会自动记录警告日志，帮助您快速发现和定位配置问题。

---

## 🎯 典型场景

### 场景 1: 拼写错误

**配置文件 (`.env`)**:
```bash
RUNTIME_POOL_SIZE=100abc  # ← 不小心多输入了 "abc"
```

**启动日志**:
```
[WARN] 环境变量解析失败，使用默认值
  key: RUNTIME_POOL_SIZE
  invalid_value: 100abc
  default: 100
  error: strconv.Atoi: parsing "100abc": invalid syntax
```

**处理建议**: 修改配置为 `RUNTIME_POOL_SIZE=100`

---

### 场景 2: 单位错误

**配置文件**:
```bash
EXECUTION_TIMEOUT_MS=10s  # ← 错误：应该是毫秒数字，不能带单位
```

**启动日志**:
```
[WARN] 环境变量解析失败，使用默认值
  key: EXECUTION_TIMEOUT_MS
  invalid_value: 10s
  default: 300000
  error: strconv.Atoi: parsing "10s": invalid syntax
```

**处理建议**: 修改配置为 `EXECUTION_TIMEOUT_MS=10000`（10秒 = 10000毫秒）

---

### 场景 3: 范围错误

**配置文件**:
```bash
MIN_RUNTIME_POOL_SIZE=5  # ← 太小了，最小值是 10
```

**启动日志**:
```
[WARN] MIN_RUNTIME_POOL_SIZE 过小，已调整
  original: 5
  adjusted: 10
  reason: 最小值不能低于 10
```

**处理建议**: 修改配置为 `MIN_RUNTIME_POOL_SIZE=50`（推荐值）

---

### 场景 4: 配置冲突

**配置文件**:
```bash
MIN_RUNTIME_POOL_SIZE=100
MAX_RUNTIME_POOL_SIZE=50   # ← 错误：最大值不能小于最小值
RUNTIME_POOL_SIZE=150      # ← 超出最大值
```

**启动日志**:
```
[WARN] MAX_RUNTIME_POOL_SIZE 小于 MIN_RUNTIME_POOL_SIZE，已调整
  min_pool_size: 100
  original_max: 50
  adjusted_max: 200

[WARN] RUNTIME_POOL_SIZE 大于 MAX_RUNTIME_POOL_SIZE，已调整
  original: 150
  adjusted: 200
```

**处理建议**: 修改配置
```bash
MIN_RUNTIME_POOL_SIZE=50
MAX_RUNTIME_POOL_SIZE=200
RUNTIME_POOL_SIZE=100
```

---

## 📝 配置规范

### 整数类型配置

所有整数配置必须是**纯数字**，不能包含：
- ❌ 字母：`100abc`, `2k`, `500MB`
- ❌ 单位：`10s`, `5m`, `1h`
- ❌ 中文：`2千`, `一百`
- ❌ 特殊字符：`1,000`, `100_000`

✅ **正确示例**:
```bash
RUNTIME_POOL_SIZE=100
MAX_CONCURRENT_EXECUTIONS=2000
EXECUTION_TIMEOUT_MS=300000
MAX_CODE_LENGTH=65535
MAX_INPUT_SIZE=2097152
MAX_RESULT_SIZE=5242880
```

### 配置单位说明

| 配置项 | 单位 | 说明 | 示例 |
|--------|------|------|------|
| `RUNTIME_POOL_SIZE` | 个数 | Runtime 池大小 | `100` |
| `MAX_CONCURRENT_EXECUTIONS` | 个数 | 最大并发数 | `2000` |
| `EXECUTION_TIMEOUT_MS` | 毫秒 | 超时时间 | `300000` (5分钟) |
| `MAX_CODE_LENGTH` | 字节 | 代码长度限制 | `65535` (64KB) |
| `MAX_INPUT_SIZE` | 字节 | 输入大小限制 | `2097152` (2MB) |
| `MAX_RESULT_SIZE` | 字节 | 结果大小限制 | `5242880` (5MB) |
| `RUNTIME_IDLE_TIMEOUT_MIN` | 分钟 | 空闲超时 | `5` |

### 常用单位换算

**时间**:
```bash
1 秒 = 1000 毫秒
1 分钟 = 60000 毫秒
5 分钟 = 300000 毫秒（默认超时）
```

**大小**:
```bash
1 KB = 1024 字节
1 MB = 1048576 字节
2 MB = 2097152 字节（默认输入限制）
5 MB = 5242880 字节（默认结果限制）
64 KB = 65535 字节（默认代码限制）
```

---

## 🔍 如何测试配置

### 方法 1: 使用测试脚本

```bash
cd go-executor
./test_config_validation.sh
```

这个脚本会：
1. 设置各种错误配置
2. 启动服务
3. 显示预期的警告日志

### 方法 2: 手动测试

1. 修改 `.env` 文件，故意写错一个配置
   ```bash
   RUNTIME_POOL_SIZE=100abc
   ```

2. 启动服务
   ```bash
   cd go-executor
   go run cmd/main.go
   ```

3. 观察启动日志，应该看到警告信息
   ```
   [WARN] 环境变量解析失败，使用默认值
   ```

4. 修正配置，重启服务，警告应该消失

---

## ✅ 最佳实践

### 1. 定期检查启动日志

服务启动时，检查是否有 `[WARN]` 日志，及时修正配置。

### 2. 使用 `env.example` 作为模板

复制 `env.example` 并根据需要修改：
```bash
cp env.example .env
nano .env
```

### 3. 配置范围参考

参考 `env.example` 中的注释，了解每个配置的推荐范围：

```bash
# 最小 Runtime 池大小（默认：50）
# 强制最小值：10
MIN_RUNTIME_POOL_SIZE=50

# 最大 Runtime 池大小（默认：200）
# 自动调整：如果小于 MIN_RUNTIME_POOL_SIZE，会设为 MIN_RUNTIME_POOL_SIZE * 2
MAX_RUNTIME_POOL_SIZE=200
```

### 4. 环境分离

不同环境使用不同的配置文件：

**开发环境**:
```bash
cp env.development .env
```

**生产环境**:
```bash
cp env.production .env
```

### 5. 配置验证清单

在部署前，检查以下配置项：

- [ ] 所有整数配置都是纯数字（无字母、单位、特殊字符）
- [ ] `MIN_RUNTIME_POOL_SIZE >= 10`
- [ ] `MAX_RUNTIME_POOL_SIZE >= MIN_RUNTIME_POOL_SIZE`
- [ ] `MIN_RUNTIME_POOL_SIZE <= RUNTIME_POOL_SIZE <= MAX_RUNTIME_POOL_SIZE`
- [ ] `EXECUTION_TIMEOUT_MS` 适合业务场景（快速任务 10000，长任务 300000）
- [ ] `MAX_CONCURRENT_EXECUTIONS >= RUNTIME_POOL_SIZE`

---

## 🐛 常见问题

### Q1: 我设置了配置，但启动日志显示"使用默认值"？

**原因**: 配置值格式错误，无法解析为整数。

**解决**: 检查配置值是否包含非数字字符，参考"配置规范"部分修正。

---

### Q2: 为什么我的配置被自动调整了？

**原因**: 配置值超出有效范围，系统自动调整到安全值。

**解决**: 查看警告日志中的 `adjusted` 值，理解为什么被调整，然后修改配置到合理范围。

---

### Q3: 空值（空字符串）会触发警告吗？

**回答**: 不会。空值是合法的，表示使用默认值，不会记录警告。

```bash
# 这些都不会触发警告（使用默认值）
RUNTIME_POOL_SIZE=
MAX_CONCURRENT_EXECUTIONS=
```

---

### Q4: 如何知道某个配置的默认值？

**方法 1**: 查看 `config/config.go` 中的 `LoadConfig()` 函数

**方法 2**: 查看 `env.example` 中的注释

**方法 3**: 启动服务，查看日志中的实际配置

---

### Q5: 负数会触发警告吗？

**回答**: 负数能解析为整数，但会被范围校验捕获并调整。

```bash
RUNTIME_POOL_SIZE=-100

# 日志：
[WARN] RUNTIME_POOL_SIZE 小于 MIN_RUNTIME_POOL_SIZE，已调整
  original: -100
  adjusted: 50
```

---

## 📚 相关文档

- `CONFIG_VALIDATION_ENHANCEMENT.md` - 功能实施详细报告
- `env.example` - 完整的配置示例和说明
- `env.development` - 开发环境推荐配置
- `env.production` - 生产环境推荐配置

---

## 💡 反馈与建议

如果您在使用过程中遇到问题，或有改进建议，请：
1. 查看启动日志中的详细错误信息
2. 参考本文档的"常见问题"部分
3. 提交 Issue 描述问题

---

**文档版本**: v1.0  
**最后更新**: 2025-10-04  
**适用版本**: >= v3.0

