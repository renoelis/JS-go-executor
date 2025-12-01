package service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	goruntime "runtime"
	"strconv"
	"strings"
	"sync/atomic"
	"time"

	"flow-codeblock-go/enhance_modules/fetch"
	"flow-codeblock-go/model"
	"flow-codeblock-go/utils"

	"github.com/cespare/xxhash/v2"
	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/buffer"
	"github.com/dop251/goja_nodejs/console"
	"github.com/dop251/goja_nodejs/eventloop"
	"github.com/dop251/goja_nodejs/process"
	"github.com/dop251/goja_nodejs/url"
	jsoniter "github.com/json-iterator/go"
	"go.uber.org/zap"
	"golang.org/x/text/unicode/norm"
)

// 🔥 预定义空格字符串（用于批量写入优化）
const (
	spaces32  = "                                "                                                                                                 // 32 个空格
	spaces128 = "                                                                                                                                " // 128 个空格
)

// 🔥 预编译正则表达式（用于错误行号调整）
// 预编译避免每次错误时重复编译，提升性能
var (
	// 错误消息中的行号模式
	linePatternLine  = regexp.MustCompile(`(?i)\bLine\s+(\d+):`)
	linePatternline  = regexp.MustCompile(`(?i)\bline\s+(\d+):`)
	linePatternColon = regexp.MustCompile(`:(\d+):`)

	// Stack trace 中的行号模式
	stackPatternFull   = regexp.MustCompile(`(user_code\.js|<anonymous>):(\d+):(\d+)`)
	stackPatternSimple = regexp.MustCompile(`(user_code\.js|<anonymous>):(\d+)(\)|$|\s)`)
)

// 🔥 健康检查和池管理常量
// ✅ 已全部移至配置文件，支持环境变量控制：
//   - minErrorCountForCheck          → cfg.Executor.MinErrorCountForCheck
//   - maxErrorRateThreshold          → cfg.Executor.MaxErrorRateThreshold
//   - minExecutionCountForStats      → cfg.Executor.MinExecutionCountForStats
//   - longRunningThreshold           → time.Duration(cfg.Executor.LongRunningThresholdMinutes) * time.Minute
//   - poolExpansionThresholdPercent  → cfg.Executor.PoolExpansionThresholdPercent
//   - healthCheckInterval            → time.Duration(cfg.Executor.HealthCheckIntervalSeconds) * time.Second
//   - runtimePoolAcquireTimeout      → cfg.Executor.RuntimePoolAcquireTimeout
//   - concurrencyLimitWaitTimeout    → cfg.Executor.ConcurrencyWaitTimeout

// ============================================================================
// 🔥 安全检查常量定义
// ============================================================================

// prohibitedModuleCheck 被禁用的模块定义
type prohibitedModuleCheck struct {
	pattern string
	module  string
	reason  string
}

// dangerousPatternCheck 危险代码模式定义
type dangerousPatternCheck struct {
	pattern string
	reason  string
}

// dangerousRegexCheck 危险正则模式定义
type dangerousRegexCheck struct {
	pattern *regexp.Regexp
	reason  string
}

var (
	// 被禁用的模块列表
	prohibitedModules = []prohibitedModuleCheck{
		{"require('fs')", "fs", "文件系统操作"},
		{"require(\"fs\")", "fs", "文件系统操作"},
		{"require('path')", "path", "路径操作"},
		{"require(\"path\")", "path", "路径操作"},
		{"require('child_process')", "child_process", "子进程执行"},
		{"require(\"child_process\")", "child_process", "子进程执行"},
		{"require('os')", "os", "操作系统接口"},
		{"require(\"os\")", "os", "操作系统接口"},
	}

	// 🔥 增强的危险代码模式检测（40+ 种模式 + 空格变体）
	dangerousPatterns = []dangerousPatternCheck{
		// Function 构造器（各种访问方式 + 空格变体）
		{"Function(", "Function构造器可执行任意代码"},
		{"Function (", "Function构造器可执行任意代码"},
		{"Function  (", "Function构造器可执行任意代码"},
		{"Function.(", "Function方法访问被禁止"},
		{"Function[", "Function索引访问被禁止"},
		{"new Function(", "Function构造器被禁止"},
		{"new Function (", "Function构造器被禁止"},

		// 构造器访问（原型链攻击 + 空格变体）
		{".constructor(", "构造器调用可能导致代码注入"},
		{".constructor (", "构造器调用可能导致代码注入"},
		{".constructor.(", "构造器方法访问被禁止"},
		{".constructor[", "构造器索引访问被禁止"},
		{".constructor.constructor", "构造器链访问可能导致代码注入"},

		// 动态构造器访问
		{"['constructor']", "动态访问构造器被禁止"},
		{"[\"constructor\"]", "动态访问构造器被禁止"},
		{"[`constructor`]", "动态访问构造器被禁止"},
		{"[ 'constructor']", "动态访问构造器被禁止"},
		{"[ \"constructor\"]", "动态访问构造器被禁止"},

		// 原型链访问
		{".__proto__", "原型链操作可能导致安全问题"},
		{"['__proto__']", "原型链操作可能导致安全问题"},
		{"[\"__proto__\"]", "原型链操作可能导致安全问题"},
		{"[`__proto__`]", "原型链操作可能导致安全问题"},

		// 原型操作方法
		{"Object.getPrototypeOf", "原型获取操作被禁止"},
		{"Object.setPrototypeOf", "原型设置操作被禁止"},
		{"Reflect.getPrototypeOf", "原型获取操作被禁止"},
		{"Reflect.setPrototypeOf", "原型设置操作被禁止"},
		{"Object.create", "Object.create可能导致原型污染"},

		// 🔥 新增: Reflect 和 Proxy 危险方法
		{"Reflect.construct", "Reflect.construct 可能导致代码注入"},
		{"Reflect.apply", "Reflect.apply 可能导致代码注入"},
		{"new Proxy", "Proxy 可能绕过安全限制"},
		{"Proxy(", "Proxy 可能绕过安全限制"},
		{"Proxy (", "Proxy 可能绕过安全限制"},

		// eval 相关（+ 空格变体）
		{"eval(", "eval函数可执行任意代码"},
		{"eval (", "eval函数可执行任意代码"},
		{"eval  (", "eval函数可执行任意代码"},
		{"eval.(", "eval方法访问被禁止"},
		{"eval[", "eval索引访问被禁止"},

		// 全局对象访问
		{"global.", "global对象访问被禁止"},
		{"global[", "global对象访问被禁止"},
		{"globalThis.", "globalThis对象访问被禁止"},
		{"globalThis[", "globalThis对象访问被禁止"},
		{"window.", "window对象访问被禁止"},
		{"window[", "window对象访问被禁止"},
		{"self.", "self对象访问被禁止"},
		{"self[", "self对象访问被禁止"},

		// 动态导入（+ 空格变体）
		{"import(", "动态import被禁止"},
		{"import (", "动态import被禁止"},
	}

	// 🔥 正则表达式检测复杂模式（支持空格、换行、复杂变体）
	// 🔥 安全优化：使用 \s? 代替 \s{0,3}，防止 ReDoS 回溯攻击
	//    - \s?  : 匹配 0-1 个空格，零回溯风险，性能最优
	//    - \s{0,3}: 匹配 0-3 个空格，多个量词可能导致指数级回溯
	dangerousRegexes = []dangerousRegexCheck{
		// eval 相关（防止 ReDoS）
		{
			regexp.MustCompile(`\beval\s?\(`),
			"检测到 eval 调用",
		},

		// Function 构造器（防止 ReDoS）
		{
			regexp.MustCompile(`\bFunction\s?\(`),
			"检测到 Function 构造器",
		},
		{
			regexp.MustCompile(`new\s+Function\s?\(`),
			"检测到 new Function",
		},

		// 构造器链式访问（防止 ReDoS）
		{
			regexp.MustCompile(`\.\s?constructor\s?[\.\[\(]`),
			"检测到构造器链式访问",
		},

		// 动态构造器访问（防止 ReDoS）
		{
			regexp.MustCompile(`\[\s?['"\x60]constructor['"\x60]\s?\]`),
			"检测到动态访问构造器",
		},

		// 原型链访问（防止 ReDoS）
		{
			regexp.MustCompile(`\.\s?__proto__\s?`),
			"检测到原型链访问",
		},
		{
			regexp.MustCompile(`\[\s?['"\x60]__proto__['"\x60]\s?\]`),
			"检测到动态原型链访问",
		},
	}

	// 🔥 第 3 层：精确检测危险的动态属性访问
	// 🔥 安全优化：使用 \s? 代替 \s{0,3}，防止 ReDoS 回溯攻击
	//    每个正则有 3-4 个量词，\s{0,3} 可能导致 O(3^4) = 81 种回溯组合
	dangerousDynamicAccessPatterns = []dangerousRegexCheck{
		// 检测 this["eval"], this["Function"], this["constructor"]
		{
			regexp.MustCompile(`\bthis\s?\[\s?['"\x60](eval|Function|constructor)['"\x60]\s?\]`),
			"检测到危险的 this 动态属性访问",
		},
		// 检测 globalThis["eval"], globalThis["Function"], globalThis["constructor"]
		{
			regexp.MustCompile(`\bglobalThis\s?\[\s?['"\x60](eval|Function|constructor)['"\x60]\s?\]`),
			"检测到危险的 globalThis 动态属性访问",
		},
		// 检测 self["eval"], self["Function"], self["constructor"]
		{
			regexp.MustCompile(`\bself\s?\[\s?['"\x60](eval|Function|constructor)['"\x60]\s?\]`),
			"检测到危险的 self 动态属性访问",
		},
		// 检测 window["eval"], window["Function"], window["constructor"]
		{
			regexp.MustCompile(`\bwindow\s?\[\s?['"\x60](eval|Function|constructor)['"\x60]\s?\]`),
			"检测到危险的 window 动态属性访问",
		},
	}

	// 🔥 第 4 层：启发式检测字符串拼接（常见绕过手法）
	// 🔥 ReDoS 防御（关键）：
	//    1. 使用 \s? 代替 \s{0,3}：防止空格回溯
	//    2. 使用 \w{1,50} 代替 \w+：防止正则回溯攻击（ReDoS）
	suspiciousStringPatterns = []dangerousRegexCheck{
		// 检测可疑的字符串变量赋值：const e = "eval"
		// 🔥 \w{1,50}：限制变量名长度，防止 ReDoS
		{
			regexp.MustCompile(`(?:const|let|var)\s+\w{1,50}\s?=\s?['"\x60](eval|Function|constructor|__proto__)['"\x60]`),
			"检测到可疑的字符串变量（可能用于绕过检测）",
		},
		// 检测字符串拼接后的索引访问：this[x + y]
		// 🔥 \w{1,50}：限制变量名长度，防止 ReDoS
		{
			regexp.MustCompile(`(?:this|globalThis|self|window)\s?\[\s?\w{1,50}\s?\+\s?\w{1,50}\s?\]`),
			"检测到可疑的字符串拼接访问",
		},
		// 检测字符串字面量拼接：this["ev" + "al"]
		// 🔥 \w{1,30}：字符串内容通常更短（如 "eval" = 4 字符）
		{
			regexp.MustCompile(`(?:this|globalThis|self|window)\s?\[\s?['"\x60]\w{1,30}['"\x60]\s?\+\s?['"\x60]\w{1,30}['"\x60]\s?\]`),
			"检测到字符串字面量拼接访问",
		},
		// 检测 join 方法用于拼接：["e","val"].join("")
		// 🔥 安全优化：使用 \s? 代替 \s{0,3}，防止 ReDoS 回溯攻击
		//    - \s?  : 匹配 0-1 个空格，零回溯风险
		//    - \s{0,3}: 匹配 0-3 个空格，7个量词可能导致 O(3^7) 回溯
		{
			regexp.MustCompile(`\[\s?['"\x60][a-zA-Z]['"\x60]\s?,\s?['"\x60][a-zA-Z]+['"\x60]\s?\]\s?\.\s?join\s?\(`),
			"检测到使用 join 拼接字符串（可能绕过检测）",
		},
	}
)

