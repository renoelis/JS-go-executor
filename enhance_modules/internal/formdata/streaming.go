package formdata

import (
	"bytes"
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"mime/multipart"
	"strings"
	"sync"
	"time"
)

// FormDataEntry 表示单个 FormData 字段
type FormDataEntry struct {
	Name        string      // 字段名
	Value       interface{} // 字段值（string、[]byte、io.Reader）
	Filename    string      // 文件名（可选，表示文件字段）
	ContentType string      // Content-Type（可选）
	KnownLength int64       // 已知长度（可选，用于 getLength/getLengthSync）
	HasKnownLen bool        // 是否显式提供 knownLength
}

// StreamingFormData 流式 FormData 处理器
// 🔥 核心优化：使用 io.Pipe 实现真正的流式处理，避免内存累积
type StreamingFormData struct {
	entries             []FormDataEntry
	boundary            string
	streamingEnabled    bool                  // 是否启用流式处理
	config              *FormDataStreamConfig // 配置
	bufferPool          *sync.Pool            // 内存池
	totalSize           int64                 // 预估总大小
	isStreamingMode     bool                  // 🔥 缓存检测到的模式（避免重复检测）
	modeDetected        bool                  // 🔥 模式是否已检测
	hasUnknownStreamLen bool                  // 是否存在未知长度的流（影响 getLengthSync/hasKnownLength）
}

// UnknownLengthStreamPlaceholder 用于标记未知长度的 Node.js Readable 流
// NeedsLength 表示是否需要按未知长度流处理（用于 hasKnownLength/getLengthSync）
type UnknownLengthStreamPlaceholder struct {
	NeedsLength bool
}

// FormDataStreamConfig 流式处理配置
type FormDataStreamConfig struct {
	// 🔥 新方案：差异化限制
	MaxBufferedFormDataSize  int64 // 缓冲模式限制：Web FormData + Blob、Node.js form-data + Buffer（默认 1MB）
	MaxStreamingFormDataSize int64 // 流式模式限制：Node.js form-data + Stream（默认 100MB）

	// 其他配置
	EnableChunkedUpload bool            // 启用分块传输编码
	BufferSize          int             // 缓冲区大小
	MaxFileSize         int64           // 单个文件最大大小
	Timeout             time.Duration   // 🔥 HTTP 请求超时（用于计算写入超时）
	Context             context.Context // 🔥 v2.4.2: HTTP 请求的 context（用于取消信号传递）

	// 🔧 废弃但保留兼容
	MaxFormDataSize    int64 // 废弃：统一限制，改用差异化限制
	StreamingThreshold int64 // 废弃：自动切换阈值，现由用户代码控制
}

// DefaultFormDataStreamConfigWithBuffer 创建带自定义缓冲区的默认配置
// bufferSize: 缓冲区大小（字节）
// maxBufferedSize: 缓冲模式限制（字节）
// maxStreamingSize: 流式模式限制（字节）
// maxFileSize: 单文件最大大小（字节）
// timeout: HTTP 请求超时
func DefaultFormDataStreamConfigWithBuffer(bufferSize int, maxBufferedSize, maxStreamingSize, maxFileSize int64, timeout time.Duration) *FormDataStreamConfig {
	return &FormDataStreamConfig{
		// 🔥 新方案：差异化限制
		MaxBufferedFormDataSize:  maxBufferedSize,  // 缓冲模式限制
		MaxStreamingFormDataSize: maxStreamingSize, // 流式模式限制

		// 其他配置
		EnableChunkedUpload: true,
		BufferSize:          bufferSize,
		MaxFileSize:         maxFileSize,
		Timeout:             timeout, // HTTP 请求超时

		// 🔧 废弃但保留兼容
		MaxFormDataSize:    maxBufferedSize, // 向后兼容，使用缓冲限制
		StreamingThreshold: 1 * 1024 * 1024, // 废弃
	}
}

// DefaultFormDataStreamConfig 默认配置（兼容旧代码）
func DefaultFormDataStreamConfig() *FormDataStreamConfig {
	return DefaultFormDataStreamConfigWithBuffer(
		2*1024*1024,    // 默认 2MB 缓冲区
		1*1024*1024,    // 默认 1MB 缓冲模式限制
		100*1024*1024,  // 默认 100MB 流式模式限制
		50*1024*1024,   // 默认 50MB 单文件大小
		30*time.Second, // 默认 30 秒超时
	)
}

