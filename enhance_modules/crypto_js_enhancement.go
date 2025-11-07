// Package enhance_modules 提供各种模块增强器
//
// crypto_js_enhancement.go - CryptoJS 外部库增强器
//
// 特性：
//   - 🔥 封装外部 crypto-js.min.js 库（类似 dayjs.min.js）
//   - ✅ 与原生 crypto 模块分离
//   - ✅ 支持从文件或嵌入代码加载
//   - ✅ 编译缓存优化
package enhance_modules

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
)

// ============================================================================
// 🔥 CryptoJS 缓存结构
// ============================================================================

// CryptoJSCache crypto-js 代码缓存
type CryptoJSCache struct {
	CryptoJSPath    string        // crypto-js文件路径
	CryptoJSCode    string        // crypto-js代码缓存
	EmbeddedCode    string        // 嵌入的crypto-js代码
	CompiledProgram *goja.Program // crypto-js编译后的程序缓存
	CompileOnce     sync.Once     // 使用 sync.Once 确保只编译一次
	CompileErr      error         // 编译错误缓存
	CacheMutex      sync.RWMutex  // 代码字符串缓存锁
}

// ============================================================================
// 🔥 CryptoJS Enhancer
// ============================================================================

// CryptoJSEnhancer crypto-js 外部库增强器
type CryptoJSEnhancer struct {
	cache *CryptoJSCache
}

// NewCryptoJSEnhancer 创建新的 crypto-js 增强器
func NewCryptoJSEnhancer() *CryptoJSEnhancer {
	// 获取可执行文件所在目录
	execPath, err := os.Executable()
	var cryptoJSPath string

	if err == nil {
		execDir := filepath.Dir(execPath)
		cryptoJSPath = filepath.Join(execDir, "external-libs", "crypto-js.min.js")

		// 检查文件是否存在
		if _, err := os.Stat(cryptoJSPath); os.IsNotExist(err) {
			if wd, err := os.Getwd(); err == nil {
				cryptoJSPath = filepath.Join(wd, "go-executor", "external-libs", "crypto-js.min.js")
				if _, err := os.Stat(cryptoJSPath); os.IsNotExist(err) {
					cryptoJSPath = filepath.Join(wd, "external-libs", "crypto-js.min.js")
				}
			}
		}
	} else {
		cryptoJSPath = "go-executor/external-libs/crypto-js.min.js"
	}

	utils.Debug("CryptoJSEnhancer 初始化（外部库）",
		zap.String("crypto_js_path", cryptoJSPath),
		zap.Bool("external_lib", true),
	)

	return &CryptoJSEnhancer{
		cache: &CryptoJSCache{
			CryptoJSPath: cryptoJSPath,
		},
	}
}

// NewCryptoJSEnhancerWithEmbedded 使用嵌入的 crypto-js 代码创建增强器
func NewCryptoJSEnhancerWithEmbedded(embeddedCode string) *CryptoJSEnhancer {
	utils.Debug("CryptoJSEnhancer 初始化（使用嵌入代码）",
		zap.Int("code_size", len(embeddedCode)),
		zap.Bool("external_lib", true),
	)

	return &CryptoJSEnhancer{
		cache: &CryptoJSCache{
			EmbeddedCode: embeddedCode,
		},
	}
}

// ============================================================================
// 🔥 模块注册
// ============================================================================

// RegisterCryptoJSModule 注册 crypto-js 模块到 require 系统
func (cje *CryptoJSEnhancer) RegisterCryptoJSModule(registry *require.Registry) {
	registry.RegisterNativeModule("crypto-js", func(runtime *goja.Runtime, module *goja.Object) {
		// 加载 crypto-js
		if err := cje.loadCryptoJS(runtime); err != nil {
			utils.Error("加载 crypto-js 失败", zap.Error(err))
			panic(runtime.NewGoError(err))
		}

		// 获取 CryptoJS 全局对象
		cryptoJS := runtime.Get("CryptoJS")
		module.Set("exports", cryptoJS)

		utils.Debug("crypto-js 模块已注册（外部库）")
	})
}

// ============================================================================
// 🔥 CryptoJS 加载和编译
// ============================================================================

// loadCryptoJS 加载 crypto-js 库
func (cje *CryptoJSEnhancer) loadCryptoJS(runtime *goja.Runtime) error {
	if cje.cache == nil {
		return fmt.Errorf("cache 为空")
	}

	// 获取编译后的程序
	program, err := cje.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的程序失败: %w", err)
	}

	// 执行 crypto-js
	_, err = runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 crypto-js 失败: %w", err)
	}

	utils.Debug("crypto-js 加载成功（外部库）")
	return nil
}

// getCompiledProgram 获取编译后的程序（使用缓存）
func (cje *CryptoJSEnhancer) getCompiledProgram() (*goja.Program, error) {
	cje.cache.CompileOnce.Do(func() {
		code, err := cje.getCryptoJSCode()
		if err != nil {
			cje.cache.CompileErr = err
			return
		}

		program, err := goja.Compile("crypto-js.min.js", code, true)
		if err != nil {
			cje.cache.CompileErr = fmt.Errorf("编译 crypto-js 失败: %w", err)
			return
		}

		cje.cache.CompiledProgram = program
		utils.Debug("crypto-js 编译成功（外部库）", zap.Int("code_size", len(code)))
	})

	if cje.cache.CompileErr != nil {
		return nil, cje.cache.CompileErr
	}

	return cje.cache.CompiledProgram, nil
}

// getCryptoJSCode 获取 crypto-js 代码
func (cje *CryptoJSEnhancer) getCryptoJSCode() (string, error) {
	cje.cache.CacheMutex.RLock()
	if cje.cache.CryptoJSCode != "" {
		defer cje.cache.CacheMutex.RUnlock()
		return cje.cache.CryptoJSCode, nil
	}
	cje.cache.CacheMutex.RUnlock()

	cje.cache.CacheMutex.Lock()
	defer cje.cache.CacheMutex.Unlock()

	// 再次检查（双重检查锁定）
	if cje.cache.CryptoJSCode != "" {
		return cje.cache.CryptoJSCode, nil
	}

	// 优先使用嵌入的代码
	if cje.cache.EmbeddedCode != "" {
		cje.cache.CryptoJSCode = cje.cache.EmbeddedCode
		return cje.cache.CryptoJSCode, nil
	}

	// 从文件加载
	if cje.cache.CryptoJSPath != "" {
		code, err := os.ReadFile(cje.cache.CryptoJSPath)
		if err != nil {
			return "", fmt.Errorf("读取 crypto-js 文件失败: %w", err)
		}
		cje.cache.CryptoJSCode = string(code)
		return cje.cache.CryptoJSCode, nil
	}

	return "", fmt.Errorf("未找到 crypto-js 代码")
}

// PrecompileCryptoJS 预编译 crypto-js（优化启动性能）
func (cje *CryptoJSEnhancer) PrecompileCryptoJS() error {
	if cje.cache == nil {
		return nil
	}

	// 触发编译（通过 sync.Once 只编译一次）
	_, err := cje.getCompiledProgram()
	return err
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口
// ============================================================================

// Name 返回模块名称
func (cje *CryptoJSEnhancer) Name() string {
	return "crypto-js"
}

// Close 关闭 CryptoJSEnhancer 并释放资源
func (cje *CryptoJSEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (cje *CryptoJSEnhancer) Register(registry *require.Registry) error {
	cje.RegisterCryptoJSModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (cje *CryptoJSEnhancer) Setup(runtime *goja.Runtime) error {
	// crypto-js 只在被 require 时加载，不预加载
	return nil
}
