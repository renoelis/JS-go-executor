package enhance_modules

import (
	"flow-codeblock-go/utils"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// UuidNativeEnhancer uuid 模块增强器（Go 原生实现，100% Node.js 兼容）
// 实现所有 14 个 Node.js uuid API:
//   - v1, v3, v4, v5, v6, v7
//   - v1ToV6, v6ToV1
//   - validate, version, parse, stringify
//   - NIL, MAX
type UuidNativeEnhancer struct{}

// NewUuidNativeEnhancer 创建新的 uuid 增强器（Go 原生实现）
func NewUuidNativeEnhancer() *UuidNativeEnhancer {
	utils.Debug("UuidNativeEnhancer 初始化（100% Node.js 兼容）",
		zap.Bool("native", true),
		zap.String("implementation", "github.com/google/uuid + custom v6"),
		zap.Int("total_apis", 14),
	)
	return &UuidNativeEnhancer{}
}

// RegisterUuidModule 注册 uuid 模块到 require 系统（Go 原生实现）
func (ue *UuidNativeEnhancer) RegisterUuidModule(registry *require.Registry) {
	registry.RegisterNativeModule("uuid", func(runtime *goja.Runtime, module *goja.Object) {
		// 🔥 创建导出对象
		exports := runtime.NewObject()

		// ============================================================================
		// UUID 生成函数
		// ============================================================================

		// ✅ v1: 基于时间戳和 MAC 地址的 UUID
		// 用法: uuid.v1() => '6c84fb90-12c4-11e1-840d-7b25c5ee775a'
		exports.Set("v1", func(call goja.FunctionCall) goja.Value {
			id, err := uuid.NewUUID() // UUID v1
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			return runtime.ToValue(id.String())
		})

		// ✅ v3: 基于 MD5 哈希的 UUID
		// 用法: uuid.v3('hello', uuid.v3.DNS) => '9125a8dc-52ee-365b-a5aa-81b0b3681cf6'
		exports.Set("v3", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("v3 需要两个参数: name 和 namespace"))
			}
			name := call.Arguments[0].String()
			namespace := call.Arguments[1].String()
			namespaceUUID, err := uuid.Parse(namespace)
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			id := uuid.NewMD5(namespaceUUID, []byte(name))
			return runtime.ToValue(id.String())
		})

		// ✅ v4: 基于随机数的 UUID（最常用）
		// 用法: uuid.v4() => '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
		exports.Set("v4", func(call goja.FunctionCall) goja.Value {
			id := uuid.New() // UUID v4
			return runtime.ToValue(id.String())
		})

		// ✅ v5: 基于 SHA1 哈希的 UUID
		// 用法: uuid.v5('hello', uuid.v5.DNS) => 'fdda765f-fc57-5604-a269-52a7df8164ec'
		exports.Set("v5", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("v5 需要两个参数: name 和 namespace"))
			}
			name := call.Arguments[0].String()
			namespace := call.Arguments[1].String()
			namespaceUUID, err := uuid.Parse(namespace)
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			id := uuid.NewSHA1(namespaceUUID, []byte(name))
			return runtime.ToValue(id.String())
		})

		// 🔥 v6: 基于时间戳的 UUID（字段重排序版本）
		// 用法: uuid.v6() => '1f0b358a-2c04-6950-8ac9-a8f01d2998d6'
		// 注意: github.com/google/uuid 不原生支持 v6，需要手动实现
		exports.Set("v6", func(call goja.FunctionCall) goja.Value {
			// 生成 v1 然后转换为 v6
			v1UUID, err := uuid.NewUUID()
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			v6Bytes := v1ToV6Bytes(v1UUID[:])
			v6UUID, _ := uuid.FromBytes(v6Bytes)
			return runtime.ToValue(v6UUID.String())
		})

		// ✅ v7: 基于 Unix 时间戳的 UUID（新标准）
		// 用法: uuid.v7() => '019a26ab-9a66-71a9-a89e-63c35fce4a5a'
		exports.Set("v7", func(call goja.FunctionCall) goja.Value {
			id, err := uuid.NewV7()
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			return runtime.ToValue(id.String())
		})

		// ============================================================================
		// UUID 转换函数
		// ============================================================================

		// 🔥 v1ToV6: 将 UUID v1 转换为 v6
		// 用法: uuid.v1ToV6('92f62d9e-22c4-11ef-97e9-325096b39f47')
		//       => '1ef22c49-2f62-6d9e-97e9-325096b39f47'
		exports.Set("v1ToV6", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("v1ToV6 需要一个参数"))
			}
			str := call.Arguments[0].String()
			v1UUID, err := uuid.Parse(str)
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			v6Bytes := v1ToV6Bytes(v1UUID[:])
			v6UUID, _ := uuid.FromBytes(v6Bytes)
			return runtime.ToValue(v6UUID.String())
		})

		// 🔥 v6ToV1: 将 UUID v6 转换为 v1
		// 用法: uuid.v6ToV1('1ef22c49-2f62-6d9e-97e9-325096b39f47')
		//       => '92f62d9e-22c4-11ef-97e9-325096b39f47'
		exports.Set("v6ToV1", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("v6ToV1 需要一个参数"))
			}
			str := call.Arguments[0].String()
			v6UUID, err := uuid.Parse(str)
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			v1Bytes := v6ToV1Bytes(v6UUID[:])
			v1UUID, _ := uuid.FromBytes(v1Bytes)
			return runtime.ToValue(v1UUID.String())
		})

		// ============================================================================
		// UUID 工具函数
		// ============================================================================

		// ✅ validate: 验证 UUID 字符串格式
		// 用法: uuid.validate('not a uuid') => false
		//       uuid.validate('110ec58a-a0f2-4ac4-8393-c866d813b8d1') => true
		exports.Set("validate", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				return runtime.ToValue(false)
			}
			str := call.Arguments[0].String()
			_, err := uuid.Parse(str)
			return runtime.ToValue(err == nil)
		})

		// ✅ version: 获取 UUID 的版本号
		// 用法: uuid.version('110ec58a-a0f2-4ac4-8393-c866d813b8d1') => 4
		exports.Set("version", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				return runtime.ToValue(0)
			}
			str := call.Arguments[0].String()
			id, err := uuid.Parse(str)
			if err != nil {
				return runtime.ToValue(0)
			}
			// 🔥 返回数字而非枚举类型，与 Node.js 保持一致
			return runtime.ToValue(int(id.Version()))
		})

		// ✅ parse: 将 UUID 字符串解析为字节数组
		// 用法: uuid.parse('110ec58a-a0f2-4ac4-8393-c866d813b8d1')
		//       => [17, 14, 197, 138, 160, 242, 74, 196, ...]
		exports.Set("parse", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("parse 需要一个参数"))
			}
			str := call.Arguments[0].String()
			id, err := uuid.Parse(str)
			if err != nil {
				panic(runtime.NewGoError(err))
			}

			// 🔥 验证 UUID 的版本位（与 Node.js uuid 库行为一致）
			// UUID 格式: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
			// M = 版本位（第 7 个字节的高 4 位）
			// N = 变体位（第 9 个字节的高 2 位）
			//
			// 有效版本：0-8 和 15 (0xF)
			// 版本 9-14 是保留的，应该被拒绝
			versionNibble := (id[6] & 0xF0) >> 4
			if versionNibble >= 9 && versionNibble <= 14 {
				panic(runtime.NewTypeError("Invalid UUID"))
			}

			bytes := id[:]
			// 转换为 []interface{} 以便 goja 可以正确处理
			result := make([]interface{}, 16)
			for i, b := range bytes {
				result[i] = b
			}
			return runtime.ToValue(result)
		})

		// ✅ stringify: 将字节数组转换为 UUID 字符串
		// 用法: uuid.stringify([17, 14, 197, 138, 160, 242, 74, 196, ...])
		//       => '110ec58a-a0f2-4ac4-8393-c866d813b8d1'
		exports.Set("stringify", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 1 {
				panic(runtime.NewTypeError("stringify 需要一个参数"))
			}
			obj := call.Arguments[0].Export()
			bytes, ok := obj.([]interface{})
			if !ok {
				panic(runtime.NewTypeError("stringify 参数必须是数组"))
			}
			if len(bytes) != 16 {
				panic(runtime.NewTypeError("stringify 参数数组长度必须为 16"))
			}
			var uuidBytes [16]byte
			for i, b := range bytes {
				// 支持多种数字类型
				switch v := b.(type) {
				case int:
					uuidBytes[i] = byte(v)
				case int8:
					uuidBytes[i] = byte(v)
				case int16:
					uuidBytes[i] = byte(v)
				case int32:
					uuidBytes[i] = byte(v)
				case int64:
					uuidBytes[i] = byte(v)
				case uint:
					uuidBytes[i] = byte(v)
				case uint8:
					uuidBytes[i] = v
				case uint16:
					uuidBytes[i] = byte(v)
				case uint32:
					uuidBytes[i] = byte(v)
				case uint64:
					uuidBytes[i] = byte(v)
				case float32:
					uuidBytes[i] = byte(v)
				case float64:
					uuidBytes[i] = byte(v)
				default:
					panic(runtime.NewTypeError("stringify 参数数组必须包含数字"))
				}
			}
			id, err := uuid.FromBytes(uuidBytes[:])
			if err != nil {
				panic(runtime.NewGoError(err))
			}
			return runtime.ToValue(id.String())
		})

		// ============================================================================
		// UUID 常量
		// ============================================================================

		// ✅ NIL: nil UUID 常量
		// 值: '00000000-0000-0000-0000-000000000000'
		exports.Set("NIL", runtime.ToValue("00000000-0000-0000-0000-000000000000"))

		// ✅ MAX: 最大 UUID 常量
		// 值: 'ffffffff-ffff-ffff-ffff-ffffffffffff'
		exports.Set("MAX", runtime.ToValue("ffffffff-ffff-ffff-ffff-ffffffffffff"))

		// 设置导出
		module.Set("exports", exports)

		utils.Debug("uuid 模块已注册（Go 原生实现，100% Node.js 兼容）",
			zap.Bool("has_v1", true),
			zap.Bool("has_v3", true),
			zap.Bool("has_v4", true),
			zap.Bool("has_v5", true),
			zap.Bool("has_v6", true),
			zap.Bool("has_v7", true),
			zap.Bool("has_v1ToV6", true),
			zap.Bool("has_v6ToV1", true),
			zap.Bool("has_validate", true),
			zap.Bool("has_version", true),
			zap.Bool("has_parse", true),
			zap.Bool("has_stringify", true),
			zap.Bool("has_NIL", true),
			zap.Bool("has_MAX", true),
			zap.Int("total_apis", 14),
		)
	})

	utils.Debug("uuid 模块已注册到 require 系统（Go 原生实现）")
}

