package service

import (
	"bytes"
	"fmt"
	"strings"
	"unicode/utf16"
	"unicode/utf8"

	nativecrypto "flow-codeblock-go/enhance_modules/crypto"

	"github.com/dop251/goja"
	"golang.org/x/text/encoding"
	"golang.org/x/text/encoding/charmap"
	"golang.org/x/text/encoding/unicode"
)

// TextEncoderStream 和 TextDecoderStream 的 polyfill
const textEncoderStreamPolyfill = `
(function (global) {
  if (typeof global.TransformStream !== 'function') {
    return;
  }
  if (typeof global.TextEncoderStream !== 'function') {
    global.TextEncoderStream = class TextEncoderStream {
      constructor() {
        const encoder = new TextEncoder();
        const transform = new TransformStream({
          transform(chunk, controller) {
            controller.enqueue(encoder.encode(typeof chunk === 'string' ? chunk : String(chunk || '')));
          }
        });
        this.readable = transform.readable;
        this.writable = transform.writable;
        this.encoding = 'utf-8';
      }
    };
  }
  if (typeof global.TextDecoderStream !== 'function') {
    global.TextDecoderStream = class TextDecoderStream {
      constructor(label, options) {
        const normalizedLabel = label || 'utf-8';
        const opts = options || {};
        const decoder = new TextDecoder(normalizedLabel, opts);
        this.encoding = decoder.encoding;
        this.fatal = !!opts.fatal;
        this.ignoreBOM = !!opts.ignoreBOM;
        const isFatal = this.fatal;
        const transform = new TransformStream({
          transform(chunk, controller) {
            try {
              const decoded = decoder.decode(chunk, { stream: true });
              if (decoded) {
                controller.enqueue(decoded);
              }
            } catch (e) {
              if (isFatal) {
                controller.error(e);
              } else {
                throw e;
              }
            }
          },
          flush(controller) {
            try {
              const remainder = decoder.decode();
              if (remainder) {
                controller.enqueue(remainder);
              }
            } catch (e) {
              if (isFatal) {
                controller.error(e);
              }
            }
          }
        });
        this.readable = transform.readable;
        this.writable = transform.writable;
      }
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
`

// 支持的编码名称映射（规范化到标准名称）
var encodingAliases = map[string]string{
	// UTF-8
	"utf-8":          "utf-8",
	"utf8":           "utf-8",
	"unicode-1-1-utf-8": "utf-8",

	// UTF-16LE
	"utf-16le":       "utf-16le",
	"utf-16":         "utf-16le", // 默认 UTF-16 是 LE
	"ucs-2":          "utf-16le",

	// UTF-16BE
	"utf-16be":       "utf-16be",

	// ISO-8859-1 (Latin-1)
	"iso-8859-1":     "iso-8859-1",
	"iso8859-1":      "iso-8859-1",
	"iso88591":       "iso-8859-1",
	"latin1":         "iso-8859-1",
	"latin-1":        "iso-8859-1",
	"l1":             "iso-8859-1",
	"ascii":          "iso-8859-1", // ASCII 是 ISO-8859-1 的子集
	"us-ascii":       "iso-8859-1",

	// Windows-1252
	"windows-1252":   "windows-1252",
	"cp1252":         "windows-1252",
}

// normalizeEncodingName 规范化编码名称
func normalizeEncodingName(label string) (string, bool) {
	// 转换为小写并去除空白
	normalized := strings.ToLower(strings.TrimSpace(label))

	if enc, ok := encodingAliases[normalized]; ok {
		return enc, true
	}
	return "", false
}

// textDecoderState 保存 TextDecoder 的状态（用于流式解码）
type textDecoderState struct {
	encoding   string
	fatal      bool
	ignoreBOM  bool
	pending    []byte // 未完成的多字节序列
	bomSeen    bool   // 是否已经处理过 BOM
}

// newTextDecoderState 创建新的 TextDecoder 状态
func newTextDecoderState(encoding string, fatal, ignoreBOM bool) *textDecoderState {
	return &textDecoderState{
		encoding:  encoding,
		fatal:     fatal,
		ignoreBOM: ignoreBOM,
		pending:   nil,
		bomSeen:   false,
	}
}

