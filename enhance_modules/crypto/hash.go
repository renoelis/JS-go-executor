package crypto

import (
	"crypto/hmac"
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"encoding"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"hash"
	"strings"

	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/emmansun/gmsm/sm3"
	"go.uber.org/zap"
	"golang.org/x/crypto/blake2b"
	"golang.org/x/crypto/blake2s"
	"golang.org/x/crypto/ripemd160"
	"golang.org/x/crypto/sha3"
)

// ============================================================================
// 🔥 Hash 错误类型
// ============================================================================

// HashError 哈希错误（带 code）
type HashError struct {
	Code    string
	Message string
}

func (e *HashError) Error() string {
	return e.Message
}

// ============================================================================
// 🔥 特殊 Hash 实现
// ============================================================================

// md5sha1Hash 实现 MD5-SHA1 组合哈希（用于 SSL/TLS）
type md5sha1Hash struct {
	md5Hash  hash.Hash
	sha1Hash hash.Hash
}

func newMD5SHA1() hash.Hash {
	return &md5sha1Hash{
		md5Hash:  md5.New(),
		sha1Hash: sha1.New(),
	}
}

func (h *md5sha1Hash) Write(p []byte) (n int, err error) {
	h.md5Hash.Write(p)
	return h.sha1Hash.Write(p)
}

func (h *md5sha1Hash) Sum(b []byte) []byte {
	// 先输出 MD5，再输出 SHA1
	md5Sum := h.md5Hash.Sum(nil)
	sha1Sum := h.sha1Hash.Sum(nil)
	return append(append(b, md5Sum...), sha1Sum...)
}

func (h *md5sha1Hash) Reset() {
	h.md5Hash.Reset()
	h.sha1Hash.Reset()
}

func (h *md5sha1Hash) Size() int {
	return md5.Size + sha1.Size // 16 + 20 = 36 bytes
}

func (h *md5sha1Hash) BlockSize() int {
	return 64 // MD5 和 SHA1 都是 64 字节块
}

// ssl3MD5Hash 实现 SSL3 MD5
type ssl3MD5Hash struct {
	hash.Hash
}

func newSSL3MD5() hash.Hash {
	return &ssl3MD5Hash{Hash: md5.New()}
}

// ssl3SHA1Hash 实现 SSL3 SHA1
type ssl3SHA1Hash struct {
	hash.Hash
}

func newSSL3SHA1() hash.Hash {
	return &ssl3SHA1Hash{Hash: sha1.New()}
}

// ============================================================================
// 🔥 Hash 和 HMAC 功能
// ============================================================================