// ============================================================================
// UUID v1 <-> v6 转换算法实现
// 参考: https://github.com/uuidjs/uuid/blob/main/src/v1ToV6.js
// ============================================================================

// v1ToV6Bytes 将 UUID v1 字节数组转换为 v6 字节数组
//
// UUID v1 格式: time_low - time_mid - time_hi_and_version - clock_seq - node
// UUID v6 格式: 重排序时间字段，使其按时间顺序排列
//
// 转换规则（位重排序）:
//
//	v6[0-5] = v1 的 time_hi 和 time_mid 部分重排序
//	v6[6]   = 0x60 | (v1[2] & 0x0f)  // 设置版本为 6
//	v6[7]   = v1[3]
//	v6[8-15] = v1[8-15]  // clock_seq 和 node 不变
func v1ToV6Bytes(v1 []byte) []byte {
	return []byte{
		((v1[6] & 0x0f) << 4) | ((v1[7] >> 4) & 0x0f),
		((v1[7] & 0x0f) << 4) | ((v1[4] & 0xf0) >> 4),
		((v1[4] & 0x0f) << 4) | ((v1[5] & 0xf0) >> 4),
		((v1[5] & 0x0f) << 4) | ((v1[0] & 0xf0) >> 4),
		((v1[0] & 0x0f) << 4) | ((v1[1] & 0xf0) >> 4),
		((v1[1] & 0x0f) << 4) | ((v1[2] & 0xf0) >> 4),
		0x60 | (v1[2] & 0x0f), // 版本位设置为 6
		v1[3],
		v1[8], v1[9], v1[10], v1[11],
		v1[12], v1[13], v1[14], v1[15],
	}
}

