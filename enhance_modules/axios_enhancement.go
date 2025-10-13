package enhance_modules

import (
	"flow-codeblock-go/utils"
	"fmt"
	"sync"

	"go.uber.org/zap"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// AxiosEnhancer axios 模块增强器
type AxiosEnhancer struct {
	embeddedCode    string        // 嵌入的 axios.js 代码
	compiledProgram *goja.Program // 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewAxiosEnhancer 创建新的 axios 增强器
func NewAxiosEnhancer(embeddedCode string) *AxiosEnhancer {
	utils.Debug("AxiosEnhancer 初始化", zap.Int("size_bytes", len(embeddedCode)))

	return &AxiosEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterAxiosModule 注册 axios 模块到 require 系统
func (ae *AxiosEnhancer) RegisterAxiosModule(registry *require.Registry) {
	registry.RegisterNativeModule("axios", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 axios 代码已编译
		ae.compileOnce.Do(func() {
			var err error
			ae.compiledProgram, err = goja.Compile("axios.js", ae.embeddedCode, true)
			if err != nil {
				ae.compileErr = err
			}
		})

		if ae.compileErr != nil {
			panic(runtime.NewGoError(fmt.Errorf("编译 axios.js 失败: %w", ae.compileErr)))
		}

		// 执行 axios.js 代码
		_, err := runtime.RunProgram(ae.compiledProgram)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("加载 axios 模块失败: %w", err)))
		}

		// 获取 axios 对象
		axiosVal := runtime.Get("axios")
		if axiosVal == nil || goja.IsUndefined(axiosVal) {
			panic(runtime.NewGoError(fmt.Errorf("加载 axios.js 后未找到 axios 对象")))
		}

		// 导出 axios
		module.Set("exports", axiosVal)
	})
}

// PrecompileAxios 预编译 axios（用于启动时预热）
func (ae *AxiosEnhancer) PrecompileAxios() error {
	ae.compileOnce.Do(func() {
		var err error
		ae.compiledProgram, err = goja.Compile("axios.js", ae.embeddedCode, true)
		if err != nil {
			ae.compileErr = err
		}
	})
	return ae.compileErr
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (ae *AxiosEnhancer) Name() string {
	return "axios"
}

// Close 关闭 AxiosEnhancer 并释放资源
// Axios 模块不持有需要释放的资源，返回 nil
func (ae *AxiosEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (ae *AxiosEnhancer) Register(registry *require.Registry) error {
	ae.RegisterAxiosModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (ae *AxiosEnhancer) Setup(runtime *goja.Runtime) error {
	// Axios 不需要额外的 Runtime 设置
	return nil
}
