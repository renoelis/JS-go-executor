//go:build !linux || !cgo

package crypto

import (
	"fmt"

	"golang.org/x/crypto/argon2"
)

// 非 linux/cgo 环境下的降级实现：仍然使用 Argon2i，保持与历史行为一致
func argon2dKey(message, nonce []byte, passes, memory uint32, parallelism uint32, tagLength uint32) []byte {
	return argon2.Key(message, nonce, passes, memory, uint8(parallelism), tagLength)
}

// argon2KeyFull 在非 linux/cgo 环境下的降级实现：
// - 若使用了 secret/associatedData，则返回错误，避免制造与 Node.js 行为不一致的“假支持”；
// - 否则退回 golang.org/x/crypto/argon2.{Key,IDKey}，保持与历史行为一致。
func argon2KeyFull(algo string, message, nonce, secret, ad []byte, passes, memory, parallelism, tagLength uint32) ([]byte, error) {
	if len(secret) > 0 || len(ad) > 0 {
		return nil, fmt.Errorf("argon2 secret and associatedData are not supported without libargon2 (cgo)")
	}

	switch algo {
	case "argon2d", "argon2i":
		return argon2.Key(message, nonce, passes, memory, uint8(parallelism), tagLength), nil
	case "argon2id":
		return argon2.IDKey(message, nonce, passes, memory, uint8(parallelism), tagLength), nil
	default:
		return nil, fmt.Errorf("unsupported argon2 algorithm: %s", algo)
	}
}
