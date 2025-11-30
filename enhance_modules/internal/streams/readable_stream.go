package streams

import (
	"fmt"
	"sync"

	"github.com/dop251/goja"
)

const symbolAsyncIteratorPolyfill = `
(function () {
  if (typeof Symbol === 'function' && !Symbol.asyncIterator) {
    var asyncIteratorSymbol = Symbol('Symbol.asyncIterator');
    Object.defineProperty(Symbol, 'asyncIterator', {
      value: asyncIteratorSymbol,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
})();
`

const writableStreamControllerSignalPatchJS = `
(function () {
  if (typeof WritableStream !== 'function' ||
      typeof WritableStreamDefaultController !== 'function' ||
      typeof WritableStreamDefaultWriter !== 'function' ||
      typeof AbortController !== 'function') {
    return;
  }

  var controllerSignalMap = new WeakMap();

  function ensureAbortController(controller) {
    if (!controller) {
      return undefined;
    }
    var record = controllerSignalMap.get(controller);
    if (!record) {
      var abortController = new AbortController();
      record = { controller: abortController, aborted: false };
      controllerSignalMap.set(controller, record);
    }
    return record.controller;
  }

  function getControllerFromStream(stream) {
    if (!stream || typeof stream !== 'object') {
      return undefined;
    }
    try {
      if (stream._writableStreamController) {
        return stream._writableStreamController;
      }
    } catch (err) {}
    return undefined;
  }

  function getStreamFromWriter(writer) {
    if (!writer || typeof writer !== 'object') {
      return undefined;
    }
    try {
      if (writer._ownerWritableStream) {
        return writer._ownerWritableStream;
      }
    } catch (err) {}
    return undefined;
  }

  function abortSignalForStream(stream, reason) {
    var controller = getControllerFromStream(stream);
    if (!controller) {
      return;
    }
    var abortController = ensureAbortController(controller);
    if (!abortController) {
      return;
    }
    var record = controllerSignalMap.get(controller);
    if (record && record.aborted) {
      return;
    }
    if (record) {
      record.aborted = true;
    }
    try {
      abortController.abort(reason);
    } catch (err) {}
  }

  Object.defineProperty(WritableStreamDefaultController.prototype, 'signal', {
    configurable: true,
    enumerable: true,
    get: function () {
      var abortController = ensureAbortController(this);
      return abortController ? abortController.signal : undefined;
    }
  });

  var originalStreamAbort = WritableStream.prototype.abort;
  WritableStream.prototype.abort = function (reason) {
    abortSignalForStream(this, reason);
    return originalStreamAbort.call(this, reason);
  };

  var originalWriterAbort = WritableStreamDefaultWriter.prototype.abort;
  WritableStreamDefaultWriter.prototype.abort = function (reason) {
    abortSignalForStream(getStreamFromWriter(this), reason);
    return originalWriterAbort.call(this, reason);
  };
})();
`

var (
	symbolAsyncIteratorProgram           *goja.Program
	symbolAsyncIteratorProgramOnce       sync.Once
	symbolAsyncIteratorProgramErr        error
	readableStreamPolyfillProgram        *goja.Program
	readableStreamPolyfillProgramOnce    sync.Once
	readableStreamPolyfillProgramErr     error
	writableStreamControllerPatchProgram *goja.Program
	writableStreamControllerOnce         sync.Once
	writableStreamControllerProgramErr   error
)

// EnsureReadableStream 确保全局存在 ReadableStream 构造器（最小可用 polyfill）
// Node.js v25 已内置 Web Streams API；Goja 环境需要手动注入，避免 Blob.stream() 等
// 调用时出现 ReadableStream 未定义的错误。
func EnsureReadableStream(runtime *goja.Runtime) error {
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}

	if err := ensureSymbolAsyncIterator(runtime); err != nil {
		return fmt.Errorf("初始化 Symbol.asyncIterator 失败: %w", err)
	}

	if !hasReadableStream(runtime) {
		if readableStreamPolyfillJS == "" {
			return fmt.Errorf("ReadableStream polyfill 资源未内置")
		}

		if err := runReadableStreamPolyfill(runtime); err != nil {
			return fmt.Errorf("注入 ReadableStream polyfill 失败: %w", err)
		}

		if !hasReadableStream(runtime) {
			return fmt.Errorf("ReadableStream polyfill 注入后仍不可用")
		}
	}

	if err := EnsureWritableStreamControllerSignal(runtime); err != nil {
		return err
	}

	// 注册 CompressionStream 和 DecompressionStream
	return EnsureCompressionStream(runtime)
}

