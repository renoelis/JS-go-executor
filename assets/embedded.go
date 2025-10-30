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

//go:embed external-libs/pinyin.min.js
var Pinyin string

//go:embed external-libs/uuid.min.js
var Uuid string

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

//go:embed external-libs/sm-crypto-v2.js
var SMCrypto string
