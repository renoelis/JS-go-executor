package enhance_modules

import (
	"crypto"
	"crypto/hmac"
	"crypto/md5"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"hash"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// CryptoEnhancer crypto模块增强器 (混合方案: crypto-js + Go原生补齐)
type CryptoEnhancer struct {
	cryptoJSPath    string        // crypto-js文件路径
	cryptoJSCache   string        // crypto-js代码缓存
	embeddedCode    string        // 嵌入的crypto-js代码
	compiledProgram *goja.Program // 🔥 crypto-js编译后的程序缓存
	compileOnce     sync.Once     // 🔥 优化：使用 sync.Once 确保只编译一次
	compileErr      error         // 🔥 优化：编译错误缓存
	cacheMutex      sync.RWMutex  // 代码字符串缓存锁
}

// NewCryptoEnhancer 创建新的crypto增强器
func NewCryptoEnhancer() *CryptoEnhancer {
	// 获取可执行文件所在目录
	execPath, err := os.Executable()
	var cryptoJSPath string

	if err == nil {
		execDir := filepath.Dir(execPath)
		// 尝试 go-executor/external-libs/crypto-js.min.js
		cryptoJSPath = filepath.Join(execDir, "external-libs", "crypto-js.min.js")

		// 检查文件是否存在，如果不存在尝试其他路径
		if _, err := os.Stat(cryptoJSPath); os.IsNotExist(err) {
			// 尝试从当前工作目录
			if wd, err := os.Getwd(); err == nil {
				cryptoJSPath = filepath.Join(wd, "go-executor", "external-libs", "crypto-js.min.js")

				// 还是不存在，尝试最后一个路径
				if _, err := os.Stat(cryptoJSPath); os.IsNotExist(err) {
					cryptoJSPath = filepath.Join(wd, "external-libs", "crypto-js.min.js")
				}
			}
		}
	} else {
		// 无法获取可执行文件路径，使用相对路径
		cryptoJSPath = "go-executor/external-libs/crypto-js.min.js"
	}

	fmt.Printf("📦 CryptoEnhancer 初始化，crypto-js 路径: %s\n", cryptoJSPath)

	return &CryptoEnhancer{
		cryptoJSPath: cryptoJSPath,
	}
}

// NewCryptoEnhancerWithEmbedded 使用嵌入的crypto-js代码创建增强器
func NewCryptoEnhancerWithEmbedded(embeddedCode string) *CryptoEnhancer {
	fmt.Printf("📦 CryptoEnhancer 初始化，使用嵌入式 crypto-js，大小: %d 字节\n", len(embeddedCode))

	return &CryptoEnhancer{
		embeddedCode: embeddedCode,
		cryptoJSPath: "embedded",
	}
}

// EnhanceCryptoSupport 增强crypto模块支持 (混合方案)
func (ce *CryptoEnhancer) EnhanceCryptoSupport(runtime *goja.Runtime) error {
	// 第一步: 必须成功加载 crypto-js 库
	if err := ce.loadCryptoJS(runtime); err != nil {
		return fmt.Errorf("加载crypto-js失败: %w", err)
	}

	// 第二步: 用Go原生实现补齐缺失的API
	if err := ce.enhanceWithNativeAPIs(runtime); err != nil {
		return fmt.Errorf("添加原生API失败: %w", err)
	}

	return nil
}

// RegisterCryptoModule 注册crypto模块到require系统 (纯Go原生实现)
func (ce *CryptoEnhancer) RegisterCryptoModule(registry *require.Registry) {
	// 注册 crypto 模块 - 纯Go原生实现，Node.js标准API
	registry.RegisterNativeModule("crypto", func(runtime *goja.Runtime, module *goja.Object) {
		cryptoObj := runtime.NewObject()

		// 添加Go原生实现的方法
		ce.addCreateHashMethod(runtime, cryptoObj)
		ce.addCreateHmacMethod(runtime, cryptoObj)
		ce.addRandomMethods(runtime, cryptoObj)

		// 添加RSA相关方法
		ce.addRSAMethods(runtime, cryptoObj)

		// 添加crypto.constants常量
		ce.addCryptoConstants(runtime, cryptoObj)

		module.Set("exports", cryptoObj)
	})
}

// RegisterCryptoJSModule 注册crypto-js模块到require系统 (纯crypto-js实现)
func (ce *CryptoEnhancer) RegisterCryptoJSModule(registry *require.Registry) {
	// 注册 crypto-js 模块 - 纯crypto-js库
	registry.RegisterNativeModule("crypto-js", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保crypto-js已加载
		if err := ce.loadCryptoJS(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to load crypto-js: %w", err)))
		}

		// 获取CryptoJS对象
		cryptoJSVal := runtime.Get("CryptoJS")
		if cryptoJSVal != nil && !goja.IsUndefined(cryptoJSVal) {
			module.Set("exports", cryptoJSVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("CryptoJS not available")))
		}
	})
}

// addCreateHashMethod 添加createHash方法
func (ce *CryptoEnhancer) addCreateHashMethod(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	createHash := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("createHash requires an algorithm parameter"))
		}

		algorithm := strings.ToLower(call.Arguments[0].String())

		var hasher hash.Hash
		switch algorithm {
		case "md5":
			hasher = md5.New()
		case "sha1":
			hasher = sha1.New()
		case "sha256":
			hasher = sha256.New()
		case "sha512":
			hasher = sha512.New()
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("Unsupported hash algorithm: %s", algorithm)))
		}

		// 创建Hash对象
		hashObj := runtime.NewObject()

		// update方法
		hashObj.Set("update", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("update requires data parameter"))
			}

			data := call.Arguments[0].String()
			hasher.Write([]byte(data))

			// 返回this以支持链式调用
			return call.This
		})

		// digest方法
		hashObj.Set("digest", func(call goja.FunctionCall) goja.Value {
			encoding := "hex" // 默认编码
			if len(call.Arguments) > 0 {
				encoding = strings.ToLower(call.Arguments[0].String())
			}

			sum := hasher.Sum(nil)

			switch encoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(sum))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(sum))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Unsupported encoding: %s", encoding)))
			}
		})

		return hashObj
	}

	cryptoObj.Set("createHash", createHash)
	return nil
}

