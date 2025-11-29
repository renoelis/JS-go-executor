package enhance_modules

import (
	"flow-codeblock-go/utils"
	"fmt"
	"sync"

	"go.uber.org/zap"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// StreamEnhancer stream 模块增强器
// 基于 readable-stream@4.x 实现，与 Node.js v25 stream API 兼容
//
// 导出的 API:
//   - Stream (基础流类)
//   - Readable (可读流)
//   - Writable (可写流)
//   - Duplex (双向流)
//   - Transform (转换流)
//   - PassThrough (透传流)
//   - pipeline (流管道)
//   - finished (流结束检测)
//   - compose (流组合)
//   - addAbortSignal (添加中止信号)
//   - promises (Promise 版本的 API)
type StreamEnhancer struct {
	embeddedCode    string        // 嵌入的 stream.bundle.js 代码
	compiledProgram *goja.Program // 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewStreamEnhancer 创建新的 stream 增强器
func NewStreamEnhancer(embeddedCode string) *StreamEnhancer {
	utils.Debug("StreamEnhancer 初始化", zap.Int("size_bytes", len(embeddedCode)))

	return &StreamEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterStreamModule 注册 stream 模块到 require 系统
func (se *StreamEnhancer) RegisterStreamModule(registry *require.Registry) {
	registry.RegisterNativeModule("stream", func(runtime *goja.Runtime, module *goja.Object) {
		// 先检查是否已经加载过（避免重复执行）
		streamVal := runtime.Get("__stream_bundle__")
		if streamVal != nil && !goja.IsUndefined(streamVal) {
			module.Set("exports", streamVal)
			return
		}

		// 确保 stream 代码已编译
		se.compileOnce.Do(func() {
			var err error
			se.compiledProgram, err = goja.Compile("stream.bundle.js", se.embeddedCode, true)
			if err != nil {
				se.compileErr = err
			}
		})

		if se.compileErr != nil {
			panic(runtime.NewGoError(fmt.Errorf("编译 stream.bundle.js 失败: %w", se.compileErr)))
		}

		// 设置 CommonJS 环境变量（readable-stream 内部可能需要）
		moduleObj := runtime.NewObject()
		exportsObj := runtime.NewObject()
		moduleObj.Set("exports", exportsObj)
		runtime.Set("module", moduleObj)
		runtime.Set("exports", exportsObj)

		// 确保 globalThis 存在
		if runtime.Get("globalThis") == nil || goja.IsUndefined(runtime.Get("globalThis")) {
			runtime.Set("globalThis", runtime.GlobalObject())
		}

		// 执行 stream.bundle.js 代码
		_, err := runtime.RunProgram(se.compiledProgram)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("执行 stream.bundle.js 失败: %w", err)))
		}

		// 获取 __stream_bundle__ 对象
		streamVal = runtime.Get("__stream_bundle__")
		if streamVal == nil || goja.IsUndefined(streamVal) {
			panic(runtime.NewGoError(fmt.Errorf("加载 stream.bundle.js 后未找到 __stream_bundle__ 对象")))
		}

		// 导出 stream
		module.Set("exports", streamVal)
	})
}

// PrecompileStream 预编译 stream（用于启动时预热）
func (se *StreamEnhancer) PrecompileStream() error {
	se.compileOnce.Do(func() {
		var err error
		se.compiledProgram, err = goja.Compile("stream.bundle.js", se.embeddedCode, true)
		if err != nil {
			se.compileErr = err
		}
	})
	return se.compileErr
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (se *StreamEnhancer) Name() string {
	return "stream"
}

// Close 关闭 StreamEnhancer 并释放资源
// Stream 模块不持有需要释放的资源，返回 nil
func (se *StreamEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (se *StreamEnhancer) Register(registry *require.Registry) error {
	se.RegisterStreamModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
func (se *StreamEnhancer) Setup(runtime *goja.Runtime) error {
	// Stream 不需要额外的 Runtime 设置
	// 用户通过 require('stream') 使用
	return nil
}
