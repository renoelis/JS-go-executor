package streams

import (
	"bytes"
	"compress/flate"
	"compress/gzip"
	"fmt"
	"io"
	"sync"

	"github.com/dop251/goja"
)

// compressionFormat 压缩格式枚举
type compressionFormat string

const (
	formatGzip       compressionFormat = "gzip"
	formatDeflate    compressionFormat = "deflate"
	formatDeflateRaw compressionFormat = "deflate-raw"
)

// validateCompressionFormat 验证压缩格式
func validateCompressionFormat(format string) (compressionFormat, error) {
	switch format {
	case "gzip":
		return formatGzip, nil
	case "deflate":
		return formatDeflate, nil
	case "deflate-raw":
		return formatDeflateRaw, nil
	default:
		return "", fmt.Errorf("The provided value '%s' is not a valid enum value of type CompressionFormat", format)
	}
}

// compressionStreamPolyfillJS 提供 CompressionStream 和 DecompressionStream 的 JS polyfill
// 利用 Go 侧注入的 __goCompress 和 __goDecompress 函数实现实际压缩/解压
// 注意：由于 web-streams-polyfill 在 goja 中的 TransformStream writer.write() 有兼容性问题，
// 这里使用自定义的 ReadableStream + WritableStream 组合来实现，而不是使用 TransformStream
const compressionStreamPolyfillJS = `
(function(global) {
  'use strict';

  // 检查是否已经存在
  if (typeof global.CompressionStream === 'function' && typeof global.DecompressionStream === 'function') {
    return;
  }

  // 辅助函数：将输入转换为 Uint8Array
  function toUint8Array(chunk) {
    if (chunk instanceof Uint8Array) {
      return chunk;
    } else if (chunk instanceof ArrayBuffer) {
      return new Uint8Array(chunk);
    } else if (ArrayBuffer.isView(chunk)) {
      return new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
    } else {
      throw new TypeError('chunk must be BufferSource');
    }
  }

  // CompressionStream 构造函数
  function CompressionStream(format) {
    if (!(this instanceof CompressionStream)) {
      throw new TypeError("Failed to construct 'CompressionStream': Please use the 'new' operator");
    }

    // 验证 format
    if (format !== 'gzip' && format !== 'deflate' && format !== 'deflate-raw') {
      throw new TypeError("Failed to construct 'CompressionStream': The provided value '" + format + "' is not a valid enum value of type CompressionFormat.");
    }

    var self = this;
    var chunks = [];
    var theFormat = format;
    var writableClosed = false;
    var readableController = null;
    var pendingResolve = null;

    // 创建 WritableStream
    var writable = new WritableStream({
      write: function(chunk) {
        var input = toUint8Array(chunk);
        chunks.push(input);
        return Promise.resolve();
      },
      close: function() {
        writableClosed = true;
        // 合并所有 chunks 并压缩
        var totalLen = 0;
        for (var i = 0; i < chunks.length; i++) {
          totalLen += chunks[i].length;
        }
        var combined = new Uint8Array(totalLen);
        var offset = 0;
        for (var i = 0; i < chunks.length; i++) {
          combined.set(chunks[i], offset);
          offset += chunks[i].length;
        }

        // 一次性压缩
        try {
          var compressorId = __goCreateCompressor(theFormat);
          __goCompressorWrite(compressorId, combined);
          var result = __goCompressorFinish(compressorId);
          if (result && result.byteLength > 0 && readableController) {
            readableController.enqueue(new Uint8Array(result));
          }
          if (readableController) {
            readableController.close();
          }
        } catch (e) {
          if (readableController) {
            readableController.error(e);
          }
        }
        return Promise.resolve();
      },
      abort: function(reason) {
        if (readableController) {
          readableController.error(reason);
        }
        return Promise.resolve();
      }
    });

    // 创建 ReadableStream
    var readable = new ReadableStream({
      start: function(controller) {
        readableController = controller;
      }
    });

    this._format = format;
    this._readable = readable;
    this._writable = writable;
  }

  // 定义 CompressionStream.prototype 的 getter
  CompressionStream.prototype = {
    get readable() {
      return this._readable;
    },
    get writable() {
      return this._writable;
    }
  };

  // DecompressionStream 构造函数
  function DecompressionStream(format) {
    if (!(this instanceof DecompressionStream)) {
      throw new TypeError("Failed to construct 'DecompressionStream': Please use the 'new' operator");
    }

    // 验证 format
    if (format !== 'gzip' && format !== 'deflate' && format !== 'deflate-raw') {
      throw new TypeError("Failed to construct 'DecompressionStream': The provided value '" + format + "' is not a valid enum value of type CompressionFormat.");
    }

    var self = this;
    var chunks = [];
    var theFormat = format;
    var writableClosed = false;
    var readableController = null;

    // 创建 WritableStream
    var writable = new WritableStream({
      write: function(chunk) {
        var input = toUint8Array(chunk);
        chunks.push(input);
        return Promise.resolve();
      },
      close: function() {
        writableClosed = true;
        // 合并所有数据并解压
        var totalLen = 0;
        for (var i = 0; i < chunks.length; i++) {
          totalLen += chunks[i].length;
        }
        var combined = new Uint8Array(totalLen);
        var offset = 0;
        for (var i = 0; i < chunks.length; i++) {
          combined.set(chunks[i], offset);
          offset += chunks[i].length;
        }

        // 一次性解压
        try {
          var decompressorId = __goCreateDecompressor(theFormat);
          var result = __goDecompress(decompressorId, combined);
          if (result && result.byteLength > 0 && readableController) {
            readableController.enqueue(new Uint8Array(result));
          }
          if (readableController) {
            readableController.close();
          }
        } catch (e) {
          if (readableController) {
            readableController.error(e);
          }
        }
        return Promise.resolve();
      },
      abort: function(reason) {
        if (readableController) {
          readableController.error(reason);
        }
        return Promise.resolve();
      }
    });

    // 创建 ReadableStream
    var readable = new ReadableStream({
      start: function(controller) {
        readableController = controller;
      }
    });

    this._format = format;
    this._readable = readable;
    this._writable = writable;
  }

  // 定义 DecompressionStream.prototype 的 getter
  DecompressionStream.prototype = {
    get readable() {
      return this._readable;
    },
    get writable() {
      return this._writable;
    }
  };

  // 将构造函数暴露到全局
  global.CompressionStream = CompressionStream;
  global.DecompressionStream = DecompressionStream;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
`