// addCreateHmacMethod 添加createHmac方法
func (ce *CryptoEnhancer) addCreateHmacMethod(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	createHmac := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("createHmac requires algorithm and key parameters"))
		}

		algorithm := strings.ToLower(call.Arguments[0].String())
		key := call.Arguments[1].String()

		var hasher hash.Hash
		switch algorithm {
		case "md5":
			hasher = hmac.New(md5.New, []byte(key))
		case "sha1":
			hasher = hmac.New(sha1.New, []byte(key))
		case "sha256":
			hasher = hmac.New(sha256.New, []byte(key))
		case "sha512":
			hasher = hmac.New(sha512.New, []byte(key))
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("Unsupported HMAC algorithm: %s", algorithm)))
		}

		// 创建Hmac对象
		hmacObj := runtime.NewObject()

		// update方法
		hmacObj.Set("update", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("update requires data parameter"))
			}

			data := call.Arguments[0].String()
			hasher.Write([]byte(data))

			// 返回this以支持链式调用
			return call.This
		})

		// digest方法
		hmacObj.Set("digest", func(call goja.FunctionCall) goja.Value {
			encoding := "hex" // 默认编码
			if len(call.Arguments) > 0 {
				encoding = strings.ToLower(call.Arguments[0].String())
			}

			sum := hasher.Sum(nil)

			switch encoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(sum))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(sum))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Unsupported encoding: %s", encoding)))
			}
		})

		return hmacObj
	}

	cryptoObj.Set("createHmac", createHmac)
	return nil
}

// addRandomMethods 添加随机数生成方法
func (ce *CryptoEnhancer) addRandomMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// randomBytes方法
	randomBytes := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("randomBytes requires size parameter"))
		}

		size := int(call.Arguments[0].ToInteger())
		if size <= 0 || size > 1024*1024 { // 限制最大1MB
			panic(runtime.NewTypeError("randomBytes size must be between 1 and 1048576"))
		}

		bytes := make([]byte, size)
		_, err := rand.Read(bytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to generate random bytes: %w", err)))
		}

		// 创建类似Buffer的对象
		bufferObj := runtime.NewObject()

		// 设置长度属性
		bufferObj.Set("length", runtime.ToValue(size))

		// 设置索引访问
		for i, b := range bytes {
			bufferObj.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(b)))
		}

		// toString方法
		bufferObj.Set("toString", func(call goja.FunctionCall) goja.Value {
			encoding := "hex"
			if len(call.Arguments) > 0 {
				encoding = strings.ToLower(call.Arguments[0].String())
			}

			switch encoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(bytes))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(bytes))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Unsupported encoding: %s", encoding)))
			}
		})

		return bufferObj
	}

	// randomUUID方法
	randomUUID := func(call goja.FunctionCall) goja.Value {
		// 生成UUID v4
		uuid := make([]byte, 16)
		rand.Read(uuid)

		// 设置版本 (4) 和变体位
		uuid[6] = (uuid[6] & 0x0f) | 0x40 // Version 4
		uuid[8] = (uuid[8] & 0x3f) | 0x80 // Variant bits

		// 格式化为标准UUID字符串
		uuidStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
			uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:16])

		return runtime.ToValue(uuidStr)
	}

	// getRandomValues方法 (Web Crypto API兼容)
	getRandomValues := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("getRandomValues requires a typed array"))
		}

		arg := call.Arguments[0]
		if obj, ok := arg.(*goja.Object); ok {
			if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
				length := int(lengthVal.ToInteger())
				if length > 0 && length <= 65536 { // 限制大小

					// 检测数组类型 - 通过constructor.name或其他方式
					var bytesPerElement int = 1 // 默认为1字节

					// 尝试获取constructor信息来判断类型
					if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
						if constructorObj, ok := constructor.(*goja.Object); ok {
							if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
								typeName := nameVal.String()
								switch typeName {
								case "Uint8Array", "Int8Array":
									bytesPerElement = 1
								case "Uint16Array", "Int16Array":
									bytesPerElement = 2
								case "Uint32Array", "Int32Array":
									bytesPerElement = 4
								case "Float32Array":
									bytesPerElement = 4
								case "Float64Array":
									bytesPerElement = 8
								}
							}
						}
					}

					// 生成足够的随机字节
					totalBytes := length * bytesPerElement
					randomBytes := make([]byte, totalBytes)
					rand.Read(randomBytes)

					// 根据类型填充数组
					for i := 0; i < length; i++ {
						var value uint32
						switch bytesPerElement {
						case 1:
							value = uint32(randomBytes[i])
						case 2:
							if i*2+1 < len(randomBytes) {
								value = uint32(randomBytes[i*2]) | (uint32(randomBytes[i*2+1]) << 8)
							}
						case 4:
							if i*4+3 < len(randomBytes) {
								value = uint32(randomBytes[i*4]) |
									(uint32(randomBytes[i*4+1]) << 8) |
									(uint32(randomBytes[i*4+2]) << 16) |
									(uint32(randomBytes[i*4+3]) << 24)
							}
						}
						obj.Set(fmt.Sprintf("%d", i), runtime.ToValue(value))
					}
				}
			}
		}

		return arg // 返回修改后的数组
	}

	cryptoObj.Set("randomBytes", randomBytes)
	cryptoObj.Set("randomUUID", randomUUID)
	cryptoObj.Set("getRandomValues", getRandomValues)

	return nil
}

