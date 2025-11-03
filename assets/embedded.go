package assets

import (
	_ "embed"
)

//go:embed external-libs/crypto-js.min.js
var CryptoJS string

//go:embed axios.js
var AxiosJS string

//go:embed external-libs/date-fns.min.js
var DateFns string

//go:embed external-libs/qs.min.js
var Qs string

//go:embed external-libs/lodash.min.js
var Lodash string

// Pinyin 已移除：现已使用 Go 原生实现（enhance_modules/pinyin）
// 不再需要嵌入 JavaScript 代码，性能和功能都更强大
var Pinyin string = "" // 保留变量以保持接口兼容性

//go:embed external-libs/uuid.min.js
var Uuid string

//go:embed external-libs/fast-xml-parser.min.js
var FastXMLParser string

//go:embed codemirror/ace.js
var AceEditor string

//go:embed codemirror/mode-javascript.js
var AceModeJavaScript string

//go:embed codemirror/mode-json.js
var AceModeJSON string

//go:embed codemirror/theme-monokai.js
var AceThemeMonokai string

//go:embed codemirror/worker-javascript.js
var AceWorkerJavaScript string

//go:embed codemirror/worker-json.js
var AceWorkerJSON string

//go:embed codemirror/ext-searchbox.js
var AceExtSearchbox string

// SMCrypto 已移除：现已使用 Go 原生实现（enhance_modules/sm_crypto）
// 不再需要嵌入 JavaScript 代码，性能提升 10-100 倍
var SMCrypto string = "" // 保留变量以保持接口兼容性