// decode 解码字节数据
func (s *textDecoderState) decode(data []byte, stream bool) (string, error) {
	// 合并 pending 数据
	if len(s.pending) > 0 {
		data = append(s.pending, data...)
		s.pending = nil
	}

	switch s.encoding {
	case "utf-8":
		return s.decodeUTF8(data, stream)
	case "utf-16le":
		return s.decodeUTF16LE(data, stream)
	case "utf-16be":
		return s.decodeUTF16BE(data, stream)
	case "iso-8859-1":
		return s.decodeISO8859_1(data)
	case "windows-1252":
		return s.decodeWindows1252(data)
	default:
		return s.decodeUTF8(data, stream) // 默认 UTF-8
	}
}

// decodeUTF8 解码 UTF-8
func (s *textDecoderState) decodeUTF8(data []byte, stream bool) (string, error) {
	// 处理 BOM
	if !s.bomSeen && len(data) >= 3 {
		if data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF {
			s.bomSeen = true
			if !s.ignoreBOM {
				data = data[3:] // 跳过 BOM
			}
		}
	}
	s.bomSeen = true

	if stream {
		// 流模式：检查末尾是否有不完整的多字节序列
		validEnd := len(data)
		for i := len(data) - 1; i >= 0 && i >= len(data)-4; i-- {
			if data[i]&0xC0 != 0x80 { // 找到起始字节
				// 计算这个字符需要多少字节
				needed := 1
				if data[i]&0xE0 == 0xC0 {
					needed = 2
				} else if data[i]&0xF0 == 0xE0 {
					needed = 3
				} else if data[i]&0xF8 == 0xF0 {
					needed = 4
				}

				available := len(data) - i
				if available < needed {
					// 不完整的序列，保存到 pending
					s.pending = make([]byte, available)
					copy(s.pending, data[i:])
					validEnd = i
				}
				break
			}
		}
		data = data[:validEnd]
	}

	// 验证并解码 UTF-8
	if s.fatal {
		if !utf8.Valid(data) {
			return "", fmt.Errorf("The encoded data was not valid")
		}
		return string(data), nil
	}

	// 非 fatal 模式：替换无效字符
	return strings.ToValidUTF8(string(data), "\uFFFD"), nil
}

// decodeUTF16LE 解码 UTF-16LE
func (s *textDecoderState) decodeUTF16LE(data []byte, stream bool) (string, error) {
	// 处理 BOM
	if !s.bomSeen && len(data) >= 2 {
		if data[0] == 0xFF && data[1] == 0xFE {
			s.bomSeen = true
			if !s.ignoreBOM {
				data = data[2:] // 跳过 BOM
			}
		}
	}
	s.bomSeen = true

	// 如果是流模式且长度为奇数，保存最后一个字节
	if stream && len(data)%2 != 0 {
		s.pending = []byte{data[len(data)-1]}
		data = data[:len(data)-1]
	}

	if len(data) == 0 {
		return "", nil
	}

	// 解码 UTF-16LE
	u16s := make([]uint16, len(data)/2)
	for i := 0; i < len(u16s); i++ {
		u16s[i] = uint16(data[i*2]) | uint16(data[i*2+1])<<8
	}

	return string(utf16.Decode(u16s)), nil
}

// decodeUTF16BE 解码 UTF-16BE
func (s *textDecoderState) decodeUTF16BE(data []byte, stream bool) (string, error) {
	// 处理 BOM
	if !s.bomSeen && len(data) >= 2 {
		if data[0] == 0xFE && data[1] == 0xFF {
			s.bomSeen = true
			if !s.ignoreBOM {
				data = data[2:] // 跳过 BOM
			}
		}
	}
	s.bomSeen = true

	// 如果是流模式且长度为奇数，保存最后一个字节
	if stream && len(data)%2 != 0 {
		s.pending = []byte{data[len(data)-1]}
		data = data[:len(data)-1]
	}

	if len(data) == 0 {
		return "", nil
	}

	// 解码 UTF-16BE
	u16s := make([]uint16, len(data)/2)
	for i := 0; i < len(u16s); i++ {
		u16s[i] = uint16(data[i*2])<<8 | uint16(data[i*2+1])
	}

	return string(utf16.Decode(u16s)), nil
}

// decodeISO8859_1 解码 ISO-8859-1
func (s *textDecoderState) decodeISO8859_1(data []byte) (string, error) {
	// ISO-8859-1 每个字节直接映射到 Unicode 码点
	runes := make([]rune, len(data))
	for i, b := range data {
		runes[i] = rune(b)
	}
	return string(runes), nil
}

