package crypto

// 通用数值上限常量，集中管理 Node.js 对齐相关的 int32 边界
const (
	// CryptoMaxInt32 表示 32 位有符号整数的最大值 2^31-1，用于对齐 Node.js 中
	// 各种 "<= 2147483647" 的参数范围检查（iterations、keylen、options.length 等）。
	CryptoMaxInt32 = 2147483647
)

// Scrypt 相关常量
const (
	// ScryptDefaultMaxMem 是 scrypt 算法的默认最大内存限制（32MB）
	// 对齐 Node.js v25.0.0 的默认行为
	ScryptDefaultMaxMem = 32 * 1024 * 1024 // 32MB

	// ScryptMemoryFactor 是 scrypt 内存需求计算系数
	// 内存需求 = ScryptMemoryFactor * N * r
	ScryptMemoryFactor = 128

	// ScryptMaxParamThreshold 是 N/r/p 参数的极端大值检查阈值
	// 超过此值时需要进行额外的内存溢出防护
	ScryptMaxParamThreshold = 1 << 20 // 2^20 = 1048576
)
