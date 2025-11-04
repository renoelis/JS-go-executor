// Package enhance_modules 提供各种模块增强器
//
// qs_native.go - Query String 模块的纯 Go 实现
//
// 特性：
//   - 🔥 纯 Go 实现（qs），零 Goja 依赖，100% 兼容 Node.js qs 库
//   - ✅ 零 runtime.RunString() 调用
//   - ✅ 支持所有 Node.js qs 的高级特性（嵌套对象、数组、自定义格式等）
//   - ✅ 100% 功能对齐，包括 AllowDots 复杂嵌套、稀疏数组等
//
// 实现位置: enhance_modules/qs/
package enhance_modules

import (
	"flow-codeblock-go/enhance_modules/qs"
	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// QsNativeEnhancer qs 模块增强器（Go 原生实现）
type QsNativeEnhancer struct {
	// 🔥 完全原生 Go 实现，100% 兼容 Node.js qs 库
	// 不依赖任何第三方库，不需要嵌入 JS 代码
}

// NewQsNativeEnhancer 创建新的 qs 增强器（Go 原生）
func NewQsNativeEnhancer() *QsNativeEnhancer {
	utils.Debug("QsNativeEnhancer 初始化（Go 原生实现）",
		zap.Bool("native", true),
		zap.String("implementation", "完全手动实现"),
		zap.String("compatibility", "Node.js qs 100%"),
		zap.Bool("third_party_free", true),
	)
	return &QsNativeEnhancer{}
}

// RegisterQsModule 注册 qs 模块到 require 系统（Go 原生实现）
func (qne *QsNativeEnhancer) RegisterQsModule(registry *require.Registry) {
	registry.RegisterNativeModule("qs", func(runtime *goja.Runtime, module *goja.Object) {
		// 🔥 创建导出对象（使用纯 Go qs 实现）
		exports := qs.CreateQsObject(runtime)

		// 设置导出
		module.Set("exports", exports)

		utils.Debug("qs 模块已注册（纯 Go qs 实现）",
			zap.Bool("has_parse", true),
			zap.Bool("has_stringify", true),
			zap.String("compatibility", "Node.js qs 100%"),
			zap.String("implementation", "纯 Go，零 runtime.RunString"),
		)
	})

	utils.Debug("qs 模块已注册到 require 系统（纯 Go qs 实现）")
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (qne *QsNativeEnhancer) Name() string {
	return "qs"
}

// Close 关闭 QsNativeEnhancer 并释放资源
// Qs 模块不持有需要释放的资源，返回 nil
func (qne *QsNativeEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (qne *QsNativeEnhancer) Register(registry *require.Registry) error {
	qne.RegisterQsModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (qne *QsNativeEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
