package crypto

import (
	"crypto/rsa"
	"hash"
)

// ============================================================================
// 🔥 常量定义
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

// ============================================================================
// 🔥 类型定义（纯 Go 原生实现）
// ============================================================================

// HashState Hash 对象状态
type HashState struct {
	Hasher hash.Hash
	Data   []byte
}

// HmacState HMAC 对象状态
type HmacState struct {
	Hasher hash.Hash
	Data   []byte
}

// SignState Sign 对象状态
type SignState struct {
	Algorithm  string
	Data       []byte
	PrivateKey *rsa.PrivateKey
}

// VerifyState Verify 对象状态
type VerifyState struct {
	Algorithm string
	Data      []byte
	PublicKey *rsa.PublicKey
}

// RSAPSSParams RSA-PSS 密钥参数
type RSAPSSParams struct {
	HashAlgorithm        string // PSS 哈希算法 (e.g., "sha256")
	MGF1HashAlgorithm    string // MGF1 哈希算法 (e.g., "sha256")
	SaltLength           int    // Salt 长度
	HasHashAlgorithm     bool   // 是否明确指定了 hashAlgorithm
	HasMGF1HashAlgorithm bool   // 是否明确指定了 mgf1HashAlgorithm
	HasSaltLength        bool   // 是否明确指定了 saltLength
}