// SetupCryptoEnvironment 在加载crypto-js之前设置必要的crypto环境
// 🔧 这是修复 "Native crypto module could not be used to get secure random number" 错误的关键
func (ce *CryptoEnhancer) SetupCryptoEnvironment(runtime *goja.Runtime) error {
	// 检查是否已经设置过crypto环境，避免重复设置
	if cryptoVal := runtime.Get("crypto"); cryptoVal != nil && !goja.IsUndefined(cryptoVal) {
		if cryptoObj, ok := cryptoVal.(*goja.Object); ok {
			// 检查是否有我们设置的randomBytes方法，确认是我们设置的crypto对象
			if randomBytesVal := cryptoObj.Get("randomBytes"); randomBytesVal != nil && !goja.IsUndefined(randomBytesVal) {
				return nil // 已经设置过了，直接返回
			}
		}
	}

	// 创建一个基础的crypto对象，提供crypto-js初始化所需的方法
	cryptoObj := runtime.NewObject()

	// 添加 randomBytes 方法 - crypto-js 会检查这个方法
	randomBytes := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("randomBytes requires size parameter"))
		}

		size := int(call.Arguments[0].ToInteger())
		if size <= 0 || size > 1024*1024 { // 限制最大1MB
			panic(runtime.NewTypeError("randomBytes size must be between 1 and 1048576"))
		}

		bytes := make([]byte, size)
		_, err := rand.Read(bytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to generate random bytes: %w", err)))
		}

		// 创建类似Node.js Buffer的对象，包含readInt32LE方法
		bufferObj := runtime.NewObject()
		bufferObj.Set("length", runtime.ToValue(size))

		// 设置索引访问
		for i, b := range bytes {
			bufferObj.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(b)))
		}

		// 重要：添加readInt32LE方法，crypto-js会调用这个方法
		bufferObj.Set("readInt32LE", func(call goja.FunctionCall) goja.Value {
			offset := 0
			if len(call.Arguments) > 0 {
				offset = int(call.Arguments[0].ToInteger())
			}

			if offset < 0 || offset+4 > len(bytes) {
				panic(runtime.NewTypeError("readInt32LE offset out of range"))
			}

			// 读取小端序32位整数
			value := int32(bytes[offset]) |
				(int32(bytes[offset+1]) << 8) |
				(int32(bytes[offset+2]) << 16) |
				(int32(bytes[offset+3]) << 24)

			return runtime.ToValue(value)
		})

		// toString方法
		bufferObj.Set("toString", func(call goja.FunctionCall) goja.Value {
			encoding := "hex"
			if len(call.Arguments) > 0 {
				encoding = strings.ToLower(call.Arguments[0].String())
			}

			switch encoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(bytes))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(bytes))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Unsupported encoding: %s", encoding)))
			}
		})

		return bufferObj
	}

	// 添加 getRandomValues 方法 - crypto-js 也会检查这个方法（浏览器兼容）
	getRandomValues := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("getRandomValues requires a typed array"))
		}

		arg := call.Arguments[0]
		if obj, ok := arg.(*goja.Object); ok {
			if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
				length := int(lengthVal.ToInteger())
				if length > 0 && length <= 65536 { // 限制大小
					// 生成随机字节并填充数组
					randomBytes := make([]byte, length*4) // 假设最大4字节元素
					rand.Read(randomBytes)

					for i := 0; i < length; i++ {
						// 简单的32位随机值
						value := uint32(randomBytes[i*4]) |
							(uint32(randomBytes[i*4+1]) << 8) |
							(uint32(randomBytes[i*4+2]) << 16) |
							(uint32(randomBytes[i*4+3]) << 24)
						obj.Set(fmt.Sprintf("%d", i), runtime.ToValue(value))
					}
				}
			}
		}

		return arg
	}

	cryptoObj.Set("randomBytes", randomBytes)
	cryptoObj.Set("getRandomValues", getRandomValues)

	// 设置到全局环境，crypto-js 会通过 require('crypto') 或 global.crypto 访问
	runtime.Set("crypto", cryptoObj)

	// 创建 global 对象（如果不存在），crypto-js 会使用
	globalVal := runtime.Get("global")
	if globalVal == nil || goja.IsUndefined(globalVal) {
		// 创建一个简单的 global 对象用于 crypto-js
		globalObj := runtime.NewObject()
		globalObj.Set("crypto", cryptoObj)
		runtime.Set("global", globalObj)
	} else if globalObj, ok := globalVal.(*goja.Object); ok {
		globalObj.Set("crypto", cryptoObj)
	}

	// 静默设置，避免重复日志
	return nil
}

// loadCryptoJS 加载crypto-js库 (带缓存优化)
func (ce *CryptoEnhancer) loadCryptoJS(runtime *goja.Runtime) error {
	// 每次都检查当前runtime中是否已经有CryptoJS
	cryptoJSVal := runtime.Get("CryptoJS")
	if cryptoJSVal != nil && !goja.IsUndefined(cryptoJSVal) {
		// fmt.Printf("✅ CryptoJS 已存在于当前runtime中\n")
		return nil // 当前runtime中已经有了
	}

	// 🔧 重要修复：在加载crypto-js之前先提供必要的crypto环境
	// crypto-js 在初始化时会检查这些方法是否存在
	if err := ce.SetupCryptoEnvironment(runtime); err != nil {
		return fmt.Errorf("设置crypto环境失败: %w", err)
	}

	// 🔥 优化：使用编译后的 Program，避免每次重新解析
	program, err := ce.getCompiledProgram()
	if err != nil {
		return fmt.Errorf("获取编译后的crypto-js程序失败: %w", err)
	}

	// 🔧 关键修复：crypto-js.min.js 使用 UMD 格式，需要 module 和 exports 对象
	// 在执行前创建一个临时的 module 上下文
	module := runtime.NewObject()
	exports := runtime.NewObject()
	module.Set("exports", exports)
	runtime.Set("module", module)
	runtime.Set("exports", exports)

	// 直接运行编译后的程序
	result, err := runtime.RunProgram(program)
	if err != nil {
		return fmt.Errorf("执行crypto-js程序失败: %w", err)
	}

	// 获取导出的 CryptoJS 对象
	// crypto-js 会设置 module.exports = exports = CryptoJS
	moduleExports := module.Get("exports")
	if moduleExports != nil && !goja.IsUndefined(moduleExports) {
		runtime.Set("CryptoJS", moduleExports)
	} else if result != nil && !goja.IsUndefined(result) {
		// 备选：如果没有通过 module.exports，尝试直接使用返回值
		runtime.Set("CryptoJS", result)
	} else {
		return fmt.Errorf("crypto-js 加载后无法获取 CryptoJS 对象")
	}

	// 清理临时的 module 和 exports（可选，避免污染全局）
	// 注意：不清理，因为用户代码可能会用到
	// runtime.Set("module", goja.Undefined())
	// runtime.Set("exports", goja.Undefined())

	return nil
}

