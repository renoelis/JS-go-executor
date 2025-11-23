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

// MarshalBinary 实现 encoding.BinaryMarshaler 接口
func (h *md5sha1Hash) MarshalBinary() ([]byte, error) {
	md5Marshaler, ok := h.md5Hash.(encoding.BinaryMarshaler)
	if !ok {
		return nil, fmt.Errorf("md5 hasher 不支持 BinaryMarshaler")
	}
	md5State, err := md5Marshaler.MarshalBinary()
	if err != nil {
		return nil, err
	}

	sha1Marshaler, ok := h.sha1Hash.(encoding.BinaryMarshaler)
	if !ok {
		return nil, fmt.Errorf("sha1 hasher 不支持 BinaryMarshaler")
	}
	sha1State, err := sha1Marshaler.MarshalBinary()
	if err != nil {
		return nil, err
	}

	// 格式: [md5State长度(4字节)][md5State][sha1State]
	result := make([]byte, 4+len(md5State)+len(sha1State))
	result[0] = byte(len(md5State) >> 24)
	result[1] = byte(len(md5State) >> 16)
	result[2] = byte(len(md5State) >> 8)
	result[3] = byte(len(md5State))
	copy(result[4:], md5State)
	copy(result[4+len(md5State):], sha1State)
	return result, nil
}

// UnmarshalBinary 实现 encoding.BinaryUnmarshaler 接口
func (h *md5sha1Hash) UnmarshalBinary(data []byte) error {
	if len(data) < 4 {
		return fmt.Errorf("invalid state data")
	}

	md5Len := int(data[0])<<24 | int(data[1])<<16 | int(data[2])<<8 | int(data[3])
	if len(data) < 4+md5Len {
		return fmt.Errorf("invalid state data")
	}

	md5Unmarshaler, ok := h.md5Hash.(encoding.BinaryUnmarshaler)
	if !ok {
		return fmt.Errorf("md5 hasher 不支持 BinaryUnmarshaler")
	}
	err := md5Unmarshaler.UnmarshalBinary(data[4 : 4+md5Len])
	if err != nil {
		return err
	}

	sha1Unmarshaler, ok := h.sha1Hash.(encoding.BinaryUnmarshaler)
	if !ok {
		return fmt.Errorf("sha1 hasher 不支持 BinaryUnmarshaler")
	}
	return sha1Unmarshaler.UnmarshalBinary(data[4+md5Len:])
}

// ssl3MD5Hash 实现 SSL3 MD5
type ssl3MD5Hash struct {
	hash.Hash
}

func newSSL3MD5() hash.Hash {
	return &ssl3MD5Hash{Hash: md5.New()}
}

// MarshalBinary 实现 encoding.BinaryMarshaler 接口
func (h *ssl3MD5Hash) MarshalBinary() ([]byte, error) {
	marshaler, ok := h.Hash.(encoding.BinaryMarshaler)
	if !ok {
		return nil, fmt.Errorf("underlying hash 不支持 BinaryMarshaler")
	}
	return marshaler.MarshalBinary()
}

// UnmarshalBinary 实现 encoding.BinaryUnmarshaler 接口
func (h *ssl3MD5Hash) UnmarshalBinary(data []byte) error {
	unmarshaler, ok := h.Hash.(encoding.BinaryUnmarshaler)
	if !ok {
		return fmt.Errorf("underlying hash 不支持 BinaryUnmarshaler")
	}
	return unmarshaler.UnmarshalBinary(data)
}

// ssl3SHA1Hash 实现 SSL3 SHA1
type ssl3SHA1Hash struct {
	hash.Hash
}

func newSSL3SHA1() hash.Hash {
	return &ssl3SHA1Hash{Hash: sha1.New()}
}

// MarshalBinary 实现 encoding.BinaryMarshaler 接口
func (h *ssl3SHA1Hash) MarshalBinary() ([]byte, error) {
	marshaler, ok := h.Hash.(encoding.BinaryMarshaler)
	if !ok {
		return nil, fmt.Errorf("underlying hash 不支持 BinaryMarshaler")
	}
	return marshaler.MarshalBinary()
}

