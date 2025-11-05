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
	"crypto/subtle"
	"crypto/x509"
	"encoding"
	"encoding/base64"
	"encoding/hex"
	"encoding/pem"
	"fmt"
	"hash"
	"io"
	"math/big"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"go.uber.org/zap"
	"golang.org/x/crypto/blake2b"
	"golang.org/x/crypto/blake2s"
	"golang.org/x/crypto/sha3"
)

// ============================================================================
// 🔥 Crypto 安全限制常量
// ============================================================================

const (
	// MaxRandomBytesSize 限制 randomBytes 生成的最大字节数
	// 防止 DoS 攻击和内存耗尽
	// 1MB 是合理的上限，足够大多数加密场景使用
	MaxRandomBytesSize = 1 * 1024 * 1024 // 1MB - 防止DoS攻击

	// MaxTypedArraySize 限制 TypedArray 的最大大小
	// 遵循 Web Crypto API 标准，64KB 是 TypedArray 的常见上限
	// 参考：Web Crypto API getRandomValues 限制为 65536 字节
	MaxTypedArraySize = 65536 // 64KB - Web Crypto标准
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

	utils.Debug("CryptoEnhancer 初始化", zap.String("crypto_js_path", cryptoJSPath))

	return &CryptoEnhancer{
		cryptoJSPath: cryptoJSPath,
	}
}

// NewCryptoEnhancerWithEmbedded 使用嵌入的crypto-js代码创建增强器
func NewCryptoEnhancerWithEmbedded(embeddedCode string) *CryptoEnhancer {
	utils.Debug("CryptoEnhancer 初始化（嵌入式 crypto-js）", zap.Int("size_bytes", len(embeddedCode)))

	return &CryptoEnhancer{
		embeddedCode: embeddedCode,
		cryptoJSPath: "embedded",
	}
}

// ============================================================================
// 🔥 共享辅助函数（避免代码重复）
// ============================================================================

// createRandomBytesFunc 创建 randomBytes 函数（共享实现）
// 避免在 addRandomMethods 和 addNativeRandomBytes 中重复代码
// 🔥 修复：需要 CryptoEnhancer 实例来调用 createBuffer
func (ce *CryptoEnhancer) createRandomBytesFunc(runtime *goja.Runtime) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("randomBytes 需要 size 参数"))
		}

		size := int(call.Arguments[0].ToInteger())
		if size <= 0 || size > MaxRandomBytesSize {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"randomBytes 大小必须在 1 到 %d 字节之间", MaxRandomBytesSize)))
		}

		bytes := make([]byte, size)
		_, err := rand.Read(bytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成随机字节失败: %w", err)))
		}

		// 🔥 修复：使用 createBuffer 创建标准 Buffer 对象（包含 equals 方法）
		return ce.createBuffer(runtime, bytes)
	}
}

// createRandomUUIDFunc 创建 randomUUID 函数（共享实现）
// 避免在 addRandomMethods 和 addNativeRandomUUID 中重复代码
// 🔥 Node.js v18+ 兼容：支持 options 参数（{ disableEntropyCache }）
func createRandomUUIDFunc(runtime *goja.Runtime) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		// 🔥 Node.js v18+ 兼容：接受可选的 options 参数
		// options: { disableEntropyCache?: boolean }
		// 注意：Go 的 crypto/rand 不使用熵缓存，所以这个选项实际上被忽略
		// 但我们需要接受它以保持 API 兼容性
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			// 验证 options 是对象
			if _, ok := call.Arguments[0].(*goja.Object); !ok {
				panic(runtime.NewTypeError("options 参数必须是对象"))
			}
			// 如果有 options，我们接受但不做特殊处理
			// Go 的 crypto/rand 总是从系统熵源读取，不使用缓存
		}

		// 生成 UUID v4
		uuid := make([]byte, 16)
		// 🔥 修复：检查 rand.Read 的错误
		// 在低熵或系统源异常时，rand.Read 可能失败
		_, err := rand.Read(uuid)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成 UUID 失败: %w", err)))
		}

		// 设置版本 (4) 和变体位
		uuid[6] = (uuid[6] & 0x0f) | 0x40 // Version 4
		uuid[8] = (uuid[8] & 0x3f) | 0x80 // Variant bits

		// 格式化为标准 UUID 字符串
		uuidStr := fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
			uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:16])

		return runtime.ToValue(uuidStr)
	}
}

// ============================================================================

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

		// 🔥 Node.js 18+ 兼容：添加辅助方法
		ce.addHelperMethods(runtime, cryptoObj)

		// 🔥 Node.js 18+ 兼容：添加全局 Buffer 对象支持
		ce.addBufferSupport(runtime)

		module.Set("exports", cryptoObj)
	})
}

// RegisterCryptoJSModule 注册crypto-js模块到require系统 (纯crypto-js实现)
func (ce *CryptoEnhancer) RegisterCryptoJSModule(registry *require.Registry) {
	// 注册 crypto-js 模块 - 纯crypto-js库
	registry.RegisterNativeModule("crypto-js", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保crypto-js已加载
		if err := ce.loadCryptoJS(runtime); err != nil {
			panic(runtime.NewGoError(fmt.Errorf("加载 crypto-js 模块失败: %w", err)))
		}

		// 获取CryptoJS对象
		cryptoJSVal := runtime.Get("CryptoJS")
		if cryptoJSVal != nil && !goja.IsUndefined(cryptoJSVal) {
			module.Set("exports", cryptoJSVal)
		} else {
			panic(runtime.NewGoError(fmt.Errorf("CryptoJS 不可用")))
		}
	})
}

// addCreateHashMethod 添加createHash方法
func (ce *CryptoEnhancer) addCreateHashMethod(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	createHash := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("createHash 需要一个 algorithm 参数"))
		}

		// 🔥 修复：支持算法别名（rsa-sha256、sha-256 等）
		algorithm := normalizeHashAlgorithm(strings.ToLower(call.Arguments[0].String()))

		// 🔥 Node.js 18+：解析 options 参数（用于 SHAKE）
		var outputLength int
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			if opts, ok := call.Arguments[1].(*goja.Object); ok && opts != nil {
				if lengthVal := opts.Get("outputLength"); !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
					outputLength = int(lengthVal.ToInteger())
				}
			}
		}

		// 🔥 特殊处理：SHAKE 系列使用 ShakeHash 接口
		var isShake bool
		var shakeHash sha3.ShakeHash
		var hasher hash.Hash

		switch algorithm {
		case "md5":
			hasher = md5.New()
		case "sha1":
			hasher = sha1.New()
		case "sha224":
			hasher = sha256.New224()
		case "sha256":
			hasher = sha256.New()
		case "sha384":
			hasher = sha512.New384()
		case "sha512":
			hasher = sha512.New()
		// SHA-512 变体
		case "sha512224", "sha512/224":
			hasher = sha512.New512_224()
		case "sha512256", "sha512/256":
			hasher = sha512.New512_256()
		// SHA3 系列
		case "sha3224":
			hasher = sha3.New224()
		case "sha3256":
			hasher = sha3.New256()
		case "sha3384":
			hasher = sha3.New384()
		case "sha3512":
			hasher = sha3.New512()
		// SHAKE 系列 (可扩展输出函数) - 特殊处理
		case "shake128":
			isShake = true
			shakeHash = sha3.NewShake128()
			// 默认输出长度：16 字节（与 Node.js 一致）
			if outputLength == 0 {
				outputLength = 16
			}
		case "shake256":
			isShake = true
			shakeHash = sha3.NewShake256()
			// 默认输出长度：32 字节（与 Node.js 一致）
			if outputLength == 0 {
				outputLength = 32
			}
		// BLAKE2 系列
		case "blake2b512":
			h, err := blake2b.New512(nil)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("创建 blake2b512 失败: %w", err)))
			}
			hasher = h
		case "blake2s256":
			h, err := blake2s.New256(nil)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("创建 blake2s256 失败: %w", err)))
			}
			hasher = h
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("不支持的哈希算法: %s", algorithm)))
		}

		// 创建Hash对象
		hashObj := runtime.NewObject()

		// 🔥 新增：跟踪 Hash 对象是否已经 digest
		var digested bool

		// update方法
		// 🔥 修复：支持 Buffer/TypedArray/ArrayBuffer/DataView/字符串
		// 🔥 新增：支持 inputEncoding 参数（hex/base64/latin1/ascii/utf8）
		hashObj.Set("update", func(call goja.FunctionCall) goja.Value {
			// 🔥 检查是否已经调用过 digest()
			if digested {
				panic(runtime.NewTypeError("Digest already called"))
			}

			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("update 需要 data 参数"))
			}

			var buf []byte
			var err error

			// 检查是否有 inputEncoding 参数
			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
				// 有 encoding 参数，data 必须是字符串
				dataStr := call.Arguments[0].String()
				encoding := strings.ToLower(call.Arguments[1].String())

				switch encoding {
				case "utf8", "utf-8":
					buf = []byte(dataStr)
				case "hex":
					buf, err = hex.DecodeString(dataStr)
					if err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("无效的 hex 字符串: %v", err)))
					}
				case "base64":
					buf, err = base64.StdEncoding.DecodeString(dataStr)
					if err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("无效的 base64 字符串: %v", err)))
					}
				case "latin1", "binary":
					// Latin1: 每个字符对应一个字节 (0-255)
					buf = make([]byte, len(dataStr))
					for i, r := range dataStr {
						if r > 255 {
							panic(runtime.NewTypeError(fmt.Sprintf("latin1 字符串包含非法字符: U+%04X", r)))
						}
						buf[i] = byte(r)
					}
				case "ascii":
					buf = make([]byte, len(dataStr))
					for i, r := range dataStr {
						if r > 127 {
							panic(runtime.NewTypeError(fmt.Sprintf("ascii 字符串包含非法字符: U+%04X", r)))
						}
						buf[i] = byte(r)
					}
				default:
					panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s (支持: utf8, hex, base64, latin1, binary, ascii)", encoding)))
				}
			} else {
				// 没有 encoding 参数，使用 convertToBytes
				buf, err = convertToBytes(runtime, call.Arguments[0])
				if err != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
				}
			}

			// 🔥 SHAKE 使用 Write 方法，标准 hash 也使用 Write
			if isShake {
				shakeHash.Write(buf)
			} else {
				hasher.Write(buf)
			}

			// 返回this以支持链式调用
			return call.This
		})

		// digest方法
		// 🔥 修复：默认返回 Buffer（与 Node.js 对齐）
		// 🔥 特殊处理：SHAKE 使用可变长度输出
		hashObj.Set("digest", func(call goja.FunctionCall) goja.Value {
			// 🔥 检查是否已经调用过 digest()
			if digested {
				panic(runtime.NewTypeError("Digest already called"))
			}
			digested = true // 标记为已 digest

			var sum []byte

			// 🔥 SHAKE 系列使用 Read() 方法读取指定长度
			if isShake {
				sum = make([]byte, outputLength)
				_, err := shakeHash.Read(sum)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("SHAKE 读取输出失败: %w", err)))
				}
			} else {
				sum = hasher.Sum(nil)
			}

			// 如果未指定编码，返回 Buffer
			if len(call.Arguments) == 0 {
				return ce.createBuffer(runtime, sum)
			}

			encoding := strings.ToLower(call.Arguments[0].String())
			switch encoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(sum))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(sum))
			case "latin1", "binary":
				// 🔥 修复：latin1/binary 是单字节编码，每个字节对应一个字符
				// 不能直接用 string(sum)，因为 Go 会按 UTF-8 解释
				// 需要逐字节转换为 rune，确保 1 字节 = 1 字符
				runes := make([]rune, len(sum))
				for i, b := range sum {
					runes[i] = rune(b)
				}
				return runtime.ToValue(string(runes))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s (支持: hex, base64, latin1, binary)", encoding)))
			}
		})

		// copy方法
		// 🔥 新增：支持复制哈希的中间状态（用于树形哈希、流式处理等）
		// 使用闭包工厂函数来避免递归引用问题
		var createCopyFunc func(hash.Hash, sha3.ShakeHash, string, *bool, bool, int) func(goja.FunctionCall) goja.Value
		createCopyFunc = func(currentHasher hash.Hash, currentShake sha3.ShakeHash, algo string, digestedPtr *bool, isShakeAlgo bool, shakeOutputLen int) func(goja.FunctionCall) goja.Value {
			return func(call goja.FunctionCall) goja.Value {
				// 🔥 检查是否已经调用过 digest()
				if *digestedPtr {
					panic(runtime.NewTypeError("Digest already called"))
				}

				var newHasher hash.Hash
				var newShake sha3.ShakeHash

				// 🔥 特殊处理：SHAKE 使用 Clone() 方法
				if isShakeAlgo {
					newShake = currentShake.Clone()
				} else {
					// 尝试使用 encoding.BinaryMarshaler 接口序列化当前状态
					type binaryMarshaler interface {
						MarshalBinary() ([]byte, error)
					}
					type binaryUnmarshaler interface {
						UnmarshalBinary([]byte) error
					}

					marshaler, canMarshal := currentHasher.(binaryMarshaler)
					if !canMarshal {
						panic(runtime.NewTypeError(fmt.Sprintf("哈希算法 %s 不支持 copy()", algo)))
					}

					// 序列化当前状态
					state, err := marshaler.MarshalBinary()
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("复制哈希状态失败: %w", err)))
					}

					// 创建新的 hasher
					switch algo {
					case "md5":
						newHasher = md5.New()
					case "sha1":
						newHasher = sha1.New()
					case "sha224":
						newHasher = sha256.New224()
					case "sha256":
						newHasher = sha256.New()
					case "sha384":
						newHasher = sha512.New384()
					case "sha512":
						newHasher = sha512.New()
					case "sha512224", "sha512/224":
						newHasher = sha512.New512_224()
					case "sha512256", "sha512/256":
						newHasher = sha512.New512_256()
					case "sha3224":
						newHasher = sha3.New224()
					case "sha3256":
						newHasher = sha3.New256()
					case "sha3384":
						newHasher = sha3.New384()
					case "sha3512":
						newHasher = sha3.New512()
					case "blake2b512":
						h, err := blake2b.New512(nil)
						if err != nil {
							panic(runtime.NewGoError(fmt.Errorf("创建 blake2b512 失败: %w", err)))
						}
						newHasher = h
					case "blake2s256":
						h, err := blake2s.New256(nil)
						if err != nil {
							panic(runtime.NewGoError(fmt.Errorf("创建 blake2s256 失败: %w", err)))
						}
						newHasher = h
					default:
						panic(runtime.NewTypeError(fmt.Sprintf("不支持的哈希算法: %s", algo)))
					}

					// 反序列化状态到新 hasher
					unmarshaler, canUnmarshal := newHasher.(binaryUnmarshaler)
					if !canUnmarshal {
						panic(runtime.NewTypeError(fmt.Sprintf("哈希算法 %s 不支持 copy()", algo)))
					}

					err = unmarshaler.UnmarshalBinary(state)
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("恢复哈希状态失败: %w", err)))
					}
				}

				// 创建新的 Hash 对象
				newHashObj := runtime.NewObject()

				// 🔥 新的 Hash 对象也需要跟踪 digested 状态
				var newDigested bool

				// 为新对象设置 update 方法
				newHashObj.Set("update", func(call goja.FunctionCall) goja.Value {
					// 🔥 检查是否已经调用过 digest()
					if newDigested {
						panic(runtime.NewTypeError("Digest already called"))
					}
					if len(call.Arguments) == 0 {
						panic(runtime.NewTypeError("update 需要 data 参数"))
					}

					var buf []byte
					var err error

					if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
						dataStr := call.Arguments[0].String()
						encoding := strings.ToLower(call.Arguments[1].String())

						switch encoding {
						case "utf8", "utf-8":
							buf = []byte(dataStr)
						case "hex":
							buf, err = hex.DecodeString(dataStr)
							if err != nil {
								panic(runtime.NewTypeError(fmt.Sprintf("无效的 hex 字符串: %v", err)))
							}
						case "base64":
							buf, err = base64.StdEncoding.DecodeString(dataStr)
							if err != nil {
								panic(runtime.NewTypeError(fmt.Sprintf("无效的 base64 字符串: %v", err)))
							}
						case "latin1", "binary":
							buf = make([]byte, len(dataStr))
							for i, r := range dataStr {
								if r > 255 {
									panic(runtime.NewTypeError(fmt.Sprintf("latin1 字符串包含非法字符: U+%04X", r)))
								}
								buf[i] = byte(r)
							}
						case "ascii":
							buf = make([]byte, len(dataStr))
							for i, r := range dataStr {
								if r > 127 {
									panic(runtime.NewTypeError(fmt.Sprintf("ascii 字符串包含非法字符: U+%04X", r)))
								}
								buf[i] = byte(r)
							}
						default:
							panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s", encoding)))
						}
					} else {
						buf, err = convertToBytes(runtime, call.Arguments[0])
						if err != nil {
							panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
						}
					}

					// 🔥 SHAKE 和标准 hash 都使用 Write
					if isShakeAlgo {
						newShake.Write(buf)
					} else {
						newHasher.Write(buf)
					}
					return call.This
				})

				// 为新对象设置 digest 方法
				newHashObj.Set("digest", func(call goja.FunctionCall) goja.Value {
					// 🔥 检查是否已经调用过 digest()
					if newDigested {
						panic(runtime.NewTypeError("Digest already called"))
					}
					newDigested = true // 标记为已 digest

					var sum []byte

					// 🔥 SHAKE 系列使用 Read() 方法
					if isShakeAlgo {
						sum = make([]byte, shakeOutputLen)
						_, err := newShake.Read(sum)
						if err != nil {
							panic(runtime.NewGoError(fmt.Errorf("SHAKE 读取输出失败: %w", err)))
						}
					} else {
						sum = newHasher.Sum(nil)
					}

					if len(call.Arguments) == 0 {
						return ce.createBuffer(runtime, sum)
					}

					encoding := strings.ToLower(call.Arguments[0].String())
					switch encoding {
					case "hex":
						return runtime.ToValue(hex.EncodeToString(sum))
					case "base64":
						return runtime.ToValue(base64.StdEncoding.EncodeToString(sum))
					case "latin1", "binary":
						runes := make([]rune, len(sum))
						for i, b := range sum {
							runes[i] = rune(b)
						}
						return runtime.ToValue(string(runes))
					default:
						panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s", encoding)))
					}
				})

				// 🔥 关键修复：新对象也需要支持 copy，使用工厂函数创建新的 copy 方法（传递新的 digested 指针）
				newHashObj.Set("copy", createCopyFunc(newHasher, newShake, algo, &newDigested, isShakeAlgo, shakeOutputLen))

				return newHashObj
			}
		}

		hashObj.Set("copy", createCopyFunc(hasher, shakeHash, algorithm, &digested, isShake, outputLength))

		return hashObj
	}

	cryptoObj.Set("createHash", createHash)
	return nil
}

