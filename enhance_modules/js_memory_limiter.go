package enhance_modules

import (
	"fmt"

	"github.com/dop251/goja"
)

// JSMemoryLimiter JavaScript 侧内存限制器（可配置）
//
// 设计理念：
//   - 简单：只拦截明显的大内存分配（Array, TypedArray, ArrayBuffer）
//   - 可配置：可以通过配置禁用
//   - 提前拦截：在创建数组时就检查，不等到使用时
//
// 🔥 注意：Blob/File 的限制由 FetchEnhancer 负责（见 blob_file_api.go）
type JSMemoryLimiter struct {
	enabled         bool  // 是否启用
	maxAllocation   int64 // 最大单次分配（字节）
	maxAllocationMB int64 // 最大单次分配（MB，用于日志）
}

// NewJSMemoryLimiter 创建 JavaScript 内存限制器
//
// 参数：
//   - enabled: 是否启用限制
//   - maxAllocationMB: 最大单次分配大小（MB）
func NewJSMemoryLimiter(enabled bool, maxAllocationMB int64) *JSMemoryLimiter {
	return &JSMemoryLimiter{
		enabled:         enabled,
		maxAllocation:   maxAllocationMB * 1024 * 1024,
		maxAllocationMB: maxAllocationMB,
	}
}

// IsEnabled 返回是否启用
func (jml *JSMemoryLimiter) IsEnabled() bool {
	if jml == nil {
		return false
	}
	return jml.enabled
}

// GetMaxAllocationMB 获取最大分配大小（MB）
func (jml *JSMemoryLimiter) GetMaxAllocationMB() int64 {
	if jml == nil {
		return 0
	}
	return jml.maxAllocationMB
}

