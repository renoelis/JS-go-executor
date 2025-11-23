//go:build cgo

package crypto

/*
#cgo pkg-config: openssl

#include <openssl/evp.h>
#include <openssl/err.h>
#include <stdlib.h>

// 获取 cipher
static const EVP_CIPHER* go_get_cipher_by_name(const char* name) {
	return EVP_get_cipherbyname(name);
}

// 分配/释放 EVP_CIPHER_CTX
static EVP_CIPHER_CTX* go_new_evp_cipher_ctx(void) {
	return EVP_CIPHER_CTX_new();
}

static void go_free_evp_cipher_ctx(EVP_CIPHER_CTX* ctx) {
	if (ctx != NULL) {
		EVP_CIPHER_CTX_free(ctx);
	}
}

// 拉取一条 OpenSSL 错误信息
static void go_get_openssl_error(char* buf, size_t len) {
	unsigned long err = ERR_get_error();
	if (err == 0) {
		if (len > 0) buf[0] = '\0';
		return;
	}
	ERR_error_string_n(err, buf, len);
}

// 包装获取 key/iv 长度，兼容宏/函数形式
static int go_evp_cipher_key_length(const EVP_CIPHER* cipher) {
	return EVP_CIPHER_key_length(cipher);
}

static int go_evp_cipher_iv_length(const EVP_CIPHER* cipher) {
	return EVP_CIPHER_iv_length(cipher);
}

static int go_evp_cipher_block_size(const EVP_CIPHER* cipher) {
	return EVP_CIPHER_block_size(cipher);
}

static int go_evp_cipher_nid(const EVP_CIPHER* cipher) {
	return EVP_CIPHER_nid(cipher);
}

// EVP_BytesToKey 封装，内部固定使用 MD5
static int go_evp_bytes_to_key(const EVP_CIPHER* cipher,
	unsigned char* salt,
	const unsigned char* data, int datalen,
	int count,
	unsigned char* key, unsigned char* iv) {
	return EVP_BytesToKey(cipher, EVP_md5(), salt, data, datalen, count, key, iv);
}

// CCM: 设置 IV 长度的封装，避免在 Go 侧直接使用 EVP_CTRL_CCM_SET_IVLEN 宏
static int go_evp_ccm_set_ivlen(EVP_CIPHER_CTX* ctx, int ivlen) {
	return EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_CCM_SET_IVLEN, ivlen, NULL);
}

// 通用 AEAD: 获取/设置 tag 的封装，用于 chacha20-poly1305 等
static int go_evp_aead_get_tag(EVP_CIPHER_CTX* ctx, int taglen, unsigned char* tag) {
	return EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_AEAD_GET_TAG, taglen, tag);
}

static int go_evp_aead_set_tag(EVP_CIPHER_CTX* ctx, int taglen, const unsigned char* tag) {
	return EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_AEAD_SET_TAG, taglen, (void*)tag);
}
*/
import "C"

import (
	"errors"
	"fmt"
	"strings"
	"unsafe"
)

// OpenSSL 对称加密封装（cgo）
//
// 说明：
// - 这一层只负责与 OpenSSL EVP Cipher 打交道，向上提供一个 Go 友好的 CipherCtx 接口
// - 具体的 Node.js 兼容行为（createCipher/iv、createDecipher/iv、Cipher/Decipher 对象方法）
//   会在 cipher.go 中实现，并通过 bridge.go 暴露给 JS

// CipherCtx 封装单个 OpenSSL EVP_CIPHER_CTX
//
// 注意：
// - CipherCtx 不是并发安全的，应保证每个实例只在单个 goroutine 中使用
// - 对应 JS 侧的 Cipher / Decipher 对象生命周期
type CipherCtx struct {
	ctx     *C.EVP_CIPHER_CTX
	encrypt bool
	name    string

	// CCM 模式下延迟初始化 key/iv 所需字段（遵循 OpenSSL 顺序要求）
	key              []byte
	iv               []byte
	keyIvInitialized bool
}