// UnmarshalBinary 实现 encoding.BinaryUnmarshaler 接口
func (h *ssl3SHA1Hash) UnmarshalBinary(data []byte) error {
	unmarshaler, ok := h.Hash.(encoding.BinaryUnmarshaler)
	if !ok {
		return fmt.Errorf("underlying hash 不支持 BinaryUnmarshaler")
	}
	return unmarshaler.UnmarshalBinary(data)
}

// replayHash 实现支持数据重放的 hash（用于不支持序列化的算法如 RIPEMD）
type replayHash struct {
	hash.Hash
	newFunc func() hash.Hash
	data    []byte
}

func newReplayHash(newFunc func() hash.Hash) *replayHash {
	return &replayHash{
		Hash:    newFunc(),
		newFunc: newFunc,
		data:    make([]byte, 0),
	}
}

func (h *replayHash) Write(p []byte) (n int, err error) {
	// 记录写入的数据
	h.data = append(h.data, p...)
	return h.Hash.Write(p)
}

func (h *replayHash) Reset() {
	h.Hash.Reset()
	h.data = make([]byte, 0)
}

// MarshalBinary 实现 encoding.BinaryMarshaler 接口
func (h *replayHash) MarshalBinary() ([]byte, error) {
	// 返回所有已写入的数据
	return h.data, nil
}

// UnmarshalBinary 实现 encoding.BinaryUnmarshaler 接口
func (h *replayHash) UnmarshalBinary(data []byte) error {
	// 重置并重放数据
	h.Hash = h.newFunc()
	h.data = make([]byte, len(data))
	copy(h.data, data)
	_, err := h.Hash.Write(data)
	return err
}

// ============================================================================
// 🔥 Hash 和 HMAC 功能
// ============================================================================

// CreateHash 创建 Hash 对象
func CreateHash(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("createHash 需要一个 algorithm 参数"))
	}

	// 检查是否是 Symbol 类型
	if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
		if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
			panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
		}
	}

	// 支持算法别名（rsa-sha256、sha-256 等）
	algorithm := NormalizeHashAlgorithm(strings.ToLower(call.Arguments[0].String()))

	// Node.js 18+：解析 options 参数（用于 SHAKE）
	var outputLength int
	var hasOutputLength bool
	if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
		// 尝试将第二个参数转换为对象
		if opts := call.Arguments[1].ToObject(runtime); opts != nil {
			if lengthVal := opts.Get("outputLength"); lengthVal != nil && !goja.IsUndefined(lengthVal) && !goja.IsNull(lengthVal) {
				outputLength = int(lengthVal.ToInteger())
				hasOutputLength = true
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
		hasher = newReplayHash(func() hash.Hash { return newMD5SHA1() })
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
		if !hasOutputLength {
			// 未显式指定 outputLength 时使用默认输出长度（16 字节）
			outputLength = 16
		} else if outputLength < 0 {
			// Node.js 行为：负数 outputLength 抛出 RangeError
			panic(runtime.NewTypeError(fmt.Sprintf("The 'outputLength' option must be >= 0. Received %d", outputLength)))
		}
	case "shake256":
		isShake = true
		shakeHash = sha3.NewShake256()
		if !hasOutputLength {
			// 未显式指定 outputLength 时使用默认输出长度（32 字节）
			outputLength = 32
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
		hasher = newReplayHash(ripemd160.New)
	case "ripemd160withrsa":
		hasher = newReplayHash(ripemd160.New)

	// ========== SM3（国密算法）==========
	case "sm3":
		hasher = sm3.New()
	case "sm3withrsaencryption":
		hasher = sm3.New()

	// ========== SSL3 相关 ==========
	case "ssl3md5":
		hasher = newReplayHash(func() hash.Hash { return newSSL3MD5() })
	case "ssl3sha1":
		hasher = newReplayHash(func() hash.Hash { return newSSL3SHA1() })

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

		// 检查第一个参数是否是 Symbol
		if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
			if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
				panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
			}
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

		// 检查编码参数是否是 Symbol
		if len(call.Arguments) > 0 {
			if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
				if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
					panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
				}
			}
		}

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

	// write 方法（Stream 接口）- 等同于 update
	hashObj.Set("write", func(call goja.FunctionCall) goja.Value {
		if digested {
			panic(runtime.NewTypeError("Digest already called"))
		}

		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("write 需要 data 参数"))
		}

		// 检查第一个参数是否是 Symbol
		if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
			if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
				panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
			}
		}

		buf := parseDataWithEncoding(runtime, call.Arguments)

		if isShake {
			shakeHash.Write(buf)
		} else {
			hasher.Write(buf)
		}

		// Node.js Hash.write() 返回一个布尔值，表示写入是否成功。
		// 对于内存中的 Hash，这里总是返回 true 即可。
		return runtime.ToValue(true)
	})

	// end 方法（Stream 接口）- 可选地写入数据然后返回 this
	hashObj.Set("end", func(call goja.FunctionCall) goja.Value {
		if digested {
			panic(runtime.NewTypeError("Digest already called"))
		}

		// 如果有参数，写入数据
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) {
			// 检查第一个参数是否是 Symbol
			if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
				if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
					panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
				}
			}

			buf := parseDataWithEncoding(runtime, call.Arguments)

			if isShake {
				shakeHash.Write(buf)
			} else {
				hasher.Write(buf)
			}
		}

		return call.This
	})

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

