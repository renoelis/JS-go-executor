package crypto

import (
	"crypto/sha1"
	"crypto/sha256"
	"crypto/sha512"
	"hash"
	"math"
	"strings"

	"github.com/dop251/goja"
	"golang.org/x/crypto/hkdf"
	"golang.org/x/crypto/pbkdf2"
	"golang.org/x/crypto/scrypt"
)

// =========================================================================
// 🔥 KDF: PBKDF2 / scrypt / HKDF
// =========================================================================

// ScryptMemoryError 表示 scrypt 内存超限错误
type ScryptMemoryError struct {
	Required int
	MaxMem   int
}

func (e *ScryptMemoryError) Error() string {
	return "scrypt: memory limit exceeded"
}

// getKDFHashFunc 根据 digest 名称返回对应的哈希构造函数
// 仅支持常用算法：sha1, sha224, sha256, sha384, sha512
// 注意：这里故意只做小写化，不使用 NormalizeHashAlgorithm 来吞掉 '-' 等分隔符，
// 以便与 Node.js 在处理超长或奇怪算法名时的行为保持一致（例如 'sha256-----' 应视为无效）。
func getKDFHashFunc(runtime *goja.Runtime, digest string) func() hash.Hash {
	normalized := strings.ToLower(digest)
	switch normalized {
	case "sha1":
		return sha1.New
	case "sha224":
		return sha256.New224
	case "sha256":
		return sha256.New
	case "sha384":
		return sha512.New384
	case "sha512":
		return sha512.New
	default:
		panic(runtime.NewTypeError("Invalid digest: " + digest))
	}
}

// ---------------- PBKDF2 ----------------

// PBKDF2Sync 实现 crypto.pbkdf2Sync
func PBKDF2Sync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 4 {
		panic(runtime.NewTypeError("pbkdf2Sync 需要 password, salt, iterations, keylen 参数"))
	}

	passwordVal := call.Arguments[0]
	saltVal := call.Arguments[1]
	iterationsVal := call.Arguments[2]
	keyLenVal := call.Arguments[3]

	password, err := ConvertToBytes(runtime, passwordVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"password\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	salt, err := ConvertToBytes(runtime, saltVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"salt\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}

	// 检查 iterations 是否为整数
	iterationsFloat := iterationsVal.ToFloat()
	iterations := int(iterationsVal.ToInteger())
	if iterationsFloat != float64(iterations) {
		panic(runtime.NewTypeError("The \"iterations\" argument must be an integer"))
	}
	if iterations <= 0 {
		panic(runtime.NewTypeError("The \"iterations\" argument must be of type number greater than 0"))
	}
	// 防止极大值导致程序卡死或超时
	if iterations > CryptoMaxInt32 { // int32 max
		panic(runtime.NewTypeError("The value of \"iterations\" is out of range. It must be <= 2147483647"))
	}

	// 检查 keylen 是否为整数
	keyLenFloat := keyLenVal.ToFloat()
	keyLen := int(keyLenVal.ToInteger())
	if keyLenFloat != float64(keyLen) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be an integer"))
	}
	// PBKDF2：keylen 必须 >0（与 Node 行为一致，keylen=0 会抛错）
	if keyLen <= 0 {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}
	// 防止极大值导致内存分配失败
	if keyLen > CryptoMaxInt32 { // int32 max，约 2GB
		panic(runtime.NewTypeError("The value of \"keylen\" is out of range. It must be <= 2147483647"))
	}

	// Node.js v25: digest 参数必需
	if len(call.Arguments) < 5 || goja.IsUndefined(call.Arguments[4]) || goja.IsNull(call.Arguments[4]) {
		panic(runtime.NewTypeError("The \"digest\" argument is required"))
	}
	digest := SafeGetString(call.Arguments[4])
	if digest == "" {
		panic(runtime.NewTypeError("The \"digest\" argument must be of type string"))
	}

	hf := getKDFHashFunc(runtime, digest)
	derivedKey := pbkdf2.Key(password, salt, iterations, keyLen, hf)

	return CreateBuffer(runtime, derivedKey)
}