// addCreateHmacMethod 添加createHmac方法
func (ce *CryptoEnhancer) addCreateHmacMethod(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	createHmac := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("createHmac 需要 algorithm 和 key 参数"))
		}

		// 🔥 修复：支持算法别名（sha-256 等）
		algorithm := normalizeHashAlgorithm(strings.ToLower(call.Arguments[0].String()))
		// 🔥 修复：key 支持二进制输入
		keyBytes, err := convertToBytes(runtime, call.Arguments[1])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("key 数据类型错误: %v", err)))
		}

		var hasher hash.Hash
		switch algorithm {
		case "md5":
			hasher = hmac.New(md5.New, keyBytes)
		case "sha1":
			hasher = hmac.New(sha1.New, keyBytes)
		case "sha224":
			hasher = hmac.New(sha256.New224, keyBytes)
		case "sha256":
			hasher = hmac.New(sha256.New, keyBytes)
		case "sha384":
			hasher = hmac.New(sha512.New384, keyBytes)
		case "sha512":
			hasher = hmac.New(sha512.New, keyBytes)
		// SHA-512 变体
		case "sha512224", "sha512/224":
			hasher = hmac.New(sha512.New512_224, keyBytes)
		case "sha512256", "sha512/256":
			hasher = hmac.New(sha512.New512_256, keyBytes)
		// SHA3 系列
		case "sha3224":
			hasher = hmac.New(sha3.New224, keyBytes)
		case "sha3256":
			hasher = hmac.New(sha3.New256, keyBytes)
		case "sha3384":
			hasher = hmac.New(sha3.New384, keyBytes)
		case "sha3512":
			hasher = hmac.New(sha3.New512, keyBytes)
		// BLAKE2 系列
		// 🔥 注意：BLAKE2 虽然有内置密钥支持，但 HMAC-BLAKE2 使用标准 HMAC 构造
		case "blake2b512":
			hasher = hmac.New(func() hash.Hash {
				h, _ := blake2b.New512(nil)
				return h
			}, keyBytes)
		case "blake2s256":
			hasher = hmac.New(func() hash.Hash {
				h, _ := blake2s.New256(nil)
				return h
			}, keyBytes)
		// SHAKE 系列不支持 HMAC（它们是可扩展输出函数，不是标准哈希）
		case "shake128", "shake256":
			panic(runtime.NewTypeError(fmt.Sprintf("SHAKE 算法不支持 HMAC")))
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("不支持的 HMAC 算法: %s", algorithm)))
		}

		// 创建Hmac对象
		hmacObj := runtime.NewObject()

		// 🔥 新增：跟踪 HMAC 对象是否已经 digest
		var digested bool

		// update方法
		// 🔥 修复：支持 Buffer/TypedArray/ArrayBuffer/DataView/字符串
		// 🔥 新增：支持 inputEncoding 参数（hex/base64/latin1/ascii/utf8）
		hmacObj.Set("update", func(call goja.FunctionCall) goja.Value {
			// 🔥 检查是否已经调用过 digest()
			if digested {
				panic(runtime.NewTypeError("Digest already called"))
			}

			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("update 需要 data 参数"))
			}

			var buf []byte
			var err error

			// 检查是否有 inputEncoding 参数
			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
				// 有 encoding 参数，data 必须是字符串
				dataStr := call.Arguments[0].String()
				encoding := strings.ToLower(call.Arguments[1].String())

				switch encoding {
				case "utf8", "utf-8":
					buf = []byte(dataStr)
				case "hex":
					buf, err = hex.DecodeString(dataStr)
					if err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("无效的 hex 字符串: %v", err)))
					}
				case "base64":
					buf, err = base64.StdEncoding.DecodeString(dataStr)
					if err != nil {
						panic(runtime.NewTypeError(fmt.Sprintf("无效的 base64 字符串: %v", err)))
					}
				case "latin1", "binary":
					// Latin1: 每个字符对应一个字节 (0-255)
					buf = make([]byte, len(dataStr))
					for i, r := range dataStr {
						if r > 255 {
							panic(runtime.NewTypeError(fmt.Sprintf("latin1 字符串包含非法字符: U+%04X", r)))
						}
						buf[i] = byte(r)
					}
				case "ascii":
					buf = make([]byte, len(dataStr))
					for i, r := range dataStr {
						if r > 127 {
							panic(runtime.NewTypeError(fmt.Sprintf("ascii 字符串包含非法字符: U+%04X", r)))
						}
						buf[i] = byte(r)
					}
				default:
					panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s (支持: utf8, hex, base64, latin1, binary, ascii)", encoding)))
				}
			} else {
				// 没有 encoding 参数，使用 convertToBytes
				buf, err = convertToBytes(runtime, call.Arguments[0])
				if err != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
				}
			}

			hasher.Write(buf)

			// 返回this以支持链式调用
			return call.This
		})

		// digest方法
		// 🔥 修复：默认返回 Buffer（与 Node.js 对齐）
		hmacObj.Set("digest", func(call goja.FunctionCall) goja.Value {
			// 🔥 检查是否已经调用过 digest()
			if digested {
				panic(runtime.NewTypeError("Digest already called"))
			}
			digested = true // 标记为已 digest

			sum := hasher.Sum(nil)

			// 如果未指定编码，返回 Buffer
			if len(call.Arguments) == 0 {
				return ce.createBuffer(runtime, sum)
			}

			encoding := strings.ToLower(call.Arguments[0].String())
			switch encoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(sum))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(sum))
			case "latin1", "binary":
				// 🔥 修复：latin1/binary 是单字节编码，每个字节对应一个字符
				// 不能直接用 string(sum)，因为 Go 会按 UTF-8 解释
				// 需要逐字节转换为 rune，确保 1 字节 = 1 字符
				runes := make([]rune, len(sum))
				for i, b := range sum {
					runes[i] = rune(b)
				}
				return runtime.ToValue(string(runes))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s (支持: hex, base64, latin1, binary)", encoding)))
			}
		})

		// copy方法
		// 🔥 新增：支持复制 HMAC 的中间状态
		// 🔥 Go 的 crypto/hmac 从 Go 1.17 开始支持 MarshalBinary/UnmarshalBinary
		// 但是接口是在内部实现的，需要使用 encoding 包的接口

		// 使用闭包工厂函数，类似 Hash
		var createHmacCopyFunc func(hash.Hash, string, []byte) func(goja.FunctionCall) goja.Value
		createHmacCopyFunc = func(currentHasher hash.Hash, algo string, key []byte) func(goja.FunctionCall) goja.Value {
			return func(call goja.FunctionCall) goja.Value {
				// 🔥 HMAC 的 copy 实现：
				// Go 1.17+ 的 crypto/hmac 实现了 encoding.BinaryMarshaler
				// 使用 encoding 包的接口进行类型断言

				// 创建新的 HMAC hasher
				var newHasher hash.Hash
				switch algo {
				case "md5":
					newHasher = hmac.New(md5.New, key)
				case "sha1":
					newHasher = hmac.New(sha1.New, key)
				case "sha224":
					newHasher = hmac.New(sha256.New224, key)
				case "sha256":
					newHasher = hmac.New(sha256.New, key)
				case "sha384":
					newHasher = hmac.New(sha512.New384, key)
				case "sha512":
					newHasher = hmac.New(sha512.New, key)
				default:
					panic(runtime.NewTypeError(fmt.Sprintf("不支持的 HMAC 算法: %s", algo)))
				}

				// 尝试使用 encoding.BinaryMarshaler 接口
				if marshaler, ok := currentHasher.(encoding.BinaryMarshaler); ok {
					state, err := marshaler.MarshalBinary()
					if err == nil {
						if unmarshaler, ok := newHasher.(encoding.BinaryUnmarshaler); ok {
							err = unmarshaler.UnmarshalBinary(state)
							if err == nil {
								// 成功复制状态
								goto createObject
							}
						}
					}
				}

				// 如果序列化失败，返回错误
				panic(runtime.NewTypeError("当前 Go 版本的 HMAC 不支持 copy()，请升级 Go 或使用替代方案"))

			createObject:
				// 创建新的 HMAC 对象
				newHmacObj := runtime.NewObject()

				newHmacObj.Set("update", func(call goja.FunctionCall) goja.Value {
					if len(call.Arguments) == 0 {
						panic(runtime.NewTypeError("update 需要 data 参数"))
					}

					var buf []byte
					var err error

					if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
						dataStr := call.Arguments[0].String()
						encoding := strings.ToLower(call.Arguments[1].String())

						switch encoding {
						case "utf8", "utf-8":
							buf = []byte(dataStr)
						case "hex":
							buf, err = hex.DecodeString(dataStr)
							if err != nil {
								panic(runtime.NewTypeError(fmt.Sprintf("无效的 hex 字符串: %v", err)))
							}
						case "base64":
							buf, err = base64.StdEncoding.DecodeString(dataStr)
							if err != nil {
								panic(runtime.NewTypeError(fmt.Sprintf("无效的 base64 字符串: %v", err)))
							}
						case "latin1", "binary":
							buf = make([]byte, len(dataStr))
							for i, r := range dataStr {
								if r > 255 {
									panic(runtime.NewTypeError(fmt.Sprintf("latin1 字符串包含非法字符: U+%04X", r)))
								}
								buf[i] = byte(r)
							}
						case "ascii":
							buf = make([]byte, len(dataStr))
							for i, r := range dataStr {
								if r > 127 {
									panic(runtime.NewTypeError(fmt.Sprintf("ascii 字符串包含非法字符: U+%04X", r)))
								}
								buf[i] = byte(r)
							}
						default:
							panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s", encoding)))
						}
					} else {
						buf, err = convertToBytes(runtime, call.Arguments[0])
						if err != nil {
							panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
						}
					}

					newHasher.Write(buf)
					return call.This
				})

				newHmacObj.Set("digest", func(call goja.FunctionCall) goja.Value {
					sum := newHasher.Sum(nil)

					if len(call.Arguments) == 0 {
						return ce.createBuffer(runtime, sum)
					}

					encoding := strings.ToLower(call.Arguments[0].String())
					switch encoding {
					case "hex":
						return runtime.ToValue(hex.EncodeToString(sum))
					case "base64":
						return runtime.ToValue(base64.StdEncoding.EncodeToString(sum))
					case "latin1", "binary":
						runes := make([]rune, len(sum))
						for i, b := range sum {
							runes[i] = rune(b)
						}
						return runtime.ToValue(string(runes))
					default:
						panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s", encoding)))
					}
				})

				// 🔥 关键修复：新对象也需要支持 copy，使用工厂函数
				newHmacObj.Set("copy", createHmacCopyFunc(newHasher, algo, key))

				return newHmacObj
			}
		}

		hmacObj.Set("copy", createHmacCopyFunc(hasher, algorithm, keyBytes))

		return hmacObj
	}

	cryptoObj.Set("createHmac", createHmac)
	return nil
}

// addRandomMethods 添加随机数生成方法
func (ce *CryptoEnhancer) addRandomMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// 🔥 重构：使用共享的 randomBytes 实现
	randomBytes := ce.createRandomBytesFunc(runtime)

	// 🔥 重构：使用共享的 randomUUID 实现
	randomUUID := createRandomUUIDFunc(runtime)

	// getRandomValues方法 (Node.js 兼容)
	// 🔥 规范：只支持整型 TypedArray，不支持 Float32Array/Float64Array/DataView
	getRandomValues := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("getRandomValues 需要一个类型化数组参数"))
		}

		arg := call.Arguments[0]
		obj, ok := arg.(*goja.Object)
		if !ok || obj == nil {
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		// 获取数组类型名称
		var typeName string
		if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj, ok := constructor.(*goja.Object); ok && constructorObj != nil {
				if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
					typeName = nameVal.String()
				}
			}
		}

		// 🔥 规范检查：只允许整型 TypedArray（Node.js 不支持 DataView）
		var bytesPerElement int
		var isValidType bool

		switch typeName {
		case "Int8Array", "Uint8Array", "Uint8ClampedArray":
			bytesPerElement = 1
			isValidType = true
		case "Int16Array", "Uint16Array":
			bytesPerElement = 2
			isValidType = true
		case "Int32Array", "Uint32Array":
			bytesPerElement = 4
			isValidType = true
		case "BigInt64Array", "BigUint64Array":
			bytesPerElement = 8
			isValidType = true
		case "DataView":
			// 🔥 Node.js 不支持 DataView（与浏览器 Web Crypto API 不同）
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		case "Float32Array", "Float64Array":
			// 🔥 规范：明确拒绝浮点数组（与 Node.js 一致）
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		case "Array":
			// 🔥 规范：明确拒绝普通数组
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		default:
			// 🔥 未知类型，直接拒绝
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		if !isValidType {
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		// 获取字节长度
		var byteLength int
		if byteLengthVal := obj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
			byteLength = int(byteLengthVal.ToInteger())
		} else if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			length := int(lengthVal.ToInteger())
			byteLength = length * bytesPerElement
		} else {
			panic(runtime.NewTypeError("无法确定数组大小"))
		}

		// 🔥 Web Crypto API 限制：最大 65536 字节
		if byteLength > MaxTypedArraySize {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The ArrayBufferView's byte length (%d) exceeds the number of bytes of entropy available via this API (65536)",
				byteLength)))
		}

		if byteLength == 0 {
			return arg // 空数组直接返回
		}

		// 生成随机字节
		randomBytes := make([]byte, byteLength)
		_, err := rand.Read(randomBytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
		}

		// 🔥 优化：直接填充底层 ArrayBuffer 的字节
		// 获取底层 buffer 和 byteOffset
		var buffer *goja.Object
		var byteOffset int

		if bufferVal := obj.Get("buffer"); bufferVal != nil && !goja.IsUndefined(bufferVal) && !goja.IsNull(bufferVal) {
			if bufferObj, ok := bufferVal.(*goja.Object); ok && bufferObj != nil {
				buffer = bufferObj
			}
		}

		if byteOffsetVal := obj.Get("byteOffset"); byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) && !goja.IsNull(byteOffsetVal) {
			byteOffset = int(byteOffsetVal.ToInteger())
		}

		// 如果有底层 buffer，尝试直接写入字节（更高效）
		if buffer != nil {
			// 通过 Uint8Array 视图写入字节
			uint8ArrayCtor := runtime.Get("Uint8Array")
			if uint8ArrayCtor != nil && !goja.IsUndefined(uint8ArrayCtor) {
				if ctorObj, ok := uint8ArrayCtor.(*goja.Object); ok && ctorObj != nil {
					// 创建 Uint8Array 视图：new Uint8Array(buffer, byteOffset, byteLength)
					view, viewErr := runtime.New(ctorObj, buffer, runtime.ToValue(byteOffset), runtime.ToValue(byteLength))
					if viewErr == nil {
						viewObj := view.ToObject(runtime)
						if viewObj != nil {
							// 逐字节写入
							for i := 0; i < byteLength; i++ {
								viewObj.Set(strconv.Itoa(i), runtime.ToValue(randomBytes[i]))
							}
							return arg
						}
					}
				}
			}
		}

		// 回退方案：直接设置元素值
		length := byteLength / bytesPerElement
		for i := 0; i < length; i++ {
			offset := i * bytesPerElement
			var value int64

			switch bytesPerElement {
			case 1:
				if typeName == "Int8Array" {
					value = int64(int8(randomBytes[offset]))
				} else {
					value = int64(randomBytes[offset])
				}
			case 2:
				if offset+1 < len(randomBytes) {
					val := uint16(randomBytes[offset]) | (uint16(randomBytes[offset+1]) << 8)
					if typeName == "Int16Array" {
						value = int64(int16(val))
					} else {
						value = int64(val)
					}
				}
			case 4:
				if offset+3 < len(randomBytes) {
					val := uint32(randomBytes[offset]) |
						(uint32(randomBytes[offset+1]) << 8) |
						(uint32(randomBytes[offset+2]) << 16) |
						(uint32(randomBytes[offset+3]) << 24)
					if typeName == "Int32Array" {
						value = int64(int32(val))
					} else {
						value = int64(val)
					}
				}
			case 8:
				if offset+7 < len(randomBytes) {
					val := uint64(randomBytes[offset]) |
						(uint64(randomBytes[offset+1]) << 8) |
						(uint64(randomBytes[offset+2]) << 16) |
						(uint64(randomBytes[offset+3]) << 24) |
						(uint64(randomBytes[offset+4]) << 32) |
						(uint64(randomBytes[offset+5]) << 40) |
						(uint64(randomBytes[offset+6]) << 48) |
						(uint64(randomBytes[offset+7]) << 56)
					if typeName == "BigInt64Array" {
						value = int64(val)
					} else {
						value = int64(val)
					}
				}
			}

			obj.Set(strconv.Itoa(i), runtime.ToValue(value))
		}

		return arg // 返回修改后的数组
	}

	// randomFillSync方法 (Node.js v7.10.0+)
	// 🔥 新增：同步填充 Buffer/TypedArray
	randomFillSync := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("randomFillSync 需要一个 buffer 参数"))
		}

		arg := call.Arguments[0]
		obj, ok := arg.(*goja.Object)
		if !ok || obj == nil {
			panic(runtime.NewTypeError("第一个参数必须是 Buffer 或 TypedArray"))
		}

		// 获取 offset 和 size 参数
		var offset, size int
		var byteLength int

		// 获取 buffer 的字节长度
		if byteLengthVal := obj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
			byteLength = int(byteLengthVal.ToInteger())
		} else if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			byteLength = int(lengthVal.ToInteger())
		} else {
			panic(runtime.NewTypeError("无法确定 buffer 大小"))
		}

		// 解析 offset 参数
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			offset = int(call.Arguments[1].ToInteger())
			if offset < 0 || offset > byteLength {
				panic(runtime.NewTypeError(fmt.Sprintf("offset 超出范围: %d (buffer 大小: %d)", offset, byteLength)))
			}
		}

		// 解析 size 参数
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
			size = int(call.Arguments[2].ToInteger())
			if size < 0 {
				panic(runtime.NewTypeError(fmt.Sprintf("size 不能为负数: %d", size)))
			}
			if offset+size > byteLength {
				panic(runtime.NewTypeError(fmt.Sprintf("offset + size 超出范围: %d + %d > %d", offset, size, byteLength)))
			}
		} else {
			size = byteLength - offset
		}

		if size == 0 {
			return arg // 不需要填充
		}

		// 生成随机字节
		randomBytes := make([]byte, size)
		_, err := rand.Read(randomBytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
		}

		// 填充到 buffer
		// 尝试通过 Uint8Array 视图写入
		var buffer *goja.Object
		var byteOffset int

		if bufferVal := obj.Get("buffer"); bufferVal != nil && !goja.IsUndefined(bufferVal) && !goja.IsNull(bufferVal) {
			if bufferObj, ok := bufferVal.(*goja.Object); ok && bufferObj != nil {
				buffer = bufferObj
			}
		}

		if byteOffsetVal := obj.Get("byteOffset"); byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) && !goja.IsNull(byteOffsetVal) {
			byteOffset = int(byteOffsetVal.ToInteger())
		}

		// 如果有底层 buffer，通过 Uint8Array 视图写入
		if buffer != nil {
			uint8ArrayCtor := runtime.Get("Uint8Array")
			if uint8ArrayCtor != nil && !goja.IsUndefined(uint8ArrayCtor) {
				if ctorObj, ok := uint8ArrayCtor.(*goja.Object); ok && ctorObj != nil {
					// 创建 Uint8Array 视图
					view, viewErr := runtime.New(ctorObj, buffer, runtime.ToValue(byteOffset+offset), runtime.ToValue(size))
					if viewErr == nil {
						viewObj := view.ToObject(runtime)
						if viewObj != nil {
							for i := 0; i < size; i++ {
								viewObj.Set(strconv.Itoa(i), runtime.ToValue(randomBytes[i]))
							}
							return arg
						}
					}
				}
			}
		}

		// 回退方案：直接设置元素
		for i := 0; i < size; i++ {
			obj.Set(strconv.Itoa(offset+i), runtime.ToValue(randomBytes[i]))
		}

		return arg
	}

	// randomFill方法 (Node.js v7.10.0+)
	// 🔥 新增：异步填充 Buffer/TypedArray
	randomFill := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("randomFill 需要 buffer 和 callback 参数"))
		}

		// 解析参数
		var buffer goja.Value
		var offset, size int
		var callback goja.Callable
		var hasOffset, hasSize bool

		buffer = call.Arguments[0]

		// 参数可能是：
		// randomFill(buffer, callback)
		// randomFill(buffer, offset, callback)
		// randomFill(buffer, offset, size, callback)

		lastArg := call.Arguments[len(call.Arguments)-1]
		if cbObj, ok := lastArg.(*goja.Object); ok {
			if cbFunc, ok := goja.AssertFunction(cbObj); ok {
				callback = cbFunc
			}
		}

		if callback == nil {
			panic(runtime.NewTypeError("最后一个参数必须是回调函数"))
		}

		// 解析 offset 和 size
		if len(call.Arguments) == 3 {
			// randomFill(buffer, offset, callback)
			offset = int(call.Arguments[1].ToInteger())
			hasOffset = true
		} else if len(call.Arguments) == 4 {
			// randomFill(buffer, offset, size, callback)
			offset = int(call.Arguments[1].ToInteger())
			size = int(call.Arguments[2].ToInteger())
			hasOffset = true
			hasSize = true
		}

		// 异步执行
		go func() {
			defer func() {
				if r := recover(); r != nil {
					// 调用回调并传递错误
					errMsg := fmt.Sprintf("%v", r)
					runtime.RunString(fmt.Sprintf(`
						(function() {
							var err = new Error(%q);
							callback(err);
						})()
					`, errMsg))
				}
			}()

			// 构建参数数组
			args := []goja.Value{buffer}
			if hasOffset {
				args = append(args, runtime.ToValue(offset))
			}
			if hasSize {
				args = append(args, runtime.ToValue(size))
			}

			// 调用 randomFillSync
			result := randomFillSync(goja.FunctionCall{
				This:      runtime.GlobalObject(),
				Arguments: args,
			})

			// 调用回调
			_, _ = callback(runtime.GlobalObject(), goja.Null(), result)
		}()

		return goja.Undefined()
	}

	// randomInt方法 (Node.js v14.10.0+)
	// 🔥 新增：生成安全的随机整数（避免取模偏差）
	randomInt := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("randomInt 需要至少一个参数"))
		}

		var min, max int64
		var callback goja.Callable

		// 解析参数
		// randomInt(max)
		// randomInt(max, callback)
		// randomInt(min, max)
		// randomInt(min, max, callback)

		if len(call.Arguments) == 1 {
			// randomInt(max)
			max = call.Arguments[0].ToInteger()
			min = 0
		} else if len(call.Arguments) == 2 {
			// 可能是 randomInt(max, callback) 或 randomInt(min, max)
			lastArg := call.Arguments[1]
			if cbObj, ok := lastArg.(*goja.Object); ok {
				if cbFunc, ok := goja.AssertFunction(cbObj); ok {
					callback = cbFunc
					max = call.Arguments[0].ToInteger()
					min = 0
				} else {
					// randomInt(min, max)
					min = call.Arguments[0].ToInteger()
					max = call.Arguments[1].ToInteger()
				}
			} else {
				// randomInt(min, max)
				min = call.Arguments[0].ToInteger()
				max = call.Arguments[1].ToInteger()
			}
		} else if len(call.Arguments) >= 3 {
			// randomInt(min, max, callback)
			min = call.Arguments[0].ToInteger()
			max = call.Arguments[1].ToInteger()
			lastArg := call.Arguments[2]
			if cbObj, ok := lastArg.(*goja.Object); ok {
				if cbFunc, ok := goja.AssertFunction(cbObj); ok {
					callback = cbFunc
				}
			}
		}

		// 验证范围
		if min >= max {
			panic(runtime.NewTypeError(fmt.Sprintf("min (%d) 必须小于 max (%d)", min, max)))
		}

		if max > (1 << 48) {
			panic(runtime.NewTypeError(fmt.Sprintf("max (%d) 超出安全范围 (2^48)", max)))
		}

		// 生成随机数的函数
		generateRandom := func() int64 {
			// 🔥 避免取模偏差（rejection sampling）
			rangeSize := uint64(max - min)

			// 计算需要的字节数
			var bytesNeeded int
			if rangeSize <= 0xFF {
				bytesNeeded = 1
			} else if rangeSize <= 0xFFFF {
				bytesNeeded = 2
			} else if rangeSize <= 0xFFFFFF {
				bytesNeeded = 3
			} else if rangeSize <= 0xFFFFFFFF {
				bytesNeeded = 4
			} else if rangeSize <= 0xFFFFFFFFFF {
				bytesNeeded = 5
			} else if rangeSize <= 0xFFFFFFFFFFFF {
				bytesNeeded = 6
			} else {
				bytesNeeded = 8
			}

			// 计算拒绝阈值（避免偏差）
			maxValid := ^uint64(0) - (^uint64(0) % rangeSize)

			for {
				randomBytes := make([]byte, bytesNeeded)
				_, err := rand.Read(randomBytes)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
				}

				// 转换为 uint64
				var randomValue uint64
				for i := 0; i < bytesNeeded; i++ {
					randomValue |= uint64(randomBytes[i]) << (i * 8)
				}

				// 拒绝超出阈值的值（避免取模偏差）
				if randomValue < maxValid {
					return min + int64(randomValue%rangeSize)
				}
				// 否则重新生成
			}
		}

		// 如果有回调，异步执行
		if callback != nil {
			go func() {
				defer func() {
					if r := recover(); r != nil {
						errMsg := fmt.Sprintf("%v", r)
						runtime.RunString(fmt.Sprintf(`
							(function() {
								var err = new Error(%q);
								callback(err);
							})()
						`, errMsg))
					}
				}()

				result := generateRandom()
				_, _ = callback(runtime.GlobalObject(), goja.Null(), runtime.ToValue(result))
			}()
			return goja.Undefined()
		}

		// 同步执行
		return runtime.ToValue(generateRandom())
	}

	cryptoObj.Set("randomBytes", randomBytes)
	cryptoObj.Set("randomUUID", randomUUID)
	cryptoObj.Set("getRandomValues", getRandomValues)
	cryptoObj.Set("randomFillSync", randomFillSync)
	cryptoObj.Set("randomFill", randomFill)
	cryptoObj.Set("randomInt", randomInt)

	return nil
}

