package fetch

import (
	"context"
	"io"
	"sync"
	"time"

	"flow-codeblock-go/utils"

	"go.uber.org/zap"
)

// ==================== bodyWithCancel ====================

// bodyWithCancel 包装 io.ReadCloser，提供多层超时保护
// 🔥 v2.4.3: 增加空闲超时机制，防止资源泄漏
// 🔥 v2.5.0: 动态超时 - 根据响应大小智能调整超时时间
// 🔥 v2.5.1: 修复 - 区分"空闲"和"活跃读取"，避免误杀正在使用的 stream
// 🔥 v2.5.3: 双重超时保护 + 延迟 context 取消（适配 60秒执行超时）
//
// 双重超时保护策略:
// 1. **空闲超时 (idleTimer)**:
//    - 触发条件: "从创建到第一次 Read()" 的时间超过 idleTimeout
//    - 目的: 防止用户完全不读取 body 导致资源泄漏
//    - 行为: 第一次 Read() 时自动停止，不影响正常读取
//    - 时间: 10-20-30 秒递进（基于响应大小）
//
// 2. **总时长超时 (totalTimer)**:
//    - 触发条件: "从创建到 Close()" 的总时长超过 totalTimeout
//    - 目的: 防止慢速读取攻击（每隔一段时间读 1 字节）
//    - 行为: 始终运行，直到 body 关闭
//    - 时间: 默认 35 秒（适配 60 秒执行超时）
//
// 3. **延迟 context 取消**:
//    - cancel 在 body.Close() 时调用，确保读取时 context 有效
//    - 避免过早取消导致 body 读取失败
//
// ⚠️ 重要：所有超时必须 < EXECUTION_TIMEOUT（60秒），否则会被代码执行超时抢先触发
type bodyWithCancel struct {
	io.ReadCloser
	cancel        context.CancelFunc // 🔥 延迟取消：在 Close() 时调用，防止过早取消导致 body 读取失败
	idleTimer     *time.Timer        // 🔥 空闲超时 timer（第一次读取后停止）
	totalTimer    *time.Timer        // 🔥 总时长超时 timer（防止慢速读取攻击）
	mutex         sync.Mutex         // 🔥 保护 closed 状态
	closed        bool               // 🔥 标记是否已关闭
	idleTimeout   time.Duration      // 🔥 空闲超时配置
	totalTimeout  time.Duration      // 🔥 总时长超时配置
	contentLength int64              // 🔥 响应大小（用于日志）
	hasRead       bool               // 🔥 标记是否已开始读取
	createdAt     time.Time          // 🔥 创建时间（用于总时长计算）
}

// Read 读取数据，管理双重超时
func (b *bodyWithCancel) Read(p []byte) (n int, err error) {
	b.mutex.Lock()
	// 🔥 第一次读取时，停止空闲超时 timer
	// 原因：一旦开始读取，说明 stream 正在被使用，不应该有空闲超时
	// 但总时长超时 timer 继续运行（防止慢速读取攻击）
	if !b.hasRead && b.idleTimer != nil {
		b.idleTimer.Stop()
		b.idleTimer = nil // 释放空闲 timer
		b.hasRead = true
	}
	b.mutex.Unlock()

	return b.ReadCloser.Read(p)
}

// Close 关闭 body 并取消 context
// 🔥 v2.5.3: 延迟取消 - 在 body 关闭时才取消 context（保证 body 可读）
func (b *bodyWithCancel) Close() error {
	b.mutex.Lock()
	defer b.mutex.Unlock()

	if b.closed {
		return nil
	}
	b.closed = true

	// 停止所有超时 timer
	if b.idleTimer != nil {
		b.idleTimer.Stop()
	}
	if b.totalTimer != nil {
		b.totalTimer.Stop()
	}

	// 关闭底层 ReadCloser
	err := b.ReadCloser.Close()

	// 🔥 关键：在 body 关闭后才取消 context
	// 这样可以确保：
	//   1. body 读取时 context 仍然有效
	//   2. body 关闭后立即释放 context（防止泄漏）
	//   3. 即使 body 被传递给 FormData，只要 FormData 在读取，body 就不会 Close
	if b.cancel != nil {
		b.cancel()
	}

	return err
}