// opensslError 构造带有最近一次 OpenSSL 错误信息的错误
func opensslError(prefix string) error {
	var buf [256]C.char
	C.go_get_openssl_error(&buf[0], C.size_t(len(buf)))
	msg := C.GoString(&buf[0])
	if msg == "" {
		return fmt.Errorf("%s: unknown OpenSSL error", prefix)
	}
	return fmt.Errorf("%s: %s", prefix, msg)
}

func (c *CipherCtx) ensureOpen() error {
	if c == nil || c.ctx == nil {
		return errors.New("cipher context is closed")
	}
	return nil
}

// NewCipherCtxByName 通过 OpenSSL cipher 名称创建上下文
//
// 参数：
// - name: EVP_get_cipherbyname 支持的算法名（如 "aes-256-gcm"）
// - key:  原始 key 字节
// - iv:   原始 iv 字节
// - encrypt: true=加密，false=解密
func NewCipherCtxByName(name string, key, iv []byte, encrypt bool) (*CipherCtx, error) {
	cname := C.CString(name)
	defer C.free(unsafe.Pointer(cname))

	cipher := C.go_get_cipher_by_name(cname)
	if cipher == nil {
		// 与 Node.js ERR_CRYPTO_UNKNOWN_CIPHER 保持一致的错误文案关键字
		// JS 侧测试会检查 message 中是否包含 "unknown cipher"
		return nil, fmt.Errorf("unknown cipher: %s", name)
	}

	ctx := C.go_new_evp_cipher_ctx()
	if ctx == nil {
		return nil, errors.New("failed to allocate EVP_CIPHER_CTX")
	}

	c := &CipherCtx{
		ctx:     ctx,
		encrypt: encrypt,
		name:    name,
	}

	enc := C.int(0)
	if encrypt {
		enc = 1
	}

	// 第一次初始化：设置 cipher 和方向（加密/解密），暂不设置 key/iv
	if C.EVP_CipherInit_ex(ctx, cipher, nil, nil, nil, enc) != 1 {
		defer c.Close()
		return nil, opensslError("EVP_CipherInit_ex")
	}

	// 设置 key/iv（若提供）
	// 对于 CCM 模式，必须遵循 OpenSSL 要求的顺序：
	// 1. Init(cipher, enc)
	// 2. 设置 IV 长度 (EVP_CTRL_CCM_SET_IVLEN)
	// 3. 设置 tag 长度 (EVP_CTRL_CCM_SET_TAG)
	// 4. Init(key, iv)
	// 因此这里只保存 key/iv，实际初始化延迟到 ensureCCMKeyIV 中；同时预先设置 IV 长度。
	if c.isCCM() {
		if len(iv) > 0 {
			if C.go_evp_ccm_set_ivlen(ctx, C.int(len(iv))) != 1 {
				defer c.Close()
				return nil, opensslError("EVP_CIPHER_CTX_ctrl(SET_CCM_IVLEN)")
			}
		}
		if len(key) > 0 {
			c.key = append([]byte(nil), key...)
		}
		if len(iv) > 0 {
			c.iv = append([]byte(nil), iv...)
		}
	} else {
		var keyPtr *C.uchar
		var ivPtr *C.uchar
		if len(key) > 0 {
			keyPtr = (*C.uchar)(unsafe.Pointer(&key[0]))
		}
		if len(iv) > 0 {
			ivPtr = (*C.uchar)(unsafe.Pointer(&iv[0]))
		}

		if keyPtr != nil || ivPtr != nil {
			if C.EVP_CipherInit_ex(ctx, nil, nil, keyPtr, ivPtr, -1) != 1 {
				defer c.Close()
				return nil, opensslError("EVP_CipherInit_ex(key/iv)")
			}
		}
	}

	return c, nil
}

// blockSize 获取当前 cipher 的块大小（GCM 等流式模式下可能为 1）
func (c *CipherCtx) blockSize() int {
	if c == nil || c.ctx == nil {
		return 0
	}
	bs := C.EVP_CIPHER_CTX_block_size(c.ctx)
	if bs <= 0 {
		return 1
	}
	return int(bs)
}

