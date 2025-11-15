# Buffer 模块魔法数字重构示例

本文档展示如何使用新创建的 `constants.go` 文件重构现有代码。

## 示例 1: buffer_pool.go

### 修改前
```go
func NewBufferPool(poolSize int) *BufferPool {
	if poolSize <= 0 {
		poolSize = 8192 // 默认 8KB，与 Node.js 一致
	}
	return &BufferPool{
		pool:     make([]byte, poolSize),
		offset:   0,
		poolSize: poolSize,
	}
}

func (bp *BufferPool) Alloc(size int) ([]byte, *MmapCleanup) {
	if size > bp.poolSize/2 {
		if size > 10*1024*1024 {
			return allocLargeBuffer(size)
		}
		return make([]byte, size), nil
	}
	// ...
}
```

### 修改后
```go
func NewBufferPool(poolSize int) *BufferPool {
	if poolSize <= 0 {
		poolSize = DefaultPoolSize // 默认 8KB，与 Node.js 一致
	}
	return &BufferPool{
		pool:     make([]byte, poolSize),
		offset:   0,
		poolSize: poolSize,
	}
}

func (bp *BufferPool) Alloc(size int) ([]byte, *MmapCleanup) {
	if size > bp.poolSize/PoolThresholdRatio {
		if size > MmapThreshold {
			return allocLargeBuffer(size)
		}
		return make([]byte, size), nil
	}
	// ...
}
```

## 示例 2: fast_alloc.go

### 修改前
```go
func OptimizedBufferAlloc(runtime *goja.Runtime, pool *BufferPool, size int64, fill interface{}, encoding string) (goja.Value, error) {
	if size < 0 {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
	}

	const maxSafeInteger = 9007199254740991
	if size > maxSafeInteger {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= 9007199254740991. Received %d", size)))
	}

	const maxActualSize = 2 * 1024 * 1024 * 1024 // 2GB
	if size > maxActualSize {
		panic(newRangeError(runtime, "Array buffer allocation failed"))
	}
	// ...
}
```

### 修改后
```go
func OptimizedBufferAlloc(runtime *goja.Runtime, pool *BufferPool, size int64, fill interface{}, encoding string) (goja.Value, error) {
	if size < 0 {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d", MaxSafeInteger, size)))
	}

	if size > MaxSafeInteger {
		panic(newRangeError(runtime, fmt.Sprintf("The value of \"size\" is out of range. It must be >= 0 && <= %d. Received %d", MaxSafeInteger, size)))
	}

	if size > MaxActualSize {
		panic(newRangeError(runtime, "Array buffer allocation failed"))
	}
	// ...
}
```

## 示例 3: toString_optimized.go

### 修改前
```go
var encodingPools = [10]struct {
	capacity int
	pool     sync.Pool
}{
	{8 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 8*1024)}
	}}},
	{16 * 1024, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, 16*1024)}
	}}},
	// ... 更多级别
}

func (be *BufferEnhancer) toStringOptimized(runtime *goja.Runtime, this *goja.Object, encoding string, start, end int64) goja.Value {
	// ...
	if dataLen < 4096 {
		return runtime.ToValue(string(data))
	}
	// ...
}
```

### 修改后
```go
var encodingPools = [EncodingPoolLevelCount]struct {
	capacity int
	pool     sync.Pool
}{
	{EncodingPoolLevel1, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, EncodingPoolLevel1)}
	}}},
	{EncodingPoolLevel2, sync.Pool{New: func() interface{} {
		return &encodingBuffer{data: make([]byte, 0, EncodingPoolLevel2)}
	}}},
	// ... 更多级别
}

func (be *BufferEnhancer) toStringOptimized(runtime *goja.Runtime, this *goja.Object, encoding string, start, end int64) goja.Value {
	// ...
	if dataLen < SmallBufferThreshold {
		return runtime.ToValue(string(data))
	}
	// ...
}
```

## 示例 4: mmap_resource.go