// executeWithRuntimePool 使用Runtime池执行代码（同步代码，高性能）
//
// 🔥 Context 使用说明：
//   - 接受来自上层的 context，而不是使用 context.Background()
//   - 在获取 Runtime 时监听 context 取消信号
//   - 支持客户端断开连接时立即中断
func (e *JSExecutor) executeWithRuntimePool(ctx context.Context, code string, input map[string]interface{}) (*model.ExecutionResult, error) {
	var runtime *goja.Runtime
	var isTemporary bool

	// 🔥 新增：在获取 Runtime 时监听 context 取消
	select {
	case runtime = <-e.runtimePool:
		isTemporary = false

		// 🔥 阶段 3 优化：升级到 atomic.Int64 类型（Go 1.19+）✅
		//    - 使用 atomic.Int64 提供编译时类型安全
		//    - 代码更简洁：health.field.Add(1) vs atomic.AddInt64(&health.field, 1)
		//    - 性能相同，但类型更安全
		e.healthMutex.RLock() // ✅ 写锁 → 读锁（关键优化）
		if health, exists := e.runtimeHealth[runtime]; exists {
			health.lastUsedAtNano.Store(time.Now().UnixNano()) // ✅ atomic.Int64.Store()
			health.executionCount.Add(1)                       // ✅ atomic.Int64.Add()
		}
		e.healthMutex.RUnlock()

		// 🔥 从池中获取的 Runtime 归还策略（方案D：限次重用 + 主动GC）
		//
		// 设计原理：
		//   1. 检查Runtime重用次数，达到上限则销毁（防止内存累积）
		//   2. 未达上限则清理后归还池
		//   3. 池满时丢弃Runtime（自然收缩）
		//   4. 定期主动触发GC，加速内存回收
		defer func() {
			// 🔥 方案D：检查重用次数
			var shouldDestroy bool
			var reuseCount int64

			e.healthMutex.RLock()
			if health, exists := e.runtimeHealth[runtime]; exists {
				reuseCount = health.executionCount.Load()
			}
			e.healthMutex.RUnlock()

			// 🔥 关键判断：达到重用上限 → 销毁Runtime
			if reuseCount >= e.maxRuntimeReuseCount {
				shouldDestroy = true

				utils.Debug("Runtime达到重用上限，销毁",
					zap.Int64("reuse_count", reuseCount),
					zap.Int64("max_reuse_count", e.maxRuntimeReuseCount))
			}

			if shouldDestroy {
				// 清理健康信息
				e.healthMutex.Lock()
				delete(e.runtimeHealth, runtime)
				e.healthMutex.Unlock()

				// 移除 fetch 关联的 runtime prototype 映射，防止泄漏
				fetch.ClearRuntimePrototypes(runtime)

				// 🔥 P1.2: Runtime 销毁时清理 Fetch 连接池，防止空闲连接累积
				if fetchModule, ok := e.moduleRegistry.GetModule("fetch"); ok {
					if fe, ok := fetchModule.(*fetch.FetchEnhancer); ok && fe != nil {
						fe.CleanupIdleConnections()
					}
				}

				// 更新计数
				atomic.AddInt32(&e.currentPoolSize, -1)

				// 📊 统计（用于监控）
				atomic.AddInt64(&e.stats.RuntimeDestroyCount, 1)

				// 🔥 主动触发GC（使用节流器，可配置触发频率）
				// 高频销毁场景优化：通过 GC_TRIGGER_INTERVAL 环境变量控制GC频率
				// 默认：每15次销毁触发1次GC（平衡CPU和内存）
				// 高并发场景：可调整为20-30（降低CPU开销）
				// 低内存场景：可调整为5-10（加速内存回收）
				// 🛡️ GC 节流器确保最多只有 1 个 GC 并发运行，防止 GC 风暴
				if atomic.LoadInt64(&e.stats.RuntimeDestroyCount)%e.gcTriggerInterval == 0 {
					e.gcThrottler.triggerGC()
				}

				// 🔥 实时补充：销毁1个，立即补充1个（保持池大小恒定）
				// 优势：池永不枯竭，性能最稳定
				go e.replenishOneRuntime()

				// 不归还池，让GC回收
				return
			}

			// 未达上限：清理后归还
			e.cleanupRuntime(runtime)

			// 🔥 定期清理 Fetch 模块的 HTTP 连接池，防止空闲连接长期占用内存
			if fetchModule, ok := e.moduleRegistry.GetModule("fetch"); ok {
				if fe, ok := fetchModule.(*fetch.FetchEnhancer); ok && fe != nil {
					// 约每 100 次重用触发一次清理（按单个 Runtime 的执行次数粗略采样）
					if reuseCount > 0 && reuseCount%100 == 0 {
						fe.CleanupIdleConnections()
					}
				}
			}
			select {
			case e.runtimePool <- runtime:
				// ✅ 成功归还到池
			default:
				// 🔥 池满，丢弃Runtime（自然收缩）
				atomic.AddInt32(&e.currentPoolSize, -1)

				// runtime 不再使用，清理 fetch prototype 映射
				fetch.ClearRuntimePrototypes(runtime)

				// 清理健康信息（防止内存泄漏）
				e.healthMutex.Lock()
				delete(e.runtimeHealth, runtime)
				e.healthMutex.Unlock()

				utils.Warn("运行时池已满，丢弃运行时（自然收缩）",
					zap.Int32("current_pool_size", atomic.LoadInt32(&e.currentPoolSize)))
			}
		}()

	case <-ctx.Done():
		// 🔥 请求已取消（客户端断开连接）
		return nil, &model.ExecutionError{
			Type:    "CancelledError",
			Message: "请求已取消",
		}

	case <-time.After(e.runtimePoolAcquireTimeout):
		utils.Warn("运行时池超时，创建临时运行时", zap.Duration("timeout", e.runtimePoolAcquireTimeout))
		runtime = goja.New()
		if err := e.setupRuntime(runtime); err != nil {
			utils.Error("创建临时运行时失败", zap.Error(err))
			// 🔒 资源管理说明：
			//   - goja.Runtime 是纯 Go 托管对象（无 C 资源、无文件描述符、无 socket）
			//   - setupRuntime() 只设置回调函数和引用，不创建需要显式清理的资源
			//   - 函数返回后，runtime 变量离开作用域，GC 会自动回收
			//   - 无需 runtime = nil（无实际效果），无需 defer cleanup（没有 Close() 方法）
			return nil, fmt.Errorf("failed to create temporary runtime: %w", err)
		}
		isTemporary = true

		// 🔥 v2.4.3 新增：临时 Runtime 的归还策略（与池 Runtime 不同）
		//
		// 设计原理：
		//   1. 临时 Runtime 创建时未计入 currentPoolSize
		//   2. 如果成功放入池中，需要增加 currentPoolSize
		//   3. 如果池满被丢弃，无需修正计数（从未计入）
		defer func() {
			e.cleanupRuntime(runtime)
			select {
			case e.runtimePool <- runtime:
				// 🔥 v2.4.3 修复：临时 Runtime 成功放入池中，需要增加计数
				atomic.AddInt32(&e.currentPoolSize, 1)
				utils.Debug("临时运行时已放入池中",
					zap.Int32("current_pool_size", atomic.LoadInt32(&e.currentPoolSize)))
			default:
				// ✅ 池满，丢弃临时 Runtime
				// 临时 Runtime 从未计入 currentPoolSize，丢弃时无需修正
				utils.Debug("临时运行时使用后丢弃（池已满）")
				fetch.ClearRuntimePrototypes(runtime)
			}
		}()
	}

	// 🔥 从 Context 中获取 requestID 作为 executionId（复用 requestID）
	var executionId string
	if reqID := ctx.Value(utils.RequestIDKey); reqID != nil {
		if reqIDStr, ok := reqID.(string); ok && reqIDStr != "" {
			// 使用 requestID 作为 executionId
			executionId = reqIDStr
		} else {
			// requestID 类型不对或为空，生成一个
			executionId = e.generateExecutionId()
		}
	} else {
		// 如果没有 requestID（非 HTTP 请求场景），生成一个
		executionId = e.generateExecutionId()
	}

	// 🔥 使用传入的 context，而不是 context.Background()
	execCtx, cancel := context.WithTimeout(ctx, e.executionTimeout)
	defer cancel()

	runtime.Set("input", input)
	runtime.Set("__executionId", executionId)
	runtime.Set("__startTime", time.Now().UnixNano()/1e6)

	// 🔥 预处理用户代码：移除 Shebang（#!/usr/bin/env node）
	// Goja 不会自动忽略 Shebang，需要手动移除以避免语法错误
	processedCode := code
	if strings.HasPrefix(code, "#!") {
		// 移除第一行（Shebang 行）
		if idx := strings.Index(code, "\n"); idx != -1 {
			processedCode = code[idx+1:]
		} else {
			// 整个文件只有 Shebang 一行，移除后变为空
			processedCode = ""
		}
	}

	// 包装用户代码：启用严格模式、隔离作用域、统一错误处理
	wrappedCode := fmt.Sprintf(`
		(function() {
			'use strict';
			try {
				%s
			} catch (error) {
				throw new Error('代码执行错误: ' + (error.message || error));
			}
		})()
	`, processedCode)

	program, err := e.getCompiledCode(wrappedCode)
	if err != nil {
		// 🔥 使用 categorizeError 处理编译错误，并调整行号
		categorizedErr := e.categorizeError(err)
		adjustedErr := adjustErrorLineNumber(categorizedErr, 4) // Runtime Pool 包装增加了 4 行
		return nil, adjustedErr
	}

	resultChan := make(chan *model.ExecutionResult, 1)
	errorChan := make(chan error, 1)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				// 🔥 获取完整的堆栈信息
				buf := make([]byte, 8192)
				stackSize := goruntime.Stack(buf, false)
				stackTrace := string(buf[:stackSize])

				// 记录详细的panic信息
				utils.Error("捕获到panic",
					zap.Any("panic_value", r),
					zap.String("stack_trace", stackTrace))

				errorChan <- &model.ExecutionError{
					Type:    "RuntimeError",
					Message: fmt.Sprintf("代码执行panic: %v", r),
					Stack:   stackTrace,
				}
			}
		}()

		value, err := runtime.RunProgram(program)
		if err != nil {
			// 🔥 使用 categorizeError 处理运行时错误，并调整行号
			categorizedErr := e.categorizeError(err)
			adjustedErr := adjustErrorLineNumber(categorizedErr, 4) // Runtime Pool 包装增加了 4 行
			errorChan <- adjustedErr
			return
		}

		if goja.IsUndefined(value) {
			errorChan <- &model.ExecutionError{
				Type:    "ValidationError",
				Message: "返回值不能是 undefined",
			}
			return
		}

		// 🔥 使用带大小限制的导出（边导出边检查，超限立即中断，最早保护内存）
		result, err := utils.ExportWithOrderAndLimit(value, e.maxResultSize)
		if err != nil {
			// 导出阶段超限（最早拦截点）
			errorChan <- &model.ExecutionError{
				Type:    "ValidationError",
				Message: fmt.Sprintf("返回数据过大: %v", err),
			}
			return
		}

		// 🔥 转换所有 time.Time 对象为 UTC ISO 字符串（在验证前转换）
		// 修复 date-fns 时区问题：确保返回 UTC 时间（Z）
		result = convertTimesToUTC(result)

		// 🔥 验证结果并获取预序列化的 JSON（避免重复序列化）
		jsonData, err := e.validateResult(result)
		if err != nil {
			errorChan <- err
			return
		}

		executionResult := &model.ExecutionResult{
			Result:    result,
			RequestID: executionId, // 🔄 改名：ExecutionId → RequestID
			JSONData:  jsonData,    // 🔥 保存预序列化的 JSON
		}
		resultChan <- executionResult
	}()

	select {
	case result := <-resultChan:
		return result, nil
	case err := <-errorChan:
		if !isTemporary {
			// 🔥 优化：使用 atomic 操作 + 读锁
			e.healthMutex.RLock()
			if health, exists := e.runtimeHealth[runtime]; exists {
				health.errorCount.Add(1) // ✅ atomic.Int64.Add()
			}
			e.healthMutex.RUnlock()
		}
		return nil, err
	case <-execCtx.Done():
		// 🔥 主动中断正在执行的代码
		// 优势：
		//   1. 立即停止代码执行，节省 CPU 资源
		//   2. 防止超时后继续修改 Runtime 状态（状态污染）
		//   3. goroutine 会快速结束（抛出 InterruptedError）
		// 注意：
		//   - resultChan 和 errorChan 是 buffered (容量=1)
		//   - 即使 Interrupt 后 goroutine 仍写入 channel，也不会阻塞
		//   - goroutine 不会泄漏（会自然结束）
		// 🔥 Context 取消原因判断：
		//   - DeadlineExceeded：执行超时
		//   - Canceled：客户端断开连接或主动取消
		runtime.Interrupt("execution cancelled or timeout")

		if !isTemporary {
			// 🔥 优化：使用 atomic 操作 + 读锁
			e.healthMutex.RLock()
			if health, exists := e.runtimeHealth[runtime]; exists {
				health.errorCount.Add(1) // ✅ atomic.Int64.Add()
			}
			e.healthMutex.RUnlock()
		}

		// 🔥 根据 context 取消原因返回不同错误
		if execCtx.Err() == context.DeadlineExceeded {
			return nil, &model.ExecutionError{
				Type:    "TimeoutError",
				Message: fmt.Sprintf("代码执行超时 (%v)", e.executionTimeout),
			}
		}
		return nil, &model.ExecutionError{
			Type:    "CancelledError",
			Message: "请求已取消",
		}
	}
}

// cleanupRuntime 清理Runtime状态（归还前）
func (e *JSExecutor) cleanupRuntime(runtime *goja.Runtime) {
	runtime.Set("input", goja.Undefined())
	runtime.Set("__executionId", goja.Undefined())
	runtime.Set("__startTime", goja.Undefined())
	runtime.Set("__finalResult", goja.Undefined())
	runtime.Set("__finalError", goja.Undefined())
	runtime.ClearInterrupt()

	// 🔥 v2.4.4: 清理 Blob Registry，防止内存泄漏
	// 原理：删除整个 registry，下次使用时会自动重建空 registry
	// 收益：确保所有 Blob URL 都被释放，无论用户是否调用 revokeObjectURL
	// 安全：Runtime 隔离确保不会影响其他 Runtime 的 Blob
	runtime.Set("__blobRegistry__", goja.Undefined())
}

