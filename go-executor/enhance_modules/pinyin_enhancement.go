package enhance_modules

import (
	"fmt"
	"log"
	"sync"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// PinyinEnhancer pinyin 模块增强器
type PinyinEnhancer struct {
	embeddedCode    string        // 嵌入的 pinyin 代码
	compiledProgram *goja.Program // pinyin 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewPinyinEnhancer 创建新的 pinyin 增强器
func NewPinyinEnhancer(embeddedCode string) *PinyinEnhancer {
	fmt.Printf("📦 PinyinEnhancer 初始化，嵌入代码大小: %d 字节 (包含字典数据)\n", len(embeddedCode))
	return &PinyinEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterPinyinModule 注册 pinyin 模块到 require 系统
func (pe *PinyinEnhancer) RegisterPinyinModule(registry *require.Registry) {
	registry.RegisterNativeModule("pinyin", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 pinyin 已加载
		if err := pe.loadPinyin(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to load pinyin: %w", err)))
		}

		// 获取 pinyin 导出对象
		pinyinVal := runtime.Get("pinyin")
		if pinyinVal != nil && !goja.IsUndefined(pinyinVal) {
			module.Set("exports", pinyinVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("pinyin not available")))
		}
	})

	log.Printf("✅ pinyin 模块已注册到 require 系统")
}

// loadPinyin 加载 pinyin 库 (带缓存优化)
func (pe *PinyinEnhancer) loadPinyin(runtime *goja.Runtime) error {
	// 检查当前 runtime 中是否已经有 pinyin
	pinyinVal := runtime.Get("pinyin")
	if pinyinVal != nil && !goja.IsUndefined(pinyinVal) {
		return nil
	}

	// 获取编译后的 Program
	program, err := pe.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 pinyin 程序失败: %w", err)
	}

	// pinyin 使用 UMD 格式
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 运行编译后的程序
	_, err = runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 pinyin 程序失败: %w", err)
	}

	// 获取导出的对象
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("pinyin", moduleExports)
		return nil
	}

	return fmt.Errorf("pinyin 模块加载失败: exports is undefined")
}

// getCompiledProgram 获取编译后的 pinyin 程序（只编译一次）
func (pe *PinyinEnhancer) getCompiledProgram() (*goja.Program, error) {
	pe.compileOnce.Do(func() {
		if pe.embeddedCode == "" {
			pe.compileErr = fmt.Errorf("pinyin embedded code is empty")
			return
		}

		program, err := goja.Compile("pinyin.min.js", pe.embeddedCode, true)
		if err != nil {
			pe.compileErr = fmt.Errorf("编译 pinyin 代码失败: %w", err)
			return
		}

		pe.compiledProgram = program
		fmt.Printf("✅ pinyin 程序编译成功，代码大小: %d 字节\n", len(pe.embeddedCode))
	})

	return pe.compiledProgram, pe.compileErr
}