func CreateHmac(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		panic(runtime.NewTypeError("createHmac 需要 algorithm 和 key 参数"))
	}

	// 支持算法别名
	algorithm := NormalizeHashAlgorithm(strings.ToLower(call.Arguments[0].String()))

	// 检查 algorithm 和 key 是否是 Symbol
	if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
		if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
			panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
		}
		if result, err := isSymbolFn(goja.Undefined(), call.Arguments[1]); err == nil && result.ToBoolean() {
			panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
		}
	}

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

		// 检查第一个参数是否是 Symbol
		if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
			if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
				panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
			}
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

		// 检查编码参数是否是 Symbol
		if len(call.Arguments) > 0 {
			if isSymbolFn := getCryptoIsSymbolCheckFunc(runtime); isSymbolFn != nil {
				if result, err := isSymbolFn(goja.Undefined(), call.Arguments[0]); err == nil && result.ToBoolean() {
					panic(runtime.NewTypeError("Cannot convert a Symbol value to a string"))
				}
			}
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
	case "sha512224":
		return sha512.New512_224(), nil
	case "sha512256":
		return sha512.New512_256(), nil
	// SHA-3 系列
	case "sha3224":
		return sha3.New224(), nil
	case "sha3256":
		return sha3.New256(), nil
	case "sha3384":
		return sha3.New384(), nil
	case "sha3512":
		return sha3.New512(), nil
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
		return newReplayHash(func() hash.Hash { return newMD5SHA1() })
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
		return newReplayHash(ripemd160.New)
	case "ripemd160withrsa":
		return newReplayHash(ripemd160.New)

	// SM3 国密
	case "sm3":
		return sm3.New()
	case "sm3withrsaencryption":
		return sm3.New()

	// SSL3 相关
	case "ssl3md5":
		return newReplayHash(func() hash.Hash { return newSSL3MD5() })
	case "ssl3sha1":
		return newReplayHash(func() hash.Hash { return newSSL3SHA1() })

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
		// 有 encoding 参数：
		// - 若 data 是字符串，则按 encoding 解析；
		// - 若 data 是 Buffer/TypedArray/DataView 等二进制类型，则忽略 encoding，直接按二进制处理。
		if _, ok := args[0].(goja.String); ok {
			// 字符串路径：按照 encoding 解码
			dataStr := args[0].String()
			encoding := strings.ToLower(args[1].String())

			switch encoding {
			case "utf8", "utf-8":
				buf = []byte(dataStr)
			case "hex":
				buf = decodeHexNodeStyle(runtime, dataStr)
			case "base64":
				// Node.js 行为：base64 解码宽松，忽略无效字符，不抛出错误
				buf, err = base64.StdEncoding.DecodeString(dataStr)
				if err != nil {
					// 如果解码失败，尝试宽松解码（忽略非 base64 字符）
					buf = decodeBase64Lenient(dataStr)
				}
			case "base64url":
				// Node.js v18+ 支持 base64url，使用 URL-safe base64 字符集
				buf, err = base64.RawURLEncoding.DecodeString(dataStr)
				if err != nil {
					// 兼容带 padding 场景
					buf, err = base64.URLEncoding.DecodeString(dataStr)
					if err != nil {
						// 与 base64 一致：失败时进行宽松解码，过滤非 base64 字符
						buf = decodeBase64Lenient(dataStr)
					}
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
				runes := []rune(dataStr)
				buf = make([]byte, len(runes))
				for i, r := range runes {
					buf[i] = byte(r & 0xFF)
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
			// 非字符串：视为二进制输入（Buffer/TypedArray/DataView 等），忽略 encoding
			// 与 Node.js 行为保持一致：当 data 已是二进制类型时，inputEncoding 被忽略。
			buf, err = ConvertToBytesStrict(runtime, args[0])
			if err != nil {
				panic(runtime.NewTypeError(fmt.Sprintf("update 数据类型错误: %v", err)))
			}
		}
	} else {
		// 没有 encoding 参数，使用 ConvertToBytesStrict（不接受 ArrayBuffer）
		// Node.js 行为：Hash.update() 和 Hmac.update() 不接受 ArrayBuffer
		buf, err = ConvertToBytesStrict(runtime, args[0])
		if err != nil {
			// 与 Node.js 对齐：update(data) 在 data 类型非法时抛出 TypeError，
			// 消息中包含 data / type / string / Buffer 关键信息。
			panic(runtime.NewTypeError("The \"data\" argument must be of type string or an instance of Buffer, TypedArray, or DataView."))
		}
	}

	return buf
}

func decodeHexNodeStyle(runtime *goja.Runtime, s string) []byte {
	data := []byte(s)
	n := len(data)
	if n%2 == 1 {
		panic(runtime.NewTypeError(fmt.Sprintf("The argument 'encoding' is invalid for data of length %d. Received 'hex'", len(s))))
	}
	out := make([]byte, 0, n/2)
	for i := 0; i < n; i += 2 {
		high, okHigh := fromHexChar(data[i])
		low, okLow := fromHexChar(data[i+1])
		if !okHigh || !okLow {
			break
		}
		out = append(out, (high<<4)|low)
	}
	return out
}

func fromHexChar(c byte) (byte, bool) {
	switch {
	case c >= '0' && c <= '9':
		return c - '0', true
	case c >= 'a' && c <= 'f':
		return c - 'a' + 10, true
	case c >= 'A' && c <= 'F':
		return c - 'A' + 10, true
	default:
		return 0, false
	}
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

	clean := string(filtered)
	if clean == "" {
		return []byte{}
	}

	// 1) 优先按“无 padding”的语义解码（RawStdEncoding）以支持 SGVsbG8 这类输入
	if decoded, err := base64.RawStdEncoding.DecodeString(clean); err == nil {
		return decoded
	}

	// 2) 尝试标准 base64 解码（带 padding 或长度刚好为 4 的倍数）
	if decoded, err := base64.StdEncoding.DecodeString(clean); err == nil {
		return decoded
	}

	// 3) 如长度不是 4 的倍数，自动补齐 '=' 再尝试一次
	if rem := len(clean) % 4; rem != 0 {
		clean = clean + strings.Repeat("=", 4-rem)
		if decoded, err := base64.StdEncoding.DecodeString(clean); err == nil {
			return decoded
		}
	}

	// 4) 仍然失败则返回空字节数组（与 Node 宽松行为一致：不会抛错，只是得到空 Buffer）
	return []byte{}
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