// executeWithEventLoop 使用EventLoop执行代码（异步代码）
//
// 🔥 Context 使用说明：
//   - 接受来自上层的 context，而不是使用 context.Background()
//   - 监听 context 取消信号，支持请求中断
func (e *JSExecutor) executeWithEventLoop(ctx context.Context, code string, input map[string]interface{}) (*model.ExecutionResult, error) {
	loop := eventloop.NewEventLoop(eventloop.WithRegistry(e.registry))
	defer loop.Stop()

	// 🔥 通过事件循环保活，确保异步链路（尤其是不含定时器的 Promise）不会提前结束
	releaseLoopHold := loop.AcquireKeepAlive()
	releaseOnce := func() {
		if releaseLoopHold != nil {
			releaseLoopHold()
			releaseLoopHold = nil
		}
	}

	// 🔥 从 Context 中获取 requestID 作为 executionId（复用 requestID）
	var executionId string
	if reqID := ctx.Value(utils.RequestIDKey); reqID != nil {
		if reqIDStr, ok := reqID.(string); ok && reqIDStr != "" {
			// 使用 requestID 作为 executionId
			executionId = reqIDStr
		} else {
			// requestID 类型不对或为空，生成一个
			executionId = e.generateExecutionId()
		}
	} else {
		// 如果没有 requestID（非 HTTP 请求场景），生成一个
		executionId = e.generateExecutionId()
	}

	var finalResult interface{}
	var finalResultJSON []byte // 🔥 预序列化的 JSON（避免重复序列化）
	var finalError error
	var vm *goja.Runtime // 🔥 提升到外层作用域，以便在超时时访问
	defer func() {
		if vm != nil {
			fetch.ClearRuntimePrototypes(vm)
		}
	}()

	// 🔥 使用传入的 context，而不是 context.Background()
	execCtx, cancel := context.WithTimeout(ctx, e.executionTimeout)
	defer cancel()

	done := make(chan struct{})
	go func() {
		defer close(done)

		loop.Run(func(runtime *goja.Runtime) {
			vm = runtime

			defer func() {
				if r := recover(); r != nil {
					buf := make([]byte, 8192)
					stackSize := goruntime.Stack(buf, false)
					stackTrace := string(buf[:stackSize])

					utils.Error("EventLoop 捕获到panic",
						zap.Any("panic_value", r),
						zap.String("stack_trace", stackTrace))

					finalError = &model.ExecutionError{
						Type:    "RuntimeError",
						Message: fmt.Sprintf("代码执行panic: %v", r),
						Stack:   stackTrace,
					}
				}
			}()

			// 步骤1: 先设置 Node.js 基础模块（需要正常的原型）
			// 🔥 Console 控制：与 setupNodeJSModules 保持一致
			if e.allowConsole {
				console.Enable(vm)
			} else {
				e.setupConsoleStub(vm)
			}
			e.registry.Enable(vm)
			buffer.Enable(vm)
			url.Enable(vm)
			process.Enable(vm)

			// 🔥 步骤1.5: 拦截 Object.freeze 以支持 Node.js v25 Buffer 行为
			e.interceptObjectFreezeForBuffer(vm)

			// 🔥 使用模块注册器统一设置所有模块
			if err := e.moduleRegistry.SetupAll(vm); err != nil {
				utils.Error("EventLoop 中模块设置失败", zap.Error(err))
				finalError = &model.ExecutionError{
					Type:    "SetupError",
					Message: fmt.Sprintf("模块设置失败: %v", err),
				}
				return // 立即返回，不继续执行
			}

			e.registerBase64Functions(vm)
			e.registerTextEncoders(vm) // ✅ 注册 TextEncoder/TextDecoder
			e.setupGlobalObjectsForEventLoop(vm)
			// 🔥 向 fetch 模块提供事件循环调度器，避免轮询式 setTimeout
			vm.Set(fetch.LoopSchedulerGlobalKey, fetch.NewLoopScheduler(loop.RunOnLoop, loop.AcquireKeepAlive))
			// 🔥 暴露保活释放函数，供最终 Promise 完成时调用
			vm.Set("__releaseLoopHold", func(goja.FunctionCall) goja.Value {
				releaseOnce()
				return goja.Undefined()
			})

			// 🔥 与同步路径保持一致：在禁用 Reflect/Proxy 之前注册 JS 内存限制器，拦截大分配
			if e.jsMemoryLimiter != nil && e.jsMemoryLimiter.IsEnabled() {
				if err := e.jsMemoryLimiter.RegisterLimiter(vm); err != nil {
					utils.Warn("EventLoop 内存限制器注册失败（非致命）", zap.Error(err))
				}
			}

			// 提供不保活事件循环的定时器（等价 Node 的 timer.unref）
			vm.Set("setTimeoutUnref", func(call goja.FunctionCall) goja.Value {
				if len(call.Arguments) == 0 {
					return goja.Undefined()
				}
				fn, ok := goja.AssertFunction(call.Argument(0))
				if !ok {
					return goja.Undefined()
				}
				delay := call.Argument(1).ToInteger()
				var args []goja.Value
				if len(call.Arguments) > 2 {
					args = append(args, call.Arguments[2:]...)
				}

				timer := time.AfterFunc(time.Duration(delay)*time.Millisecond, func() {
					// 回到事件循环线程执行回调；如果事件循环已结束则按 unref 语义静默忽略
					loop.RunOnLoop(func(rt *goja.Runtime) {
						fn(goja.Undefined(), args...)
					})
				})
				return vm.ToValue(timer)
			})

			vm.Set("clearTimeoutUnref", func(call goja.FunctionCall) goja.Value {
				if len(call.Arguments) == 0 {
					return goja.Undefined()
				}
				if timer, ok := call.Argument(0).Export().(*time.Timer); ok && timer != nil {
					timer.Stop()
				}
				return goja.Undefined()
			})

			// 🔒 步骤2: 禁用危险功能和 constructor
			vm.Set("eval", goja.Undefined())
			// vm.Set("Function", goja.Undefined())  // 无法禁用，库需要
			//vm.Set("globalThis", goja.Undefined()) // 不禁用了，仅关键词识别
			vm.Set("window", goja.Undefined())
			vm.Set("self", goja.Undefined())

			// 🔥 禁用 Reflect 和 Proxy（防止绕过 constructor 防护）
			vm.Set("Reflect", goja.Undefined())
			vm.Set("Proxy", goja.Undefined())

			// 🔒 禁用 constructor 访问（简化版，支持 EventLoop）
			e.disableConstructorAccess(vm)

			vm.Set("input", input)
			vm.Set("__executionId", executionId)
			vm.Set("__startTime", time.Now().UnixNano()/1e6)
			vm.Set("__finalResult", goja.Undefined())
			vm.Set("__finalError", goja.Undefined())

			// 🔥 预处理用户代码：移除 Shebang（#!/usr/bin/env node）
			// Goja 不会自动忽略 Shebang，需要手动移除以避免语法错误
			processedCode := code
			if strings.HasPrefix(code, "#!") {
				// 移除第一行（Shebang 行）
				if idx := strings.Index(code, "\n"); idx != -1 {
					processedCode = code[idx+1:]
				} else {
					// 整个文件只有 Shebang 一行，移除后变为空
					processedCode = ""
				}
			}

			// 包装用户代码以支持 async/await：
			//   1. 'use strict'：启用严格模式
			//   2. Promise.resolve()：将结果包装为Promise，确保EventLoop等待
			//   3. .then：执行用户代码并捕获返回值
			//   4. .then：存储结果到 __finalResult
			//   5. .catch：捕获所有错误到 __finalError（不重新抛出，避免干扰Go的错误检测）
			//   6. try-catch：捕获同步编译错误
			wrappedCode := fmt.Sprintf(`
				(function() {
					'use strict';
					try {
						// 🔥 关键：返回Promise，让EventLoop知道要等待
						return Promise.resolve()
							.then(function() {
								// 执行用户代码
								return (function() {
									%s
								})();
							})
							.then(function(result) {
								// 存储结果
								__finalResult = result;
								__releaseLoopHold && __releaseLoopHold();
								return result;
							})
							.catch(function(error) {
								// 捕获所有错误（包括用户代码的错误）
								// 🔥 关键：存储错误但不重新抛出，让Promise正常resolve
								// 这样EventLoop会认为Promise成功完成，我们在Go端检查 __finalError
								__finalError = error ? error : new Error('Promise rejected');
								__releaseLoopHold && __releaseLoopHold();
								return undefined;  // 返回undefined，避免 __finalResult 被覆盖
							});
					} catch (error) {
						// 捕获同步编译错误
						__finalError = error;
						__releaseLoopHold && __releaseLoopHold();
						// 返回一个已resolve的Promise，让EventLoop继续
						return Promise.resolve(undefined);
					}
				})()
			`, processedCode)

			_, err := vm.RunString(wrappedCode)
			if err != nil {
				// 🔥 使用 categorizeError 处理编译/运行时错误，并调整行号
				categorizedErr := e.categorizeError(err)
				finalError = adjustErrorLineNumber(categorizedErr, 9) // EventLoop 包装增加了 9 行
			}
		})

		// 🔥 重要：loop.Run() 会阻塞直到所有异步任务完成
		// EventLoop内部会自动等待setTimeout、Promise等任务
		// 所以执行到这里时，异步任务已经全部完成

		if finalError == nil && vm != nil {
			finalErr := vm.Get("__finalError")
			if !goja.IsUndefined(finalErr) && finalErr != nil {
				// 🔥 修复：提取完整的错误信息（包括stack trace）
				errMsg, errStack := extractErrorDetails(finalErr)
				rawError := &model.ExecutionError{
					Type:    "RuntimeError",
					Message: errMsg,
					Stack:   errStack, // ✅ 新增：包含stack信息
				}
				// 🔥 调整行号（如果错误消息中包含行号）
				finalError = adjustErrorLineNumber(rawError, 9) // EventLoop 包装增加了 9 行
			} else {
				finalRes := vm.Get("__finalResult")
				if goja.IsUndefined(finalRes) {
					finalError = &model.ExecutionError{
						Type:    "ValidationError",
						Message: "返回值不能是 undefined",
					}
				} else if finalRes == nil {
					finalError = &model.ExecutionError{
						Type:    "ValidationError",
						Message: "代码没有返回有效结果",
					}
				} else {
					// 🔥 使用带大小限制的导出（边导出边检查，超限立即中断）
					exportedResult, err := utils.ExportWithOrderAndLimit(finalRes, e.maxResultSize)
					if err != nil {
						// 导出阶段超限（最早拦截点）
						finalError = &model.ExecutionError{
							Type:    "ValidationError",
							Message: fmt.Sprintf("返回数据过大: %v", err),
						}
					} else {
						finalResult = exportedResult

						// 🔥 转换所有 time.Time 对象为 UTC ISO 字符串（在验证前转换）
						// 修复 date-fns 时区问题：确保返回 UTC 时间（Z）
						finalResult = convertTimesToUTC(finalResult)

						// 🔥 验证结果并获取预序列化的 JSON（避免重复序列化）
						finalJSONData, err := e.validateResult(finalResult)
						if err != nil {
							finalError = err
						} else {
							// 保存预序列化的 JSON 到全局变量（后续使用）
							finalResultJSON = finalJSONData
						}
					}
				}
			}
		}
	}()

	select {
	case <-done:
		if finalError != nil {
			return nil, finalError
		}
		return &model.ExecutionResult{
			Result:    finalResult,
			RequestID: executionId,     // 🔄 改名：ExecutionId → RequestID
			JSONData:  finalResultJSON, // 🔥 保存预序列化的 JSON
		}, nil
	case <-execCtx.Done():
		// 🔥 关键修复：主动中断 Runtime 执行
		// 优势：
		//   1. 立即停止 JS 代码执行（包括紧密循环）
		//   2. 防止超时后继续消耗 CPU 资源
		//   3. goroutine 会快速结束（抛出 InterruptedError）
		// 注意：
		//   - Interrupt() 会在下一个"安全点"中断执行
		//   - 对于紧密循环，goja 会定期检查中断标志
		//   - done channel 是无缓冲的，Interrupt 后会正常关闭
		if vm != nil {
			vm.Interrupt("execution cancelled or timeout")
		}
		loop.StopNoWait()

		// 🔥 根据 context 取消原因返回不同错误
		if execCtx.Err() == context.DeadlineExceeded {
			return nil, &model.ExecutionError{
				Type:    "TimeoutError",
				Message: fmt.Sprintf("代码执行超时 (%v)", e.executionTimeout),
			}
		}
		return nil, &model.ExecutionError{
			Type:    "CancelledError",
			Message: "请求已取消",
		}
	}
}

// validateInput 验证输入参数（入口方法）
// validateInputWithContext 验证输入（支持 context 取消）
// 🔥 Context 支持：允许在验证阶段取消请求
//
// 优化说明：
//   - 在两个操作之间检查 context（而非每个正则后检查）
//   - 收益：如果 validateCodeWithCache 慢（缓存未命中 ~1-2ms），可以提前返回
//   - 成本：1 次 select 操作 ~10ns（可忽略）
//
// 性能分析：
//   - 缓存命中：总耗时 ~20-30μs，无需中断
//   - 缓存未命中：总耗时 ~500μs-2ms，可能需要中断
//   - 客户端取消：立即返回，节省 0.5-2ms CPU 时间
func (e *JSExecutor) validateInputWithContext(ctx context.Context, code string, input map[string]interface{}) error {
	// 1. 验证代码（带缓存，通常很快 ~20-30μs）
	if err := e.validateCodeWithCache(code); err != nil {
		return err
	}

	// 🔥 在两个操作之间检查 context
	//    如果 validateCodeWithCache 执行慢（缓存未命中 ~1-2ms），
	//    且客户端在此期间断开连接，可以立即返回，避免执行后续验证
	select {
	case <-ctx.Done():
		return &model.ExecutionError{
			Type:    "CancelledError",
			Message: "请求已取消（验证阶段）",
		}
	default:
		// 继续执行
	}

	// 2. 验证输入大小（极快 ~1-2μs）
	if err := e.validateInputData(input); err != nil {
		return err
	}

	return nil
}

// validateInput 验证输入（不带 context，保留用于内部调用）
// 🔥 已弃用：外部调用应使用 validateInputWithContext
func (e *JSExecutor) validateInput(code string, input map[string]interface{}) error {
	// 1. 验证代码（带缓存）
	if err := e.validateCodeWithCache(code); err != nil {
		return err
	}

	// 2. 验证输入大小（每次都检查）
	if err := e.validateInputData(input); err != nil {
		return err
	}

	return nil
}

// validateCodeWithCache 验证代码安全性（带缓存）
// 🔥 性能优化：缓存验证结果，避免重复执行 40+ 个正则表达式
// 🔥 安全加固：归一化 Unicode 并过滤零宽字符，防御绕过攻击
func (e *JSExecutor) validateCodeWithCache(code string) error {
	// 🔥 安全加固：归一化 + 过滤零宽字符（防御 Unicode 绕过攻击）
	// 攻击场景：obj.\u200Bconstructor() 或 eval\u0028...）
	// 性能开销：~10-20μs（10KB 代码），可忽略不计
	normalizedCode := e.normalizeCode(code)

	// 计算代码哈希（使用归一化后的代码，使用 xxHash，快 20 倍）
	codeHash := hashCode(normalizedCode)

	// 尝试从缓存获取验证结果
	e.validationCacheMutex.RLock()
	if result, found := e.validationCache.Get(codeHash); found {
		e.validationCacheMutex.RUnlock()
		// 缓存中存储的是 error（nil 表示验证通过）
		if result == nil {
			return nil
		}
		if err, ok := result.(error); ok {
			return err
		}
		return nil // 类型断言失败时返回nil（验证通过）
	}
	e.validationCacheMutex.RUnlock()

	// 缓存未命中，执行完整验证（使用归一化后的代码）
	err := e.validateCode(normalizedCode)

	// 缓存验证结果（包括 nil 表示通过）
	e.validationCacheMutex.Lock()
	evicted := e.validationCache.Put(codeHash, err)
	e.validationCacheMutex.Unlock()

	if evicted {
		utils.Debug("验证缓存已满，驱逐最久未使用的条目")
	}

	return err
}

// validateCode 验证代码（不带缓存，由 validateCodeWithCache 调用）
//
// 🔥 性能优化：统一清理字符串和注释，避免重复调用
//   - 优化前：removeStringsAndComments 被调用 2 次（validateReturnStatement + validateCodeSecurity）
//   - 优化后：只调用 1 次，传递 cleanedCode 给子函数
//   - 性能提升：节省 ~100μs（10KB 代码），占验证时间的 16.4%
func (e *JSExecutor) validateCode(code string) error {
	// 1. 长度检查（使用原始代码）
	if len(code) > e.maxCodeLength {
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("代码长度超过限制: %d > %d字节", len(code), e.maxCodeLength),
		}
	}

	// 🔥 统一清理一次（避免重复调用，节省 ~100μs）
	cleanedCode := e.removeStringsAndComments(code)

	// 2. return 语句检查（优先使用清理后的代码，必要时回退到原始代码）
	if err := e.validateReturnWithFallback(code, cleanedCode); err != nil {
		return err
	}

	// 3. 安全检查（传递原始代码和清理后的代码，部分检查需要原始字符串）
	if err := e.validateCodeSecurityCleaned(code, cleanedCode); err != nil {
		return err
	}

	return nil
}

// normalizeCode 归一化代码并过滤零宽字符
// 🔥 安全加固：NFC 归一化 + 删除零宽字符（\u200B/\u200C/\u200D/\uFEFF），防御 Unicode 绕过攻击
func (e *JSExecutor) normalizeCode(code string) string {
	// 1. NFC 归一化（Normalization Form C）
	// 将组合字符序列转换为预组合形式
	// 例如：é (e + ́) → é (单个字符)
	normalized := norm.NFC.String(code)

	// 2. 过滤零宽字符
	return strings.Map(func(r rune) rune {
		switch r {
		case '\u200B': // Zero Width Space
			return -1 // 删除此字符
		case '\u200C': // Zero Width Non-Joiner
			return -1
		case '\u200D': // Zero Width Joiner
			return -1
		case '\uFEFF': // Zero Width No-Break Space (BOM)
			return -1
		default:
			return r // 保留其他字符
		}
	}, normalized)
}

// validateInputData 验证输入数据（使用 json.Marshal 精确计算大小，用于 DoS 防护）
// 🔥 性能优化：使用 json.Marshal 替代 fmt.Sprintf，性能提升 1.3-1.6x，准确度更高
func (e *JSExecutor) validateInputData(input map[string]interface{}) error {
	// 🔥 使用 json.Marshal 计算精确的 JSON 大小
	// 优势：
	//   1. 性能更好：比 fmt.Sprintf 快 1.3-1.6x
	//   2. 准确度高：fmt.Sprintf 会少估算 10-15%，可能绕过限制
	//   3. 语义正确：最终数据会被 JSON 序列化，应该验证 JSON 大小
	jsonData, err := json.Marshal(input)
	if err != nil {
		// JSON 序列化失败，说明数据无效
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("输入数据无法序列化为 JSON: %v", err),
		}
	}

	inputSize := len(jsonData)
	if inputSize > e.maxInputSize {
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("输入数据过大: %d > %d字节", inputSize, e.maxInputSize),
		}
	}

	return nil
}

// validateReturnStatement 验证代码中是否包含 return 语句
// 已废弃：使用 validateReturnStatementCleaned 替代（接受预清理的代码）
func (e *JSExecutor) validateReturnStatement(code string) error {
	cleanedCode := e.removeStringsAndComments(code)
	return e.validateReturnStatementCleaned(cleanedCode)
}

// validateReturnStatementCleaned 验证清理后的代码中是否包含 return 语句
// 🔥 性能优化：接受预清理的代码，避免重复调用 removeStringsAndComments
func (e *JSExecutor) validateReturnStatementCleaned(cleanedCode string) error {
	if !strings.Contains(cleanedCode, "return") {
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: "代码中缺少 return 语句",
		}
	}

	return nil
}

