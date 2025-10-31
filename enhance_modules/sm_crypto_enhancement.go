package enhance_modules

import (
	"flow-codeblock-go/enhance_modules/sm_crypto"
	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// SMCryptoEnhancer sm-crypto-v2 模块增强器（Go 原生实现）
type SMCryptoEnhancer struct {
	// 🔥 Go 原生实现，不再需要嵌入 JS 代码
}

// NewSMCryptoEnhancer 创建新的 sm-crypto-v2 增强器
// 注意: embeddedCode 参数保留以保持接口兼容性，但已不再使用
func NewSMCryptoEnhancer(embeddedCode string) *SMCryptoEnhancer {
	utils.Debug("SMCryptoEnhancer 初始化（Go 原生实现）",
		zap.Bool("native", true),
		zap.String("implementation", "github.com/emmansun/gmsm"),
	)
	return &SMCryptoEnhancer{}
}

// RegisterSMCryptoModule 注册 sm-crypto-v2 模块到 require 系统（Go 原生实现）
func (sce *SMCryptoEnhancer) RegisterSMCryptoModule(registry *require.Registry) {
	registry.RegisterNativeModule("sm-crypto-v2", func(runtime *goja.Runtime, module *goja.Object) {
		// 🔥 创建导出对象
		exports := runtime.NewObject()

		// 🔥 注册 SM2 模块
		exports.Set("sm2", sm_crypto.CreateSM2Object(runtime))

		// 🔥 注册 SM3 函数
		exports.Set("sm3", sm_crypto.CreateSM3Function(runtime))

		// 🔥 注册 SM4 模块
		exports.Set("sm4", sm_crypto.CreateSM4Object(runtime))

		// 🔥 注册 KDF 函数
		exports.Set("kdf", sm_crypto.CreateKDFFunction(runtime))

		// 设置导出
		module.Set("exports", exports)

		utils.Debug("sm-crypto-v2 模块已注册（Go 原生实现）",
			zap.Bool("has_sm2", true),
			zap.Bool("has_sm3", true),
			zap.Bool("has_sm4", true),
			zap.Bool("has_kdf", true),
		)
	})

	utils.Debug("sm-crypto-v2 模块已注册到 require 系统（Go 原生实现）")
}

// 🔥 Go 原生实现，不再需要以下方法：
// - loadSMCrypto
// - getCompiledProgram
// - PrecompileSMCrypto
// - setupCryptoPolyfill
// - setupUint8ArrayPolyfill

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (sce *SMCryptoEnhancer) Name() string {
	return "sm-crypto-v2"
}

// Close 关闭 SMCryptoEnhancer 并释放资源
// SMCrypto 模块不持有需要释放的资源，返回 nil
func (sce *SMCryptoEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (sce *SMCryptoEnhancer) Register(registry *require.Registry) error {
	sce.RegisterSMCryptoModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (sce *SMCryptoEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