// NewStreamingFormData 创建流式 FormData 处理器
func NewStreamingFormData(config *FormDataStreamConfig) *StreamingFormData {
	if config == nil {
		config = DefaultFormDataStreamConfig()
	}

	return &StreamingFormData{
		entries:          make([]FormDataEntry, 0),
		boundary:         randomBoundary(),
		streamingEnabled: config.EnableChunkedUpload,
		config:           config,
		bufferPool: &sync.Pool{
			New: func() interface{} {
				return bytes.NewBuffer(make([]byte, 0, config.BufferSize))
			},
		},
	}
}

// NewStreamingFormDataWithContext 创建带 context 的流式 FormData 处理器
// 🔥 优化：立即注入 context，避免取消响应延迟
//
// 优势：
//   - 立即响应取消：< 1ms vs 可能的几毫秒延迟
//   - 用户体验更好：取消请求立即停止 FormData 处理
//   - 代码更清晰：context 生命周期明确
//
// 使用场景：
//   - fetch() 调用时立即传入 HTTP 请求的 context
//   - 确保 FormData 的 goroutine 能立即感知请求取消
func NewStreamingFormDataWithContext(ctx context.Context, config *FormDataStreamConfig) *StreamingFormData {
	if config == nil {
		config = DefaultFormDataStreamConfig()
	}

	// 🔥 立即注入 context（关键优化）
	if config.Context == nil {
		config.Context = ctx
	}

	return NewStreamingFormData(config)
}

// ==================== Getter 方法 ====================

// GetBoundary 返回 boundary 字符串（供 Node.js FormData 模块使用）
func (sfd *StreamingFormData) GetBoundary() string {
	if sfd.boundary == "" {
		// 与 Node.js form-data 一致：空字符串视为未设置，重新生成
		sfd.boundary = randomBoundary()
	}
	return sfd.boundary
}

// GetEntries 返回所有条目（供 Node.js FormData 模块使用）
func (sfd *StreamingFormData) GetEntries() []FormDataEntry {
	return sfd.entries
}

// GetEntriesCount 返回条目数量
func (sfd *StreamingFormData) GetEntriesCount() int {
	return len(sfd.entries)
}

// SetBoundary 设置 boundary 字符串
func (sfd *StreamingFormData) SetBoundary(boundary string) {
	sfd.boundary = boundary
}

// AppendEntry 添加一个条目
func (sfd *StreamingFormData) AppendEntry(entry FormDataEntry) {
	if sfd.entries == nil {
		sfd.entries = make([]FormDataEntry, 0)
	}
	sfd.entries = append(sfd.entries, entry)
	sfd.markUnknownStreamLength(entry)
}

// AddToTotalSize 增加总大小估算（供 Node.js FormData 模块使用）
func (sfd *StreamingFormData) AddToTotalSize(size int64) {
	if sfd != nil {
		sfd.totalSize += size
	}
}

// ==================== 模式检测 ====================

// detectStreamingMode 检测是否为流式上传模式（带缓存）
// 🔥 关键判断：是否包含真正的 Stream（排除 bytes.Reader）
// - 缓冲模式：所有数据都是 string、[]byte、bytes.Reader
// - 流式模式：包含至少一个非 bytes.Reader 的 io.Reader
func (sfd *StreamingFormData) detectStreamingMode() bool {
	// 如果已经检测过，直接返回缓存结果
	if sfd.modeDetected {
		return sfd.isStreamingMode
	}

	// 检测模式
	isStreaming := false
	for _, entry := range sfd.entries {
		switch v := entry.Value.(type) {
		case BufferRef:
			// Buffer 引用视为缓冲数据
			_ = v
		case io.Reader:
			// 🔥 关键：排除 bytes.Reader（这是从 Buffer/[]byte 创建的，算缓冲模式）
			if _, isBytesReader := v.(*bytes.Reader); !isBytesReader {
				// 找到真正的流式 Reader（如 StreamReader、PipeReader 等）
				isStreaming = true
				break
			}
		}
	}

	// 缓存结果
	sfd.isStreamingMode = isStreaming
	sfd.modeDetected = true

	return isStreaming
}

