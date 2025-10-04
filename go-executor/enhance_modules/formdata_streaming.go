package enhance_modules

import (
	"bytes"
	"fmt"
	"io"
	"mime/multipart"
	"strings"
	"sync"
)

// StreamingFormData 流式 FormData 处理器
// 🔥 核心优化：使用 io.Pipe 实现真正的流式处理，避免内存累积
type StreamingFormData struct {
	entries          []FormDataEntry
	boundary         string
	streamingEnabled bool                  // 是否启用流式处理
	config           *FormDataStreamConfig // 配置
	bufferPool       *sync.Pool            // 内存池
	totalSize        int64                 // 预估总大小
}

// FormDataStreamConfig 流式处理配置
type FormDataStreamConfig struct {
	MaxFormDataSize     int64 // 最大 FormData 大小（字节）
	StreamingThreshold  int64 // 启用流式处理的阈值（字节）
	EnableChunkedUpload bool  // 启用分块上传
	BufferSize          int   // 缓冲区大小
	MaxFileSize         int64 // 单个文件最大大小
}

// DefaultFormDataStreamConfigWithBuffer 创建带自定义缓冲区的默认配置
// bufferSize: 缓冲区大小（字节）
// maxFormDataSize: FormData 最大大小（字节）
// maxFileSize: 单文件最大大小（字节）
func DefaultFormDataStreamConfigWithBuffer(bufferSize int, maxFormDataSize, maxFileSize int64) *FormDataStreamConfig {
	return &FormDataStreamConfig{
		MaxFormDataSize:     maxFormDataSize, // 🔥 从参数传入
		StreamingThreshold:  1 * 1024 * 1024, // 1MB
		EnableChunkedUpload: true,
		BufferSize:          bufferSize,  // 🔥 从参数传入
		MaxFileSize:         maxFileSize, // 🔥 从参数传入
	}
}

