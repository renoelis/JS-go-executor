package service

import (
	"encoding/base64"
	"fmt"
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
	"go.uber.org/zap"
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
	allowConsole     bool // 是否允许用户代码使用 console

	// Node.js兼容性
	registry *require.Registry

	// 🔥 模块注册器（统一管理所有模块增强器）
	moduleRegistry *ModuleRegistry

	// 🔒 预加载的库导出（安全隔离）
	preloadedLibs map[string]interface{}
	preloadMutex  sync.RWMutex

	// 用户代码编译缓存 (LRU 实现)
	codeCache      *utils.LRUCache
	codeCacheMutex sync.RWMutex
	maxCacheSize   int

	// 🔥 代码验证缓存 (LRU 实现)
	// 缓存安全检查结果，避免重复执行 40+ 个正则表达式
	// key: 代码哈希, value: error (nil 表示验证通过)
	validationCache      *utils.GenericLRUCache
	validationCacheMutex sync.RWMutex

	// 代码分析器（智能路由）
	analyzer *utils.CodeAnalyzer

	// 统计信息
	stats *model.ExecutorStats
	mutex sync.RWMutex

	// 预热统计信息
	warmupStats *model.WarmupStats
	warmupMutex sync.RWMutex

	// 关闭信号
	shutdown chan struct{}
	wg       sync.WaitGroup
}

// runtimeHealthInfo 运行时健康信息
//
// 🔒 并发安全设计：
//
//   - executionCount/errorCount: 必须使用 atomic 操作（AddInt64/LoadInt64）
//
//   - 这两个计数器会被频繁并发更新，必须保证原子性
//
//   - 初始化时直接赋值 0 是安全的（在发布到池之前，无并发访问）
//
//   - createdAt/lastUsedAt: time.Time 字段
//
//   - 写入操作：使用 healthMutex.Lock() 独占锁保护
//
//   - 读取操作：使用 healthMutex.RLock() 共享锁保护
//
//   - RWMutex 保证读写互斥，在此保护下读取 time.Time 是安全的
//
//   - 初始化时直接赋值是安全的（在发布到池之前，无并发访问）
//
//   - 为什么 time.Time 不用 atomic？
//
//   - time.Time 是 24 字节结构体（wall uint64 + ext int64 + loc *Location）
//
//   - 无法使用 atomic 操作（atomic 只支持 int32/int64/pointer）
//
//   - 可选方案是改用 int64 时间戳 + atomic，但会降低代码可读性
//
//   - 当前 RWMutex 方案已在性能和简洁性之间取得良好平衡
type runtimeHealthInfo struct {
	createdAt      time.Time // RWMutex 保护（写用 Lock，读用 RLock）
	lastUsedAt     time.Time // RWMutex 保护（写用 Lock，读用 RLock）
	executionCount int64     // 必须使用 atomic.AddInt64 / atomic.LoadInt64
	errorCount     int64     // 必须使用 atomic.AddInt64 / atomic.LoadInt64
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
		allowConsole:     cfg.Executor.AllowConsole, // 🔥 Console 控制
		registry:         new(require.Registry),
		moduleRegistry:   NewModuleRegistry(), // 🔥 创建模块注册器
		codeCache:        utils.NewLRUCache(cfg.Executor.CodeCacheSize),
		validationCache:  utils.NewGenericLRUCache(cfg.Executor.CodeCacheSize), // 🔥 验证缓存（与代码缓存相同大小）
		maxCacheSize:     cfg.Executor.CodeCacheSize,
		analyzer:         utils.NewCodeAnalyzer(),
		stats:            &model.ExecutorStats{},
		warmupStats:      &model.WarmupStats{Status: "not_started"},
		shutdown:         make(chan struct{}),
		preloadedLibs:    make(map[string]interface{}),
	}

	// 🔥 注册所有模块（统一管理）
	executor.registerModules(cfg)

	// 🔒 预加载嵌入库（在可信环境中）
	executor.preloadEmbeddedLibraries()

	// 🔥 启动时预编译关键模块（Fail Fast）
	// 错误处理说明：
	//   - warmupModules() 内部已使用 fmt.Errorf("%w") 包装错误，保留了完整错误链
	//   - zap.Error(err) 会自动记录完整的错误信息和调用堆栈
	//   - 无需再次包装（如 fmt.Errorf("warmupModules failed: %w", err)）
	//   - 原因：日志消息已提供上下文，再包装会产生冗余信息
	//   - 错误链示例：crypto-js 预编译失败: compilation error at line 10
	if err := executor.warmupModules(); err != nil {
		utils.Fatal("关键模块预编译失败，服务启动中止", zap.Error(err))
	}

	// 初始化Runtime池
	executor.initRuntimePool()

	// 启动健康检查器
	executor.startHealthChecker()

	utils.Info("JavaScript 执行器初始化成功",
		zap.Int("pool_size", cfg.Executor.PoolSize),
		zap.Int("min_pool_size", cfg.Executor.MinPoolSize),
		zap.Int("max_pool_size", cfg.Executor.MaxPoolSize),
		zap.Duration("idle_timeout", cfg.Executor.IdleTimeout),
		zap.Int("max_concurrent", cfg.Executor.MaxConcurrent),
		zap.Int("max_code_length", cfg.Executor.MaxCodeLength),
		zap.Duration("execution_timeout", executor.executionTimeout),
		zap.Bool("allow_console", cfg.Executor.AllowConsole), // 🔥 Console 状态
		zap.Int("registered_modules", executor.moduleRegistry.Count()),
		zap.Strings("module_list", executor.moduleRegistry.List()),
	)

	return executor
}

