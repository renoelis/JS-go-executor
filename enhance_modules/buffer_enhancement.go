// Package enhance_modules 提供各种模块增强器
//
// buffer_enhancement.go - Buffer 模块增强器
//
// 特性：
//   - ✅ 增强 Buffer 功能，补充官方 goja_nodejs 不支持的方法
//   - ✅ 支持多种编码（hex, base64, base64url, utf8, utf16le, ascii, latin1, binary）
//   - ✅ 支持数值读写方法（readInt8, writeInt8, readUInt16LE, writeFloatBE 等）
//   - ✅ 支持 BigInt 方法（readBigInt64LE, writeBigUInt64BE 等）
//   - ✅ 支持可变长度整数方法（readIntLE, writeUIntBE 等）
//   - ✅ 支持迭代器方法（entries, keys, values）
//
// 实现位置: enhance_modules/buffer/
package enhance_modules

import (
	"flow-codeblock-go/enhance_modules/buffer"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// BufferEnhancer Buffer增强器
type BufferEnhancer struct {
	*buffer.BufferEnhancer
}

// NewBufferEnhancer 创建新的Buffer增强器
func NewBufferEnhancer() *BufferEnhancer {
	return &BufferEnhancer{
		BufferEnhancer: buffer.NewBufferEnhancer(),
	}
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (be *BufferEnhancer) Name() string {
	return "buffer"
}

// Close 关闭 BufferEnhancer 并释放资源
// Buffer 模块不持有需要释放的资源，返回 nil
func (be *BufferEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
// Buffer 是全局对象，不需要 require，所以这里返回 nil
func (be *BufferEnhancer) Register(registry *require.Registry) error {
	// Buffer 不需要注册到 require 系统
	// 它是通过 goja_nodejs/buffer 提供的全局对象
	return nil
}

// Setup 在 Runtime 上设置模块环境
// 增强 Buffer 功能，添加额外的方法
func (be *BufferEnhancer) Setup(runtime *goja.Runtime) error {
	be.EnhanceBufferSupport(runtime)
	return nil
}