// getCryptoJSCode 获取crypto-js代码 (带缓存，支持嵌入式和外部文件)
func (ce *CryptoEnhancer) getCryptoJSCode() (string, error) {
	// 先尝试读取缓存
	ce.cacheMutex.RLock()
	if ce.cryptoJSCache != "" {
		defer ce.cacheMutex.RUnlock()
		return ce.cryptoJSCache, nil
	}
	ce.cacheMutex.RUnlock()

	// 缓存为空，需要加载代码
	ce.cacheMutex.Lock()
	defer ce.cacheMutex.Unlock()

	// 双重检查，防止在等待锁的过程中其他 goroutine 已经加载了
	if ce.cryptoJSCache != "" {
		return ce.cryptoJSCache, nil
	}

	var cryptoJSContent string
	var loadSource string

	// 优先使用嵌入的 crypto-js（用于 Docker 部署）
	if ce.embeddedCode != "" {
		cryptoJSContent = ce.embeddedCode
		loadSource = "嵌入式文件"
		fmt.Printf("🔍 首次加载 crypto-js 从: 嵌入式文件\n")
	} else {
		// 回退到文件系统加载（用于开发环境）
		loadSource = fmt.Sprintf("外部文件: %s", ce.cryptoJSPath)
		fmt.Printf("🔍 首次加载 crypto-js 从路径: %s\n", ce.cryptoJSPath)

		data, err := os.ReadFile(ce.cryptoJSPath)
		if err != nil {
			return "", fmt.Errorf("无法读取crypto-js文件 %s: %w", ce.cryptoJSPath, err)
		}
		cryptoJSContent = string(data)
	}

	fmt.Printf("✅ crypto-js 加载成功，大小: %d 字节，来源: %s (已缓存)\n",
		len(cryptoJSContent), loadSource)

	// 缓存代码内容
	ce.cryptoJSCache = cryptoJSContent

	return ce.cryptoJSCache, nil
}

// getCompiledProgram 获取编译后的crypto-js程序 (带缓存)
// 🔥 优化：使用 sync.Once 确保只编译一次，性能提升 10-15%
func (ce *CryptoEnhancer) getCompiledProgram() (*goja.Program, error) {
	// 使用 sync.Once 确保编译逻辑只执行一次
	ce.compileOnce.Do(func() {
		// 获取代码内容
		cryptoJSCode, err := ce.getCryptoJSCode()
		if err != nil {
			ce.compileErr = fmt.Errorf("获取crypto-js代码失败: %w", err)
			log.Printf("❌ 获取crypto-js代码失败: %v", err)
			return
		}

		// 包装代码以确保 CryptoJS 全局可用
		wrappedCode := fmt.Sprintf(`
			(function() {
				%s
				// 确保 CryptoJS 是全局可用的
				if (typeof CryptoJS !== 'undefined') {
					this.CryptoJS = CryptoJS;
					return true;
				}
				return false;
			})();
		`, cryptoJSCode)

		// 🔥 关键：编译代码为 *goja.Program（只在首次调用时执行）
		log.Printf("🔧 [一次性初始化] 编译 crypto-js 为 goja.Program (大小: %d 字节)", len(cryptoJSCode))
		program, err := goja.Compile("crypto-js.min.js", wrappedCode, true)
		if err != nil {
			ce.compileErr = fmt.Errorf("编译crypto-js失败: %w", err)
			log.Printf("❌ 编译crypto-js失败: %v", err)
			return
		}

		log.Printf("✅ [一次性初始化] crypto-js 编译完成并永久缓存，后续请求零开销")

		// 缓存编译后的程序
		ce.compiledProgram = program
		ce.compileErr = nil
	})

	// 返回编译结果或错误
	return ce.compiledProgram, ce.compileErr
}

// enhanceWithNativeAPIs 用Go原生实现补齐缺失的API
func (ce *CryptoEnhancer) enhanceWithNativeAPIs(runtime *goja.Runtime) error {
	// 创建crypto对象 (纯Go原生实现,不桥接crypto-js)
	cryptoObj := runtime.NewObject()

	// 添加Go原生实现的方法
	if err := ce.addNativeRandomBytes(runtime, cryptoObj); err != nil {
		return err
	}

	if err := ce.addNativeRandomUUID(runtime, cryptoObj); err != nil {
		return err
	}

	if err := ce.addNativeGetRandomValues(runtime, cryptoObj); err != nil {
		return err
	}

	// 添加基础的哈希和HMAC方法
	if err := ce.addCreateHashMethod(runtime, cryptoObj); err != nil {
		return err
	}

	if err := ce.addCreateHmacMethod(runtime, cryptoObj); err != nil {
		return err
	}

	if err := ce.addRandomMethods(runtime, cryptoObj); err != nil {
		return err
	}

	// 设置为全局crypto对象
	runtime.Set("crypto", cryptoObj)

	return nil
}