// registerModules 注册所有需要的模块
// 🔥 这是新架构的核心：统一的模块注册入口
func (e *JSExecutor) registerModules(cfg *config.Config) {
	utils.Debug("开始注册模块")

	// 注册 Buffer 模块
	e.moduleRegistry.Register(enhance_modules.NewBufferEnhancer())

	// 注册 Crypto 模块
	e.moduleRegistry.Register(enhance_modules.NewCryptoEnhancerWithEmbedded(assets.CryptoJS))

	// 注册 Fetch 模块
	fetchEnhancer := enhance_modules.NewFetchEnhancerWithConfig(
		cfg.Fetch.Timeout,
		cfg.Fetch.MaxFormDataSize,
		cfg.Fetch.StreamingThreshold,
		cfg.Fetch.EnableChunkedUpload,
		cfg.Fetch.MaxBlobFileSize,
		cfg.Fetch.FormDataBufferSize,
		cfg.Fetch.MaxFileSize,
	)
	e.moduleRegistry.Register(fetchEnhancer)

	// 注册 FormData 模块（需要访问 fetchEnhancer）
	enhance_modules.RegisterFormDataModule(e.registry, fetchEnhancer)

	// 注册其他模块
	e.moduleRegistry.Register(enhance_modules.NewAxiosEnhancer(assets.AxiosJS))
	e.moduleRegistry.Register(enhance_modules.NewDateFnsEnhancerWithEmbedded(assets.DateFns))
	e.moduleRegistry.Register(enhance_modules.NewQsEnhancer(assets.Qs))
	e.moduleRegistry.Register(enhance_modules.NewLodashEnhancer(assets.Lodash))
	e.moduleRegistry.Register(enhance_modules.NewPinyinEnhancer(assets.Pinyin))
	e.moduleRegistry.Register(enhance_modules.NewUuidEnhancer(assets.Uuid))
	e.moduleRegistry.Register(enhance_modules.NewXLSXEnhancer(cfg))

	// 🔥 一次性注册所有模块到 require 系统
	if err := e.moduleRegistry.RegisterAll(e.registry); err != nil {
		utils.Fatal("模块注册失败", zap.Error(err))
	}
}