// decodeWindows1252 解码 Windows-1252
func (s *textDecoderState) decodeWindows1252(data []byte) (string, error) {
	decoder := charmap.Windows1252.NewDecoder()
	result, err := decoder.Bytes(data)
	if err != nil {
		if s.fatal {
			return "", fmt.Errorf("The encoded data was not valid")
		}
		// 非 fatal 模式，尝试逐字节解码
		var buf bytes.Buffer
		for _, b := range data {
			decoded, err := decoder.Bytes([]byte{b})
			if err != nil {
				buf.WriteRune('\uFFFD')
			} else {
				buf.Write(decoded)
			}
		}
		return buf.String(), nil
	}
	return string(result), nil
}

// flush 完成解码，处理剩余的 pending 数据
func (s *textDecoderState) flush() (string, error) {
	if len(s.pending) == 0 {
		return "", nil
	}

	s.pending = nil

	if s.fatal {
		return "", fmt.Errorf("The encoded data was not valid")
	}

	// 非 fatal 模式：返回替换字符
	return "\uFFFD", nil
}

// RegisterTextEncoders 注册 TextEncoder 和 TextDecoder 到 goja runtime
func RegisterTextEncoders(runtime *goja.Runtime) {
	// TextEncoder 构造函数
	textEncoderConstructor := func(call goja.ConstructorCall) *goja.Object {
		obj := call.This
		obj.Set("encoding", "utf-8")

		// encode 方法
		obj.Set("encode", func(call goja.FunctionCall) goja.Value {
			var input string
			if len(call.Arguments) > 0 && !goja.IsUndefined(call.Argument(0)) && !goja.IsNull(call.Argument(0)) {
				input = call.Argument(0).String()
			}

			// UTF-8 编码
			bytes := []byte(input)

			// 创建普通数组
			arr := runtime.NewArray()
			for i, b := range bytes {
				arr.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(b)))
			}

			// 使用 Uint8Array 构造函数
			uint8ArrayVal := runtime.Get("Uint8Array")
			if uint8ArrayObj, ok := uint8ArrayVal.(*goja.Object); ok && uint8ArrayObj != nil {
				if result, err := runtime.New(uint8ArrayObj, arr); err == nil {
					return result
				}
			}

			// 降级：返回普通数组
			return arr
		})

		// encodeInto 方法
		obj.Set("encodeInto", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) < 2 {
				panic(runtime.NewTypeError("Failed to execute 'encodeInto' on 'TextEncoder': 2 arguments required"))
			}

			source := call.Argument(0).String()
			dest := call.Argument(1)

			// 获取目标 Uint8Array
			destObj := dest.ToObject(runtime)
			if destObj == nil {
				panic(runtime.NewTypeError("Failed to execute 'encodeInto' on 'TextEncoder': parameter 2 is not of type 'Uint8Array'"))
			}

			// 获取目标长度
			lengthVal := destObj.Get("length")
			if goja.IsUndefined(lengthVal) {
				panic(runtime.NewTypeError("Failed to execute 'encodeInto' on 'TextEncoder': parameter 2 is not of type 'Uint8Array'"))
			}
			destLength := int(lengthVal.ToInteger())

			// 编码
			sourceBytes := []byte(source)
			written := 0
			read := 0

			for i := 0; i < len(source) && written < destLength; {
				r, size := utf8.DecodeRuneInString(source[i:])
				if written+utf8.RuneLen(r) > destLength {
					break
				}

				start := written
				for j := 0; j < size && written < destLength; j++ {
					destObj.Set(fmt.Sprintf("%d", written), runtime.ToValue(int(sourceBytes[start+j-written+j])))
					written++
				}

				// 重新计算
				encodedBytes := []byte(string(r))
				for j, b := range encodedBytes {
					if start+j >= destLength {
						break
					}
					destObj.Set(fmt.Sprintf("%d", start+j), runtime.ToValue(int(b)))
				}
				written = start + len(encodedBytes)
				if written > destLength {
					written = start
					break
				}

				read++
				i += size
			}

			// 返回结果对象
			result := runtime.NewObject()
			result.Set("read", runtime.ToValue(read))
			result.Set("written", runtime.ToValue(written))
			return result
		})

		return nil
	}

	// TextDecoder 构造函数
	textDecoderConstructor := func(call goja.ConstructorCall) *goja.Object {
		obj := call.This

		// 获取编码参数
		encodingLabel := "utf-8"
		if len(call.Arguments) > 0 && !goja.IsUndefined(call.Argument(0)) && !goja.IsNull(call.Argument(0)) {
			encodingLabel = call.Argument(0).String()
		}

		// 规范化编码名称
		normalizedEncoding, valid := normalizeEncodingName(encodingLabel)
		if !valid {
			panic(runtime.NewTypeError(fmt.Sprintf("Failed to construct 'TextDecoder': The encoding label provided ('%s') is invalid.", encodingLabel)))
		}

		// 获取选项
		fatal := false
		ignoreBOM := false
		if len(call.Arguments) > 1 && !goja.IsUndefined(call.Argument(1)) && !goja.IsNull(call.Argument(1)) {
			opts := call.Argument(1).ToObject(runtime)
			if opts != nil {
				fatalVal := opts.Get("fatal")
				if fatalVal != nil && !goja.IsUndefined(fatalVal) && !goja.IsNull(fatalVal) {
					fatal = fatalVal.ToBoolean()
				}
				ignoreBOMVal := opts.Get("ignoreBOM")
				if ignoreBOMVal != nil && !goja.IsUndefined(ignoreBOMVal) && !goja.IsNull(ignoreBOMVal) {
					ignoreBOM = ignoreBOMVal.ToBoolean()
				}
			}
		}

		// 设置属性
		obj.Set("encoding", normalizedEncoding)
		obj.Set("fatal", fatal)
		obj.Set("ignoreBOM", ignoreBOM)

		// 创建状态（用于流式解码）
		state := newTextDecoderState(normalizedEncoding, fatal, ignoreBOM)

		// decode 方法
		obj.Set("decode", func(call goja.FunctionCall) goja.Value {
			// 检查是否为流模式
			stream := false
			if len(call.Arguments) > 1 && !goja.IsUndefined(call.Argument(1)) && !goja.IsNull(call.Argument(1)) {
				opts := call.Argument(1).ToObject(runtime)
				if opts != nil {
					streamVal := opts.Get("stream")
					if streamVal != nil && !goja.IsUndefined(streamVal) && !goja.IsNull(streamVal) {
						stream = streamVal.ToBoolean()
					}
				}
			}

			// 如果没有输入，可能是 flush 操作
			if len(call.Arguments) == 0 || goja.IsUndefined(call.Argument(0)) || goja.IsNull(call.Argument(0)) {
				if !stream {
					// flush 剩余数据
					result, err := state.flush()
					if err != nil {
						panic(runtime.NewTypeError(err.Error()))
					}
					// 重置状态
					state = newTextDecoderState(normalizedEncoding, fatal, ignoreBOM)
					return runtime.ToValue(result)
				}
				return runtime.ToValue("")
			}

			input := call.Argument(0)

			// 转换输入为字节
			inputBytes, err := nativecrypto.ConvertToBytes(runtime, input)
			if err != nil || inputBytes == nil {
				return runtime.ToValue("")
			}

			// 解码
			result, err := state.decode(inputBytes, stream)
			if err != nil {
				panic(runtime.NewTypeError(err.Error()))
			}

			// 如果不是流模式，flush 并重置状态
			if !stream {
				flushResult, err := state.flush()
				if err != nil {
					panic(runtime.NewTypeError(err.Error()))
				}
				result += flushResult
				// 重置状态
				state = newTextDecoderState(normalizedEncoding, fatal, ignoreBOM)
			}

			return runtime.ToValue(result)
		})

		return nil
	}

	// 注册到全局作用域
	runtime.Set("TextEncoder", textEncoderConstructor)
	runtime.Set("TextDecoder", textDecoderConstructor)

	// 注册 Stream polyfill
	_, _ = runtime.RunString(textEncoderStreamPolyfill)
}

// getEncoder 获取编码器（用于可能的扩展）
func getEncoder(name string) encoding.Encoding {
	switch name {
	case "utf-16le":
		return unicode.UTF16(unicode.LittleEndian, unicode.IgnoreBOM)
	case "utf-16be":
		return unicode.UTF16(unicode.BigEndian, unicode.IgnoreBOM)
	case "iso-8859-1":
		return charmap.ISO8859_1
	case "windows-1252":
		return charmap.Windows1252
	default:
		return nil // UTF-8 使用原生 Go 字符串
	}
}
