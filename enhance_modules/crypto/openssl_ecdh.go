//go:build cgo

package crypto

/*
#cgo pkg-config: openssl

#include <openssl/ec.h>
#include <openssl/objects.h>
#include <openssl/obj_mac.h>
#include <openssl/evp.h>
#include <openssl/err.h>
#include <stdlib.h>
*/
import "C"

import (
	"fmt"
	"unsafe"

	"github.com/dop251/goja"
)

// opensslGetCurves 使用 OpenSSL 的 EC_get_builtin_curves 获取支持的椭圆曲线列表
func opensslGetCurves() []string {
	n := C.EC_get_builtin_curves(nil, 0)
	if n <= 0 {
		// 兜底返回目前 Go 实现支持的 4 条主流曲线
		return []string{"secp256k1", "prime256v1", "secp384r1", "secp521r1"}
	}

	curves := make([]C.EC_builtin_curve, n)
	if C.EC_get_builtin_curves(&curves[0], n) != n {
		return []string{"secp256k1", "prime256v1", "secp384r1", "secp521r1"}
	}

	out := make([]string, 0, int(n))
	for i := 0; i < int(n); i++ {
		name := C.OBJ_nid2sn(curves[i].nid)
		if name == nil {
			continue
		}
		s := C.GoString(name)
		if s != "" {
			out = append(out, s)
		}
	}

	return out
}

// OpenSSLECDHState 封装一个基于 OpenSSL EC_KEY 的 ECDH 状态
// 仅用于扩展 Node/OpenSSL 支持的附加曲线（prime192/prime239/secp224k1/brainpoolP* 等）
type OpenSSLECDHState struct {
	key       *C.EC_KEY
	nid       C.int
	curveName string
}

func newOpenSSLECDHState(curveName string) (*OpenSSLECDHState, error) {
	cname := C.CString(curveName)
	defer C.free(unsafe.Pointer(cname))

	nid := C.OBJ_sn2nid(cname)
	if nid == C.NID_undef {
		return nil, fmt.Errorf("Invalid ECDH curve: %s", curveName)
	}

	key := C.EC_KEY_new_by_curve_name(nid)
	if key == nil {
		return nil, opensslError("EC_KEY_new_by_curve_name")
	}

	// 按 Node/OpenSSL 行为，使用命名曲线表示
	C.EC_KEY_set_asn1_flag(key, C.OPENSSL_EC_NAMED_CURVE)

	return &OpenSSLECDHState{
		key:       key,
		nid:       nid,
		curveName: curveName,
	}, nil
}

func (s *OpenSSLECDHState) ensureKey() error {
	if s == nil || s.key == nil {
		return fmt.Errorf("ECDH key is not initialized")
	}
	return nil
}

func (s *OpenSSLECDHState) Close() {
	if s == nil || s.key == nil {
		return
	}
	C.EC_KEY_free(s.key)
	s.key = nil
}

// GenerateKeys 生成新的公私钥对并返回指定格式的公钥编码
func (s *OpenSSLECDHState) GenerateKeys(format string) ([]byte, error) {
	if err := s.ensureKey(); err != nil {
		return nil, err
	}
	if C.EC_KEY_generate_key(s.key) != 1 {
		return nil, opensslError("EC_KEY_generate_key")
	}
	return s.exportPublicKey(format)
}

func (s *OpenSSLECDHState) exportPublicKey(format string) ([]byte, error) {
	if err := s.ensureKey(); err != nil {
		return nil, err
	}
	group := C.EC_KEY_get0_group(s.key)
	point := C.EC_KEY_get0_public_key(s.key)
	if group == nil || point == nil {
		return nil, fmt.Errorf("ECDH public key is not set")
	}

	form := C.point_conversion_form_t(C.POINT_CONVERSION_UNCOMPRESSED)
	switch format {
	case "", "uncompressed":
		// 默认
	case "compressed":
		form = C.POINT_CONVERSION_COMPRESSED
	case "hybrid":
		form = C.POINT_CONVERSION_HYBRID
	default:
		return nil, fmt.Errorf("Invalid ECDH format: %s", format)
	}

	size := C.EC_POINT_point2oct(group, point, form, nil, 0, nil)
	if size == 0 {
		return nil, opensslError("EC_POINT_point2oct")
	}

	buf := make([]byte, int(size))
	written := C.EC_POINT_point2oct(group, point, form, (*C.uchar)(unsafe.Pointer(&buf[0])), C.size_t(size), nil)
	if written != size {
		return nil, opensslError("EC_POINT_point2oct")
	}

	return buf, nil
}