// PBKDF2 实现 crypto.pbkdf2（异步）
func PBKDF2(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 5 {
		panic(runtime.NewTypeError("pbkdf2 需要 password, salt, iterations, keylen, digest, callback 参数"))
	}

	// 最后一个参数必须是回调
	cbVal := call.Arguments[len(call.Arguments)-1]
	cbObj, ok := cbVal.(*goja.Object)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}
	callback, ok := goja.AssertFunction(cbObj)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}

	// 其余参数沿用 Sync 逻辑，但在回调中执行
	passwordVal := call.Arguments[0]
	saltVal := call.Arguments[1]
	iterationsVal := call.Arguments[2]
	keyLenVal := call.Arguments[3]
	digestVal := call.Arguments[4]

	// 将参数转换为 Go 值，避免在回调中依赖 JS 对象
	password, err := ConvertToBytes(runtime, passwordVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"password\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	salt, err := ConvertToBytes(runtime, saltVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"salt\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}

	// 检查 iterations 是否为整数
	iterationsFloat := iterationsVal.ToFloat()
	iterations := int(iterationsVal.ToInteger())
	if iterationsFloat != float64(iterations) {
		panic(runtime.NewTypeError("The \"iterations\" argument must be an integer"))
	}
	if iterations <= 0 {
		panic(runtime.NewTypeError("The \"iterations\" argument must be of type number greater than 0"))
	}
	// 防止极大值导致程序卡死或超时
	if iterations > CryptoMaxInt32 { // int32 max
		panic(runtime.NewTypeError("The value of \"iterations\" is out of range. It must be <= 2147483647"))
	}

	// 检查 keylen 是否为整数
	keyLenFloat := keyLenVal.ToFloat()
	keyLen := int(keyLenVal.ToInteger())
	if keyLenFloat != float64(keyLen) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be an integer"))
	}
	if keyLen <= 0 {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}
	// 防止极大值导致内存分配失败
	if keyLen > CryptoMaxInt32 { // int32 max，约 2GB
		panic(runtime.NewTypeError("The value of \"keylen\" is out of range. It must be <= 2147483647"))
	}

	digest := SafeGetString(digestVal)
	if digest == "" {
		panic(runtime.NewTypeError("The \"digest\" argument must be of type string"))
	}

	// 在参数验证阶段就检查 digest 是否有效，同步抛出错误
	hf := getKDFHashFunc(runtime, digest)

	// 仿照 randomBytes，使用 setImmediate 调度，仍在同一线程执行
	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		asyncCallback := func(goja.FunctionCall) goja.Value {
			var errVal goja.Value = goja.Null()
			var resVal goja.Value = goja.Undefined()
			defer func() {
				_, _ = callback(goja.Undefined(), errVal, resVal)
			}()

			// 实际计算
			derivedKey := pbkdf2.Key(password, salt, iterations, keyLen, hf)
			resVal = CreateBuffer(runtime, derivedKey)
			return goja.Undefined()
		}

		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		return goja.Undefined()
	}

	// 无 setImmediate，降级为同步执行
	derivedKey := pbkdf2.Key(password, salt, iterations, keyLen, hf)
	_, _ = callback(goja.Undefined(), goja.Null(), CreateBuffer(runtime, derivedKey))
	return goja.Undefined()
}

// ---------------- scrypt ----------------