// CreateHash 创建 Hash 对象
func CreateHash(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createHash 需要一个 algorithm 参数"))
	}

	// 支持算法别名（rsa-sha256、sha-256 等）
	algorithm := NormalizeHashAlgorithm(strings.ToLower(call.Arguments[0].String()))

	// Node.js 18+：解析 options 参数（用于 SHAKE）
	var outputLength int
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
		// 尝试将第二个参数转换为对象
		if opts := call.Arguments[1].ToObject(runtime); opts != nil {
			if lengthVal := opts.Get("outputLength"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
				outputLength = int(lengthVal.ToInteger())
			}
		}
	}

	// 特殊处理：SHAKE 系列使用 ShakeHash 接口
	var isShake bool
	var shakeHash sha3.ShakeHash
	var hasher hash.Hash

	switch algorithm {
	// ========== 基础 MD5 系列 ==========
	case "md5":
		hasher = md5.New()
	case "md5sha1":
		hasher = newMD5SHA1()
	case "md5withrsaencryption":
		hasher = md5.New() // WithRSAEncryption 只是签名时的标识，hash 本身一样

	// ========== 基础 SHA-1 系列 ==========
	case "sha1":
		hasher = sha1.New()
	case "sha1withrsaencryption":
		hasher = sha1.New()
	case "sha12": // RSA-SHA1-2 是 SHA1 的别名
		hasher = sha1.New()

	// ========== SHA-2 系列（SHA-224/256/384/512）==========
	case "sha224":
		hasher = sha256.New224()
	case "sha224withrsaencryption":
		hasher = sha256.New224()
	case "sha256":
		hasher = sha256.New()
	case "sha256withrsaencryption":
		hasher = sha256.New()
	case "sha384":
		hasher = sha512.New384()
	case "sha384withrsaencryption":
		hasher = sha512.New384()
	case "sha512":
		hasher = sha512.New()
	case "sha512withrsaencryption":
		hasher = sha512.New()

	// ========== SHA-512 变体 ==========
	case "sha512224", "sha512/224":
		hasher = sha512.New512_224()
	case "sha512224withrsaencryption":
		hasher = sha512.New512_224()
	case "sha512256", "sha512/256":
		hasher = sha512.New512_256()
	case "sha512256withrsaencryption":
		hasher = sha512.New512_256()

	// ========== SHA-3 系列 ==========
	case "sha3224":
		hasher = sha3.New224()
	case "sha3256":
		hasher = sha3.New256()
	case "sha3384":
		hasher = sha3.New384()
	case "sha3512":
		hasher = sha3.New512()

	// ========== PKCS#1 v1.5 签名算法（SHA-3）==========
	case "idrsassapkcs1v15withsha3224":
		hasher = sha3.New224()
	case "idrsassapkcs1v15withsha3256":
		hasher = sha3.New256()
	case "idrsassapkcs1v15withsha3384":
		hasher = sha3.New384()
	case "idrsassapkcs1v15withsha3512":
		hasher = sha3.New512()

	// ========== SHAKE 系列（可扩展输出函数）==========
	case "shake128":
		isShake = true
		shakeHash = sha3.NewShake128()
		if outputLength == 0 {
			outputLength = 16 // 默认输出长度
		} else if outputLength < 0 {
			// Node.js 行为：负数 outputLength 抛出 RangeError
			panic(runtime.NewTypeError(fmt.Sprintf("The 'outputLength' option must be >= 0. Received %d", outputLength)))
		}
	case "shake256":
		isShake = true
		shakeHash = sha3.NewShake256()
		if outputLength == 0 {
			outputLength = 32 // 默认输出长度
		} else if outputLength < 0 {
			// Node.js 行为：负数 outputLength 抛出 RangeError
			panic(runtime.NewTypeError(fmt.Sprintf("The 'outputLength' option must be >= 0. Received %d", outputLength)))
		}

	// ========== BLAKE2 系列 ==========
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

	// ========== RIPEMD 系列 ==========
	case "ripemd", "ripemd160", "rmd160":
		hasher = ripemd160.New()
	case "ripemd160withrsa":
		hasher = ripemd160.New()

	// ========== SM3（国密算法）==========
	case "sm3":
		hasher = sm3.New()
	case "sm3withrsaencryption":
		hasher = sm3.New()

	// ========== SSL3 相关 ==========
	case "ssl3md5":
		hasher = newSSL3MD5()
	case "ssl3sha1":
		hasher = newSSL3SHA1()

	default:
		// 与 Node.js 保持一致的错误消息
		panic(runtime.NewTypeError("Digest method not supported"))
	}

	// 创建 Hash 对象
	return createHashObject(runtime, hasher, shakeHash, algorithm, isShake, outputLength)
}

// createHashObject 创建 Hash 对象（内部使用）
func createHashObject(runtime *goja.Runtime, hasher hash.Hash, shakeHash sha3.ShakeHash, algorithm string, isShake bool, outputLength int) goja.Value {
	hashObj := runtime.NewObject()

	// 跟踪 Hash 对象是否已经 digest
	var digested bool

	// update 方法
	hashObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if digested {
			panic(runtime.NewTypeError("Digest already called"))
		}

		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update 需要 data 参数"))
		}

		buf := parseDataWithEncoding(runtime, call.Arguments)

		// SHAKE 和标准 hash 都使用 Write
		if isShake {
			shakeHash.Write(buf)
		} else {
			hasher.Write(buf)
		}

		// 返回 this 以支持链式调用
		return call.This
	})

	// digest 方法
	hashObj.Set("digest", func(call goja.FunctionCall) goja.Value {
		if digested {
			// Node.js v25.0.0 行为：Hash 对象第二次调用 digest() 会抛出错误
			panic(runtime.NewTypeError("Digest already called"))
		}
		digested = true

		var sum []byte

		// SHAKE 系列使用 Read() 方法
		if isShake {
			sum = make([]byte, outputLength)
			_, err := shakeHash.Read(sum)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("SHAKE 读取输出失败: %w", err)))
			}
		} else {
			sum = hasher.Sum(nil)
		}

		return formatDigest(runtime, sum, call.Arguments)
	})

	// copy 方法
	hashObj.Set("copy", createHashCopyFunc(runtime, hasher, shakeHash, algorithm, &digested, isShake, outputLength))

	return hashObj
}