// compressor 压缩器状态
type compressor struct {
	format compressionFormat
	buf    *bytes.Buffer
	writer io.WriteCloser
	mu     sync.Mutex
}

// decompressor 解压器状态
type decompressor struct {
	format compressionFormat
}

// 压缩器/解压器管理
var (
	compressorsMu   sync.Mutex
	compressors     = make(map[int64]*compressor)
	compressorIDSeq int64

	decompressorsMu   sync.Mutex
	decompressors     = make(map[int64]*decompressor)
	decompressorIDSeq int64

	compressionStreamPolyfillProgram     *goja.Program
	compressionStreamPolyfillProgramOnce sync.Once
	compressionStreamPolyfillProgramErr  error
)

// EnsureCompressionStream 确保全局存在 CompressionStream 和 DecompressionStream
func EnsureCompressionStream(runtime *goja.Runtime) error {
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}

	// 注册 Go 侧辅助函数
	if err := registerCompressionHelpers(runtime); err != nil {
		return fmt.Errorf("注册压缩辅助函数失败: %w", err)
	}

	// 注入 JS polyfill
	compressionStreamPolyfillProgramOnce.Do(func() {
		compressionStreamPolyfillProgram, compressionStreamPolyfillProgramErr = goja.Compile(
			"compression_stream_polyfill.js",
			compressionStreamPolyfillJS,
			false,
		)
	})
	if compressionStreamPolyfillProgramErr != nil {
		return compressionStreamPolyfillProgramErr
	}

	if _, err := runtime.RunProgram(compressionStreamPolyfillProgram); err != nil {
		return fmt.Errorf("注入 CompressionStream polyfill 失败: %w", err)
	}

	return nil
}

