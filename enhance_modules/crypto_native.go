// Package enhance_modules 提供各种模块增强器
//
// crypto_native.go - Crypto 模块的纯 Go 原生实现
//
// 特性：
//   - 🔥 纯 Go 实现 crypto 模块，零外部库依赖
//   - ✅ 100% 原生实现（Hash, HMAC, RSA, Random 等）
//   - ✅ 兼容 Node.js crypto API
//   - ✅ 高性能，低内存占用
//
// 实现位置: enhance_modules/crypto/
package enhance_modules

import (
	"flow-codeblock-go/enhance_modules/crypto"
	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// CryptoNativeEnhancer crypto 模块增强器（Go 原生实现）
type CryptoNativeEnhancer struct {
	// 🔥 完全原生 Go 实现，不依赖任何外部 JS 库
}

// NewCryptoNativeEnhancer 创建新的 crypto 增强器（Go 原生）
func NewCryptoNativeEnhancer() *CryptoNativeEnhancer {
	utils.Debug("CryptoNativeEnhancer 初始化（Go 原生实现）",
		zap.Bool("native", true),
		zap.String("implementation", "完全 Go 原生"),
		zap.String("compatibility", "Node.js crypto API"),
	)
	return &CryptoNativeEnhancer{}
}

// ============================================================================
// 🔥 模块注册
// ============================================================================

// RegisterCryptoModule 注册 crypto 模块到 require 系统（Go 原生实现）
func (cne *CryptoNativeEnhancer) RegisterCryptoModule(registry *require.Registry) {
	registry.RegisterNativeModule("crypto", func(runtime *goja.Runtime, module *goja.Object) {
		// 创建导出对象
		exports := runtime.NewObject()

		// 注册所有 crypto 方法（调用子包 - 纯 Go 实现）
		if err := crypto.RegisterCryptoMethods(runtime, exports, nil); err != nil {
			utils.Error("注册 crypto 方法失败", zap.Error(err))
			panic(runtime.NewGoError(err))
		}

		// 设置导出
		module.Set("exports", exports)

		utils.Debug("crypto 模块已注册（Go 原生实现）",
			zap.Bool("native", true),
			zap.String("features", "Hash, HMAC, RSA, Random, Sign, Verify"),
		)
	})

	utils.Debug("crypto 模块已注册到 require 系统（Go 原生实现）")
}

// SetupCryptoEnvironment 设置完整的 crypto 环境
func (cne *CryptoNativeEnhancer) SetupCryptoEnvironment(runtime *goja.Runtime) error {
	// 创建 crypto 对象
	cryptoObj := runtime.NewObject()

	// 注册所有方法（调用子包 - 纯 Go 实现）
	if err := crypto.RegisterCryptoMethods(runtime, cryptoObj, nil); err != nil {
		return err
	}

	// 设置到全局对象
	runtime.Set("crypto", cryptoObj)

	utils.Debug("Crypto 环境设置完成（Go 原生实现）")
	return nil
}

// EnhanceCryptoSupport 增强 crypto 支持（便捷方法）
func (cne *CryptoNativeEnhancer) EnhanceCryptoSupport(runtime *goja.Runtime) error {
	return cne.SetupCryptoEnvironment(runtime)
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口
// ============================================================================

// Name 返回模块名称
func (cne *CryptoNativeEnhancer) Name() string {
	return "crypto"
}

// Close 关闭 CryptoNativeEnhancer 并释放资源
func (cne *CryptoNativeEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (cne *CryptoNativeEnhancer) Register(registry *require.Registry) error {
	cne.RegisterCryptoModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (cne *CryptoNativeEnhancer) Setup(runtime *goja.Runtime) error {
	return cne.SetupCryptoEnvironment(runtime)
}
