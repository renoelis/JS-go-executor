//go:build linux && cgo

package crypto

/*
#cgo LDFLAGS: -largon2
#include <stdlib.h>
#include <stdint.h>
#include <string.h>
#include <argon2.h>

// go_argon2_hash_full 封装 argon2_ctx，支持 password/salt/secret/associated data 全参数，
// 以便在 Go 侧完全对齐 Node.js / Argon2 规范的行为。
static int go_argon2_hash_full(
	uint32_t algo,
	uint32_t t_cost,
	uint32_t m_cost,
	uint32_t parallelism,
	const unsigned char* pwd, size_t pwdlen,
	const unsigned char* salt, size_t saltlen,
	const unsigned char* secret, size_t secretlen,
	const unsigned char* ad, size_t adlen,
	unsigned char* out, size_t outlen
)
{
	argon2_context ctx;
	memset(&ctx, 0, sizeof(ctx));

	ctx.out = (uint8_t*)out;
	ctx.outlen = (uint32_t)outlen;

	ctx.pwd = (uint8_t*)pwd;
	ctx.pwdlen = (uint32_t)pwdlen;

	ctx.salt = (uint8_t*)salt;
	ctx.saltlen = (uint32_t)saltlen;

	ctx.secret = (uint8_t*)secret;
	ctx.secretlen = (uint32_t)secretlen;

	ctx.ad = (uint8_t*)ad;
	ctx.adlen = (uint32_t)adlen;

	ctx.t_cost = t_cost;
	ctx.m_cost = m_cost;
	ctx.lanes = parallelism;
	ctx.threads = parallelism;
	ctx.version = ARGON2_VERSION_13;
	ctx.allocate_cbk = NULL;
	ctx.free_cbk = NULL;
	ctx.flags = ARGON2_DEFAULT_FLAGS;

	argon2_type type;
	switch (algo) {
	case 0:
		type = Argon2_d;
		break;
	case 1:
		type = Argon2_i;
		break;
	case 2:
		type = Argon2_id;
		break;
	default:
		return ARGON2_INCORRECT_TYPE;
	}

	return argon2_ctx(&ctx, type);
}
*/
import "C"

import (
	"fmt"
	"unsafe"
)

// argon2dKey 使用系统 libargon2 的 argon2d_hash_raw 实现真正的 Argon2d 派生
// 参数语义与 golang.org/x/crypto/argon2.Key 保持一致：
//
//	passes      -> t_cost (迭代次数)
//	memory      -> m_cost (单位 KiB)
//	parallelism -> 并行度（lanes/threads）
//	tagLength   -> 输出长度（字节）
func argon2dKey(message, nonce []byte, passes, memory uint32, parallelism uint32, tagLength uint32) []byte {
	// 分配输出缓冲区
	out := make([]byte, tagLength)
	if tagLength == 0 {
		return out
	}

	// 处理空切片，避免对 &slice[0] 取址时越界
	var pwdPtr *C.uchar
	if len(message) > 0 {
		pwdPtr = (*C.uchar)(unsafe.Pointer(&message[0]))
	}

	var saltPtr *C.uchar
	if len(nonce) > 0 {
		saltPtr = (*C.uchar)(unsafe.Pointer(&nonce[0]))
	}

	outPtr := (*C.uchar)(unsafe.Pointer(&out[0]))

	// 使用通用接口 argon2_hash，type 选择 Argon2_d，version 使用 ARGON2_VERSION_13
	var encoded *C.char
	ret := C.argon2_hash(
		C.uint32_t(passes),
		C.uint32_t(memory),
		C.uint32_t(parallelism),
		unsafe.Pointer(pwdPtr), C.size_t(len(message)),
		unsafe.Pointer(saltPtr), C.size_t(len(nonce)),
		unsafe.Pointer(outPtr), C.size_t(len(out)),
		encoded, 0,
		C.Argon2_d,
		C.ARGON2_VERSION_13,
	)
	if ret != C.ARGON2_OK {
		// 正常情况下上层已做参数校验，这里失败多半是环境问题，直接 panic 让测试暴露
		panic(fmt.Sprintf("argon2d_hash_raw failed with code %d", int(ret)))
	}

	return out
}

// argon2KeyFull 使用系统 libargon2 的 argon2_ctx，实现完整的 Argon2d/Argon2i/Argon2id 派生，
// 支持 message/nonce/secret/associatedData 四个独立字段，行为与 Node.js v25 保持一致。
func argon2KeyFull(algo string, message, nonce, secret, ad []byte, passes, memory, parallelism, tagLength uint32) ([]byte, error) {
	out := make([]byte, tagLength)
	if tagLength == 0 {
		return out, nil
	}

	// 处理空切片，避免对 &slice[0] 取址时越界
	var pwdPtr *C.uchar
	if len(message) > 0 {
		pwdPtr = (*C.uchar)(unsafe.Pointer(&message[0]))
	}

	var saltPtr *C.uchar
	if len(nonce) > 0 {
		saltPtr = (*C.uchar)(unsafe.Pointer(&nonce[0]))
	}

	var secretPtr *C.uchar
	if len(secret) > 0 {
		secretPtr = (*C.uchar)(unsafe.Pointer(&secret[0]))
	}

	var adPtr *C.uchar
	if len(ad) > 0 {
		adPtr = (*C.uchar)(unsafe.Pointer(&ad[0]))
	}

	var algoCode C.uint32_t
	switch algo {
	case "argon2d":
		algoCode = 0
	case "argon2i":
		algoCode = 1
	case "argon2id":
		algoCode = 2
	default:
		return nil, fmt.Errorf("unsupported argon2 algorithm: %s", algo)
	}

	ret := C.go_argon2_hash_full(
		algoCode,
		C.uint32_t(passes),
		C.uint32_t(memory),
		C.uint32_t(parallelism),
		pwdPtr, C.size_t(len(message)),
		saltPtr, C.size_t(len(nonce)),
		secretPtr, C.size_t(len(secret)),
		adPtr, C.size_t(len(ad)),
		(*C.uchar)(unsafe.Pointer(&out[0])), C.size_t(len(out)),
	)
	if ret != C.ARGON2_OK {
		// 上层已完成参数校验，这里失败多半是环境/库问题，直接返回错误让调用方决定如何处理
		return nil, fmt.Errorf("argon2_ctx failed with code %d", int(ret))
	}

	return out, nil
}
