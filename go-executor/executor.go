package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/buffer"
	"github.com/dop251/goja_nodejs/console"
	"github.com/dop251/goja_nodejs/eventloop"
	"github.com/dop251/goja_nodejs/process"
	"github.com/dop251/goja_nodejs/require"
	"github.com/dop251/goja_nodejs/url"
)

// JSExecutor Go+goja JavaScript执行器
type JSExecutor struct {
	// Runtime池
	runtimePool chan *goja.Runtime
	poolSize    int

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
	bufferEnhancer *BufferEnhancer
	cryptoEnhancer *CryptoEnhancer

	// 统计信息
	stats *ExecutorStats
	mutex sync.RWMutex

	// 关闭信号
	shutdown chan struct{}
	wg       sync.WaitGroup
}

// ExecutorStats 执行器统计信息
type ExecutorStats struct {
	TotalExecutions   int64            `json:"totalExecutions"`
	SuccessfulExecs   int64            `json:"successfulExecutions"`
	FailedExecs       int64            `json:"failedExecutions"`
	CurrentExecutions int64            `json:"currentExecutions"`
	SuccessRate       float64          `json:"successRate"`
	AvgExecutionTime  int64            `json:"avgExecutionTime"` // 毫秒
	TotalTime         int64            `json:"totalExecutionTime"`
	MemStats          runtime.MemStats `json:"memStats"`
}

// ExecutionError 自定义执行错误
type ExecutionError struct {
	Type    string
	Message string
}

func (e *ExecutionError) Error() string {
	return e.Message
}

// ExecutionResult 执行结果包装
type ExecutionResult struct {
	Result      interface{}
	ExecutionId string
}

// NewJSExecutor 创建新的JavaScript执行器
func NewJSExecutor() *JSExecutor {
	// 从环境变量读取配置，提供默认值
	poolSize := getEnvInt("RUNTIME_POOL_SIZE", 100)
	maxConcurrent := getEnvInt("MAX_CONCURRENT_EXECUTIONS", 1000)
	maxCodeLength := getEnvInt("MAX_CODE_LENGTH", 65535)           // 64KB
	maxInputSize := getEnvInt("MAX_INPUT_SIZE", 2*1024*1024)       // 2MB
	maxResultSize := getEnvInt("MAX_RESULT_SIZE", 5*1024*1024)     // 5MB
	executionTimeoutMs := getEnvInt("EXECUTION_TIMEOUT_MS", 10000) // 5秒

	executor := &JSExecutor{
		runtimePool:      make(chan *goja.Runtime, poolSize),
		poolSize:         poolSize,
		semaphore:        make(chan struct{}, maxConcurrent),
		maxConcurrent:    maxConcurrent,
		maxCodeLength:    maxCodeLength,
		maxInputSize:     maxInputSize,
		maxResultSize:    maxResultSize,
		executionTimeout: time.Duration(executionTimeoutMs) * time.Millisecond,
		registry:         new(require.Registry), // Node.js兼容性注册表
		bufferEnhancer:   NewBufferEnhancer(),   // Buffer增强器
		cryptoEnhancer:   NewCryptoEnhancer(),   // Crypto增强器
		stats:            &ExecutorStats{},
		shutdown:         make(chan struct{}),
	}

	// 注册crypto模块到require系统 - 分离的双模块支持
	executor.cryptoEnhancer.RegisterCryptoModule(executor.registry)   // require('crypto') - Go原生
	executor.cryptoEnhancer.RegisterCryptoJSModule(executor.registry) // require('crypto-js') - crypto-js库

	// 初始化Runtime池
	executor.initRuntimePool()

	log.Printf("✅ JavaScript执行器初始化完成:")
	log.Printf("   Runtime池大小: %d", poolSize)
	log.Printf("   最大并发数: %d", maxConcurrent)
	log.Printf("   代码长度限制: %d字节", maxCodeLength)
	log.Printf("   执行超时: %v", executor.executionTimeout)

	return executor
}