// HasStreamingEntries 返回是否包含真正的流式 Reader（非 bytes.Reader）
// 用于在 getBuffer 等场景提前拒绝流式数据，避免与 Node form-data 行为不一致
func (sfd *StreamingFormData) HasStreamingEntries() bool {
	if sfd == nil {
		return false
	}
	return sfd.detectStreamingMode()
}

// CreateReader 创建读取器（核心方法）
// 🔥 新方案：根据数据类型检测模式，应用差异化限制
// - 缓冲模式（Blob/Buffer）：限制 1MB，直接读取到内存
// - 流式模式（Stream）：限制 100MB，使用 io.Pipe 流式处理
func (sfd *StreamingFormData) CreateReader() (io.Reader, error) {
	if sfd == nil || sfd.config == nil {
		return nil, fmt.Errorf("StreamingFormData 或 config 为 nil")
	}

	// 🔥 始终计算精确长度，避免 getBuffer() 清空 entries 后长度不一致
	// Node form-data 允许多次读取/计算长度，这里同步缓存最新的精确值
	sfd.totalSize = sfd.GetTotalSize()

	// 🔥 检测上传模式
	isStreaming := sfd.detectStreamingMode()

	// 🔥 根据模式应用不同的限制
	var maxSize int64
	var modeName string

	if isStreaming {
		maxSize = sfd.config.MaxStreamingFormDataSize
		modeName = "流式模式"
	} else {
		maxSize = sfd.config.MaxBufferedFormDataSize
		modeName = "缓冲模式"
	}

	// 检查大小限制
	if maxSize > 0 && sfd.totalSize > maxSize {
		sizeMB := float64(sfd.totalSize) / 1024 / 1024
		limitMB := float64(maxSize) / 1024 / 1024

		if isStreaming {
			return nil, fmt.Errorf(
				"%s下 FormData 大小超过限制: %.2fMB > %.2fMB",
				modeName, sizeMB, limitMB,
			)
		} else {
			return nil, fmt.Errorf(
				"%s下 FormData 大小超过限制: %.2fMB > %.2fMB\n提示: 大文件请使用 require('form-data') 配合 Stream 进行流式上传",
				modeName, sizeMB, limitMB,
			)
		}
	}

	var reader io.Reader
	var err error

	// 🔥 根据模式选择处理策略
	if isStreaming {
		// 流式模式：使用 io.Pipe（内存友好）
		reader, err = sfd.createPipedReader()
	} else {
		// 缓冲模式：直接读取到内存（性能更好）
		reader, err = sfd.createBufferedReader()
	}

	if err != nil {
		return nil, err
	}

	// 🔥 清理 entries，释放内存（仅流式模式）
	// 对于缓冲模式需要保留 entries，以便 getBuffer/getLengthSync 多次调用保持一致
	if isStreaming {
		// Reader 已创建且使用后台 goroutine 读取，流式模式无法重复消费，清理以释放资源
		sfd.entries = nil
	}

	return reader, nil
}

// createBufferedReader 创建缓冲读取器（小文件模式）
func (sfd *StreamingFormData) createBufferedReader() (io.Reader, error) {
	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)

	// 设置边界
	writer.SetBoundary(sfd.GetBoundary())

	// 写入所有条目
	for _, entry := range sfd.entries {
		if err := sfd.writeEntryBuffered(writer, &entry); err != nil {
			writer.Close()
			return nil, fmt.Errorf("写入字段失败: %w", err)
		}
	}

	// 关闭 writer
	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("关闭 multipart writer 失败: %w", err)
	}

	// 返回 bytes.Reader（支持 Seek）
	return bytes.NewReader(buffer.Bytes()), nil
}