// addNativeRandomBytes 添加Go原生的randomBytes实现
func (ce *CryptoEnhancer) addNativeRandomBytes(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	randomBytes := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("randomBytes requires size parameter"))
		}

		size := int(call.Arguments[0].ToInteger())
		if size <= 0 || size > 1024*1024 { // 限制最大1MB
			panic(runtime.NewTypeError("randomBytes size must be between 1 and 1048576"))
		}

		bytes := make([]byte, size)
		_, err := rand.Read(bytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to generate random bytes: %w", err)))
		}

		// 创建类似Buffer的对象
		bufferObj := runtime.NewObject()
		bufferObj.Set("length", runtime.ToValue(size))

		// 设置索引访问
		for i, b := range bytes {
			bufferObj.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(b)))
		}

		// toString方法
		bufferObj.Set("toString", func(call goja.FunctionCall) goja.Value {
			encoding := "hex"
			if len(call.Arguments) > 0 {
				encoding = strings.ToLower(call.Arguments[0].String())
			}

			switch encoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(bytes))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(bytes))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Unsupported encoding: %s", encoding)))
			}
		})

		return bufferObj
	}

	cryptoObj.Set("randomBytes", randomBytes)
	return nil
}

// addNativeRandomUUID 添加Go原生的randomUUID实现
func (ce *CryptoEnhancer) addNativeRandomUUID(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	randomUUID := func(call goja.FunctionCall) goja.Value {
		// 生成UUID v4
		uuid := make([]byte, 16)
		rand.Read(uuid)

		// 设置版本 (4) 和变体位
		uuid[6] = (uuid[6] & 0x0f) | 0x40 // Version 4
		uuid[8] = (uuid[8] & 0x3f) | 0x80 // Variant bits

		// 格式化为标准UUID字符串
		uuidStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
			uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:16])

		return runtime.ToValue(uuidStr)
	}

	cryptoObj.Set("randomUUID", randomUUID)
	return nil
}

// addNativeGetRandomValues 添加Go原生的getRandomValues实现
func (ce *CryptoEnhancer) addNativeGetRandomValues(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	getRandomValues := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("getRandomValues requires a typed array"))
		}

		arg := call.Arguments[0]
		if obj, ok := arg.(*goja.Object); ok {
			if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
				length := int(lengthVal.ToInteger())
				if length > 0 && length <= 65536 { // 限制大小
					// 生成随机字节并填充数组
					randomBytes := make([]byte, length*4) // 假设最大4字节元素
					rand.Read(randomBytes)

					for i := 0; i < length; i++ {
						// 简单的32位随机值
						value := uint32(randomBytes[i*4]) |
							(uint32(randomBytes[i*4+1]) << 8) |
							(uint32(randomBytes[i*4+2]) << 16) |
							(uint32(randomBytes[i*4+3]) << 24)
						obj.Set(fmt.Sprintf("%d", i), runtime.ToValue(value))
					}
				}
			}
		}

		return arg
	}

	cryptoObj.Set("getRandomValues", getRandomValues)
	return nil
}

// ============ RSA 实现 ============

// addCryptoConstants 添加crypto.constants常量
func (ce *CryptoEnhancer) addCryptoConstants(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	constants := runtime.NewObject()

	// RSA padding 常量
	constants.Set("RSA_PKCS1_PADDING", 1)
	constants.Set("RSA_PKCS1_OAEP_PADDING", 4)
	constants.Set("RSA_PKCS1_PSS_PADDING", 6)

	cryptoObj.Set("constants", constants)
	return nil
}

// addRSAMethods 添加RSA相关方法
func (ce *CryptoEnhancer) addRSAMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// generateKeyPairSync
	cryptoObj.Set("generateKeyPairSync", func(call goja.FunctionCall) goja.Value {
		return ce.generateKeyPairSync(runtime, call)
	})

	// publicEncrypt
	cryptoObj.Set("publicEncrypt", func(call goja.FunctionCall) goja.Value {
		return ce.publicEncrypt(runtime, call)
	})

	// privateDecrypt
	cryptoObj.Set("privateDecrypt", func(call goja.FunctionCall) goja.Value {
		return ce.privateDecrypt(runtime, call)
	})

	// createSign
	cryptoObj.Set("createSign", func(call goja.FunctionCall) goja.Value {
		return ce.createSign(runtime, call)
	})

	// createVerify
	cryptoObj.Set("createVerify", func(call goja.FunctionCall) goja.Value {
		return ce.createVerify(runtime, call)
	})

	// sign (简化API)
	cryptoObj.Set("sign", func(call goja.FunctionCall) goja.Value {
		return ce.sign(runtime, call)
	})

	// verify (简化API)
	cryptoObj.Set("verify", func(call goja.FunctionCall) goja.Value {
		return ce.verify(runtime, call)
	})

	return nil
}

// generateKeyPairSync 生成RSA密钥对
func (ce *CryptoEnhancer) generateKeyPairSync(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("generateKeyPairSync requires type and options parameters"))
	}

	keyType := call.Arguments[0].String()
	if keyType != "rsa" {
		panic(runtime.NewTypeError("Only 'rsa' key type is supported"))
	}

	// 解析选项
	options := call.Arguments[1].ToObject(runtime)
	modulusLength := 2048 // 默认2048位

	if val := options.Get("modulusLength"); !goja.IsUndefined(val) {
		modulusLength = int(val.ToInteger())
	}

	// 验证密钥长度
	if modulusLength != 1024 && modulusLength != 2048 && modulusLength != 4096 {
		panic(runtime.NewTypeError("modulusLength must be 1024, 2048, or 4096"))
	}

	// 生成密钥对
	privateKey, err := rsa.GenerateKey(rand.Reader, modulusLength)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to generate RSA key: %w", err)))
	}

	// 导出公钥为PEM格式
	publicKeyBytes, err := x509.MarshalPKIXPublicKey(&privateKey.PublicKey)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to marshal public key: %w", err)))
	}

	publicKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicKeyBytes,
	})

	// 导出私钥为PEM格式
	privateKeyBytes := x509.MarshalPKCS1PrivateKey(privateKey)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: privateKeyBytes,
	})

	// 返回密钥对对象
	result := runtime.NewObject()
	result.Set("publicKey", runtime.ToValue(string(publicKeyPEM)))
	result.Set("privateKey", runtime.ToValue(string(privateKeyPEM)))

	return result
}