// initRuntimePool 初始化Runtime池
func (e *JSExecutor) initRuntimePool() {
	log.Printf("🚀 正在初始化%d个JavaScript Runtime...", e.poolSize)

	for i := 0; i < e.poolSize; i++ {
		runtime := goja.New()
		e.setupRuntime(runtime)
		e.runtimePool <- runtime
	}

	log.Printf("✅ Runtime池初始化完成，%d个Runtime就绪", e.poolSize)
}

// setupRuntime 设置Runtime环境
func (e *JSExecutor) setupRuntime(runtime *goja.Runtime) {
	// 设置严格模式
	runtime.Set("__strict__", true)

	// 启用Node.js兼容模块
	e.setupNodeJSModules(runtime)

	// 设置基础全局对象
	e.setupGlobalObjects(runtime)

	// 设置安全限制
	e.setupSecurityRestrictions(runtime)
}

// setupNodeJSModules 设置Node.js兼容模块
func (e *JSExecutor) setupNodeJSModules(runtime *goja.Runtime) {
	// 启用require系统
	e.registry.Enable(runtime)

	// 启用Buffer支持（全局可用）
	buffer.Enable(runtime)

	// 增强Buffer功能
	e.bufferEnhancer.EnhanceBufferSupport(runtime)

	// 设置crypto-js所需的基础环境（为随机数生成提供支持）
	// 注意：现在模块分离，这里仅提供环境支持，不混合加载
	e.cryptoEnhancer.SetupCryptoEnvironment(runtime)

	// 启用url支持
	url.Enable(runtime)

	// 启用process支持（受限版本）
	process.Enable(runtime)

	// 禁用一些危险的process功能
	if processObj := runtime.Get("process"); processObj != nil {
		if obj, ok := processObj.(*goja.Object); ok {
			// 禁用退出功能
			obj.Set("exit", goja.Undefined())
			obj.Set("abort", goja.Undefined())
			// 清空环境变量
			obj.Set("env", runtime.NewObject())
			// 禁用命令行参数
			obj.Set("argv", runtime.NewArray())
		}
	}
}

// setupGlobalObjects 设置基础全局对象
func (e *JSExecutor) setupGlobalObjects(runtime *goja.Runtime) {
	// Math对象
	runtime.Set("Math", runtime.Get("Math"))

	// JSON对象
	runtime.Set("JSON", runtime.Get("JSON"))

	// 基础类型转换函数
	runtime.Set("parseInt", runtime.Get("parseInt"))
	runtime.Set("parseFloat", runtime.Get("parseFloat"))
	runtime.Set("isNaN", runtime.Get("isNaN"))
	runtime.Set("isFinite", runtime.Get("isFinite"))

	// 编码函数
	runtime.Set("encodeURIComponent", runtime.Get("encodeURIComponent"))
	runtime.Set("decodeURIComponent", runtime.Get("decodeURIComponent"))
}

// setupSecurityRestrictions 设置安全限制
func (e *JSExecutor) setupSecurityRestrictions(runtime *goja.Runtime) {
	// 禁用危险的全局对象和函数
	runtime.Set("eval", goja.Undefined())
	runtime.Set("Function", goja.Undefined())

	// 注意: setTimeout/setInterval/setImmediate 由 EventLoop 安全地提供
	// 不在这里禁用，因为它们是异步功能的核心API

	// 禁用全局访问
	runtime.Set("global", goja.Undefined())
	runtime.Set("globalThis", goja.Undefined())
	runtime.Set("window", goja.Undefined())
	runtime.Set("self", goja.Undefined())

	// 禁用console输出（安全要求）
	// 注意: 在使用 EventLoop 时，console 会被 eventloop 包自动启用
	runtime.Set("console", map[string]interface{}{})
}