// SetupCryptoEnvironment 在加载crypto-js之前设置必要的crypto环境
// 🔧 这是修复 "Native crypto module could not be used to get secure random number" 错误的关键
func (ce *CryptoEnhancer) SetupCryptoEnvironment(runtime *goja.Runtime) error {
	// 检查是否已经设置过crypto环境，避免重复设置
	if cryptoVal := runtime.Get("crypto"); cryptoVal != nil && !goja.IsUndefined(cryptoVal) {
		if cryptoObj, ok := cryptoVal.(*goja.Object); ok && cryptoObj != nil {
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
			panic(runtime.NewTypeError("randomBytes 需要 size 参数"))
		}

		size := int(call.Arguments[0].ToInteger())
		if size <= 0 || size > MaxRandomBytesSize {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"randomBytes 大小必须在 1 到 %d 字节之间", MaxRandomBytesSize)))
		}

		bytes := make([]byte, size)
		_, err := rand.Read(bytes)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成随机字节失败: %w", err)))
		}

		// 创建类似Node.js Buffer的对象，包含readInt32LE方法
		bufferObj := runtime.NewObject()
		bufferObj.Set("length", runtime.ToValue(size))

		// 设置索引访问
		for i, b := range bytes {
			bufferObj.Set(strconv.Itoa(i), runtime.ToValue(int(b)))
		}

		// 重要：添加readInt32LE方法，crypto-js会调用这个方法
		bufferObj.Set("readInt32LE", func(call goja.FunctionCall) goja.Value {
			offset := 0
			if len(call.Arguments) > 0 {
				offset = int(call.Arguments[0].ToInteger())
			}

			if offset < 0 || offset+4 > len(bytes) {
				panic(runtime.NewTypeError("readInt32LE 偏移量超出范围"))
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
				panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s", encoding)))
			}
		})

		// 🔥 新增：toJSON方法 - 用于 JSON.stringify() 序列化
		bufferObj.Set("toJSON", func(call goja.FunctionCall) goja.Value {
			result := runtime.NewObject()
			result.Set("type", runtime.ToValue("Buffer"))

			// 创建 data 数组
			dataArray := make([]interface{}, len(bytes))
			for i, b := range bytes {
				dataArray[i] = int(b)
			}
			result.Set("data", runtime.ToValue(dataArray))

			return result
		})

		// 🔥 添加 _isBuffer 标识
		bufferObj.Set("_isBuffer", runtime.ToValue(true))

		return bufferObj
	}

	// 添加 getRandomValues 方法 - crypto-js 也会检查这个方法（浏览器兼容）
	// 🔥 修复：严格遵循 Web Crypto API 规范，拒绝 Float32Array/Float64Array
	getRandomValues := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("getRandomValues 需要一个类型化数组参数"))
		}

		arg := call.Arguments[0]
		obj, ok := arg.(*goja.Object)
		if !ok || obj == nil {
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		// 获取数组类型名称
		var typeName string
		if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj, ok := constructor.(*goja.Object); ok && constructorObj != nil {
				if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
					typeName = nameVal.String()
				}
			}
		}

		// 🔥 规范检查：只允许整型 TypedArray（Node.js 不支持 DataView）
		var bytesPerElement int
		var isValidType bool

		switch typeName {
		case "Int8Array", "Uint8Array", "Uint8ClampedArray":
			bytesPerElement = 1
			isValidType = true
		case "Int16Array", "Uint16Array":
			bytesPerElement = 2
			isValidType = true
		case "Int32Array", "Uint32Array":
			bytesPerElement = 4
			isValidType = true
		case "BigInt64Array", "BigUint64Array":
			bytesPerElement = 8
			isValidType = true
		case "DataView":
			// 🔥 Node.js 不支持 DataView（与浏览器 Web Crypto API 不同）
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		case "Float32Array", "Float64Array":
			// 🔥 规范：明确拒绝浮点数组（与 Node.js 一致）
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		case "Array":
			// 🔥 规范：明确拒绝普通数组
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		default:
			// 🔥 未知类型，直接拒绝
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		if !isValidType {
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		// 获取字节长度
		var byteLength int
		if byteLengthVal := obj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
			byteLength = int(byteLengthVal.ToInteger())
		} else if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			length := int(lengthVal.ToInteger())
			byteLength = length * bytesPerElement
		} else {
			panic(runtime.NewTypeError("无法确定数组大小"))
		}

		// 🔥 Web Crypto API 限制：最大 65536 字节
		if byteLength > MaxTypedArraySize {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The ArrayBufferView's byte length (%d) exceeds the number of bytes of entropy available via this API (65536)",
				byteLength)))
		}

		if byteLength == 0 {
			return arg // 空数组直接返回
		}

		// 生成随机字节
		randomBytesData := make([]byte, byteLength)
		_, err := rand.Read(randomBytesData)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
		}

		// 填充数组
		length := byteLength / bytesPerElement
		for i := 0; i < length; i++ {
			offset := i * bytesPerElement
			var value int64

			switch bytesPerElement {
			case 1:
				if typeName == "Int8Array" {
					value = int64(int8(randomBytesData[offset]))
				} else {
					value = int64(randomBytesData[offset])
				}
			case 2:
				if offset+1 < len(randomBytesData) {
					val := uint16(randomBytesData[offset]) | (uint16(randomBytesData[offset+1]) << 8)
					if typeName == "Int16Array" {
						value = int64(int16(val))
					} else {
						value = int64(val)
					}
				}
			case 4:
				if offset+3 < len(randomBytesData) {
					val := uint32(randomBytesData[offset]) |
						(uint32(randomBytesData[offset+1]) << 8) |
						(uint32(randomBytesData[offset+2]) << 16) |
						(uint32(randomBytesData[offset+3]) << 24)
					if typeName == "Int32Array" {
						value = int64(int32(val))
					} else {
						value = int64(val)
					}
				}
			case 8:
				if offset+7 < len(randomBytesData) {
					val := uint64(randomBytesData[offset]) |
						(uint64(randomBytesData[offset+1]) << 8) |
						(uint64(randomBytesData[offset+2]) << 16) |
						(uint64(randomBytesData[offset+3]) << 24) |
						(uint64(randomBytesData[offset+4]) << 32) |
						(uint64(randomBytesData[offset+5]) << 40) |
						(uint64(randomBytesData[offset+6]) << 48) |
						(uint64(randomBytesData[offset+7]) << 56)
					if typeName == "BigInt64Array" {
						value = int64(val)
					} else {
						value = int64(val)
					}
				}
			}

			obj.Set(strconv.Itoa(i), runtime.ToValue(value))
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
		utils.Debug("从嵌入式文件加载 crypto-js")
	} else {
		// 回退到文件系统加载（用于开发环境）
		loadSource = fmt.Sprintf("外部文件: %s", ce.cryptoJSPath)
		utils.Debug("Loading crypto-js from file", zap.String("path", ce.cryptoJSPath))

		data, err := os.ReadFile(ce.cryptoJSPath)
		if err != nil {
			return "", fmt.Errorf("无法读取crypto-js文件 %s: %w", ce.cryptoJSPath, err)
		}
		cryptoJSContent = string(data)
	}

	utils.Debug("crypto-js loaded successfully (cached)",
		zap.Int("size_bytes", len(cryptoJSContent)), zap.String("source", loadSource))

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
			utils.Error("获取 crypto-js 代码失败", zap.Error(err))
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
		utils.Debug("Compiling crypto-js to goja.Program (one-time initialization)", zap.Int("size_bytes", len(cryptoJSCode)))
		program, err := goja.Compile("crypto-js.min.js", wrappedCode, true)
		if err != nil {
			ce.compileErr = fmt.Errorf("编译crypto-js失败: %w", err)
			utils.Error("编译 crypto-js 失败", zap.Error(err))
			return
		}

		utils.Debug("crypto-js compiled and cached successfully (one-time, zero overhead for future requests)")

		// 缓存编译后的程序
		ce.compiledProgram = program
		ce.compileErr = nil
	})

	// 返回编译结果或错误
	return ce.compiledProgram, ce.compileErr
}

// PrecompileCryptoJS 预编译 crypto-js（用于启动时预热）
// 🔥 主动触发编译，确保在服务启动时发现问题（Fail Fast）
func (ce *CryptoEnhancer) PrecompileCryptoJS() error {
	_, err := ce.getCompiledProgram()
	return err
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
// 🔥 重构：使用共享实现，避免代码重复
func (ce *CryptoEnhancer) addNativeRandomBytes(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("randomBytes", ce.createRandomBytesFunc(runtime))
	return nil
}

// addNativeRandomUUID 添加Go原生的randomUUID实现
// 🔥 重构：使用共享实现，避免代码重复
func (ce *CryptoEnhancer) addNativeRandomUUID(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	cryptoObj.Set("randomUUID", createRandomUUIDFunc(runtime))
	return nil
}

// addNativeGetRandomValues 添加Go原生的getRandomValues实现
// 🔥 修复：严格遵循 Node.js 规范，拒绝 Float32Array/Float64Array/DataView
func (ce *CryptoEnhancer) addNativeGetRandomValues(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	getRandomValues := func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("getRandomValues 需要一个类型化数组参数"))
		}

		arg := call.Arguments[0]
		obj, ok := arg.(*goja.Object)
		if !ok || obj == nil {
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		// 获取数组类型名称
		var typeName string
		if constructor := obj.Get("constructor"); !goja.IsUndefined(constructor) {
			if constructorObj, ok := constructor.(*goja.Object); ok && constructorObj != nil {
				if nameVal := constructorObj.Get("name"); !goja.IsUndefined(nameVal) {
					typeName = nameVal.String()
				}
			}
		}

		// 🔥 规范检查：只允许整型 TypedArray（Node.js 不支持 DataView）
		var bytesPerElement int
		var isValidType bool

		switch typeName {
		case "Int8Array", "Uint8Array", "Uint8ClampedArray":
			bytesPerElement = 1
			isValidType = true
		case "Int16Array", "Uint16Array":
			bytesPerElement = 2
			isValidType = true
		case "Int32Array", "Uint32Array":
			bytesPerElement = 4
			isValidType = true
		case "BigInt64Array", "BigUint64Array":
			bytesPerElement = 8
			isValidType = true
		case "DataView":
			// 🔥 Node.js 不支持 DataView（与浏览器 Web Crypto API 不同）
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		case "Float32Array", "Float64Array":
			// 🔥 规范：明确拒绝浮点数组（与 Node.js 一致）
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		case "Array":
			// 🔥 规范：明确拒绝普通数组
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		default:
			// 🔥 未知类型，直接拒绝
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		if !isValidType {
			panic(runtime.NewTypeError("The data argument must be an integer-type TypedArray"))
		}

		// 获取字节长度
		var byteLength int
		if byteLengthVal := obj.Get("byteLength"); byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {
			byteLength = int(byteLengthVal.ToInteger())
		} else if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			length := int(lengthVal.ToInteger())
			byteLength = length * bytesPerElement
		} else {
			panic(runtime.NewTypeError("无法确定数组大小"))
		}

		// 🔥 Web Crypto API 限制：最大 65536 字节
		if byteLength > MaxTypedArraySize {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"The ArrayBufferView's byte length (%d) exceeds the number of bytes of entropy available via this API (65536)",
				byteLength)))
		}

		if byteLength == 0 {
			return arg
		}

		// 生成随机字节
		randomBytesData := make([]byte, byteLength)
		_, err := rand.Read(randomBytesData)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("生成随机数失败: %w", err)))
		}

		// 填充数组
		length := byteLength / bytesPerElement
		for i := 0; i < length; i++ {
			offset := i * bytesPerElement
			var value int64

			switch bytesPerElement {
			case 1:
				if typeName == "Int8Array" {
					value = int64(int8(randomBytesData[offset]))
				} else {
					value = int64(randomBytesData[offset])
				}
			case 2:
				if offset+1 < len(randomBytesData) {
					val := uint16(randomBytesData[offset]) | (uint16(randomBytesData[offset+1]) << 8)
					if typeName == "Int16Array" {
						value = int64(int16(val))
					} else {
						value = int64(val)
					}
				}
			case 4:
				if offset+3 < len(randomBytesData) {
					val := uint32(randomBytesData[offset]) |
						(uint32(randomBytesData[offset+1]) << 8) |
						(uint32(randomBytesData[offset+2]) << 16) |
						(uint32(randomBytesData[offset+3]) << 24)
					if typeName == "Int32Array" {
						value = int64(int32(val))
					} else {
						value = int64(val)
					}
				}
			case 8:
				if offset+7 < len(randomBytesData) {
					val := uint64(randomBytesData[offset]) |
						(uint64(randomBytesData[offset+1]) << 8) |
						(uint64(randomBytesData[offset+2]) << 16) |
						(uint64(randomBytesData[offset+3]) << 24) |
						(uint64(randomBytesData[offset+4]) << 32) |
						(uint64(randomBytesData[offset+5]) << 40) |
						(uint64(randomBytesData[offset+6]) << 48) |
						(uint64(randomBytesData[offset+7]) << 56)
					if typeName == "BigInt64Array" {
						value = int64(val)
					} else {
						value = int64(val)
					}
				}
			}

			obj.Set(strconv.Itoa(i), runtime.ToValue(value))
		}

		return arg
	}

	cryptoObj.Set("getRandomValues", getRandomValues)
	return nil
}

// ============ RSA 实现 ============

// ============ JWK (JSON Web Key) 支持 ============
// 🔥 P2 新增：JWK 格式导入导出（Node.js 18+ / Web Crypto API 兼容）

// rsaPublicKeyToJWK 将 RSA 公钥转换为 JWK 格式
func rsaPublicKeyToJWK(pub *rsa.PublicKey) map[string]interface{} {
	// base64url 编码（无 padding）
	n := base64.RawURLEncoding.EncodeToString(pub.N.Bytes())
	e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes())

	return map[string]interface{}{
		"kty": "RSA",
		"n":   n,
		"e":   e,
	}
}

// rsaPrivateKeyToJWK 将 RSA 私钥转换为 JWK 格式
func rsaPrivateKeyToJWK(priv *rsa.PrivateKey) map[string]interface{} {
	// 公钥部分
	jwk := rsaPublicKeyToJWK(&priv.PublicKey)

	// 🔥 修复：确保 CRT 参数已预计算
	if priv.Precomputed.Dp == nil || priv.Precomputed.Dq == nil || priv.Precomputed.Qinv == nil {
		priv.Precompute()
	}

	// 私钥部分（base64url 编码，无 padding）
	jwk["d"] = base64.RawURLEncoding.EncodeToString(priv.D.Bytes())
	jwk["p"] = base64.RawURLEncoding.EncodeToString(priv.Primes[0].Bytes())
	jwk["q"] = base64.RawURLEncoding.EncodeToString(priv.Primes[1].Bytes())
	jwk["dp"] = base64.RawURLEncoding.EncodeToString(priv.Precomputed.Dp.Bytes())
	jwk["dq"] = base64.RawURLEncoding.EncodeToString(priv.Precomputed.Dq.Bytes())
	jwk["qi"] = base64.RawURLEncoding.EncodeToString(priv.Precomputed.Qinv.Bytes())

	return jwk
}

// jwkToRSAPublicKey 从 JWK 格式转换为 RSA 公钥
func jwkToRSAPublicKey(jwk map[string]interface{}) (*rsa.PublicKey, error) {
	// 验证 kty
	kty, ok := jwk["kty"].(string)
	if !ok || kty != "RSA" {
		return nil, fmt.Errorf("JWK kty 必须是 'RSA'")
	}

	// 解析 n (modulus)
	nStr, ok := jwk["n"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'n' 字段")
	}
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'n' 失败: %w", err)
	}
	n := new(big.Int).SetBytes(nBytes)

	// 解析 e (exponent)
	eStr, ok := jwk["e"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'e' 字段")
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'e' 失败: %w", err)
	}
	e := new(big.Int).SetBytes(eBytes)

	return &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}, nil
}

// jwkToRSAPrivateKey 从 JWK 格式转换为 RSA 私钥
func jwkToRSAPrivateKey(jwk map[string]interface{}) (*rsa.PrivateKey, error) {
	// 先解析公钥部分
	pub, err := jwkToRSAPublicKey(jwk)
	if err != nil {
		return nil, err
	}

	priv := &rsa.PrivateKey{
		PublicKey: *pub,
	}

	// 解析 d (private exponent)
	dStr, ok := jwk["d"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'd' 字段（私钥）")
	}
	dBytes, err := base64.RawURLEncoding.DecodeString(dStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'd' 失败: %w", err)
	}
	priv.D = new(big.Int).SetBytes(dBytes)

	// 解析 p 和 q (primes)
	pStr, ok := jwk["p"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'p' 字段")
	}
	pBytes, err := base64.RawURLEncoding.DecodeString(pStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'p' 失败: %w", err)
	}

	qStr, ok := jwk["q"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'q' 字段")
	}
	qBytes, err := base64.RawURLEncoding.DecodeString(qStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'q' 失败: %w", err)
	}

	priv.Primes = []*big.Int{
		new(big.Int).SetBytes(pBytes),
		new(big.Int).SetBytes(qBytes),
	}

	// 解析 CRT 参数（可选，如果没有则重新计算）
	if dpStr, ok := jwk["dp"].(string); ok {
		dpBytes, _ := base64.RawURLEncoding.DecodeString(dpStr)
		priv.Precomputed.Dp = new(big.Int).SetBytes(dpBytes)
	}
	if dqStr, ok := jwk["dq"].(string); ok {
		dqBytes, _ := base64.RawURLEncoding.DecodeString(dqStr)
		priv.Precomputed.Dq = new(big.Int).SetBytes(dqBytes)
	}
	if qiStr, ok := jwk["qi"].(string); ok {
		qiBytes, _ := base64.RawURLEncoding.DecodeString(qiStr)
		priv.Precomputed.Qinv = new(big.Int).SetBytes(qiBytes)
	}

	// 预计算（如果 CRT 参数不完整）
	priv.Precompute()

	// 验证密钥
	if err := priv.Validate(); err != nil {
		return nil, fmt.Errorf("JWK 密钥验证失败: %w", err)
	}

	return priv, nil
}

