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

// DayjsEnhancer dayjs 模块增强器（使用 UMD 打包版本）
type DayjsEnhancer struct {
	dayjsPath       string        // dayjs 文件路径
	dayjsCache      string        // dayjs 代码缓存
	embeddedCode    string        // 嵌入的 dayjs 代码
	compiledProgram *goja.Program // dayjs 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
	cacheMutex      sync.RWMutex  // 代码字符串缓存锁
}

// NewDayjsEnhancer 创建新的dayjs增强器
func NewDayjsEnhancer() *DayjsEnhancer {
	// 获取可执行文件所在目录
	execPath, err := os.Executable()
	var dayjsPath string

	if err == nil {
		execDir := filepath.Dir(execPath)
		// 尝试 go-executor/external-libs/dayjs.min.js
		dayjsPath = filepath.Join(execDir, "external-libs", "dayjs.min.js")

		// 检查文件是否存在，如果不存在尝试其他路径
		if _, err := os.Stat(dayjsPath); os.IsNotExist(err) {
			// 尝试从当前工作目录
			if wd, err := os.Getwd(); err == nil {
				dayjsPath = filepath.Join(wd, "go-executor", "external-libs", "dayjs.min.js")

				// 还是不存在，尝试最后一个路径
				if _, err := os.Stat(dayjsPath); os.IsNotExist(err) {
					dayjsPath = filepath.Join(wd, "external-libs", "dayjs.min.js")
				}
			}
		}
	} else {
		// 无法获取可执行文件路径，使用相对路径
		dayjsPath = "go-executor/external-libs/dayjs.min.js"
	}

	utils.Debug("DayjsEnhancer initialized", zap.String("dayjs_path", dayjsPath))

	return &DayjsEnhancer{
		dayjsPath: dayjsPath,
	}
}

// NewDayjsEnhancerWithEmbedded 使用嵌入的 dayjs 代码创建增强器
func NewDayjsEnhancerWithEmbedded(embeddedCode string) *DayjsEnhancer {
	utils.Debug("DayjsEnhancer 初始化（嵌入式 dayjs）", zap.Int("size_bytes", len(embeddedCode)))

	return &DayjsEnhancer{
		embeddedCode: embeddedCode,
		dayjsPath:    "embedded",
	}
}

// RegisterDayjsModule 注册 dayjs 模块到require系统
func (dj *DayjsEnhancer) RegisterDayjsModule(registry *require.Registry) {
	// 注册 dayjs 模块（UMD 打包版本）
	registry.RegisterNativeModule("dayjs", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 dayjs 已加载
		if err := dj.loadDayjs(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("加载 dayjs 模块失败: %w", err)))
		}

		// 获取 dayjs 对象
		dayjsVal := runtime.Get("dayjs")
		if dayjsVal != nil && !goja.IsUndefined(dayjsVal) {
			module.Set("exports", dayjsVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("dayjs 不可用")))
		}
	})

	utils.Debug("dayjs module registered to require system (UMD)")
}

// loadDayjs 加载 dayjs 库 (带缓存优化)
func (dj *DayjsEnhancer) loadDayjs(runtime *goja.Runtime) error {
	// 每次都检查当前runtime中是否已经有 dayjs
	dayjsVal := runtime.Get("dayjs")
	if dayjsVal != nil && !goja.IsUndefined(dayjsVal) {
		return nil // 当前runtime中已经有了
	}

	// 获取编译后的 Program，避免每次重新解析
	program, err := dj.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的 dayjs 程序失败: %w", err)
	}

	// dayjs (UMD打包) 使用 UMD 格式，需要 module 和 exports 对象
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 直接运行编译后的程序
	result, err := runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行 dayjs 程序失败: %w", err)
	}

	// 获取导出的 dayjs 对象
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("dayjs", moduleExports)
	} else if result != nil && !goja.IsUndefined(result) {
		// 备选：如果没有通过 module.exports，尝试直接使用返回值
		runtime.Set("dayjs", result)
	} else {
		return fmt.Errorf("dayjs 加载后无法获取 dayjs 对象")
	}

	return nil
}

// getCompiledProgram 获取编译后的dayjs程序 (带缓存)
func (dj *DayjsEnhancer) getCompiledProgram() (*goja.Program, error) {
	// 使用 sync.Once 确保只编译一次
	dj.compileOnce.Do(func() {
		code, err := dj.getDayjsCode()
		if err != nil {
			dj.compileErr = fmt.Errorf("获取dayjs代码失败: %w", err)
			return
		}

		// 编译代码
		program, err := goja.Compile("dayjs.min.js", code, false)
		if err != nil {
			dj.compileErr = fmt.Errorf("编译dayjs代码失败: %w", err)
			return
		}

		dj.compiledProgram = program
		utils.Debug("dayjs 代码编译成功", zap.Int("size_bytes", len(code)))
	})

	if dj.compileErr != nil {
		return nil, dj.compileErr
	}

	return dj.compiledProgram, nil
}

// PrecompileDayjs 预编译 dayjs（用于启动时预热）
func (dj *DayjsEnhancer) PrecompileDayjs() error {
	_, err := dj.getCompiledProgram()
	return err
}

// getDayjsCode 获取dayjs代码 (带缓存)
func (dj *DayjsEnhancer) getDayjsCode() (string, error) {
	dj.cacheMutex.RLock()
	if dj.dayjsCache != "" {
		code := dj.dayjsCache
		dj.cacheMutex.RUnlock()
		return code, nil
	}
	dj.cacheMutex.RUnlock()

	// 优先使用嵌入的代码
	if dj.embeddedCode != "" {
		dj.cacheMutex.Lock()
		dj.dayjsCache = dj.embeddedCode
		dj.cacheMutex.Unlock()
		return dj.embeddedCode, nil
	}

	// 从文件读取
	data, err := os.ReadFile(dj.dayjsPath)
	if err != nil {
		return "", fmt.Errorf("读取dayjs文件失败: %w", err)
	}

	code := string(data)
	dj.cacheMutex.Lock()
	dj.dayjsCache = code
	dj.cacheMutex.Unlock()

	return code, nil
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (dj *DayjsEnhancer) Name() string {
	return "dayjs"
}

// Close 关闭 DayjsEnhancer 并释放资源
// Dayjs 模块不持有需要释放的资源，返回 nil
func (dj *DayjsEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (dj *DayjsEnhancer) Register(registry *require.Registry) error {
	dj.RegisterDayjsModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
// 注意：dayjs 采用按需加载策略，不预加载到 Runtime
func (dj *DayjsEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
