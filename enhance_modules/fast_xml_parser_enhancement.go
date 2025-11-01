package enhance_modules

import (
	"fmt"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// FastXMLParserEnhancer fast-xml-parser 模块增强器
type FastXMLParserEnhancer struct {
	embeddedCode    string        // 嵌入的 fast-xml-parser 代码
	compiledProgram *goja.Program // fast-xml-parser 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewFastXMLParserEnhancer 创建新的 fast-xml-parser 增强器
func NewFastXMLParserEnhancer(embeddedCode string) *FastXMLParserEnhancer {
	utils.Debug("FastXMLParserEnhancer 初始化", zap.Int("size_bytes", len(embeddedCode)))
	return &FastXMLParserEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterFastXMLParserModule 注册 fast-xml-parser 模块到 require 系统
func (fxpe *FastXMLParserEnhancer) RegisterFastXMLParserModule(registry *require.Registry) {
	registry.RegisterNativeModule("fast-xml-parser", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 fast-xml-parser 已加载
		if err := fxpe.loadFastXMLParser(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("加载 fast-xml-parser 模块失败: %w", err)))
		}

		// 获取 fast-xml-parser 导出对象
		fxpVal := runtime.Get("fxp")
		if fxpVal != nil && !goja.IsUndefined(fxpVal) {
			module.Set("exports", fxpVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("fast-xml-parser not available")))
		}
	})

	utils.Debug("fast-xml-parser 模块已注册到 require 系统")
}

// loadFastXMLParser 加载 fast-xml-parser 库 (带缓存优化)
func (fxpe *FastXMLParserEnhancer) loadFastXMLParser(runtime *goja.Runtime) error {
	// 检查当前 runtime 中是否已经有 fxp
	fxpVal := runtime.Get("fxp")
	if fxpVal != nil && !goja.IsUndefined(fxpVal) {
		return nil
	}

	// 获取编译后的 Program
	program, err := fxpe.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 fast-xml-parser 程序失败: %w", err)
	}

	// 🔥 临时删除 module 和 exports，确保 UMD 包装选择全局变量分支
	// UMD 包装会检查 typeof module !== "undefined"，如果存在就用 CommonJS 导出
	// 我们需要它使用全局变量 fxp，所以必须完全删除这些变量（而不是设置为 undefined）
	globalObj := runtime.GlobalObject()
	moduleVal := runtime.Get("module")
	exportsVal := runtime.Get("exports")
	hasModule := moduleVal != nil && !goja.IsUndefined(moduleVal)
	hasExports := exportsVal != nil && !goja.IsUndefined(exportsVal)
	
	// 检查 UMD 包装会用到的全局对象
	windowVal := runtime.Get("window")
	globalVal := runtime.Get("global")
	selfVal := runtime.Get("self")
	
	// 完全删除 module 和 exports 属性，让 typeof 检查返回 "undefined"
	if hasModule {
		globalObj.Delete("module")
	}
	if hasExports {
		globalObj.Delete("exports")
	}

	// 运行编译后的程序（browserify 打包的代码会自动设置全局变量 fxp）
	_, err = runtime.RunProgram(program)
	
	// 检查 fxp 是否被设置
	fxpVal = runtime.Get("fxp")
	
	// 🔥 UMD 包装可能将 fxp 设置到 global/window/self 上，需要提升到顶层
	if fxpVal == nil || goja.IsUndefined(fxpVal) {
		// 优先从 global 获取（最常见）
		if globalVal != nil && !goja.IsUndefined(globalVal) {
			if globalObjVal, ok := globalVal.(*goja.Object); ok {
				globalFxp := globalObjVal.Get("fxp")
				if globalFxp != nil && !goja.IsUndefined(globalFxp) {
					fxpVal = globalFxp
					runtime.Set("fxp", fxpVal)
				}
			}
		}
		// 其次从 window 获取
		if (fxpVal == nil || goja.IsUndefined(fxpVal)) && windowVal != nil && !goja.IsUndefined(windowVal) {
			if windowObj, ok := windowVal.(*goja.Object); ok {
				windowFxp := windowObj.Get("fxp")
				if windowFxp != nil && !goja.IsUndefined(windowFxp) {
					fxpVal = windowFxp
					runtime.Set("fxp", fxpVal)
				}
			}
		}
		// 最后从 self 获取
		if (fxpVal == nil || goja.IsUndefined(fxpVal)) && selfVal != nil && !goja.IsUndefined(selfVal) {
			if selfObj, ok := selfVal.(*goja.Object); ok {
				selfFxp := selfObj.Get("fxp")
				if selfFxp != nil && !goja.IsUndefined(selfFxp) {
					fxpVal = selfFxp
					runtime.Set("fxp", fxpVal)
				}
			}
		}
	}
	
	// 恢复 module 和 exports
	if hasModule {
		runtime.Set("module", moduleVal)
	}
	if hasExports {
		runtime.Set("exports", exportsVal)
	}
	
	if err != nil {
		return fmt.Errorf("执行 fast-xml-parser 程序失败: %w", err)
	}

	// 验证 fxp 已被设置
	if fxpVal == nil || goja.IsUndefined(fxpVal) {
		return fmt.Errorf("fast-xml-parser 模块加载失败: fxp 未能正确加载")
	}

	return nil
}

// getCompiledProgram 获取编译后的 fast-xml-parser 程序（只编译一次）
func (fxpe *FastXMLParserEnhancer) getCompiledProgram() (*goja.Program, error) {
	fxpe.compileOnce.Do(func() {
		if fxpe.embeddedCode == "" {
			fxpe.compileErr = fmt.Errorf("fast-xml-parser embedded code is empty")
			return
		}

		program, err := goja.Compile("fast-xml-parser.min.js", fxpe.embeddedCode, true)
		if err != nil {
			fxpe.compileErr = fmt.Errorf("编译 fast-xml-parser 代码失败: %w", err)
			return
		}

		fxpe.compiledProgram = program
		utils.Debug("fast-xml-parser 程序编译成功", zap.Int("code_size_bytes", len(fxpe.embeddedCode)))
	})

	return fxpe.compiledProgram, fxpe.compileErr
}

// PrecompileFastXMLParser 预编译 fast-xml-parser（用于启动时预热）
func (fxpe *FastXMLParserEnhancer) PrecompileFastXMLParser() error {
	_, err := fxpe.getCompiledProgram()
	return err
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (fxpe *FastXMLParserEnhancer) Name() string {
	return "fast-xml-parser"
}

// Close 关闭 FastXMLParserEnhancer 并释放资源
// Fast-xml-parser 模块不持有需要释放的资源，返回 nil
func (fxpe *FastXMLParserEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (fxpe *FastXMLParserEnhancer) Register(registry *require.Registry) error {
	fxpe.RegisterFastXMLParserModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
// 💡 fast-xml-parser 库不常用，不预加载以节省内存
func (fxpe *FastXMLParserEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
