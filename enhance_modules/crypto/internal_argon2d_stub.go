//go:build !linux || !cgo

package crypto

import "golang.org/x/crypto/argon2"

// 非 linux/cgo 环境下的降级实现：仍然使用 Argon2i，保持与历史行为一致
func argon2dKey(message, nonce []byte, passes, memory uint32, parallelism uint32, tagLength uint32) []byte {
	return argon2.Key(message, nonce, passes, memory, uint8(parallelism), tagLength)
}
