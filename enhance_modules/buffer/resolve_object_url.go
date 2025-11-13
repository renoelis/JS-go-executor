package buffer

import (
	"crypto/rand"
	"fmt"
	"strings"
	"sync"

	"github.com/dop251/goja"
)

// BlobURLRegistry 全局Blob URL注册表
type BlobURLRegistry struct {
	mu    sync.RWMutex
	blobs map[string]*goja.Object // URL -> Blob对象的映射
}

var globalBlobRegistry = &BlobURLRegistry{
	blobs: make(map[string]*goja.Object),
}

// generateBlobURL 生成一个新的blob:nodedata:格式的URL
func generateBlobURL() (string, error) {
	// 生成16字节的随机数据
	bytes := make([]byte, 16)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}
	
	// 转换为UUID格式的字符串
	uuid := fmt.Sprintf("%x-%x-%x-%x-%x",
		bytes[0:4], bytes[4:6], bytes[6:8], bytes[8:10], bytes[10:16])
	
	return "blob:nodedata:" + uuid, nil
}

// RegisterBlobURL 注册一个Blob对象到URL
func (registry *BlobURLRegistry) RegisterBlobURL(url string, blob *goja.Object) {
	registry.mu.Lock()
	defer registry.mu.Unlock()
	registry.blobs[url] = blob
}

// ResolveBlobURL 根据URL解析Blob对象
func (registry *BlobURLRegistry) ResolveBlobURL(url string) *goja.Object {
	registry.mu.RLock()
	defer registry.mu.RUnlock()
	return registry.blobs[url]
}

// RevokeBlobURL 撤销一个Blob URL
func (registry *BlobURLRegistry) RevokeBlobURL(url string) {
	registry.mu.Lock()
	defer registry.mu.Unlock()
	delete(registry.blobs, url)
}

// CreateObjectURL 创建一个Blob URL (用于URL.createObjectURL)
func CreateObjectURL(runtime *goja.Runtime, blob *goja.Object) (string, error) {
	// 验证blob是否是有效的Blob对象
	if blob == nil {
		return "", fmt.Errorf("blob cannot be null")
	}
	
	// 检查是否有size和type属性 (Blob的基本特征)
	sizeVal := blob.Get("size")
	typeVal := blob.Get("type")
	if sizeVal == nil || typeVal == nil {
		return "", fmt.Errorf("invalid blob object")
	}
	
	// 生成URL
	url, err := generateBlobURL()
	if err != nil {
		return "", err
	}
	
	// 注册到全局注册表
	globalBlobRegistry.RegisterBlobURL(url, blob)
	
	return url, nil
}

// RegisterResolveObjectURL 注册 buffer.resolveObjectURL 函数
func RegisterResolveObjectURL(runtime *goja.Runtime) {
	// 先注册全局的resolveObjectURL实现函数
	resolveObjectURLImpl := func(call goja.FunctionCall) goja.Value {
		// 参数验证
		if len(call.Arguments) == 0 {
			return goja.Undefined()
		}
		
		arg := call.Arguments[0]
		if goja.IsUndefined(arg) || goja.IsNull(arg) {
			return goja.Undefined()
		}
		
		// 转换为字符串
		url := arg.String()
		
		// 检查URL格式
		if !strings.HasPrefix(url, "blob:nodedata:") {
			return goja.Undefined()
		}
		
		// 从注册表中解析Blob对象
		blob := globalBlobRegistry.ResolveBlobURL(url)
		if blob == nil {
			return goja.Undefined()
		}
		
		return blob
	}
	
	// 创建带有正确属性的resolveObjectURL函数
	resolveObjectURLFuncWithProps := runtime.ToValue(resolveObjectURLImpl)
	if funcObj, ok := resolveObjectURLFuncWithProps.(*goja.Object); ok {
		funcObj.DefineDataProperty("length", runtime.ToValue(1), 0, 0, 0)
		funcObj.DefineDataProperty("name", runtime.ToValue("resolveObjectURL"), 0, 0, 0)
	}
	
	// 使用更可靠的模块拦截方法
	script := `
(function() {
	// 保存原始require函数
	const originalRequire = require;
	
	// 创建拦截require函数
	const interceptedRequire = function(id) {
		const result = originalRequire(id);
		
		// 如果是buffer模块，添加缺失的函数和构造器
		if (id === 'buffer' && result) {
			// 添加resolveObjectURL函数
			if (typeof result.resolveObjectURL !== 'function') {
				Object.defineProperty(result, 'resolveObjectURL', {
					value: globalResolveObjectURLFuncWithProps,
					writable: false,
					enumerable: true,
					configurable: false
				});
			}
			
			// 添加Blob构造器（如果全局Blob存在但buffer.Blob不存在）
			if (typeof Blob !== 'undefined' && typeof result.Blob !== 'function') {
				Object.defineProperty(result, 'Blob', {
					value: Blob,
					writable: false,
					enumerable: true,
					configurable: false
				});
			}
		}
		
		return result;
	};
	
	// 复制原始require的所有属性
	Object.setPrototypeOf(interceptedRequire, originalRequire);
	for (const key in originalRequire) {
		if (originalRequire.hasOwnProperty(key)) {
			interceptedRequire[key] = originalRequire[key];
		}
	}
	
	// 替换全局require
	if (typeof global !== 'undefined') {
		global.require = interceptedRequire;
	}
	if (typeof globalThis !== 'undefined') {
		globalThis.require = interceptedRequire;
	}
	
	// 同时尝试直接为已经加载的buffer模块添加函数和Blob构造器
	try {
		const buffer = originalRequire('buffer');
		if (buffer) {
			// 添加resolveObjectURL函数
			if (typeof buffer.resolveObjectURL !== 'function') {
				Object.defineProperty(buffer, 'resolveObjectURL', {
					value: globalResolveObjectURLFuncWithProps,
					writable: false,
					enumerable: true,
					configurable: false
				});
			}
			
			// 添加Blob构造器（如果全局Blob存在但buffer.Blob不存在）
			if (typeof Blob !== 'undefined' && typeof buffer.Blob !== 'function') {
				Object.defineProperty(buffer, 'Blob', {
					value: Blob,
					writable: false,
					enumerable: true,
					configurable: false
				});
			}
		}
	} catch (e) {
		// 忽略错误
	}
})();
`
	
	runtime.Set("globalResolveObjectURLImpl", resolveObjectURLImpl)
	runtime.Set("globalResolveObjectURLFuncWithProps", resolveObjectURLFuncWithProps)
	
	// 执行拦截脚本
	_, err := runtime.RunString(script)
	if err != nil {
		// 忽略错误，继续执行
	}
}

