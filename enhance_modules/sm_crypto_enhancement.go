package enhance_modules

import (
	"crypto/rand"
	"fmt"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// SMCryptoEnhancer sm-crypto-v2 模块增强器
type SMCryptoEnhancer struct {
	embeddedCode    string        // 嵌入的 sm-crypto-v2 代码
	compiledProgram *goja.Program // sm-crypto-v2 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewSMCryptoEnhancer 创建新的 sm-crypto-v2 增强器
func NewSMCryptoEnhancer(embeddedCode string) *SMCryptoEnhancer {
	utils.Debug("SMCryptoEnhancer 初始化", zap.Int("size_bytes", len(embeddedCode)))
	return &SMCryptoEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterSMCryptoModule 注册 sm-crypto-v2 模块到 require 系统
func (sce *SMCryptoEnhancer) RegisterSMCryptoModule(registry *require.Registry) {
	registry.RegisterNativeModule("sm-crypto-v2", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 sm-crypto-v2 已加载
		if err := sce.loadSMCrypto(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("加载 sm-crypto-v2 模块失败: %w", err)))
		}

		// 获取 sm-crypto-v2 导出对象
		smCryptoVal := runtime.Get("SMCrypto")
		if smCryptoVal != nil && !goja.IsUndefined(smCryptoVal) {
			module.Set("exports", smCryptoVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("sm-crypto-v2 not available")))
		}
	})

	utils.Debug("sm-crypto-v2 模块已注册到 require 系统")
}

// loadSMCrypto 加载 sm-crypto 库 (带缓存优化)
func (sce *SMCryptoEnhancer) loadSMCrypto(runtime *goja.Runtime) error {
	// 检查当前 runtime 中是否已经有 SMCrypto
	smCryptoVal := runtime.Get("SMCrypto")
	if smCryptoVal != nil && !goja.IsUndefined(smCryptoVal) {
		return nil
	}

	// 🔥 1. 先设置 crypto.getRandomValues（sm-crypto 初始化时需要）
	sce.setupCryptoPolyfill(runtime)

	// 🔥 2. 设置 Uint8Array.from polyfill（Goja 可能不支持）
	sce.setupUint8ArrayPolyfill(runtime)

	// 获取编译后的 Program
	program, err := sce.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 sm-crypto 程序失败: %w", err)
	}

	// sm-crypto-v2 使用 UMD 格式
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 运行编译后的程序
	_, err = runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 sm-crypto-v2 程序失败: %w", err)
	}

	// 获取导出的对象
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("SMCrypto", moduleExports)
		utils.Debug("sm-crypto-v2 模块加载成功",
			zap.Bool("has_sm2", !goja.IsUndefined(moduleExports.ToObject(runtime).Get("sm2"))),
			zap.Bool("has_sm3", !goja.IsUndefined(moduleExports.ToObject(runtime).Get("sm3"))),
			zap.Bool("has_sm4", !goja.IsUndefined(moduleExports.ToObject(runtime).Get("sm4"))),
		)
		return nil
	}

	return fmt.Errorf("sm-crypto-v2 模块加载失败: exports is undefined")
}

// getCompiledProgram 获取编译后的 sm-crypto 程序（只编译一次）
func (sce *SMCryptoEnhancer) getCompiledProgram() (*goja.Program, error) {
	sce.compileOnce.Do(func() {
		if sce.embeddedCode == "" {
			sce.compileErr = fmt.Errorf("sm-crypto-v2 embedded code is empty")
			return
		}

		program, err := goja.Compile("sm-crypto-v2.js", sce.embeddedCode, true)
		if err != nil {
			sce.compileErr = fmt.Errorf("编译 sm-crypto-v2 代码失败: %w", err)
			return
		}

		sce.compiledProgram = program
		utils.Debug("sm-crypto-v2 程序编译成功", zap.Int("code_size_bytes", len(sce.embeddedCode)))
	})

	return sce.compiledProgram, sce.compileErr
}

// PrecompileSMCrypto 预编译 sm-crypto（用于启动时预热）
func (sce *SMCryptoEnhancer) PrecompileSMCrypto() error {
	_, err := sce.getCompiledProgram()
	return err
}