// createHashCopyFunc 创建 hash copy 函数
func createHashCopyFunc(runtime *goja.Runtime, currentHasher hash.Hash, currentShake sha3.ShakeHash, algo string, digestedPtr *bool, isShakeAlgo bool, shakeOutputLen int) func(goja.FunctionCall) goja.Value {
	return func(call goja.FunctionCall) goja.Value {
		if *digestedPtr {
			panic(runtime.NewTypeError("Digest already called"))
		}

		var newHasher hash.Hash
		var newShake sha3.ShakeHash

		// SHAKE 使用 Clone() 方法
		if isShakeAlgo {
			newShake = currentShake.Clone()
		} else {
			// 使用 encoding.BinaryMarshaler 接口序列化当前状态
			marshaler, ok := currentHasher.(encoding.BinaryMarshaler)
			if !ok {
				panic(runtime.NewTypeError(fmt.Sprintf("哈希算法 %s 不支持 copy()", algo)))
			}

			state, err := marshaler.MarshalBinary()
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("复制哈希状态失败: %w", err)))
			}

			// 创建新的 hasher
			newHasher = createHasherByAlgorithm(runtime, algo)

			// 反序列化状态到新 hasher
			unmarshaler, ok := newHasher.(encoding.BinaryUnmarshaler)
			if !ok {
				panic(runtime.NewTypeError(fmt.Sprintf("哈希算法 %s 不支持 copy()", algo)))
			}

			err = unmarshaler.UnmarshalBinary(state)
			if err != nil {
				panic(runtime.NewGoError(fmt.Errorf("恢复哈希状态失败: %w", err)))
			}
		}

		// 创建新的 Hash 对象
		return createHashObject(runtime, newHasher, newShake, algo, isShakeAlgo, shakeOutputLen)
	}
}