### 修改前
```go
var globalMmapTracker = &MmapResourceTracker{
	cleanupInterval: 30 * time.Second,
	leakTimeout:     5 * time.Minute,
	stopCh:          make(chan struct{}),
}

func (t *MmapResourceTracker) cleanup() {
	if t.activeCount.Load() == 0 {
		return
	}

	now := time.Now()
	toRemove := make([]*MmapResource, 0, 64)
	// ...
}
```

### 修改后
```go
var globalMmapTracker = &MmapResourceTracker{
	cleanupInterval: MmapCleanupInterval * time.Second,
	leakTimeout:     time.Duration(MmapLeakTimeout) * time.Second,
	stopCh:          make(chan struct{}),
}

func (t *MmapResourceTracker) cleanup() {
	if t.activeCount.Load() == 0 {
		return
	}

	now := time.Now()
	toRemove := make([]*MmapResource, 0, MmapCleanupBatchSize)
	// ...
}
```

## 示例 5: utils.go

### 修改前
```go
func valueToUint8(v goja.Value) uint8 {
	num := v.ToNumber()
	f := num.ToFloat()

	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}

	i := num.ToInteger()
	mod := i % 256
	if mod < 0 {
		mod += 256
	}

	return uint8(mod)
}

func (be *BufferEnhancer) getBufferByte(buffer *goja.Object, offset int64) uint8 {
	if buffer == nil {
		return 0
	}
	val := buffer.Get(strconv.FormatInt(offset, 10))
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return 0
	}
	return uint8(val.ToInteger() & 0xFF)
}
```

### 修改后
```go
func valueToUint8(v goja.Value) uint8 {
	num := v.ToNumber()
	f := num.ToFloat()

	if math.IsNaN(f) || math.IsInf(f, 0) {
		return 0
	}

	i := num.ToInteger()
	mod := i % (Uint8Max + 1)
	if mod < 0 {
		mod += (Uint8Max + 1)
	}

	return uint8(mod)
}

func (be *BufferEnhancer) getBufferByte(buffer *goja.Object, offset int64) uint8 {
	if buffer == nil {
		return 0
	}
	val := buffer.Get(strconv.FormatInt(offset, 10))
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return 0
	}
	return uint8(val.ToInteger() & ByteMask)
}
```

## 重构检查清单

在重构每个文件时，请确保：

- [ ] 导入 constants.go 中定义的常量（同一个包，无需显式导入）
- [ ] 替换所有相关的魔法数字
- [ ] 保持代码逻辑完全不变
- [ ] 更新相关注释（如果有）
- [ ] 运行单元测试验证功能正常
- [ ] 运行性能测试确保无性能退化
- [ ] 代码审查确认常量使用正确

## 批量替换建议

可以使用以下 sed 命令进行批量替换（请先备份文件）：

```bash
# 替换 8192 为 DefaultPoolSize
sed -i '' 's/8192/DefaultPoolSize/g' buffer_pool.go

# 替换 10*1024*1024 为 MmapThreshold
sed -i '' 's/10\*1024\*1024/MmapThreshold/g' buffer_pool.go fast_alloc.go

# 替换 0xFF 为 ByteMask
sed -i '' 's/0xFF/ByteMask/g' utils.go numeric_methods.go

# 替换 4096 为 SmallBufferThreshold
sed -i '' 's/4096/SmallBufferThreshold/g' toString_optimized.go
```

**注意**: 批量替换后务必仔细检查，确保没有误替换。

## 验证步骤

重构完成后，执行以下验证：

```bash
# 1. 编译检查
cd /Users/Code/Go-product/Flow-codeblock_goja
go build ./enhance_modules/buffer/...

# 2. 运行单元测试
go test ./enhance_modules/buffer/... -v

# 3. 运行性能测试
go test ./enhance_modules/buffer/... -bench=. -benchmem

# 4. 代码格式化
go fmt ./enhance_modules/buffer/...

# 5. 代码检查
go vet ./enhance_modules/buffer/...
```

## 预期结果

重构完成后：
- ✅ 所有测试通过
- ✅ 性能无明显退化
- ✅ 代码可读性提升
- ✅ 维护成本降低
- ✅ 符合编码规范