// generateRSAKeyWithExponent 生成指定公钥指数的RSA密钥
// 🔥 P1 新增：支持自定义 publicExponent（如 3）
// Go 标准库的 rsa.GenerateKey 固定使用 65537，需要手动实现
func generateRSAKeyWithExponent(random io.Reader, bits int, exponent int) (*rsa.PrivateKey, error) {
	// 参数验证
	if bits < 512 {
		return nil, fmt.Errorf("密钥长度太短")
	}
	if exponent < 3 || exponent&1 == 0 {
		return nil, fmt.Errorf("公钥指数必须是大于2的奇数")
	}

	priv := new(rsa.PrivateKey)
	priv.PublicKey.E = exponent // 🔥 修复：初始化公钥的E（rsa.PrivateKey没有E字段）

	// 生成两个大素数 p 和 q
	for {
		var err error
		priv.Primes = make([]*big.Int, 2)

		// 生成 p 和 q，确保 (p-1) 和 (q-1) 与 e 互质
		for i := 0; i < 2; i++ {
			for {
				priv.Primes[i], err = rand.Prime(random, bits/2)
				if err != nil {
					return nil, err
				}

				// 检查 gcd(p-1, e) = 1 和 gcd(q-1, e) = 1
				pminus1 := new(big.Int).Sub(priv.Primes[i], big.NewInt(1))
				gcd := new(big.Int).GCD(nil, nil, pminus1, big.NewInt(int64(exponent)))
				if gcd.Cmp(big.NewInt(1)) == 0 {
					break // 找到合适的素数
				}
			}
		}

		// 🔥 修复：防御性检查，确保 p != q（与 OpenSSL/Node 对齐）
		if priv.Primes[0].Cmp(priv.Primes[1]) == 0 {
			continue // 重新生成
		}

		// 计算 n = p * q
		priv.N = new(big.Int).Mul(priv.Primes[0], priv.Primes[1])
		priv.PublicKey.N = priv.N // 🔥 修复：同步公钥的N

		// 检查模长是否正确
		if priv.N.BitLen() == bits {
			break
		}
		// 如果不对，重新生成
	}

	// 计算 φ(n) = (p-1)(q-1)
	p := priv.Primes[0]
	q := priv.Primes[1]
	pminus1 := new(big.Int).Sub(p, big.NewInt(1))
	qminus1 := new(big.Int).Sub(q, big.NewInt(1))
	phi := new(big.Int).Mul(pminus1, qminus1)

	// 计算私钥指数 d = e^(-1) mod φ(n)
	e := big.NewInt(int64(exponent))
	priv.D = new(big.Int).ModInverse(e, phi)
	if priv.D == nil {
		return nil, fmt.Errorf("无法计算私钥指数")
	}

	// 预计算 CRT 参数
	priv.Precomputed.Dp = new(big.Int).Mod(priv.D, pminus1)
	priv.Precomputed.Dq = new(big.Int).Mod(priv.D, qminus1)
	priv.Precomputed.Qinv = new(big.Int).ModInverse(q, p)

	// 设置 CRT 值（用于加速）
	priv.Precompute()

	return priv, nil
}

// addCryptoConstants 添加crypto.constants常量
func (ce *CryptoEnhancer) addCryptoConstants(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	constants := runtime.NewObject()

	// RSA padding 常量 (Node.js 18+ 完整兼容)
	constants.Set("RSA_NO_PADDING", 3)         // 不使用填充
	constants.Set("RSA_PKCS1_PADDING", 1)      // PKCS#1 v1.5 填充
	constants.Set("RSA_PKCS1_OAEP_PADDING", 4) // OAEP 填充
	constants.Set("RSA_PKCS1_PSS_PADDING", 6)  // PSS 填充 (仅用于签名)
	constants.Set("RSA_X931_PADDING", 5)       // X9.31 填充 (Node.js 常量，但 RSA 原语不使用)

	// RSA PSS saltLength 常量 (Node.js 18+)
	constants.Set("RSA_PSS_SALTLEN_DIGEST", -1)   // 使用摘要长度作为salt长度
	constants.Set("RSA_PSS_SALTLEN_MAX_SIGN", -2) // 签名时使用最大salt长度
	constants.Set("RSA_PSS_SALTLEN_AUTO", -2)     // 🔥 自动（verify 时 AUTO；数值与 MAX_SIGN 相同）

	cryptoObj.Set("constants", constants)
	return nil
}

// addHelperMethods 添加辅助方法 (Node.js 18+ 兼容)
func (ce *CryptoEnhancer) addHelperMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// crypto.getHashes() - 返回支持的哈希算法列表
	cryptoObj.Set("getHashes", func(call goja.FunctionCall) goja.Value {
		hashes := []string{
			// 基础算法
			"md5",
			"sha1",
			"sha224",
			"sha256",
			"sha384",
			"sha512",
			// SHA-512 变体
			"sha512-224",
			"sha512-256",
			// SHA3 系列
			"sha3-224",
			"sha3-256",
			"sha3-384",
			"sha3-512",
			// SHAKE 系列
			"shake128",
			"shake256",
			// BLAKE2 系列
			"blake2b512",
			"blake2s256",
			// RSA 别名
			"RSA-MD5",
			"RSA-SHA1",
			"RSA-SHA224",
			"RSA-SHA256",
			"RSA-SHA384",
			"RSA-SHA512",
			"RSA-SHA512/224",
			"RSA-SHA512/256",
			"RSA-SHA3-224",
			"RSA-SHA3-256",
			"RSA-SHA3-384",
			"RSA-SHA3-512",
		}
		return runtime.ToValue(hashes)
	})

	// crypto.getCiphers() - 返回支持的加密算法列表
	cryptoObj.Set("getCiphers", func(call goja.FunctionCall) goja.Value {
		// 目前主要通过 crypto-js 支持，这里返回常见的算法
		ciphers := []string{
			"aes-128-cbc",
			"aes-192-cbc",
			"aes-256-cbc",
			"aes-128-ecb",
			"aes-192-ecb",
			"aes-256-ecb",
			"des-ede3-cbc",
		}
		return runtime.ToValue(ciphers)
	})

	// crypto.getCurves() - 返回支持的椭圆曲线列表
	cryptoObj.Set("getCurves", func(call goja.FunctionCall) goja.Value {
		// Go 标准库支持的椭圆曲线
		curves := []string{
			"secp256k1",
			"prime256v1", // P-256
			"secp384r1",  // P-384
			"secp521r1",  // P-521
		}
		return runtime.ToValue(curves)
	})

	// crypto.timingSafeEqual(a, b) - 常量时间比较（防止时序攻击）
	// 🔥 安全关键：用于比较密码、HMAC、签名等敏感数据
	cryptoObj.Set("timingSafeEqual", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("timingSafeEqual 需要两个参数"))
		}

		// 🔥 Node.js 行为：不接受字符串，只接受 Buffer/TypedArray/ArrayBuffer/DataView
		// 先检查参数类型，拒绝字符串
		arg0 := call.Arguments[0]
		arg1 := call.Arguments[1]

		// 检查第一个参数是否是字符串
		if arg0Type := arg0.ExportType(); arg0Type != nil && arg0Type.Kind().String() == "string" {
			panic(runtime.NewTypeError("The \"a\" argument must be an instance of Buffer, TypedArray, or DataView. Received type string"))
		}

		// 检查第二个参数是否是字符串
		if arg1Type := arg1.ExportType(); arg1Type != nil && arg1Type.Kind().String() == "string" {
			panic(runtime.NewTypeError("The \"b\" argument must be an instance of Buffer, TypedArray, or DataView. Received type string"))
		}

		// 获取两个参数并转换为字节数组
		a, errA := convertToBytes(runtime, arg0)
		if errA != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("第一个参数类型错误: %v (必须是 Buffer、TypedArray、ArrayBuffer 或 DataView)", errA)))
		}

		b, errB := convertToBytes(runtime, arg1)
		if errB != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("第二个参数类型错误: %v (必须是 Buffer、TypedArray、ArrayBuffer 或 DataView)", errB)))
		}

		// 🔥 Node.js 行为：长度不同直接抛错（不是返回 false）
		if len(a) != len(b) {
			panic(runtime.NewTypeError(fmt.Sprintf(
				"Input buffers must have the same byte length (a: %d, b: %d)",
				len(a), len(b))))
		}

		// 🔥 使用 Go 的 crypto/subtle.ConstantTimeCompare 进行常量时间比较
		// 返回 1 表示相等，0 表示不相等
		result := subtle.ConstantTimeCompare(a, b) == 1

		return runtime.ToValue(result)
	})

	return nil
}

// addBufferSupport 添加全局 Buffer 对象支持（Node.js 18+ 兼容）
func (ce *CryptoEnhancer) addBufferSupport(runtime *goja.Runtime) error {
	// 获取或创建全局 Buffer 对象
	bufferVal := runtime.Get("Buffer")
	var bufferObj *goja.Object

	if bufferVal == nil || goja.IsUndefined(bufferVal) || goja.IsNull(bufferVal) {
		bufferObj = runtime.NewObject()
		runtime.Set("Buffer", bufferObj)
	} else {
		if obj, ok := bufferVal.(*goja.Object); ok {
			bufferObj = obj
		} else {
			// Buffer 已存在但不是对象，创建新的
			bufferObj = runtime.NewObject()
			runtime.Set("Buffer", bufferObj)
		}
	}

	// 添加 Buffer.isBuffer() 方法
	bufferObj.Set("isBuffer", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) > 0 {
			if obj, ok := call.Arguments[0].(*goja.Object); ok {
				if isBufferVal := obj.Get("_isBuffer"); !goja.IsUndefined(isBufferVal) {
					return isBufferVal
				}
			}
		}
		return runtime.ToValue(false)
	})

	return nil
}

// addRSAMethods 添加RSA相关方法
func (ce *CryptoEnhancer) addRSAMethods(runtime *goja.Runtime, cryptoObj *goja.Object) error {
	// generateKeyPair (异步版本，带回调)
	cryptoObj.Set("generateKeyPair", func(call goja.FunctionCall) goja.Value {
		return ce.generateKeyPair(runtime, call)
	})

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

	// privateEncrypt (Node.js 18+ 完整兼容)
	cryptoObj.Set("privateEncrypt", func(call goja.FunctionCall) goja.Value {
		return ce.privateEncrypt(runtime, call)
	})

	// publicDecrypt (Node.js 18+ 完整兼容)
	cryptoObj.Set("publicDecrypt", func(call goja.FunctionCall) goja.Value {
		return ce.publicDecrypt(runtime, call)
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

	// createPublicKey (Node.js 18+ KeyObject API)
	cryptoObj.Set("createPublicKey", func(call goja.FunctionCall) goja.Value {
		return ce.createPublicKey(runtime, call)
	})

	// createPrivateKey (Node.js 18+ KeyObject API)
	cryptoObj.Set("createPrivateKey", func(call goja.FunctionCall) goja.Value {
		return ce.createPrivateKey(runtime, call)
	})

	return nil
}

// generateKeyPair 生成RSA密钥对 (异步版本，带回调)
// 用法: crypto.generateKeyPair('rsa', options, (err, publicKey, privateKey) => {...})
func (ce *CryptoEnhancer) generateKeyPair(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("generateKeyPair 需要 type、options 和 callback 参数"))
	}

	// 获取回调函数（最后一个参数）
	callbackArg := call.Arguments[len(call.Arguments)-1]
	callback, ok := goja.AssertFunction(callbackArg)
	if !ok {
		panic(runtime.NewTypeError("最后一个参数必须是回调函数"))
	}

	// 使用 defer 捕获 panic 并通过回调返回错误
	defer func() {
		if r := recover(); r != nil {
			var errMsg string
			switch v := r.(type) {
			case error:
				errMsg = v.Error()
			case string:
				errMsg = v
			default:
				errMsg = fmt.Sprintf("%v", v)
			}

			// 调用回调: callback(err, null, null)
			errObj := runtime.NewGoError(fmt.Errorf("%s", errMsg))
			callback(goja.Undefined(), errObj, goja.Null(), goja.Null())
		}
	}()

	// 构造调用参数（去掉最后的回调函数）
	syncCall := goja.FunctionCall{
		This:      call.This,
		Arguments: call.Arguments[:len(call.Arguments)-1],
	}

	// 调用同步版本生成密钥
	result := ce.generateKeyPairSync(runtime, syncCall)

	// 获取结果对象
	resultObj, ok := result.(*goja.Object)
	if !ok {
		panic(runtime.NewTypeError("generateKeyPairSync 返回值格式错误"))
	}

	publicKey := resultObj.Get("publicKey")
	privateKey := resultObj.Get("privateKey")

	// 调用回调: callback(null, publicKey, privateKey)
	callback(goja.Undefined(), goja.Null(), publicKey, privateKey)

	return goja.Undefined()
}

// generateKeyPairSync 生成RSA密钥对 (完全兼容 Node.js 18+)
func (ce *CryptoEnhancer) generateKeyPairSync(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("generateKeyPairSync 需要 type 和 options 参数"))
	}

	keyType := call.Arguments[0].String()
	if keyType != "rsa" {
		panic(runtime.NewTypeError("仅支持 'rsa' 密钥类型"))
	}

	// 解析选项 - 安全地处理
	var options *goja.Object
	if len(call.Arguments) > 1 {
		if opt, ok := call.Arguments[1].(*goja.Object); ok && opt != nil {
			options = opt
		} else {
			panic(runtime.NewTypeError("generateKeyPairSync 的 options 参数必须是对象"))
		}
	} else {
		panic(runtime.NewTypeError("generateKeyPairSync 需要 options 参数"))
	}

	modulusLength := 2048 // 默认2048位
	if val := options.Get("modulusLength"); val != nil && !goja.IsUndefined(val) {
		modulusLength = int(val.ToInteger())
	}

	// 🔥 P1 新增：支持 publicExponent 选项（Node.js 18+ 兼容）
	publicExponent := 65537 // 默认 0x10001 (65537)
	if val := options.Get("publicExponent"); val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
		publicExponent = int(val.ToInteger())
		// 🔥 修复：验证必须是 >=3 的奇数（与 Node.js 行为一致）
		if publicExponent < 3 || publicExponent%2 == 0 {
			panic(runtime.NewTypeError(fmt.Sprintf("publicExponent 必须是大于等于 3 的奇数，当前值: %d", publicExponent)))
		}
	}

	// 验证密钥长度（Node.js 兼容：支持常见的密钥长度）
	// Node.js 支持任意合理的密钥长度，这里允许 512-8192 位，且必须是 8 的倍数
	if modulusLength < 512 || modulusLength > 8192 {
		panic(runtime.NewTypeError(fmt.Sprintf("modulusLength 必须在 512-8192 之间，当前值: %d", modulusLength)))
	}
	if modulusLength%8 != 0 {
		panic(runtime.NewTypeError(fmt.Sprintf("modulusLength 必须是 8 的倍数，当前值: %d", modulusLength)))
	}

	// 🔥 Node.js 18+ 行为：检查是否指定了 encoding
	// 如果没有指定 encoding，返回 KeyObject；如果指定了，返回字符串或 Buffer
	pubEnc := options.Get("publicKeyEncoding")
	privEnc := options.Get("privateKeyEncoding")

	hasPublicEncoding := pubEnc != nil && !goja.IsUndefined(pubEnc) && !goja.IsNull(pubEnc)
	hasPrivateEncoding := privEnc != nil && !goja.IsUndefined(privEnc) && !goja.IsNull(privEnc)

	// 🔥 严格验证：publicKeyEncoding 和 privateKeyEncoding 必须是对象，不能是数组
	if hasPublicEncoding {
		if _, ok := pubEnc.(*goja.Object); !ok {
			panic(runtime.NewTypeError("publicKeyEncoding 必须是对象"))
		}
		// 检查是否是数组（通过检查是否有数字索引）
		if pubEncObj, ok := pubEnc.(*goja.Object); ok && pubEncObj != nil {
			lengthVal := pubEncObj.Get("length")
			if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
				// 有 length 属性，可能是数组
				if lengthVal.ToInteger() > 0 {
					panic(runtime.NewTypeError("The \"publicKeyEncoding\" argument must be of type object. Received an instance of Array"))
				}
			}
		}
	}

	if hasPrivateEncoding {
		if _, ok := privEnc.(*goja.Object); !ok {
			panic(runtime.NewTypeError("privateKeyEncoding 必须是对象"))
		}
		// 检查是否是数组
		if privEncObj, ok := privEnc.(*goja.Object); ok && privEncObj != nil {
			lengthVal := privEncObj.Get("length")
			if lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
				if lengthVal.ToInteger() > 0 {
					panic(runtime.NewTypeError("The \"privateKeyEncoding\" argument must be of type object. Received an instance of Array"))
				}
			}
		}
	}

	// 解析 publicKeyEncoding (Node.js 18 标准) - 使用最安全的方式
	publicKeyType := "spki"  // 默认 spki
	publicKeyFormat := "pem" // 默认 pem
	if hasPublicEncoding {
		if pubEncObj, ok := pubEnc.(*goja.Object); ok && pubEncObj != nil {
			if typeVal := pubEncObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
				if typeStr := typeVal.Export(); typeStr != nil {
					publicKeyType = fmt.Sprintf("%v", typeStr)
				}
			}
			if formatVal := pubEncObj.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
				if formatStr := formatVal.Export(); formatStr != nil {
					publicKeyFormat = fmt.Sprintf("%v", formatStr)
				}
			}
		}
	}

	// 解析 privateKeyEncoding (Node.js 18 标准，默认 pkcs8) - 使用最安全的方式
	privateKeyType := "pkcs8" // Node.js 18 默认 pkcs8
	privateKeyFormat := "pem" // 默认 pem
	var cipher string         // 加密算法（可选）
	var passphrase string     // 密码（可选）

	if hasPrivateEncoding {
		if privEncObj, ok := privEnc.(*goja.Object); ok && privEncObj != nil {
			if typeVal := privEncObj.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
				if typeStr := typeVal.Export(); typeStr != nil {
					privateKeyType = fmt.Sprintf("%v", typeStr)
				}
			}
			if formatVal := privEncObj.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
				if formatStr := formatVal.Export(); formatStr != nil {
					privateKeyFormat = fmt.Sprintf("%v", formatStr)
				}
			}
			if cipherVal := privEncObj.Get("cipher"); cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal) {
				if cipherStr := cipherVal.Export(); cipherStr != nil {
					cipher = fmt.Sprintf("%v", cipherStr)
				}
			}
			if passVal := privEncObj.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
				if passStr := passVal.Export(); passStr != nil {
					passphrase = fmt.Sprintf("%v", passStr)
				}
			}
		}
	}

	// 🔥 P1 修改：生成密钥对，支持自定义 publicExponent
	var privateKey *rsa.PrivateKey
	var err error

	if publicExponent == 65537 {
		// 使用默认值，直接调用标准库（最快）
		privateKey, err = rsa.GenerateKey(rand.Reader, modulusLength)
	} else {
		// 自定义 publicExponent（如 3），需要手动生成
		// Go 标准库不直接支持，需要使用 GenerateMultiPrimeKey 的变通方法
		privateKey, err = generateRSAKeyWithExponent(rand.Reader, modulusLength, publicExponent)
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("生成 RSA 密钥失败: %w", err)))
	}

	// 返回密钥对对象
	result := runtime.NewObject()
	if result == nil {
		panic(runtime.NewGoError(fmt.Errorf("无法创建结果对象")))
	}

	// 🔥 Node.js 18+ 行为：根据是否指定 encoding 返回不同类型
	if hasPublicEncoding {
		// 指定了 encoding，返回字符串或 Buffer
		publicKeyData, err := exportPublicKey(&privateKey.PublicKey, publicKeyType, publicKeyFormat)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if publicKeyFormat == "pem" {
			result.Set("publicKey", runtime.ToValue(string(publicKeyData)))
		} else {
			// DER 格式返回 Buffer
			result.Set("publicKey", ce.createBuffer(runtime, publicKeyData))
		}
	} else {
		// 没有指定 encoding，返回 PublicKeyObject
		result.Set("publicKey", ce.createPublicKeyObject(runtime, &privateKey.PublicKey))
	}

	if hasPrivateEncoding {
		// 指定了 encoding，返回字符串或 Buffer
		privateKeyData, err := exportPrivateKey(privateKey, privateKeyType, privateKeyFormat, cipher, passphrase)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if privateKeyFormat == "pem" {
			result.Set("privateKey", runtime.ToValue(string(privateKeyData)))
		} else {
			// DER 格式返回 Buffer
			result.Set("privateKey", ce.createBuffer(runtime, privateKeyData))
		}
	} else {
		// 没有指定 encoding，返回 PrivateKeyObject
		result.Set("privateKey", ce.createPrivateKeyObject(runtime, privateKey))
	}

	return result
}