// ==================== 超时计算函数 ====================

// CalculateIdleTimeout 根据响应大小计算合理的空闲超时时间
// 🔥 v2.5.0: 动态超时策略
// 🔥 v2.5.3: 适配执行超时限制（确保 idleTimer < EXECUTION_TIMEOUT）
//
// 设计思路：
// - 小响应 (< 1MB):  最小 10 秒（给用户足够的处理时间）
// - 中等响应 (< 10MB): 最小 20 秒（更宽松的处理时间）
// - 大响应 (>= 10MB): 最小 30 秒（充足的准备时间）
// - 未知大小: 保守策略，最小 20 秒
//
// 计算示例（baseTimeout = 30秒）：
// - 小响应 < 1MB:   30秒 / 18 ≈ 1.6秒 → 最小 10秒 ✅
// - 中等响应 < 10MB: 30秒 / 6 = 5秒 → 最小 20秒 ✅
// - 大响应 >= 10MB:  30秒 → 最小 30秒 ✅
// - 未知大小:        30秒 / 6 = 5秒 → 最小 20秒 ✅
//
// 最小值说明（10-20-30 递进）：
//   - idleTimer 的作用：防止用户"完全不读取" body 导致资源泄漏
//   - 触发条件："从创建到第一次 Read()" 的时间
//   - 用户可能的操作：验证 headers、记录日志、条件判断等
//   - 10-20-30 秒给用户充足的时间，避免误杀正常流程
//
// ⚠️ 重要：baseTimeout 应配置为 < EXECUTION_TIMEOUT，否则大文件的 idleTimer 永远不会触发
func CalculateIdleTimeout(contentLength int64, baseTimeout time.Duration) time.Duration {
	// 兜底检查：如果基础超时无效，使用默认值
	if baseTimeout <= 0 {
		baseTimeout = 30 * time.Second // 🔥 默认 30秒（适配 60秒执行超时）
	}

	// 未知大小（Content-Length <= 0）：使用基础超时的 1/6
	// 策略：保守处理，给予中等超时
	if contentLength <= 0 {
		timeout := baseTimeout / 6
		if timeout < 20*time.Second {
			timeout = 20 * time.Second // 🔥 最小 20 秒（未知大小，保守策略）
		}
		return timeout
	}

	// 根据响应大小动态调整
	switch {
	case contentLength < 1024*1024: // < 1MB
		// 小响应：最小 10 秒
		// 示例：baseTimeout=30秒 → 30/18 ≈ 1.6秒 → 最小 10 秒
		// 理由：用户可能在读取前有处理逻辑（验证、日志、header 检查等）
		timeout := baseTimeout / 18
		if timeout < 10*time.Second {
			timeout = 10 * time.Second
		}
		return timeout

	case contentLength < 10*1024*1024: // < 10MB
		// 中等响应：最小 20 秒
		// 示例：baseTimeout=30秒 → 30/6 = 5秒 → 最小 20 秒
		timeout := baseTimeout / 6
		if timeout < 20*time.Second {
			timeout = 20 * time.Second
		}
		return timeout

	default: // >= 10MB
		// 大响应：最小 30 秒
		// 示例：baseTimeout=30秒 → 30秒 ✅
		timeout := baseTimeout
		if timeout < 30*time.Second {
			timeout = 30 * time.Second
		}
		return timeout
	}
}