// writeEntryBuffered 写入单个字段（缓冲模式）
func (sfd *StreamingFormData) writeEntryBuffered(writer *multipart.Writer, entry *FormDataEntry) error {
	if entry == nil || writer == nil {
		return fmt.Errorf("entry 或 writer 为 nil")
	}

	switch v := entry.Value.(type) {
	case string:
		// 文本字段；如果带有 content-type，需要自定义 header
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataBuffered(writer, entry.Name, entry.Filename, entry.ContentType, []byte(v))
		}
		return writer.WriteField(entry.Name, v)
	case BufferRef:
		// 保留 Buffer 引用，使用零拷贝视图
		return sfd.writeFileDataBuffered(writer, entry.Name, entry.Filename, entry.ContentType, v.Bytes())
	case []byte:
		// 二进制字段（Blob/File）
		return sfd.writeFileDataBuffered(writer, entry.Name, entry.Filename, entry.ContentType, v)
	case io.Reader:
		// Reader 类型需要读取内容
		data, err := io.ReadAll(v)
		if err != nil {
			return fmt.Errorf("读取 Reader 数据失败: %w", err)
		}
		return sfd.writeFileDataBuffered(writer, entry.Name, entry.Filename, entry.ContentType, data)
	case map[string]interface{}:
		// 🔥 对象转换为 "[object Object]"（符合浏览器行为，防止循环引用导致栈溢出）
		val := "[object Object]"
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataBuffered(writer, entry.Name, entry.Filename, entry.ContentType, []byte(val))
		}
		return writer.WriteField(entry.Name, val)
	case nil:
		// 🔥 nil 转换为 "null"
		val := "null"
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataBuffered(writer, entry.Name, entry.Filename, entry.ContentType, []byte(val))
		}
		return writer.WriteField(entry.Name, val)
	case bool:
		// 与 Node.js form-data getBuffer 保持一致：布尔值会在 Buffer.from 时抛错
		return fmt.Errorf("The \"string\" argument must be of type string or an instance of Buffer. Received type boolean")
	default:
		// 其他类型转为字符串
		val := fmt.Sprintf("%v", v)
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataBuffered(writer, entry.Name, entry.Filename, entry.ContentType, []byte(val))
		}
		return writer.WriteField(entry.Name, val)
	}
}

// writeFileDataBuffered 写入文件数据（缓冲模式）
func (sfd *StreamingFormData) writeFileDataBuffered(writer *multipart.Writer, name, filename, contentType string, data []byte) error {
	// 安全检查
	if sfd == nil || sfd.config == nil {
		return fmt.Errorf("StreamingFormData 或 config 为 nil")
	}

	// 检查文件大小限制
	if int64(len(data)) > sfd.config.MaxFileSize {
		return fmt.Errorf("文件 %s 大小超过限制: %d > %d 字节",
			filename, len(data), sfd.config.MaxFileSize)
	}

	// 创建字段（支持自定义 ContentType，filename 可为空）
	if filename == "" {
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		headers := map[string][]string{
			"Content-Disposition": {fmt.Sprintf(`form-data; name="%s"`, escapeQuotes(name))},
			"Content-Type":        {contentType},
		}
		part, err := writer.CreatePart(headers)
		if err != nil {
			return fmt.Errorf("创建表单字段失败: %w", err)
		}

		// 直接写入所有数据
		if _, err := part.Write(data); err != nil {
			return fmt.Errorf("写入字段数据失败: %w", err)
		}
		return nil
	}

	part, err := sfd.createFormFilePart(writer, name, filename, contentType)
	if err != nil {
		return fmt.Errorf("创建文件字段失败: %w", err)
	}

	// 直接写入所有数据
	if _, err := part.Write(data); err != nil {
		return fmt.Errorf("写入文件数据失败: %w", err)
	}

	return nil
}

// calculateWriteTimeout 根据 HTTP 请求超时计算写入超时
// 🔥 核心思路：FormData 写入是 HTTP 请求的一部分，不应该比请求超时还长
func (sfd *StreamingFormData) calculateWriteTimeout() time.Duration {
	// 使用配置的 HTTP 请求超时
	if sfd.config.Timeout > 0 {
		// FormData 写入超时 = HTTP 请求超时
		// 理由：写入是请求的一部分，不应该超过请求总时间
		return sfd.config.Timeout
	}

	// 降级：如果没有配置，使用默认值 30 秒
	return 30 * time.Second
}

