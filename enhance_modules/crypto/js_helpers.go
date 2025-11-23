package crypto

import (
	"sync"

	"github.com/dop251/goja"
)

// 专用于 crypto.Hash 的 JS helper：Symbol 类型检测

var (
	cryptoIsSymbolProgram *goja.Program
	cryptoHelperOnce      sync.Once
)

// initCryptoJSHelpers 预编译 Symbol 检查函数
func initCryptoJSHelpers() {
	cryptoHelperOnce.Do(func() {
		var err error
		cryptoIsSymbolProgram, err = goja.Compile("crypto-symbol-check", `(function(arg) { return typeof arg === 'symbol'; })`, false)
		if err != nil {
			panic("Failed to compile crypto symbol check program: " + err.Error())
		}
	})
}

// getCryptoIsSymbolCheckFunc 获取 Symbol 类型检查函数
func getCryptoIsSymbolCheckFunc(runtime *goja.Runtime) goja.Callable {
	initCryptoJSHelpers()

	result, err := runtime.RunProgram(cryptoIsSymbolProgram)
	if err == nil {
		if fn, ok := goja.AssertFunction(result); ok {
			return fn
		}
	}
	return nil
}
