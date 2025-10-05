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