// Execute 执行JavaScript代码（统一处理同步和异步）
func (e *JSExecutor) Execute(code string, input map[string]interface{}) (*ExecutionResult, error) {
	startTime := time.Now()

	// 基础验证
	if err := e.validateInput(code, input); err != nil {
		return nil, err
	}

	// 并发控制
	select {
	case e.semaphore <- struct{}{}:
		defer func() { <-e.semaphore }()
	case <-time.After(10 * time.Second): // 10秒等待超时
		return nil, &ExecutionError{
			Type:    "ConcurrencyError",
			Message: "系统繁忙，请稍后重试",
		}
	}

	// 更新统计
	atomic.AddInt64(&e.currentExecs, 1)
	atomic.AddInt64(&e.stats.TotalExecutions, 1)
	defer atomic.AddInt64(&e.currentExecs, -1)

	// 使用 EventLoop 统一执行（自动处理同步/异步）
	result, err := e.executeWithEventLoop(code, input)
	executionTime := time.Since(startTime)

	// 更新统计
	e.updateStats(executionTime, err == nil)

	return result, err
}

// executeWithEventLoop 使用EventLoop执行代码（自动处理同步和异步）
func (e *JSExecutor) executeWithEventLoop(code string, input map[string]interface{}) (*ExecutionResult, error) {
	// 创建EventLoop并使用我们的require registry
	loop := eventloop.NewEventLoop(eventloop.WithRegistry(e.registry))
	defer loop.Stop()

	// 生成执行ID
	executionId := e.generateExecutionId()

	var finalResult interface{}
	var finalError error

	// 超时控制
	ctx, cancel := context.WithTimeout(context.Background(), e.executionTimeout)
	defer cancel()

	// 在goroutine中执行 loop.Run()（因为它会阻塞）
	done := make(chan struct{})
	go func() {
		defer close(done)

		// 在EventLoop中执行
		loop.Run(func(vm *goja.Runtime) {
			defer func() {
				if r := recover(); r != nil {
					finalError = &ExecutionError{
						Type:    "RuntimeError",
						Message: fmt.Sprintf("代码执行panic: %v", r),
					}
				}
			}()

			// 启用console（用于调试）
			console.Enable(vm)

			// 手动设置Node.js模块（因为EventLoop创建了新的runtime）
			e.registry.Enable(vm)
			buffer.Enable(vm)
			e.bufferEnhancer.EnhanceBufferSupport(vm)
			e.cryptoEnhancer.SetupCryptoEnvironment(vm) // 仅提供环境支持
			url.Enable(vm)
			process.Enable(vm)

			// 设置输入数据
			vm.Set("input", input)
			vm.Set("__executionId", executionId)
			vm.Set("__startTime", time.Now().UnixNano()/1e6)

			// 全局变量用于捕获异步结果
			vm.Set("__finalResult", goja.Undefined())
			vm.Set("__finalError", goja.Undefined())

			// 包装代码以处理Promise返回值
			wrappedCode := fmt.Sprintf(`
				(function() {
					'use strict';
					try {
						var userResult = (function() {
							%s
						})();

						// 检查是否返回Promise
						if (userResult && typeof userResult === 'object' && typeof userResult.then === 'function') {
							// 是Promise，注册回调
							userResult.then(function(value) {
								__finalResult = value;
							}).catch(function(error) {
								__finalError = error;
							});
							// 返回undefined，让EventLoop处理Promise
							return undefined;
						} else {
							// 不是Promise，直接保存结果
							__finalResult = userResult;
							return userResult;
						}
					} catch (error) {
						__finalError = error;
						throw new Error('代码执行错误: ' + error.message);
					}
				})()
			`, code)

			// 执行代码
			_, err := vm.RunString(wrappedCode)
			if err != nil {
				finalError = e.categorizeError(err)
				return
			}

			// loop.Run()返回时，所有异步任务已完成
			// 此时 __finalResult 或 __finalError 应该已被设置
		})

		// loop.Run()返回后，获取最终结果
		loop.Run(func(vm *goja.Runtime) {
			finalErr := vm.Get("__finalError")
			if !goja.IsUndefined(finalErr) {
				finalError = &ExecutionError{
					Type:    "RuntimeError",
					Message: fmt.Sprintf("%v", finalErr.Export()),
				}
				return
			}

			finalRes := vm.Get("__finalResult")
			if goja.IsUndefined(finalRes) {
				finalError = &ExecutionError{
					Type:    "ValidationError",
					Message: "代码没有返回有效结果，请检查是否有return语句",
				}
				return
			}

			finalResult = finalRes.Export()

			// 验证结果大小
			if err := e.validateResult(finalResult); err != nil {
				finalError = err
			}
		})
	}()

	// 等待执行完成或超时
	select {
	case <-done:
		if finalError != nil {
			return nil, finalError
		}
		return &ExecutionResult{
			Result:      finalResult,
			ExecutionId: executionId,
		}, nil
	case <-ctx.Done():
		loop.StopNoWait() // 停止EventLoop
		return nil, &ExecutionError{
			Type:    "TimeoutError",
			Message: fmt.Sprintf("代码执行超时 (%v)", e.executionTimeout),
		}
	}
}

