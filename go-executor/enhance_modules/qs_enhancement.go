package enhance_modules

import (
	"fmt"
	"log"
	"sync"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// QsEnhancer qs 模块增强器
type QsEnhancer struct {
	embeddedCode    string        // 嵌入的 qs 代码
	compiledProgram *goja.Program // qs 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewQsEnhancer 创建新的 qs 增强器
func NewQsEnhancer(embeddedCode string) *QsEnhancer {
	fmt.Printf("📦 QsEnhancer 初始化，嵌入代码大小: %d 字节\n", len(embeddedCode))
	return &QsEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterQsModule 注册 qs 模块到 require 系统
func (qe *QsEnhancer) RegisterQsModule(registry *require.Registry) {
	registry.RegisterNativeModule("qs", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 qs 已加载
		if err := qe.loadQs(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to load qs: %w", err)))
		}

		// 获取 qs 导出对象
		qsVal := runtime.Get("Qs")
		if qsVal != nil && !goja.IsUndefined(qsVal) {
			module.Set("exports", qsVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("qs not available")))
		}
	})

	log.Printf("✅ qs 模块已注册到 require 系统")
}

// loadQs 加载 qs 库 (带缓存优化)
func (qe *QsEnhancer) loadQs(runtime *goja.Runtime) error {
	// 检查当前 runtime 中是否已经有 Qs
	qsVal := runtime.Get("Qs")
	if qsVal != nil && !goja.IsUndefined(qsVal) {
		return nil
	}

	// 获取编译后的 Program
	program, err := qe.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 qs 程序失败: %w", err)
	}

	// qs 使用 UMD 格式
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 运行编译后的程序
	_, err = runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 qs 程序失败: %w", err)
	}

	// 获取导出的对象
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("Qs", moduleExports)
		return nil
	}

	return fmt.Errorf("qs 模块加载失败: exports is undefined")
}

// getCompiledProgram 获取编译后的 qs 程序（只编译一次）
func (qe *QsEnhancer) getCompiledProgram() (*goja.Program, error) {
	qe.compileOnce.Do(func() {
		if qe.embeddedCode == "" {
			qe.compileErr = fmt.Errorf("qs embedded code is empty")
			return
		}

		program, err := goja.Compile("qs.min.js", qe.embeddedCode, true)
		if err != nil {
			qe.compileErr = fmt.Errorf("编译 qs 代码失败: %w", err)
			return
		}

		qe.compiledProgram = program
		fmt.Printf("✅ qs 程序编译成功，代码大小: %d 字节\n", len(qe.embeddedCode))
	})

	return qe.compiledProgram, qe.compileErr
}
