# Buffer 模块环境变量配置

本文档说明如何通过环境变量控制 Buffer 模块的关键常量。

## 环境变量列表

### 1. BUFFER_MAX_PRACTICAL_LENGTH
- **类型**: int64
- **默认值**: 2147483647 (2GB = 2^31 - 1)
- **说明**: Buffer 和 ArrayBuffer 的最大实用长度限制
- **用途**: 防止内存溢出，与 Node.js buffer.constants.MAX_LENGTH 一致
- **示例**:
  ```bash
  export BUFFER_MAX_PRACTICAL_LENGTH=2147483647
  ```

### 2. BUFFER_MAX_SAFE_INTEGER
- **类型**: int64
- **默认值**: 9007199254740991 (Number.MAX_SAFE_INTEGER)
- **说明**: JavaScript 数值的最大安全整数
- **用途**: Buffer 大小的理论最大值
- **示例**:
  ```bash
  export BUFFER_MAX_SAFE_INTEGER=9007199254740991
  ```

### 3. BUFFER_MAX_STRING_LENGTH
- **类型**: int64
- **默认值**: 536870888 (~536MB = 2^29 - 24)
- **说明**: 单个字符串实例允许的最大长度
- **用途**: 限制字符串编码时的内存使用
- **示例**:
  ```bash
  export BUFFER_MAX_STRING_LENGTH=536870888
  ```

### 4. BUFFER_MMAP_CLEANUP_INTERVAL
- **类型**: int (秒)
- **默认值**: 30
- **说明**: mmap 资源清理的执行间隔
- **用途**: 定期清理未使用的 mmap 资源
- **示例**:
  ```bash
  export BUFFER_MMAP_CLEANUP_INTERVAL=30
  ```

### 5. BUFFER_MMAP_LEAK_TIMEOUT
- **类型**: int (秒)
- **默认值**: 300 (5分钟)
- **说明**: mmap 资源泄漏的超时时间
- **用途**: 超过此时间未释放的资源视为泄漏
- **示例**:
  ```bash
  export BUFFER_MMAP_LEAK_TIMEOUT=300
  ```

### 6. BUFFER_MMAP_CLEANUP_BATCH_SIZE
- **类型**: int
- **默认值**: 64
- **说明**: mmap 清理时的批量处理大小
- **用途**: 预分配容量，减少内存分配次数
- **示例**:
  ```bash
  export BUFFER_MMAP_CLEANUP_BATCH_SIZE=64
  ```

## Docker Compose 配置

### 开发环境 (docker-compose.yml)

```yaml
environment:
  # ==================== 🔧 Buffer 模块配置 ====================
  - BUFFER_MAX_PRACTICAL_LENGTH=2147483647
  - BUFFER_MAX_SAFE_INTEGER=9007199254740991
  - BUFFER_MAX_STRING_LENGTH=536870888
  - BUFFER_MMAP_CLEANUP_INTERVAL=30
  - BUFFER_MMAP_LEAK_TIMEOUT=300
  - BUFFER_MMAP_CLEANUP_BATCH_SIZE=64
```

### 生产环境 (docker-compose.prod.yml)

```yaml
environment:
  # ==================== 🔧 Buffer 模块配置 ====================
  - BUFFER_MAX_PRACTICAL_LENGTH=${BUFFER_MAX_PRACTICAL_LENGTH:-2147483647}
  - BUFFER_MAX_SAFE_INTEGER=${BUFFER_MAX_SAFE_INTEGER:-9007199254740991}
  - BUFFER_MAX_STRING_LENGTH=${BUFFER_MAX_STRING_LENGTH:-536870888}
  - BUFFER_MMAP_CLEANUP_INTERVAL=${BUFFER_MMAP_CLEANUP_INTERVAL:-30}
  - BUFFER_MMAP_LEAK_TIMEOUT=${BUFFER_MMAP_LEAK_TIMEOUT:-300}
  - BUFFER_MMAP_CLEANUP_BATCH_SIZE=${BUFFER_MMAP_CLEANUP_BATCH_SIZE:-64}
```

## 配置建议

### 开发环境
- 使用默认值即可
- 可根据测试需求调整 MMAP 清理参数

### 生产环境
- **高内存场景**: 可增加 BUFFER_MAX_PRACTICAL_LENGTH
- **高并发场景**: 增加 BUFFER_MMAP_CLEANUP_BATCH_SIZE (建议: 128-256)
- **内存紧张**: 减少 BUFFER_MMAP_LEAK_TIMEOUT (建议: 60-120秒)

## 环境变量解析

所有环境变量通过 `getEnvInt()` 和 `getEnvInt64()` 函数解析：

```go
// 如果环境变量未设置或解析失败，使用默认值
MaxPracticalLength = getEnvInt64("BUFFER_MAX_PRACTICAL_LENGTH", 2147483647)
```

### 解析规则
1. 首先尝试从环境变量读取值
2. 如果环境变量不存在，使用默认值
3. 如果环境变量值无法解析为整数，使用默认值
4. 无效值不会导致程序崩溃

## 示例

### 启动容器时指定环境变量

```bash
docker-compose -e BUFFER_MAX_PRACTICAL_LENGTH=1073741824 up
```

### 通过 .env 文件配置 (生产环境)

创建 `.env` 文件:

```env
BUFFER_MAX_PRACTICAL_LENGTH=2147483647
BUFFER_MAX_SAFE_INTEGER=9007199254740991
BUFFER_MAX_STRING_LENGTH=536870888
BUFFER_MMAP_CLEANUP_INTERVAL=30
BUFFER_MMAP_LEAK_TIMEOUT=300
BUFFER_MMAP_CLEANUP_BATCH_SIZE=64
```

然后运行:

```bash
docker-compose -f docker-compose.prod.yml up
```

## 注意事项

⚠️ **重要**:
- 不建议将 BUFFER_MAX_PRACTICAL_LENGTH 设置超过系统可用内存
- BUFFER_MMAP_CLEANUP_INTERVAL 过小会增加 CPU 使用率
- BUFFER_MMAP_CLEANUP_BATCH_SIZE 过大会增加单次清理的内存占用

## 验证配置

在应用启动时，可以通过日志确认环境变量是否被正确加载。

所有常量在 `enhance_modules/buffer/constants.go` 中定义，可直接查看当前值。
