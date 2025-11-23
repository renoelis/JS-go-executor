//go:build linux && cgo

package crypto

/*
#cgo LDFLAGS: -largon2
#include <stdlib.h>
#include <argon2.h>
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