// registerCompressionHelpers 注册 Go 侧的压缩/解压辅助函数
func registerCompressionHelpers(runtime *goja.Runtime) error {
	// __goCreateCompressor: 创建压缩器
	if err := runtime.Set("__goCreateCompressor", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("format is required"))
		}

		formatStr := call.Arguments[0].String()
		format, err := validateCompressionFormat(formatStr)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}

		compressorsMu.Lock()
		compressorIDSeq++
		id := compressorIDSeq
		compressorsMu.Unlock()

		buf := new(bytes.Buffer)
		var writer io.WriteCloser

		switch format {
		case formatGzip:
			writer = gzip.NewWriter(buf)
		case formatDeflate:
			// deflate 使用 zlib 格式（带头尾）
			w, _ := flate.NewWriter(buf, flate.DefaultCompression)
			writer = &zlibWriter{w: w, buf: buf}
		case formatDeflateRaw:
			// deflate-raw 是纯 DEFLATE（无头尾）
			w, _ := flate.NewWriter(buf, flate.DefaultCompression)
			writer = w
		}

		comp := &compressor{
			format: format,
			buf:    buf,
			writer: writer,
		}

		compressorsMu.Lock()
		compressors[id] = comp
		compressorsMu.Unlock()

		return runtime.ToValue(id)
	}); err != nil {
		return err
	}

	// __goCompressorWrite: 向压缩器写入数据
	if err := runtime.Set("__goCompressorWrite", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("compressorId and data are required"))
		}

		id := call.Arguments[0].ToInteger()
		data := extractBytes(runtime, call.Arguments[1])

		compressorsMu.Lock()
		comp, ok := compressors[id]
		compressorsMu.Unlock()

		if !ok {
			panic(runtime.NewTypeError("invalid compressor id"))
		}

		comp.mu.Lock()
		defer comp.mu.Unlock()

		if _, err := comp.writer.Write(data); err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("compression write error: %v", err)))
		}

		return goja.Undefined()
	}); err != nil {
		return err
	}

	// __goCompressorFinish: 完成压缩并返回结果
	if err := runtime.Set("__goCompressorFinish", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("compressorId is required"))
		}

		id := call.Arguments[0].ToInteger()

		compressorsMu.Lock()
		comp, ok := compressors[id]
		if ok {
			delete(compressors, id)
		}
		compressorsMu.Unlock()

		if !ok {
			panic(runtime.NewTypeError("invalid compressor id"))
		}

		comp.mu.Lock()
		defer comp.mu.Unlock()

		if err := comp.writer.Close(); err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("compression finish error: %v", err)))
		}

		result := comp.buf.Bytes()
		return runtime.ToValue(runtime.NewArrayBuffer(result))
	}); err != nil {
		return err
	}

	// __goCreateDecompressor: 创建解压器
	if err := runtime.Set("__goCreateDecompressor", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 1 {
			panic(runtime.NewTypeError("format is required"))
		}

		formatStr := call.Arguments[0].String()
		format, err := validateCompressionFormat(formatStr)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}

		decompressorsMu.Lock()
		decompressorIDSeq++
		id := decompressorIDSeq
		decompressors[id] = &decompressor{format: format}
		decompressorsMu.Unlock()

		return runtime.ToValue(id)
	}); err != nil {
		return err
	}

	// __goDecompress: 解压数据
	if err := runtime.Set("__goDecompress", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("decompressorId and data are required"))
		}

		id := call.Arguments[0].ToInteger()
		data := extractBytes(runtime, call.Arguments[1])

		decompressorsMu.Lock()
		decomp, ok := decompressors[id]
		if ok {
			delete(decompressors, id)
		}
		decompressorsMu.Unlock()

		if !ok {
			panic(runtime.NewTypeError("invalid decompressor id"))
		}

		// 空数据直接返回空
		if len(data) == 0 {
			return runtime.ToValue(runtime.NewArrayBuffer([]byte{}))
		}

		var reader io.ReadCloser
		var err error

		switch decomp.format {
		case formatGzip:
			reader, err = gzip.NewReader(bytes.NewReader(data))
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("gzip decompression error: %v", err)))
			}
		case formatDeflate:
			// deflate 使用 zlib 格式
			reader = &zlibReader{r: flate.NewReader(bytes.NewReader(data))}
		case formatDeflateRaw:
			// deflate-raw 是纯 DEFLATE
			reader = io.NopCloser(flate.NewReader(bytes.NewReader(data)))
		}

		defer reader.Close()

		result, err := io.ReadAll(reader)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("decompression error: %v", err)))
		}

		return runtime.ToValue(runtime.NewArrayBuffer(result))
	}); err != nil {
		return err
	}

	return nil
}

// extractBytes 从 goja.Value 中提取字节数据
func extractBytes(runtime *goja.Runtime, val goja.Value) []byte {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil
	}

	// 检查是否是 ArrayBuffer
	if ab, ok := val.Export().(goja.ArrayBuffer); ok {
		return ab.Bytes()
	}

	// 检查对象
	obj := val.ToObject(runtime)
	if obj == nil {
		return nil
	}

	// 尝试作为 Uint8Array 处理
	// 检查是否有 buffer 属性（TypedArray）
	bufferVal := obj.Get("buffer")
	if bufferVal != nil && !goja.IsUndefined(bufferVal) && !goja.IsNull(bufferVal) {
		if ab, ok := bufferVal.Export().(goja.ArrayBuffer); ok {
			// 获取 byteOffset 和 byteLength
			byteOffset := int(obj.Get("byteOffset").ToInteger())
			byteLength := int(obj.Get("byteLength").ToInteger())
			data := ab.Bytes()
			if byteOffset+byteLength <= len(data) {
				return data[byteOffset : byteOffset+byteLength]
			}
			return data[byteOffset:]
		}
	}

	// 尝试直接导出
	switch v := val.Export().(type) {
	case []byte:
		return v
	case []interface{}:
		result := make([]byte, len(v))
		for i, item := range v {
			if n, ok := item.(int64); ok {
				result[i] = byte(n)
			} else if n, ok := item.(float64); ok {
				result[i] = byte(int(n))
			}
		}
		return result
	}

	return nil
}

// zlibWriter 包装 flate.Writer 以支持 zlib 格式（带 zlib 头尾）
type zlibWriter struct {
	w      *flate.Writer
	buf    *bytes.Buffer
	closed bool
}

func (z *zlibWriter) Write(p []byte) (int, error) {
	return z.w.Write(p)
}

func (z *zlibWriter) Close() error {
	if z.closed {
		return nil
	}
	z.closed = true
	return z.w.Close()
}

// zlibReader 包装 flate.Reader
type zlibReader struct {
	r io.ReadCloser
}

func (z *zlibReader) Read(p []byte) (int, error) {
	return z.r.Read(p)
}

func (z *zlibReader) Close() error {
	return z.r.Close()
}
