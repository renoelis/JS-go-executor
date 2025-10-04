package enhance_modules

import (
	"fmt"
	"log"
	"sync"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// UuidEnhancer uuid 模块增强器
type UuidEnhancer struct {
	embeddedCode    string        // 嵌入的 uuid 代码
	compiledProgram *goja.Program // uuid 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewUuidEnhancer 创建新的 uuid 增强器
func NewUuidEnhancer(embeddedCode string) *UuidEnhancer {
	fmt.Printf("📦 UuidEnhancer 初始化，嵌入代码大小: %d 字节\n", len(embeddedCode))
	return &UuidEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterUuidModule 注册 uuid 模块到 require 系统
func (ue *UuidEnhancer) RegisterUuidModule(registry *require.Registry) {
	registry.RegisterNativeModule("uuid", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 uuid 已加载
		if err := ue.loadUuid(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to load uuid: %w", err)))
		}

		// 获取 uuid 导出对象
		uuidVal := runtime.Get("uuid")
		if uuidVal != nil && !goja.IsUndefined(uuidVal) {
			module.Set("exports", uuidVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("uuid not available")))
		}
	})

	log.Printf("✅ uuid 模块已注册到 require 系统")
}

// loadUuid 加载 uuid 库 (带缓存优化)
func (ue *UuidEnhancer) loadUuid(runtime *goja.Runtime) error {
	// 检查当前 runtime 中是否已经有 uuid
	uuidVal := runtime.Get("uuid")
	if uuidVal != nil && !goja.IsUndefined(uuidVal) {
		return nil
	}

	// 获取编译后的 Program
	program, err := ue.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 uuid 程序失败: %w", err)
	}

	// uuid 使用 UMD 格式
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 运行编译后的程序
	_, err = runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 uuid 程序失败: %w", err)
	}

	// 获取导出的对象
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("uuid", moduleExports)
		return nil
	}

	return fmt.Errorf("uuid 模块加载失败: exports is undefined")
}

// getCompiledProgram 获取编译后的 uuid 程序（只编译一次）
func (ue *UuidEnhancer) getCompiledProgram() (*goja.Program, error) {
	ue.compileOnce.Do(func() {
		if ue.embeddedCode == "" {
			ue.compileErr = fmt.Errorf("uuid embedded code is empty")
			return
		}

		program, err := goja.Compile("uuid.min.js", ue.embeddedCode, true)
		if err != nil {
			ue.compileErr = fmt.Errorf("编译 uuid 代码失败: %w", err)
			return
		}

		ue.compiledProgram = program
		fmt.Printf("✅ uuid 程序编译成功，代码大小: %d 字节\n", len(ue.embeddedCode))
	})

	return ue.compiledProgram, ue.compileErr
}