// ScryptSync 实现 crypto.scryptSync
func ScryptSync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("scryptSync 需要 password, salt, keylen 参数"))
	}

	passwordVal := call.Arguments[0]
	saltVal := call.Arguments[1]
	keyLenVal := call.Arguments[2]

	password, err := ConvertToBytes(runtime, passwordVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"password\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	salt, err := ConvertToBytes(runtime, saltVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"salt\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}

	// 严格检查 keylen 类型和边界
	// 先检查是否为字符串类型
	if keyLenVal.ExportType().Kind().String() == "string" {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number"))
	}

	keyLenFloat := keyLenVal.ToFloat()
	keyLen := int(keyLenVal.ToInteger())

	// 检查 NaN
	if math.IsNaN(keyLenFloat) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be an integer"))
	}
	// 检查 Infinity
	if math.IsInf(keyLenFloat, 0) {
		panic(runtime.NewTypeError("The value of \"keylen\" is out of range. It must be an integer"))
	}
	// 检查是否为整数
	if keyLenFloat != float64(keyLen) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be an integer"))
	}
	// 检查负数
	if keyLen < 0 {
		panic(runtime.NewTypeError("The \"keylen\" argument must be >= 0"))
	}
	// 检查超大值（防止内存分配失败）
	if keyLen > CryptoMaxInt32 {
		panic(runtime.NewTypeError("The value of \"keylen\" is out of range. It must be <= 2147483647"))
	}

	// 默认参数参照 Node.js：N=16384, r=8, p=1, maxmem=32MB
	N := 16384
	r := 8
	p := 1
	maxmem := ScryptDefaultMaxMem

	// 解析 options 参数
	if len(call.Arguments) >= 4 && !goja.IsUndefined(call.Arguments[3]) && !goja.IsNull(call.Arguments[3]) {
		if opts, ok := call.Arguments[3].(*goja.Object); ok {
			// 解析 N 参数
			if v := opts.Get("N"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				nFloat := v.ToFloat()
				nInt := int(v.ToInteger())

				// 检查类型（必须是数字）
				if v.ExportType().Kind().String() == "string" {
					panic(runtime.NewTypeError("The \"options.N\" property must be of type number"))
				}
				// 检查 NaN
				if math.IsNaN(nFloat) {
					panic(runtime.NewTypeError("The \"options.N\" property must be of type number"))
				}
				// 检查 Infinity
				if math.IsInf(nFloat, 0) {
					panic(runtime.NewTypeError("The value of \"options.N\" is out of range"))
				}
				// 检查负数
				if nInt < 0 {
					panic(runtime.NewTypeError("The value of \"options.N\" is out of range. It must be >= 0"))
				}
				// N=0 时使用默认值（Node.js 行为）
				if nInt > 0 {
					N = nInt
				}
			}

			// 解析 r 参数
			if v := opts.Get("r"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				rFloat := v.ToFloat()
				rInt := int(v.ToInteger())

				if v.ExportType().Kind().String() == "string" {
					panic(runtime.NewTypeError("The \"options.r\" property must be of type number"))
				}
				if math.IsNaN(rFloat) {
					panic(runtime.NewTypeError("The \"options.r\" property must be of type number"))
				}
				if math.IsInf(rFloat, 0) {
					panic(runtime.NewTypeError("The value of \"options.r\" is out of range"))
				}
				if rInt < 0 {
					panic(runtime.NewTypeError("The value of \"options.r\" is out of range. It must be >= 0"))
				}
				// r=0 时使用默认值
				if rInt > 0 {
					r = rInt
				}
			}

			// 解析 p 参数
			if v := opts.Get("p"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				pFloat := v.ToFloat()
				pInt := int(v.ToInteger())

				if v.ExportType().Kind().String() == "string" {
					panic(runtime.NewTypeError("The \"options.p\" property must be of type number"))
				}
				if math.IsNaN(pFloat) {
					panic(runtime.NewTypeError("The \"options.p\" property must be of type number"))
				}
				if math.IsInf(pFloat, 0) {
					panic(runtime.NewTypeError("The value of \"options.p\" is out of range"))
				}
				if pInt < 0 {
					panic(runtime.NewTypeError("The value of \"options.p\" is out of range. It must be >= 0"))
				}
				// p=0 时使用默认值
				if pInt > 0 {
					p = pInt
				}
			}

			// 解析 maxmem 参数
			if v := opts.Get("maxmem"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
				maxmemFloat := v.ToFloat()
				maxmemInt := int(v.ToInteger())

				// 检查 NaN
				if math.IsNaN(maxmemFloat) {
					panic(runtime.NewTypeError("The \"options.maxmem\" property must be of type number"))
				}
				// 检查 Infinity
				if math.IsInf(maxmemFloat, 0) {
					panic(runtime.NewTypeError("The value of \"options.maxmem\" is out of range"))
				}
				// 检查负数
				if maxmemInt < 0 {
					panic(runtime.NewTypeError("The value of \"options.maxmem\" is out of range. It must be >= 0"))
				}
				// maxmem=0 时使用默认值
				if maxmemInt > 0 {
					maxmem = maxmemInt
				}
			}
		}
	}

	// 验证 N 必须是 2 的幂
	if N > 1 && (N&(N-1)) != 0 {
		panic(runtime.NewTypeError("N must be a power of 2 greater than 1"))
	}

	// 验证基本范围
	if N <= 1 {
		panic(runtime.NewTypeError("N must be a power of 2 greater than 1"))
	}
	if r <= 0 {
		panic(runtime.NewTypeError("The value of \"options.r\" is out of range. It must be > 0"))
	}
	if p <= 0 {
		panic(runtime.NewTypeError("The value of \"options.p\" is out of range. It must be > 0"))
	}

	// 计算内存需求（根据 scrypt 算法）
	// 内存需求 = ScryptMemoryFactor * N * r
	memoryRequired := ScryptMemoryFactor * N * r
	if memoryRequired > maxmem {
		panic(runtime.NewGoError(&ScryptMemoryError{
			Required: memoryRequired,
			MaxMem:   maxmem,
		}))
	}

	// 检查极端大值（防止整数溢出和过长计算）
	if N > ScryptMaxParamThreshold || r > ScryptMaxParamThreshold || p > ScryptMaxParamThreshold {
		// 参数过大，可能导致内存溢出或计算时间过长
		if ScryptMemoryFactor*int64(N)*int64(r) > int64(maxmem) {
			panic(runtime.NewGoError(&ScryptMemoryError{
				Required: ScryptMemoryFactor * N * r,
				MaxMem:   maxmem,
			}))
		}
	}

	derivedKey, err := scrypt.Key(password, salt, N, r, p, keyLen)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	return CreateBuffer(runtime, derivedKey)
}