// exportPublicKey 导出公钥 (支持 spki/pkcs1 + pem/der)
func exportPublicKey(publicKey *rsa.PublicKey, keyType, format string) ([]byte, error) {
	var keyBytes []byte
	var pemType string
	var err error

	switch strings.ToLower(keyType) {
	case "spki", "subjectpublickeyinfo":
		keyBytes, err = x509.MarshalPKIXPublicKey(publicKey)
		pemType = "PUBLIC KEY"
	case "pkcs1":
		keyBytes = x509.MarshalPKCS1PublicKey(publicKey)
		pemType = "RSA PUBLIC KEY"
	default:
		return nil, fmt.Errorf("不支持的公钥类型: %s (支持: spki, pkcs1)", keyType)
	}

	if err != nil {
		return nil, fmt.Errorf("序列化公钥失败: %w", err)
	}

	// 根据格式返回
	if format == "der" {
		return keyBytes, nil
	}

	// PEM 格式
	return pem.EncodeToMemory(&pem.Block{
		Type:  pemType,
		Bytes: keyBytes,
	}), nil
}

// exportPrivateKey 导出私钥 (支持 pkcs1/pkcs8 + pem/der + 加密)
func exportPrivateKey(privateKey *rsa.PrivateKey, keyType, format, cipher, passphrase string) ([]byte, error) {
	var keyBytes []byte
	var pemType string
	var err error

	// 序列化密钥
	switch strings.ToLower(keyType) {
	case "pkcs1":
		keyBytes = x509.MarshalPKCS1PrivateKey(privateKey)
		pemType = "RSA PRIVATE KEY"
	case "pkcs8":
		keyBytes, err = x509.MarshalPKCS8PrivateKey(privateKey)
		pemType = "PRIVATE KEY"
		if err != nil {
			return nil, fmt.Errorf("序列化 PKCS8 私钥失败: %w", err)
		}
	default:
		return nil, fmt.Errorf("不支持的私钥类型: %s (支持: pkcs1, pkcs8)", keyType)
	}

	// DER 格式直接返回（不支持加密）
	if format == "der" {
		if cipher != "" || passphrase != "" {
			return nil, fmt.Errorf("DER 格式不支持加密")
		}
		return keyBytes, nil
	}

	// PEM 格式
	block := &pem.Block{
		Type:  pemType,
		Bytes: keyBytes,
	}

	// 如果需要加密私钥
	if cipher != "" && passphrase != "" {
		block, err = encryptPEMBlock(block, cipher, passphrase)
		if err != nil {
			return nil, fmt.Errorf("加密私钥失败: %w", err)
		}
	}

	return pem.EncodeToMemory(block), nil
}

// encryptPEMBlock 加密 PEM block (支持 Node.js 常用加密算法)
func encryptPEMBlock(block *pem.Block, cipher, passphrase string) (*pem.Block, error) {
	// 支持的加密算法映射
	var alg x509.PEMCipher
	switch strings.ToLower(cipher) {
	case "aes-128-cbc", "aes128":
		alg = x509.PEMCipherAES128
	case "aes-192-cbc", "aes192":
		alg = x509.PEMCipherAES192
	case "aes-256-cbc", "aes256":
		alg = x509.PEMCipherAES256
	case "des":
		alg = x509.PEMCipherDES
	case "3des", "des3", "des-ede3-cbc":
		alg = x509.PEMCipher3DES
	default:
		return nil, fmt.Errorf("不支持的加密算法: %s (支持: aes-128-cbc, aes-192-cbc, aes-256-cbc, des, 3des, des-ede3-cbc)", cipher)
	}

	encryptedBlock, err := x509.EncryptPEMBlock(rand.Reader, block.Type, block.Bytes, []byte(passphrase), alg)
	if err != nil {
		return nil, err
	}
	return encryptedBlock, nil
}

// getHashFunction 获取哈希函数
func getHashFunction(hashName string) (hash.Hash, error) {
	// 标准化哈希算法名称（Node.js 兼容）
	// 支持多种格式：sha256, SHA256, SHA-256, RSA-SHA256, rsa-sha256 等
	normalized := normalizeHashAlgorithm(hashName)

	switch normalized {
	case "md5":
		// 🔥 P3 安全警告：MD5 已被证明不安全，仅用于兼容旧系统
		utils.Debug("⚠️  安全警告: MD5 哈希算法已不安全，不建议用于生产环境",
			zap.String("algorithm", hashName))
		return md5.New(), nil
	case "sha1":
		// 🔥 P3 安全警告：SHA-1 已被证明存在碰撞攻击，不建议使用
		utils.Debug("⚠️  安全警告: SHA-1 哈希算法存在安全风险，建议使用 SHA-256 或更强算法",
			zap.String("algorithm", hashName))
		return sha1.New(), nil
	case "sha224":
		return sha256.New224(), nil
	case "sha256":
		return sha256.New(), nil
	case "sha384":
		return sha512.New384(), nil
	case "sha512":
		return sha512.New(), nil
	default:
		return nil, fmt.Errorf("不支持的哈希算法: %s", hashName)
	}
}

// normalizeHashAlgorithm 标准化哈希算法名称
// 支持 Node.js 的多种命名格式：sha256, SHA256, SHA-256, RSA-SHA256 等
func normalizeHashAlgorithm(hashName string) string {
	// 转小写
	name := strings.ToLower(hashName)

	// 去掉 "rsa-" 前缀（如 "rsa-sha256" -> "sha256"）
	name = strings.TrimPrefix(name, "rsa-")

	// 去掉所有连字符（如 "sha-256" -> "sha256"）
	name = strings.ReplaceAll(name, "-", "")

	return name
}

// parsePublicKeyPEM 智能解析 PEM 格式的公钥
// 自动识别 PKCS#1 (RSA PUBLIC KEY) 和 SPKI (PUBLIC KEY) 格式
// 🔥 Node.js 18+ 兼容：支持从私钥中提取公钥、支持X.509证书
func parsePublicKeyPEM(keyPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("解码包含公钥的 PEM 块失败")
	}

	var pub interface{}
	var err error

	// 根据 PEM 块类型选择解析方法
	switch block.Type {
	case "RSA PUBLIC KEY":
		// PKCS#1 格式：-----BEGIN RSA PUBLIC KEY-----
		return x509.ParsePKCS1PublicKey(block.Bytes)
	case "PUBLIC KEY":
		// SPKI 格式：-----BEGIN PUBLIC KEY-----
		pub, err = x509.ParsePKIXPublicKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析SPKI公钥失败: %w", err)
		}
	case "CERTIFICATE":
		// 🔥 P1 新增：支持 X.509 证书作为公钥输入（Node.js 常见用法）
		// -----BEGIN CERTIFICATE-----
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析X.509证书失败: %w", err)
		}
		rsaPub, ok := cert.PublicKey.(*rsa.PublicKey)
		if !ok {
			return nil, fmt.Errorf("证书中的公钥不是RSA类型")
		}
		return rsaPub, nil
	case "RSA PRIVATE KEY":
		// 🔥 Node.js 兼容：从 PKCS#1 私钥中提取公钥
		privateKey, err := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析PKCS#1私钥失败: %w", err)
		}
		return &privateKey.PublicKey, nil
	case "PRIVATE KEY":
		// 🔥 Node.js 兼容：从 PKCS#8 私钥中提取公钥
		key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("解析PKCS#8私钥失败: %w", err)
		}
		if rsaKey, ok := key.(*rsa.PrivateKey); ok {
			return &rsaKey.PublicKey, nil
		}
		return nil, fmt.Errorf("PKCS#8 密钥不是 RSA 类型")
	default:
		return nil, fmt.Errorf("不支持的密钥PEM类型: %s (支持: RSA PUBLIC KEY, PUBLIC KEY, CERTIFICATE, RSA PRIVATE KEY, PRIVATE KEY)", block.Type)
	}

	// 确保是 RSA 公钥
	publicKey, ok := pub.(*rsa.PublicKey)
	if !ok {
		return nil, fmt.Errorf("不是 RSA 公钥")
	}

	return publicKey, nil
}

// ============ PSS saltLength 辅助函数 ============

// calculateMaxPSSSaltLength 计算 PSS 签名的最大盐长度 (Node.js RSA_PSS_SALTLEN_MAX_SIGN)
// 🔥 精确公式: sLen = emLen - hLen - 2
// emLen = ceil((modBits-1)/8)，不是直接用 k
// 当模数位长不是 8 的整数倍时，emLen 可能与 k 不同
func calculateMaxPSSSaltLength(key *rsa.PrivateKey, hashFunc crypto.Hash) int {
	modBits := key.N.BitLen()
	emLen := (modBits - 1 + 7) / 8 // ceil((modBits-1)/8)
	hLen := hashFunc.Size()
	sLen := emLen - hLen - 2
	if sLen < 0 {
		return 0
	}
	return sLen
}

// resolvePSSSaltLengthForSign 解析 PSS 签名的 saltLength (Node.js 18+ 行为)
// Node.js: SALTLEN_MAX_SIGN=-2 (最大盐长), SALTLEN_DIGEST=-1 (哈希长度)
// Go: PSSSaltLengthAuto=0, PSSSaltLengthEqualsHash=-1
func resolvePSSSaltLengthForSign(saltLength int, key *rsa.PrivateKey, hashFunc crypto.Hash) int {
	switch saltLength {
	case -2: // Node.js RSA_PSS_SALTLEN_MAX_SIGN
		// 🔥 修复：使用最大盐长，与 Node.js 默认行为对齐
		// 例如：2048位 + SHA-256 → 256 - 32 - 2 = 222 字节
		return calculateMaxPSSSaltLength(key, hashFunc)
	case -1: // Node.js RSA_PSS_SALTLEN_DIGEST -> Go PSSSaltLengthEqualsHash
		return rsa.PSSSaltLengthEqualsHash // Go 的 -1
	case 0: // Go 的 PSSSaltLengthAuto
		return rsa.PSSSaltLengthAuto
	default:
		// 正整数，直接返回（非法负值已在调用前验证）
		return saltLength
	}
}

// resolvePSSSaltLengthForVerify 解析 PSS 验证的 saltLength (Node.js 18+ 行为)
// Node.js: SALTLEN_AUTO=-2, SALTLEN_DIGEST=-1
// Go: PSSSaltLengthAuto=0, PSSSaltLengthEqualsHash=-1
func resolvePSSSaltLengthForVerify(saltLength int, hashFunc crypto.Hash) int {
	switch saltLength {
	case -2: // Node.js RSA_PSS_SALTLEN_AUTO
		// VerifyPSS 可以接受 Go 的 PSSSaltLengthAuto (0)
		return rsa.PSSSaltLengthAuto // Go 的 0
	case -1: // Node.js RSA_PSS_SALTLEN_DIGEST
		return rsa.PSSSaltLengthEqualsHash // Go 的 -1
	case 0: // Go 的 PSSSaltLengthAuto
		return rsa.PSSSaltLengthAuto
	default:
		// 🔥 修复：非法负值直接抛错，与 Node.js 行为对齐
		if saltLength < 0 {
			panic(fmt.Errorf("Invalid saltLength: %d (仅支持 -2, -1, 0 或正整数)", saltLength))
		}
		return saltLength
	}
}

// rsaEncryptWithPrivateKey 使用私钥进行原始 RSA 加密 (m^d mod n)
// 用于实现 privateEncrypt with PKCS#1 v1.5 padding (type 1)
func rsaEncryptWithPrivateKey(priv *rsa.PrivateKey, data []byte) ([]byte, error) {
	// PKCS#1 v1.5 type 1 padding: 0x00 || 0x01 || PS || 0x00 || M
	// PS 是填充字符串，全部为 0xFF，长度至少 8 字节
	k := priv.Size()
	if len(data) > k-11 {
		return nil, fmt.Errorf("数据太长，最大 %d 字节", k-11)
	}

	// 构造填充后的消息
	// em 用于存储 PKCS#1 v1.5 type 1 padding 后的数据
	em := make([]byte, k)
	em[0] = 0x00
	em[1] = 0x01

	// 填充 0xFF
	psLen := k - len(data) - 3
	for i := 2; i < 2+psLen; i++ {
		em[i] = 0xFF
	}

	em[2+psLen] = 0x00
	copy(em[2+psLen+1:], data)

	// 执行原始 RSA 运算: c = m^d mod n
	m := new(big.Int).SetBytes(em)
	c := new(big.Int).Exp(m, priv.D, priv.N)

	return c.FillBytes(make([]byte, k)), nil
}

// rsaDecryptWithPublicKey 使用公钥进行原始 RSA 解密 (c^e mod n)
// 用于实现 publicDecrypt with PKCS#1 v1.5 padding (type 1)
// 🔥 使用常量时间算法防止 timing 攻击
func rsaDecryptWithPublicKey(pub *rsa.PublicKey, data []byte) ([]byte, error) {
	k := pub.Size()
	if len(data) != k {
		return nil, fmt.Errorf("密文长度必须等于密钥长度 %d 字节", k)
	}

	// 执行原始 RSA 运算: m = c^e mod n
	c := new(big.Int).SetBytes(data)
	e := big.NewInt(int64(pub.E))
	m := new(big.Int).Exp(c, e, pub.N)

	em := m.FillBytes(make([]byte, k))

	// 🔥 常量时间验证并去除 PKCS#1 v1.5 type 1 padding
	// 格式: 0x00 || 0x01 || PS (至少8个0xFF) || 0x00 || M
	msg, ok := unpadPKCS1v15Type1ConstantTime(em)
	if !ok {
		return nil, fmt.Errorf("incorrect data")
	}

	return msg, nil
}

// unpadPKCS1v15Type1ConstantTime 常量时间去除 PKCS#1 v1.5 Type 1 padding
// 防止 timing 攻击，符合 Node.js/OpenSSL 的安全语义
// 🔥 修正: 只统计分隔符**之前**的 0xFF (至少 8 个)
func unpadPKCS1v15Type1ConstantTime(em []byte) ([]byte, bool) {
	if len(em) < 11 {
		return nil, false
	}

	// 常量时间验证
	invalid := 0

	// 检查前两个字节: 0x00 || 0x01
	invalid |= subtle.ConstantTimeByteEq(em[0], 0x00) ^ 1
	invalid |= subtle.ConstantTimeByteEq(em[1], 0x01) ^ 1

	// 常量时间遍历找分隔 0x00，统计分隔符**之前**的 0xFF 数量
	sep := -1
	padLen := 0 // 只统计分隔符前的 0xFF

	for i := 2; i < len(em); i++ {
		b := em[i]
		isZero := subtle.ConstantTimeByteEq(b, 0x00)
		isFF := subtle.ConstantTimeByteEq(b, 0xFF)

		// 记录第一个 0x00 的位置（常量时间技巧）
		sepNotSet := subtle.ConstantTimeEq(int32(sep), -1)
		sepCandidate := i
		sep = subtle.ConstantTimeSelect(sepNotSet&isZero, sepCandidate, sep)

		// 在找到分隔之前，必须都是 0xFF
		beforeSep := subtle.ConstantTimeEq(int32(sep), -1)
		invalid |= subtle.ConstantTimeSelect(beforeSep, 1-isFF, 0)

		// 🔥 只统计分隔符前的 0xFF（常量时间）
		padLen += subtle.ConstantTimeSelect(beforeSep&isFF, 1, 0)
	}

	// 🔥 至少 8 个 0xFF (在分隔符之前)
	invalid |= subtle.ConstantTimeLessOrEq(padLen, 7)

	// 必须找到分隔符
	invalid |= subtle.ConstantTimeEq(int32(sep), -1)

	// 常量时间判定是否有效
	ok := subtle.ConstantTimeEq(int32(invalid), 0) == 1
	if !ok {
		return nil, false
	}

	// 🔥 允许空消息 (分隔符后长度为 0)
	return em[sep+1:], true
}

// parsePrivateKey 解析私钥（支持 PKCS#1 和 PKCS#8 格式，支持加密私钥）
func parsePrivateKey(keyPEM string, passphrase ...string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(keyPEM))
	if block == nil {
		return nil, fmt.Errorf("解码包含私钥的 PEM 块失败")
	}

	return parsePrivateKeyFromBlock(block, passphrase...)
}

// parsePrivateKeyFromBlock 从 PEM block 解析私钥（支持 PKCS#1 和 PKCS#8 格式，支持加密私钥）
func parsePrivateKeyFromBlock(block *pem.Block, passphrase ...string) (*rsa.PrivateKey, error) {
	keyBytes := block.Bytes

	// 如果私钥是加密的，先解密
	if x509.IsEncryptedPEMBlock(block) {
		if len(passphrase) == 0 || passphrase[0] == "" {
			return nil, fmt.Errorf("私钥已加密，需要提供 passphrase")
		}

		var err error
		keyBytes, err = x509.DecryptPEMBlock(block, []byte(passphrase[0]))
		if err != nil {
			return nil, fmt.Errorf("解密私钥失败: %w", err)
		}
	}

	// 先尝试 PKCS#1 格式 (-----BEGIN RSA PRIVATE KEY-----)
	privateKey, err := x509.ParsePKCS1PrivateKey(keyBytes)
	if err == nil {
		return privateKey, nil
	}

	// 尝试 PKCS#8 格式 (-----BEGIN PRIVATE KEY-----)
	key, err := x509.ParsePKCS8PrivateKey(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("解析私钥失败: %w", err)
	}

	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("不是 RSA 私钥")
	}

	return rsaKey, nil
}

