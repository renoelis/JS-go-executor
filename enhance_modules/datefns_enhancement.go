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

// DateFnsEnhancer date-fns 模块增强器（使用 webpack 打包的 UMD 版本）
type DateFnsEnhancer struct {
	dateFnsPath     string        // date-fns 文件路径
	dateFnsCache    string        // date-fns 代码缓存
	embeddedCode    string        // 嵌入的 date-fns 代码
	compiledProgram *goja.Program // date-fns 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
	cacheMutex      sync.RWMutex  // 代码字符串缓存锁
}

// NewDateFnsEnhancer 创建新的date-fns增强器
func NewDateFnsEnhancer() *DateFnsEnhancer {
	// 获取可执行文件所在目录
	execPath, err := os.Executable()
	var dateFnsPath string

	if err == nil {
		execDir := filepath.Dir(execPath)
		// 尝试 go-executor/external-libs/date-fns.min.js
		dateFnsPath = filepath.Join(execDir, "external-libs", "date-fns.min.js")

		// 检查文件是否存在，如果不存在尝试其他路径
		if _, err := os.Stat(dateFnsPath); os.IsNotExist(err) {
			// 尝试从当前工作目录
			if wd, err := os.Getwd(); err == nil {
				dateFnsPath = filepath.Join(wd, "go-executor", "external-libs", "date-fns.min.js")

				// 还是不存在，尝试最后一个路径
				if _, err := os.Stat(dateFnsPath); os.IsNotExist(err) {
					dateFnsPath = filepath.Join(wd, "external-libs", "date-fns.min.js")
				}
			}
		}
	} else {
		// 无法获取可执行文件路径，使用相对路径
		dateFnsPath = "go-executor/external-libs/date-fns.min.js"
	}

	utils.Debug("DateFnsEnhancer initialized", zap.String("date_fns_path", dateFnsPath))

	return &DateFnsEnhancer{
		dateFnsPath: dateFnsPath,
	}
}

// NewDateFnsEnhancerWithEmbedded 使用嵌入的 date-fns 代码创建增强器
func NewDateFnsEnhancerWithEmbedded(embeddedCode string) *DateFnsEnhancer {
	utils.Debug("DateFnsEnhancer 初始化（嵌入式 date-fns）", zap.Int("size_bytes", len(embeddedCode)))

	return &DateFnsEnhancer{
		embeddedCode: embeddedCode,
		dateFnsPath:  "embedded",
	}
}

// RegisterDateFnsModule 注册 date-fns 模块到require系统
func (dfe *DateFnsEnhancer) RegisterDateFnsModule(registry *require.Registry) {
	// 注册 date-fns 模块（webpack UMD 打包版本）
	registry.RegisterNativeModule("date-fns", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 date-fns 已加载
		if err := dfe.loadDateFns(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to load date-fns: %w", err)))
		}

		// 获取 dateFns 对象
		dateFnsVal := runtime.Get("dateFns")
		if dateFnsVal != nil && !goja.IsUndefined(dateFnsVal) {
			module.Set("exports", dateFnsVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("date-fns not available")))
		}
	})

	utils.Debug("date-fns module registered to require system (webpack UMD)")
}

// loadDateFns 加载 date-fns 库 (带缓存优化)
func (dfe *DateFnsEnhancer) loadDateFns(runtime *goja.Runtime) error {
	// 每次都检查当前runtime中是否已经有 dateFns
	dateFnsVal := runtime.Get("dateFns")
	if dateFnsVal != nil && !goja.IsUndefined(dateFnsVal) {
		return nil // 当前runtime中已经有了
	}

	// 获取编译后的 Program，避免每次重新解析
	program, err := dfe.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 date-fns 程序失败: %w", err)
	}

	// date-fns (webpack打包) 使用 UMD 格式，需要 module 和 exports 对象
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 直接运行编译后的程序
	result, err := runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 date-fns 程序失败: %w", err)
	}

	// 获取导出的 dateFns 对象
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("dateFns", moduleExports)
	} else if result != nil && !goja.IsUndefined(result) {
		// 备选：如果没有通过 module.exports，尝试直接使用返回值
		runtime.Set("dateFns", result)
	} else {
		return fmt.Errorf("date-fns 加载后无法获取 dateFns 对象")
	}

	return nil
}

// getCompiledProgram 获取编译后的date-fns程序 (带缓存)
func (dfe *DateFnsEnhancer) getCompiledProgram() (*goja.Program, error) {
	// 使用 sync.Once 确保只编译一次
	dfe.compileOnce.Do(func() {
		code, err := dfe.getDateFnsCode()
		if err != nil {
			dfe.compileErr = fmt.Errorf("获取date-fns代码失败: %w", err)
			return
		}

		// 编译代码
		program, err := goja.Compile("date-fns.min.js", code, false)
		if err != nil {
			dfe.compileErr = fmt.Errorf("编译date-fns代码失败: %w", err)
			return
		}

		dfe.compiledProgram = program
		utils.Debug("date-fns 代码编译成功", zap.Int("size_bytes", len(code)))
	})

	if dfe.compileErr != nil {
		return nil, dfe.compileErr
	}

	return dfe.compiledProgram, nil
}

// PrecompileDateFns 预编译 date-fns（用于启动时预热）
func (dfe *DateFnsEnhancer) PrecompileDateFns() error {
	_, err := dfe.getCompiledProgram()
	return err
}

// getDateFnsCode 获取date-fns代码 (带缓存)
func (dfe *DateFnsEnhancer) getDateFnsCode() (string, error) {
	dfe.cacheMutex.RLock()
	if dfe.dateFnsCache != "" {
		code := dfe.dateFnsCache
		dfe.cacheMutex.RUnlock()
		return code, nil
	}
	dfe.cacheMutex.RUnlock()

	// 优先使用嵌入的代码
	if dfe.embeddedCode != "" {
		dfe.cacheMutex.Lock()
		dfe.dateFnsCache = dfe.embeddedCode
		dfe.cacheMutex.Unlock()
		return dfe.embeddedCode, nil
	}

	// 从文件读取
	data, err := os.ReadFile(dfe.dateFnsPath)
	if err != nil {
		return "", fmt.Errorf("读取date-fns文件失败: %w", err)
	}

	code := string(data)
	dfe.cacheMutex.Lock()
	dfe.dateFnsCache = code
	dfe.cacheMutex.Unlock()

	return code, nil
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (de *DateFnsEnhancer) Name() string {
	return "date-fns"
}

// Close 关闭 DateFnsEnhancer 并释放资源
// DateFns 模块不持有需要释放的资源，返回 nil
func (de *DateFnsEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (de *DateFnsEnhancer) Register(registry *require.Registry) error {
	de.RegisterDateFnsModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
// 注意：由于采用白名单策略保留了 Date.prototype.constructor，预加载不是必须的，
//
//	但可以提升性能并在启动时验证模块是否正常
func (de *DateFnsEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