func (s *OpenSSLECDHState) exportPrivateKey() ([]byte, error) {
	if err := s.ensureKey(); err != nil {
		return nil, err
	}
	group := C.EC_KEY_get0_group(s.key)
	priv := C.EC_KEY_get0_private_key(s.key)
	if group == nil || priv == nil {
		return nil, fmt.Errorf("ECDH private key is not set")
	}

	degree := C.EC_GROUP_get_degree(group)
	if degree <= 0 {
		return nil, fmt.Errorf("invalid EC group degree")
	}
	byteLen := (degree + 7) / 8
	buf := make([]byte, int(byteLen))
	if C.BN_bn2binpad(priv, (*C.uchar)(unsafe.Pointer(&buf[0])), C.int(byteLen)) <= 0 {
		return nil, opensslError("BN_bn2binpad")
	}
	return buf, nil
}

// ComputeSecret 计算共享密钥，peer 为对端公钥的 octet 编码（支持 compressed/uncompressed/hybrid）
func (s *OpenSSLECDHState) ComputeSecret(peer []byte) ([]byte, error) {
	if err := s.ensureKey(); err != nil {
		return nil, err
	}
	if len(peer) == 0 {
		return nil, fmt.Errorf("peer public key is empty")
	}

	group := C.EC_KEY_get0_group(s.key)
	if group == nil {
		return nil, fmt.Errorf("EC group is not set")
	}

	point := C.EC_POINT_new(group)
	if point == nil {
		return nil, opensslError("EC_POINT_new")
	}
	defer C.EC_POINT_free(point)

	if C.EC_POINT_oct2point(group, point, (*C.uchar)(unsafe.Pointer(&peer[0])), C.size_t(len(peer)), nil) != 1 {
		return nil, opensslError("EC_POINT_oct2point")
	}

	degree := C.EC_GROUP_get_degree(group)
	if degree <= 0 {
		return nil, fmt.Errorf("invalid EC group degree")
	}
	byteLen := (degree + 7) / 8
	buf := make([]byte, int(byteLen))
	outLen := C.ECDH_compute_key(unsafe.Pointer(&buf[0]), C.size_t(byteLen), point, s.key, nil)
	if outLen <= 0 {
		return nil, opensslError("ECDH_compute_key")
	}

	return buf[:int(outLen)], nil
}

// newOpenSSLECDHObject 为附加曲线创建基于 OpenSSL 的 ECDH JS 对象
func newOpenSSLECDHObject(runtime *goja.Runtime, curveName string) (*goja.Object, error) {
	state, err := newOpenSSLECDHState(curveName)
	if err != nil {
		return nil, err
	}

	obj := runtime.NewObject()

	// generateKeys([encoding[, format]]) -> publicKey
	obj.Set("generateKeys", func(call goja.FunctionCall) goja.Value {
		var encoding string
		format := "uncompressed"
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			format = call.Arguments[1].String()
		}

		pub, err := state.GenerateKeys(format)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}
		return encodeBytesWithEncoding(runtime, pub, encoding)
	})

	// getPublicKey([encoding[, format]])
	obj.Set("getPublicKey", func(call goja.FunctionCall) goja.Value {
		var encoding string
		format := "uncompressed"
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			format = call.Arguments[1].String()
		}

		pub, err := state.exportPublicKey(format)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}
		return encodeBytesWithEncoding(runtime, pub, encoding)
	})

	// getPrivateKey([encoding])
	obj.Set("getPrivateKey", func(call goja.FunctionCall) goja.Value {
		var encoding string
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Arguments[0]) && !goja.IsNull(call.Arguments[0]) {
			encoding = call.Arguments[0].String()
		}

		priv, err := state.exportPrivateKey()
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}
		return encodeBytesWithEncoding(runtime, priv, encoding)
	})

	// computeSecret(otherPublicKey[, inputEncoding][, outputEncoding])
	obj.Set("computeSecret", func(call goja.FunctionCall) goja.Value {
		if len(call.Arguments) == 0 {
			panic(runtime.NewTypeError("computeSecret requires otherPublicKey argument"))
		}

		otherVal := call.Arguments[0]
		var inputEnc, outputEnc string
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Arguments[1]) && !goja.IsNull(call.Arguments[1]) {
			inputEnc = call.Arguments[1].String()
		}
		if len(call.Arguments) > 2 && !goja.IsUndefined(call.Arguments[2]) && !goja.IsNull(call.Arguments[2]) {
			outputEnc = call.Arguments[2].String()
		}

		otherBytes, err := decodeBytesWithEncoding(runtime, otherVal, inputEnc)
		if err != nil {
			panic(runtime.NewTypeError(fmt.Sprintf("Invalid otherPublicKey: %v", err)))
		}
		if len(otherBytes) == 0 {
			panic(runtime.NewTypeError("Invalid otherPublicKey: empty"))
		}

		shared, err := state.ComputeSecret(otherBytes)
		if err != nil {
			panic(runtime.NewTypeError(err.Error()))
		}
		return encodeBytesWithEncoding(runtime, shared, outputEnc)
	})

	return obj, nil
}
