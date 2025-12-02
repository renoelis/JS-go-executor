package enhance_modules

import (
	"flow-codeblock-go/enhance_modules/internal/streams"
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

var (
	readableWebInteropProgram     *goja.Program
	readableWebInteropProgramOnce sync.Once
	readableWebInteropProgramErr  error
)

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

		patchReadableWebInterop(runtime, streamVal)

		// Node 风格：默认导出应为 Stream 构造函数，兼容旧行为保留属性拷贝
		exportVal := streamVal
		streamObj := streamVal.ToObject(runtime)
		if streamObj != nil {
			if def := streamObj.Get("default"); def != nil && !goja.IsUndefined(def) && !goja.IsNull(def) {
				exportVal = def
			}
			// 将 bundle 中的附加属性挂到导出对象上，保持 API 兼容
			if exportObj := exportVal.ToObject(runtime); exportObj != nil {
				for _, key := range streamObj.Keys() {
					exportObj.Set(key, streamObj.Get(key))
				}
				exportObj.Set("default", exportVal)
			}
		}

		module.Set("exports", exportVal)
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
	if err := streams.EnsureReadableStream(runtime); err != nil {
		return fmt.Errorf("初始化 ReadableStream 失败: %w", err)
	}
	return nil
}

const readableWebInteropPatchJS = `
(function () {
  var Readable = typeof __flow_stream_readable_ctor__ !== 'undefined' ? __flow_stream_readable_ctor__ : undefined;
  __flow_stream_readable_ctor__ = undefined;
  if (!Readable || typeof Readable !== 'function') {
    return;
  }

  var RS = typeof ReadableStream === 'function' ? ReadableStream : undefined;
  var textEncoder = typeof TextEncoder === 'function' ? new TextEncoder() : null;

  function toUint8(chunk) {
    if (chunk == null) {
      return chunk;
    }
    if (typeof chunk === 'string') {
      if (textEncoder) {
        return textEncoder.encode(chunk);
      }
      return chunk;
    }
    if (chunk instanceof ArrayBuffer) {
      return new Uint8Array(chunk);
    }
    return chunk;
  }

  Readable.toWeb = function (nodeStream) {
    if (!RS) {
      throw new TypeError('ReadableStream is not available');
    }
    if (!nodeStream || typeof nodeStream.on !== 'function') {
      throw new TypeError('The "stream" argument must be a readable stream.');
    }
    var closed = false;

    function removeAll(onData, onEnd, onError, onClose) {
      var remove = nodeStream.removeListener || nodeStream.off;
      if (typeof remove === 'function') {
        try { remove.call(nodeStream, 'data', onData); } catch (e) {}
        try { remove.call(nodeStream, 'end', onEnd); } catch (e) {}
        try { remove.call(nodeStream, 'error', onError); } catch (e) {}
        try { remove.call(nodeStream, 'close', onClose); } catch (e) {}
      }
    }

    return new RS({
      start: function (controller) {
        function cleanup() {
          if (closed) return;
          closed = true;
          removeAll(onData, onEnd, onError, onClose);
        }
        function onData(chunk) {
          try {
            controller.enqueue(toUint8(chunk));
          } catch (err) {
            onError(err);
          }
        }
        function onEnd() {
          cleanup();
          try { controller.close(); } catch (e) {}
        }
        function onClose() {
          cleanup();
        }
        function onError(err) {
          cleanup();
          try { controller.error(err); } catch (e) {}
        }

        var add = nodeStream.on || nodeStream.addListener;
        var once = nodeStream.once || nodeStream.on;

        if (typeof add === 'function') {
          add.call(nodeStream, 'data', onData);
        }
        if (typeof once === 'function') {
          once.call(nodeStream, 'end', onEnd);
          once.call(nodeStream, 'close', onClose);
          once.call(nodeStream, 'error', onError);
        } else if (typeof add === 'function') {
          add.call(nodeStream, 'end', onEnd);
          add.call(nodeStream, 'close', onClose);
          add.call(nodeStream, 'error', onError);
        }
      },
      cancel: function (reason) {
        closed = true;
        if (nodeStream && typeof nodeStream.destroy === 'function') {
          try { nodeStream.destroy(reason); } catch (e) {}
        } else if (nodeStream && typeof nodeStream.close === 'function') {
          try { nodeStream.close(); } catch (e) {}
        }
      }
    });
  };

  Readable.fromWeb = function (webStream, options) {
    if (!webStream || typeof webStream.getReader !== 'function') {
      throw new TypeError('The "stream" argument must be a ReadableStream.');
    }
    var reader = webStream.getReader();
    var aborted = options && options.signal && options.signal.aborted;

    if (options && options.signal && typeof options.signal.addEventListener === 'function') {
      options.signal.addEventListener('abort', function () {
        aborted = true;
        if (typeof webStream.cancel === 'function') {
          try { webStream.cancel(options.signal.reason); } catch (e) {}
        }
      }, { once: true });
    }

    var iterable = {};
    iterable[Symbol.asyncIterator] = function () {
      var done = false;
      return {
        next: function () {
          if (done) {
            return Promise.resolve({ done: true, value: undefined });
          }
          return reader.read().then(function (res) {
            if (res && res.done) {
              done = true;
              return { done: true, value: undefined };
            }
            return { done: false, value: res ? res.value : undefined };
          });
        },
        return: function () {
          done = true;
          try {
            if (reader && typeof reader.releaseLock === 'function') {
              reader.releaseLock();
            }
          } catch (e) {}
          if (aborted && typeof webStream.cancel === 'function') {
            try { webStream.cancel(options.signal.reason); } catch (e) {}
          }
          return Promise.resolve({ done: true });
        }
      };
    };

    return Readable.from(iterable, options);
  };
})();
`

func patchReadableWebInterop(runtime *goja.Runtime, streamVal goja.Value) {
	if runtime == nil || streamVal == nil || goja.IsUndefined(streamVal) || goja.IsNull(streamVal) {
		return
	}

	readableWebInteropProgramOnce.Do(func() {
		readableWebInteropProgram, readableWebInteropProgramErr = goja.Compile(
			"readable_web_interop_patch.js",
			readableWebInteropPatchJS,
			false,
		)
	})
	if readableWebInteropProgramErr != nil {
		panic(runtime.NewGoError(fmt.Errorf("编译 Readable toWeb/fromWeb 补丁失败: %w", readableWebInteropProgramErr)))
	}

	streamObj := streamVal.ToObject(runtime)
	if streamObj == nil {
		return
	}

	readableVal := streamObj.Get("Readable")
	if readableVal == nil || goja.IsUndefined(readableVal) || goja.IsNull(readableVal) {
		return
	}

	runtime.Set("__flow_stream_readable_ctor__", readableVal)
	defer runtime.Set("__flow_stream_readable_ctor__", goja.Undefined())

	if _, err := runtime.RunProgram(readableWebInteropProgram); err != nil {
		panic(runtime.NewGoError(fmt.Errorf("补丁 Readable toWeb/fromWeb 失败: %w", err)))
	}
}