// Scrypt 实现 crypto.scrypt（异步）
func Scrypt(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 4 {
		panic(runtime.NewTypeError("scrypt 需要 password, salt, keylen, options, callback 参数"))
	}

	cbVal := call.Arguments[len(call.Arguments)-1]
	cbObj, ok := cbVal.(*goja.Object)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}
	callback, ok := goja.AssertFunction(cbObj)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}

	passwordVal := call.Arguments[0]
	saltVal := call.Arguments[1]
	keyLenVal := call.Arguments[2]
	optionsVal := call.Arguments[3]

	password, err := ConvertToBytes(runtime, passwordVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"password\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	salt, err := ConvertToBytes(runtime, saltVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"salt\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}

	keyLen := int(keyLenVal.ToInteger())
	if keyLen <= 0 {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}

	N := 16384
	r := 8
	p := 1

	if opts, ok := optionsVal.(*goja.Object); ok && opts != nil {
		if v := opts.Get("N"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
			N = int(v.ToInteger())
		}
		if v := opts.Get("r"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
			r = int(v.ToInteger())
		}
		if v := opts.Get("p"); v != nil && !goja.IsUndefined(v) && !goja.IsNull(v) {
			p = int(v.ToInteger())
		}
	}

	if N <= 1 || r <= 0 || p <= 0 {
		panic(runtime.NewTypeError("Invalid scrypt options (N must be >1, r>0, p>0)"))
	}

	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		asyncCallback := func(goja.FunctionCall) goja.Value {
			var errVal goja.Value = goja.Null()
			var resVal goja.Value = goja.Undefined()
			defer func() {
				_, _ = callback(goja.Undefined(), errVal, resVal)
			}()

			derivedKey, err := scrypt.Key(password, salt, N, r, p, keyLen)
			if err != nil {
				errVal = runtime.NewGoError(err)
				return goja.Undefined()
			}
			resVal = CreateBuffer(runtime, derivedKey)
			return goja.Undefined()
		}

		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		return goja.Undefined()
	}

	// 降级同步
	derivedKey, err := scrypt.Key(password, salt, N, r, p, keyLen)
	if err != nil {
		errVal := runtime.NewGoError(err)
		_, _ = callback(goja.Undefined(), errVal, goja.Null())
	} else {
		_, _ = callback(goja.Undefined(), goja.Null(), CreateBuffer(runtime, derivedKey))
	}
	return goja.Undefined()
}

// ---------------- HKDF ----------------