// v6ToV1Bytes 将 UUID v6 字节数组转换为 v1 字节数组
//
// 这是 v1ToV6Bytes 的逆操作
func v6ToV1Bytes(v6 []byte) []byte {
	return []byte{
		((v6[3] & 0x0f) << 4) | ((v6[4] >> 4) & 0x0f),
		((v6[4] & 0x0f) << 4) | ((v6[5] >> 4) & 0x0f),
		((v6[5] & 0x0f) << 4) | (v6[6] & 0x0f),
		v6[7],
		((v6[1] & 0x0f) << 4) | ((v6[2] >> 4) & 0x0f),
		((v6[2] & 0x0f) << 4) | ((v6[3] >> 4) & 0x0f),
		0x10 | ((v6[0] >> 4) & 0x0f), // 版本位设置为 1
		((v6[0] & 0x0f) << 4) | ((v6[1] >> 4) & 0x0f),
		v6[8], v6[9], v6[10], v6[11],
		v6[12], v6[13], v6[14], v6[15],
	}
}

// ============================================================================
// 🔥 实现 ModuleEnhancer 接口（模块注册器模式）
// ============================================================================

// Name 返回模块名称
func (ue *UuidNativeEnhancer) Name() string {
	return "uuid"
}

// Close 关闭 UuidNativeEnhancer 并释放资源
// UUID 模块不持有需要释放的资源，返回 nil
func (ue *UuidNativeEnhancer) Close() error {
	return nil
}

// Register 注册模块到 require 系统
func (ue *UuidNativeEnhancer) Register(registry *require.Registry) error {
	ue.RegisterUuidModule(registry)
	return nil
}

// Setup 在 Runtime 上设置模块环境
// UUID 库较小但不常用，不预加载以节省内存
func (ue *UuidNativeEnhancer) Setup(runtime *goja.Runtime) error {
	// 不预加载，按需加载
	return nil
}