// GetReadableStreamPrototype 返回全局 ReadableStream.prototype（若不存在返回 nil）
func GetReadableStreamPrototype(runtime *goja.Runtime) *goja.Object {
	if runtime == nil {
		return nil
	}

	constructorVal := runtime.Get("ReadableStream")
	if constructorVal == nil || goja.IsUndefined(constructorVal) || goja.IsNull(constructorVal) {
		return nil
	}

	constructor := constructorVal.ToObject(runtime)
	if constructor == nil {
		return nil
	}

	protoVal := constructor.Get("prototype")
	if protoVal == nil || goja.IsUndefined(protoVal) || goja.IsNull(protoVal) {
		return nil
	}

	return protoVal.ToObject(runtime)
}

// AttachReadableStreamPrototype 将 target 的原型指向 ReadableStream.prototype（若可用）
func AttachReadableStreamPrototype(runtime *goja.Runtime, target *goja.Object) {
	if runtime == nil || target == nil {
		return
	}

	if proto := GetReadableStreamPrototype(runtime); proto != nil {
		target.SetPrototype(proto)
	}
}

func hasReadableStream(runtime *goja.Runtime) bool {
	constructorVal := runtime.Get("ReadableStream")
	if constructorVal == nil || goja.IsUndefined(constructorVal) || goja.IsNull(constructorVal) {
		return false
	}

	constructor := constructorVal.ToObject(runtime)
	if constructor == nil {
		return false
	}

	protoVal := constructor.Get("prototype")
	if protoVal == nil || goja.IsUndefined(protoVal) || goja.IsNull(protoVal) {
		return false
	}

	return true
}

func ensureSymbolAsyncIterator(runtime *goja.Runtime) error {
	symbolAsyncIteratorProgramOnce.Do(func() {
		symbolAsyncIteratorProgram, symbolAsyncIteratorProgramErr = goja.Compile(
			"symbol_async_iterator_polyfill.js",
			symbolAsyncIteratorPolyfill,
			false,
		)
	})
	if symbolAsyncIteratorProgramErr != nil {
		return symbolAsyncIteratorProgramErr
	}
	_, err := runtime.RunProgram(symbolAsyncIteratorProgram)
	return err
}

// EnsureWritableStreamControllerSignal 确保 WritableStreamDefaultController.prototype.signal 存在
func EnsureWritableStreamControllerSignal(runtime *goja.Runtime) error {
	if runtime == nil {
		return fmt.Errorf("runtime 为 nil")
	}

	writableStreamControllerOnce.Do(func() {
		writableStreamControllerPatchProgram, writableStreamControllerProgramErr = goja.Compile(
			"writable_stream_controller_signal_patch.js",
			writableStreamControllerSignalPatchJS,
			false,
		)
	})
	if writableStreamControllerProgramErr != nil {
		return writableStreamControllerProgramErr
	}

	if _, err := runtime.RunProgram(writableStreamControllerPatchProgram); err != nil {
		return fmt.Errorf("注入 WritableStream signal polyfill 失败: %w", err)
	}
	return nil
}

func runReadableStreamPolyfill(runtime *goja.Runtime) error {
	readableStreamPolyfillProgramOnce.Do(func() {
		readableStreamPolyfillProgram, readableStreamPolyfillProgramErr = goja.Compile(
			"readable_stream_polyfill.es5.js",
			readableStreamPolyfillJS,
			false,
		)
	})
	if readableStreamPolyfillProgramErr != nil {
		return readableStreamPolyfillProgramErr
	}
	_, err := runtime.RunProgram(readableStreamPolyfillProgram)
	return err
}
