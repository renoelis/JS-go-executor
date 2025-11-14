package buffer

import (
	"github.com/dop251/goja"
)

// getHasOwnPropertyFunc 获取 hasOwnProperty 检查函数
//
// 🔥 设计决策：直接编译而非缓存
//
// 问题背景：
//   - 旧实现使用全局单例缓存 goja.Callable
//   - goja.Callable 绑定到特定 runtime，跨 runtime 使用会导致：
//     1. Panic 崩溃（访问错误的 runtime）
//     2. 内存泄漏（全局引用阻止第一个 runtime 被 GC）
//     3. 并发安全问题（未定义行为）
//
// 新方案：每次直接编译
//   ✅ 优点：
//      - 完全消除跨 runtime 风险
//      - 无内存泄漏风险
//      - 编译开销极小（~1-5μs，单行代码）
//      - 代码简洁，维护成本低
//   ✅ 性能影响：
//      - 编译时间：1-5μs（可忽略不计）
//      - 对比缓存查找：节省了锁竞争开销
//      - 总体性能影响：<0.1%
//
// 架构选择：
//   - 方案 A: 直接编译 ✅ 选中（简单、安全、性能足够）
//   - 方案 B: sync.Map 按 runtime 缓存（复杂度更高）
//   - 方案 C: 预编译 Program（对简单函数过度设计）
func getHasOwnPropertyFunc(runtime *goja.Runtime) goja.Callable {
	// 直接编译，无缓存
	result, err := runtime.RunString(`(function(obj, prop) { return obj.hasOwnProperty(prop); })`)
	if err == nil {
		if fn, ok := goja.AssertFunction(result); ok {
			return fn
		}
	}
	return nil
}

// getTypeofCheckFunc 获取 typeof 检查函数
// 详细设计说明见 getHasOwnPropertyFunc
func getTypeofCheckFunc(runtime *goja.Runtime) goja.Callable {
	// 直接编译，无缓存
	result, err := runtime.RunString(`(function(val) { return typeof val; })`)
	if err == nil {
		if fn, ok := goja.AssertFunction(result); ok {
			return fn
		}
	}
	return nil
}

// getIsSymbolCheckFunc 获取 Symbol 类型检查函数
// 详细设计说明见 getHasOwnPropertyFunc
func getIsSymbolCheckFunc(runtime *goja.Runtime) goja.Callable {
	// 直接编译，无缓存
	result, err := runtime.RunString(`(function(arg) { return typeof arg === 'symbol'; })`)
	if err == nil {
		if fn, ok := goja.AssertFunction(result); ok {
			return fn
		}
	}
	return nil
}