// getHashFunction 获取哈希函数
func getHashFunction(hashName string) (hash.Hash, error) {
	switch strings.ToLower(hashName) {
	case "sha1":
		return sha1.New(), nil
	case "sha256":
		return sha256.New(), nil
	case "sha384":
		return sha512.New384(), nil
	case "sha512":
		return sha512.New(), nil
	default:
		return nil, fmt.Errorf("unsupported hash algorithm: %s", hashName)
	}
}

// parsePrivateKey 解析私钥（支持 PKCS#1 和 PKCS#8 格式）
func parsePrivateKey(keyPEM string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("failed to decode PEM block containing private key")
	}

	return parsePrivateKeyFromBlock(block)
}

// parsePrivateKeyFromBlock 从 PEM block 解析私钥（支持 PKCS#1 和 PKCS#8 格式）
func parsePrivateKeyFromBlock(block *pem.Block) (*rsa.PrivateKey, error) {
	// 先尝试 PKCS#1 格式 (-----BEGIN RSA PRIVATE KEY-----)
	privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
	if err == nil {
		return privateKey, nil
	}

	// 尝试 PKCS#8 格式 (-----BEGIN PRIVATE KEY-----)
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("failed to parse private key: %w", err)
	}

	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("not an RSA private key")
	}

	return rsaKey, nil
}

// publicEncrypt RSA公钥加密
func (ce *CryptoEnhancer) publicEncrypt(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("publicEncrypt requires key and data parameters"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 1 // 默认RSA_PKCS1_PADDING
	var oaepHash string = "sha1"

	// 第一个参数可以是字符串或对象
	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok {
		// 对象形式: { key: '...', padding: ..., oaepHash: '...' }
		if keyVal := obj.Get("key"); !goja.IsUndefined(keyVal) {
			keyPEM = keyVal.String()
		}
		if paddingVal := obj.Get("padding"); !goja.IsUndefined(paddingVal) {
			padding = int(paddingVal.ToInteger())
		}
		if hashVal := obj.Get("oaepHash"); !goja.IsUndefined(hashVal) {
			oaepHash = hashVal.String()
		}
	} else {
		// 字符串形式
		keyPEM = firstArg.String()
	}

	// 获取待加密数据
	var data []byte
	secondArg := call.Arguments[1]

	// 支持Buffer对象或字符串
	if obj, ok := secondArg.(*goja.Object); ok {
		// 尝试作为Buffer处理
		if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(fmt.Sprintf("%d", i)); !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		} else {
			data = []byte(secondArg.String())
		}
	} else {
		data = []byte(secondArg.String())
	}

	// 解析公钥
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		panic(runtime.NewTypeError("failed to decode PEM block containing public key"))
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to parse public key: %w", err)))
	}

	publicKey, ok := pub.(*rsa.PublicKey)
	if !ok {
		panic(runtime.NewTypeError("not an RSA public key"))
	}

	// 执行加密
	var encrypted []byte
	if padding == 4 { // RSA_PKCS1_OAEP_PADDING
		hashFunc, err := getHashFunction(oaepHash)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		encrypted, err = rsa.EncryptOAEP(hashFunc, rand.Reader, publicKey, data, nil)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed: %w", err)))
		}
	} else { // RSA_PKCS1_PADDING
		encrypted, err = rsa.EncryptPKCS1v15(rand.Reader, publicKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed: %w", err)))
		}
	}

	// 返回Buffer对象
	return ce.createBuffer(runtime, encrypted)
}

// privateDecrypt RSA私钥解密
func (ce *CryptoEnhancer) privateDecrypt(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("privateDecrypt requires key and data parameters"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 1 // 默认RSA_PKCS1_PADDING
	var oaepHash string = "sha1"

	// 第一个参数可以是字符串或对象
	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok {
		if keyVal := obj.Get("key"); !goja.IsUndefined(keyVal) {
			keyPEM = keyVal.String()
		}
		if paddingVal := obj.Get("padding"); !goja.IsUndefined(paddingVal) {
			padding = int(paddingVal.ToInteger())
		}
		if hashVal := obj.Get("oaepHash"); !goja.IsUndefined(hashVal) {
			oaepHash = hashVal.String()
		}
	} else {
		keyPEM = firstArg.String()
	}

	// 获取待解密数据
	var data []byte
	secondArg := call.Arguments[1]

	if obj, ok := secondArg.(*goja.Object); ok {
		if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(fmt.Sprintf("%d", i)); !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		} else {
			data = []byte(secondArg.String())
		}
	} else {
		data = []byte(secondArg.String())
	}

	// 解析私钥（支持 PKCS#1 和 PKCS#8 格式）
	privateKey, err := parsePrivateKey(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 执行解密
	var decrypted []byte
	if padding == 4 { // RSA_PKCS1_OAEP_PADDING
		hashFunc, err := getHashFunction(oaepHash)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		decrypted, err = rsa.DecryptOAEP(hashFunc, rand.Reader, privateKey, data, nil)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("decryption failed: %w", err)))
		}
	} else { // RSA_PKCS1_PADDING
		decrypted, err = rsa.DecryptPKCS1v15(rand.Reader, privateKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("decryption failed: %w", err)))
		}
	}

	// 返回Buffer对象
	return ce.createBuffer(runtime, decrypted)
}

