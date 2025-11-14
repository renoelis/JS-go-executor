package buffer

import (
	"encoding/binary"
	"fmt"
	"math"

	"github.com/dop251/goja"
)

// 🔥 性能优化：直接访问底层 ArrayBuffer 字节数组
// 避免通过 this.Get(offset) 的属性查找开销

// getUnderlyingBytes 获取 Buffer/TypedArray 底层的 []byte 切片
// 🔥 关键优化：返回底层 ArrayBuffer 的直接引用（零拷贝）
// 这是所有快速读写方法的基础
func (be *BufferEnhancer) getUnderlyingBytes(obj *goja.Object) ([]byte, int64, error) {
	if obj == nil {
		return nil, 0, fmt.Errorf("object is nil")
	}

	// 🔥 优先路径：从 .buffer 属性获取（Buffer 是 Uint8Array，有 .buffer 属性）
	if bufferProp := obj.Get("buffer"); bufferProp != nil && !goja.IsUndefined(bufferProp) {
		if bufferObj, ok := bufferProp.(*goja.Object); ok {
			if exported := bufferObj.Export(); exported != nil {
				if ab, ok := exported.(goja.ArrayBuffer); ok {
					bytes := ab.Bytes()
					if bytes == nil {
						return nil, 0, fmt.Errorf("ArrayBuffer is detached")
					}

					// 获取 byteOffset（TypedArray 视图的偏移量）
					byteOffset := int64(0)
					if offsetVal := obj.Get("byteOffset"); offsetVal != nil && !goja.IsUndefined(offsetVal) {
						byteOffset = offsetVal.ToInteger()
					}

					// 🔥 关键：返回底层数组的直接引用，支持原地读写
					return bytes, byteOffset, nil
				}
			}
		}
	}

	// 备用路径：直接 Export() 获取 ArrayBuffer（用于纯 ArrayBuffer 对象）
	if exported := obj.Export(); exported != nil {
		if ab, ok := exported.(goja.ArrayBuffer); ok {
			bytes := ab.Bytes()
			if bytes == nil {
				return nil, 0, fmt.Errorf("ArrayBuffer is detached")
			}
			return bytes, 0, nil // byteOffset = 0 for direct ArrayBuffer
		}
	}

	return nil, 0, fmt.Errorf("unable to get underlying bytes")
}

// fastReadUint8 快速读取单字节（无符号）
func (be *BufferEnhancer) fastReadUint8(obj *goja.Object, offset int64) (uint8, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset >= int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	return bytes[actualOffset], nil
}

// fastReadInt8 快速读取单字节（有符号）
func (be *BufferEnhancer) fastReadInt8(obj *goja.Object, offset int64) (int8, error) {
	val, err := be.fastReadUint8(obj, offset)
	return int8(val), err
}

// fastWriteUint8 快速写入单字节
func (be *BufferEnhancer) fastWriteUint8(obj *goja.Object, offset int64, value uint8) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset >= int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	bytes[actualOffset] = value
	return nil
}

// fastReadUint16BE 快速读取 16 位无符号整数（大端）
func (be *BufferEnhancer) fastReadUint16BE(obj *goja.Object, offset int64) (uint16, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+2 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	return binary.BigEndian.Uint16(bytes[actualOffset : actualOffset+2]), nil
}

// fastReadUint16LE 快速读取 16 位无符号整数（小端）
func (be *BufferEnhancer) fastReadUint16LE(obj *goja.Object, offset int64) (uint16, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+2 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	return binary.LittleEndian.Uint16(bytes[actualOffset : actualOffset+2]), nil
}

// fastWriteUint16BE 快速写入 16 位无符号整数（大端）
func (be *BufferEnhancer) fastWriteUint16BE(obj *goja.Object, offset int64, value uint16) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+2 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	binary.BigEndian.PutUint16(bytes[actualOffset:actualOffset+2], value)
	return nil
}

// fastWriteUint16LE 快速写入 16 位无符号整数（小端）
func (be *BufferEnhancer) fastWriteUint16LE(obj *goja.Object, offset int64, value uint16) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+2 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	binary.LittleEndian.PutUint16(bytes[actualOffset:actualOffset+2], value)
	return nil
}

// fastReadUint32BE 快速读取 32 位无符号整数（大端）
func (be *BufferEnhancer) fastReadUint32BE(obj *goja.Object, offset int64) (uint32, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	return binary.BigEndian.Uint32(bytes[actualOffset : actualOffset+4]), nil
}

// fastReadUint32LE 快速读取 32 位无符号整数（小端）
func (be *BufferEnhancer) fastReadUint32LE(obj *goja.Object, offset int64) (uint32, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	return binary.LittleEndian.Uint32(bytes[actualOffset : actualOffset+4]), nil
}