// setupCryptoPolyfill 设置 crypto.getRandomValues polyfill
// sm-crypto 需要 Web Crypto API 来生成随机数
// 使用 Go 的 crypto/rand 提供密码学安全的随机数生成器（CSPRNG）
func (sce *SMCryptoEnhancer) setupCryptoPolyfill(runtime *goja.Runtime) {
	// 检查是否已有 crypto API
	cryptoVal := runtime.Get("crypto")
	if cryptoVal != nil && !goja.IsUndefined(cryptoVal) {
		cryptoObj := cryptoVal.ToObject(runtime)
		if cryptoObj != nil {
			getRandomValues := cryptoObj.Get("getRandomValues")
			if getRandomValues != nil && !goja.IsUndefined(getRandomValues) {
				utils.Debug("crypto.getRandomValues 已存在，跳过 polyfill")
				return
			}
		}
	}

	// 创建 crypto 对象
	cryptoObj := runtime.NewObject()

	// 🔥 使用 Go 的 crypto/rand 实现密码学安全的 getRandomValues
	getRandomValues := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("getRandomValues requires 1 argument"))
		}

		arrayArg := call.Arguments[0]
		if goja.IsUndefined(arrayArg) || goja.IsNull(arrayArg) {
			panic(runtime.NewTypeError("getRandomValues argument must be a TypedArray"))
		}

		// 获取数组对象
		arrayObj := arrayArg.ToObject(runtime)
		if arrayObj == nil {
			panic(runtime.NewTypeError("getRandomValues argument must be a TypedArray"))
		}

		// 获取数组长度
		lengthVal := arrayObj.Get("length")
		if goja.IsUndefined(lengthVal) {
			panic(runtime.NewTypeError("getRandomValues argument must have a length property"))
		}
		length := int(lengthVal.ToInteger())

		if length == 0 {
			return arrayArg
		}

		// 🔥 使用 Go 的 crypto/rand 生成密码学安全的随机数
		randomBytes := make([]byte, length)
		_, err := rand.Read(randomBytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to generate random bytes: %w", err)))
		}

		// 将随机字节写入数组
		for i := 0; i < length; i++ {
			arrayObj.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(randomBytes[i])))
		}

		utils.Debug("crypto.getRandomValues 生成随机数",
			zap.Int("length", length),
			zap.String("type", "crypto/rand (CSPRNG)"),
		)

		return arrayArg
	}

	cryptoObj.Set("getRandomValues", getRandomValues)

	// 🔥 同时设置到全局和 globalThis，确保都能访问
	runtime.Set("crypto", cryptoObj)

	globalThis := runtime.GlobalObject().Get("globalThis")
	if !goja.IsUndefined(globalThis) {
		globalThis.ToObject(runtime).Set("crypto", cryptoObj)
	}

	utils.Debug("crypto.getRandomValues 已设置（使用 Go crypto/rand CSPRNG）",
		zap.Bool("global", true),
		zap.Bool("globalThis", !goja.IsUndefined(globalThis)),
	)
}

// setupUint8ArrayPolyfill 设置 Uint8Array.from polyfill
// Goja 可能不支持 TypedArray.from() 静态方法（ES6）
func (sce *SMCryptoEnhancer) setupUint8ArrayPolyfill(runtime *goja.Runtime) {
	polyfillCode := `
(function() {
	// 检查是否需要 polyfill
	if (typeof Uint8Array.from === 'function') {
		return; // 已经支持，无需 polyfill
	}

	// Polyfill for Uint8Array.from (ES6 feature)
	Uint8Array.from = function(arrayLike, mapFn, thisArg) {
		// 转换为数组
		var arr = Array.prototype.slice.call(arrayLike);
		
		// 如果提供了映射函数，应用它
		if (mapFn) {
			arr = arr.map(mapFn, thisArg);
		}
		
		// 创建并返回 Uint8Array
		var result = new Uint8Array(arr.length);
		for (var i = 0; i < arr.length; i++) {
			result[i] = arr[i];
		}
		return result;
	};

	// 同样为其他 TypedArray 添加 from 方法
	var typedArrays = [
		Int8Array, Uint8ClampedArray, Int16Array, Uint16Array,
		Int32Array, Uint32Array, Float32Array, Float64Array
	];
	
	typedArrays.forEach(function(TypedArray) {
		if (typeof TypedArray.from !== 'function') {
			TypedArray.from = function(arrayLike, mapFn, thisArg) {
				var arr = Array.prototype.slice.call(arrayLike);
				if (mapFn) {
					arr = arr.map(mapFn, thisArg);
				}
				var result = new TypedArray(arr.length);
				for (var i = 0; i < arr.length; i++) {
					result[i] = arr[i];
				}
				return result;
			};
		}
	});
})();
`
	_, err := runtime.RunString(polyfillCode)
	if err != nil {
		utils.Warn("Uint8Array.from polyfill 设置失败", zap.Error(err))
	} else {
		utils.Debug("Uint8Array.from polyfill 已设置")
	}
}

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
