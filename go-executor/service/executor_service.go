package service

import (
	"encoding/base64"
	"fmt"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"flow-codeblock-go/assets"
	"flow-codeblock-go/config"
	"flow-codeblock-go/enhance_modules"
	"flow-codeblock-go/model"
	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/buffer"
	"github.com/dop251/goja_nodejs/console"
	"github.com/dop251/goja_nodejs/process"
	"github.com/dop251/goja_nodejs/require"
	"github.com/dop251/goja_nodejs/url"
)

// JSExecutor Go+goja JavaScript执行器
type JSExecutor struct {
	// Runtime池
	runtimePool chan *goja.Runtime
	poolSize    int

	// 动态 Runtime 池配置
	minPoolSize     int
	maxPoolSize     int
	idleTimeout     time.Duration
	currentPoolSize int32 // 原子操作的当前池大小

	// Runtime 池健康管理
	runtimeHealth map[*goja.Runtime]*runtimeHealthInfo
	healthMutex   sync.RWMutex

	// 并发控制
	semaphore     chan struct{}
	maxConcurrent int
	currentExecs  int64

	// 配置参数
	maxCodeLength    int
	maxInputSize     int
	maxResultSize    int
	executionTimeout time.Duration

	// Node.js兼容性
	registry *require.Registry

	// 模块增强器
	bufferEnhancer  *enhance_modules.BufferEnhancer
	cryptoEnhancer  *enhance_modules.CryptoEnhancer
	fetchEnhancer   *enhance_modules.FetchEnhancer
	axiosEnhancer   *enhance_modules.AxiosEnhancer
	dateFnsEnhancer *enhance_modules.DateFnsEnhancer
	qsEnhancer      *enhance_modules.QsEnhancer
	lodashEnhancer  *enhance_modules.LodashEnhancer
	pinyinEnhancer  *enhance_modules.PinyinEnhancer
	uuidEnhancer    *enhance_modules.UuidEnhancer

	// 用户代码编译缓存 (LRU 实现)
	codeCache      *utils.LRUCache
	codeCacheMutex sync.RWMutex
	maxCacheSize   int

	// 代码分析器（智能路由）
	analyzer *utils.CodeAnalyzer

	// 统计信息
	stats *model.ExecutorStats
	mutex sync.RWMutex

	// 关闭信号
	shutdown chan struct{}
	wg       sync.WaitGroup
}

// runtimeHealthInfo Runtime 健康信息
type runtimeHealthInfo struct {
	createdAt      time.Time
	lastUsedAt     time.Time
	executionCount int64
	errorCount     int64
}

// NewJSExecutor 创建新的JavaScript执行器
func NewJSExecutor(cfg *config.Config) *JSExecutor {
	executor := &JSExecutor{
		runtimePool:      make(chan *goja.Runtime, cfg.Executor.MaxPoolSize),
		poolSize:         cfg.Executor.PoolSize,
		minPoolSize:      cfg.Executor.MinPoolSize,
		maxPoolSize:      cfg.Executor.MaxPoolSize,
		idleTimeout:      cfg.Executor.IdleTimeout,
		currentPoolSize:  int32(cfg.Executor.PoolSize),
		runtimeHealth:    make(map[*goja.Runtime]*runtimeHealthInfo),
		semaphore:        make(chan struct{}, cfg.Executor.MaxConcurrent),
		maxConcurrent:    cfg.Executor.MaxConcurrent,
		maxCodeLength:    cfg.Executor.MaxCodeLength,
		maxInputSize:     cfg.Executor.MaxInputSize,
		maxResultSize:    cfg.Executor.MaxResultSize,
		executionTimeout: cfg.Executor.ExecutionTimeout,
		registry:         new(require.Registry),
		bufferEnhancer:   enhance_modules.NewBufferEnhancer(),
		cryptoEnhancer:   enhance_modules.NewCryptoEnhancerWithEmbedded(assets.CryptoJS),
		fetchEnhancer: enhance_modules.NewFetchEnhancerWithConfig(
			cfg.Fetch.Timeout,
			cfg.Fetch.MaxFormDataSize,
			cfg.Fetch.StreamingThreshold,
			cfg.Fetch.EnableChunkedUpload,
			cfg.Fetch.MaxBlobFileSize,
			cfg.Fetch.FormDataBufferSize,
			cfg.Fetch.MaxFileSize,
		),
		codeCache:    utils.NewLRUCache(cfg.Executor.CodeCacheSize),
		maxCacheSize: cfg.Executor.CodeCacheSize,
		analyzer:     utils.NewCodeAnalyzer(),
		stats:        &model.ExecutorStats{},
		shutdown:     make(chan struct{}),
	}

	// 注册crypto模块到require系统
	executor.cryptoEnhancer.RegisterCryptoModule(executor.registry)
	executor.cryptoEnhancer.RegisterCryptoJSModule(executor.registry)

	// 初始化并注册axios模块
	executor.axiosEnhancer = enhance_modules.NewAxiosEnhancer(assets.AxiosJS)
	executor.axiosEnhancer.RegisterAxiosModule(executor.registry)

	// 初始化并注册date-fns模块
	executor.dateFnsEnhancer = enhance_modules.NewDateFnsEnhancerWithEmbedded(assets.DateFns)
	executor.dateFnsEnhancer.RegisterDateFnsModule(executor.registry)

	// 初始化并注册qs模块
	executor.qsEnhancer = enhance_modules.NewQsEnhancer(assets.Qs)
	executor.qsEnhancer.RegisterQsModule(executor.registry)

	// 初始化并注册lodash模块
	executor.lodashEnhancer = enhance_modules.NewLodashEnhancer(assets.Lodash)
	executor.lodashEnhancer.RegisterLodashModule(executor.registry)

	// 初始化并注册pinyin模块
	executor.pinyinEnhancer = enhance_modules.NewPinyinEnhancer(assets.Pinyin)
	executor.pinyinEnhancer.RegisterPinyinModule(executor.registry)

	// 初始化并注册uuid模块
	executor.uuidEnhancer = enhance_modules.NewUuidEnhancer(assets.Uuid)
	executor.uuidEnhancer.RegisterUuidModule(executor.registry)

	// 注册 Node.js form-data 模块
	enhance_modules.RegisterFormDataModule(executor.registry, executor.fetchEnhancer)

	// 初始化Runtime池
	executor.initRuntimePool()

	// 启动健康检查器
	executor.startHealthChecker()

	log.Printf("✅ JavaScript执行器初始化完成:")
	log.Printf("   Runtime池配置: 当前=%d, 最小=%d, 最大=%d", cfg.Executor.PoolSize, cfg.Executor.MinPoolSize, cfg.Executor.MaxPoolSize)
	log.Printf("   空闲超时: %v", cfg.Executor.IdleTimeout)
	log.Printf("   最大并发数: %d", cfg.Executor.MaxConcurrent)
	log.Printf("   代码长度限制: %d字节", cfg.Executor.MaxCodeLength)
	log.Printf("   执行超时: %v", executor.executionTimeout)

	return executor
}

