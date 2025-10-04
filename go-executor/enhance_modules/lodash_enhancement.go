package enhance_modules

import (
	"fmt"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
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
	utils.Debug("LodashEnhancer 初始化", zap.Int("size_bytes", len(embeddedCode)))
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

	utils.Debug("lodash 模块已注册到 require 系统")
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
		utils.Debug("lodash 程序编译成功", zap.Int("code_size_bytes", len(le.embeddedCode)))
	})

	return le.compiledProgram, le.compileErr
}

// PrecompileLodash 预编译 lodash（用于启动时预热）
func (le *LodashEnhancer) PrecompileLodash() error {
	_, err := le.getCompiledProgram()
	return err
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (le *LodashEnhancer) Name() string {
	return "lodash"
}

// Close 关闭 LodashEnhancer 并释放资源
// Lodash 模块不持有需要释放的资源，返回 nil
func (le *LodashEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (le *LodashEnhancer) Register(registry *require.Registry) error {
	le.RegisterLodashModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (le *LodashEnhancer) Setup(runtime *goja.Runtime) error {
	// lodash 不需要额外的 Runtime 设置
	return nil
}