// validateReturnWithFallback 使用清理后的代码进行 return 校验，必要时回退到原始代码
// 说明：
//   - 首选 cleanedCode，避免字符串/注释中的 "return" 误判
//   - 若 cleanedCode 中未找到 "return"，则在原始 code 中再做一次包含性检查
//   - 这样可以规避词法清理在正则等复杂语法下的误分段导致的漏检
func (e *JSExecutor) validateReturnWithFallback(originalCode, cleanedCode string) error {
	// 首先使用清理后的代码做精确检查
	if strings.Contains(cleanedCode, "return") {
		return nil
	}

	// 若清理后的代码中未发现 "return"，再退回到原始代码做一次保护性检查
	// 注意：这里可能会放宽到字符串中的 "return"，但后续执行阶段仍会校验实际返回结果
	if strings.Contains(originalCode, "return") {
		return nil
	}

	return &model.ExecutionError{
		Type:    "ValidationError",
		Message: "代码中缺少 return 语句",
	}
}

// removeStringsAndComments 移除字符串和注释（避免误判）
//
// 性能优化说明：
//
//   - 🔥 批量写入空格：减少函数调用 97%（65K → 2K 次）
//
//   - 🔥 预分配容量：避免 strings.Builder 扩容
//
//   - 🔥 性能提升：6.5倍（3.25ms → 0.5ms，64KB代码）
//
//   - sync.Pool 不适用：缓存命中率高（80%+），栈分配更优
//
//     ✅ 栈分配 strings.Builder（编译器优化友好）
//     ✅ 预分配容量（零扩容开销）
//     ✅ 批量写入（6.5倍加速）
//     ✅ 配合验证缓存（80% 请求直接命中）
//
// 详细分析见：分析评估/STRING_CONCATENATION_OPTIMIZATION_SUCCESS.md
func (e *JSExecutor) removeStringsAndComments(code string) string {
	lexer := utils.NewCodeLexer(code)
	var result strings.Builder
	result.Grow(len(code)) // 🔥 预分配容量，避免扩容

	spaceCount := 0 // 🔥 累积需要写入的空格数
	codeBytes := lexer.GetCode()

	for {
		token := lexer.NextToken()
		if token.Type == utils.TokenEOF {
			break
		}

		if token.Type == utils.TokenCode {
			// 遇到代码字符，批量写入累积的空格
			if spaceCount > 0 {
				writeSpacesBatch(&result, spaceCount)
				spaceCount = 0
			}
			// 写入代码字符
			result.Write(codeBytes[token.Start:token.End])
		} else {
			// 字符串或注释：累积空格
			spaceCount += token.End - token.Start
		}
	}

	// 🔥 处理末尾可能剩余的空格
	if spaceCount > 0 {
		writeSpacesBatch(&result, spaceCount)
	}

	return result.String()
}

// writeSpacesBatch 批量写入空格（性能优化）
// 🔥 使用预定义的空格字符串，避免逐字节写入的函数调用开销
func writeSpacesBatch(sb *strings.Builder, count int) {
	for count > 0 {
		if count >= 128 {
			sb.WriteString(spaces128)
			count -= 128
		} else if count >= 32 {
			sb.WriteString(spaces32)
			count -= 32
		} else {
			sb.WriteString(spaces32[:count])
			count = 0
		}
	}
}

// validateCodeSecurity 验证代码安全性
// 已废弃：使用 validateCodeSecurityCleaned 替代（接受预清理的代码）
// 🔥 多层安全检测：静态分析 + 模式匹配 + 正则检测
func (e *JSExecutor) validateCodeSecurity(code string) error {
	cleanedCode := e.removeStringsAndComments(code)
	return e.validateCodeSecurityCleaned(code, cleanedCode)
}

// validateCodeSecurityCleaned 验证清理后代码的安全性
// 🔥 性能优化：接受预清理的代码，避免重复调用 removeStringsAndComments
// 🔥 多层安全检测：静态分析 + 模式匹配 + 正则检测
//
// 参数说明：
//   - code: 原始代码（用于字符串模式检测和死循环检测）
//   - cleanedCode: 清理后的代码（用于大部分安全检查）

// ============================================================================
// 🔥 安全检查辅助函数（拆分后的各个检查逻辑）
// ============================================================================

// checkProhibitedModules 检查被禁用的模块引用
func (e *JSExecutor) checkProhibitedModules(originalCode, cleanedCode string) error {
	for _, mod := range prohibitedModules {
		if idx := strings.Index(cleanedCode, mod.pattern); idx != -1 {
			// 在原始代码中查找对应位置
			lineNum, colNum, lineContent := e.findPatternInOriginalCode(originalCode, cleanedCode, idx, mod.pattern)

			return &model.ExecutionError{
				Type: "SecurityError",
				Message: fmt.Sprintf("禁止使用 %s 模块：%s出于安全考虑已被禁用\n位置: 第 %d 行，第 %d 列\n代码: %s",
					mod.module, mod.reason, lineNum, colNum, lineContent),
			}
		}
	}
	return nil
}

// checkDangerousPatterns 检查危险代码模式（字符串匹配）
func (e *JSExecutor) checkDangerousPatterns(originalCode, cleanedCode string) error {
	for _, pattern := range dangerousPatterns {
		if idx := strings.Index(cleanedCode, pattern.pattern); idx != -1 {
			// 在原始代码中查找对应位置
			lineNum, colNum, lineContent := e.findPatternInOriginalCode(originalCode, cleanedCode, idx, pattern.pattern)

			return &model.ExecutionError{
				Type: "SecurityError",
				Message: fmt.Sprintf("代码包含危险模式 '%s': %s\n位置: 第 %d 行，第 %d 列\n代码: %s",
					pattern.pattern, pattern.reason, lineNum, colNum, lineContent),
			}
		}
	}
	return nil
}

// checkDangerousRegexPatterns 检查危险代码模式（正则表达式匹配）
// 🔥 安全加固：限制空格数量为 3，防止 ReDoS 攻击
func (e *JSExecutor) checkDangerousRegexPatterns(originalCode, cleanedCode string) error {
	for _, pattern := range dangerousRegexes {
		if loc := pattern.pattern.FindStringIndex(cleanedCode); loc != nil {
			matchedText := cleanedCode[loc[0]:loc[1]]
			// 在原始代码中查找对应位置
			lineNum, colNum, lineContent := e.findPatternInOriginalCode(originalCode, cleanedCode, loc[0], matchedText)

			return &model.ExecutionError{
				Type: "SecurityError",
				Message: fmt.Sprintf("代码包含危险模式: %s\n位置: 第 %d 行，第 %d 列\n匹配内容: %s\n代码: %s",
					pattern.reason, lineNum, colNum, matchedText, lineContent),
			}
		}
	}
	return nil
}

// checkDynamicPropertyAccess 检查危险的动态属性访问
// 检测 this["eval"], globalThis["Function"] 等模式
func (e *JSExecutor) checkDynamicPropertyAccess(originalCode, cleanedCode string) error {
	for _, pattern := range dangerousDynamicAccessPatterns {
		if loc := pattern.pattern.FindStringIndex(cleanedCode); loc != nil {
			matchedText := cleanedCode[loc[0]:loc[1]]
			// 在原始代码中查找对应位置
			lineNum, colNum, lineContent := e.findPatternInOriginalCode(originalCode, cleanedCode, loc[0], matchedText)

			return &model.ExecutionError{
				Type: "SecurityError",
				Message: fmt.Sprintf("代码包含危险模式: %s\n位置: 第 %d 行，第 %d 列\n匹配内容: %s\n代码: %s",
					pattern.reason, lineNum, colNum, matchedText, lineContent),
			}
		}
	}
	return nil
}

// checkSuspiciousStringPatterns 检查可疑的字符串拼接模式（启发式检测）
// 注意：需要使用原始代码，因为需要分析字符串内容
//
// 🔥 P0-2 优化：两阶段检测策略
//   - 阶段 1：快速字符串检查（零开销，O(n)）
//   - 阶段 2：精确正则检测（仅对可疑代码，少量开销）
//   - 收益：99% 的正常代码跳过正则检测，性能提升 50-100x
func (e *JSExecutor) checkSuspiciousStringPatterns(code string) error {
	// 🔥 阶段 1：快速字符串检查（零回溯）
	// 如果代码不包含任何可疑字符串字面量或模式，直接返回
	// 这能让 99% 的正常代码跳过正则检测
	hasSuspicious := false
	suspiciousStrings := []string{
		// 完整的危险关键词
		`"eval"`, `'eval'`, "`eval`",
		`"Function"`, `'Function'`, "`Function`",
		`"constructor"`, `'constructor'`, "`constructor`",
		`"__proto__"`, `'__proto__'`, "`__proto__`",

		// 🔥 字符串拼接检测 - eval 的各种拼接方式
		`"ev"`, `'ev'`, `"al"`, `'al'`, // "ev" + "al"
		`"eva"`, `'eva'`, `"val"`, `'val'`, // "eva" + "l" 或 "e" + "val"

		// 🔥 字符串拼接检测 - Function 的各种拼接方式
		`"Fun"`, `'Fun'`, `"ction"`, `'ction'`, // "Fun" + "ction"
		`"Func"`, `'Func'`, `"tion"`, `'tion'`, // "Func" + "tion"
		`"unction"`, `'unction'`, // "F" + "unction"

		// 🔥 字符串拼接检测 - constructor 的各种拼接方式
		`"cons"`, `'cons'`, `"tructor"`, `'tructor'`, // "cons" + "tructor"
		`"const"`, `'const'`, `"ructor"`, `'ructor'`, // "const" + "ructor"
		`"constr"`, `'constr'`, `"uctor"`, `'uctor'`, // "constr" + "uctor"
		`"construc"`, `'construc'`, `"tor"`, `'tor'`, // "construc" + "tor"

		// 🔥 字符串拼接检测 - __proto__ 的各种拼接方式
		`"__pro"`, `'__pro'`, `"to__"`, `'to__'`, // "__pro" + "to__"
		`"__"`, `'__'`, `"proto__"`, `'proto__'`, // "__" + "proto__"

		// 其他拼接模式
		`.join(`, // 检测 join 方法
	}

	for _, s := range suspiciousStrings {
		if strings.Contains(code, s) {
			hasSuspicious = true
			break
		}
	}

	// 如果没有可疑字符串，直接返回（快速路径）
	if !hasSuspicious {
		return nil
	}

	// 🔥 阶段 2：精确正则检测（仅对可疑代码）
	// 此时已知代码包含可疑字符串，需要精确检测是否有危险模式
	for _, pattern := range suspiciousStringPatterns {
		if loc := pattern.pattern.FindStringIndex(code); loc != nil {
			// 计算行号和列号
			lineNum, colNum, lineContent := e.findLineAndColumn(code, loc[0])
			matchedText := code[loc[0]:loc[1]]

			return &model.ExecutionError{
				Type: "SecurityError",
				Message: fmt.Sprintf("代码包含可疑模式: %s\n位置: 第 %d 行，第 %d 列\n匹配内容: %s\n代码: %s",
					pattern.reason, lineNum, colNum, matchedText, lineContent),
			}
		}
	}
	return nil
}

// checkConsoleUsage 检查 console 使用（如果已禁用）
// 🔥 静态检测：在代码验证阶段就拒绝包含 console 的代码
// 📝 说明：如果 ALLOW_CONSOLE=false，则禁止代码中出现 console（无论在任何位置）
func (e *JSExecutor) checkConsoleUsage(originalCode, cleanedCode string) error {
	// 如果允许 console，直接返回
	if e.allowConsole {
		return nil
	}

	// 检测 cleanedCode 中是否包含 "console"
	// cleanedCode 已经移除了字符串和注释，所以只检测实际代码
	if idx := strings.Index(cleanedCode, "console"); idx != -1 {
		// 🔥 在原始代码中查找实际代码中的 console（跳过注释和字符串）
		lineNum, colNum, lineContent := e.findConsoleInActualCode(originalCode)

		return &model.ExecutionError{
			Type: "ConsoleDisabledError",
			Message: fmt.Sprintf("代码中禁止使用 console\n"+
				"原因: 生产环境已禁用 console \n"+
				"位置: 第 %d 行，第 %d 列\n"+
				"代码: %s\n",
				lineNum, colNum, lineContent),
		}
	}

	return nil
}

// findConsoleInActualCode 在原始代码中查找实际代码中的 console（跳过注释和字符串）
// 🔥 解决行号定位问题：确保定位到实际代码中的 console，而不是注释中的
// 🔥 v2.5.0 重构：使用统一的 CodeLexer 词法分析器，消除代码重复
func (e *JSExecutor) findConsoleInActualCode(code string) (int, int, string) {
	lexer := utils.NewCodeLexer(code)
	codeBytes := lexer.GetCode()

	// 构建实际代码字符串（只包含代码，不包含注释和字符串）
	// 同时记录每个字符在原始代码中的位置映射
	var actualCode strings.Builder
	posMap := make([]int, 0, len(code)) // posMap[i] = actualCode中位置i对应的原始代码位置

	for {
		token := lexer.NextToken()
		if token.Type == utils.TokenEOF {
			break
		}

		if token.Type == utils.TokenCode {
			// 记录代码字符及其原始位置
			for i := token.Start; i < token.End; i++ {
				actualCode.WriteByte(codeBytes[i])
				posMap = append(posMap, i)
			}
		}
	}

	// 在实际代码中查找 "console"
	actualCodeStr := actualCode.String()
	if idx := strings.Index(actualCodeStr, "console"); idx != -1 {
		// 找到了，映射回原始位置
		originalPos := posMap[idx]
		return e.findLineAndColumn(code, originalPos)
	}

	// 没找到（理论上不会到这里，因为 cleanedCode 已经检测到了）
	return 1, 1, ""
}

// removeCommentsAndStrings 移除代码中的注释和字符串，用于更准确的语法检测
// 🔥 用途：避免注释或字符串中的关键字（如 break/return）导致误判
// 🔥 v2.5.0 重构：使用统一的 CodeLexer 词法分析器，消除代码重复
func (e *JSExecutor) removeCommentsAndStrings(code string) string {
	lexer := utils.NewCodeLexer(code)
	var result strings.Builder
	result.Grow(len(code))

	codeBytes := lexer.GetCode()

	for {
		token := lexer.NextToken()
		if token.Type == utils.TokenEOF {
			break
		}

		if token.Type == utils.TokenCode {
			// 普通代码字符：直接写入
			result.Write(codeBytes[token.Start:token.End])
		} else {
			// 字符串或注释：用空格替代（逐字节，保持长度一致）
			for i := token.Start; i < token.End; i++ {
				if codeBytes[i] == '\n' {
					// 保留换行符（用于行号计算）
					result.WriteByte('\n')
				} else {
					result.WriteByte(' ')
				}
			}
		}
	}

	return result.String()
}

// hasExitStatementInCode 检查代码中是否包含退出语句（break 或 return）
// 🔥 v2.4.1 改进：
//  1. 排除注释和字符串中的 break/return
//  2. 检查 break/return 是否在循环体的 {} 内部（避免循环外的 return 误判）
func (e *JSExecutor) hasExitStatementInCode(code string) bool {
	cleaned := e.removeCommentsAndStrings(code)
	return e.hasExitStatementInLoop(cleaned)
}