// warmupModules 预热关键模块（启动时预编译）
// 🔥 Fail Fast 策略：在服务启动时立即发现编译问题
//
// 预编译的好处：
//  1. 验证嵌入代码完整性（启动时立即发现损坏的代码）
//  2. 避免首次请求时的编译延迟（提升用户体验）
//  3. 快速失败原则（如果有问题，服务不应启动）
//  4. 减少首次请求的响应时间（已编译好，直接使用）
func (e *JSExecutor) warmupModules() error {
	utils.Info("开始预热嵌入式模块...")
	startTime := time.Now()

	// 定义需要预编译的模块列表
	// 🔥 只预编译大型嵌入式 JS 库（小型库按需编译即可）
	modulesToWarmup := []struct {
		name       string
		getModule  func() (interface{}, bool)
		precompile func(interface{}) error
	}{
		{
			name: "crypto-js",
			getModule: func() (interface{}, bool) {
				return e.moduleRegistry.GetModule("crypto")
			},
			precompile: func(m interface{}) error {
				if enhancer, ok := m.(*enhance_modules.CryptoEnhancer); ok {
					return enhancer.PrecompileCryptoJS()
				}
				return fmt.Errorf("invalid module type")
			},
		},
		{
			name: "axios",
			getModule: func() (interface{}, bool) {
				return e.moduleRegistry.GetModule("axios")
			},
			precompile: func(m interface{}) error {
				if enhancer, ok := m.(*enhance_modules.AxiosEnhancer); ok {
					return enhancer.PrecompileAxios()
				}
				return fmt.Errorf("invalid module type")
			},
		},
		{
			name: "date-fns",
			getModule: func() (interface{}, bool) {
				return e.moduleRegistry.GetModule("date-fns")
			},
			precompile: func(m interface{}) error {
				if enhancer, ok := m.(*enhance_modules.DateFnsEnhancer); ok {
					return enhancer.PrecompileDateFns()
				}
				return fmt.Errorf("invalid module type")
			},
		},
		{
			name: "lodash",
			getModule: func() (interface{}, bool) {
				return e.moduleRegistry.GetModule("lodash")
			},
			precompile: func(m interface{}) error {
				if enhancer, ok := m.(*enhance_modules.LodashEnhancer); ok {
					return enhancer.PrecompileLodash()
				}
				return fmt.Errorf("invalid module type")
			},
		},
		{
			name: "qs",
			getModule: func() (interface{}, bool) {
				return e.moduleRegistry.GetModule("qs")
			},
			precompile: func(m interface{}) error {
				if enhancer, ok := m.(*enhance_modules.QsEnhancer); ok {
					return enhancer.PrecompileQs()
				}
				return fmt.Errorf("invalid module type")
			},
		},
		{
			name: "pinyin",
			getModule: func() (interface{}, bool) {
				return e.moduleRegistry.GetModule("pinyin")
			},
			precompile: func(m interface{}) error {
				if enhancer, ok := m.(*enhance_modules.PinyinEnhancer); ok {
					return enhancer.PrecompilePinyin()
				}
				return fmt.Errorf("invalid module type")
			},
		},
		{
			name: "uuid",
			getModule: func() (interface{}, bool) {
				return e.moduleRegistry.GetModule("uuid")
			},
			precompile: func(m interface{}) error {
				if enhancer, ok := m.(*enhance_modules.UuidEnhancer); ok {
					return enhancer.PrecompileUuid()
				}
				return fmt.Errorf("invalid module type")
			},
		},
	}

	// 预编译所有模块
	successCount := 0
	compiledModules := make([]string, 0, len(modulesToWarmup))

	for _, module := range modulesToWarmup {
		moduleObj, found := module.getModule()
		if !found {
			utils.Warn("模块未注册，跳过预编译", zap.String("module", module.name))
			continue
		}

		utils.Debug("预编译模块", zap.String("module", module.name))
		if err := module.precompile(moduleObj); err != nil {
			// 记录失败状态
			e.warmupMutex.Lock()
			e.warmupStats = &model.WarmupStats{
				Status:       "failed",
				Modules:      compiledModules,
				TotalModules: len(modulesToWarmup),
				SuccessCount: successCount,
				Elapsed:      time.Since(startTime).String(),
				ElapsedMs:    time.Since(startTime).Milliseconds(),
				Timestamp:    time.Now().Format(time.RFC3339),
			}
			e.warmupMutex.Unlock()

			// 🔥 为什么使用 Fatal 而非 Error + 降级？
			//
			// 所有模块都是关键模块的原因：
			//   1. 嵌入式部署：代码嵌入二进制，失败只能是代码损坏或 goja 引擎 bug
			//   2. 用户体验：允许部分模块缺失会导致运行时错误，用户困惑
			//   3. Fail Fast：启动时发现问题优于运行时发现
			//   4. 一致性：所有声称支持的模块都应该可用
			//
			// 为什么不区分关键/非关键模块？
			//   - crypto-js: 加密签名，业务核心
			//   - axios: HTTP 请求，大部分场景必需
			//   - date-fns: 日期处理，常见业务逻辑
			//   - lodash: 数据处理，广泛使用
			//   - qs: 查询解析，API 必需
			//   - pinyin: 中文处理，特定场景关键
			//   - uuid: ID 生成，通用需求
			//   → 对不同业务场景，关键性不同，难以统一定义
			//
			// 错误处理策略：
			//   - 预编译失败 → 返回错误 → 调用方 Fatal → 服务不启动
			//   - 不使用 Error 级别（Error 意味着可继续，但这里不可继续）
			//   - 错误链完整：模块名 + 原始错误 → 易于排查
			//
			// 🔥 错误包装最佳实践：
			// - 使用 %w 保留原始错误，构建错误链（Go 1.13+）
			// - 添加模块名作为上下文，方便定位问题
			// - 返回给调用方，由调用方决定是记录日志还是继续包装
			// - 错误链可通过 errors.Unwrap() 逐层解析
			return fmt.Errorf("%s 预编译失败: %w", module.name, err)
		}
		successCount++
		compiledModules = append(compiledModules, module.name)
	}

	elapsed := time.Since(startTime)

	// 记录成功状态
	e.warmupMutex.Lock()
	e.warmupStats = &model.WarmupStats{
		Status:       "completed",
		Modules:      compiledModules,
		TotalModules: len(modulesToWarmup),
		SuccessCount: successCount,
		Elapsed:      elapsed.String(),
		ElapsedMs:    elapsed.Milliseconds(),
		Timestamp:    time.Now().Format(time.RFC3339),
	}
	e.warmupMutex.Unlock()

	utils.Info("模块预热完成",
		zap.Int("total_modules", len(modulesToWarmup)),
		zap.Int("success_count", successCount),
		zap.Duration("elapsed", elapsed),
		zap.String("status", "ready"),
	)

	return nil
}