// CreateBodyWithCancel 创建带双重超时保护的 bodyWithCancel
// 🔥 v2.4.3: 增加空闲超时机制，防止资源泄漏
// 🔥 v2.5.0: 动态超时 - 根据响应大小智能调整
// 🔥 v2.5.3: 双重超时保护 + 延迟 context 取消
//
// 参数说明:
// - body: 底层的 ReadCloser（通常是 http.Response.Body）
// - contentLength: 响应大小（Content-Length），用于动态计算超时
// - totalTimeout: 总时长超时（防止慢速读取攻击）
// - cancel: context.CancelFunc，在 body.Close() 时调用
// - baseIdleTimeout: 基础空闲超时（用于动态计算实际超时）
func CreateBodyWithCancel(
	body io.ReadCloser,
	contentLength int64,
	totalTimeout time.Duration,
	baseIdleTimeout time.Duration,
	cancel context.CancelFunc,
) *bodyWithCancel {
	// 🔥 空闲超时：完全不读取时触发（防止忘记 close）
	if baseIdleTimeout <= 0 {
		baseIdleTimeout = 30 * time.Second // 🔥 默认 30秒（适配 60秒执行超时）
	}
	idleTimeout := CalculateIdleTimeout(contentLength, baseIdleTimeout)

	// 🔥 总时长超时：防止慢速读取攻击
	// 示例：恶意代码每 10 秒读 1 字节，可以长时间占用连接
	if totalTimeout <= 0 {
		totalTimeout = 35 * time.Second // 🔥 默认 35秒（适配 60秒执行超时，留 5 秒缓冲）
	}

	wrapper := &bodyWithCancel{
		ReadCloser:    body,
		cancel:        cancel, // 🔥 保存 cancel，在 Close() 时调用
		idleTimeout:   idleTimeout,
		totalTimeout:  totalTimeout,
		contentLength: contentLength,
		createdAt:     time.Now(),
	}

	// 🔥 空闲超时 timer（第一次读取后停止）
	wrapper.idleTimer = time.AfterFunc(idleTimeout, func() {
		wrapper.mutex.Lock()
		if !wrapper.closed {
			sizeMB := float64(contentLength) / 1024 / 1024
			utils.Warn("HTTP response body 空闲超时,自动关闭（防止连接泄漏）",
				zap.Duration("idle_timeout", idleTimeout),
				zap.Float64("content_length_mb", sizeMB),
				zap.Duration("base_timeout", totalTimeout),
				zap.String("提示", "建议使用 response.json()/text() 或 response.body.cancel()"))
			wrapper.mutex.Unlock()
			wrapper.Close()
		} else {
			wrapper.mutex.Unlock()
		}
	})

	// 🔥 总时长超时 timer（始终运行，防止慢速读取攻击）
	wrapper.totalTimer = time.AfterFunc(totalTimeout, func() {
		wrapper.mutex.Lock()
		if !wrapper.closed {
			elapsed := time.Since(wrapper.createdAt)
			sizeMB := float64(contentLength) / 1024 / 1024
			utils.Warn("HTTP response body 读取超时,自动关闭（防止慢速读取攻击）",
				zap.Duration("total_timeout", totalTimeout),
				zap.Duration("elapsed", elapsed),
				zap.Float64("content_length_mb", sizeMB),
				zap.String("提示", "响应读取时间过长，可能是慢速攻击"))
			wrapper.mutex.Unlock()
			wrapper.Close()
		} else {
			wrapper.mutex.Unlock()
		}
	})

	return wrapper
}

// ==================== 注释说明 ====================
// 🔥 设计原则：
//
// 1. **双重超时保护**：
//    - 空闲超时：防止用户忘记 close body
//    - 总时长超时：防止慢速读取攻击
//    - 两者互补，覆盖所有资源泄漏场景
//
// 2. **动态超时策略**：
//    - 小文件短超时（10秒）：快速失败
//    - 中文件中超时（20秒）：平衡性能和容错
//    - 大文件长超时（30秒）：给用户足够准备时间
//
// 3. **延迟 context 取消**：
//    - body 读取时 context 有效
//    - body 关闭后立即释放 context
//    - 支持 body 传递给其他组件（如 FormData）
//
// 4. **执行超时适配**：
//    - 所有超时 < 60 秒（代码执行超时）
//    - 总时长超时 35 秒（留 5 秒缓冲）
//    - 空闲超时 10-30 秒（递进策略）
//
// 5. **线程安全**：
//    - 使用 mutex 保护 closed 状态
//    - timer 回调中检查状态避免重复关闭
//    - Close() 方法幂等，可多次调用
//
// 6. **日志和调试**：
//    - 超时时记录详细日志（超时类型、时长、大小等）
//    - 帮助用户定位问题（资源泄漏 vs 慢速攻击）