// HKDFSync 实现 crypto.hkdfSync
func HKDFSync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 5 {
		panic(runtime.NewTypeError("hkdfSync 需要 digest, ikm, salt, info, keylen 参数"))
	}

	digestVal := call.Arguments[0]
	ikmVal := call.Arguments[1]
	saltVal := call.Arguments[2]
	infoVal := call.Arguments[3]
	keyLenVal := call.Arguments[4]

	digest := SafeGetString(digestVal)
	if digest == "" {
		panic(runtime.NewTypeError("The \"digest\" argument must be of type string"))
	}

	hf := getKDFHashFunc(runtime, digest)

	ikm, err := ConvertToBytes(runtime, ikmVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"ikm\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	salt, err := ConvertToBytes(runtime, saltVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"salt\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	info, err := ConvertToBytes(runtime, infoVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"info\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}

	// 验证 keylen
	if goja.IsNaN(keyLenVal) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}
	if goja.IsInfinity(keyLenVal) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}

	keyLenFloat := keyLenVal.ToFloat()
	keyLen := int(keyLenFloat)

	// 检查是否为整数
	if keyLenFloat != float64(keyLen) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be an integer"))
	}

	if keyLen <= 0 {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}

	// 检查 info 长度限制（最大 1024 字节）
	if len(info) > 1024 {
		panic(runtime.NewTypeError("The \"info\" argument must not be longer than 1024 bytes"))
	}

	// 检查 keylen 最大值（255 * hash_length）
	hashLen := hf().Size()
	maxKeyLen := 255 * hashLen
	if keyLen > maxKeyLen {
		panic(runtime.NewTypeError("The \"keylen\" argument exceeds maximum length"))
	}

	rdr := hkdf.New(hf, ikm, salt, info)
	okm := make([]byte, keyLen)
	if _, err := rdr.Read(okm); err != nil {
		panic(runtime.NewGoError(err))
	}

	// 返回 ArrayBuffer 而不是 Buffer
	ab := runtime.NewArrayBuffer(okm)
	return runtime.ToValue(ab)
}

// HKDF 实现 crypto.hkdf（异步）
func HKDF(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 6 {
		panic(runtime.NewTypeError("hkdf 需要 digest, ikm, salt, info, keylen, callback 参数"))
	}

	digestVal := call.Arguments[0]
	ikmVal := call.Arguments[1]
	saltVal := call.Arguments[2]
	infoVal := call.Arguments[3]
	keyLenVal := call.Arguments[4]
	cbVal := call.Arguments[5]

	digest := SafeGetString(digestVal)
	if digest == "" {
		panic(runtime.NewTypeError("The \"digest\" argument must be of type string"))
	}

	cbObj, ok := cbVal.(*goja.Object)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}
	callback, ok := goja.AssertFunction(cbObj)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}

	hf := getKDFHashFunc(runtime, digest)

	ikm, err := ConvertToBytes(runtime, ikmVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"ikm\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	salt, err := ConvertToBytes(runtime, saltVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"salt\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	info, err := ConvertToBytes(runtime, infoVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"info\" argument must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}

	// 验证 keylen
	if goja.IsNaN(keyLenVal) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}
	if goja.IsInfinity(keyLenVal) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}

	keyLenFloat := keyLenVal.ToFloat()
	keyLen := int(keyLenFloat)

	// 检查是否为整数
	if keyLenFloat != float64(keyLen) {
		panic(runtime.NewTypeError("The \"keylen\" argument must be an integer"))
	}

	if keyLen <= 0 {
		panic(runtime.NewTypeError("The \"keylen\" argument must be of type number greater than 0"))
	}

	// 检查 info 长度限制（最大 1024 字节）
	if len(info) > 1024 {
		panic(runtime.NewTypeError("The \"info\" argument must not be longer than 1024 bytes"))
	}

	// 检查 keylen 最大值（255 * hash_length）
	hashLen := hf().Size()
	maxKeyLen := 255 * hashLen
	if keyLen > maxKeyLen {
		panic(runtime.NewTypeError("The \"keylen\" argument exceeds maximum length"))
	}

	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		asyncCallback := func(goja.FunctionCall) goja.Value {
			var errVal goja.Value = goja.Null()
			var resVal goja.Value = goja.Undefined()
			defer func() {
				_, _ = callback(goja.Undefined(), errVal, resVal)
			}()

			rdr := hkdf.New(hf, ikm, salt, info)
			okm := make([]byte, keyLen)
			if _, err := rdr.Read(okm); err != nil {
				errVal = runtime.NewGoError(err)
				return goja.Undefined()
			}
			// 返回 ArrayBuffer 而不是 Buffer
			ab := runtime.NewArrayBuffer(okm)
			resVal = runtime.ToValue(ab)
			return goja.Undefined()
		}

		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		return goja.Undefined()
	}

	// 降级同步
	rdr := hkdf.New(hf, ikm, salt, info)
	okm := make([]byte, keyLen)
	if _, err := rdr.Read(okm); err != nil {
		errVal := runtime.NewGoError(err)
		_, _ = callback(goja.Undefined(), errVal, goja.Null())
	} else {
		// 返回 ArrayBuffer 而不是 Buffer
		ab := runtime.NewArrayBuffer(okm)
		_, _ = callback(goja.Undefined(), goja.Null(), runtime.ToValue(ab))
	}
	return goja.Undefined()
}