// SetupURLCreateObjectURL 设置全局 URL.createObjectURL 函数
func SetupURLCreateObjectURL(runtime *goja.Runtime) {
	// 获取或创建全局URL对象
	urlObj := runtime.Get("URL")
	var urlConstructor *goja.Object
	
	if urlObj == nil {
		// 创建URL构造函数 - 基本实现
		urlConstructorFunc := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
			// 基本的URL构造函数实现
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("URL constructor requires at least 1 argument"))
			}
			
			urlString := call.Arguments[0].String()
			
			// 创建URL实例
			urlInstance := runtime.NewObject()
			urlInstance.Set("href", runtime.ToValue(urlString))
			
			return urlInstance
		})
		
		// 设置为全局URL
		runtime.Set("URL", urlConstructorFunc)
		urlConstructor, _ = urlConstructorFunc.(*goja.Object)
	} else {
		urlConstructor, _ = urlObj.(*goja.Object)
	}
	
	if urlConstructor == nil {
		return
	}
	
	// 实现 createObjectURL 静态方法
	createObjectURLFunc := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("Failed to execute 'createObjectURL' on 'URL': 1 argument required, but only 0 present."))
		}
		
		arg := call.Arguments[0]
		blob, ok := arg.(*goja.Object)
		if !ok {
			// 获取参数类型信息以生成准确的错误消息
			argType := "undefined"
			if !goja.IsUndefined(arg) && !goja.IsNull(arg) {
				argType = arg.ExportType().String()
				if argType == "string" {
					// 对于字符串类型，需要获取实际值来生成完整错误消息
					argValue := arg.String()
					if len(argValue) > 20 {
						argValue = argValue[:20] + "..."
					}
					panic(runtime.NewTypeError("The \"obj\" argument must be an instance of Blob. Received type string ('" + argValue + "')"))
				}
			}
			panic(runtime.NewTypeError("The \"obj\" argument must be an instance of Blob. Received type " + argType))
		}
		
		url, err := CreateObjectURL(runtime, blob)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		
		return runtime.ToValue(url)
	})
	
	// 设置函数属性
	if funcObj, ok := createObjectURLFunc.(*goja.Object); ok {
		funcObj.DefineDataProperty("length", runtime.ToValue(1), 0, 0, 0)
		funcObj.DefineDataProperty("name", runtime.ToValue("createObjectURL"), 0, 0, 0)
	}
	
	urlConstructor.Set("createObjectURL", createObjectURLFunc)
	
	// 同时实现 revokeObjectURL
	revokeObjectURLFunc := runtime.ToValue(func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) > 0 {
			url := call.Arguments[0].String()
			globalBlobRegistry.RevokeBlobURL(url)
		}
		
		return goja.Undefined()
	})
	
	if funcObj, ok := revokeObjectURLFunc.(*goja.Object); ok {
		funcObj.DefineDataProperty("length", runtime.ToValue(1), 0, 0, 0)
		funcObj.DefineDataProperty("name", runtime.ToValue("revokeObjectURL"), 0, 0, 0)
	}
	
	urlConstructor.Set("revokeObjectURL", revokeObjectURLFunc)
}