// CreateHmac 创建 HMAC 对象
func CreateHmac(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("createHmac 需要 algorithm 和 key 参数"))
	}

	// 支持算法别名
	algorithm := NormalizeHashAlgorithm(strings.ToLower(call.Arguments[0].String()))

	// key 支持二进制输入
	keyBytes, err := ConvertToBytes(runtime, call.Arguments[1])
	if err != nil {
		panic(runtime.NewTypeError(fmt.Sprintf("key 数据类型错误: %v", err)))
	}

	var hasher hash.Hash
	switch algorithm {
	// MD5 系列
	case "md5":
		hasher = hmac.New(md5.New, keyBytes)
	case "md5withrsaencryption":
		hasher = hmac.New(md5.New, keyBytes)

	// SHA-1 系列
	case "sha1":
		hasher = hmac.New(sha1.New, keyBytes)
	case "sha1withrsaencryption":
		hasher = hmac.New(sha1.New, keyBytes)
	case "sha12":
		hasher = hmac.New(sha1.New, keyBytes)

	// SHA-2 系列
	case "sha224":
		hasher = hmac.New(sha256.New224, keyBytes)
	case "sha224withrsaencryption":
		hasher = hmac.New(sha256.New224, keyBytes)
	case "sha256":
		hasher = hmac.New(sha256.New, keyBytes)
	case "sha256withrsaencryption":
		hasher = hmac.New(sha256.New, keyBytes)
	case "sha384":
		hasher = hmac.New(sha512.New384, keyBytes)
	case "sha384withrsaencryption":
		hasher = hmac.New(sha512.New384, keyBytes)
	case "sha512":
		hasher = hmac.New(sha512.New, keyBytes)
	case "sha512withrsaencryption":
		hasher = hmac.New(sha512.New, keyBytes)

	// SHA-512 变体
	case "sha512224", "sha512/224":
		hasher = hmac.New(sha512.New512_224, keyBytes)
	case "sha512224withrsaencryption":
		hasher = hmac.New(sha512.New512_224, keyBytes)
	case "sha512256", "sha512/256":
		hasher = hmac.New(sha512.New512_256, keyBytes)
	case "sha512256withrsaencryption":
		hasher = hmac.New(sha512.New512_256, keyBytes)

	// SHA-3 系列
	case "sha3224":
		hasher = hmac.New(sha3.New224, keyBytes)
	case "sha3256":
		hasher = hmac.New(sha3.New256, keyBytes)
	case "sha3384":
		hasher = hmac.New(sha3.New384, keyBytes)
	case "sha3512":
		hasher = hmac.New(sha3.New512, keyBytes)

	// PKCS#1 v1.5
	case "idrsassapkcs1v15withsha3224":
		hasher = hmac.New(sha3.New224, keyBytes)
	case "idrsassapkcs1v15withsha3256":
		hasher = hmac.New(sha3.New256, keyBytes)
	case "idrsassapkcs1v15withsha3384":
		hasher = hmac.New(sha3.New384, keyBytes)
	case "idrsassapkcs1v15withsha3512":
		hasher = hmac.New(sha3.New512, keyBytes)

	// BLAKE2 系列
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

	// RIPEMD 系列
	case "ripemd", "ripemd160", "rmd160":
		hasher = hmac.New(ripemd160.New, keyBytes)
	case "ripemd160withrsa":
		hasher = hmac.New(ripemd160.New, keyBytes)

	// SM3 国密
	case "sm3":
		hasher = hmac.New(sm3.New, keyBytes)
	case "sm3withrsaencryption":
		hasher = hmac.New(sm3.New, keyBytes)

	// SSL3 相关
	case "ssl3md5":
		hasher = hmac.New(func() hash.Hash { return newSSL3MD5() }, keyBytes)
	case "ssl3sha1":
		hasher = hmac.New(func() hash.Hash { return newSSL3SHA1() }, keyBytes)

	default:
		panic(runtime.NewTypeError(fmt.Sprintf("不支持的 HMAC 算法: %s", algorithm)))
	}

	hmacObj := runtime.NewObject()
	var digested bool

	// update 方法
	hmacObj.Set("update", func(call goja.FunctionCall) goja.Value {
		if digested {
			panic(runtime.NewTypeError("Digest already called"))
		}
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("update 需要 data 参数"))
		}

		buf := parseDataWithEncoding(runtime, call.Arguments)
		hasher.Write(buf)
		return call.This
	})

	// digest 方法
	hmacObj.Set("digest", func(call goja.FunctionCall) goja.Value {
		if digested {
			// Node.js v25.0.0 行为：第二次调用 digest() 返回空字符串，而不是抛出错误
			return runtime.ToValue("")
		}
		digested = true

		sum := hasher.Sum(nil)
		return formatDigest(runtime, sum, call.Arguments)
	})

	return hmacObj
}

// ============================================================================
// 🔥 辅助函数
// ============================================================================

// GetHashFunction 根据算法名称获取 hash 函数
func GetHashFunction(hashName string) (hash.Hash, error) {
	normalized := NormalizeHashAlgorithm(hashName)

	switch normalized {
	case "md5":
		utils.Debug("⚠️  安全警告: MD5 哈希算法已不安全，不建议用于生产环境",
			zap.String("algorithm", hashName))
		return md5.New(), nil
	case "sha1":
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
		// 返回 Node.js 兼容的错误
		return nil, &HashError{Code: "ERR_CRYPTO_INVALID_DIGEST", Message: fmt.Sprintf("Invalid digest: %s", hashName)}
	}
}

// NormalizeHashAlgorithm 标准化哈希算法名称
func NormalizeHashAlgorithm(hashName string) string {
	name := strings.ToLower(hashName)
	name = strings.TrimPrefix(name, "rsa-")
	name = strings.ReplaceAll(name, "-", "")
	name = strings.ReplaceAll(name, "/", "")
	name = strings.ReplaceAll(name, "_", "")
	return name
}

