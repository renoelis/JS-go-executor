package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync/atomic"
	"time"

	"flow-codeblock-go/model"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/buffer"
	"github.com/dop251/goja_nodejs/console"
	"github.com/dop251/goja_nodejs/eventloop"
	"github.com/dop251/goja_nodejs/process"
	"github.com/dop251/goja_nodejs/url"
)

// executeWithRuntimePool 使用Runtime池执行代码（同步代码，高性能）
func (e *JSExecutor) executeWithRuntimePool(code string, input map[string]interface{}) (*model.ExecutionResult, error) {
	var runtime *goja.Runtime
	var isTemporary bool

	select {
	case runtime = <-e.runtimePool:
		isTemporary = false

		e.healthMutex.Lock()
		if health, exists := e.runtimeHealth[runtime]; exists {
			health.lastUsedAt = time.Now()
			health.executionCount++
		}
		e.healthMutex.Unlock()

		defer func() {
			e.cleanupRuntime(runtime)
			select {
			case e.runtimePool <- runtime:
			default:
				log.Printf("⚠️  Runtime池已满，丢弃Runtime")
			}
		}()

	case <-time.After(5 * time.Second):
		log.Printf("⚠️  Runtime池超时，创建临时Runtime")
		runtime = goja.New()
		e.setupRuntime(runtime)
		isTemporary = true
	}

	executionId := e.generateExecutionId()
	ctx, cancel := context.WithTimeout(context.Background(), e.executionTimeout)
	defer cancel()

	runtime.Set("input", input)
	runtime.Set("__executionId", executionId)
	runtime.Set("__startTime", time.Now().UnixNano()/1e6)

	wrappedCode := fmt.Sprintf(`
		(function() {
			'use strict';
			try {
				%s
			} catch (error) {
				throw new Error('代码执行错误: ' + (error.message || error));
			}
		})()
	`, code)

	program, err := e.getCompiledCode(wrappedCode)
	if err != nil {
		return nil, &model.ExecutionError{
			Type:    "CompilationError",
			Message: fmt.Sprintf("代码编译失败: %v", err),
		}
	}

	resultChan := make(chan *model.ExecutionResult, 1)
	errorChan := make(chan error, 1)

	go func() {
		defer func() {
			if r := recover(); r != nil {
				errorChan <- &model.ExecutionError{
					Type:    "RuntimeError",
					Message: fmt.Sprintf("代码执行panic: %v", r),
				}
			}
		}()

		value, err := runtime.RunProgram(program)
		if err != nil {
			errorChan <- e.categorizeError(err)
			return
		}

		if goja.IsUndefined(value) {
			errorChan <- &model.ExecutionError{
				Type:    "ValidationError",
				Message: "返回值不能是 undefined",
			}
			return
		}

		result := value.Export()

		if err := e.validateResult(result); err != nil {
			errorChan <- err
			return
		}

		executionResult := &model.ExecutionResult{
			Result:      result,
			ExecutionId: executionId,
		}
		resultChan <- executionResult
	}()

	select {
	case result := <-resultChan:
		return result, nil
	case err := <-errorChan:
		if !isTemporary {
			e.healthMutex.Lock()
			if health, exists := e.runtimeHealth[runtime]; exists {
				health.errorCount++
			}
			e.healthMutex.Unlock()
		}
		return nil, err
	case <-ctx.Done():
		if !isTemporary {
			e.healthMutex.Lock()
			if health, exists := e.runtimeHealth[runtime]; exists {
				health.errorCount++
			}
			e.healthMutex.Unlock()
		}
		return nil, &model.ExecutionError{
			Type:    "TimeoutError",
			Message: fmt.Sprintf("代码执行超时 (%v)", e.executionTimeout),
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
}

// executeWithEventLoop 使用EventLoop执行代码（异步代码）
func (e *JSExecutor) executeWithEventLoop(code string, input map[string]interface{}) (*model.ExecutionResult, error) {
	loop := eventloop.NewEventLoop(eventloop.WithRegistry(e.registry))
	defer loop.Stop()

	executionId := e.generateExecutionId()

	var finalResult interface{}
	var finalError error

	ctx, cancel := context.WithTimeout(context.Background(), e.executionTimeout)
	defer cancel()

	done := make(chan struct{})
	go func() {
		defer close(done)

		var vm *goja.Runtime

		loop.Run(func(runtime *goja.Runtime) {
			vm = runtime

			defer func() {
				if r := recover(); r != nil {
					finalError = &model.ExecutionError{
						Type:    "RuntimeError",
						Message: fmt.Sprintf("代码执行panic: %v", r),
					}
				}
			}()

			console.Enable(vm)
			e.registry.Enable(vm)
			buffer.Enable(vm)
			e.bufferEnhancer.EnhanceBufferSupport(vm)
			e.cryptoEnhancer.SetupCryptoEnvironment(vm)
			url.Enable(vm)
			process.Enable(vm)

			if err := e.fetchEnhancer.RegisterFetchAPI(vm); err != nil {
				log.Printf("⚠️  EventLoop 中 Fetch API 注册失败: %v", err)
			}

			e.registerBase64Functions(vm)
			e.setupGlobalObjectsForEventLoop(vm)

			vm.Set("input", input)
			vm.Set("__executionId", executionId)
			vm.Set("__startTime", time.Now().UnixNano()/1e6)
			vm.Set("__finalResult", goja.Undefined())
			vm.Set("__finalError", goja.Undefined())

			wrappedCode := fmt.Sprintf(`
				(function() {
					'use strict';
					try {
						var userResult = (function() {
							%s
						})();

						if (userResult && typeof userResult === 'object' && typeof userResult.then === 'function') {
							userResult
								.then(function(value) {
									__finalResult = value;
								})
								.catch(function(error) {
									__finalError = error ? error : new Error('Promise rejected');
								});
						} else {
							__finalResult = userResult;
						}
					} catch (error) {
						__finalError = error;
					}
				})()
			`, code)

			_, err := vm.RunString(wrappedCode)
			if err != nil {
				finalError = e.categorizeError(err)
			}
		})

		if finalError == nil && vm != nil {
			finalErr := vm.Get("__finalError")
			if !goja.IsUndefined(finalErr) && finalErr != nil {
				errMsg := extractErrorMessage(finalErr)
				finalError = &model.ExecutionError{
					Type:    "RuntimeError",
					Message: errMsg,
				}
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
					finalResult = finalRes.Export()

					if err := e.validateResult(finalResult); err != nil {
						finalError = err
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
			Result:      finalResult,
			ExecutionId: executionId,
		}, nil
	case <-ctx.Done():
		loop.StopNoWait()
		return nil, &model.ExecutionError{
			Type:    "TimeoutError",
			Message: fmt.Sprintf("代码执行超时 (%v)", e.executionTimeout),
		}
	}
}

// validateInput 验证输入参数
func (e *JSExecutor) validateInput(code string, input map[string]interface{}) error {
	if len(code) > e.maxCodeLength {
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("代码长度超过限制: %d > %d字节", len(code), e.maxCodeLength),
		}
	}

	if err := e.validateReturnStatement(code); err != nil {
		return err
	}

	if err := e.validateCodeSecurity(code); err != nil {
		return err
	}

	if inputSize := len(fmt.Sprintf("%v", input)); inputSize > e.maxInputSize {
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("输入数据过大: %d > %d字节", inputSize, e.maxInputSize),
		}
	}

	return nil
}

// validateReturnStatement 验证代码中是否包含 return 语句
func (e *JSExecutor) validateReturnStatement(code string) error {
	cleanCode := e.removeStringsAndComments(code)

	if !strings.Contains(cleanCode, "return") {
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: "代码中缺少 return 语句",
		}
	}

	return nil
}

// removeStringsAndComments 移除字符串和注释（避免误判）
func (e *JSExecutor) removeStringsAndComments(code string) string {
	var result strings.Builder
	inString := false
	inComment := false
	inMultiComment := false
	stringChar := byte(0)

	for i := 0; i < len(code); i++ {
		ch := code[i]

		if !inString && !inComment && i+1 < len(code) && ch == '/' && code[i+1] == '*' {
			inMultiComment = true
			i++
			continue
		}
		if inMultiComment && i+1 < len(code) && ch == '*' && code[i+1] == '/' {
			inMultiComment = false
			i++
			continue
		}
		if inMultiComment {
			result.WriteByte(' ')
			continue
		}

		if !inString && !inComment && i+1 < len(code) && ch == '/' && code[i+1] == '/' {
			inComment = true
			i++
			continue
		}
		if inComment && ch == '\n' {
			inComment = false
			result.WriteByte('\n')
			continue
		}
		if inComment {
			result.WriteByte(' ')
			continue
		}

		if !inString && (ch == '"' || ch == '\'' || ch == '`') {
			inString = true
			stringChar = ch
			result.WriteByte(' ')
			continue
		}
		if inString && ch == stringChar {
			if i > 0 && code[i-1] != '\\' {
				inString = false
				stringChar = 0
			}
			result.WriteByte(' ')
			continue
		}
		if inString {
			result.WriteByte(' ')
			continue
		}

		result.WriteByte(ch)
	}

	return result.String()
}

// validateCodeSecurity 验证代码安全性
func (e *JSExecutor) validateCodeSecurity(code string) error {
	// 检测不支持的 async/await 语法
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
			return &model.ExecutionError{
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

	// 检测被禁用的模块引用
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
			return &model.ExecutionError{
				Type:    "SecurityError",
				Message: fmt.Sprintf("禁止使用 %s 模块：%s出于安全考虑已被禁用", mod.module, mod.reason),
			}
		}
	}

	// 检测危险的代码模式
	dangerousPatterns := []struct {
		pattern string
		reason  string
	}{
		{"eval(", "eval函数可执行任意代码"},
		{"Function(", "Function构造器可执行任意代码"},
		{"__proto__", "原型链操作可能导致安全问题"},
		{"constructor.constructor", "构造器访问可能导致代码注入"},
		{"global.", "global对象访问被禁止"},
		{"global[", "global对象访问被禁止"},
		{"globalThis.", "globalThis对象访问被禁止"},
		{"globalThis[", "globalThis对象访问被禁止"},
		{"window.", "window对象访问被禁止"},
		{"window[", "window对象访问被禁止"},
		{"self.", "self对象访问被禁止"},
		{"self[", "self对象访问被禁止"},
	}

	for _, pattern := range dangerousPatterns {
		if strings.Contains(code, pattern.pattern) {
			return &model.ExecutionError{
				Type:    "SecurityError",
				Message: fmt.Sprintf("代码包含危险模式 '%s': %s", pattern.pattern, pattern.reason),
			}
		}
	}

	// 检测可能的死循环
	if strings.Contains(code, "while(true)") ||
		strings.Contains(code, "for(;;)") ||
		strings.Contains(code, "while (true)") ||
		strings.Contains(code, "for (;;)") {
		return &model.ExecutionError{
			Type:    "SecurityError",
			Message: "代码可能包含无限循环，已被阻止执行",
		}
	}

	return nil
}