// createSign 创建签名对象
func (ce *CryptoEnhancer) createSign(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createSign requires algorithm parameter"))
	}

	algorithm := call.Arguments[0].String()

	// 创建Sign对象
	signObj := runtime.NewObject()
	var dataBuffer []byte

	// update方法
	signObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update requires data parameter"))
		}

		data := call.Arguments[0].String()
		dataBuffer = append(dataBuffer, []byte(data)...)

		return call.This
	})

	// end方法
	signObj.Set("end", func(call goja.FunctionCall) goja.Value {
		return call.This
	})

	// sign方法
	signObj.Set("sign", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("sign requires key parameter"))
		}

		// 解析参数
		var keyPEM string
		var padding int = 1 // 默认RSA_PKCS1_PADDING
		var saltLength int = 32
		var outputEncoding string // 可选的输出编码格式

		firstArg := call.Arguments[0]
		firstArgObj := firstArg.ToObject(runtime)

		// 尝试获取 key 属性
		if keyVal := firstArgObj.Get("key"); keyVal != nil && !goja.IsUndefined(keyVal) {
			keyPEM = keyVal.String()

			if paddingVal := firstArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) {
				saltLength = int(saltVal.ToInteger())
			}
		} else {
			// 如果没有 key 属性，说明直接传入的是密钥字符串
			keyPEM = firstArg.String()
		}

		// 检查第二个参数是否为编码格式 (Node.js 原生 API 支持)
		if len(call.Arguments) > 1 {
			outputEncoding = strings.ToLower(call.Arguments[1].String())
		}

		// 解析私钥
		block, _ := pem.Decode([]byte(keyPEM))
		if block == nil {
			panic(runtime.NewTypeError("failed to decode PEM block containing private key"))
		}

		privateKey, err := parsePrivateKeyFromBlock(block)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to parse private key: %w", err)))
		}

		// 计算哈希
		hashFunc, err := getHashFunction(algorithm)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		hashFunc.Write(dataBuffer)
		hashed := hashFunc.Sum(nil)

		// 执行签名
		var signature []byte
		if padding == 6 { // RSA_PKCS1_PSS_PADDING
			opts := &rsa.PSSOptions{
				SaltLength: saltLength,
				Hash:       getCryptoHash(algorithm),
			}
			signature, err = rsa.SignPSS(rand.Reader, privateKey, opts.Hash, hashed, opts)
		} else { // RSA_PKCS1_PADDING
			signature, err = rsa.SignPKCS1v15(rand.Reader, privateKey, getCryptoHash(algorithm), hashed)
		}

		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("signing failed: %w", err)))
		}

		// 如果指定了编码格式，返回编码后的字符串
		if outputEncoding != "" {
			switch outputEncoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(signature))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(signature))
			case "utf8", "utf-8":
				return runtime.ToValue(string(signature))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("Unsupported encoding: %s", outputEncoding)))
			}
		}

		// 默认返回 Buffer
		return ce.createBuffer(runtime, signature)
	})

	return signObj
}

// createVerify 创建验证对象
func (ce *CryptoEnhancer) createVerify(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createVerify requires algorithm parameter"))
	}

	algorithm := call.Arguments[0].String()

	// 创建Verify对象
	verifyObj := runtime.NewObject()
	var dataBuffer []byte

	// update方法
	verifyObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update requires data parameter"))
		}

		data := call.Arguments[0].String()
		dataBuffer = append(dataBuffer, []byte(data)...)

		return call.This
	})

	// end方法
	verifyObj.Set("end", func(call goja.FunctionCall) goja.Value {
		return call.This
	})

	// verify方法
	verifyObj.Set("verify", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("verify requires key and signature parameters"))
		}

		// 解析参数
		var keyPEM string
		var padding int = 1
		var saltLength int = 32

		firstArg := call.Arguments[0]
		firstArgObj := firstArg.ToObject(runtime)

		// 尝试获取 key 属性
		if keyVal := firstArgObj.Get("key"); keyVal != nil && !goja.IsUndefined(keyVal) {
			keyPEM = keyVal.String()

			if paddingVal := firstArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) {
				saltLength = int(saltVal.ToInteger())
			}
		} else {
			// 如果没有 key 属性，说明直接传入的是密钥字符串
			keyPEM = firstArg.String()
		}

		// 获取签名数据
		var signature []byte
		secondArg := call.Arguments[1]

		if obj, ok := secondArg.(*goja.Object); ok {
			if lengthVal := obj.Get("length"); !goja.IsUndefined(lengthVal) {
				length := int(lengthVal.ToInteger())
				signature = make([]byte, length)
				for i := 0; i < length; i++ {
					if val := obj.Get(fmt.Sprintf("%d", i)); !goja.IsUndefined(val) {
						signature[i] = byte(val.ToInteger())
					}
				}
			}
		}

		// 解析公钥
		block, _ := pem.Decode([]byte(keyPEM))
		if block == nil {
			panic(runtime.NewTypeError("failed to decode PEM block containing public key"))
		}

		pub, err := x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to parse public key: %w", err)))
		}

		publicKey, ok := pub.(*rsa.PublicKey)
		if !ok {
			panic(runtime.NewTypeError("not an RSA public key"))
		}

		// 计算哈希
		hashFunc, err := getHashFunction(algorithm)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		hashFunc.Write(dataBuffer)
		hashed := hashFunc.Sum(nil)

		// 执行验证
		if padding == 6 { // RSA_PKCS1_PSS_PADDING
			opts := &rsa.PSSOptions{
				SaltLength: saltLength,
				Hash:       getCryptoHash(algorithm),
			}
			err = rsa.VerifyPSS(publicKey, opts.Hash, hashed, signature, opts)
		} else { // RSA_PKCS1_PADDING
			err = rsa.VerifyPKCS1v15(publicKey, getCryptoHash(algorithm), hashed, signature)
		}

		return runtime.ToValue(err == nil)
	})

	return verifyObj
}