// fastWriteUint32BE 快速写入 32 位无符号整数（大端）
func (be *BufferEnhancer) fastWriteUint32BE(obj *goja.Object, offset int64, value uint32) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	binary.BigEndian.PutUint32(bytes[actualOffset:actualOffset+4], value)
	return nil
}

// fastWriteUint32LE 快速写入 32 位无符号整数（小端）
func (be *BufferEnhancer) fastWriteUint32LE(obj *goja.Object, offset int64, value uint32) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	binary.LittleEndian.PutUint32(bytes[actualOffset:actualOffset+4], value)
	return nil
}

// fastReadUint64BE 快速读取 64 位无符号整数（大端）
func (be *BufferEnhancer) fastReadUint64BE(obj *goja.Object, offset int64) (uint64, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	return binary.BigEndian.Uint64(bytes[actualOffset : actualOffset+8]), nil
}

// fastReadUint64LE 快速读取 64 位无符号整数（小端）
func (be *BufferEnhancer) fastReadUint64LE(obj *goja.Object, offset int64) (uint64, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	return binary.LittleEndian.Uint64(bytes[actualOffset : actualOffset+8]), nil
}

// fastWriteUint64BE 快速写入 64 位无符号整数（大端）
func (be *BufferEnhancer) fastWriteUint64BE(obj *goja.Object, offset int64, value uint64) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	binary.BigEndian.PutUint64(bytes[actualOffset:actualOffset+8], value)
	return nil
}

// fastWriteUint64LE 快速写入 64 位无符号整数（小端）
func (be *BufferEnhancer) fastWriteUint64LE(obj *goja.Object, offset int64, value uint64) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	binary.LittleEndian.PutUint64(bytes[actualOffset:actualOffset+8], value)
	return nil
}

// fastReadFloat32BE 快速读取 32 位浮点数（大端）
func (be *BufferEnhancer) fastReadFloat32BE(obj *goja.Object, offset int64) (float32, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	bits := binary.BigEndian.Uint32(bytes[actualOffset : actualOffset+4])
	return math.Float32frombits(bits), nil
}

// fastReadFloat32LE 快速读取 32 位浮点数（小端）
func (be *BufferEnhancer) fastReadFloat32LE(obj *goja.Object, offset int64) (float32, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	bits := binary.LittleEndian.Uint32(bytes[actualOffset : actualOffset+4])
	return math.Float32frombits(bits), nil
}

// fastWriteFloat32BE 快速写入 32 位浮点数（大端）
func (be *BufferEnhancer) fastWriteFloat32BE(obj *goja.Object, offset int64, value float32) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	bits := math.Float32bits(value)
	binary.BigEndian.PutUint32(bytes[actualOffset:actualOffset+4], bits)
	return nil
}

// fastWriteFloat32LE 快速写入 32 位浮点数（小端）
func (be *BufferEnhancer) fastWriteFloat32LE(obj *goja.Object, offset int64, value float32) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+4 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	bits := math.Float32bits(value)
	binary.LittleEndian.PutUint32(bytes[actualOffset:actualOffset+4], bits)
	return nil
}

// fastReadFloat64BE 快速读取 64 位浮点数（大端）
func (be *BufferEnhancer) fastReadFloat64BE(obj *goja.Object, offset int64) (float64, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	bits := binary.BigEndian.Uint64(bytes[actualOffset : actualOffset+8])
	return math.Float64frombits(bits), nil
}

// fastReadFloat64LE 快速读取 64 位浮点数（小端）
func (be *BufferEnhancer) fastReadFloat64LE(obj *goja.Object, offset int64) (float64, error) {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return 0, err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return 0, fmt.Errorf("offset out of range")
	}

	bits := binary.LittleEndian.Uint64(bytes[actualOffset : actualOffset+8])
	return math.Float64frombits(bits), nil
}

// fastWriteFloat64BE 快速写入 64 位浮点数（大端）
func (be *BufferEnhancer) fastWriteFloat64BE(obj *goja.Object, offset int64, value float64) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	bits := math.Float64bits(value)
	binary.BigEndian.PutUint64(bytes[actualOffset:actualOffset+8], bits)
	return nil
}

// fastWriteFloat64LE 快速写入 64 位浮点数（小端）
func (be *BufferEnhancer) fastWriteFloat64LE(obj *goja.Object, offset int64, value float64) error {
	bytes, byteOffset, err := be.getUnderlyingBytes(obj)
	if err != nil {
		return err
	}

	actualOffset := byteOffset + offset
	if actualOffset < 0 || actualOffset+8 > int64(len(bytes)) {
		return fmt.Errorf("offset out of range")
	}

	bits := math.Float64bits(value)
	binary.LittleEndian.PutUint64(bytes[actualOffset:actualOffset+8], bits)
	return nil
}