// publicEncrypt RSA公钥加密
func (ce *CryptoEnhancer) publicEncrypt(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("publicEncrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 4          // 默认 RSA_PKCS1_OAEP_PADDING (Node.js 18+ 行为)
	var oaepHash string = "sha1" // OAEP 默认哈希算法
	var oaepLabel []byte = nil   // OAEP 默认不使用 label

	// 第一个参数可以是字符串、KeyObject 或对象
	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		// 检查是否有选项对象（有 key、padding 等属性）
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			// 对象形式: { key: '...' | KeyObject | Buffer, format: 'pem'|'der', type: '...', padding: ..., oaepHash: '...', oaepLabel: ... }

			// 🔥 检查是否是 DER 格式（{ key: Buffer, format: 'der', type: 'spki' }）
			formatVal := obj.Get("format")
			if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) && safeGetString(formatVal) == "der" {
				// DER 格式，需要特殊处理
				keyPEM = extractKeyFromDEROptions(runtime, obj)
			} else {
				// PEM 格式或 KeyObject
				keyPEM = extractKeyPEM(runtime, obj.Get("key"))
			}

			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if hashVal := obj.Get("oaepHash"); hashVal != nil && !goja.IsUndefined(hashVal) && !goja.IsNull(hashVal) {
				if hashStr := hashVal.Export(); hashStr != nil {
					oaepHash = fmt.Sprintf("%v", hashStr)
				}
			}
			if labelVal := obj.Get("oaepLabel"); labelVal != nil && !goja.IsUndefined(labelVal) && !goja.IsNull(labelVal) {
				// 🔥 Node.js 18+ 兼容: 支持 string | Buffer | ArrayBuffer | TypedArray | DataView
				var labelErr error
				oaepLabel, labelErr = convertToBytes(runtime, labelVal)
				if labelErr != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("oaepLabel 类型错误: %v", labelErr)))
				}
			}
		} else {
			// 直接是 KeyObject 或字符串
			keyPEM = extractKeyPEM(runtime, firstArg)
		}
	} else {
		// 字符串形式
		keyPEM = extractKeyPEM(runtime, firstArg)
	}

	// 获取待加密数据
	// 🔥 Node.js 18+ 兼容: 支持 string | Buffer | ArrayBuffer | TypedArray | DataView
	var data []byte
	secondArg := call.Arguments[1]
	var err error
	data, err = convertToBytes(runtime, secondArg)
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", err)))
	}

	// 解析公钥（智能识别 PKCS#1 和 SPKI 格式）
	publicKey, err := parsePublicKeyPEM(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 执行加密 (支持 Node.js 18+ 的所有 padding 模式)
	var encrypted []byte
	k := (publicKey.N.BitLen() + 7) / 8

	switch padding {
	case 4: // RSA_PKCS1_OAEP_PADDING
		// 🔥 修复：严格按照 Node.js 行为，只使用 oaepHash（MGF1 使用相同哈希）
		hashFunc, err := getHashFunction(oaepHash)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		// 🔥 检查消息长度上限: len(M) ≤ k - 2*hLen - 2
		hLen := hashFunc.Size()
		maxLen := k - 2*hLen - 2
		if len(data) > maxLen {
			panic(runtime.NewTypeError(fmt.Sprintf("data too large for key size (max %d bytes for OAEP with %s)", maxLen, oaepHash)))
		}
		encrypted, err = rsa.EncryptOAEP(hashFunc, rand.Reader, publicKey, data, oaepLabel)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed (OAEP): %w", err)))
		}
	case 1: // RSA_PKCS1_PADDING
		// 🔥 检查消息长度上限: len(M) ≤ k - 11
		maxLen := k - 11
		if len(data) > maxLen {
			panic(runtime.NewTypeError(fmt.Sprintf("data too large for key size (max %d bytes for PKCS1)", maxLen)))
		}
		encrypted, err = rsa.EncryptPKCS1v15(rand.Reader, publicKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		// ⚠️ OpenSSL/Node 语义：输入长度必须 **等于** k 字节，不允许 k-1 或更小后左补零
		k := (publicKey.N.BitLen() + 7) / 8
		if len(data) < k {
			panic(runtime.NewTypeError("error:0200007A:rsa routines::data too small for key size"))
		}
		if len(data) > k {
			panic(runtime.NewTypeError("error:0200006E:rsa routines::data too large for key size"))
		}
		// 原始 RSA 运算：m^e mod n
		m := new(big.Int).SetBytes(data)
		if m.Cmp(publicKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		e := big.NewInt(int64(publicKey.E))
		c := new(big.Int).Exp(m, e, publicKey.N)
		encrypted = c.FillBytes(make([]byte, k))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("publicEncrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("publicEncrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 padding 模式: %d", padding)))
	}

	// 返回Buffer对象
	return ce.createBuffer(runtime, encrypted)
}

// privateDecrypt RSA私钥解密
func (ce *CryptoEnhancer) privateDecrypt(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("privateDecrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 4          // 默认 RSA_PKCS1_OAEP_PADDING (Node.js 18+ 行为)
	var oaepHash string = "sha1" // OAEP 默认哈希算法
	var oaepLabel []byte = nil   // OAEP 默认不使用 label
	var passphrase string = ""

	// 第一个参数可以是字符串、KeyObject 或对象
	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		// 检查是否有选项对象（有 key、padding 等属性）
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			// 对象形式: { key: '...' | KeyObject | Buffer, format: 'pem'|'der', padding: ..., oaepHash: '...', oaepLabel: ..., passphrase: ... }

			// 🔥 检查是否是 DER 格式
			formatVal := obj.Get("format")
			if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) && safeGetString(formatVal) == "der" {
				keyPEM = extractKeyFromDEROptions(runtime, obj)
			} else {
				keyPEM = extractKeyPEM(runtime, obj.Get("key"))
			}

			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if hashVal := obj.Get("oaepHash"); hashVal != nil && !goja.IsUndefined(hashVal) && !goja.IsNull(hashVal) {
				if hashStr := hashVal.Export(); hashStr != nil {
					oaepHash = fmt.Sprintf("%v", hashStr)
				}
			}
			if labelVal := obj.Get("oaepLabel"); labelVal != nil && !goja.IsUndefined(labelVal) && !goja.IsNull(labelVal) {
				// 🔥 Node.js 18+ 兼容: 支持 string | Buffer | ArrayBuffer | TypedArray | DataView
				var labelErr error
				oaepLabel, labelErr = convertToBytes(runtime, labelVal)
				if labelErr != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("oaepLabel 类型错误: %v", labelErr)))
				}
			}
			if passVal := obj.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
				if passStr := passVal.Export(); passStr != nil {
					passphrase = fmt.Sprintf("%v", passStr)
				}
			}
		} else {
			// 直接是 KeyObject 或字符串
			keyPEM = extractKeyPEM(runtime, firstArg)
		}
	} else {
		// 字符串形式
		keyPEM = extractKeyPEM(runtime, firstArg)
	}

	// 获取待解密数据
	// 🔥 Node.js 18+ 兼容: 支持 string | Buffer | ArrayBuffer | TypedArray | DataView
	var data []byte
	secondArg := call.Arguments[1]
	var dataErr error
	data, dataErr = convertToBytes(runtime, secondArg)
	if dataErr != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", dataErr)))
	}

	// 解析私钥（支持 PKCS#1 和 PKCS#8 格式，支持加密私钥）
	privateKey, err := parsePrivateKey(keyPEM, passphrase)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 执行解密 (支持 Node.js 18+ 的所有 padding 模式)
	var decrypted []byte
	switch padding {
	case 4: // RSA_PKCS1_OAEP_PADDING
		hashFunc, err := getHashFunction(oaepHash)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
		decrypted, err = rsa.DecryptOAEP(hashFunc, rand.Reader, privateKey, data, oaepLabel)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("OAEP 解密失败: %w", err)))
		}
	case 1: // RSA_PKCS1_PADDING
		decrypted, err = rsa.DecryptPKCS1v15(rand.Reader, privateKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("PKCS1 v1.5 解密失败: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		// ⚠️ OpenSSL/Node 语义：输入长度必须 **等于** k 字节
		k := (privateKey.N.BitLen() + 7) / 8
		if len(data) < k {
			panic(runtime.NewTypeError("error:0200007A:rsa routines::data too small for key size"))
		}
		if len(data) > k {
			panic(runtime.NewTypeError("error:0200006E:rsa routines::data too large for key size"))
		}
		c := new(big.Int).SetBytes(data)
		if c.Cmp(privateKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		m := new(big.Int).Exp(c, privateKey.D, privateKey.N)
		decrypted = m.FillBytes(make([]byte, k))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("privateDecrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("privateDecrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 padding 模式: %d", padding)))
	}

	// 返回Buffer对象
	return ce.createBuffer(runtime, decrypted)
}

// privateEncrypt RSA私钥加密 (Node.js 18+ 完整兼容)
// 用于签名场景：私钥加密，公钥解密
func (ce *CryptoEnhancer) privateEncrypt(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("privateEncrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 1 // 默认 RSA_PKCS1_PADDING (Node.js 18+ 行为)
	var passphrase string = ""

	// 第一个参数可以是字符串、KeyObject 或对象
	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		// 检查是否有选项对象
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			// 对象形式: { key: '...', padding: ..., passphrase: ... }
			keyPEM = extractKeyPEM(runtime, obj.Get("key"))

			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			passphrase = safeGetString(obj.Get("passphrase"))
		} else {
			keyPEM = extractKeyPEM(runtime, firstArg)
		}
	} else {
		keyPEM = extractKeyPEM(runtime, firstArg)
	}

	// 获取待加密数据
	// 🔥 Node.js 18+ 兼容: 支持 string | Buffer | ArrayBuffer | TypedArray | DataView
	var data []byte
	secondArg := call.Arguments[1]
	var dataErr error
	data, dataErr = convertToBytes(runtime, secondArg)
	if dataErr != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", dataErr)))
	}

	// 解析私钥
	privateKey, err := parsePrivateKey(keyPEM, passphrase)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 执行加密 (privateEncrypt 只支持 RSA_NO_PADDING 和 RSA_PKCS1_PADDING)
	var encrypted []byte
	k := (privateKey.N.BitLen() + 7) / 8

	switch padding {
	case 1: // RSA_PKCS1_PADDING
		// 🔥 检查消息长度上限: len(M) ≤ k - 11
		maxLen := k - 11
		if len(data) > maxLen {
			panic(runtime.NewTypeError(fmt.Sprintf("data too large for key size (max %d bytes for PKCS1)", maxLen)))
		}
		// 🔥 使用原始 RSA 运算实现私钥加密 (PKCS#1 v1.5 type 1 padding)
		encrypted, err = rsaEncryptWithPrivateKey(privateKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("encryption failed: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		// ⚠️ OpenSSL/Node 语义：输入长度必须 **等于** k 字节
		k := (privateKey.N.BitLen() + 7) / 8
		if len(data) < k {
			panic(runtime.NewTypeError("error:0200007A:rsa routines::data too small for key size"))
		}
		if len(data) > k {
			panic(runtime.NewTypeError("error:0200006E:rsa routines::data too large for key size"))
		}
		m := new(big.Int).SetBytes(data)
		if m.Cmp(privateKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		c := new(big.Int).Exp(m, privateKey.D, privateKey.N)
		encrypted = c.FillBytes(make([]byte, k))
	case 4: // RSA_PKCS1_OAEP_PADDING
		panic(runtime.NewTypeError("privateEncrypt 不支持 RSA_PKCS1_OAEP_PADDING (OAEP 仅用于 publicEncrypt/privateDecrypt)"))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("privateEncrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("privateEncrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("privateEncrypt 不支持 padding 模式: %d (仅支持 RSA_NO_PADDING 和 RSA_PKCS1_PADDING)", padding)))
	}

	return ce.createBuffer(runtime, encrypted)
}

// publicDecrypt RSA公钥解密 (Node.js 18+ 完整兼容)
// 用于验证签名场景：公钥解密私钥加密的数据
func (ce *CryptoEnhancer) publicDecrypt(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("publicDecrypt 需要 key 和 data 参数"))
	}

	// 解析参数
	var keyPEM string
	var padding int = 1 // 默认 RSA_PKCS1_PADDING (Node.js 18+ 行为)

	// 第一个参数可以是字符串、KeyObject 或对象
	firstArg := call.Arguments[0]
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		hasKeyProp := obj.Get("key") != nil && !goja.IsUndefined(obj.Get("key"))
		if hasKeyProp {
			keyPEM = extractKeyPEM(runtime, obj.Get("key"))
			if paddingVal := obj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
		} else {
			keyPEM = extractKeyPEM(runtime, firstArg)
		}
	} else {
		keyPEM = extractKeyPEM(runtime, firstArg)
	}

	// 获取待解密数据
	// 🔥 Node.js 18+ 兼容: 支持 string | Buffer | ArrayBuffer | TypedArray | DataView
	var data []byte
	secondArg := call.Arguments[1]
	var dataErr error
	data, dataErr = convertToBytes(runtime, secondArg)
	if dataErr != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("data 类型错误: %v", dataErr)))
	}

	// 解析公钥（智能识别 PKCS#1 和 SPKI 格式）
	publicKey, err := parsePublicKeyPEM(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	// 执行解密 (publicDecrypt 只支持 RSA_NO_PADDING 和 RSA_PKCS1_PADDING)
	var decrypted []byte
	switch padding {
	case 1: // RSA_PKCS1_PADDING
		// 🔥 使用原始 RSA 运算实现公钥解密 (PKCS#1 v1.5 type 1 padding)
		decrypted, err = rsaDecryptWithPublicKey(publicKey, data)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("incorrect data: %w", err)))
		}
	case 3: // RSA_NO_PADDING
		// ⚠️ OpenSSL/Node 语义：输入长度必须 **等于** k 字节
		k := (publicKey.N.BitLen() + 7) / 8
		if len(data) < k {
			panic(runtime.NewTypeError("error:0200007A:rsa routines::data too small for key size"))
		}
		if len(data) > k {
			panic(runtime.NewTypeError("error:0200006E:rsa routines::data too large for key size"))
		}
		c := new(big.Int).SetBytes(data)
		if c.Cmp(publicKey.N) >= 0 {
			panic(runtime.NewTypeError("data too large for RSA key"))
		}
		e := big.NewInt(int64(publicKey.E))
		m := new(big.Int).Exp(c, e, publicKey.N)
		decrypted = m.FillBytes(make([]byte, k))
	case 4: // RSA_PKCS1_OAEP_PADDING
		panic(runtime.NewTypeError("publicDecrypt 不支持 RSA_PKCS1_OAEP_PADDING (OAEP 仅用于 publicEncrypt/privateDecrypt)"))
	case 5: // RSA_X931_PADDING
		panic(runtime.NewTypeError("publicDecrypt 不支持 RSA_X931_PADDING"))
	case 6: // RSA_PKCS1_PSS_PADDING
		panic(runtime.NewTypeError("publicDecrypt 不支持 RSA_PKCS1_PSS_PADDING (PSS 仅用于签名)"))
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("publicDecrypt 不支持 padding 模式: %d (仅支持 RSA_NO_PADDING 和 RSA_PKCS1_PADDING)", padding)))
	}

	return ce.createBuffer(runtime, decrypted)
}

// createSign 创建签名对象
func (ce *CryptoEnhancer) createSign(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createSign 需要 algorithm 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 创建Sign对象
	signObj := runtime.NewObject()
	var dataBuffer []byte

	// update方法
	signObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update 需要 data 参数"))
		}

		// 🔥 修复：支持 Buffer/TypedArray/DataView/ArrayBuffer 以及字符串
		buf, err := convertToBytes(runtime, call.Arguments[0])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
		}
		dataBuffer = append(dataBuffer, buf...)

		return call.This
	})

	// end方法
	signObj.Set("end", func(call goja.FunctionCall) goja.Value {
		return call.This
	})

	// sign方法
	signObj.Set("sign", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("sign 需要 key 参数"))
		}

		// 解析参数
		var keyPEM string
		var padding int = 1       // 默认RSA_PKCS1_PADDING
		var saltLength int = -2   // 🔥 修复：默认 MAX_SIGN (Node.js 签名默认行为)
		var outputEncoding string // 可选的输出编码格式
		var passphrase string = ""

		firstArg := call.Arguments[0]

		// 尝试作为对象解析
		if firstArgObj, ok := firstArg.(*goja.Object); ok && firstArgObj != nil {
			// 检查是否有 key 属性
			keyVal := firstArgObj.Get("key")
			if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
				// 🔥 检查是否是 DER 格式
				formatVal := firstArgObj.Get("format")
				if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) && safeGetString(formatVal) == "der" {
					keyPEM = extractKeyFromDEROptions(runtime, firstArgObj)
				} else {
					// 使用 extractKeyPEM 支持 KeyObject 和 PEM
					keyPEM = extractKeyPEM(runtime, keyVal)
				}

				if paddingVal := firstArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
					padding = int(paddingVal.ToInteger())
				}
				if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
					saltLength = int(saltVal.ToInteger())
				}
				passphrase = safeGetString(firstArgObj.Get("passphrase"))
			} else {
				// 对象但没有 key 属性，可能直接是 KeyObject
				keyPEM = extractKeyPEM(runtime, firstArg)
			}
		} else {
			// 不是对象，直接当作密钥字符串
			keyPEM = extractKeyPEM(runtime, firstArg)
		}

		// 检查第二个参数是否为编码格式 (Node.js 原生 API 支持)
		if len(call.Arguments) > 1 {
			outputEncoding = strings.ToLower(safeGetString(call.Arguments[1]))
		}

		// 解析私钥
		privateKey, err := parsePrivateKey(keyPEM, passphrase)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
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
			hashID := getCryptoHash(algorithm)
			// 🔥 验证 saltLength 合法性
			if saltLength < -2 {
				panic(runtime.NewTypeError(fmt.Sprintf("Invalid saltLength: %d (仅支持 -2, -1, 0 或正整数)", saltLength)))
			}
			// 🔥 Node.js 18+ 兼容：sign 默认使用 MAX_SIGN
			resolvedSaltLength := resolvePSSSaltLengthForSign(saltLength, privateKey, hashID)

			opts := &rsa.PSSOptions{
				SaltLength: resolvedSaltLength,
				Hash:       hashID,
			}

			// 🔥 Node.js 兼容：验证密钥大小是否足够
			if err := validatePSSKeySize(privateKey, opts.Hash, opts.SaltLength); err != nil {
				panic(runtime.NewGoError(err))
			}

			signature, err = rsa.SignPSS(rand.Reader, privateKey, opts.Hash, hashed, opts)
		} else { // RSA_PKCS1_PADDING
			signature, err = rsa.SignPKCS1v15(rand.Reader, privateKey, getCryptoHash(algorithm), hashed)
		}

		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("签名失败: %w", err)))
		}

		// 如果指定了编码格式，返回编码后的字符串
		// 🔥 修复：Node.js 只支持 hex/base64/latin1(binary)，不支持 utf8
		if outputEncoding != "" {
			switch outputEncoding {
			case "hex":
				return runtime.ToValue(hex.EncodeToString(signature))
			case "base64":
				return runtime.ToValue(base64.StdEncoding.EncodeToString(signature))
			case "latin1", "binary":
				// 单字节字符串（与 Node 的 latin1/binary 语义一致）
				return runtime.ToValue(string(signature))
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("不支持的编码: %s (仅支持 hex, base64, latin1, binary)", outputEncoding)))
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
		panic(runtime.NewTypeError("createVerify 需要 algorithm 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 创建Verify对象
	verifyObj := runtime.NewObject()
	var dataBuffer []byte

	// update方法
	verifyObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update 需要 data 参数"))
		}

		// 🔥 修复：支持 Buffer/TypedArray/DataView/ArrayBuffer 以及字符串
		buf, err := convertToBytes(runtime, call.Arguments[0])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
		}
		dataBuffer = append(dataBuffer, buf...)

		return call.This
	})

	// end方法
	verifyObj.Set("end", func(call goja.FunctionCall) goja.Value {
		return call.This
	})

	// verify方法
	verifyObj.Set("verify", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) < 2 {
			panic(runtime.NewTypeError("verify 需要 key 和 signature 参数"))
		}

		// 解析参数
		var keyPEM string
		var padding int = 1
		var saltLength int = rsa.PSSSaltLengthAuto // 默认 RSA_PSS_SALTLEN_AUTO (Node.js 18+ 行为)

		firstArg := call.Arguments[0]

		// 尝试作为对象解析
		if firstArgObj, ok := firstArg.(*goja.Object); ok && firstArgObj != nil {
			// 尝试获取 key 属性
			keyVal := firstArgObj.Get("key")
			if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
				// 🔥 检查是否是 DER 格式
				formatVal := firstArgObj.Get("format")
				if !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) && safeGetString(formatVal) == "der" {
					keyPEM = extractKeyFromDEROptions(runtime, firstArgObj)
				} else {
					// 使用 extractKeyPEM 支持 KeyObject 和 PEM
					keyPEM = extractKeyPEM(runtime, keyVal)
				}

				if paddingVal := firstArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
					padding = int(paddingVal.ToInteger())
				}
				if saltVal := firstArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
					saltLength = int(saltVal.ToInteger())
				}
			} else {
				// 对象但没有 key 属性，可能直接是 KeyObject
				keyPEM = extractKeyPEM(runtime, firstArg)
			}
		} else {
			// 不是对象，直接当作密钥字符串
			keyPEM = extractKeyPEM(runtime, firstArg)
		}

		// 🔥 修复：获取签名数据，支持 Buffer/TypedArray/ArrayBuffer/DataView/字符串
		var signature []byte
		secondArg := call.Arguments[1]
		signatureFormat := "" // 默认无编码（二进制）

		// 检查第三个参数（编码格式）
		if len(call.Arguments) > 2 {
			signatureFormat = strings.ToLower(call.Arguments[2].String())
		}

		// 🔥 修复：精确判断是否是字符串，避免 convertToBytes 绕过编码解码
		var err error
		if signatureStr, isStr := secondArg.Export().(string); isStr {
			// 字符串路径：必须提供 encoding
			if signatureFormat == "" {
				panic(runtime.NewTypeError(
					"If signature is a string, a valid signature encoding must be specified (hex, base64, or latin1|binary)"))
			}
			// 按 encoding 解码
			switch signatureFormat {
			case "base64":
				signature, err = base64.StdEncoding.DecodeString(signatureStr)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("base64解码签名失败: %w", err)))
				}
			case "hex":
				signature, err = hex.DecodeString(signatureStr)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("hex解码签名失败: %w", err)))
				}
			case "latin1", "binary":
				// latin1/binary：按原始字节处理
				signature = []byte(signatureStr)
			default:
				panic(runtime.NewTypeError(fmt.Sprintf("不支持的 signature 编码: %s (支持: hex, base64, latin1, binary)", signatureFormat)))
			}
		} else {
			// 非字符串路径：Buffer/TypedArray/ArrayBuffer/DataView
			signature, err = convertToBytes(runtime, secondArg)
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("signature 数据类型错误: %v", err)))
			}
		}

		// 解析公钥（智能识别 PKCS#1 和 SPKI 格式）
		publicKey, err := parsePublicKeyPEM(keyPEM)
		if err != nil {
			panic(runtime.NewGoError(err))
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
			hashID := getCryptoHash(algorithm)
			// 🔥 Node.js 18+ 兼容：verify 默认使用 AUTO
			resolvedSaltLength := resolvePSSSaltLengthForVerify(saltLength, hashID)

			opts := &rsa.PSSOptions{
				SaltLength: resolvedSaltLength,
				Hash:       hashID,
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
	// 标准化哈希算法名称（支持 RSA-SHA256 等格式）
	normalized := normalizeHashAlgorithm(algorithm)

	switch normalized {
	case "md5":
		return crypto.MD5
	case "sha1":
		return crypto.SHA1
	case "sha224":
		return crypto.SHA224
	case "sha256":
		return crypto.SHA256
	case "sha384":
		return crypto.SHA384
	case "sha512":
		return crypto.SHA512
	default:
		// 🔥 修复：对未知算法直接抛错，避免静默回落导致配置错误
		// 与 getHashFunction 的行为一致
		panic(fmt.Errorf("不支持的哈希算法: %s", algorithm))
	}
}

// resolvePSSSaltLength 解析 PSS saltLength (支持 Node.js 常量)
// 已废弃，使用 resolvePSSSaltLengthForSign 或 resolvePSSSaltLengthForVerify
func resolvePSSSaltLength(saltLength int) int {
	// Node.js 常量映射到 Go 常量
	switch saltLength {
	case -2: // Node.js RSA_PSS_SALTLEN_AUTO/MAX_SIGN
		return rsa.PSSSaltLengthAuto // Go 的 0
	case -1: // Node.js RSA_PSS_SALTLEN_DIGEST
		return rsa.PSSSaltLengthEqualsHash // Go 的 -1
	default:
		return saltLength
	}
}

// validatePSSKeySize 验证 PSS 签名的密钥大小是否足够（Node.js 兼容）
// 在 SignPSS 前调用，与 Node.js 行为一致
// 🔥 修复：使用 hash.Size() 简化逻辑，与 OpenSSL/Node 对齐
func validatePSSKeySize(privateKey *rsa.PrivateKey, hash crypto.Hash, saltLength int) error {
	// emLen = ceil((modBits-1)/8)
	emLen := (privateKey.N.BitLen() - 1 + 7) / 8

	// Hash length
	hashLen := hash.Size()
	if hashLen <= 0 {
		return fmt.Errorf("unsupported hash")
	}

	// Resolve actual salt length for size check.
	// Go meanings:
	//   PSSSaltLengthEqualsHash (-1) -> saltLen = hashLen
	//   PSSSaltLengthAuto (0)       -> for signing, Go uses hashLen; for verifying, auto-detect.
	// We do conservative check: treat Auto as hashLen so sizing never underestimates.
	actualSaltLen := saltLength
	switch actualSaltLen {
	case rsa.PSSSaltLengthEqualsHash:
		actualSaltLen = hashLen
	case rsa.PSSSaltLengthAuto:
		actualSaltLen = hashLen
	default:
		if actualSaltLen < 0 {
			return fmt.Errorf("Invalid saltLength: %d (仅支持 -2, -1, 0 或正整数)", actualSaltLen)
		}
	}

	required := hashLen + actualSaltLen + 2
	if emLen < required {
		return fmt.Errorf("rsa routines::data too large for key size")
	}
	return nil
}

// safeGetString 安全地从 goja.Value 中提取字符串（防止 panic）
func safeGetString(val goja.Value) string {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return ""
	}
	if exported := val.Export(); exported != nil {
		return fmt.Sprintf("%v", exported)
	}
	return ""
}