// DefaultFormDataStreamConfig 默认配置（兼容旧代码）
func DefaultFormDataStreamConfig() *FormDataStreamConfig {
	return DefaultFormDataStreamConfigWithBuffer(
		2*1024*1024,   // 默认 2MB 缓冲区
		100*1024*1024, // 默认 100MB FormData 大小
		50*1024*1024,  // 默认 50MB 单文件大小
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

// CreateReader 创建读取器（核心方法）
// 根据 StreamingThreshold 自动选择最佳策略
// - 小文件（< threshold）：缓冲模式，直接读取到内存（性能更好）
// - 大文件（≥ threshold）：流式模式，使用 io.Pipe（内存友好）
func (sfd *StreamingFormData) CreateReader() (io.Reader, error) {
	if sfd == nil || sfd.config == nil {
		return nil, fmt.Errorf("StreamingFormData or config is nil")
	}

	// 检查总大小限制
	if sfd.totalSize > sfd.config.MaxFormDataSize {
		return nil, fmt.Errorf("FormData 大小超过限制: %d > %d 字节",
			sfd.totalSize, sfd.config.MaxFormDataSize)
	}

	// 根据阈值选择处理策略
	if sfd.totalSize < sfd.config.StreamingThreshold {
		// 小文件：使用缓冲模式（性能更好）
		return sfd.createBufferedReader()
	}

	// 大文件：使用流式处理（内存友好）
	return sfd.createPipedReader()
}

// createBufferedReader 创建缓冲读取器（小文件模式）
func (sfd *StreamingFormData) createBufferedReader() (io.Reader, error) {
	var buffer bytes.Buffer
	writer := multipart.NewWriter(&buffer)

	// 设置边界
	writer.SetBoundary(sfd.boundary)

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
		return fmt.Errorf("entry or writer is nil")
	}

	switch v := entry.Value.(type) {
	case string:
		// 文本字段
		return writer.WriteField(entry.Name, v)
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
	default:
		// 其他类型转为字符串
		return writer.WriteField(entry.Name, fmt.Sprintf("%v", v))
	}
}

// writeFileDataBuffered 写入文件数据（缓冲模式）
func (sfd *StreamingFormData) writeFileDataBuffered(writer *multipart.Writer, name, filename, contentType string, data []byte) error {
	// 安全检查
	if sfd == nil || sfd.config == nil {
		return fmt.Errorf("StreamingFormData or config is nil")
	}

	// 检查文件大小限制
	if int64(len(data)) > sfd.config.MaxFileSize {
		return fmt.Errorf("文件 %s 大小超过限制: %d > %d 字节",
			filename, len(data), sfd.config.MaxFileSize)
	}

	// 创建文件字段（支持自定义 ContentType）
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

// createPipedReader 创建管道读取器（流式处理大文件）
func (sfd *StreamingFormData) createPipedReader() (io.Reader, error) {
	pr, pw := io.Pipe()

	// 在后台 goroutine 中写入数据
	go func() {
		defer pw.Close()

		writer := multipart.NewWriter(pw)
		writer.SetBoundary(sfd.boundary)

		var writeErr error
		for _, entry := range sfd.entries {
			if err := sfd.writeEntryStreaming(writer, &entry); err != nil {
				writeErr = fmt.Errorf("流式写入字段失败: %w", err)
				break
			}
		}

		if writeErr != nil {
			pw.CloseWithError(writeErr)
			return
		}

		if err := writer.Close(); err != nil {
			pw.CloseWithError(fmt.Errorf("关闭 writer 失败: %w", err))
		}
	}()

	return pr, nil
}

// writeEntryStreaming 写入单个字段（流式模式）

func (sfd *StreamingFormData) writeEntryStreaming(writer *multipart.Writer, entry *FormDataEntry) error {
	switch v := entry.Value.(type) {
	case string:
		// 文本字段

		return writer.WriteField(entry.Name, v)

	case []byte:
		// 二进制文件（流式写入）
		return sfd.writeFileDataStreaming(writer, entry.Name, entry.Filename, entry.ContentType, bytes.NewReader(v), int64(len(v)))

	default:
		// 其他类型转为字符串
		return writer.WriteField(entry.Name, fmt.Sprintf("%v", v))
	}
}

// writeFileDataStreaming 写入文件数据（流式模式）
// 🔥 核心优化：分块读取和写入，避免一次性加载到内存
func (sfd *StreamingFormData) writeFileDataStreaming(writer *multipart.Writer, name, filename, contentType string, reader io.Reader, size int64) error {
	// 安全检查
	if sfd == nil || sfd.config == nil {
		return fmt.Errorf("StreamingFormData or config is nil")
	}

	// 检查文件大小限制
	if size > sfd.config.MaxFileSize {
		return fmt.Errorf("文件 %s 大小超过限制: %d > %d 字节",
			filename, size, sfd.config.MaxFileSize)
	}

	// 创建文件字段（支持自定义 ContentType）
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
func (sfd *StreamingFormData) copyStreaming(dst io.Writer, src io.Reader) (int64, error) {
	if sfd == nil || sfd.config == nil {
		return 0, fmt.Errorf("StreamingFormData or config is nil")
	}

	// 使用固定大小的缓冲区进行流式复制
	buffer := make([]byte, sfd.config.BufferSize)

	written := int64(0)
	for {
		nr, err := src.Read(buffer)
		if nr > 0 {
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

// GetBoundary 获取边界字符串
func (sfd *StreamingFormData) GetBoundary() string {
	if sfd == nil {
		return ""
	}
	return sfd.boundary
}

// AddEntry 添加条目并更新总大小
func (sfd *StreamingFormData) AddEntry(entry FormDataEntry) {
	sfd.entries = append(sfd.entries, entry)

	// 更新总大小
	switch v := entry.Value.(type) {
	case string:
		sfd.totalSize += int64(len(v))
	case []byte:
		sfd.totalSize += int64(len(v))
	}
}

// GetTotalSize 获取预估总大小
func (sfd *StreamingFormData) GetTotalSize() int64 {
	if sfd == nil {
		return 0
	}
	return sfd.totalSize
}

// ShouldUseStreaming 判断是否应该使用流式处理
func (sfd *StreamingFormData) ShouldUseStreaming() bool {
	if sfd == nil || sfd.config == nil {
		return false
	}
	return sfd.totalSize >= sfd.config.StreamingThreshold
}

// randomBoundary 生成随机边界字符串
func randomBoundary() string {

	return fmt.Sprintf("----FormDataBoundary%d", randomInt63())
}

// randomInt63 生成随机 int64
func randomInt63() int64 {

	return int64(randomUint32())<<31 | int64(randomUint32())
}

// randomUint32 生成随机 uint32
func randomUint32() uint32 {

	b := make([]byte, 4)
	_, _ = io.ReadFull(randReader, b)
	return uint32(b[0]) | uint32(b[1])<<8 | uint32(b[2])<<16 | uint32(b[3])<<24
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