// createHasherByAlgorithm 根据算法创建 hasher
func createHasherByAlgorithm(runtime *goja.Runtime, algo string) hash.Hash {
	switch algo {
	// MD5 系列
	case "md5":
		return md5.New()
	case "md5sha1":
		return newMD5SHA1()
	case "md5withrsaencryption":
		return md5.New()

	// SHA-1 系列
	case "sha1":
		return sha1.New()
	case "sha1withrsaencryption":
		return sha1.New()
	case "sha12":
		return sha1.New()

	// SHA-2 系列
	case "sha224":
		return sha256.New224()
	case "sha224withrsaencryption":
		return sha256.New224()
	case "sha256":
		return sha256.New()
	case "sha256withrsaencryption":
		return sha256.New()
	case "sha384":
		return sha512.New384()
	case "sha384withrsaencryption":
		return sha512.New384()
	case "sha512":
		return sha512.New()
	case "sha512withrsaencryption":
		return sha512.New()

	// SHA-512 变体
	case "sha512224", "sha512/224":
		return sha512.New512_224()
	case "sha512224withrsaencryption":
		return sha512.New512_224()
	case "sha512256", "sha512/256":
		return sha512.New512_256()
	case "sha512256withrsaencryption":
		return sha512.New512_256()

	// SHA-3 系列
	case "sha3224":
		return sha3.New224()
	case "sha3256":
		return sha3.New256()
	case "sha3384":
		return sha3.New384()
	case "sha3512":
		return sha3.New512()

	// PKCS#1 v1.5
	case "idrsassapkcs1v15withsha3224":
		return sha3.New224()
	case "idrsassapkcs1v15withsha3256":
		return sha3.New256()
	case "idrsassapkcs1v15withsha3384":
		return sha3.New384()
	case "idrsassapkcs1v15withsha3512":
		return sha3.New512()

	// BLAKE2 系列
	case "blake2b512":
		h, err := blake2b.New512(nil)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("创建 blake2b512 失败: %w", err)))
		}
		return h
	case "blake2s256":
		h, err := blake2s.New256(nil)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("创建 blake2s256 失败: %w", err)))
		}
		return h

	// RIPEMD 系列
	case "ripemd", "ripemd160", "rmd160":
		return ripemd160.New()
	case "ripemd160withrsa":
		return ripemd160.New()

	// SM3 国密
	case "sm3":
		return sm3.New()
	case "sm3withrsaencryption":
		return sm3.New()

	// SSL3 相关
	case "ssl3md5":
		return newSSL3MD5()
	case "ssl3sha1":
		return newSSL3SHA1()

	default:
		// 与 Node.js 保持一致的错误消息
		panic(runtime.NewTypeError("Digest method not supported"))
	}
}

// parseDataWithEncoding 解析带编码的数据
func parseDataWithEncoding(runtime *goja.Runtime, args []goja.Value) []byte {
	var buf []byte
	var err error

	// 检查是否有 inputEncoding 参数
	if len(args) > 1 && !goja.IsUndefined(args[1]) && !goja.IsNull(args[1]) {
		// 有 encoding 参数，data 必须是字符串
		dataStr := args[0].String()
		encoding := strings.ToLower(args[1].String())

		switch encoding {
		case "utf8", "utf-8":
			buf = []byte(dataStr)
		case "hex":
			buf, err = hex.DecodeString(dataStr)
			if err != nil {
				// Node.js 行为：hex 解码失败时抛出错误
				panic(runtime.NewTypeError(fmt.Sprintf("The argument 'encoding' is invalid for data of length %d. Received 'hex'", len(dataStr))))
			}
		case "base64":
			// Node.js 行为：base64 解码宽松，忽略无效字符，不抛出错误
			buf, err = base64.StdEncoding.DecodeString(dataStr)
			if err != nil {
				// 如果解码失败，尝试宽松解码（忽略非 base64 字符）
				buf = decodeBase64Lenient(dataStr)
			}
		case "latin1", "binary":
			// Latin1/Binary 编码：将字符串的每个字符码点（必须0-255）转为字节
			// JavaScript字符串是UTF-16，我们需要提取每个字符的低8位
			runes := []rune(dataStr)
			buf = make([]byte, len(runes))
			for i, r := range runes {
				if r > 255 {
					panic(runtime.NewTypeError(fmt.Sprintf("latin1 字符串包含非法字符: U+%04X", r)))
				}
				buf[i] = byte(r & 0xFF)
			}
		case "ascii":
			buf = make([]byte, len(dataStr))
			for i, r := range dataStr {
				if r > 127 {
					panic(runtime.NewTypeError(fmt.Sprintf("ascii 字符串包含非法字符: U+%04X", r)))
				}
				buf[i] = byte(r)
			}
		case "utf16le", "ucs2", "ucs-2":
			// UTF-16LE 编码：每个字符2字节，小端序
			runes := []rune(dataStr)
			buf = make([]byte, len(runes)*2)
			for i, r := range runes {
				buf[i*2] = byte(r)        // 低字节
				buf[i*2+1] = byte(r >> 8) // 高字节
			}
		default:
			// Node.js 行为：不支持的编码当作 utf8 处理，不抛出错误
			buf = []byte(dataStr)
		}
	} else {
		// 没有 encoding 参数，使用 ConvertToBytesStrict（不接受 ArrayBuffer）
		// Node.js 行为：Hash.update() 和 Hmac.update() 不接受 ArrayBuffer
		buf, err = ConvertToBytesStrict(runtime, args[0])
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
		}
	}

	return buf
}