// ---------------- Argon2 ----------------

type Argon2Parameters struct {
	Algorithm      string
	Message        []byte
	Nonce          []byte
	Parallelism    uint32
	TagLength      uint32
	Memory         uint32
	Passes         uint32
	Secret         []byte
	AssociatedData []byte
}

func parseArgon2Parameters(runtime *goja.Runtime, algorithmVal goja.Value, paramsVal goja.Value) *Argon2Parameters {
	if goja.IsUndefined(algorithmVal) || goja.IsNull(algorithmVal) {
		panic(runtime.NewTypeError("The \"algorithm\" argument is required and must be a string"))
	}
	algorithm := SafeGetString(algorithmVal)
	if algorithm == "" {
		panic(runtime.NewTypeError("The \"algorithm\" argument must be of type string"))
	}
	if algorithm != "argon2d" && algorithm != "argon2i" && algorithm != "argon2id" {
		panic(runtime.NewTypeError("Invalid algorithm: " + algorithm))
	}

	if goja.IsUndefined(paramsVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"parameters\" argument must be of type object. Received undefined"))
	}
	if goja.IsNull(paramsVal) {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"parameters\" argument must be of type object. Received null"))
	}
	paramsObj, ok := paramsVal.(*goja.Object)
	if !ok {
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"parameters\" argument must be of type object"))
	}

	var (
		p   Argon2Parameters
		err error
	)

	p.Algorithm = algorithm

	// 提取必需参数：message
	messageVal := paramsObj.Get("message")
	if messageVal == nil || goja.IsUndefined(messageVal) || goja.IsNull(messageVal) {
		panic(runtime.NewTypeError("The \"parameters.message\" property is required"))
	}
	p.Message, err = ConvertToBytes(runtime, messageVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"parameters.message\" property must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}

	// 提取必需参数：nonce
	nonceVal := paramsObj.Get("nonce")
	if nonceVal == nil || goja.IsUndefined(nonceVal) || goja.IsNull(nonceVal) {
		panic(runtime.NewTypeError("The \"parameters.nonce\" property is required"))
	}
	p.Nonce, err = ConvertToBytes(runtime, nonceVal)
	if err != nil {
		panic(runtime.NewTypeError("The \"parameters.nonce\" property must be of type string or an instance of Buffer, TypedArray, or DataView"))
	}
	if len(p.Nonce) < 8 {
		panic(runtime.NewTypeError("The \"parameters.nonce\" property must be at least 8 bytes long"))
	}

	// 提取必需参数：parallelism
	parallelismVal := paramsObj.Get("parallelism")
	if parallelismVal == nil || goja.IsUndefined(parallelismVal) || goja.IsNull(parallelismVal) {
		panic(runtime.NewTypeError("The \"parameters.parallelism\" property is required"))
	}
	// Node.js 要求参数类型为 number，这里拒绝字符串等其它类型
	switch parallelismVal.Export().(type) {
	case int64, int32, float64:
		// OK
	default:
		panic(runtime.NewTypeError("The \"parameters.parallelism\" property must be of type number"))
	}
	parallelismFloat := parallelismVal.ToFloat()
	parallelism := int(parallelismVal.ToInteger())
	if math.IsNaN(parallelismFloat) {
		panic(runtime.NewTypeError("The \"parameters.parallelism\" property must be of type number"))
	}
	if parallelismFloat != float64(parallelism) {
		panic(runtime.NewTypeError("The \"parameters.parallelism\" property must be an integer"))
	}
	if parallelism < 1 {
		panic(runtime.NewTypeError("The \"parameters.parallelism\" property must be greater than or equal to 1"))
	}
	if parallelism >= (1 << 24) {
		panic(runtime.NewTypeError("The \"parameters.parallelism\" property must be less than 16777215"))
	}

	// 提取必需参数：tagLength
	tagLengthVal := paramsObj.Get("tagLength")
	if tagLengthVal == nil || goja.IsUndefined(tagLengthVal) || goja.IsNull(tagLengthVal) {
		panic(runtime.NewTypeError("The \"parameters.tagLength\" property is required"))
	}
	// 与 parallelism 一致，保证类型为 number
	switch tagLengthVal.Export().(type) {
	case int64, int32, float64:
		// OK
	default:
		panic(runtime.NewTypeError("The \"parameters.tagLength\" property must be of type number"))
	}
	tagLengthFloat := tagLengthVal.ToFloat()
	tagLength := int(tagLengthVal.ToInteger())
	if math.IsNaN(tagLengthFloat) {
		panic(runtime.NewTypeError("The \"parameters.tagLength\" property must be of type number"))
	}
	if tagLengthFloat != float64(tagLength) {
		panic(runtime.NewTypeError("The \"parameters.tagLength\" property must be an integer"))
	}
	if tagLength < 4 {
		panic(runtime.NewTypeError("The \"parameters.tagLength\" property must be greater than or equal to 4"))
	}
	if tagLength > CryptoMaxInt32 {
		panic(runtime.NewTypeError("The \"parameters.tagLength\" property is out of range"))
	}

	// 提取必需参数：memory
	memoryVal := paramsObj.Get("memory")
	if memoryVal == nil || goja.IsUndefined(memoryVal) || goja.IsNull(memoryVal) {
		panic(runtime.NewTypeError("The \"parameters.memory\" property is required"))
	}
	memoryFloat := memoryVal.ToFloat()
	memory := int(memoryVal.ToInteger())
	if math.IsNaN(memoryFloat) {
		panic(runtime.NewTypeError("The \"parameters.memory\" property must be of type number"))
	}
	if memoryFloat != float64(memory) {
		panic(runtime.NewTypeError("The \"parameters.memory\" property must be an integer"))
	}
	if memory < 8*parallelism {
		panic(runtime.NewTypeError("The \"parameters.memory\" property must be greater than or equal to 8 * parallelism"))
	}
	if memory > CryptoMaxInt32 {
		panic(runtime.NewTypeError("The \"parameters.memory\" property is out of range"))
	}

	// 提取必需参数：passes
	passesVal := paramsObj.Get("passes")
	if passesVal == nil || goja.IsUndefined(passesVal) || goja.IsNull(passesVal) {
		panic(runtime.NewTypeError("The \"parameters.passes\" property is required"))
	}
	passesFloat := passesVal.ToFloat()
	passes := int(passesVal.ToInteger())
	if math.IsNaN(passesFloat) {
		panic(runtime.NewTypeError("The \"parameters.passes\" property must be of type number"))
	}
	if passesFloat != float64(passes) {
		panic(runtime.NewTypeError("The \"parameters.passes\" property must be an integer"))
	}
	if passes < 1 {
		panic(runtime.NewTypeError("The \"parameters.passes\" property must be greater than or equal to 1"))
	}
	if passes > CryptoMaxInt32 {
		panic(runtime.NewTypeError("The \"parameters.passes\" property is out of range"))
	}

	// 提取可选参数：secret
	secretVal := paramsObj.Get("secret")
	if secretVal != nil && !goja.IsUndefined(secretVal) && !goja.IsNull(secretVal) {
		p.Secret, err = ConvertToBytes(runtime, secretVal)
		if err != nil {
			panic(runtime.NewTypeError("The \"parameters.secret\" property must be of type string or an instance of Buffer, TypedArray, or DataView"))
		}
		if len(p.Secret) > CryptoMaxInt32 {
			panic(runtime.NewTypeError("The \"parameters.secret\" property is too long"))
		}
	}

	// 提取可选参数：associatedData
	adVal := paramsObj.Get("associatedData")
	if adVal != nil && !goja.IsUndefined(adVal) && !goja.IsNull(adVal) {
		p.AssociatedData, err = ConvertToBytes(runtime, adVal)
		if err != nil {
			panic(runtime.NewTypeError("The \"parameters.associatedData\" property must be of type string or an instance of Buffer, TypedArray, or DataView"))
		}
		if len(p.AssociatedData) > CryptoMaxInt32 {
			panic(runtime.NewTypeError("The \"parameters.associatedData\" property is too long"))
		}
	}

	p.Parallelism = uint32(parallelism)
	p.TagLength = uint32(tagLength)
	p.Memory = uint32(memory)
	p.Passes = uint32(passes)

	return &p
}