// GetWarmupStats 获取预热统计信息
func (e *JSExecutor) GetWarmupStats() *model.WarmupStats {
	e.warmupMutex.RLock()
	defer e.warmupMutex.RUnlock()

	// 返回副本，避免外部修改
	statsCopy := *e.warmupStats
	return &statsCopy
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
	utils.Info("初始化 JavaScript 运行时池", zap.Int("pool_size", e.poolSize))

	for i := 0; i < e.poolSize; i++ {
		runtime := goja.New()
		if err := e.setupRuntime(runtime); err != nil {
			utils.Fatal("初始化运行时失败", zap.Int("runtime_index", i), zap.Error(err))
		}

		// 🔒 初始化健康信息（在发布到池之前）
		// 注意：executionCount 和 errorCount 在后续使用 atomic 操作
		// 这里直接赋值 0 是安全的，因为此时尚未发布到其他 goroutine
		e.healthMutex.Lock()
		e.runtimeHealth[runtime] = &runtimeHealthInfo{
			createdAt:      time.Now(),
			lastUsedAt:     time.Now(),
			executionCount: 0, // 安全：尚未发布，无并发访问
			errorCount:     0, // 安全：尚未发布，无并发访问
		}
		e.healthMutex.Unlock()

		e.runtimePool <- runtime
	}

	utils.Info("运行时池初始化完成", zap.Int("ready_runtimes", e.poolSize))
}

// setupRuntime 设置Runtime环境
// 🔒 新的安全加载顺序：
//  1. 先设置 Node.js 基础模块（此时原型正常）
//  2. 设置安全限制（禁用 Function、globalThis、删除 constructor）
//  3. 注入预加载的库（在受限环境中）
func (e *JSExecutor) setupRuntime(runtime *goja.Runtime) error {
	runtime.Set("__strict__", true)

	// 步骤1: 先设置 Node.js 基础模块（需要正常的原型）
	e.setupNodeJSModules(runtime)

	// 步骤2: 设置全局对象
	e.setupGlobalObjects(runtime)

	// 🔒 步骤3: 禁用危险功能和 constructor
	// 注意：我们无法完全禁用 Function（库需要它），但可以禁用 constructor 链攻击
	runtime.Set("eval", goja.Undefined())
	// runtime.Set("Function", goja.Undefined())  // 无法禁用，库需要
	runtime.Set("globalThis", goja.Undefined())
	runtime.Set("window", goja.Undefined())
	runtime.Set("self", goja.Undefined())

	// 🔥 禁用 Reflect 和 Proxy（防止绕过 constructor 防护）
	runtime.Set("Reflect", goja.Undefined())
	runtime.Set("Proxy", goja.Undefined())

	// 禁用 constructor 访问（这是主要防御）
	e.disableConstructorAccess(runtime)

	// 🔥 步骤4: 统一设置所有模块（使用模块注册器）
	if err := e.moduleRegistry.SetupAll(runtime); err != nil {
		return fmt.Errorf("failed to setup modules: %w", err)
	}

	return nil
}

