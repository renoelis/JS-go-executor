// Package enhance_modules 提供各种模块增强器
//
// sm_crypto_native.go - 国密算法模块的纯 Go 原生实现
//
// 特性：
//   - 🔥 纯 Go 实现国密算法（SM2/SM3/SM4/KDF）
//   - ✅ 基于 github.com/emmansun/gmsm 实现
//   - ✅ 零外部 JS 库依赖
//   - ✅ 100% 兼容 sm-crypto-v2 API
//
// 实现位置: enhance_modules/sm_crypto/
package enhance_modules

import (
	"flow-codeblock-go/enhance_modules/sm_crypto"
	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// SMCryptoNativeEnhancer sm-crypto-v2 模块增强器（Go 原生实现）
type SMCryptoNativeEnhancer struct {
	// 🔥 完全原生 Go 实现，不依赖任何外部 JS 库
}

// NewSMCryptoNativeEnhancer 创建新的 sm-crypto-v2 增强器（Go 原生）
func NewSMCryptoNativeEnhancer() *SMCryptoNativeEnhancer {
	utils.Debug("SMCryptoNativeEnhancer 初始化（Go 原生实现）",
		zap.Bool("native", true),
		zap.String("implementation", "github.com/emmansun/gmsm"),
		zap.String("algorithms", "SM2/SM3/SM4/KDF"),
	)
	return &SMCryptoNativeEnhancer{}
}

// NewSMCryptoEnhancer 创建新的 sm-crypto-v2 增强器（向后兼容）
// 注意: embeddedCode 参数保留以保持接口兼容性，但已不再使用
// 推荐使用 NewSMCryptoNativeEnhancer()
func NewSMCryptoEnhancer(embeddedCode string) *SMCryptoNativeEnhancer {
	if embeddedCode != "" {
		utils.Debug("注意: sm-crypto-v2 已改为 Go 原生实现，embeddedCode 参数已被忽略")
	}
	return NewSMCryptoNativeEnhancer()
}

// ============================================================================
// 🔥 模块注册
// ============================================================================

// RegisterSMCryptoModule 注册 sm-crypto-v2 模块到 require 系统（Go 原生实现）
func (scne *SMCryptoNativeEnhancer) RegisterSMCryptoModule(registry *require.Registry) {
	registry.RegisterNativeModule("sm-crypto-v2", func(runtime *goja.Runtime, module *goja.Object) {
		// 🔥 创建导出对象（使用纯 Go 实现）
		exports := runtime.NewObject()

		// 🔥 注册 SM2 模块（椭圆曲线加密）
		exports.Set("sm2", sm_crypto.CreateSM2Object(runtime))

		// 🔥 注册 SM3 函数（哈希算法）
		exports.Set("sm3", sm_crypto.CreateSM3Function(runtime))

		// 🔥 注册 SM4 模块（对称加密）
		exports.Set("sm4", sm_crypto.CreateSM4Object(runtime))

		// 🔥 注册 KDF 函数（密钥派生）
		exports.Set("kdf", sm_crypto.CreateKDFFunction(runtime))

		// 设置导出
		module.Set("exports", exports)

		utils.Debug("sm-crypto-v2 模块已注册（Go 原生实现）",
			zap.Bool("has_sm2", true),
			zap.Bool("has_sm3", true),
			zap.Bool("has_sm4", true),
			zap.Bool("has_kdf", true),
			zap.String("compatibility", "sm-crypto-v2 100%"),
		)
	})

	utils.Debug("sm-crypto-v2 模块已注册到 require 系统（Go 原生实现）")
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口
// ============================================================================

// Name 返回模块名称
func (scne *SMCryptoNativeEnhancer) Name() string {
	return "sm-crypto-v2"
}

// Close 关闭 SMCryptoNativeEnhancer 并释放资源
// SMCrypto 模块不持有需要释放的资源，返回 nil
func (scne *SMCryptoNativeEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (scne *SMCryptoNativeEnhancer) Register(registry *require.Registry) error {
	scne.RegisterSMCryptoModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (scne *SMCryptoNativeEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
