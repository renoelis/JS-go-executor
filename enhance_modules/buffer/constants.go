package buffer

// Buffer 相关常量定义
// 用于统一管理所有魔法数字，提高代码可维护性

const (
	// ===== 内存分配相关常量 =====

	// DefaultPoolSize Buffer 池的默认大小（8KB），与 Node.js 一致
	DefaultPoolSize = 8192 // 8 * 1024

	// PoolThresholdRatio 池分配阈值比例
	// 当请求大小超过池大小的此比例时，直接分配新内存而不使用池
	PoolThresholdRatio = 2 // poolSize / 2

	// MmapThreshold 使用 mmap 分配的阈值（10MB）
	// 超过此大小的 Buffer 使用 mmap 优化分配性能
	MmapThreshold = 10 * 1024 * 1024 // 10MB

	// MaxPracticalLength 实用的内存限制（2GB = 2^31 - 1）
	// 统一的内存分配限制，用于所有场景：
	// - Buffer/ArrayBuffer 长度限制（Node.js 兼容）
	// - Go 层面的内存分配检查
	// - 防止系统内存耗尽
	// 在 64 位系统上约为 2GB (0x7FFFFFFF)，与 Node.js buffer.constants.MAX_LENGTH 一致
	MaxPracticalLength = 2147483647 // 2^31 - 1

	// MaxSafeInteger JavaScript Number.MAX_SAFE_INTEGER
	// Buffer 大小的理论最大值
	MaxSafeInteger = 9007199254740991

	// MaxStringLength 单个字符串实例允许的最大长度
	// Node.js v25 的值，约为 2^29 - 24 (~536MB)
	MaxStringLength = 536870888

	// ===== 性能优化相关常量 =====

	// SmallBufferThreshold 小 Buffer 优化阈值（4KB）
	// 小于此大小的 Buffer 使用栈上分配优化
	SmallBufferThreshold = 4096 // 4 * 1024

	// HexEncodeBatchSize hex 编码批量处理大小（8 字节）
	// SIMD 优化的批量处理单位
	HexEncodeBatchSize = 8

	// ===== 编码池相关常量 =====

	// EncodingPoolLevel1 编码池第 1 级容量（8KB）
	EncodingPoolLevel1 = 8 * 1024

	// EncodingPoolLevel2 编码池第 2 级容量（16KB）
	EncodingPoolLevel2 = 16 * 1024

	// EncodingPoolLevel3 编码池第 3 级容量（32KB）
	EncodingPoolLevel3 = 32 * 1024

	// EncodingPoolLevel4 编码池第 4 级容量（64KB）
	EncodingPoolLevel4 = 64 * 1024

	// EncodingPoolLevel5 编码池第 5 级容量（128KB）
	EncodingPoolLevel5 = 128 * 1024

	// EncodingPoolLevel6 编码池第 6 级容量（256KB）
	EncodingPoolLevel6 = 256 * 1024

	// EncodingPoolLevel7 编码池第 7 级容量（512KB）
	EncodingPoolLevel7 = 512 * 1024

	// EncodingPoolLevel8 编码池第 8 级容量（1MB）
	EncodingPoolLevel8 = 1024 * 1024

	// EncodingPoolLevel9 编码池第 9 级容量（2MB）
	EncodingPoolLevel9 = 2 * 1024 * 1024

	// EncodingPoolLevel10 编码池第 10 级容量（10MB）
	EncodingPoolLevel10 = 10 * 1024 * 1024

	// EncodingPoolLevelCount 编码池级别数量
	EncodingPoolLevelCount = 10

	// ===== 字节掩码相关常量 =====

	// ByteMask 字节掩码（0xFF）
	ByteMask = 0xFF

	// Int8Min int8 最小值（-128）
	Int8Min = -128

	// Int8Max int8 最大值（127）
	Int8Max = 127

	// Uint8Max uint8 最大值（255）
	Uint8Max = 255

	// ===== Mmap 资源管理相关常量 =====

	// MmapCleanupInterval mmap 资源清理间隔（30秒）
	MmapCleanupInterval = 30 // 秒

	// MmapLeakTimeout mmap 资源泄漏超时时间（5分钟）
	// 超过此时间未释放的资源视为泄漏
	MmapLeakTimeout = 5 * 60 // 秒

	// MmapCleanupBatchSize mmap 清理批量大小
	// 预分配容量，减少内存分配
	MmapCleanupBatchSize = 64

	// ===== 字符编码相关常量 =====

	// UTF8MaxBytes UTF-8 字符的最大字节数（4字节）
	UTF8MaxBytes = 4

	// UTF16CodeUnitSize UTF-16 码元大小（2字节）
	UTF16CodeUnitSize = 2

	// HexInvalidByte hex 解码时的无效字节标记
	HexInvalidByte = 255

	// ===== Base64 相关常量 =====

	// Base64PaddingChar Base64 填充字符
	Base64PaddingChar = '='

	// Base64BlockSize Base64 编码块大小（4字节）
	Base64BlockSize = 4

	// Base64InputBlockSize Base64 输入块大小（3字节）
	Base64InputBlockSize = 3

	// ===== 数值范围相关常量 =====

	// Int16Min int16 最小值（-32768）
	Int16Min = -32768

	// Int16Max int16 最大值（32767）
	Int16Max = 32767

	// Uint16Max uint16 最大值（65535）
	Uint16Max = 65535

	// Int32Min int32 最小值（-2147483648）
	Int32Min = -2147483648

	// Int32Max int32 最大值（2147483647）
	Int32Max = 2147483647

	// Uint32Max uint32 最大值（4294967295）
	Uint32Max = 4294967295

	// ===== 字符串缓存相关常量 =====

	// StringCacheSize 字符串缓存大小
	// 缓存 0-999 的字符串表示，用于优化索引访问
	StringCacheSize = 1000

	// ===== 性能测试相关常量 =====

	// BenchmarkIterations 基准测试迭代次数
	BenchmarkIterations = 1000

	// BenchmarkLargeBufferSize 基准测试大 Buffer 大小（1MB）
	BenchmarkLargeBufferSize = 1024 * 1024
)

// 编码名称常量
const (
	// EncodingUTF8 UTF-8 编码
	EncodingUTF8 = "utf8"

	// EncodingUTF8Alias UTF-8 编码别名
	EncodingUTF8Alias = "utf-8"

	// EncodingHex 十六进制编码
	EncodingHex = "hex"

	// EncodingBase64 Base64 编码
	EncodingBase64 = "base64"

	// EncodingBase64URL Base64URL 编码
	EncodingBase64URL = "base64url"

	// EncodingLatin1 Latin1 编码
	EncodingLatin1 = "latin1"

	// EncodingBinary Binary 编码（Latin1 别名）
	EncodingBinary = "binary"

	// EncodingASCII ASCII 编码
	EncodingASCII = "ascii"

	// EncodingUTF16LE UTF-16LE 编码
	EncodingUTF16LE = "utf16le"

	// EncodingUCS2 UCS-2 编码（UTF-16LE 别名）
	EncodingUCS2 = "ucs2"

	// EncodingUCS2Alias UCS-2 编码别名
	EncodingUCS2Alias = "ucs-2"
)