// EnsureCCMKeyIV 确保在 CCM 模式下按正确顺序初始化 key/iv
//
// OpenSSL 要求：
// - 加密时必须在设置 tag 长度之后，再设置 key/iv
// - 我们在 NewCipherCtxByName 中仅设置 cipher 和方向，不设置 key/iv
// - 在首次设置 plaintextLength 时调用本方法完成 key/iv 初始化
func (c *CipherCtx) EnsureCCMKeyIV() error {
	if err := c.ensureOpen(); err != nil {
		return err
	}
	if !c.isCCM() {
		return nil
	}
	if c.keyIvInitialized {
		return nil
	}

	var keyPtr *C.uchar
	var ivPtr *C.uchar
	if len(c.key) > 0 {
		keyPtr = (*C.uchar)(unsafe.Pointer(&c.key[0]))
	}
	if len(c.iv) > 0 {
		ivPtr = (*C.uchar)(unsafe.Pointer(&c.iv[0]))
	}

	if keyPtr != nil || ivPtr != nil {
		if C.EVP_CipherInit_ex(c.ctx, nil, nil, keyPtr, ivPtr, -1) != 1 {
			return opensslError("EVP_CipherInit_ex(key/iv for CCM)")
		}
	}

	c.keyIvInitialized = true
	return nil
}

// SetCCMPlaintextLength 为 CCM 模式设置明文长度（必须在 setAAD/update 之前调用）
func (c *CipherCtx) SetCCMPlaintextLength(n int) error {
	if err := c.ensureOpen(); err != nil {
		return err
	}
	if !c.isCCM() {
		return fmt.Errorf("cipher %s does not support CCM plaintextLength", c.name)
	}
	if n < 0 {
		return fmt.Errorf("invalid plaintextLength: %d", n)
	}
	// 确保在设置 plaintextLength 之前，已完成 CCM 的 key/iv 初始化
	if err := c.EnsureCCMKeyIV(); err != nil {
		return err
	}
	var outLen C.int
	if C.EVP_CipherUpdate(c.ctx, nil, &outLen, nil, C.int(n)) != 1 {
		return opensslError("EVP_CipherUpdate(plaintextLength)")
	}
	return nil
}

// BytesToKey 使用 OpenSSL EVP_BytesToKey 派生对称密钥和 IV
//
// - name: cipher 名称（如 "aes-256-cbc"）
// - password: 密码字节
// - salt: 8 字节盐（可以为 nil，表示无盐）
// - count: 迭代次数（Node.js/OpenSSL 传统行为为 1）
//
// 返回派生出的 key 和 iv（某些算法的 iv 长度可能为 0，对应返回 nil）
func BytesToKey(name string, password, salt []byte, count int) (key []byte, iv []byte, err error) {
	cname := C.CString(name)
	defer C.free(unsafe.Pointer(cname))

	cipher := C.go_get_cipher_by_name(cname)
	if cipher == nil {
		return nil, nil, fmt.Errorf("unsupported cipher for EVP_BytesToKey: %s", name)
	}

	keyLen := int(C.go_evp_cipher_key_length(cipher))
	ivLen := int(C.go_evp_cipher_iv_length(cipher))
	if keyLen <= 0 {
		return nil, nil, fmt.Errorf("invalid cipher key length for %s", name)
	}

	key = make([]byte, keyLen)
	var ivBuf []byte
	var ivPtr *C.uchar
	if ivLen > 0 {
		ivBuf = make([]byte, ivLen)
		ivPtr = (*C.uchar)(unsafe.Pointer(&ivBuf[0]))
	}

	var saltPtr *C.uchar
	if len(salt) > 0 {
		if len(salt) < 8 {
			return nil, nil, fmt.Errorf("salt length must be at least 8 bytes, got %d", len(salt))
		}
		saltPtr = (*C.uchar)(unsafe.Pointer(&salt[0]))
	}

	var dataPtr *C.uchar
	dataLen := C.int(0)
	if len(password) > 0 {
		dataPtr = (*C.uchar)(unsafe.Pointer(&password[0]))
		dataLen = C.int(len(password))
	}

	if count <= 0 {
		count = 1
	}

	ret := int(C.go_evp_bytes_to_key(cipher, saltPtr, dataPtr, dataLen, C.int(count), (*C.uchar)(unsafe.Pointer(&key[0])), ivPtr))
	if ret <= 0 {
		return nil, nil, fmt.Errorf("EVP_BytesToKey failed for cipher %s", name)
	}

	if ivLen > 0 {
		iv = ivBuf
	}

	return key, iv, nil
}

