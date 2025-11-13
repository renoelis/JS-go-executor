package buffer

import (
	"sync"

	"github.com/dop251/goja"
)

// jsHelperFuncs 缓存预编译的 JavaScript 辅助函数
// 🔥 性能优化：避免每次调用都重新编译相同的 JavaScript 代码
type jsHelperFuncs struct {
	hasOwnProperty goja.Callable
	typeofCheck    goja.Callable
	isSymbolCheck  goja.Callable
	mu             sync.RWMutex
}

var helperFuncs = &jsHelperFuncs{}

// getHasOwnPropertyFunc 获取预编译的 hasOwnProperty 检查函数
func getHasOwnPropertyFunc(runtime *goja.Runtime) goja.Callable {
	helperFuncs.mu.RLock()
	if helperFuncs.hasOwnProperty != nil {
		fn := helperFuncs.hasOwnProperty
		helperFuncs.mu.RUnlock()
		return fn
	}
	helperFuncs.mu.RUnlock()

	// 需要创建函数
	helperFuncs.mu.Lock()
	defer helperFuncs.mu.Unlock()

	// 双重检查（避免竞态）
	if helperFuncs.hasOwnProperty != nil {
		return helperFuncs.hasOwnProperty
	}

	// 编译并缓存
	result, err := runtime.RunString(`(function(obj, prop) { return obj.hasOwnProperty(prop); })`)
	if err == nil {
		if fn, ok := goja.AssertFunction(result); ok {
			helperFuncs.hasOwnProperty = fn
			return fn
		}
	}
	return nil
}

// getTypeofCheckFunc 获取预编译的 typeof 检查函数
func getTypeofCheckFunc(runtime *goja.Runtime) goja.Callable {
	helperFuncs.mu.RLock()
	if helperFuncs.typeofCheck != nil {
		fn := helperFuncs.typeofCheck
		helperFuncs.mu.RUnlock()
		return fn
	}
	helperFuncs.mu.RUnlock()

	// 需要创建函数
	helperFuncs.mu.Lock()
	defer helperFuncs.mu.Unlock()

	// 双重检查（避免竞态）
	if helperFuncs.typeofCheck != nil {
		return helperFuncs.typeofCheck
	}

	// 编译并缓存
	result, err := runtime.RunString(`(function(val) { return typeof val; })`)
	if err == nil {
		if fn, ok := goja.AssertFunction(result); ok {
			helperFuncs.typeofCheck = fn
			return fn
		}
	}
	return nil
}

// getIsSymbolCheckFunc 获取预编译的 Symbol 类型检查函数
func getIsSymbolCheckFunc(runtime *goja.Runtime) goja.Callable {
	helperFuncs.mu.RLock()
	if helperFuncs.isSymbolCheck != nil {
		fn := helperFuncs.isSymbolCheck
		helperFuncs.mu.RUnlock()
		return fn
	}
	helperFuncs.mu.RUnlock()

	// 需要创建函数
	helperFuncs.mu.Lock()
	defer helperFuncs.mu.Unlock()

	// 双重检查（避免竞态）
	if helperFuncs.isSymbolCheck != nil {
		return helperFuncs.isSymbolCheck
	}

	// 编译并缓存
	result, err := runtime.RunString(`(function(arg) { return typeof arg === 'symbol'; })`)
	if err == nil {
		if fn, ok := goja.AssertFunction(result); ok {
			helperFuncs.isSymbolCheck = fn
			return fn
		}
	}
	return nil
}