// createPipedReader 创建管道读取器（流式处理大文件）
// 🔥 v2.4.2 防泄漏机制：添加 context 取消监听 + 动态超时，防止 writer goroutine 永久阻塞
func (sfd *StreamingFormData) createPipedReader() (io.Reader, error) {
	pr, pw := io.Pipe()

	// 🔥 关键修复：复制 entries 到局部变量，避免竞态条件
	// 因为 CreateReader() 会在返回前清空 sfd.entries
	// 但后台 goroutine 需要访问这些数据
	entriesCopy := make([]FormDataEntry, len(sfd.entries))
	copy(entriesCopy, sfd.entries)
	boundary := sfd.GetBoundary()

	// 🔥 v2.4.2: 获取 context（用于监听 HTTP 请求取消）
	ctx := sfd.config.Context
	if ctx == nil {
		ctx = context.Background()
	}

	// 🔥 防泄漏：创建超时 timer（动态计算，基于文件大小限制）
	writeTimeout := sfd.calculateWriteTimeout()
	timer := time.NewTimer(writeTimeout)

	// 在后台 goroutine 中写入数据
	go func() {
		defer pw.Close()
		defer timer.Stop() // 正常完成时停止 timer

		// 创建完成通道
		doneCh := make(chan error, 1)

		// 写入操作在另一个 goroutine 中（可被中断）
		go func() {
			writer := multipart.NewWriter(pw)
			writer.SetBoundary(boundary)

			var writeErr error
			for i := range entriesCopy {
				// 🔥 P0-1 修复：在每次写入前检查 context 是否已取消
				select {
				case <-ctx.Done():
					// Context 已取消，立即停止
					doneCh <- fmt.Errorf("写入已取消: %w", ctx.Err())
					return
				default:
					// Context 未取消，继续写入
				}

				if err := sfd.writeEntryStreaming(writer, &entriesCopy[i]); err != nil {
					// 🔥 检查是否是因为 pipe 关闭导致的错误
					if err == io.ErrClosedPipe || strings.Contains(err.Error(), "closed pipe") {
						// Pipe 已关闭（外层 goroutine 已取消），正常退出
						doneCh <- nil
						return
					}
					writeErr = fmt.Errorf("流式写入字段失败: %w", err)
					break
				}
			}

			if writeErr != nil {
				doneCh <- writeErr
				return
			}

			if err := writer.Close(); err != nil {
				doneCh <- fmt.Errorf("关闭 writer 失败: %w", err)
				return
			}

			doneCh <- nil
		}()

		// 🔥 v2.4.2: 等待写入完成、超时或 context 取消
		select {
		case err := <-doneCh:
			// 写入完成（正常或错误）
			if err != nil {
				pw.CloseWithError(err)
			}
		case <-timer.C:
			// 🔥 超时：强制关闭 pipe，goroutine 将退出
			pw.CloseWithError(fmt.Errorf("FormData 写入超时 (%v)，可能原因：读取方未读取或网络异常", writeTimeout))
		case <-ctx.Done():
			// 🔥 v2.4.2 新增：HTTP 请求取消，立即关闭 pipe
			pw.CloseWithError(fmt.Errorf("FormData 写入已取消: %w", ctx.Err()))
		}
	}()

	return pr, nil
}

// writeEntryStreaming 写入单个字段（流式模式）
func (sfd *StreamingFormData) writeEntryStreaming(writer *multipart.Writer, entry *FormDataEntry) error {
	switch v := entry.Value.(type) {
	case string:
		// 文本字段
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, strings.NewReader(v), int64(len(v)))
		}
		return writer.WriteField(entry.Name, v)

	case BufferRef:
		data := v.Bytes()
		return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, bytes.NewReader(data), int64(len(data)))

	case []byte:
		// 二进制文件（流式写入）
		return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, bytes.NewReader(v), int64(len(v)))

	case io.Reader:
		// 🔥 新增：支持 io.Reader（包括 io.ReadCloser）
		// 用于流式文件上传（axios stream -> FormData）
		size := int64(-1)
		if entry.HasKnownLen {
			size = entry.KnownLength
		}
		return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, v, size)

	case map[string]interface{}:
		// 🔥 对象转换为 "[object Object]"（符合浏览器行为，防止循环引用导致栈溢出）
		val := "[object Object]"
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, strings.NewReader(val), int64(len(val)))
		}
		return writer.WriteField(entry.Name, val)

	case nil:
		// 🔥 nil 转换为 "null"
		val := "null"
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, strings.NewReader(val), int64(len(val)))
		}
		return writer.WriteField(entry.Name, val)
	case bool:
		// 与 Node.js form-data getBuffer 保持一致：布尔值会在 Buffer.from 时抛错
		return fmt.Errorf("The \"string\" argument must be of type string or an instance of Buffer. Received type boolean")

	default:
		// 其他类型转为字符串
		val := fmt.Sprintf("%v", v)
		if entry.ContentType != "" || entry.Filename != "" {
			return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, strings.NewReader(val), int64(len(val)))
		}
		return writer.WriteField(entry.Name, val)
	}
}

