package enhance_modules

import (
	"fmt"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
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
	utils.Debug("PinyinEnhancer 初始化", zap.Int("size_bytes", len(embeddedCode)))
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

	utils.Debug("pinyin 模块已注册到 require 系统")
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
		utils.Debug("pinyin 程序编译成功", zap.Int("code_size_bytes", len(pe.embeddedCode)))
	})

	return pe.compiledProgram, pe.compileErr
}

// PrecompilePinyin 预编译 pinyin（用于启动时预热）
func (pe *PinyinEnhancer) PrecompilePinyin() error {
	_, err := pe.getCompiledProgram()
	return err
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (pe *PinyinEnhancer) Name() string {
	return "pinyin"
}

// Close 关闭 PinyinEnhancer 并释放资源
// Pinyin 模块不持有需要释放的资源，返回 nil
func (pe *PinyinEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (pe *PinyinEnhancer) Register(registry *require.Registry) error {
	pe.RegisterPinyinModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
// ⚠️ pinyin 库很大（7.3MB），不预加载以节省内存
//
//	执行对象: 80MB × 20 = 1.6GB 的内存占用（占总内存的 73%）
func (pe *PinyinEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