// executeWithTimeout 带超时的代码执行（已废弃，保留用于向后兼容）
func (e *JSExecutor) executeWithTimeout(runtime *goja.Runtime, code string, input map[string]interface{}) (*ExecutionResult, error) {
	// 创建执行上下文
	ctx, cancel := context.WithTimeout(context.Background(), e.executionTimeout)
	defer cancel()

	// 设置输入数据
	runtime.Set("input", input)

	// 添加执行ID和时间戳
	executionId := e.generateExecutionId()
	runtime.Set("__executionId", executionId)
	runtime.Set("__startTime", time.Now().UnixNano()/1e6)

	// 包装代码以捕获返回值
	wrappedCode := fmt.Sprintf(`
		(function() {
			'use strict';
			try {
				%s
			} catch (error) {
				throw new Error('代码执行错误: ' + error.message);
			}
		})()
	`, code)

	// 在goroutine中执行，支持超时控制
	resultChan := make(chan *ExecutionResult, 1)
	errorChan := make(chan error, 1)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				errorChan <- &ExecutionError{
					Type:    "RuntimeError",
					Message: fmt.Sprintf("代码执行panic: %v", r),
				}
			}
		}()

		// 执行代码
		value, err := runtime.RunString(wrappedCode)
		if err != nil {
			errorChan <- e.categorizeError(err)
			return
		}

		// 导出结果
		result := value.Export()
		if result == nil {
			errorChan <- &ExecutionError{
				Type:    "ValidationError",
				Message: "代码没有返回有效结果，请检查是否有return语句",
			}
			return
		}

		// 验证结果大小
		if err := e.validateResult(result); err != nil {
			errorChan <- err
			return
		}

		// 创建执行结果包装
		executionResult := &ExecutionResult{
			Result:      result,
			ExecutionId: executionId,
		}
		resultChan <- executionResult
	}()

	// 等待结果或超时
	select {
	case result := <-resultChan:
		return result, nil
	case err := <-errorChan:
		return nil, err
	case <-ctx.Done():
		return nil, &ExecutionError{
			Type:    "TimeoutError",
			Message: fmt.Sprintf("代码执行超时 (%v)", e.executionTimeout),
		}
	}
}

// validateInput 验证输入参数
func (e *JSExecutor) validateInput(code string, input map[string]interface{}) error {
	// 验证代码长度
	if len(code) > e.maxCodeLength {
		return &ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("代码长度超过限制: %d > %d字节", len(code), e.maxCodeLength),
		}
	}

	// 验证代码内容
	if err := e.validateCodeSecurity(code); err != nil {
		return err
	}

	// 验证输入大小（简单JSON序列化估算）
	if inputSize := len(fmt.Sprintf("%v", input)); inputSize > e.maxInputSize {
		return &ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("输入数据过大: %d > %d字节", inputSize, e.maxInputSize),
		}
	}

	return nil
}

