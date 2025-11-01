package enhance_modules

import (
	"flow-codeblock-go/enhance_modules/pinyin"
	"flow-codeblock-go/enhance_modules/pinyin/dict"
	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// PinyinEnhancer pinyin 模块增强器（Go 原生实现）
type PinyinEnhancer struct {
	// 🔥 Go 原生实现，不再需要嵌入 JS 代码
}

// NewPinyinEnhancer 创建新的 pinyin 增强器
// 注意: embeddedCode 参数保留以保持接口兼容性，但已不再使用
func NewPinyinEnhancer(embeddedCode string) *PinyinEnhancer {
	utils.Debug("PinyinEnhancer 初始化（Go 原生实现）",
		zap.Bool("native", true),
		zap.String("implementation", "Go native with gse segmenter"),
	)
	
	// 🔥 启动字典预热（后台异步加载）
	// 避免首次调用时的 150-300ms 延迟
	dict.WarmUp()
	utils.Debug("Pinyin 字典预热已启动（后台异步加载）",
		zap.String("status", "warming_up"),
		zap.String("note", "首次调用时字典可能仍在加载中"),
	)
	
	return &PinyinEnhancer{}
}

// RegisterPinyinModule 注册 pinyin 模块到 require 系统（Go 原生实现）
func (pe *PinyinEnhancer) RegisterPinyinModule(registry *require.Registry) {
	registry.RegisterNativeModule("pinyin", func(runtime *goja.Runtime, module *goja.Object) {
		// 🔥 使用新的 100% 兼容实现
		pinyinFunc := pinyin.CreatePinyinFunctionNew(runtime)
		pinyinObj := pinyinFunc.ToObject(runtime)

		// 🔥 支持多种导入方式：
		// 1. const pinyin = require('pinyin');                              → 直接调用函数
		// 2. const { pinyin } = require('pinyin');                          → 解构导入函数
		// 3. const { STYLE_NORMAL, STYLE_TONE } = require('pinyin');        → 解构导入常量
		// 4. const { pinyin, STYLE_NORMAL } = require('pinyin');            → 同时解构函数和常量
		// 5. const { Pinyin } = require('pinyin');                          → 解构导入 Pinyin 类
		// 6. const instance = new Pinyin();                                 → 实例化 Pinyin 类
		// 
		// 解决方案：将 pinyin 函数和所有常量/方法都作为自身的属性
		// 这样导出的对象既是函数，又包含所有需要的属性
		if pinyinObj != nil {
			// 设置 pinyin 函数自身为 pinyin 属性（支持解构导入函数）
			pinyinObj.Set("pinyin", pinyinFunc)
			
			// 🔥 添加 Pinyin 类（支持 new Pinyin() 语法）
			pinyinClass := pinyin.CreatePinyinClass(runtime)
			pinyinObj.Set("Pinyin", pinyinClass)
			
			// 注意：所有的常量和方法（STYLE_*, MODE_*, compare, compact, segment）
			// 已经在 CreatePinyinFunctionNew 中设置到 pinyinObj 上了
			// 所以它们自动支持解构导入
		}

		// 设置导出
		module.Set("exports", pinyinFunc)

		utils.Debug("pinyin 模块已注册（Go 原生 100% 兼容实现）",
			zap.Bool("has_compare", true),
			zap.Bool("has_compact", true),
			zap.Bool("has_Pinyin_class", true),
			zap.Bool("supports_destructuring", true),
			zap.Int("styles_count", 7),
			zap.Int("dict_chars", 41244),
			zap.Int("dict_phrases", 41140),
		)
	})

	utils.Debug("pinyin 模块已注册到 require 系统（Go 原生实现）")
}

// 🔥 Go 原生实现，不再需要以下方法：
// - loadPinyin
// - getCompiledProgram
// - PrecompilePinyin

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
// 🔥 Go 原生实现：无需预加载，极低内存占用（~5-10MB 共享字典）
func (pe *PinyinEnhancer) Setup(runtime *goja.Runtime) error {
	// Go 原生实现，按需加载即可
	return nil
}