// extractKeyFromDEROptions 从 DER 选项中提取并转换为 PEM
// 处理格式：{ key: Buffer | ArrayBuffer | TypedArray | string, format: 'der', type: 'spki'|'pkcs8'|'pkcs1', encoding?: 'base64'|'hex'|'base64url' }
// 🔥 修复：完整实现，支持所有 Node.js 18+ 的输入类型
// 注意：type:'pkcs1' 会自动识别公钥/私钥，无需指定 'pkcs1-private'
func extractKeyFromDEROptions(runtime *goja.Runtime, opts *goja.Object) string {
	// 提取 key
	keyVal := opts.Get("key")
	if keyVal == nil || goja.IsUndefined(keyVal) || goja.IsNull(keyVal) {
		panic(runtime.NewTypeError("DER 格式需要 key 属性"))
	}

	// 解析 encoding（当 key 是字符串时使用）
	enc := strings.ToLower(safeGetString(opts.Get("encoding"))) // 可选: base64 | hex | base64url

	// 读取 type（spki/pkcs1/pkcs8）
	typ := strings.ToLower(safeGetString(opts.Get("type")))
	if typ == "" {
		// 与 Node 常见用法对齐：未给 type 时默认按 spki
		typ = "spki"
	}

	// 将 key 解码为原始 DER 字节
	var der []byte
	var err error

	if _, ok := keyVal.(*goja.Object); !ok {
		// 原始（非对象）——大概率是字符串。若指定了 encoding，严格按 encoding 解码
		s := safeGetString(keyVal)
		switch enc {
		case "base64":
			der, err = base64.StdEncoding.DecodeString(s)
		case "hex":
			der, err = hex.DecodeString(s)
		case "base64url":
			// 兼容无/有 padding
			der, err = base64.RawURLEncoding.DecodeString(s)
			if err != nil {
				der, err = base64.URLEncoding.DecodeString(s)
			}
		case "":
			// 未声明 encoding，则按原始字节处理（与 Node 对齐：字符串+DER 并不常见，但向后兼容）
			der = []byte(s)
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("不支持的 encoding: %s (支持: base64, hex, base64url)", enc)))
		}
	} else {
		// 对象（Buffer/TypedArray/ArrayBuffer/DataView 等）
		der, err = convertToBytes(runtime, keyVal)
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("无法解析 DER key: %w", err)))
	}
	if len(der) == 0 {
		panic(runtime.NewTypeError("DER key 不能为空"))
	}

	// 选择 PEM 头部；对 pkcs1 进行自动识别（私钥/公钥）以对齐 Node 生态的常见输入
	var pemType string
	switch typ {
	case "spki", "subjectpublickeyinfo":
		pemType = "PUBLIC KEY"
	case "pkcs1":
		// 自动探测：优先判断是否为 PKCS#1 私钥，否则尝试公钥
		if _, perr := x509.ParsePKCS1PrivateKey(der); perr == nil {
			pemType = "RSA PRIVATE KEY"
		} else if _, perr := x509.ParsePKCS1PublicKey(der); perr == nil {
			pemType = "RSA PUBLIC KEY"
		} else {
			panic(runtime.NewTypeError("无法识别的 PKCS#1 DER：既非私钥也非公钥"))
		}
	case "pkcs8":
		pemType = "PRIVATE KEY"
	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 DER type: %s (支持: spki, pkcs1, pkcs8)", typ)))
	}

	// 包装为 PEM
	block := &pem.Block{Type: pemType, Bytes: der}
	return string(pem.EncodeToMemory(block))
}

// ============ 输入类型转换辅助函数 (Node.js 18+ 完整兼容) ============

// extractArrayBufferBytes 从 ArrayBuffer 对象提取字节数组
func extractArrayBufferBytes(runtime *goja.Runtime, obj *goja.Object) ([]byte, error) {
	if obj == nil {
		return nil, fmt.Errorf("ArrayBuffer object is nil")
	}

	// 方泓1：尝试直接导出
	if exported := obj.Export(); exported != nil {
		if bytes, ok := exported.([]byte); ok {
			return bytes, nil
		}
	}

	// 方泓2：通过 Uint8Array 视图读取（通用方法）
	ctor := runtime.Get("Uint8Array")
	if goja.IsUndefined(ctor) || goja.IsNull(ctor) {
		return nil, fmt.Errorf("Uint8Array constructor not available")
	}

	ctorObj, ok := ctor.(*goja.Object)
	if !ok {
		return nil, fmt.Errorf("Uint8Array is not a constructor")
	}

	// 创建 Uint8Array 视图：new Uint8Array(arrayBuffer)
	viewObj, err := runtime.New(ctorObj, obj)
	if err != nil {
		return nil, fmt.Errorf("failed to create Uint8Array view: %w", err)
	}

	lengthVal := viewObj.Get("length")
	if goja.IsUndefined(lengthVal) || goja.IsNull(lengthVal) {
		return nil, fmt.Errorf("Uint8Array view has no length")
	}

	length := int(lengthVal.ToInteger())
	out := make([]byte, length)
	for i := 0; i < length; i++ {
		val := viewObj.Get(strconv.Itoa(i))
		if !goja.IsUndefined(val) && !goja.IsNull(val) {
			out[i] = byte(val.ToInteger())
		}
	}

	return out, nil
}

// convertToBytes 将各种输入类型转换为字节数组
// 支持: string, Buffer, ArrayBuffer, TypedArray, DataView
func convertToBytes(runtime *goja.Runtime, value goja.Value) ([]byte, error) {
	if goja.IsUndefined(value) || goja.IsNull(value) {
		return nil, fmt.Errorf("值为 undefined 或 null")
	}

	// 1. 字符串
	if str, ok := value.Export().(string); ok {
		return []byte(str), nil
	}

	// 2. 对象类型 (Buffer, ArrayBuffer, TypedArray, DataView)
	if obj, ok := value.(*goja.Object); ok && obj != nil {
		className := obj.ClassName()
		bufferProp := obj.Get("buffer")
		byteLengthVal := obj.Get("byteLength")

		// 2.1 处理纯 ArrayBuffer（优先检查，因为它也有 byteLength 但没有 buffer）
		if className == "ArrayBuffer" || (byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && (bufferProp == nil || goja.IsUndefined(bufferProp))) {
			backing, err := extractArrayBufferBytes(runtime, obj)
			if err != nil {
				return nil, fmt.Errorf("failed to extract ArrayBuffer: %w", err)
			}
			out := make([]byte, len(backing))
			copy(out, backing)
			return out, nil
		}

		// 2.2 处理 TypedArray / DataView（都有 buffer/byteOffset/byteLength）
		if bufferProp != nil && !goja.IsUndefined(bufferProp) && !goja.IsNull(bufferProp) &&
			byteLengthVal != nil && !goja.IsUndefined(byteLengthVal) && !goja.IsNull(byteLengthVal) {

			byteLength := int(byteLengthVal.ToInteger())
			if byteLength < 0 {
				return nil, fmt.Errorf("invalid byteLength: %d", byteLength)
			}

			byteOffsetVal := obj.Get("byteOffset")
			byteOffset := 0
			if byteOffsetVal != nil && !goja.IsUndefined(byteOffsetVal) && !goja.IsNull(byteOffsetVal) {
				byteOffset = int(byteOffsetVal.ToInteger())
			}

			// 从底层 ArrayBuffer 提取字节
			if bufferObj, ok := bufferProp.(*goja.Object); ok {
				backing, err := extractArrayBufferBytes(runtime, bufferObj)
				if err != nil {
					return nil, fmt.Errorf("failed to extract ArrayBuffer: %w", err)
				}
				if byteOffset+byteLength > len(backing) {
					return nil, fmt.Errorf("view is out of range: offset=%d, length=%d, buffer=%d", byteOffset, byteLength, len(backing))
				}
				out := make([]byte, byteLength)
				copy(out, backing[byteOffset:byteOffset+byteLength])
				return out, nil
			}
		}

		// 2.2 Buffer (Node.js Buffer 对象)
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
			// 检查是否有 _isBuffer 标记
			isBufferVal := obj.Get("_isBuffer")
			if isBufferVal != nil && !goja.IsUndefined(isBufferVal) && !goja.IsNull(isBufferVal) && isBufferVal.ToBoolean() {
				length := int(lengthVal.ToInteger())
				data := make([]byte, length)
				for i := 0; i < length; i++ {
					if val := obj.Get(strconv.Itoa(i)); val != nil && !goja.IsUndefined(val) {
						data[i] = byte(val.ToInteger())
					}
				}
				return data, nil
			}
		}

	}

	// 3. 尝试直接导出
	if exported := value.Export(); exported != nil {
		if bytes, ok := exported.([]byte); ok {
			return bytes, nil
		}
	}

	return nil, fmt.Errorf("无法转换为字节数组: 不支持的类型")
}

// extractKeyPEM 从参数中提取 PEM 格式的密钥
// 支持：字符串、KeyObject、{ key: ... } 对象
func extractKeyPEM(runtime *goja.Runtime, keyArg goja.Value) string {
	if obj, ok := keyArg.(*goja.Object); ok && obj != nil {
		// 检查是否是 KeyObject（有 type 和 export 方法）
		if keyType := obj.Get("type"); !goja.IsUndefined(keyType) && !goja.IsNull(keyType) {
			typeStr := safeGetString(keyType)
			if typeStr == "public" || typeStr == "private" {
				// 是 KeyObject，调用 export() 方法
				exportFunc := obj.Get("export")
				if exportFunc != nil && !goja.IsUndefined(exportFunc) {
					// 构造 export 参数
					exportType := "spki"
					if typeStr == "private" {
						exportType = "pkcs8"
					}

					opts := runtime.NewObject()
					opts.Set("type", exportType)
					opts.Set("format", "pem")

					// 尝试调用 export 函数
					if callable, ok := goja.AssertFunction(exportFunc); ok {
						result, err := callable(obj, runtime.ToValue(opts))
						if err != nil {
							panic(runtime.NewGoError(fmt.Errorf("调用 KeyObject.export() 失败: %w", err)))
						}
						return result.String()
					}
				}
			}
		}

		// 不是 KeyObject，检查是否是 { key: '...' } 格式
		if keyVal := obj.Get("key"); !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			return extractKeyPEM(runtime, keyVal)
		}
	}

	// 直接作为字符串返回
	return safeGetString(keyArg)
}

// createPublicKey 创建公钥对象 (Node.js 18+ KeyObject API)
func (ce *CryptoEnhancer) createPublicKey(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createPublicKey 需要 key 参数"))
	}

	var keyFormat string = "pem"
	var keyType string = "spki"

	// 支持字符串或对象参数
	firstArg := call.Arguments[0]

	// 🔥 Node.js 18+ 行为：检查是否是 KeyObject
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		if keyObjType := obj.Get("type"); !goja.IsUndefined(keyObjType) && !goja.IsNull(keyObjType) {
			keyTypeStr := safeGetString(keyObjType)
			if keyTypeStr == "private" || keyTypeStr == "public" {
				// 是 KeyObject
				if keyTypeStr == "private" {
					// 私钥 KeyObject 传给 createPublicKey
					// 🔥 修复：从私钥提取公钥（Node.js 行为）
					// 尝试获取内部的 _handle (私钥 PEM)
					if handleVal := obj.Get("_handle"); !goja.IsUndefined(handleVal) && !goja.IsNull(handleVal) {
						// _handle 是私钥的 PEM 字符串
						if pemStr, ok := handleVal.Export().(string); ok && pemStr != "" {
							// 解析私钥
							privKey, err := parsePrivateKey(pemStr, "")
							if err == nil && privKey != nil {
								// 从私钥提取公钥，创建公钥 PEM
								pubKeyBytes, err := x509.MarshalPKIXPublicKey(&privKey.PublicKey)
								if err == nil && pubKeyBytes != nil {
									pubKeyPEM := pem.EncodeToMemory(&pem.Block{
										Type:  "PUBLIC KEY",
										Bytes: pubKeyBytes,
									})
									if pubKeyPEM != nil {
										// 递归调用 createPublicKey 处理公钥 PEM
										return ce.createPublicKey(runtime, goja.FunctionCall{
											Arguments: []goja.Value{runtime.ToValue(string(pubKeyPEM))},
										})
									}
								}
							}
						}
					}
					panic(runtime.NewTypeError("Invalid key object type private, expected public."))
				} else {
					// 公钥 KeyObject，直接返回（幂等操作）
					return firstArg
				}
			}
		}

		// 获取 format 和 type
		keyFormat = safeGetString(obj.Get("format"))
		keyType = safeGetString(obj.Get("type"))
	}

	// 解析公钥
	var publicKey *rsa.PublicKey
	var err error

	// 🔥 P2 新增：支持 JWK 格式
	// 注意：keyFormat 在第 3064 行可能被设置为 "jwk"
	if keyFormat == "jwk" {
		// JWK 格式：key 应该是对象
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")
			if keyObj, ok := keyVal.(*goja.Object); ok && keyObj != nil {
				// 将 goja.Object 转换为 map[string]interface{}
				jwkMap := make(map[string]interface{})
				for _, key := range keyObj.Keys() {
					val := keyObj.Get(key)
					if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
						jwkMap[key] = val.Export()
					}
				}
				publicKey, err = jwkToRSAPublicKey(jwkMap)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("解析JWK公钥失败: %w", err)))
				}
			} else {
				panic(runtime.NewTypeError("JWK 格式的 key 必须是对象"))
			}
		} else {
			panic(runtime.NewTypeError("JWK 格式需要对象参数"))
		}
	} else if keyFormat == "der" {
		// 🔥 修复：DER 格式需要正确处理 encoding
		var keyBytes []byte

		// 检查 key 是否是 Buffer/TypedArray/ArrayBuffer
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")

			// 🔥 关键修复：先判断是否是字符串
			if keyStr, isStr := keyVal.Export().(string); isStr {
				// 字符串路径：必须提供 encoding
				encoding := strings.ToLower(safeGetString(obj.Get("encoding")))

				if encoding == "" {
					panic(runtime.NewTypeError("If 'key' is a string and format is 'der', 'encoding' must be specified ('base64' or 'hex')"))
				}

				switch encoding {
				case "base64":
					keyBytes, err = base64.StdEncoding.DecodeString(keyStr)
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("base64 解码失败: %w", err)))
					}
				case "hex":
					keyBytes, err = hex.DecodeString(keyStr)
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("hex 解码失败: %w", err)))
					}
				default:
					panic(runtime.NewTypeError(fmt.Sprintf("不支持的 encoding: %s (支持 base64, hex)", encoding)))
				}
			} else {
				// 非字符串路径：Buffer/TypedArray/ArrayBuffer/DataView
				var convErr error
				keyBytes, convErr = convertToBytes(runtime, keyVal)
				if convErr != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("key 数据类型错误: %v", convErr)))
				}
			}
		} else {
			// 直接传入的字符串，应该报错
			panic(runtime.NewTypeError("DER format requires an object with 'key' property"))
		}

		switch strings.ToLower(keyType) {
		case "spki", "subjectpublickeyinfo", "":
			pub, parseErr := x509.ParsePKIXPublicKey(keyBytes)
			if parseErr != nil {
				panic(runtime.NewGoError(fmt.Errorf("解析SPKI公钥失败: %w", parseErr)))
			}
			var ok bool
			publicKey, ok = pub.(*rsa.PublicKey)
			if !ok {
				panic(runtime.NewTypeError("不是RSA公钥"))
			}
		case "pkcs1":
			publicKey, err = x509.ParsePKCS1PublicKey(keyBytes)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("解析PKCS1公钥失败: %w", err)))
			}
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("不支持的公钥类型: %s (支持 spki, pkcs1)", keyType)))
		}
	} else {
		// PEM格式（默认）
		var keyPEM string
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			// 对象形式：提取 key
			keyPEM = extractKeyPEM(runtime, obj.Get("key"))
		} else {
			// 字符串形式
			keyPEM = safeGetString(firstArg)
		}

		block, _ := pem.Decode([]byte(keyPEM))
		if block == nil {
			panic(runtime.NewTypeError("解码PEM块失败"))
		}

		// 根据block.Type自动识别
		if block.Type == "RSA PUBLIC KEY" {
			// PKCS1格式
			publicKey, err = x509.ParsePKCS1PublicKey(block.Bytes)
		} else {
			// SPKI格式
			pub, parseErr := x509.ParsePKIXPublicKey(block.Bytes)
			if parseErr != nil {
				panic(runtime.NewGoError(fmt.Errorf("解析公钥失败: %w", parseErr)))
			}
			var ok bool
			publicKey, ok = pub.(*rsa.PublicKey)
			if !ok {
				panic(runtime.NewTypeError("不是RSA公钥"))
			}
		}

		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("解析公钥失败: %w", err)))
		}
	}

	// 创建KeyObject
	keyObj := runtime.NewObject()
	keyObj.Set("type", "public")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 🔥 Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", publicKey.N.BitLen())
	// 🔥 publicExponent 以 BigInt 暴露（与 Node.js 18+ 一致）
	details.Set("publicExponent", runtime.ToValue(int64(publicKey.E)))
	keyObj.Set("asymmetricKeyDetails", details)

	// export方法
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "spki"
		exportFormat := "pem"

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
			}
		}

		// 🔥 P2 新增：支持 JWK 格式导出
		if exportFormat == "jwk" {
			jwk := rsaPublicKeyToJWK(publicKey)
			return runtime.ToValue(jwk)
		}

		exported, err := exportPublicKey(publicKey, exportType, exportFormat)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return ce.createBuffer(runtime, exported)
	})

	return keyObj
}

