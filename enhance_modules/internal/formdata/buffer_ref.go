package formdata

// BufferRef 用于保存来自 JS Buffer 的零拷贝视图，保持与原始 Buffer 的引用关系。
// Data 应该直接引用底层的 ArrayBuffer 切片，Len 表示逻辑长度（通常等于 Buffer.length）。
// Ref 用于持有原始 JS 对象，避免被 GC 回收。
type BufferRef struct {
	Data []byte
	Len  int64
	Ref  interface{}
}

// Bytes 返回用于写入的字节切片；如果 Data 为空则返回空切片。
func (br BufferRef) Bytes() []byte {
	if br.Data == nil {
		return []byte{}
	}
	if br.Len <= 0 {
		return br.Data
	}
	if int64(len(br.Data)) < br.Len {
		return br.Data
	}
	return br.Data[:br.Len]
}

// Length 返回逻辑长度；为 0 时回退到 Data 的长度。
func (br BufferRef) Length() int64 {
	if br.Len > 0 {
		return br.Len
	}
	return int64(len(br.Data))
}