// getCipherBasicInfo 获取 cipher 的基础信息，用于 getCipherInfo
// 若 cipher 不存在，则返回全 0
func getCipherBasicInfo(name string) (keyLen, ivLen, blockSize, nid int, err error) {
	cname := C.CString(name)
	defer C.free(unsafe.Pointer(cname))

	cipher := C.go_get_cipher_by_name(cname)
	if cipher == nil {
		return 0, 0, 0, 0, nil
	}

	keyLen = int(C.go_evp_cipher_key_length(cipher))
	ivLen = int(C.go_evp_cipher_iv_length(cipher))
	blockSize = int(C.go_evp_cipher_block_size(cipher))
	nid = int(C.go_evp_cipher_nid(cipher))
	return
}

// Update 处理一段数据，返回输出字节
func (c *CipherCtx) Update(in []byte) ([]byte, error) {
	if err := c.ensureOpen(); err != nil {
		return nil, err
	}
	if len(in) == 0 {
		return []byte{}, nil
	}

	// 为了兼容 AES Key Wrap with padding（aes*-wrap-pad）等算法，
	// 输出长度可能达到 len(in) + 2*blockSize，这里按更保守的上界分配缓冲区。
	outBufLen := len(in) + 2*c.blockSize()
	if outBufLen <= 0 {
		// blockSize() 返回 0 或异常时，退回到一个安全的默认值
		outBufLen = len(in) + 32
	}
	out := make([]byte, outBufLen)
	var outLen C.int

	var inPtr *C.uchar
	if len(in) > 0 {
		inPtr = (*C.uchar)(unsafe.Pointer(&in[0]))
	}

	if C.EVP_CipherUpdate(c.ctx, (*C.uchar)(unsafe.Pointer(&out[0])), &outLen, inPtr, C.int(len(in))) != 1 {
		return nil, opensslError("EVP_CipherUpdate")
	}

	return out[:int(outLen)], nil
}

// Final 结束当前 cipher，返回尾部输出（如 padding）
func (c *CipherCtx) Final() ([]byte, error) {
	if err := c.ensureOpen(); err != nil {
		return nil, err
	}

	out := make([]byte, c.blockSize())
	var outLen C.int
	if C.EVP_CipherFinal_ex(c.ctx, (*C.uchar)(unsafe.Pointer(&out[0])), &outLen) != 1 {
		return nil, opensslError("EVP_CipherFinal_ex")
	}

	return out[:int(outLen)], nil
}

// SetAutoPadding 控制是否启用 padding（CBC 等模式）
func (c *CipherCtx) SetAutoPadding(on bool) error {
	if err := c.ensureOpen(); err != nil {
		return err
	}
	pad := C.int(0)
	if on {
		pad = 1
	}
	if C.EVP_CIPHER_CTX_set_padding(c.ctx, pad) != 1 {
		return opensslError("EVP_CIPHER_CTX_set_padding")
	}
	return nil
}

// SetAAD 设置 GCM/CCM 等 AEAD 模式的附加认证数据
func (c *CipherCtx) SetAAD(aad []byte) error {
	if err := c.ensureOpen(); err != nil {
		return err
	}
	if len(aad) == 0 {
		return nil
	}
	var outLen C.int
	if C.EVP_CipherUpdate(c.ctx, nil, &outLen, (*C.uchar)(unsafe.Pointer(&aad[0])), C.int(len(aad))) != 1 {
		return opensslError("EVP_CipherUpdate(AAD)")
	}
	return nil
}

func (c *CipherCtx) isGCM() bool {
	return strings.Contains(strings.ToLower(c.name), "gcm")
}

func (c *CipherCtx) isCCM() bool {
	return strings.Contains(strings.ToLower(c.name), "ccm")
}

func (c *CipherCtx) isChaCha20Poly1305() bool {
	return strings.Contains(strings.ToLower(c.name), "chacha20-poly1305")
}