// RegisterLimiter 注册限制器到 Runtime
//
// 该方法通过注入 JavaScript 代码来包装原生构造函数。
// 只有在 enabled=true 时才会生效。
func (jml *JSMemoryLimiter) RegisterLimiter(runtime *goja.Runtime) error {
	if !jml.enabled {
		return nil // 禁用时不做任何事
	}

	maxSize := jml.maxAllocation
	maxSizeMB := jml.maxAllocationMB

	// 注入检查脚本
	// 关键：
	// 1. 不使用 globalThis（因为会被禁用），使用 this 代替
	// 2. 不使用 Reflect.construct（简化实现，直接使用 new）
	// 3. 可以在任何时机执行（不依赖 Reflect）
	guardScript := fmt.Sprintf(`
(function() {
	var MAX_SIZE = %d;  // 字节
	var MAX_SIZE_MB = %d;  // MB
	var global = this;  // 使用 this 代替 globalThis（在全局作用域中 this 就是全局对象）
	
	// 辅助函数：检查大小
	function checkSize(size, type) {
		if (typeof size === 'number' && size > MAX_SIZE) {
			throw new RangeError(
				type + ' 分配内存过大：' + size + ' 元素/字节超过限制 ' +
				MAX_SIZE + ' 字节 (' + MAX_SIZE_MB + ' MB)。请减少数据大小。'
			);
		}
	}
	
	// 1. 包装 Array 构造函数
	(function() {
		var OriginalArray = Array;
		var OriginalPush = Array.prototype.push;
		
		// 新的 Array 构造函数
		function WrappedArray() {
			// 检查是否是通过 new Array(length) 调用
			if (arguments.length === 1 && typeof arguments[0] === 'number') {
				checkSize(arguments[0], 'Array');
			}
			
			// 调用原始构造函数
			// 关键修复：对于多参数，不能使用 apply，要手动填充
			var args = Array.prototype.slice.call(arguments);
			
			if (args.length === 0) {
				return new OriginalArray();
			} else if (args.length === 1) {
				return new OriginalArray(args[0]);
			} else {
				// 多参数：手动创建并填充
				// 不能用 apply（不会填充数组）
				var arr = new OriginalArray(args.length);
				for (var i = 0; i < args.length; i++) {
					arr[i] = args[i];
				}
				return arr;
			}
		}
		
		// 保留原型链和静态方法
		WrappedArray.prototype = OriginalArray.prototype;
		WrappedArray.from = OriginalArray.from;
		WrappedArray.of = OriginalArray.of;
		WrappedArray.isArray = OriginalArray.isArray;
		
		// 🔥 新增：包装 Array.prototype.push 以防止创建超大数组
		Array.prototype.push = function() {
			// 检查推送后的数组长度
			var newLength = this.length + arguments.length;
			if (newLength > MAX_SIZE / 8) {  // 假设每个元素至少8字节
				throw new RangeError(
					'Array.push 操作会导致数组长度超过限制：' + newLength + ' 元素超过 ' +
					Math.floor(MAX_SIZE / 8) + ' 元素限制 (' + MAX_SIZE_MB + ' MB)。请减少数据大小。'
				);
			}
			return OriginalPush.apply(this, arguments);
		};
		
		// 替换全局 Array
		global.Array = WrappedArray;
	})();
	
	// 2. 包装 TypedArray 构造函数
	var typedArrays = [
		{name: 'Uint8Array', bytes: 1},
		{name: 'Int8Array', bytes: 1},
		{name: 'Uint16Array', bytes: 2},
		{name: 'Int16Array', bytes: 2},
		{name: 'Uint32Array', bytes: 4},
		{name: 'Int32Array', bytes: 4},
		{name: 'Float32Array', bytes: 4},
		{name: 'Float64Array', bytes: 8}
	];
	
	for (var i = 0; i < typedArrays.length; i++) {
		(function(name, bytesPerElement) {
			var Original = global[name];
			if (!Original) return;
			
			function Wrapped() {
				// 检查是否是通过 new TypedArray(length) 调用
				if (arguments.length === 1 && typeof arguments[0] === 'number') {
					var size = arguments[0] * bytesPerElement;
					checkSize(size, name);
				}
				
				// 调用原始构造函数
				// 简化：直接使用 new，不依赖 Reflect
				var args = Array.prototype.slice.call(arguments);
				switch (args.length) {
					case 0: return new Original();
					case 1: return new Original(args[0]);
					case 2: return new Original(args[0], args[1]);
					case 3: return new Original(args[0], args[1], args[2]);
					default: return new Original(args[0]);  // TypedArray 最多3个参数
				}
			}
			
			// 保留原型链
			Wrapped.prototype = Original.prototype;
			Wrapped.BYTES_PER_ELEMENT = Original.BYTES_PER_ELEMENT;
			
			// 替换全局构造函数
			global[name] = Wrapped;
		})(typedArrays[i].name, typedArrays[i].bytes);
	}
	
	// 3. 包装 ArrayBuffer 构造函数
	// 🔥 修复 Bypass 2: ArrayBuffer 可以绕过内存限制
	(function() {
		var OriginalArrayBuffer = ArrayBuffer;
		
		// 检查是否存在（某些环境可能不支持）
		if (typeof OriginalArrayBuffer === 'undefined') {
			return;
		}
		
		// 新的 ArrayBuffer 构造函数
		function WrappedArrayBuffer(byteLength) {
			// 检查参数
			if (arguments.length > 0 && typeof byteLength === 'number') {
				checkSize(byteLength, 'ArrayBuffer');
			}
			
			// 调用原始构造函数
			if (arguments.length === 0) {
				return new OriginalArrayBuffer();
			} else {
				return new OriginalArrayBuffer(byteLength);
			}
		}
		
		// 保留原型链和静态方法
		WrappedArrayBuffer.prototype = OriginalArrayBuffer.prototype;
		
		// 保留 ArrayBuffer.isView() 静态方法（ES6）
		if (OriginalArrayBuffer.isView) {
			WrappedArrayBuffer.isView = OriginalArrayBuffer.isView;
		}
		
		// 保留 prototype.constructor
		if (WrappedArrayBuffer.prototype) {
			WrappedArrayBuffer.prototype.constructor = WrappedArrayBuffer;
		}
		
		// 替换全局 ArrayBuffer
		global.ArrayBuffer = WrappedArrayBuffer;
	})();
}).call(this);  // 使用 .call(this) 确保 this 是全局对象
`, maxSize, maxSizeMB)

	// 执行脚本
	_, err := runtime.RunString(guardScript)
	if err != nil {
		return fmt.Errorf("failed to register JS memory limiter: %w", err)
	}

	return nil
}