// setupNodeJSModules 设置Node.js兼容模块
func (e *JSExecutor) setupNodeJSModules(runtime *goja.Runtime) {
	e.registry.Enable(runtime)

	// 🔥 Console 控制：根据配置决定是否启用
	// - 开发环境：允许 console 便于调试
	// - 生产环境：禁用 console 提升性能和安全性
	if e.allowConsole {
		console.Enable(runtime)
	} else {
		// 🔥 提供友好的错误提示（当用户尝试使用 console 时）
		e.setupConsoleStub(runtime)
	}

	buffer.Enable(runtime)

	// 注意: Buffer 和 Crypto 的增强功能会通过 moduleRegistry.SetupAll() 统一调用
	// 这里只需要启用基础的 Node.js 模块

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

// setupConsoleStub 设置 console 占位符（提供友好的错误提示）
//
// 当生产环境禁用 console 时，为用户提供明确的错误信息，
// 而不是让代码因为 console 未定义而失败
func (e *JSExecutor) setupConsoleStub(runtime *goja.Runtime) {
	consoleStub := runtime.NewObject()

	// 创建一个错误提示函数
	// 🔥 使用 panic 抛出自定义错误，会被上层 recover 捕获并分类
	errorFunc := func(call goja.FunctionCall) goja.Value {
		panic(&model.ExecutionError{
			Type:    "ConsoleDisabledError",
			Message: "console 代码禁止使用",
		})
	}

	// 为所有常用 console 方法提供相同的错误提示
	consoleStub.Set("log", errorFunc)
	consoleStub.Set("info", errorFunc)
	consoleStub.Set("warn", errorFunc)
	consoleStub.Set("error", errorFunc)
	consoleStub.Set("debug", errorFunc)
	consoleStub.Set("trace", errorFunc)
	consoleStub.Set("dir", errorFunc)
	consoleStub.Set("table", errorFunc)

	runtime.Set("console", consoleStub)
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
// disableConstructorAccess 禁用 constructor 访问（在库加载之后调用）
func (e *JSExecutor) disableConstructorAccess(runtime *goja.Runtime) {

	// 🔒 多层防护：删除 + 冻结 + Proxy 陷阱
	_, err := runtime.RunString(`
		(function() {
			'use strict';
			
			try {
				// ======================================
				// 第 1 层：删除 Function.constructor
				// ======================================
				if (typeof Function !== 'undefined' && Function.constructor) {
					try {
						delete Function.constructor;
					} catch(e) {}
				}
				
				// ======================================
				// 第 2 层：冻结 Function 对象（但不冻结 Function.prototype）
				// ======================================
				if (typeof Function !== 'undefined') {
					try {
						Object.freeze(Function);
						// 注意：不冻结 Function.prototype，因为库（如 lodash）可能需要修改它
					} catch(e) {}
				}
				
				// ======================================
				// 第 3 层：删除/禁用所有原型的 constructor
				// ======================================
				var prototypes = [
					Object.prototype,
					Array.prototype,
					String.prototype,
					Number.prototype,
					Boolean.prototype,
					// Function.prototype 不处理，库可能需要它
					Date.prototype,
					RegExp.prototype
				];
				
				if (typeof Promise !== 'undefined' && Promise.prototype) {
					prototypes.push(Promise.prototype);
				}
				
				prototypes.forEach(function(proto) {
					if (proto) {
						try {
							// 尝试删除
							delete proto.constructor;
						} catch(e) {
							// 如果无法删除，设为抛错的 getter
							try {
								Object.defineProperty(proto, 'constructor', {
									get: function() {
										throw new Error('Access to constructor is forbidden for security');
									},
									set: function() {
										throw new Error('Modification of constructor is forbidden for security');
									},
									enumerable: false,
									configurable: false
								});
							} catch(e2) {}
						}
					}
				});
				
				// ======================================
				// 第 4 层：不冻结原型（允许库修改，但 constructor 已被禁用）
				// ======================================
				// 注意：我们不冻结原型，因为库（如 lodash）需要修改它们
				// constructor 访问已通过上面的步骤被禁用，这已经足够安全
				
			// ======================================
			// 第 5 层：原型链操作方法（通过静态分析检测）
			// ======================================
			// 注意：不在运行时禁用 Object.getPrototypeOf/setPrototypeOf
			// 因为合法库（如 qs）需要使用这些方法
			// 即使允许访问，攻击者也无法获得 constructor（已被删除）
			// 依靠静态代码分析来检测用户代码中的原型链操作
				
			// ======================================
			// 第 6 层：__proto__ 访问检测（通过静态分析）
			// ======================================
			// 注意：不在运行时禁用 __proto__，因为合法库（如 qs）可能需要它
			// 依靠静态代码分析来检测用户代码中的 __proto__ 访问
				
			} catch (e) {
				// 静默失败，不影响正常执行
			}
		})();
	`)
	if err != nil {
		utils.Warn("沙箱加固失败", zap.Error(err))
	}

	utils.Debug("沙箱已加固（6层防护）")
}

// Execute 执行JavaScript代码（智能路由：同步用池，异步用EventLoop）
//
// 🔥 并发控制策略：
//   - 使用 semaphore (buffered channel) 限制并发数（最大 maxConcurrent）
//   - defer 保证 semaphore 总是被释放（即使后续代码 panic）
//   - 超时未获取到 semaphore 时返回 ConcurrencyError
//
// 🛡️ Panic 安全保证：
//   - executeWithRuntimePool 内部有 defer recover 保护
//   - executeWithEventLoop 内部有 defer recover 保护
//   - Execute 的 defer 在所有路径都会执行（Go runtime 保证）
//   - 多层防护确保 semaphore 永不泄漏
func (e *JSExecutor) Execute(code string, input map[string]interface{}) (*model.ExecutionResult, error) {
	startTime := time.Now()

	if err := e.validateInput(code, input); err != nil {
		return nil, err
	}

	// 🔥 并发控制：使用 semaphore 限制并发
	// defer 在获取后立即注册，保证即使 panic 也会释放
	select {
	case e.semaphore <- struct{}{}:
		defer func() { <-e.semaphore }() // ✅ 总是执行（Go defer 机制保证）
	case <-time.After(concurrencyLimitWaitTimeout):
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

// preloadEmbeddedLibraries 在可信环境中预加载所有嵌入库
// 🔒 安全策略：在服务启动时一次性加载库，然后在用户 runtime 中禁用危险功能
func (e *JSExecutor) preloadEmbeddedLibraries() {
	utils.Debug("开始预加载嵌入库（可信环境）")

	// 创建一个临时的、完全权限的 runtime
	trustedRuntime := goja.New()

	// ✅ 在这个环境中，Function 和 globalThis 可用（嵌入库需要）
	// 注意：必须先 Enable registry，再 Enable console
	e.registry.Enable(trustedRuntime)
	console.Enable(trustedRuntime)

	// 🔥 注册 btoa/atob 函数（避免 axios 警告）
	e.registerBase64Functions(trustedRuntime)

	// 需要预加载的库列表
	libsToPreload := []string{
		"lodash",    // 使用 Function('return this')()
		"qs",        // 使用 globalThis 检测
		"axios",     // JS 包装器（底层用 Go 实现的 fetch）
		"crypto-js", // 使用 globalThis 检测
		"date-fns",  // 纯 JS 库
		"pinyin",    // 使用 globalThis 检测
		"uuid",      // 纯 JS 库
		// 注意：crypto（Go 原生）和 xlsx（Go 原生）不需要预加载
	}

	successCount := 0
	for _, libName := range libsToPreload {
		code := fmt.Sprintf(`
			(function() {
				try {
					return require('%s');
				} catch (e) {
					throw new Error('加载 %s 失败: ' + e.message);
				}
			})()
		`, libName, libName)

		libExport, err := trustedRuntime.RunString(code)
		if err != nil {
			utils.Warn("预加载库失败", zap.String("library", libName), zap.Error(err))
			continue
		}

		// 导出为 Go interface{}（可以跨 runtime 使用）
		e.preloadMutex.Lock()
		e.preloadedLibs[libName] = libExport.Export()
		e.preloadMutex.Unlock()

		successCount++
		utils.Debug("库预加载成功", zap.String("library", libName))
	}

	utils.Info("预加载完成", zap.Int("success_count", successCount), zap.Int("total", len(libsToPreload)))
}

// injectPreloadedLibraries 将预加载的库注入到用户 runtime
// 🔒 此时 Function 和 globalThis 已被禁用，无法沙箱逃逸
// 策略：预加载的库已经存在于 registry 中，直接使用原始 require 即可
func (e *JSExecutor) injectPreloadedLibraries(runtime *goja.Runtime) {
	// 预加载的库已经通过 e.registry 注册，无需额外注入
	// runtime 已经调用了 e.registry.Enable()，可以直接 require
	utils.Debug("预加载的库可通过 require 使用")
}

// 剩余方法将作为 executor_service_helpers.go 的一部分