// hasExitStatementInLoop 检查循环体内是否有退出语句
// 🔥 核心逻辑：确保 break/return 在循环的 {} 内部，而不是循环外
func (e *JSExecutor) hasExitStatementInLoop(code string) bool {
	// 查找所有可能的循环模式
	loopPatterns := []string{
		"while(true)", "while (true)",
		"while(1)", "while (1)",
		"for(;;)", "for (;;)",
		"do{", "do {",
	}

	for _, pattern := range loopPatterns {
		index := strings.Index(code, pattern)
		if index == -1 {
			continue
		}

		// 找到循环开始位置后，查找循环体的 {}
		// 从 pattern 后开始查找第一个 {
		searchStart := index + len(pattern)

		// 对于 do-while，{ 在 pattern 中
		if pattern == "do{" {
			searchStart = index + 2 // "do" 的长度
		} else if pattern == "do {" {
			searchStart = index + 3 // "do " 的长度
		} else {
			// 对于 while/for，查找第一个 {
			braceIndex := strings.Index(code[searchStart:], "{")
			if braceIndex == -1 {
				continue // 没有找到 {，跳过
			}
			searchStart = searchStart + braceIndex
		}

		// 从 { 开始，匹配对应的 }
		loopBody := e.extractLoopBody(code, searchStart)
		if loopBody == "" {
			continue
		}

		// 检查循环体内是否有 break 或 return
		if strings.Contains(loopBody, "break") || strings.Contains(loopBody, "return") {
			return true
		}
	}

	return false
}

// extractLoopBody 提取循环体内容（从 { 到匹配的 }）
// 🔥 使用括号计数器，正确处理嵌套的 {}
func (e *JSExecutor) extractLoopBody(code string, startIndex int) string {
	if startIndex >= len(code) || code[startIndex] != '{' {
		return ""
	}

	braceCount := 0
	for i := startIndex; i < len(code); i++ {
		ch := code[i]

		if ch == '{' {
			braceCount++
		} else if ch == '}' {
			braceCount--
			if braceCount == 0 {
				// 找到了匹配的 }
				return code[startIndex+1 : i] // 返回 {} 内的内容（不包括 {} 本身）
			}
		}
	}

	return "" // 没有找到匹配的 }
}

// checkInfiniteLoops 检查可能的无限循环
// 🔥 v2.5.4 修复：接收清理后的代码，避免注释中的循环被误判
// 🔥 v2.4 优化：
//  1. 增加 while(1) 检测（覆盖率 +5%）
//  2. 增加 do-while 检测（覆盖率 +3%）
//  3. 改进 break/return 检测：排除注释和字符串（准确度 +10%）
//  4. 优化错误提示：明确告知有 超时保护
//
// 参数说明：
//   - cleanedCode: 已清理的代码（已移除注释和字符串）
func (e *JSExecutor) checkInfiniteLoops(cleanedCode string) error {
	// 注意：cleanedCode 已经是清理后的代码，不需要再次清理

	// 检查 while(true) 或 while (true)
	hasWhileTrue := strings.Contains(cleanedCode, "while(true)") || strings.Contains(cleanedCode, "while (true)")

	// 🔥 新增：检查 while(1) 或 while (1)
	hasWhileOne := strings.Contains(cleanedCode, "while(1)") || strings.Contains(cleanedCode, "while (1)")

	// 检查 for(;;) 或 for (;;)
	hasForInfinite := strings.Contains(cleanedCode, "for(;;)") || strings.Contains(cleanedCode, "for (;;)")

	// 🔥 新增：检查 do-while(true) 或 do-while(1)
	hasDoWhile := (strings.Contains(cleanedCode, "do{") || strings.Contains(cleanedCode, "do {")) &&
		(strings.Contains(cleanedCode, "while(true)") || strings.Contains(cleanedCode, "while (true)") ||
			strings.Contains(cleanedCode, "while(1)") || strings.Contains(cleanedCode, "while (1)"))

	if hasWhileTrue || hasWhileOne || hasForInfinite || hasDoWhile {
		// 🔥 智能检测：如果循环体内有 break/return，则认为是安全的
		// 常见合法模式：
		// - while (true) { if (done) break; }  // 流式读取
		// - while (true) { if (condition) return; }  // 条件退出
		// - for (;;) { if (count > 10) break; }  // 计数退出

		// 🔥 v2.5.4 修复：传入已清理的代码，避免重复清理
		if e.hasExitStatementInLoop(cleanedCode) {
			// 包含退出条件，认为是安全的
			return nil
		}

		// 没有明显的退出条件，认为可能是无限循环
		return &model.ExecutionError{
			Type: "SecurityError",
			Message: "代码可能包含无限循环，已被阻止执行。\n" +
				"提示：如果使用 while(true) / while(1) / for(;;)，请确保包含 break 或 return 退出条件。",
		}
	}

	return nil
}

func (e *JSExecutor) validateCodeSecurityCleaned(code, cleanedCode string) error {
	// ✅ async/await 已支持（goja v2025-06-30+）
	// 不再需要检测和拒绝 async/await 语法

	// 🔥 重构：调用拆分后的检查函数
	// 注意：传入原始代码用于行号计算
	if err := e.checkProhibitedModules(code, cleanedCode); err != nil {
		return err
	}

	if err := e.checkDangerousPatterns(code, cleanedCode); err != nil {
		return err
	}

	if err := e.checkDangerousRegexPatterns(code, cleanedCode); err != nil {
		return err
	}

	if err := e.checkDynamicPropertyAccess(code, cleanedCode); err != nil {
		return err
	}

	if err := e.checkSuspiciousStringPatterns(code); err != nil {
		return err
	}

	// 🔥 检查 console 使用（如果禁用）
	if err := e.checkConsoleUsage(code, cleanedCode); err != nil {
		return err
	}

	// 🔥 v2.5.4 修复：传入 cleanedCode，避免注释中的循环关键字被误判
	return e.checkInfiniteLoops(cleanedCode)
}

// limitedWriter 限制写入大小的 writer（边序列化边检查，超限立即中断）
type limitedWriter struct {
	buf     *bytes.Buffer
	written int
	limit   int
}

func (w *limitedWriter) Write(p []byte) (n int, err error) {
	// 检查写入后是否超限
	if w.written+len(p) > w.limit {
		// 🔥 立即中断，避免继续消耗内存
		return 0, fmt.Errorf("结果序列化超过大小限制: 已写入 %d 字节, 尝试再写 %d 字节, 限制 %d 字节",
			w.written, len(p), w.limit)
	}

	n, err = w.buf.Write(p)
	w.written += n
	return n, err
}

// validateResult 验证执行结果（使用 jsoniter 高性能序列化 + 大小检查）
//
// 性能优势（vs 标准库）：
//   - 序列化速度快 6 倍
//   - 内存分配减少 92%
//   - 降低 GC 压力
//
// 流式能力限制（实测结果）：
//   - 仅对顶级数组（return [...]）支持真正的流式分块写入
//   - 对象结构（return {items: [...]}）仍然是一次性序列化
//   - 大多数场景：序列化完成后一次性写入，无法在序列化过程中中断
//
// 内存保护机制：
//   - limitedWriter 在写入时检查大小，拦截超限数据
//   - 能防止传输超大响应，但无法完全防止序列化阶段的内存占用
//   - 建议：合理设置 MAX_RESULT_SIZE + Docker 内存限制 + 监控
func (e *JSExecutor) validateResult(result interface{}) ([]byte, error) {
	// 1. 检查是否包含无效的JSON值 (NaN, Infinity等) - 在序列化前检查
	if err := validateJSONSerializable(result); err != nil {
		return nil, &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("返回结果包含无效的JSON值: %v", err),
		}
	}

	// 2. 🔥 使用 jsoniter 高性能序列化 + limitedWriter 大小检查
	var jsonAPI = jsoniter.ConfigCompatibleWithStandardLibrary
	buf := &bytes.Buffer{}
	limitWriter := &limitedWriter{
		buf:   buf,
		limit: e.maxResultSize,
	}

	encoder := jsonAPI.NewEncoder(limitWriter)
	if err := encoder.Encode(result); err != nil {
		// 检查是否是大小限制错误（包含 "结果序列化超过大小限制" 关键字）
		if strings.Contains(err.Error(), "结果序列化超过大小限制") {
			if limitWriter.written > 0 && limitWriter.written >= e.maxResultSize {
				// 流式写入中被中断（罕见，仅顶级数组结构）
				return nil, &model.ExecutionError{
					Type: "ValidationError",
					Message: fmt.Sprintf("返回结果过大: 已序列化 %d 字节 > %d 字节限制（流式序列化已中断）",
						limitWriter.written, e.maxResultSize),
				}
			} else {
				// 第一次写入就超限（常见，对象结构一次性序列化）
				// 注意：此时数据已在内存中完成序列化，但被拦截未传输
				return nil, &model.ExecutionError{
					Type: "ValidationError",
					Message: fmt.Sprintf("返回结果过大: %s。警告：请优化返回结构",
						err.Error()),
				}
			}
		}
		// 其他序列化错误
		return nil, &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("结果无法序列化为JSON: %v", err),
		}
	}

	// 3. 移除 Encoder 自动添加的换行符
	jsonData := buf.Bytes()
	if len(jsonData) > 0 && jsonData[len(jsonData)-1] == '\n' {
		jsonData = jsonData[:len(jsonData)-1]
	}

	return jsonData, nil
}

// convertTimesToUTC 递归将结果中所有 time.Time 对象转换为 UTC ISO 字符串
// 🔥 修复 date-fns 时区问题：确保返回 UTC 时间（Z）而不是本地时区（+08:00）
func convertTimesToUTC(value interface{}) interface{} {
	switch v := value.(type) {
	case time.Time:
		// 🔥 转换为 UTC 时间并格式化为 ISO 8601 字符串
		// 使用自定义格式确保始终包含毫秒部分（与 JavaScript Date.toISOString() 一致）
		// 例如：2025-10-13T01:58:30.658Z 或 2023-10-08T02:00:00.000Z
		utc := v.UTC()
		// 格式：YYYY-MM-DDTHH:MM:SS.sssZ（始终包含 3 位毫秒）
		return fmt.Sprintf("%04d-%02d-%02dT%02d:%02d:%02d.%03dZ",
			utc.Year(), utc.Month(), utc.Day(),
			utc.Hour(), utc.Minute(), utc.Second(),
			utc.Nanosecond()/1000000) // 纳秒转毫秒

	case *utils.OrderedMap:
		// 🔥 处理有序Map（保持字段顺序）
		convertedValues := make(map[string]interface{}, len(v.Values))
		for key, val := range v.Values {
			convertedValues[key] = convertTimesToUTC(val)
		}
		return &utils.OrderedMap{
			Keys:   v.Keys,
			Values: convertedValues,
		}

	case map[string]interface{}:
		// 递归处理对象的所有值
		result := make(map[string]interface{}, len(v))
		for key, val := range v {
			result[key] = convertTimesToUTC(val)
		}
		return result

	case []interface{}:
		// 递归处理数组的所有元素
		result := make([]interface{}, len(v))
		for i, val := range v {
			result[i] = convertTimesToUTC(val)
		}
		return result

	default:
		// 其他类型不做转换
		return v
	}
}

// validateJSONSerializable 递归检查结果是否可以安全地序列化为JSON
func validateJSONSerializable(value interface{}) error {
	switch v := value.(type) {
	case float64:
		// 检查 NaN 和 Infinity
		if math.IsNaN(v) {
			return fmt.Errorf("检测到 NaN (Not a Number),请检查数学运算 (如: undefined * 2)")
		}
		if math.IsInf(v, 0) {
			return fmt.Errorf("检测到 Infinity,请检查数学运算 (如: 1/0)")
		}
	case float32:
		v64 := float64(v)
		if math.IsNaN(v64) {
			return fmt.Errorf("检测到 NaN (Not a Number)")
		}
		if math.IsInf(v64, 0) {
			return fmt.Errorf("检测到 Infinity")
		}
	case *utils.OrderedMap:
		// 🔥 递归检查有序Map的所有值（保持字段顺序）
		for key, val := range v.Values {
			if err := validateJSONSerializable(val); err != nil {
				return fmt.Errorf("字段 '%s': %v", key, err)
			}
		}
	case map[string]interface{}:
		// 递归检查对象的所有值
		for key, val := range v {
			if err := validateJSONSerializable(val); err != nil {
				return fmt.Errorf("字段 '%s': %v", key, err)
			}
		}
	case []interface{}:
		// 递归检查数组的所有元素
		for i, val := range v {
			if err := validateJSONSerializable(val); err != nil {
				return fmt.Errorf("数组索引 [%d]: %v", i, err)
			}
		}
	}
	return nil
}

// extractErrorDetails 从 goja.Value 中提取完整错误信息（包括message和stack）
// 🔥 修复：异步代码执行时，错误信息应包含stack trace
func extractErrorDetails(errValue goja.Value) (message string, stack string) {
	// 🔥 防御性检查：防止 nil panic
	if errValue == nil || goja.IsUndefined(errValue) || goja.IsNull(errValue) {
		return "Unknown error", ""
	}

	var errorName string
	var errorMessage string
	var errorStack string

	// 🔥 使用 defer + recover 防止 ToObject panic
	defer func() {
		if r := recover(); r != nil {
			// ToObject 可能在某些情况下 panic（例如 errValue 是无效对象）
			// 这里静默处理，返回 errValue 的字符串表示
			errorMessage = errValue.String()
		}
	}()

	if obj := errValue.ToObject(nil); obj != nil {
		// 提取 error.name
		if nameVal := obj.Get("name"); nameVal != nil && !goja.IsUndefined(nameVal) && !goja.IsNull(nameVal) {
			errorName = nameVal.String()
		}

		// 提取 error.message
		if msgVal := obj.Get("message"); msgVal != nil && !goja.IsUndefined(msgVal) && !goja.IsNull(msgVal) {
			errorMessage = msgVal.String()
		}

		// 🔥 关键修复：提取 error.stack
		if stackVal := obj.Get("stack"); stackVal != nil && !goja.IsUndefined(stackVal) && !goja.IsNull(stackVal) {
			errorStack = stackVal.String()
		}

		// 如果没有message，尝试使用toString
		if errorMessage == "" {
			if toStringMethod := obj.Get("toString"); !goja.IsUndefined(toStringMethod) {
				if fn, ok := goja.AssertFunction(toStringMethod); ok {
					if result, err := fn(obj); err == nil {
						resultStr := result.String()
						if resultStr != "[object Object]" && resultStr != "" {
							errorMessage = resultStr
						}
					}
				}
			}
		}
	}

	// 构建完整的错误消息
	if errorName != "" && errorMessage != "" {
		message = fmt.Sprintf("%s: %s", errorName, errorMessage)
	} else if errorMessage != "" {
		message = errorMessage
	} else {
		// Fallback: 尝试Export
		exported := errValue.Export()
		if exported != nil {
			if exportedMap, ok := exported.(map[string]interface{}); ok {
				if msg, exists := exportedMap["message"]; exists {
					message = fmt.Sprintf("%v", msg)
				} else if len(exportedMap) == 0 {
					message = "JavaScript 错误 (无详细信息)"
				} else {
					message = fmt.Sprintf("%v", exported)
				}
			} else {
				message = fmt.Sprintf("%v", exported)
			}
		} else {
			message = "Unknown error"
		}
	}

	return message, errorStack
}

// extractErrorMessage 从 goja.Value 中提取错误消息（保留旧函数以兼容）
func extractErrorMessage(errValue goja.Value) string {
	message, _ := extractErrorDetails(errValue)
	return message
}