// writeFileDataStreaming 写入文件数据（流式模式）
// 🔥 核心优化：分块读取和写入，避免一次性加载到内存
func (sfd *StreamingFormData) writeFileDataStreaming(writer *multipart.Writer, name, filename, contentType string, reader io.Reader, size int64) error {
	// 安全检查
	if sfd == nil || sfd.config == nil {
		return fmt.Errorf("StreamingFormData 或 config 为 nil")
	}

	// 检查文件大小限制（如果已知大小）
	// size = -1 表示大小未知（流式数据）
	if size > 0 && size > sfd.config.MaxFileSize {
		return fmt.Errorf("文件 %s 大小超过限制: %d > %d 字节",
			filename, size, sfd.config.MaxFileSize)
	}

	// 创建文件字段（支持自定义 ContentType）
	if filename == "" {
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		headers := map[string][]string{
			"Content-Disposition": {fmt.Sprintf(`form-data; name="%s"`, escapeQuotes(name))},
			"Content-Type":        {contentType},
		}
		part, err := writer.CreatePart(headers)
		if err != nil {
			return fmt.Errorf("创建表单字段失败: %w", err)
		}

		// 流式复制
		_, err = sfd.copyStreaming(part, reader)
		if err != nil {
			return fmt.Errorf("写入文件数据失败: %w", err)
		}
		return nil
	}

	part, err := sfd.createFormFilePart(writer, name, filename, contentType)
	if err != nil {
		return fmt.Errorf("创建文件字段失败: %w", err)
	}

	// 流式复制
	_, err = sfd.copyStreaming(part, reader)
	if err != nil {
		return fmt.Errorf("流式写入文件数据失败: %w", err)
	}

	return nil
}