// createPrivateKey 创建私钥对象 (Node.js 18+ KeyObject API)
func (ce *CryptoEnhancer) createPrivateKey(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createPrivateKey 需要 key 参数"))
	}

	var keyFormat string = "pem"
	var keyType string = "pkcs8"
	var passphrase string

	// 支持字符串或对象参数
	firstArg := call.Arguments[0]

	// 🔥 Node.js 18+ 行为：检查是否是 KeyObject
	if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
		if keyObjType := obj.Get("type"); !goja.IsUndefined(keyObjType) && !goja.IsNull(keyObjType) {
			keyTypeStr := safeGetString(keyObjType)
			if keyTypeStr == "private" || keyTypeStr == "public" {
				// 是 KeyObject
				if keyTypeStr == "public" {
					// 公钥 KeyObject 传给 createPrivateKey，报错
					panic(runtime.NewTypeError("Invalid key object type public, expected private."))
				} else {
					// 私钥 KeyObject，直接返回（幂等操作）
					return firstArg
				}
			}
		}

		// 获取 format, type, passphrase
		keyFormat = safeGetString(obj.Get("format"))
		keyType = safeGetString(obj.Get("type"))
		passphrase = safeGetString(obj.Get("passphrase"))
	}

	// 解析私钥
	var privateKey *rsa.PrivateKey
	var err error

	// 🔥 P2 新增：支持 JWK 格式
	// 注意：keyFormat 在第 3280 行可能被设置为 "jwk"
	if keyFormat == "jwk" {
		// JWK 格式：key 应该是对象
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")
			if keyObj, ok := keyVal.(*goja.Object); ok && keyObj != nil {
				// 将 goja.Object 转换为 map[string]interface{}
				jwkMap := make(map[string]interface{})
				for _, key := range keyObj.Keys() {
					val := keyObj.Get(key)
					if val != nil && !goja.IsUndefined(val) && !goja.IsNull(val) {
						jwkMap[key] = val.Export()
					}
				}
				privateKey, err = jwkToRSAPrivateKey(jwkMap)
				if err != nil {
					panic(runtime.NewGoError(fmt.Errorf("解析JWK私钥失败: %w", err)))
				}
			} else {
				panic(runtime.NewTypeError("JWK 格式的 key 必须是对象"))
			}
		} else {
			panic(runtime.NewTypeError("JWK 格式需要对象参数"))
		}
	} else if keyFormat == "der" {
		// 🔥 修复：DER 格式需要正确处理 encoding
		var keyBytes []byte

		// 检查 key 是否是 Buffer/TypedArray/ArrayBuffer
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			keyVal := obj.Get("key")

			// 🔥 关键修复：先判断是否是字符串
			if keyStr, isStr := keyVal.Export().(string); isStr {
				// 字符串路径：必须提供 encoding
				encoding := strings.ToLower(safeGetString(obj.Get("encoding")))

				if encoding == "" {
					panic(runtime.NewTypeError("If 'key' is a string and format is 'der', 'encoding' must be specified ('base64' or 'hex')"))
				}

				switch encoding {
				case "base64":
					keyBytes, err = base64.StdEncoding.DecodeString(keyStr)
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("base64 解码失败: %w", err)))
					}
				case "hex":
					keyBytes, err = hex.DecodeString(keyStr)
					if err != nil {
						panic(runtime.NewGoError(fmt.Errorf("hex 解码失败: %w", err)))
					}
				default:
					panic(runtime.NewTypeError(fmt.Sprintf("不支持的 encoding: %s (支持 base64, hex)", encoding)))
				}
			} else {
				// 非字符串路径：Buffer/TypedArray/ArrayBuffer/DataView
				var convErr error
				keyBytes, convErr = convertToBytes(runtime, keyVal)
				if convErr != nil {
					panic(runtime.NewTypeError(fmt.Sprintf("key 数据类型错误: %v", convErr)))
				}
			}
		} else {
			// 直接传入的字符串，应该报错
			panic(runtime.NewTypeError("DER format requires an object with 'key' property"))
		}

		switch strings.ToLower(keyType) {
		case "pkcs1":
			privateKey, err = x509.ParsePKCS1PrivateKey(keyBytes)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("解析PKCS1私钥失败: %w", err)))
			}
		case "pkcs8", "":
			key, parseErr := x509.ParsePKCS8PrivateKey(keyBytes)
			if parseErr != nil {
				panic(runtime.NewGoError(fmt.Errorf("解析PKCS8私钥失败: %w", parseErr)))
			}
			var ok bool
			privateKey, ok = key.(*rsa.PrivateKey)
			if !ok {
				panic(runtime.NewTypeError("不是RSA私钥"))
			}
		default:
			panic(runtime.NewTypeError(fmt.Sprintf("不支持的私钥类型: %s (支持 pkcs1, pkcs8)", keyType)))
		}
	} else {
		// PEM格式（默认）
		var keyPEM string
		if obj, ok := firstArg.(*goja.Object); ok && obj != nil {
			// 对象形式：提取 key
			keyPEM = extractKeyPEM(runtime, obj.Get("key"))
		} else {
			// 字符串形式
			keyPEM = safeGetString(firstArg)
		}

		privateKey, err = parsePrivateKey(keyPEM, passphrase)
		if err != nil {
			panic(runtime.NewGoError(err))
		}
	}

	// 创建KeyObject
	keyObj := runtime.NewObject()
	keyObj.Set("type", "private")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 🔥 Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", privateKey.N.BitLen())
	// 🔥 publicExponent 以 BigInt 暴露（与 Node.js 18+ 一致）
	details.Set("publicExponent", runtime.ToValue(int64(privateKey.E)))
	keyObj.Set("asymmetricKeyDetails", details)

	// 🔥 添加 _handle 字段存储私钥 PEM（用于 createPublicKey 提取公钥）
	pemBytes, err := exportPrivateKey(privateKey, "pkcs8", "pem", "", "")
	if err == nil {
		keyObj.Set("_handle", runtime.ToValue(string(pemBytes)))
	}

	// export方法
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		// 使用defer防止任何panic
		defer func() {
			if r := recover(); r != nil {
				panic(runtime.NewGoError(fmt.Errorf("KeyObject.export() panic: %v", r)))
			}
		}()

		exportType := "pkcs8"
		exportFormat := "pem"
		exportCipher := ""
		exportPass := ""

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
				if cipherVal := opts.Get("cipher"); cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal) {
					if cipherStr := cipherVal.Export(); cipherStr != nil {
						exportCipher = fmt.Sprintf("%v", cipherStr)
					}
				}
				if passVal := opts.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
					if passStr := passVal.Export(); passStr != nil {
						exportPass = fmt.Sprintf("%v", passStr)
					}
				}
			}
		}

		if privateKey == nil {
			panic(runtime.NewGoError(fmt.Errorf("privateKey is nil")))
		}

		// 🔥 P2 新增：支持 JWK 格式导出
		if exportFormat == "jwk" {
			jwk := rsaPrivateKeyToJWK(privateKey)
			return runtime.ToValue(jwk)
		}

		exported, err := exportPrivateKey(privateKey, exportType, exportFormat, exportCipher, exportPass)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}

		if ce == nil {
			panic(runtime.NewGoError(fmt.Errorf("CryptoEnhancer is nil")))
		}
		return ce.createBuffer(runtime, exported)
	})

	return keyObj
}

// createPublicKeyObject 直接从 Go 的 rsa.PublicKey 创建 PublicKeyObject
// 用于 generateKeyPairSync 在没有指定 encoding 时返回 KeyObject
func (ce *CryptoEnhancer) createPublicKeyObject(runtime *goja.Runtime, publicKey *rsa.PublicKey) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "public")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 🔥 Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", publicKey.N.BitLen())
	// 🔥 publicExponent 以 BigInt 暴露（与 Node.js 18+ 一致）
	details.Set("publicExponent", runtime.ToValue(int64(publicKey.E)))
	keyObj.Set("asymmetricKeyDetails", details)

	// export方法
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "spki"
		exportFormat := "pem"

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
			}
		}

		// 🔥 P2 新增：支持 JWK 格式导出
		if exportFormat == "jwk" {
			jwk := rsaPublicKeyToJWK(publicKey)
			return runtime.ToValue(jwk)
		}

		exported, err := exportPublicKey(publicKey, exportType, exportFormat)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return ce.createBuffer(runtime, exported)
	})

	return keyObj
}

// createPrivateKeyObject 直接从 Go 的 rsa.PrivateKey 创建 PrivateKeyObject
// 用于 generateKeyPairSync 在没有指定 encoding 时返回 KeyObject
func (ce *CryptoEnhancer) createPrivateKeyObject(runtime *goja.Runtime, privateKey *rsa.PrivateKey) goja.Value {
	keyObj := runtime.NewObject()
	keyObj.Set("type", "private")
	keyObj.Set("asymmetricKeyType", "rsa")

	// 🔥 Node.js 18+ 兼容：添加 asymmetricKeyDetails
	details := runtime.NewObject()
	details.Set("modulusLength", privateKey.N.BitLen())
	// 🔥 publicExponent 以 BigInt 暴露（与 Node.js 18+ 一致）
	details.Set("publicExponent", runtime.ToValue(int64(privateKey.E)))
	keyObj.Set("asymmetricKeyDetails", details)

	// 🔥 添加 _handle 字段存储私钥 PEM（用于 createPublicKey 提取公钥）
	pemBytes, err := exportPrivateKey(privateKey, "pkcs8", "pem", "", "")
	if err == nil {
		keyObj.Set("_handle", runtime.ToValue(string(pemBytes)))
	}

	// export方法
	keyObj.Set("export", func(call goja.FunctionCall) goja.Value {
		exportType := "pkcs8"
		exportFormat := "pem"
		exportCipher := ""
		exportPass := ""

		if len(call.Arguments) > 0 {
			if opts, ok := call.Arguments[0].(*goja.Object); ok && opts != nil {
				if typeVal := opts.Get("type"); typeVal != nil && !goja.IsUndefined(typeVal) && !goja.IsNull(typeVal) {
					if typeStr := typeVal.Export(); typeStr != nil {
						exportType = fmt.Sprintf("%v", typeStr)
					}
				}
				if formatVal := opts.Get("format"); formatVal != nil && !goja.IsUndefined(formatVal) && !goja.IsNull(formatVal) {
					if formatStr := formatVal.Export(); formatStr != nil {
						exportFormat = fmt.Sprintf("%v", formatStr)
					}
				}
				if cipherVal := opts.Get("cipher"); cipherVal != nil && !goja.IsUndefined(cipherVal) && !goja.IsNull(cipherVal) {
					if cipherStr := cipherVal.Export(); cipherStr != nil {
						exportCipher = fmt.Sprintf("%v", cipherStr)
					}
				}
				if passVal := opts.Get("passphrase"); passVal != nil && !goja.IsUndefined(passVal) && !goja.IsNull(passVal) {
					if passStr := passVal.Export(); passStr != nil {
						exportPass = fmt.Sprintf("%v", passStr)
					}
				}
			}
		}

		// 🔥 P2 新增：支持 JWK 格式导出
		if exportFormat == "jwk" {
			jwk := rsaPrivateKeyToJWK(privateKey)
			return runtime.ToValue(jwk)
		}

		exported, err := exportPrivateKey(privateKey, exportType, exportFormat, exportCipher, exportPass)
		if err != nil {
			panic(runtime.NewGoError(err))
		}

		if exportFormat == "pem" {
			return runtime.ToValue(string(exported))
		}
		return ce.createBuffer(runtime, exported)
	})

	return keyObj
}

// createBuffer 创建 Buffer 对象（用于 RSA 加解密和签名，瓶颈在 goja API 调用）
func (ce *CryptoEnhancer) createBuffer(runtime *goja.Runtime, data []byte) goja.Value {
	bufferObj := runtime.NewObject()
	bufferObj.Set("length", runtime.ToValue(len(data)))

	// 设置索引访问
	// 注意：不要预分配索引字符串切片，原因见函数注释
	for i, b := range data {
		// 🚀 性能优化：使用 strconv.Itoa 代替 fmt.Sprintf，快 3-5 倍
		bufferObj.Set(strconv.Itoa(i), runtime.ToValue(int(b)))
	}

	// 🔥 Node.js 18+ 兼容：添加 Buffer 标识符
	// Buffer.isBuffer() 检查这些属性来判断是否是 Buffer
	bufferObj.Set("_isBuffer", runtime.ToValue(true))
	bufferObj.Set("constructor", runtime.NewObject())
	if constructor, ok := bufferObj.Get("constructor").(*goja.Object); ok {
		constructor.Set("isBuffer", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) > 0 {
				if obj, ok := call.Arguments[0].(*goja.Object); ok {
					if isBufferVal := obj.Get("_isBuffer"); !goja.IsUndefined(isBufferVal) {
						return isBufferVal
					}
				}
			}
			return runtime.ToValue(false)
		})
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

	// 🔥 新增：equals方法 - 用于 Buffer 比较
	bufferObj.Set("equals", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			return runtime.ToValue(false)
		}

		otherBuf := call.Arguments[0]
		if otherObj, ok := otherBuf.(*goja.Object); ok && otherObj != nil {
			// 获取另一个 Buffer 的长度
			if lengthVal := otherObj.Get("length"); !goja.IsUndefined(lengthVal) {
				otherLen := int(lengthVal.ToInteger())

				// 长度不同，直接返回 false
				if otherLen != len(data) {
					return runtime.ToValue(false)
				}

				// 逐字节比较
				for i := 0; i < len(data); i++ {
					if val := otherObj.Get(strconv.Itoa(i)); !goja.IsUndefined(val) {
						if byte(val.ToInteger()) != data[i] {
							return runtime.ToValue(false)
						}
					} else {
						return runtime.ToValue(false)
					}
				}
				return runtime.ToValue(true)
			}
		}
		return runtime.ToValue(false)
	})

	// 🔥 新增：toJSON方法 - 用于 JSON.stringify() 序列化
	// Node.js Buffer 在序列化时返回 { type: "Buffer", data: [...] } 格式
	bufferObj.Set("toJSON", func(call goja.FunctionCall) goja.Value {
		result := runtime.NewObject()
		result.Set("type", runtime.ToValue("Buffer"))

		// 创建 data 数组
		dataArray := make([]interface{}, len(data))
		for i, b := range data {
			dataArray[i] = int(b)
		}
		result.Set("data", runtime.ToValue(dataArray))

		return result
	})

	return bufferObj
}

// sign 简化的签名API (crypto.sign)
func (ce *CryptoEnhancer) sign(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("sign 需要 algorithm、data 和 key 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 获取数据
	var data []byte
	dataArg := call.Arguments[1]
	if obj, ok := dataArg.(*goja.Object); ok && obj != nil {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(strconv.Itoa(i)); val != nil && !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		}
	} else {
		data = []byte(dataArg.String())
	}

	// 解析密钥和选项
	var keyPEM string
	var padding int = 1                        // 默认 PKCS1
	var saltLength int = rsa.PSSSaltLengthAuto // 默认自动
	var passphrase string = ""

	thirdArg := call.Arguments[2]

	// 尝试作为对象解析
	if thirdArgObj, ok := thirdArg.(*goja.Object); ok && thirdArgObj != nil {
		// 尝试获取 key 属性
		keyVal := thirdArgObj.Get("key")
		if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			keyPEM = safeGetString(keyVal)

			if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
				saltLength = int(saltVal.ToInteger())
			}
			passphrase = safeGetString(thirdArgObj.Get("passphrase"))
		} else {
			// 对象但没有 key 属性，直接转字符串
			keyPEM = safeGetString(thirdArg)
		}
	} else {
		// 不是对象，直接当作密钥字符串
		keyPEM = safeGetString(thirdArg)
	}

	// 解析私钥
	privateKey, err := parsePrivateKey(keyPEM, passphrase)
	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("解析私钥失败: %w", err)))
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
		hashID := getCryptoHash(algorithm)
		// 🔥 验证 saltLength 合法性
		if saltLength < -2 {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid saltLength: %d (仅支持 -2, -1, 0 或正整数)", saltLength)))
		}
		// 🔥 Node.js 18+ 兼容：sign.sign() 默认使用 MAX_SIGN
		resolvedSaltLength := resolvePSSSaltLengthForSign(saltLength, privateKey, hashID)

		opts := &rsa.PSSOptions{
			SaltLength: resolvedSaltLength,
			Hash:       hashID,
		}

		// 🔥 Node.js 兼容：验证密钥大小是否足够
		if err := validatePSSKeySize(privateKey, opts.Hash, opts.SaltLength); err != nil {
			panic(runtime.NewGoError(err))
		}

		signature, err = rsa.SignPSS(rand.Reader, privateKey, opts.Hash, hashed, opts)
	} else { // RSA_PKCS1_PADDING
		signature, err = rsa.SignPKCS1v15(rand.Reader, privateKey, getCryptoHash(algorithm), hashed)
	}

	if err != nil {
		panic(runtime.NewGoError(fmt.Errorf("签名失败: %w", err)))
	}

	return ce.createBuffer(runtime, signature)
}

// verify 简化的验签API (crypto.verify)
func (ce *CryptoEnhancer) verify(runtime *goja.Runtime, call goja.FunctionCall) goja.Value {
	if len(call.Arguments) < 4 {
		panic(runtime.NewTypeError("verify 需要 algorithm、data、key 和 signature 参数"))
	}

	algorithm := call.Arguments[0].String()

	// 获取数据
	var data []byte
	dataArg := call.Arguments[1]
	if obj, ok := dataArg.(*goja.Object); ok && obj != nil {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			data = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(strconv.Itoa(i)); val != nil && !goja.IsUndefined(val) {
					data[i] = byte(val.ToInteger())
				}
			}
		}
	} else {
		data = []byte(dataArg.String())
	}

	// 解析密钥和选项
	var keyPEM string
	var padding int = 1                        // 默认 PKCS1
	var saltLength int = rsa.PSSSaltLengthAuto // 默认自动

	thirdArg := call.Arguments[2]

	// 尝试作为对象解析
	if thirdArgObj, ok := thirdArg.(*goja.Object); ok && thirdArgObj != nil {
		// 尝试获取 key 属性
		keyVal := thirdArgObj.Get("key")
		if keyVal != nil && !goja.IsUndefined(keyVal) && !goja.IsNull(keyVal) {
			keyPEM = safeGetString(keyVal)

			if paddingVal := thirdArgObj.Get("padding"); paddingVal != nil && !goja.IsUndefined(paddingVal) && !goja.IsNull(paddingVal) {
				padding = int(paddingVal.ToInteger())
			}
			if saltVal := thirdArgObj.Get("saltLength"); saltVal != nil && !goja.IsUndefined(saltVal) && !goja.IsNull(saltVal) {
				saltLength = int(saltVal.ToInteger())
			}
		} else {
			// 对象但没有 key 属性，直接转字符串
			keyPEM = safeGetString(thirdArg)
		}
	} else {
		// 不是对象，直接当作密钥字符串
		keyPEM = safeGetString(thirdArg)
	}

	// 获取签名
	var signature []byte
	sigArg := call.Arguments[3]

	if obj, ok := sigArg.(*goja.Object); ok && obj != nil {
		if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
			length := int(lengthVal.ToInteger())
			signature = make([]byte, length)
			for i := 0; i < length; i++ {
				if val := obj.Get(strconv.Itoa(i)); val != nil && !goja.IsUndefined(val) {
					signature[i] = byte(val.ToInteger())
				}
			}
		}
	}

	// 解析公钥（智能识别 PKCS#1 和 SPKI 格式）
	publicKey, err := parsePublicKeyPEM(keyPEM)
	if err != nil {
		panic(runtime.NewGoError(err))
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
		hashID := getCryptoHash(algorithm)
		// 🔥 Node.js 18+ 兼容：verify.verify() 默认使用 AUTO
		resolvedSaltLength := resolvePSSSaltLengthForVerify(saltLength, hashID)

		opts := &rsa.PSSOptions{
			SaltLength: resolvedSaltLength,
			Hash:       hashID,
		}
		err = rsa.VerifyPSS(publicKey, opts.Hash, hashed, signature, opts)
	} else { // RSA_PKCS1_PADDING
		err = rsa.VerifyPKCS1v15(publicKey, getCryptoHash(algorithm), hashed, signature)
	}

	return runtime.ToValue(err == nil)
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (ce *CryptoEnhancer) Name() string {
	return "crypto"
}

// Close 关闭 CryptoEnhancer 并释放资源
// Crypto 模块不持有需要释放的资源，返回 nil
func (ce *CryptoEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
// 注册 crypto 和 crypto-js 两个模块
func (ce *CryptoEnhancer) Register(registry *require.Registry) error {
	ce.RegisterCryptoModule(registry)
	ce.RegisterCryptoJSModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
// 设置 crypto 全局环境
func (ce *CryptoEnhancer) Setup(runtime *goja.Runtime) error {
	return ce.SetupCryptoEnvironment(runtime)
}