// extractErrorMessageLegacy 旧的实现（已废弃，保留以防万一）
func extractErrorMessageLegacy(errValue goja.Value) string {
	if errValue == nil || goja.IsUndefined(errValue) {
		return "Unknown error"
	}

	if obj := errValue.ToObject(nil); obj != nil {
		if toStringMethod := obj.Get("toString"); !goja.IsUndefined(toStringMethod) {
			if fn, ok := goja.AssertFunction(toStringMethod); ok {
				if result, err := fn(obj); err == nil {
					resultStr := result.String()
					if resultStr != "[object Object]" && resultStr != "" {
						return resultStr
					}
				}
			}
		}

		if msgVal := obj.Get("message"); !goja.IsUndefined(msgVal) {
			msgStr := msgVal.String()
			if msgStr != "" {
				return msgStr
			}
		}

		if nameVal := obj.Get("name"); !goja.IsUndefined(nameVal) {
			name := nameVal.String()
			if msgVal := obj.Get("message"); !goja.IsUndefined(msgVal) {
				msg := msgVal.String()
				if name != "" && msg != "" {
					return fmt.Sprintf("%s: %s", name, msg)
				}
			}
		}
	}

	exported := errValue.Export()
	if exported == nil {
		return "Unknown error"
	}

	if exportedMap, ok := exported.(map[string]interface{}); ok {
		if msg, exists := exportedMap["message"]; exists {
			return fmt.Sprintf("%v", msg)
		}
		if len(exportedMap) == 0 {
			return "JavaScript 错误 (无详细信息)"
		}
	}

	if err, ok := exported.(error); ok {
		return err.Error()
	}

	str := fmt.Sprintf("%v", exported)
	if str == "map[]" || str == "" {
		return "JavaScript 执行错误"
	}
	return str
}

// categorizeError 错误分类
// 🔥 优化：使用类型断言 + 字符串匹配的多层策略
//
// 分类策略：
//  1. 优先使用 goja 的结构化错误类型（更健壮）
//  2. Fallback 到字符串匹配（兼容性保证）
//  3. 提供有用的错误建议（提升用户体验）
func (e *JSExecutor) categorizeError(err error) error {
	if err == nil {
		return nil
	}

	// 🔥 第 1 层：处理 goja.Exception（运行时 JavaScript 异常）
	if gojaErr, ok := err.(*goja.Exception); ok {
		return e.categorizeGojaException(gojaErr)
	}

	// 🔥 第 2 层：处理 goja.CompilerSyntaxError（编译时语法错误）
	if syntaxErr, ok := err.(*goja.CompilerSyntaxError); ok {
		return e.categorizeCompilerError(syntaxErr)
	}

	// 🔥 第 3 层：处理 goja.InterruptedError（执行中断）
	if _, ok := err.(*goja.InterruptedError); ok {
		return &model.ExecutionError{
			Type:    "InterruptedError",
			Message: "代码执行被中断",
		}
	}

	// 🔥 第 4 层：Fallback 到字符串匹配（兼容性保证）
	return e.categorizeByMessage(err)
}

// categorizeGojaException 分类 goja.Exception（运行时 JavaScript 异常）
// 🔥 优化：利用 JavaScript 错误对象的 name 属性进行精确分类
func (e *JSExecutor) categorizeGojaException(exception *goja.Exception) error {
	// 获取 JavaScript 错误对象
	errorValue := exception.Value()

	// 尝试获取错误的 name 属性（如 "SyntaxError", "TypeError" 等）
	var errorType string
	var errorMessage string

	if obj := errorValue.ToObject(nil); obj != nil {
		// 获取 error.name
		if nameVal := obj.Get("name"); !goja.IsUndefined(nameVal) {
			errorType = nameVal.String()
		}

		// 获取 error.message
		if msgVal := obj.Get("message"); !goja.IsUndefined(msgVal) {
			errorMessage = msgVal.String()
		}
	}

	// 如果无法提取，使用 exception 的 Error() 方法
	if errorMessage == "" {
		errorMessage = exception.Error()
	}

	// 根据错误类型进行分类
	switch errorType {
	case "SyntaxError":
		return &model.ExecutionError{
			Type:    "SyntaxError",
			Message: fmt.Sprintf("语法错误: %s", errorMessage),
		}

	case "ReferenceError":
		// 尝试提取变量名并提供建议
		if strings.Contains(errorMessage, "is not defined") {
			parts := strings.Split(errorMessage, " ")
			if len(parts) > 0 {
				varName := strings.Trim(parts[0], "'\"")
				suggestions := getModuleSuggestions(varName)

				if suggestions != "" {
					return &model.ExecutionError{
						Type:    "ReferenceError",
						Message: fmt.Sprintf("变量 '%s' 未定义。%s", varName, suggestions),
					}
				}

				return &model.ExecutionError{
					Type:    "ReferenceError",
					Message: fmt.Sprintf("变量 '%s' 未定义。请检查是否需要引入相关模块或定义该变量。", varName),
				}
			}
		}

		return &model.ExecutionError{
			Type:    "ReferenceError",
			Message: fmt.Sprintf("引用错误: %s", errorMessage),
		}

	case "TypeError":
		return &model.ExecutionError{
			Type:    "TypeError",
			Message: fmt.Sprintf("类型错误: %s", errorMessage),
		}

	case "RangeError":
		return &model.ExecutionError{
			Type:    "RangeError",
			Message: fmt.Sprintf("范围错误: %s", errorMessage),
		}

	case "URIError":
		return &model.ExecutionError{
			Type:    "URIError",
			Message: fmt.Sprintf("URI 错误: %s", errorMessage),
		}

	case "EvalError":
		return &model.ExecutionError{
			Type:    "EvalError",
			Message: fmt.Sprintf("Eval 错误: %s", errorMessage),
		}

	default:
		// 未知的错误类型，返回通用的运行时错误
		return &model.ExecutionError{
			Type:    "RuntimeError",
			Message: fmt.Sprintf("运行时错误: %s", errorMessage),
		}
	}
}

// categorizeCompilerError 分类编译器错误
// 🔥 优化：利用 CompilerSyntaxError 的结构化信息
func (e *JSExecutor) categorizeCompilerError(syntaxErr *goja.CompilerSyntaxError) error {
	// 使用 CompilerSyntaxError 的 Error() 方法
	// 该方法已经包含了位置信息（如果有的话）
	message := syntaxErr.Error()

	return &model.ExecutionError{
		Type:    "SyntaxError",
		Message: fmt.Sprintf("语法错误: %s", message),
	}
}

// adjustErrorLineNumber 调整错误信息中的行号，还原为用户代码的真实行号
// lineOffset: 代码包装增加的行数（runtimePool = 4, eventLoop = 5）
func adjustErrorLineNumber(err error, lineOffset int) error {
	if err == nil || lineOffset == 0 {
		return err
	}

	// 只处理 ExecutionError 类型
	execErr, ok := err.(*model.ExecutionError)
	if !ok {
		return err
	}

	message := execErr.Message
	stack := execErr.Stack

	// 🔥 使用预编译的正则表达式匹配行号模式
	// 正则表达式已在包级别预编译，避免每次错误时重复编译
	linePatterns := []struct {
		pattern *regexp.Regexp
		format  string
	}{
		{
			pattern: linePatternLine,
			format:  "Line %d:",
		},
		{
			pattern: linePatternline,
			format:  "line %d:",
		},
		{
			pattern: linePatternColon,
			format:  ":%d:",
		},
	}

	// 🔥 修复：调整Message中的行号
	messageAdjusted := false
	for _, p := range linePatterns {
		if matches := p.pattern.FindStringSubmatch(message); len(matches) > 1 {
			// 提取行号
			lineNum, err := strconv.Atoi(matches[1])
			if err != nil {
				continue
			}

			// 调整行号（减去包装代码的行数）
			adjustedLineNum := lineNum - lineOffset
			if adjustedLineNum < 1 {
				adjustedLineNum = 1 // 确保行号至少为 1
			}

			// 替换行号
			oldLineStr := fmt.Sprintf(p.format, lineNum)
			newLineStr := fmt.Sprintf(p.format, adjustedLineNum)
			message = strings.Replace(message, oldLineStr, newLineStr, 1)
			messageAdjusted = true
			break
		}
	}

	// 🔥 新增：调整Stack中的行号（所有出现的行号都需要调整）
	if stack != "" {
		// 🔥 使用预编译的正则表达式匹配stack trace中的行号格式：user_code.js:81:12
		stack = stackPatternFull.ReplaceAllStringFunc(stack, func(match string) string {
			submatches := stackPatternFull.FindStringSubmatch(match)
			if len(submatches) > 2 {
				lineNum, err := strconv.Atoi(submatches[2])
				if err != nil {
					return match
				}

				adjustedLineNum := lineNum - lineOffset
				if adjustedLineNum < 1 {
					adjustedLineNum = 1
				}

				// 重构行号部分
				return fmt.Sprintf("%s:%d:%s", submatches[1], adjustedLineNum, submatches[3])
			}
			return match
		})

		// 🔥 使用预编译的正则表达式处理没有列号的格式：user_code.js:81
		stack = stackPatternSimple.ReplaceAllStringFunc(stack, func(match string) string {
			submatches := stackPatternSimple.FindStringSubmatch(match)
			if len(submatches) > 2 {
				lineNum, err := strconv.Atoi(submatches[2])
				if err != nil {
					return match
				}

				adjustedLineNum := lineNum - lineOffset
				if adjustedLineNum < 1 {
					adjustedLineNum = 1
				}

				return fmt.Sprintf("%s:%d%s", submatches[1], adjustedLineNum, submatches[3])
			}
			return match
		})
	}

	// 更新错误信息
	if messageAdjusted || stack != execErr.Stack {
		execErr.Message = message
		execErr.Stack = stack
		return execErr
	}

	// 如果没有调整任何内容，返回原始错误
	return err
}