// validateCodeSecurity 验证代码安全性
func (e *JSExecutor) validateCodeSecurity(code string) error {
	// 1. 检测不支持的 async/await 语法
	asyncAwaitPatterns := []struct {
		pattern string
		keyword string
	}{
		{"async function", "async函数声明"},
		{"async(", "async箭头函数"},
		{"async (", "async箭头函数"},
		{"async\t", "async关键字"},
		{"async\n", "async关键字"},
		{") async ", "async方法"},
		{"await ", "await关键字"},
		{"await\t", "await关键字"},
		{"await\n", "await关键字"},
		{"await(", "await表达式"},
	}

	for _, p := range asyncAwaitPatterns {
		if strings.Contains(code, p.pattern) {
			return &ExecutionError{
				Type: "SyntaxNotSupported",
				Message: fmt.Sprintf(
					"检测到%s，goja引擎不支持async/await语法。\n\n"+
						"✅ 请使用Promise替代:\n\n"+
						"// ❌ 不支持\n"+
						"async function getData() {\n"+
						"  const result = await fetchAPI();\n"+
						"  return result;\n"+
						"}\n\n"+
						"// ✅ 请这样写\n"+
						"function getData() {\n"+
						"  return new Promise((resolve) => {\n"+
						"    setTimeout(() => {\n"+
						"      resolve({ data: 'result' });\n"+
						"    }, 1000);\n"+
						"  }).then(result => {\n"+
						"    return result;\n"+
						"  });\n"+
						"}",
					p.keyword,
				),
			}
		}
	}

	// 2. 检测被禁用的模块引用
	prohibitedModules := []struct {
		pattern string
		module  string
		reason  string
	}{
		{"require('fs')", "fs", "文件系统操作"},
		{"require(\"fs\")", "fs", "文件系统操作"},
		{"require('path')", "path", "路径操作"},
		{"require(\"path\")", "path", "路径操作"},
		{"require('child_process')", "child_process", "子进程执行"},
		{"require(\"child_process\")", "child_process", "子进程执行"},
		{"require('os')", "os", "操作系统接口"},
		{"require(\"os\")", "os", "操作系统接口"},
	}

	for _, mod := range prohibitedModules {
		if strings.Contains(code, mod.pattern) {
			return &ExecutionError{
				Type:    "SecurityError",
				Message: fmt.Sprintf("禁止使用 %s 模块：%s出于安全考虑已被禁用", mod.module, mod.reason),
			}
		}
	}

	// 3. 检测真正危险的代码模式
	dangerousPatterns := []string{
		"eval(",
		"Function(",
		"__proto__",
		"constructor.constructor",
	}

	for _, pattern := range dangerousPatterns {
		if strings.Contains(code, pattern) {
			return &ExecutionError{
				Type:    "SecurityError",
				Message: fmt.Sprintf("代码包含危险模式: %s", pattern),
			}
		}
	}

	// 4. 检测可能的死循环
	if strings.Contains(code, "while(true)") ||
		strings.Contains(code, "for(;;)") ||
		strings.Contains(code, "while (true)") ||
		strings.Contains(code, "for (;;)") {
		return &ExecutionError{
			Type:    "SecurityError",
			Message: "代码可能包含无限循环，已被阻止执行",
		}
	}

	return nil
}

// validateResult 验证执行结果
func (e *JSExecutor) validateResult(result interface{}) error {
	// 简单的结果大小检查（JSON序列化估算）
	if resultSize := len(fmt.Sprintf("%v", result)); resultSize > e.maxResultSize {
		return &ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("返回结果过大: %d > %d字节", resultSize, e.maxResultSize),
		}
	}

	return nil
}

// categorizeError 错误分类
func (e *JSExecutor) categorizeError(err error) error {
	if err == nil {
		return nil
	}

	message := err.Error()

	// 语法错误
	if strings.Contains(message, "SyntaxError") || strings.Contains(message, "Unexpected") {
		return &ExecutionError{
			Type:    "SyntaxError",
			Message: fmt.Sprintf("语法错误: %s", message),
		}
	}

	// 引用错误 - 通用的未定义变量处理
	if strings.Contains(message, "is not defined") {
		// 提取变量名
		parts := strings.Split(message, " ")
		if len(parts) > 0 {
			varName := strings.Trim(parts[0], "'\"")

			// 根据常见的变量名提供具体建议
			suggestions := getModuleSuggestions(varName)
			if suggestions != "" {
				return &ExecutionError{
					Type:    "ReferenceError",
					Message: fmt.Sprintf("变量 '%s' 未定义。%s", varName, suggestions),
				}
			}

			return &ExecutionError{
				Type:    "ReferenceError",
				Message: fmt.Sprintf("变量 '%s' 未定义。请检查是否需要引入相关模块或定义该变量。", varName),
			}
		}
		return &ExecutionError{
			Type:    "ReferenceError",
			Message: fmt.Sprintf("引用错误: %s", message),
		}
	}

	if strings.Contains(message, "is not a function") || strings.Contains(message, "Cannot read property") {
		return &ExecutionError{
			Type:    "TypeError",
			Message: fmt.Sprintf("类型错误: %s", message),
		}
	}

	// 默认运行时错误
	return &ExecutionError{
		Type:    "RuntimeError",
		Message: fmt.Sprintf("运行时错误: %s", message),
	}
}

