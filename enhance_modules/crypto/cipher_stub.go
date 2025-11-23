//go:build !cgo

package crypto

import "github.com/dop251/goja"

func cipherUnsupported(runtime *goja.Runtime) goja.Value {
	panic(runtime.NewTypeError("crypto cipher requires cgo/OpenSSL; this binary was built without cgo"))
}

func CreateCipher(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	return cipherUnsupported(runtime)
}

func CreateDecipher(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	return cipherUnsupported(runtime)
}

func CreateCipheriv(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	return cipherUnsupported(runtime)
}

func CreateDecipheriv(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	return cipherUnsupported(runtime)
}