// getCryptoHash 获取crypto包的Hash类型
func getCryptoHash(algorithm string) crypto.Hash {
	switch strings.ToLower(algorithm) {
	case "sha1":
		return crypto.SHA1
	case "sha256":
		return crypto.SHA256
	case "sha384":
		return crypto.SHA384
	case "sha512":
		return crypto.SHA512
	default:
		return crypto.SHA256
	}
}

// createBuffer 创建Buffer对象
func (ce *CryptoEnhancer) createBuffer(runtime *goja.Runtime, data []byte) goja.Value {
	bufferObj := runtime.NewObject()
	bufferObj.Set("length", runtime.ToValue(len(data)))

	// 设置索引访问
	for i, b := range data {
		bufferObj.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(b)))
	}

	// toString方法
	bufferObj.Set("toString", func(call goja.FunctionCall) goja.Value {
		encoding := "utf8"
		if len(call.Arguments) > 0 {
			encoding = strings.ToLower(call.Arguments[0].String())
		}

		switch encoding {
		case "utf8", "utf-8":
			return runtime.ToValue(string(data))
		case "hex":
			return runtime.ToValue(hex.EncodeToString(data))
		case "base64":
			return runtime.ToValue(base64.StdEncoding.EncodeToString(data))
		default:
			return runtime.ToValue(string(data))
		}
	})

	return bufferObj
}

// sign 简化的签名API (crypto.sign)
func (ce *CryptoEnhancer) sign(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("sign requires algorithm, data, and key parameters"))
	}

	algorithm := call.Arguments[0].String()

	// 获取数据
	var data []byte
	dataArg := call.Arguments[1]
	if obj, ok := dataArg.(*goja.Object); ok {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(fmt.Sprintf("%d", i)); val != nil && !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		}
	} else {
		data = []byte(dataArg.String())
	}

	// 解析密钥和选项
	var keyPEM string
	var padding int = 1 // 默认 PKCS1
	var saltLength int = 32

	thirdArg := call.Arguments[2]
	thirdArgObj := thirdArg.ToObject(runtime)

	// 尝试获取 key 属性
	if keyVal := thirdArgObj.Get("key"); keyVal != nil && !goja.IsUndefined(keyVal) {
		keyPEM = keyVal.String()

		if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) {
			padding = int(paddingVal.ToInteger())
		}
		if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) {
			saltLength = int(saltVal.ToInteger())
		}
	} else {
		// 直接是密钥字符串
		keyPEM = thirdArg.String()
	}

	// 解析私钥
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		panic(runtime.NewTypeError("failed to decode PEM block containing private key"))
	}

	privateKey, err := parsePrivateKeyFromBlock(block)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to parse private key: %w", err)))
	}

	// 计算哈希
	hashFunc, err := getHashFunction(algorithm)
	if err != nil {
		panic(runtime.NewGoError(err))
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// 执行签名
	var signature []byte
	if padding == 6 { // RSA_PKCS1_PSS_PADDING
		opts := &rsa.PSSOptions{
			SaltLength: saltLength,
			Hash:       getCryptoHash(algorithm),
		}
		signature, err = rsa.SignPSS(rand.Reader, privateKey, opts.Hash, hashed, opts)
	} else { // RSA_PKCS1_PADDING
		signature, err = rsa.SignPKCS1v15(rand.Reader, privateKey, getCryptoHash(algorithm), hashed)
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("signing failed: %w", err)))
	}

	return ce.createBuffer(runtime, signature)
}

// verify 简化的验签API (crypto.verify)
func (ce *CryptoEnhancer) verify(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 4 {
		panic(runtime.NewTypeError("verify requires algorithm, data, key, and signature parameters"))
	}

	algorithm := call.Arguments[0].String()

	// 获取数据
	var data []byte
	dataArg := call.Arguments[1]
	if obj, ok := dataArg.(*goja.Object); ok {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(fmt.Sprintf("%d", i)); val != nil && !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		}
	} else {
		data = []byte(dataArg.String())
	}

	// 解析密钥和选项
	var keyPEM string
	var padding int = 1 // 默认 PKCS1
	var saltLength int = 32

	thirdArg := call.Arguments[2]
	thirdArgObj := thirdArg.ToObject(runtime)

	// 尝试获取 key 属性
	if keyVal := thirdArgObj.Get("key"); keyVal != nil && !goja.IsUndefined(keyVal) {
		keyPEM = keyVal.String()

		if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) {
			padding = int(paddingVal.ToInteger())
		}
		if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) {
			saltLength = int(saltVal.ToInteger())
		}
	} else {
		// 直接是密钥字符串
		keyPEM = thirdArg.String()
	}

	// 获取签名
	var signature []byte
	sigArg := call.Arguments[3]

	if obj, ok := sigArg.(*goja.Object); ok {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			signature = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(fmt.Sprintf("%d", i)); val != nil && !goja.IsUndefined(val) {
					signature[i] = byte(val.ToInteger())
				}
			}
		}
	}

	// 解析公钥
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		panic(runtime.NewTypeError("failed to decode PEM block containing public key"))
	}

	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("failed to parse public key: %w", err)))
	}

	publicKey, ok := pub.(*rsa.PublicKey)
	if !ok {
		panic(runtime.NewTypeError("not an RSA public key"))
	}

	// 计算哈希
	hashFunc, err := getHashFunction(algorithm)
	if err != nil {
		panic(runtime.NewGoError(err))
	}
	hashFunc.Write(data)
	hashed := hashFunc.Sum(nil)

	// 执行验证
	if padding == 6 { // RSA_PKCS1_PSS_PADDING
		opts := &rsa.PSSOptions{
			SaltLength: saltLength,
			Hash:       getCryptoHash(algorithm),
		}
		err = rsa.VerifyPSS(publicKey, opts.Hash, hashed, signature, opts)
	} else { // RSA_PKCS1_PADDING
		err = rsa.VerifyPKCS1v15(publicKey, getCryptoHash(algorithm), hashed, signature)
	}

	return runtime.ToValue(err == nil)
}