// decodeBase64Lenient 宽松的 base64 解码（忽略无效字符）
// Node.js 的 Buffer.from(str, 'base64') 会忽略非 base64 字符
func decodeBase64Lenient(str string) []byte {
	// 过滤出有效的 base64 字符（A-Z, a-z, 0-9, +, /, =）
	var filtered []rune
	for _, r := range str {
		if (r >= 'A' && r <= 'Z') ||
			(r >= 'a' && r <= 'z') ||
			(r >= '0' && r <= '9') ||
			r == '+' || r == '/' || r == '=' {
			filtered = append(filtered, r)
		}
	}

	// 尝试解码过滤后的字符串
	decoded, err := base64.StdEncoding.DecodeString(string(filtered))
	if err != nil {
		// 如果还是失败，返回空字节数组
		return []byte{}
	}
	return decoded
}

// formatDigest 格式化摘要输出
func formatDigest(runtime *goja.Runtime, sum []byte, args []goja.Value) goja.Value {
	// 如果未指定编码，返回 Buffer
	if len(args) == 0 {
		return CreateBuffer(runtime, sum)
	}

	encoding := strings.ToLower(args[0].String())
	switch encoding {
	case "hex":
		return runtime.ToValue(hex.EncodeToString(sum))
	case "base64":
		return runtime.ToValue(base64.StdEncoding.EncodeToString(sum))
	case "base64url":
		// Node.js v18+ 支持 base64url 编码（URL-safe base64，不含 +/= 字符）
		return runtime.ToValue(base64.RawURLEncoding.EncodeToString(sum))
	case "latin1", "binary":
		runes := make([]rune, len(sum))
		for i, b := range sum {
			runes[i] = rune(b)
		}
		return runtime.ToValue(string(runes))
	case "utf8", "utf-8":
		// UTF-8 编码：直接将字节作为 UTF-8 字符串（可能包含无效字符）
		return runtime.ToValue(string(sum))
	case "ascii":
		// ASCII 编码：将每个字节转为对应的 ASCII 字符
		runes := make([]rune, len(sum))
		for i, b := range sum {
			runes[i] = rune(b)
		}
		return runtime.ToValue(string(runes))
	case "utf16le", "ucs2", "ucs-2":
		// UTF-16LE 编码：将字节对解释为 UTF-16LE 字符
		// 每2个字节组成一个字符（小端序）
		runes := make([]rune, len(sum)/2)
		for i := 0; i < len(sum)/2; i++ {
			// 小端序：低字节在前
			runes[i] = rune(sum[i*2]) | rune(sum[i*2+1])<<8
		}
		result := string(runes)
		// 如果有剩余字节（奇数长度），追加最后一个字节
		if len(sum)%2 != 0 {
			result += string(rune(sum[len(sum)-1]))
		}
		return runtime.ToValue(result)
	default:
		// Node.js 在传入无效编码时不会抛出错误，而是返回 Buffer
		// 这与 Node.js v25.0.0 的行为一致
		return CreateBuffer(runtime, sum)
	}
}
