//go:build !cgo

package crypto

import (
	"fmt"

	"github.com/dop251/goja"
)

// 非 cgo 构建下的占位实现，保持编译通过，但不提供额外曲线支持

func opensslGetCurves() []string {
	// 退化为当前纯 Go 实现支持的 4 条曲线
	return []string{"secp256k1", "prime256v1", "secp384r1", "secp521r1"}
}

func newOpenSSLECDHObject(runtime *goja.Runtime, curveName string) (*goja.Object, error) {
	return nil, fmt.Errorf("OpenSSL ECDH is not available for curve %s", curveName)
}
