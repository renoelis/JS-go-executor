package enhance_modules

import (
	"fmt"
	"log"
	"sync"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// LodashEnhancer lodash 模块增强器
type LodashEnhancer struct {
	embeddedCode    string        // 嵌入的 lodash 代码
	compiledProgram *goja.Program // lodash 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewLodashEnhancer 创建新的 lodash 增强器
func NewLodashEnhancer(embeddedCode string) *LodashEnhancer {
	fmt.Printf("📦 LodashEnhancer 初始化，嵌入代码大小: %d 字节\n", len(embeddedCode))
	return &LodashEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterLodashModule 注册 lodash 模块到 require 系统
func (le *LodashEnhancer) RegisterLodashModule(registry *require.Registry) {
	registry.RegisterNativeModule("lodash", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 lodash 已加载
		if err := le.loadLodash(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to load lodash: %w", err)))
		}

		// 获取 lodash 导出对象
		lodashVal := runtime.Get("_")
		if lodashVal != nil && !goja.IsUndefined(lodashVal) {
			module.Set("exports", lodashVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("lodash not available")))
		}
	})

	log.Printf("✅ lodash 模块已注册到 require 系统")
}

// loadLodash 加载 lodash 库 (带缓存优化)
func (le *LodashEnhancer) loadLodash(runtime *goja.Runtime) error {
	// 检查当前 runtime 中是否已经有 _
	lodashVal := runtime.Get("_")
	if lodashVal != nil && !goja.IsUndefined(lodashVal) {
		return nil
	}

	// 获取编译后的 Program
	program, err := le.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 lodash 程序失败: %w", err)
	}

	// lodash 使用 UMD 格式
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 运行编译后的程序
	_, err = runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 lodash 程序失败: %w", err)
	}

	// 获取导出的对象
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("_", moduleExports)
		return nil
	}

	return fmt.Errorf("lodash 模块加载失败: exports is undefined")
}

// getCompiledProgram 获取编译后的 lodash 程序（只编译一次）
func (le *LodashEnhancer) getCompiledProgram() (*goja.Program, error) {
	le.compileOnce.Do(func() {
		if le.embeddedCode == "" {
			le.compileErr = fmt.Errorf("lodash embedded code is empty")
			return
		}

		program, err := goja.Compile("lodash.min.js", le.embeddedCode, true)
		if err != nil {
			le.compileErr = fmt.Errorf("编译 lodash 代码失败: %w", err)
			return
		}

		le.compiledProgram = program
		fmt.Printf("✅ lodash 程序编译成功，代码大小: %d 字节\n", len(le.embeddedCode))
	})

	return le.compiledProgram, le.compileErr
}