// Argon2Sync 实现 crypto.argon2Sync
func Argon2Sync(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 2 {
		// 与 Node.js 行为对齐：缺少 parameters 时抛出 ERR_INVALID_ARG_TYPE
		panic(NewNodeError(runtime, "ERR_INVALID_ARG_TYPE", "The \"parameters\" argument must be of type object. Received undefined"))
	}

	params := parseArgon2Parameters(runtime, call.Arguments[0], call.Arguments[1])

	// 使用 C 版 libargon2（或 stub）按规范处理 message/nonce/secret/associatedData
	derivedKey, err := argon2KeyFull(
		params.Algorithm,
		params.Message,
		params.Nonce,
		params.Secret,
		params.AssociatedData,
		params.Passes,
		params.Memory,
		params.Parallelism,
		params.TagLength,
	)
	if err != nil {
		panic(runtime.NewGoError(err))
	}

	return CreateBuffer(runtime, derivedKey)
}

// Argon2 实现 crypto.argon2（异步）
func Argon2(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) < 3 {
		panic(runtime.NewTypeError("argon2 requires algorithm, parameters, and callback arguments"))
	}

	// 最后一个参数必须是回调
	cbVal := call.Arguments[len(call.Arguments)-1]
	cbObj, ok := cbVal.(*goja.Object)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}
	callback, ok := goja.AssertFunction(cbObj)
	if !ok {
		panic(runtime.NewTypeError("The \"callback\" argument must be of type function"))
	}

	params := parseArgon2Parameters(runtime, call.Arguments[0], call.Arguments[1])

	// 使用 setImmediate 异步执行
	setImmediate := runtime.Get("setImmediate")
	if setImmediateFn, ok := goja.AssertFunction(setImmediate); ok {
		asyncCallback := func(goja.FunctionCall) goja.Value {
			var errVal goja.Value = goja.Null()
			var resVal goja.Value = goja.Undefined()
			defer func() {
				_, _ = callback(goja.Undefined(), errVal, resVal)
			}()

			derivedKey, err := argon2KeyFull(
				params.Algorithm,
				params.Message,
				params.Nonce,
				params.Secret,
				params.AssociatedData,
				params.Passes,
				params.Memory,
				params.Parallelism,
				params.TagLength,
			)
			if err != nil {
				errVal = runtime.NewGoError(err)
				return goja.Undefined()
			}

			resVal = CreateBuffer(runtime, derivedKey)
			return goja.Undefined()
		}

		_, _ = setImmediateFn(goja.Undefined(), runtime.ToValue(asyncCallback))
		return goja.Undefined()
	}

	// 无 setImmediate 时降级为同步执行，但仍通过回调返回结果
	derivedKey, err := argon2KeyFull(
		params.Algorithm,
		params.Message,
		params.Nonce,
		params.Secret,
		params.AssociatedData,
		params.Passes,
		params.Memory,
		params.Parallelism,
		params.TagLength,
	)
	if err != nil {
		errVal := runtime.NewGoError(err)
		_, _ = callback(goja.Undefined(), errVal, goja.Null())
	} else {
		_, _ = callback(goja.Undefined(), goja.Null(), CreateBuffer(runtime, derivedKey))
	}
	return goja.Undefined()
}