// categorizeByMessage 根据错误消息字符串分类（Fallback 策略）
// 🔥 兼容性保证：处理不是 goja 类型的错误
func (e *JSExecutor) categorizeByMessage(err error) error {
	message := err.Error()

	// 检测语法错误
	if strings.Contains(message, "SyntaxError") || strings.Contains(message, "Unexpected") {
		return &model.ExecutionError{
			Type:    "SyntaxError",
			Message: fmt.Sprintf("语法错误: %s", message),
		}
	}

	// 检测引用错误
	if strings.Contains(message, "is not defined") {
		parts := strings.Split(message, " ")
		if len(parts) > 0 {
			varName := strings.Trim(parts[0], "'\"")

			suggestions := getModuleSuggestions(varName)
			if suggestions != "" {
				return &model.ExecutionError{
					Type:    "ReferenceError",
					Message: fmt.Sprintf("变量 '%s' 未定义。%s", varName, suggestions),
				}
			}

			return &model.ExecutionError{
				Type:    "ReferenceError",
				Message: fmt.Sprintf("变量 '%s' 未定义。请检查是否需要引入相关模块或定义该变量。", varName),
			}
		}
		return &model.ExecutionError{
			Type:    "ReferenceError",
			Message: fmt.Sprintf("引用错误: %s", message),
		}
	}

	// 检测类型错误
	if strings.Contains(message, "is not a function") ||
		strings.Contains(message, "Cannot read property") ||
		strings.Contains(message, "TypeError") {
		return &model.ExecutionError{
			Type:    "TypeError",
			Message: fmt.Sprintf("类型错误: %s", message),
		}
	}

	// 默认：运行时错误
	return &model.ExecutionError{
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

	totalExecs := atomic.LoadInt64(&e.stats.TotalExecutions)
	if totalExecs > 0 {
		e.stats.TotalTime += executionTime.Milliseconds()
		e.stats.AvgExecutionTime = e.stats.TotalTime / totalExecs
	}

	successful := atomic.LoadInt64(&e.stats.SuccessfulExecs)
	if totalExecs > 0 {
		e.stats.SuccessRate = float64(successful) / float64(totalExecs) * 100
	}
}

// GetStats 获取统计信息
func (e *JSExecutor) GetStats() *model.ExecutorStats {
	e.mutex.RLock()
	defer e.mutex.RUnlock()

	goruntime.ReadMemStats(&e.stats.MemStats)
	e.stats.CurrentExecutions = atomic.LoadInt64(&e.currentExecs)

	stats := *e.stats
	return &stats
}

// GetCacheStats 获取代码缓存统计信息
func (e *JSExecutor) GetCacheStats() map[string]interface{} {
	e.codeCacheMutex.RLock()
	defer e.codeCacheMutex.RUnlock()

	return e.codeCache.Stats()
}

// GetValidationCacheStats 获取验证缓存统计信息
// 🔥 性能监控：查看验证缓存的命中率
func (e *JSExecutor) GetValidationCacheStats() map[string]interface{} {
	e.validationCacheMutex.RLock()
	defer e.validationCacheMutex.RUnlock()

	return e.validationCache.Stats()
}

// GetRuntimePoolHealth 获取 Runtime 池健康状态
func (e *JSExecutor) GetRuntimePoolHealth() map[string]interface{} {
	e.healthMutex.RLock()
	defer e.healthMutex.RUnlock()

	totalRuntimes := len(e.runtimeHealth)
	totalExecutions := int64(0)
	totalErrors := int64(0)
	oldestRuntime := time.Now()

	for _, health := range e.runtimeHealth {
		// 🔥 使用 atomic.Int64 读取所有字段
		totalExecutions += health.executionCount.Load()
		totalErrors += health.errorCount.Load()
		createdAt := time.Unix(0, health.createdAtNano.Load())
		if createdAt.Before(oldestRuntime) {
			oldestRuntime = createdAt
		}
	}

	errorRate := 0.0
	if totalExecutions > 0 {
		errorRate = float64(totalErrors) / float64(totalExecutions) * 100
	}

	return map[string]interface{}{
		"poolSize":        e.poolSize,
		"trackedRuntimes": totalRuntimes,
		"totalExecutions": totalExecutions,
		"totalErrors":     totalErrors,
		"errorRate":       errorRate,
		"oldestRuntime":   time.Since(oldestRuntime).String(),
	}
}

// generateExecutionId 生成执行ID
func (e *JSExecutor) generateExecutionId() string {
	bytes := make([]byte, 8)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// getCompiledCode 获取编译后的代码 (带 LRU 缓存 + singleflight 防穿透)
// 🔥 优化：使用 singleflight 避免多个请求同时编译相同代码
//
// 缓存穿透场景：
//   - 多个请求同时到达，使用相同代码
//   - 都查询缓存 miss
//   - 都开始编译（浪费 CPU）
//
// singleflight 优化：
//   - 第一个请求：执行编译
//   - 后续请求：等待第一个完成，共享结果
//   - 节省 90%+ 重复编译
func (e *JSExecutor) getCompiledCode(code string) (*goja.Program, error) {
	codeHash := hashCode(code)

	// 🔥 使用 singleflight 防止缓存穿透
	// Do() 会确保相同 key 只执行一次，其他请求等待并共享结果
	result, err, shared := e.compileGroup.Do(codeHash, func() (interface{}, error) {
		// 双重检查：可能在等待期间已被其他 goroutine 缓存
		e.codeCacheMutex.RLock()
		if program, found := e.codeCache.Get(codeHash); found {
			e.codeCacheMutex.RUnlock()
			return program, nil
		}
		e.codeCacheMutex.RUnlock()

		// 编译代码
		program, err := goja.Compile("user_code.js", code, true)
		if err != nil {
			return nil, err
		}

		// 写入缓存
		e.codeCacheMutex.Lock()
		evicted := e.codeCache.Put(codeHash, program)
		e.codeCacheMutex.Unlock()

		if evicted {
			utils.Debug("代码编译缓存已满，驱逐最久未使用的程序")
		}

		return program, nil
	})

	if err != nil {
		return nil, err
	}

	// 可选：记录共享统计（调试用）
	if shared {
		utils.Debug("代码编译结果共享（避免重复编译）",
			zap.String("code_hash", codeHash[:16]))
	}

	return result.(*goja.Program), nil
}

// hashCode 使用 xxHash 计算代码哈希
//
// 🔥 性能优化：使用 xxHash（比 SHA256 快 20 倍，碰撞概率 2^-64 对缓存足够）
//   - 在实际使用中，碰撞几乎不可能发生
//
// 性能对比（10KB 代码）：
//   - SHA256: ~200μs（验证 + 编译各 100μs）
//   - xxHash: ~10μs（验证 + 编译各 5μs）
//   - 提升：20x（缓存命中场景）
//
// 🔥 编码优化：使用 hex 编码 + 固定长度
//   - 输出：固定 16 个十六进制字符
//   - 格式："%016x" (左侧零填充)
//   - 优点：避免 slice bounds out of range 错误
//   - 示例：短代码 → "000a1b2c3d4e5f67"
//   - 示例：长代码 → "a3f5c8d9e2b14c7f"
func hashCode(code string) string {
	h := xxhash.Sum64String(code)
	return fmt.Sprintf("%016x", h) // 固定 16 字符十六进制，左侧零填充
}

// startHealthChecker 启动健康检查器
func (e *JSExecutor) startHealthChecker() {
	e.wg.Add(1)
	go func() {
		defer e.wg.Done()

		ticker := time.NewTicker(e.healthCheckInterval)
		defer ticker.Stop()

		utils.Info("运行时健康检查器已启动", zap.Duration("interval", e.healthCheckInterval))

		for {
			select {
			case <-ticker.C:
				e.checkAndFixRuntimes()
			case <-e.shutdown:
				utils.Info("运行时健康检查器已停止")
				return
			}
		}
	}()
}

// checkAndFixRuntimes 检查并修复有问题的 Runtime（优化版）
// 🔥 优化：读写锁分离 + 细粒度锁，持锁时间从 300ms 降低到 5-10ms
func (e *JSExecutor) checkAndFixRuntimes() {
	// 🔥 阶段 1: 快速读取健康数据（只用读锁，~2ms）
	snapshot := e.captureHealthSnapshot()

	// 🔥 阶段 2: 在锁外分析数据（无锁，~5ms）
	analysis := e.analyzeRuntimeHealth(snapshot)

	// 🔥 阶段 3: 根据分析结果执行修复（细粒度锁，每次 <1ms）
	e.applyHealthFixes(analysis)

	// 🔥 阶段 4: 池大小调整（细粒度锁）
	e.adjustPoolSize(analysis)

	// 注：不需要定期补充，因为销毁时实时补充已足够
}

// rebuildRuntimeUnsafe 已废弃，使用 rebuildRuntimeSafe 替代
// 保留此方法仅为向后兼容（如果有其他地方调用）
func (e *JSExecutor) rebuildRuntimeUnsafe(oldRuntime *goja.Runtime) {
	// 直接调用新的安全版本
	// 注意：调用者不应该持有 healthMutex 锁
	e.rebuildRuntimeSafe(oldRuntime)
}

// replenishOneRuntime 实时补充：销毁1个立即补充1个
// 🔥 设计理念：保持池大小恒定，性能最稳定
// 🔥 优势：
//   - 实现简单（无需阈值判断）
//   - 池永不枯竭（恒定大小）
//   - 开销可控（只在销毁时创建）
//   - 配合空闲超时自动收缩
func (e *JSExecutor) replenishOneRuntime() {
	// 检查是否正在关闭
	select {
	case <-e.shutdown:
		return
	default:
	}

	// 检查是否超过最大池大小（安全保护）
	currentSize := atomic.LoadInt32(&e.currentPoolSize)
	if int(currentSize) >= e.maxPoolSize {
		utils.Debug("已达最大池大小，跳过补充",
			zap.Int32("current_size", currentSize),
			zap.Int("max_pool_size", e.maxPoolSize))
		return
	}

	// 创建新Runtime
	rt := goja.New()
	if err := e.setupRuntime(rt); err != nil {
		utils.Error("补充Runtime失败", zap.Error(err))
		return
	}

	// 注册健康信息
	now := time.Now().UnixNano()
	e.healthMutex.Lock()
	health := &runtimeHealthInfo{}
	health.createdAtNano.Store(now)
	health.lastUsedAtNano.Store(now)
	health.executionCount.Store(0)
	health.errorCount.Store(0)
	e.runtimeHealth[rt] = health
	e.healthMutex.Unlock()

	// 放入池中
	select {
	case e.runtimePool <- rt:
		atomic.AddInt32(&e.currentPoolSize, 1)
		utils.Debug("实时补充Runtime成功",
			zap.Int("pool_count", len(e.runtimePool)),
			zap.Int32("current_size", atomic.LoadInt32(&e.currentPoolSize)))
	default:
		// 池已满（正常情况，其他goroutine已补充）
		e.healthMutex.Lock()
		delete(e.runtimeHealth, rt)
		e.healthMutex.Unlock()
		utils.Debug("补充时池已满，跳过",
			zap.Int("pool_count", len(e.runtimePool)))
	}
}

// Shutdown 优雅关闭执行器
func (e *JSExecutor) Shutdown() {
	utils.Info("正在关闭 JavaScript 执行器")

	// 1. 停止接收新任务
	close(e.shutdown)

	// 2. 等待现有任务完成
	e.wg.Wait()

	// 🔥 3. 关闭所有模块（释放资源）
	// Graceful Shutdown 支持：显式关闭 HTTP 连接等资源
	if err := e.moduleRegistry.CloseAll(); err != nil {
		utils.Warn("关闭模块时出现错误", zap.Error(err))
	}

	// 4. 关闭 Runtime 池
	close(e.runtimePool)
	for runtime := range e.runtimePool {
		_ = runtime
	}

	utils.Info("JavaScript 执行器已关闭")
}

// ============================================================================
// 🔥 健康检查器优化（读写锁分离 + 细粒度锁）
// ============================================================================

// healthAnalysis 健康分析结果
//
// 此结构体包含健康检查的分析结果，用于决定池的调整策略
type healthAnalysis struct {
	problemRuntimes               []*goja.Runtime // 需要重建的问题 Runtime（错误率高）
	idleRuntimes                  []*goja.Runtime // 空闲时间超过阈值的 Runtime
	currentSize                   int             // 当前池大小
	availableSlots                int             // 当前可用的 Runtime 数量
	minPoolSize                   int             // 最小池大小限制
	maxPoolSize                   int             // 最大池大小限制
	idleTimeout                   time.Duration   // 空闲超时时间（默认 5 分钟）
	poolExpansionThresholdPercent float64         // 池扩展阈值百分比（从配置加载）
}

// shouldShrink 判断是否需要收缩池
//
// 收缩条件（必须同时满足）：
//   - 当前池大小 > 最小池大小（有收缩空间）
//   - 空闲 Runtime 数量 > 5（避免频繁小幅调整）
//
// 🔒 抖动防护：
//   - 结合 5 分钟空闲超时：只有持续空闲的 Runtime 才会被标记
//   - 结合渐进式收缩：每次最多释放 10 个
func (ha *healthAnalysis) shouldShrink() bool {
	return ha.currentSize > ha.minPoolSize && len(ha.idleRuntimes) > 5
}

// shouldExpand 判断是否需要扩展池
//
// 扩展条件（必须同时满足）：
//   - 可用 Runtime < 当前池大小的 10%（阈值：poolExpansionThresholdPercent = 0.1）
//   - 当前池大小 < 最大池大小（有扩展空间）
//
// 🔒 抖动防护：
//   - 10% 阈值比较保守，避免过早扩展
//   - 只有真正缺乏资源时才触发
func (ha *healthAnalysis) shouldExpand() bool {
	threshold := int(float64(ha.currentSize) * ha.poolExpansionThresholdPercent)
	return ha.availableSlots < threshold && ha.currentSize < ha.maxPoolSize
}

// calculateExpansion 计算需要扩展的数量
//
// 扩展策略：
//  1. 基准：当前池大小的 20%（currentSize / 5）
//  2. 下限：至少扩展 5 个（避免多次小幅扩展）
//  3. 上限：不超过 MAX_RUNTIME_POOL_SIZE
//
// 设计理念：
//   - 使用比例而非固定数量：适应不同规模的池
//   - 20% 是平衡值：既不会过于激进，也不会响应过慢
func (ha *healthAnalysis) calculateExpansion() int {
	toAdd := ha.currentSize / 5
	if toAdd < 5 {
		toAdd = 5
	}
	if ha.currentSize+toAdd > ha.maxPoolSize {
		toAdd = ha.maxPoolSize - ha.currentSize
	}
	return toAdd
}

// calculateShrink 计算可以收缩的数量
//
// 收缩策略（取最小值）：
//  1. 基准：currentSize - minPoolSize（最多可以释放的数量）
//  2. 限制 1：空闲数量的一半（渐进式释放，避免过度收缩）
//  3. 限制 2：最多 10 个（避免单次大规模调整）
//
// 🔒 抖动防护机制：
//   - 每次最多 10 个：从 200 收缩到 100 需要约 15 分钟（30次 × 30秒）
//   - 释放一半：给流量恢复留出缓冲
//   - 如果流量在收缩期间回升，会自动停止收缩
func (ha *healthAnalysis) calculateShrink() int {
	canRelease := ha.currentSize - ha.minPoolSize
	if canRelease > len(ha.idleRuntimes)/2 {
		canRelease = len(ha.idleRuntimes) / 2
	}
	if canRelease > 10 {
		canRelease = 10
	}
	return canRelease
}

// captureHealthSnapshot 快速捕获健康数据快照
// 🔥 两阶段拷贝：持锁拷贝指针（50-100μs）→ 锁外 atomic 读取数据（完全并发）
func (e *JSExecutor) captureHealthSnapshot() map[*goja.Runtime]*runtimeHealthInfo {
	// 🔥 第 1 阶段：持锁只拷贝指针（50-100μs）
	e.healthMutex.RLock()
	runtimeRefs := make(map[*goja.Runtime]*runtimeHealthInfo, len(e.runtimeHealth))
	for rt, health := range e.runtimeHealth {
		runtimeRefs[rt] = health // 只拷贝指针，极快
	}
	e.healthMutex.RUnlock()

	// 🔥 第 2 阶段：锁外 atomic 读取（1-2ms，完全并发）
	snapshot := make(map[*goja.Runtime]*runtimeHealthInfo, len(runtimeRefs))
	for rt, health := range runtimeRefs {
		snapshotHealth := &runtimeHealthInfo{}
		snapshotHealth.createdAtNano.Store(health.createdAtNano.Load())   // ✅ atomic.Int64.Load()
		snapshotHealth.lastUsedAtNano.Store(health.lastUsedAtNano.Load()) // ✅ atomic.Int64.Load()
		snapshotHealth.executionCount.Store(health.executionCount.Load()) // ✅ atomic.Int64.Load()
		snapshotHealth.errorCount.Store(health.errorCount.Load())         // ✅ atomic.Int64.Load()
		snapshot[rt] = snapshotHealth
	}

	return snapshot
}

// analyzeRuntimeHealth 分析健康数据（无锁操作）
// 🔥 优化点：所有分析都在锁外进行，不阻塞其他操作
func (e *JSExecutor) analyzeRuntimeHealth(snapshot map[*goja.Runtime]*runtimeHealthInfo) *healthAnalysis {
	now := time.Now()
	analysis := &healthAnalysis{
		problemRuntimes:               make([]*goja.Runtime, 0),
		idleRuntimes:                  make([]*goja.Runtime, 0),
		currentSize:                   int(atomic.LoadInt32(&e.currentPoolSize)),
		availableSlots:                len(e.runtimePool),
		minPoolSize:                   e.minPoolSize,
		maxPoolSize:                   e.maxPoolSize,
		idleTimeout:                   e.idleTimeout,
		poolExpansionThresholdPercent: e.poolExpansionThresholdPercent,
	}

	// 遍历分析（在锁外进行，不阻塞其他操作）
	for rt, health := range snapshot {
		// 检测高错误率
		errorCount := health.errorCount.Load()
		executionCount := health.executionCount.Load()
		if errorCount > int64(e.minErrorCountForCheck) && executionCount > 0 {
			errorRate := float64(errorCount) / float64(executionCount)
			if errorRate > e.maxErrorRateThreshold {
				utils.Warn("检测到高错误率运行时",
					zap.Float64("error_rate_percent", errorRate*100),
					zap.Int64("execution_count", executionCount),
					zap.Int64("error_count", errorCount))
				analysis.problemRuntimes = append(analysis.problemRuntimes, rt)
			}
		}

		// 🔥 纳秒时间戳 → time.Time（用于时间计算）
		lastUsedAt := time.Unix(0, health.lastUsedAtNano.Load())
		createdAt := time.Unix(0, health.createdAtNano.Load())

		// 检测空闲 Runtime
		if now.Sub(lastUsedAt) > e.idleTimeout {
			analysis.idleRuntimes = append(analysis.idleRuntimes, rt)
		}

		// 统计长期运行的 Runtime（异步日志，避免阻塞）
		if now.Sub(createdAt) > e.longRunningThreshold && executionCount > int64(e.minExecutionCountForStats) {
			go utils.Debug("检测到长期运行的运行时",
				zap.Time("created_at", createdAt),
				zap.Int64("execution_count", executionCount))
		}
	}

	return analysis
}

// rebuildRuntimeSafe 安全地重建 Runtime（细粒度锁）
// 🔥 优化点：耗时的 setupRuntime 在锁外执行，只在更新映射时短暂加锁
func (e *JSExecutor) rebuildRuntimeSafe(oldRuntime *goja.Runtime) {
	// 🔥 在锁外创建新的 Runtime（耗时操作 50-100ms）
	newRuntime := goja.New()
	if err := e.setupRuntime(newRuntime); err != nil {
		utils.Error("重建运行时失败", zap.Error(err))
		// 保留旧的 Runtime，不进行替换
		return
	}

	// 🔥 短暂加锁更新映射（< 1ms）
	// 注意：使用 atomic.Int64.Store() 初始化，提供类型安全
	now := time.Now().UnixNano()
	e.healthMutex.Lock()
	delete(e.runtimeHealth, oldRuntime)
	health := &runtimeHealthInfo{}
	health.createdAtNano.Store(now)  // atomic.Int64.Store()
	health.lastUsedAtNano.Store(now) // atomic.Int64.Store()
	health.executionCount.Store(0)   // atomic.Int64.Store()
	health.errorCount.Store(0)       // atomic.Int64.Store()
	e.runtimeHealth[newRuntime] = health
	e.healthMutex.Unlock()

	// 🔥 放回池中（不需要 healthMutex）
	select {
	case e.runtimePool <- newRuntime:
		utils.Debug("运行时重建完成并已放回池中")
	default:
		utils.Warn("运行时池已满，新运行时将被丢弃")
	}
}

// applyHealthFixes 应用健康修复（细粒度锁）
// 🔥 优化点：每个 Runtime 单独加锁，避免长时间持锁
func (e *JSExecutor) applyHealthFixes(analysis *healthAnalysis) {
	// 重建问题 Runtime
	for _, rt := range analysis.problemRuntimes {
		utils.Debug("重建高错误率运行时")
		e.rebuildRuntimeSafe(rt)
	}

	// 释放空闲 Runtime
	if analysis.shouldShrink() {
		e.shrinkPool(analysis)
	}

	if len(analysis.problemRuntimes) > 0 {
		utils.Info("健康修复已应用", zap.Int("rebuilt_runtimes", len(analysis.problemRuntimes)))
	}
}

// shrinkPool 收缩池大小（细粒度锁）
//
// 🔥 优化点：批量删除，短暂加锁
//
// 🔒 池抖动防护机制说明：
//
//	当前设计已经有多层保护，无需额外的"冷却时间"（cooldown period）
//
//	**防护层级**：
//	1. 空闲超时（5分钟）：Runtime 必须持续空闲 5 分钟才会被标记为可释放
//	2. 健康检查间隔（30秒）：最快也要 30 秒才调整一次，不是实时响应
//	3. 渐进式收缩：每次最多释放空闲数量的一半，且上限 10 个
//	4. 收缩条件：必须有至少 5 个空闲 Runtime 才会触发
//	5. 扩展阈值（10%）：只有可用 Runtime < 10% 时才扩展
//
//	**实际效果**：
//	- 从 200 收缩到 100 需要约 15 分钟（30 次 × 30秒，每次 10 个）
//	- 如果流量在这期间回升，收缩会自动停止
//	- 即使周期性流量（1小时一次高峰），CPU 开销 < 0.2%
//	- 5 分钟空闲超时已是天然缓冲期，无需额外冷却时间
//
//	**不同周期流量的抖动风险评估**：
//
//	| 流量周期 | 空闲时间 | 抖动风险 | 建议配置 |
//	|---------|---------|---------|---------|
//	| < 10分钟 | < 5分钟 | 🟢 无风险 | 默认即可（IDLE_TIMEOUT=5分钟）|
//	| 15-30分钟 | 7-20分钟 | 🟡 中等 | ⚠️ IDLE_TIMEOUT=10分钟 或 提高 MIN_POOL_SIZE |
//	| > 60分钟 | > 50分钟 | 🟢 低风险 | 默认即可 |
//
//	**参考数据**：
//
//	1. 长周期（60分钟高峰一次）：
//	   - 扩展：5 分钟（100 → 200）
//	   - 收缩：15 分钟（200 → 100）
//	   - 稳定期：40 分钟（无调整）
//	   - CPU 开销：0.14%/小时
//	   - 评估：✅ 默认配置良好
//
//	2. 中等周期（15分钟高峰一次）：
//	   - 扩展：5 分钟（100 → 200）
//	   - 低谷：8 分钟（部分空闲）
//	   - 收缩：开始收缩（5分钟空闲超时触发）
//	   - 下次高峰：需要重新扩展
//	   - CPU 开销：0.28%/小时（2倍）
//	   - 评估：⚠️ 存在抖动，建议 IDLE_TIMEOUT=10分钟
//
//	3. 短周期（5分钟高峰一次）：
//	   - Runtime 永远不会空闲 5 分钟
//	   - 池大小自然稳定
//	   - 评估：✅ 无抖动风险

// ============================================================================
// 🔥 自适应冷却时间机制
// ============================================================================

// calculateAdaptiveCooldown 计算自适应冷却时间
//
// 核心思想：
//
//	根据最近的池调整频率，动态计算冷却时间
//	- 高频调整（频繁周期性流量）→ 增加冷却时间
//	- 低频调整（偶尔波动）→ 无冷却时间
//
// 流量模式识别：
//
//	统计最近 30 分钟内的调整次数
//	- >= 4 次：15 分钟周期（冷却 10 分钟）
//	- >= 3 次：20 分钟周期（冷却 8 分钟）
//	- >= 2 次：30 分钟周期（冷却 5 分钟）
//	- < 2 次：低频或首次（无冷却）
//
// 设计考量：
//  1. 观察窗口 30 分钟：足够识别流量模式
//  2. 自动清理过期记录：避免内存泄漏
//  3. 使用读写锁：允许并发读取
//  4. 冷却时间保守：避免过度限制
//
// 性能开销：
//   - 每次调用：~1-2μs（遍历小数组 + 时间比较）
//   - 调用频率：每 30 秒一次（健康检查时）
//   - 总开销：可忽略不计
func (e *JSExecutor) calculateAdaptiveCooldown() time.Duration {
	e.adaptiveCooldownLock.RLock()
	defer e.adaptiveCooldownLock.RUnlock()

	now := time.Now()
	observationWindow := 30 * time.Minute
	cutoff := now.Add(-observationWindow)

	// 统计观察窗口内的调整次数
	recentAdjustments := 0
	for _, t := range e.recentAdjustmentLog {
		if t.After(cutoff) {
			recentAdjustments++
		}
	}

	// 根据频率动态决策冷却时间
	switch {
	case recentAdjustments >= 4:
		// 15 分钟周期：每小时 4 次高峰
		// 冷却 10 分钟，防止在高峰间隙收缩
		return 10 * time.Minute

	case recentAdjustments >= 3:
		// 20 分钟周期：每小时 3 次高峰
		// 冷却 8 分钟
		return 8 * time.Minute

	case recentAdjustments >= 2:
		// 30 分钟周期：每小时 2 次高峰
		// 冷却 5 分钟
		return 5 * time.Minute

	default:
		// 低频调整或首次
		// 无冷却时间，立即响应
		return 0
	}
}

// recordAdjustment 记录池调整事件
//
// 职责：
//  1. 记录调整时间到历史日志
//  2. 清理过期记录（> 30 分钟）
//  3. 更新最后调整时间
//
// 调用时机：
//   - shrinkPool：收缩完成后
//   - adjustPoolSize：扩展完成后
//
// 内存管理：
//   - 自动清理过期记录
//   - 典型大小：< 10 条记录（30 分钟内）
//   - 内存占用：< 1KB
func (e *JSExecutor) recordAdjustment(isExpand bool) {
	e.adaptiveCooldownLock.Lock()
	defer e.adaptiveCooldownLock.Unlock()

	now := time.Now()

	// 更新最后调整时间
	if isExpand {
		e.lastExpandTime = now
	} else {
		e.lastShrinkTime = now
	}

	// 添加到调整日志
	e.recentAdjustmentLog = append(e.recentAdjustmentLog, now)

	// 🔥 清理过期记录（保留最近 30 分钟）
	// 避免内存泄漏和无限增长
	retentionPeriod := 30 * time.Minute
	cutoff := now.Add(-retentionPeriod)

	// 找到第一个未过期的记录
	validStart := 0
	for i, t := range e.recentAdjustmentLog {
		if t.After(cutoff) {
			validStart = i
			break
		}
	}

	// 只保留未过期的记录
	if validStart > 0 {
		// 🔥 创建新切片，完全释放旧底层数组（避免内存泄漏）
		newLog := make([]time.Time, len(e.recentAdjustmentLog)-validStart)
		copy(newLog, e.recentAdjustmentLog[validStart:])
		e.recentAdjustmentLog = newLog

		utils.Debug("清理过期调整记录",
			zap.Int("removed_count", validStart),
			zap.Int("remaining_count", len(e.recentAdjustmentLog)))
	}
}

func (e *JSExecutor) shrinkPool(analysis *healthAnalysis) {
	// 🔥 自适应冷却时间检查
	// 根据最近的调整频率，动态决定是否需要冷却
	cooldown := e.calculateAdaptiveCooldown()
	if cooldown > 0 {
		e.adaptiveCooldownLock.RLock()
		timeSinceLastShrink := time.Since(e.lastShrinkTime)
		e.adaptiveCooldownLock.RUnlock()

		if timeSinceLastShrink < cooldown {
			utils.Debug("跳过收缩（自适应冷却期内）",
				zap.Duration("cooldown", cooldown),
				zap.Duration("time_since_last", timeSinceLastShrink),
				zap.Int("recent_adjustments", len(e.recentAdjustmentLog)))
			return
		}
	}

	canRelease := analysis.calculateShrink()

	utils.Debug("池收缩中",
		zap.Int("current_size", analysis.currentSize),
		zap.Int("min_size", analysis.minPoolSize),
		zap.Int("idle_count", len(analysis.idleRuntimes)),
		zap.Int("plan_to_release", canRelease),
		zap.Duration("adaptive_cooldown", cooldown))

	// 选择要释放的 Runtime
	toRelease := analysis.idleRuntimes
	if len(toRelease) > canRelease {
		toRelease = toRelease[:canRelease]
	}

	// 批量删除 Runtime 的健康信息
	e.healthMutex.Lock()
	for _, rt := range toRelease {
		delete(e.runtimeHealth, rt)
	}
	e.healthMutex.Unlock()

	// 更新计数器（原子操作，不需要锁）
	released := len(toRelease)
	atomic.AddInt32(&e.currentPoolSize, -int32(released))

	// 🔥 记录调整事件（用于自适应冷却时间计算）
	e.recordAdjustment(false) // false = 收缩

	utils.Info("池收缩完成",
		zap.Int("released", released),
		zap.Int32("current_pool_size", atomic.LoadInt32(&e.currentPoolSize)),
		zap.Duration("adaptive_cooldown", cooldown))
}

// adjustPoolSize 调整池大小（细粒度锁）
//
// 🔥 优化点：批量创建 Runtime 在锁外，只在更新映射时加锁
//
// 🔒 扩展策略说明：
//
//	**触发条件**（参见 shouldExpand）：
//	- 可用 Runtime < 当前池大小的 10%（保守阈值）
//	- 当前池大小 < MAX_RUNTIME_POOL_SIZE
//
//	**扩展策略**（参见 calculateExpansion）：
//	- 每次扩展当前池大小的 20%（toAdd = currentSize / 5）
//	- 最少扩展 5 个
//	- 不超过 MAX_RUNTIME_POOL_SIZE
//
//	**与收缩策略的平衡**：
//	- 扩展：快速响应（10% 阈值 + 20% 增量）
//	- 收缩：缓慢释放（5分钟空闲 + 每次最多 10 个）
//	- 目的：优先保证性能，内存次之
//
//	**示例**（MIN=50, MAX=200）：
//	- 池大小 100，可用 8 个  → 触发扩展（8 < 10）
//	- 扩展数量：100 / 5 = 20 个 → 池变为 120
//	- 池大小 120，可用 10 个 → 触发扩展（10 < 12）
//	- 扩展数量：120 / 5 = 24 个 → 池变为 144
//	- 池大小 144，可用 20 个 → 不扩展（20 > 14.4）
func (e *JSExecutor) adjustPoolSize(analysis *healthAnalysis) {
	if !analysis.shouldExpand() {
		return
	}

	toAdd := analysis.calculateExpansion()
	if toAdd <= 0 {
		return
	}

	utils.Debug("池扩展中",
		zap.Int("current_size", analysis.currentSize), zap.Int("available_slots", analysis.availableSlots), zap.Int("plan_to_add", toAdd))

	// 🔥 在循环外批量创建（无锁，耗时操作）
	newRuntimes := make([]*goja.Runtime, 0, toAdd)
	for i := 0; i < toAdd; i++ {
		rt := goja.New()
		if err := e.setupRuntime(rt); err != nil {
			utils.Error("扩展池时创建运行时失败", zap.Error(err))
			continue // 跳过这个失败的 Runtime，继续创建其他的
		}
		newRuntimes = append(newRuntimes, rt)
	}

	// 🔥 批量加锁更新映射（快速）
	// 性能优化说明：
	//   - ✅ 正确做法：在循环外加锁一次（当前实现）
	//     扩展 10 个 Runtime：2 次 mutex 操作（1 Lock + 1 Unlock）
	//     扩展 100 个 Runtime：仍然 2 次操作，持锁时间 ~100μs
	//   - ❌ 错误做法：在循环内重复加锁
	//     扩展 10 个 Runtime：20 次 mutex 操作（性能损失 90%）
	//     扩展 100 个 Runtime：200 次操作（性能损失 99%）
	//   - 批量加锁是处理批量数据的标准优化模式
	// 并发安全说明：
	//   - 使用 atomic.Int64.Store() 初始化，提供编译时类型安全
	//   - 因为新 Runtime 尚未发布到池，无并发访问
	//   - createdAtNano/lastUsedAtNano 使用统一的 now，保证一致性
	// 批量注册新 Runtime 的健康信息
	now := time.Now().UnixNano()
	e.healthMutex.Lock()
	for _, rt := range newRuntimes {
		health := &runtimeHealthInfo{}
		health.createdAtNano.Store(now)
		health.lastUsedAtNano.Store(now)
		health.executionCount.Store(0)
		health.errorCount.Store(0)
		e.runtimeHealth[rt] = health
	}
	e.healthMutex.Unlock()

	// 放入池中（不需要 healthMutex）
	added := 0
AddLoop:
	for _, rt := range newRuntimes {
		select {
		case e.runtimePool <- rt:
			atomic.AddInt32(&e.currentPoolSize, 1)
			added++
		default:
			utils.Warn("运行时池已满，停止扩展")
			break AddLoop
		}
	}

	// 🔥 记录调整事件（用于自适应冷却时间计算）
	if added > 0 {
		e.recordAdjustment(true) // true = 扩展
	}

	utils.Info("池扩展完成",
		zap.Int("added", added),
		zap.Int32("current_pool_size", atomic.LoadInt32(&e.currentPoolSize)))
}

// ============================================================================
// 🔥 错误定位辅助函数
// ============================================================================

// findPatternInOriginalCode 在原始代码中查找模式的位置
// 参数:
//   - originalCode: 原始代码（包含注释和字符串）
//   - cleanedCode: 清理后的代码（去除了注释和字符串）
//   - cleanedIndex: 模式在 cleanedCode 中的索引位置
//   - pattern: 要查找的模式字符串
//
// 返回: lineNum, colNum, lineContent
func (e *JSExecutor) findPatternInOriginalCode(originalCode, cleanedCode string, cleanedIndex int, pattern string) (int, int, string) {
	// 直接在原始代码中搜索模式
	// 因为危险模式通常不会出现在字符串或注释中（如果出现也应该被检测）
	idx := strings.Index(originalCode, pattern)
	if idx == -1 {
		// 如果找不到，使用 cleanedCode 的位置作为近似值
		return e.findLineAndColumn(cleanedCode, cleanedIndex)
	}

	// 在原始代码中计算行号和列号
	return e.findLineAndColumn(originalCode, idx)
}

// findLineAndColumn 根据字符索引查找行号、列号和该行内容
// 返回值: lineNum (从1开始), colNum (从1开始), lineContent
func (e *JSExecutor) findLineAndColumn(code string, index int) (int, int, string) {
	if index < 0 || index >= len(code) {
		return 1, 1, ""
	}

	lineNum := 1
	colNum := 1
	lineStart := 0

	// 遍历代码，计算行号和列号
	for i := 0; i < index; i++ {
		if code[i] == '\n' {
			lineNum++
			colNum = 1
			lineStart = i + 1
		} else {
			colNum++
		}
	}

	// 提取当前行内容
	lineEnd := lineStart
	for lineEnd < len(code) && code[lineEnd] != '\n' {
		lineEnd++
	}
	lineContent := code[lineStart:lineEnd]

	// 限制行内容长度，避免输出过长
	maxLineLength := 100
	if len(lineContent) > maxLineLength {
		// 尝试截取匹配位置附近的内容
		contextStart := colNum - 1 - 20 // 匹配位置前20个字符
		if contextStart < 0 {
			contextStart = 0
		}
		contextEnd := contextStart + maxLineLength
		if contextEnd > len(lineContent) {
			contextEnd = len(lineContent)
		}
		lineContent = "..." + lineContent[contextStart:contextEnd]
		if contextEnd < len(lineContent) {
			lineContent += "..."
		}
	}

	return lineNum, colNum, strings.TrimSpace(lineContent)
}