// getModuleSuggestions 根据变量名提供模块引入建议
func getModuleSuggestions(varName string) string {
	switch strings.ToLower(varName) {
	case "cryptojs":
		return "建议使用：const CryptoJS = require('crypto-js');"
	case "crypto":
		return "建议使用：const crypto = require('crypto');"
	case "buffer":
		return "Buffer 是全局可用的，无需引入。"
	case "fs":
		return "文件系统模块未启用，出于安全考虑已被禁用。"
	case "path":
		return "路径模块未启用，出于安全考虑已被禁用。请使用字符串操作。"
	case "os":
		return "操作系统模块未启用，出于安全考虑已被禁用。"
	case "child_process":
		return "子进程模块未启用，出于安全考虑已被禁用。"
	case "net", "dgram":
		return "网络模块未启用，出于安全考虑已被禁用。"
	case "url":
		return "URL模块可用。请使用：const url = require('url');"
	case "process":
		return "Process模块可用（受限版本）。请直接使用 process 全局对象。"
	case "console":
		return "Console对象已被禁用。请使用 return 语句返回结果。"
	case "require":
		return "require函数可用。请检查模块名称是否正确。"
	default:
		// 检查是否是常见的第三方库
		if strings.Contains(varName, "js") || strings.Contains(varName, "lib") {
			return "该库可能未安装。请检查是否需要通过 require() 引入。"
		}
		return ""
	}
}

// updateStats 更新统计信息
func (e *JSExecutor) updateStats(executionTime time.Duration, success bool) {
	e.mutex.Lock()
	defer e.mutex.Unlock()

	if success {
		atomic.AddInt64(&e.stats.SuccessfulExecs, 1)
	} else {
		atomic.AddInt64(&e.stats.FailedExecs, 1)
	}

	// 更新平均执行时间
	totalExecs := atomic.LoadInt64(&e.stats.TotalExecutions)
	if totalExecs > 0 {
		e.stats.TotalTime += executionTime.Milliseconds()
		e.stats.AvgExecutionTime = e.stats.TotalTime / totalExecs
	}

	// 计算成功率
	successful := atomic.LoadInt64(&e.stats.SuccessfulExecs)
	if totalExecs > 0 {
		e.stats.SuccessRate = float64(successful) / float64(totalExecs) * 100
	}
}

// GetStats 获取统计信息
func (e *JSExecutor) GetStats() *ExecutorStats {
	e.mutex.RLock()
	defer e.mutex.RUnlock()

	// 更新内存统计
	runtime.ReadMemStats(&e.stats.MemStats)

	// 更新当前执行数
	e.stats.CurrentExecutions = atomic.LoadInt64(&e.currentExecs)

	// 创建副本返回
	stats := *e.stats
	return &stats
}

// generateExecutionId 生成执行ID
func (e *JSExecutor) generateExecutionId() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// Shutdown 优雅关闭执行器
func (e *JSExecutor) Shutdown() {
	log.Println("🛑 正在关闭JavaScript执行器...")

	close(e.shutdown)
	e.wg.Wait()

	// 清空Runtime池
	close(e.runtimePool)
	for runtime := range e.runtimePool {
		_ = runtime // runtime会被GC回收
	}

	log.Println("✅ JavaScript执行器已关闭")
}
