package streams

import _ "embed"

// readableStreamPolyfillJS 包含 web-streams-polyfill v4.0.0 的 ES5 版本，
// 用于在 goja 运行时注入 ReadableStream 等相关 API。
//
//go:embed readable_stream_polyfill.es5.js
var readableStreamPolyfillJS string
