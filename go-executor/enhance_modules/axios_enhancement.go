package enhance_modules

import (
	"fmt"
	"log"
	"sync"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// AxiosEnhancer axios 模块增强器
type AxiosEnhancer struct {
	embeddedCode    string        // 嵌入的 axios.js 代码
	compiledProgram *goja.Program // 编译后的程序缓存
	compileOnce     sync.Once     // 确保只编译一次
	compileErr      error         // 编译错误缓存
}

// NewAxiosEnhancer 创建新的 axios 增强器
func NewAxiosEnhancer(embeddedCode string) *AxiosEnhancer {
	log.Printf("📦 AxiosEnhancer 初始化，使用嵌入式 axios.js，大小: %d 字节", len(embeddedCode))

	return &AxiosEnhancer{
		embeddedCode: embeddedCode,
	}
}

// RegisterAxiosModule 注册 axios 模块到 require 系统
func (ae *AxiosEnhancer) RegisterAxiosModule(registry *require.Registry) {
	registry.RegisterNativeModule("axios", func(runtime *goja.Runtime, module *goja.Object) {
		// 确保 axios 代码已编译
		ae.compileOnce.Do(func() {
			var err error
			ae.compiledProgram, err = goja.Compile("axios.js", ae.embeddedCode, true)
			if err != nil {
				ae.compileErr = err
			}
		})

		if ae.compileErr != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to compile axios.js: %w", ae.compileErr)))
		}

		// 执行 axios.js 代码
		_, err := runtime.RunProgram(ae.compiledProgram)
		if err != nil {
			panic(runtime.NewGoError(fmt.Errorf("failed to load axios: %w", err)))
		}

		// 获取 axios 对象
		axiosVal := runtime.Get("axios")
		if axiosVal == nil || goja.IsUndefined(axiosVal) {
			panic(runtime.NewGoError(fmt.Errorf("axios object not found after loading axios.js")))
		}

		// 导出 axios
		module.Set("exports", axiosVal)
	})
}