// copyStreaming 流式复制数据
// 🔥 新增：在流式写入过程中检查累计大小限制
func (sfd *StreamingFormData) copyStreaming(dst io.Writer, src io.Reader) (int64, error) {
	if sfd == nil || sfd.config == nil {
		return 0, fmt.Errorf("StreamingFormData 或 config 为 nil")
	}

	// 使用固定大小的缓冲区进行流式复制
	buffer := make([]byte, sfd.config.BufferSize)

	written := int64(0)

	// 🔥 获取流式模式限制（用于传输中检查）
	isStreaming := sfd.detectStreamingMode()
	var maxSize int64
	if isStreaming {
		maxSize = sfd.config.MaxStreamingFormDataSize
	} else {
		maxSize = sfd.config.MaxBufferedFormDataSize
	}

	for {
		nr, err := src.Read(buffer)
		if nr > 0 {
			// 🔥 关键：在写入前检查累计大小
			if maxSize > 0 && written+int64(nr) > maxSize {
				sizeMB := float64(written+int64(nr)) / 1024 / 1024
				limitMB := float64(maxSize) / 1024 / 1024
				modeName := "流式模式"
				if !isStreaming {
					modeName = "缓冲模式"
				}
				return written, fmt.Errorf(
					"%s文件上传累计大小超过限制: %.2fMB > %.2fMB",
					modeName, sizeMB, limitMB,
				)
			}

			nw, ew := dst.Write(buffer[:nr])
			if nw > 0 {
				written += int64(nw)
			}
			if ew != nil {
				return written, ew
			}
			if nr != nw {
				return written, io.ErrShortWrite
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return written, err
		}
	}

	return written, nil
}

// AddEntry 添加条目并更新总大小
func (sfd *StreamingFormData) AddEntry(entry FormDataEntry) {
	sfd.entries = append(sfd.entries, entry)
	sfd.markUnknownStreamLength(entry)

	// 🔥 不在这里计算，统一在 GetTotalSize() 中精确计算
	// 原因：multipart/form-data 格式包含 boundary、headers 等开销
}

// HasUnknownStreamLength 判断是否存在未知长度的流式字段
func (sfd *StreamingFormData) HasUnknownStreamLength() bool {
	if sfd == nil {
		return false
	}

	if sfd.hasUnknownStreamLen {
		return true
	}

	for _, entry := range sfd.entries {
		if sfd.isUnknownLengthStream(&entry) {
			sfd.hasUnknownStreamLen = true
			return true
		}
	}

	return false
}

// HasKnownLength 判断所有字段长度是否已知（用于 getLengthSync/hasKnownLength）
func (sfd *StreamingFormData) HasKnownLength() bool {
	if sfd == nil {
		return true
	}
	return !sfd.HasUnknownStreamLength()
}

// markUnknownStreamLength 标记是否存在未知长度的流
func (sfd *StreamingFormData) markUnknownStreamLength(entry FormDataEntry) {
	if sfd == nil {
		return
	}
	if sfd.isUnknownLengthStream(&entry) {
		sfd.hasUnknownStreamLen = true
	}
}

// isUnknownLengthStream 判断单个 entry 是否为未知长度的流
func (sfd *StreamingFormData) isUnknownLengthStream(entry *FormDataEntry) bool {
	if entry == nil {
		return false
	}

	if entry.HasKnownLen {
		return false
	}

	switch v := entry.Value.(type) {
	case UnknownLengthStreamPlaceholder:
		return v.NeedsLength
	case *UnknownLengthStreamPlaceholder:
		if v == nil {
			return false
		}
		return v.NeedsLength
	case io.Reader:
		if _, isBytesReader := v.(*bytes.Reader); isBytesReader {
			return false
		}
		return true
	default:
		return false
	}
}

// GetTotalSize 获取精确的 multipart/form-data 总大小
// 🔥 修复：计算完整的 multipart 格式大小，与 Node.js form-data 一致
func (sfd *StreamingFormData) GetTotalSize() int64 {
	if sfd == nil {
		return 0
	}

	boundary := sfd.GetBoundary()

	// entries 可能在 createReader()/getBuffer() 后被清空。
	// 如果已有缓存值，直接返回，确保与生成的 Buffer 长度一致。
	if len(sfd.entries) == 0 {
		if sfd.totalSize > 0 {
			return sfd.totalSize
		}
		// 与 Node form-data 保持一致：空表单 getLengthSync/getLength 返回 0
		// boundary 仍然存在，但长度按 0 处理
		sfd.totalSize = 0
		return 0
	}

	// 🔥 精确计算：包含 boundary、headers、数据、换行符
	totalSize := int64(0)
	hasStreamingReader := false

	for _, entry := range sfd.entries {
		// 1. Boundary 行: "--" + boundary + "\r\n"
		totalSize += int64(len("--")) + int64(len(boundary)) + 2 // \r\n

		// 2. Content-Disposition header
		contentDisposition := fmt.Sprintf("Content-Disposition: form-data; name=\"%s\"", escapeQuotes(entry.Name))
		if entry.Filename != "" {
			contentDisposition += fmt.Sprintf("; filename=\"%s\"", escapeQuotes(entry.Filename))
		}
		totalSize += int64(len(contentDisposition)) + 2 // \r\n

		// 3. Content-Type header (如果有文件名或显式 contentType)
		if entry.Filename != "" || entry.ContentType != "" {
			contentType := entry.ContentType
			if contentType == "" {
				// 默认值与 createFormFilePart 保持一致
				contentType = "application/octet-stream"
			}
			totalSize += int64(len(fmt.Sprintf("Content-Type: %s", contentType))) + 2 // \r\n
		}

		// 4. 空行分隔 headers 和 body
		totalSize += 2 // \r\n

		// 5. 数据本身
		switch v := entry.Value.(type) {
		case string:
			if entry.HasKnownLen {
				totalSize += entry.KnownLength
			} else {
				totalSize += int64(len(v))
			}
		case BufferRef:
			if entry.HasKnownLen {
				totalSize += entry.KnownLength
			} else {
				// 使用实际写出的字节数（Bytes() 会考虑视图偏移），避免 Buffer.subarray 等视图长度偏差
				totalSize += int64(len(v.Bytes()))
			}
		case []byte:
			if entry.HasKnownLen {
				totalSize += entry.KnownLength
			} else {
				totalSize += int64(len(v))
			}
		case io.Reader:
			// 流式数据长度未知，保留标记用于后续缓存处理
			if entry.HasKnownLen {
				totalSize += entry.KnownLength
			} else {
				if _, isBytesReader := v.(*bytes.Reader); !isBytesReader {
					hasStreamingReader = true
				}
			}
		default:
			if entry.HasKnownLen {
				totalSize += entry.KnownLength
			}
		}

		// 6. 数据后的换行
		totalSize += 2 // \r\n
	}

	// 7. 结束 boundary: "--" + boundary + "--" + "\r\n"
	totalSize += int64(len("--")) + int64(len(boundary)) + int64(len("--")) + 2 // \r\n

	// 如果包含真正的流式 Reader，优先保留之前的估算值以触发流式模式
	if hasStreamingReader && sfd.totalSize > totalSize {
		totalSize = sfd.totalSize
	}

	// 缓存精确值，便于 entries 被释放后继续返回正确长度
	sfd.totalSize = totalSize

	return totalSize
}

// ShouldUseStreaming 判断是否应该使用流式处理
func (sfd *StreamingFormData) ShouldUseStreaming() bool {
	if sfd == nil || sfd.config == nil {
		return false
	}
	return sfd.totalSize >= sfd.config.StreamingThreshold
}

// randomBoundary 生成随机边界字符串
// 🔥 与 Node.js form-data 兼容：26个'-' + 24个十六进制字符 = 50 字符
func randomBoundary() string {
	// 生成 12 字节的随机数据（12 * 2 = 24 个十六进制字符）
	b := make([]byte, 12)
	_, _ = io.ReadFull(rand.Reader, b)

	// 转换为十六进制字符串
	hexStr := fmt.Sprintf("%x", b)

	// Node.js form-data 格式：26个'-' + 24个十六进制字符
	return fmt.Sprintf("--------------------------%s", hexStr)
}

// createFormFilePart 创建带自定义 Content-Type 的文件 part
// 🔥 关键方法：支持 Node.js form-data 的 contentType 选项
func (sfd *StreamingFormData) createFormFilePart(writer *multipart.Writer, fieldName, filename, contentType string) (io.Writer, error) {
	// 如果没有指定 contentType，使用默认值
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 构建 Content-Disposition header
	h := make(map[string][]string)
	h["Content-Disposition"] = []string{
		fmt.Sprintf(`form-data; name="%s"; filename="%s"`,
			escapeQuotes(fieldName), escapeQuotes(filename)),
	}
	h["Content-Type"] = []string{contentType}

	return writer.CreatePart(h)
}

// escapeQuotes 转义引号和控制字符，防止 HTTP header 注入攻击
// RFC 2047 和 RFC 7578 规定：
// - Content-Disposition header 中的引号必须被转义
// - 控制字符（换行、回车等）必须被移除，以防止 header 注入攻击
func escapeQuotes(s string) string {
	// 1. 移除控制字符（换行、回车、制表符等），防止 header 注入
	s = strings.ReplaceAll(s, "\r", "")  // 移除回车
	s = strings.ReplaceAll(s, "\n", "")  // 移除换行
	s = strings.ReplaceAll(s, "\t", " ") // 制表符转为空格

	// 2. 移除其他 ASCII 控制字符 (0-31, 127)
	s = removeControlChars(s)

	// 3. 转义反斜杠（必须在转义引号之前）
	s = strings.ReplaceAll(s, `\`, `\\`)

	// 4. 转义双引号
	s = strings.ReplaceAll(s, `"`, `\"`)

	return s
}

// removeControlChars 移除 ASCII 控制字符，保留可打印字符和 Unicode 字符
func removeControlChars(s string) string {
	var result strings.Builder
	result.Grow(len(s)) // 预分配内存

	for _, r := range s {
		// 保留可打印字符（ASCII 32-126）和 Unicode 字符（> 127）
		// 排除控制字符（0-31）和 DEL（127）
		if (r >= 32 && r != 127) || r > 127 {
			result.WriteRune(r)
		}
	}
	return result.String()
}

// Release 显式释放内存（可选，CreateReader 已自动释放）
// 如果 CreateReader 失败，可以调用此方法手动释放
func (sfd *StreamingFormData) Release() {
	if sfd != nil {
		sfd.entries = nil
	}
}

// ==================== 访问器方法 ====================

// GetConfig 获取配置（用于外部访问）
func (sfd *StreamingFormData) GetConfig() *FormDataStreamConfig {
	if sfd == nil {
		return nil
	}
	return sfd.config
}

// SetContext 设置 context（用于外部设置超时）
func (sfd *StreamingFormData) SetContext(ctx context.Context) {
	if sfd != nil && sfd.config != nil {
		sfd.config.Context = ctx
	}
}