// GetPoolSize 获取池大小配置
func (e *JSExecutor) GetPoolSize() int {
	return e.poolSize
}

// GetMaxConcurrent 获取最大并发数配置
func (e *JSExecutor) GetMaxConcurrent() int {
	return e.maxConcurrent
}

// GetExecutionTimeout 获取执行超时配置
func (e *JSExecutor) GetExecutionTimeout() time.Duration {
	return e.executionTimeout
}

// GetMaxCodeLength 获取最大代码长度配置
func (e *JSExecutor) GetMaxCodeLength() int {
	return e.maxCodeLength
}

// GetMaxInputSize 获取最大输入大小配置
func (e *JSExecutor) GetMaxInputSize() int {
	return e.maxInputSize
}

// GetMaxResultSize 获取最大结果大小配置
func (e *JSExecutor) GetMaxResultSize() int {
	return e.maxResultSize
}

// initRuntimePool 初始化Runtime池
func (e *JSExecutor) initRuntimePool() {
	log.Printf("🚀 正在初始化%d个JavaScript Runtime...", e.poolSize)

	for i := 0; i < e.poolSize; i++ {
		runtime := goja.New()
		e.setupRuntime(runtime)

		e.healthMutex.Lock()
		e.runtimeHealth[runtime] = &runtimeHealthInfo{
			createdAt:      time.Now(),
			lastUsedAt:     time.Now(),
			executionCount: 0,
			errorCount:     0,
		}
		e.healthMutex.Unlock()

		e.runtimePool <- runtime
	}

	log.Printf("✅ Runtime池初始化完成，%d个Runtime就绪", e.poolSize)
}

// setupRuntime 设置Runtime环境
func (e *JSExecutor) setupRuntime(runtime *goja.Runtime) {
	runtime.Set("__strict__", true)
	e.setupNodeJSModules(runtime)
	e.setupGlobalObjects(runtime)
	e.setupSecurityRestrictions(runtime)

	if err := e.fetchEnhancer.RegisterFetchAPI(runtime); err != nil {
		log.Printf("⚠️  Fetch API 注册失败: %v", err)
	}
}

// setupNodeJSModules 设置Node.js兼容模块
func (e *JSExecutor) setupNodeJSModules(runtime *goja.Runtime) {
	e.registry.Enable(runtime)
	console.Enable(runtime)
	buffer.Enable(runtime)
	e.bufferEnhancer.EnhanceBufferSupport(runtime)

	if err := e.cryptoEnhancer.SetupCryptoEnvironment(runtime); err != nil {
		log.Printf("⚠️  SetupCryptoEnvironment 失败: %v", err)
	}

	url.Enable(runtime)
	process.Enable(runtime)

	// 禁用危险的process功能
	if processObj := runtime.Get("process"); processObj != nil {
		if obj, ok := processObj.(*goja.Object); ok {
			obj.Set("exit", goja.Undefined())
			obj.Set("abort", goja.Undefined())
			obj.Set("env", runtime.NewObject())
			obj.Set("argv", runtime.NewArray())
		}
	}
}

