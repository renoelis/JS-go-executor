package enhance_modules

import (
	"fmt"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
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
	utils.Debug("UuidEnhancer 初始化", zap.Int("size_bytes", len(embeddedCode)))
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

	utils.Debug("uuid 模块已注册到 require 系统")
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
		utils.Debug("uuid 程序编译成功", zap.Int("code_size_bytes", len(ue.embeddedCode)))
	})

	return ue.compiledProgram, ue.compileErr
}

// PrecompileUuid 预编译 uuid（用于启动时预热）
func (ue *UuidEnhancer) PrecompileUuid() error {
	_, err := ue.getCompiledProgram()
	return err
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (ue *UuidEnhancer) Name() string {
	return "uuid"
}

// Close 关闭 UuidEnhancer 并释放资源
// Uuid 模块不持有需要释放的资源，返回 nil
func (ue *UuidEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (ue *UuidEnhancer) Register(registry *require.Registry) error {
	ue.RegisterUuidModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (ue *UuidEnhancer) Setup(runtime *goja.Runtime) error {
	// uuid 不需要额外的 Runtime 设置
	return nil
}