// SetCCMTagLength 在 CCM 加密端设置认证标签长度
func (c *CipherCtx) SetCCMTagLength(tagLen int) error {
	if err := c.ensureOpen(); err != nil {
		return err
	}
	if !c.isCCM() {
		return fmt.Errorf("cipher %s does not support CCM tag length", c.name)
	}
	if tagLen <= 0 {
		return fmt.Errorf("invalid CCM tag length: %d", tagLen)
	}
	if C.EVP_CIPHER_CTX_ctrl(c.ctx, C.EVP_CTRL_CCM_SET_TAG, C.int(tagLen), nil) != 1 {
		return opensslError("EVP_CIPHER_CTX_ctrl(SET_CCM_TAGLEN)")
	}
	return nil
}

// GetTag 获取 GCM/CCM 的认证标签（用于加密端）
func (c *CipherCtx) GetTag(tagLen int) ([]byte, error) {
	if err := c.ensureOpen(); err != nil {
		return nil, err
	}
	if tagLen <= 0 {
		return nil, fmt.Errorf("invalid tag length: %d", tagLen)
	}

	tag := make([]byte, tagLen)
	if c.isGCM() {
		// GCM
		if C.EVP_CIPHER_CTX_ctrl(c.ctx, C.EVP_CTRL_GCM_GET_TAG, C.int(tagLen), unsafe.Pointer(&tag[0])) != 1 {
			return nil, opensslError("EVP_CIPHER_CTX_ctrl(GET_GCM_TAG)")
		}
		return tag, nil
	}
	if c.isCCM() {
		// CCM
		if C.EVP_CIPHER_CTX_ctrl(c.ctx, C.EVP_CTRL_CCM_GET_TAG, C.int(tagLen), unsafe.Pointer(&tag[0])) != 1 {
			return nil, opensslError("EVP_CIPHER_CTX_ctrl(GET_CCM_TAG)")
		}
		return tag, nil
	}
	if c.isChaCha20Poly1305() {
		// 通用 AEAD（chacha20-poly1305）
		if C.go_evp_aead_get_tag(c.ctx, C.int(tagLen), (*C.uchar)(unsafe.Pointer(&tag[0]))) != 1 {
			return nil, opensslError("EVP_CIPHER_CTX_ctrl(GET_AEAD_TAG)")
		}
		return tag, nil
	}

	return nil, fmt.Errorf("cipher %s does not support AEAD tag", c.name)
}

// SetTag 设置 GCM/CCM 的认证标签（用于解密端）
func (c *CipherCtx) SetTag(tag []byte) error {
	if err := c.ensureOpen(); err != nil {
		return err
	}
	if len(tag) == 0 {
		return fmt.Errorf("tag must not be empty")
	}

	if c.isGCM() {
		if C.EVP_CIPHER_CTX_ctrl(c.ctx, C.EVP_CTRL_GCM_SET_TAG, C.int(len(tag)), unsafe.Pointer(&tag[0])) != 1 {
			return opensslError("EVP_CIPHER_CTX_ctrl(SET_GCM_TAG)")
		}
		return nil
	}
	if c.isCCM() {
		if C.EVP_CIPHER_CTX_ctrl(c.ctx, C.EVP_CTRL_CCM_SET_TAG, C.int(len(tag)), unsafe.Pointer(&tag[0])) != 1 {
			return opensslError("EVP_CIPHER_CTX_ctrl(SET_CCM_TAG)")
		}
		return nil
	}
	if c.isChaCha20Poly1305() {
		if C.go_evp_aead_set_tag(c.ctx, C.int(len(tag)), (*C.uchar)(unsafe.Pointer(&tag[0]))) != 1 {
			return opensslError("EVP_CIPHER_CTX_ctrl(SET_AEAD_TAG)")
		}
		return nil
	}

	return fmt.Errorf("cipher %s does not support AEAD tag", c.name)
}

// Close 释放底层 OpenSSL 资源
func (c *CipherCtx) Close() {
	if c == nil || c.ctx == nil {
		return
	}
	C.go_free_evp_cipher_ctx(c.ctx)
	c.ctx = nil
}