// validateResult 验证执行结果
func (e *JSExecutor) validateResult(result interface{}) error {
	if resultSize := len(fmt.Sprintf("%v", result)); resultSize > e.maxResultSize {
		return &model.ExecutionError{
			Type:    "ValidationError",
			Message: fmt.Sprintf("返回结果过大: %d > %d字节", resultSize, e.maxResultSize),
		}
	}

	return nil
}

// extractErrorMessage 从 goja.Value 中提取错误消息
func extractErrorMessage(errValue goja.Value) string {
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
func (e *JSExecutor) categorizeError(err error) error {
	if err == nil {
		return nil
	}

	message := err.Error()

	if strings.Contains(message, "SyntaxError") || strings.Contains(message, "Unexpected") {
		return &model.ExecutionError{
			Type:    "SyntaxError",
			Message: fmt.Sprintf("语法错误: %s", message),
		}
	}

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

	if strings.Contains(message, "is not a function") || strings.Contains(message, "Cannot read property") {
		return &model.ExecutionError{
			Type:    "TypeError",
			Message: fmt.Sprintf("类型错误: %s", message),
		}
	}

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

	runtime.ReadMemStats(&e.stats.MemStats)
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

// GetRuntimePoolHealth 获取 Runtime 池健康状态
func (e *JSExecutor) GetRuntimePoolHealth() map[string]interface{} {
	e.healthMutex.RLock()
	defer e.healthMutex.RUnlock()

	totalRuntimes := len(e.runtimeHealth)
	totalExecutions := int64(0)
	totalErrors := int64(0)
	oldestRuntime := time.Now()

	for _, health := range e.runtimeHealth {
		totalExecutions += health.executionCount
		totalErrors += health.errorCount
		if health.createdAt.Before(oldestRuntime) {
			oldestRuntime = health.createdAt
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

// getCompiledCode 获取编译后的代码 (带 LRU 缓存)
func (e *JSExecutor) getCompiledCode(code string) (*goja.Program, error) {
	codeHash := hashCodeSHA256(code)

	e.codeCacheMutex.RLock()
	if program, found := e.codeCache.Get(codeHash); found {
		e.codeCacheMutex.RUnlock()
		return program, nil
	}
	e.codeCacheMutex.RUnlock()

	program, err := goja.Compile("user_code.js", code, true)
	if err != nil {
		return nil, err
	}

	e.codeCacheMutex.Lock()
	evicted := e.codeCache.Put(codeHash, program)
	e.codeCacheMutex.Unlock()

	if evicted {
		log.Printf("💾 LRU 缓存已满，驱逐最久未使用的编译程序")
	}

	return program, nil
}

// hashCodeSHA256 使用 SHA256 计算代码哈希
func hashCodeSHA256(code string) string {
	hash := sha256.Sum256([]byte(code))
	return hex.EncodeToString(hash[:])
}

// startHealthChecker 启动健康检查器
func (e *JSExecutor) startHealthChecker() {
	e.wg.Add(1)
	go func() {
		defer e.wg.Done()

		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()

		log.Printf("🏥 Runtime 健康检查器已启动，检查间隔: 30秒")

		for {
			select {
			case <-ticker.C:
				e.checkAndFixRuntimes()
			case <-e.shutdown:
				log.Printf("🏥 Runtime 健康检查器已停止")
				return
			}
		}
	}()
}

// checkAndFixRuntimes 检查并修复有问题的 Runtime
func (e *JSExecutor) checkAndFixRuntimes() {
	e.healthMutex.Lock()
	defer e.healthMutex.Unlock()

	now := time.Now()
	problemRuntimes := []*goja.Runtime{}
	idleRuntimes := []*goja.Runtime{}
	currentSize := int(atomic.LoadInt32(&e.currentPoolSize))

	for rt, health := range e.runtimeHealth {
		if health.errorCount > 10 && health.executionCount > 0 {
			errorRate := float64(health.errorCount) / float64(health.executionCount)
			if errorRate > 0.1 {
				log.Printf("⚠️  检测到高错误率 Runtime: 错误率=%.2f%%, 执行次数=%d, 错误次数=%d",
					errorRate*100, health.executionCount, health.errorCount)
				problemRuntimes = append(problemRuntimes, rt)
			}
		}

		if now.Sub(health.lastUsedAt) > e.idleTimeout {
			idleRuntimes = append(idleRuntimes, rt)
		}

		if now.Sub(health.createdAt) > 1*time.Hour {
			if health.executionCount > 1000 {
				log.Printf("📊 Runtime 运行时间较长: 创建于 %v, 执行次数=%d",
					health.createdAt.Format("15:04:05"), health.executionCount)
			}
		}
	}

	for _, rt := range problemRuntimes {
		log.Printf("🔧 重建高错误率 Runtime...")
		e.rebuildRuntimeUnsafe(rt)
	}

	if currentSize > e.minPoolSize && len(idleRuntimes) > 5 {
		canRelease := currentSize - e.minPoolSize
		if canRelease > len(idleRuntimes)/2 {
			canRelease = len(idleRuntimes) / 2
		}
		if canRelease > 10 {
			canRelease = 10
		}

		log.Printf("🗑️  池收缩: 当前大小=%d, 最小大小=%d, 空闲数量=%d, 计划释放=%d",
			currentSize, e.minPoolSize, len(idleRuntimes), canRelease)

		released := 0
		for i := 0; i < canRelease && i < len(idleRuntimes); i++ {
			rt := idleRuntimes[i]
			delete(e.runtimeHealth, rt)
			atomic.AddInt32(&e.currentPoolSize, -1)
			released++
			log.Printf("✅ 已释放空闲 Runtime (%d/%d)", released, canRelease)
		}

		if released > 0 {
			log.Printf("📉 池收缩完成: 释放了 %d 个空闲 Runtime, 当前池大小: %d",
				released, atomic.LoadInt32(&e.currentPoolSize))
		}
	}

	poolLen := len(e.runtimePool)
	if poolLen < currentSize/10 && currentSize < e.maxPoolSize {
		toAdd := (currentSize / 5)
		if toAdd < 5 {
			toAdd = 5
		}
		if currentSize+toAdd > e.maxPoolSize {
			toAdd = e.maxPoolSize - currentSize
		}

		if toAdd > 0 {
			log.Printf("📈 池扩展: 当前池大小=%d, 可用=%d, 计划增加=%d",
				currentSize, poolLen, toAdd)

			added := 0
		AddLoop:
			for i := 0; i < toAdd; i++ {
				newRuntime := goja.New()
				e.setupRuntime(newRuntime)

				e.runtimeHealth[newRuntime] = &runtimeHealthInfo{
					createdAt:      time.Now(),
					lastUsedAt:     time.Now(),
					executionCount: 0,
					errorCount:     0,
				}

				select {
				case e.runtimePool <- newRuntime:
					atomic.AddInt32(&e.currentPoolSize, 1)
					added++
				default:
					log.Printf("⚠️  Runtime 池已满，停止扩展")
					break AddLoop
				}
			}

			log.Printf("📈 池扩展完成: 新增了 %d 个 Runtime, 当前池大小: %d",
				added, atomic.LoadInt32(&e.currentPoolSize))
		}
	}

	if len(problemRuntimes) > 0 {
		log.Printf("🔍 健康检查完成: 重建了 %d 个问题 Runtime", len(problemRuntimes))
	}
}

// rebuildRuntimeUnsafe 重建有问题的 Runtime（不加锁版本，由调用者确保已加锁）
func (e *JSExecutor) rebuildRuntimeUnsafe(oldRuntime *goja.Runtime) {
	newRuntime := goja.New()
	e.setupRuntime(newRuntime)

	delete(e.runtimeHealth, oldRuntime)
	e.runtimeHealth[newRuntime] = &runtimeHealthInfo{
		createdAt:      time.Now(),
		lastUsedAt:     time.Now(),
		executionCount: 0,
		errorCount:     0,
	}

	select {
	case e.runtimePool <- newRuntime:
		log.Printf("✅ Runtime 重建完成并放回池中")
	default:
		log.Printf("⚠️  Runtime 池已满，无法放回重建的 Runtime")
	}
}

// Shutdown 优雅关闭执行器
func (e *JSExecutor) Shutdown() {
	log.Println("🛑 正在关闭JavaScript执行器...")

	close(e.shutdown)
	e.wg.Wait()

	close(e.runtimePool)
	for runtime := range e.runtimePool {
		_ = runtime
	}

	log.Println("✅ JavaScript执行器已关闭")
}