// setupGlobalObjects 设置基础全局对象
func (e *JSExecutor) setupGlobalObjects(runtime *goja.Runtime) {
	runtime.Set("Math", runtime.Get("Math"))
	runtime.Set("JSON", runtime.Get("JSON"))
	runtime.Set("parseInt", runtime.Get("parseInt"))
	runtime.Set("parseFloat", runtime.Get("parseFloat"))
	runtime.Set("isNaN", runtime.Get("isNaN"))
	runtime.Set("isFinite", runtime.Get("isFinite"))
	runtime.Set("encodeURIComponent", runtime.Get("encodeURIComponent"))
	runtime.Set("decodeURIComponent", runtime.Get("decodeURIComponent"))

	e.registerBase64Functions(runtime)
}

// setupGlobalObjectsForEventLoop 为 EventLoop 设置全局对象
func (e *JSExecutor) setupGlobalObjectsForEventLoop(runtime *goja.Runtime) {
	runtime.Set("encodeURIComponent", runtime.Get("encodeURIComponent"))
	runtime.Set("decodeURIComponent", runtime.Get("decodeURIComponent"))
}

// registerBase64Functions 注册 Base64 编码/解码函数
func (e *JSExecutor) registerBase64Functions(runtime *goja.Runtime) {
	runtime.Set("btoa", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("btoa: At least 1 argument required"))
		}
		input := call.Arguments[0].String()
		encoded := base64.StdEncoding.EncodeToString([]byte(input))
		return runtime.ToValue(encoded)
	})

	runtime.Set("atob", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("atob: At least 1 argument required"))
		}
		input := call.Arguments[0].String()
		decoded, err := base64.StdEncoding.DecodeString(input)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("atob: Invalid Base64 string: %v", err)))
		}
		return runtime.ToValue(string(decoded))
	})
}

// setupSecurityRestrictions 设置安全限制
func (e *JSExecutor) setupSecurityRestrictions(runtime *goja.Runtime) {
	// ⚠️ 重要: 以下全局对象不再在 runtime 级别禁用
	// 原因: 嵌入库需要使用这些对象来检测运行环境和获取全局对象
	//   - lodash: 使用 Function('return this')() 获取全局对象
	//   - 其他库: 使用 typeof globalThis/window/self 检测环境
	// 安全性: 通过 validateCodeSecurity() 在用户代码级别检查和阻止这些危险模式
	//   - 用户代码中的 Function(、globalThis.、window. 等会被检测并阻止
	//   - 嵌入库代码不经过 validateCodeSecurity(),可以正常使用

	runtime.Set("eval", goja.Undefined()) // eval 仍然完全禁用,太危险
	// runtime.Set("Function", goja.Undefined())    // 允许嵌入库使用
	// runtime.Set("globalThis", goja.Undefined())  // 允许嵌入库使用
	// runtime.Set("window", goja.Undefined())      // 允许嵌入库使用
	// runtime.Set("self", goja.Undefined())        // 允许嵌入库使用
}

// Execute 执行JavaScript代码（智能路由：同步用池，异步用EventLoop）
func (e *JSExecutor) Execute(code string, input map[string]interface{}) (*model.ExecutionResult, error) {
	startTime := time.Now()

	if err := e.validateInput(code, input); err != nil {
		return nil, err
	}

	// 并发控制
	select {
	case e.semaphore <- struct{}{}:
		defer func() { <-e.semaphore }()
	case <-time.After(10 * time.Second):
		return nil, &model.ExecutionError{
			Type:    "ConcurrencyError",
			Message: "系统繁忙，请稍后重试",
		}
	}

	atomic.AddInt64(&e.currentExecs, 1)
	atomic.AddInt64(&e.stats.TotalExecutions, 1)
	defer atomic.AddInt64(&e.currentExecs, -1)

	var result *model.ExecutionResult
	var err error

	if e.analyzer.ShouldUseRuntimePool(code) {
		atomic.AddInt64(&e.stats.SyncExecutions, 1)
		result, err = e.executeWithRuntimePool(code, input)
	} else {
		atomic.AddInt64(&e.stats.AsyncExecutions, 1)
		result, err = e.executeWithEventLoop(code, input)
	}

	executionTime := time.Since(startTime)
	e.updateStats(executionTime, err == nil)

	return result, err
}

// 注意：由于文件过长，我将继续在另一个文件中添加剩余的私有方法
// 这些方法将作为 executor_service_helpers.go 的一部分
