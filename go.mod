module flow-codeblock-go

go 1.25.0

toolchain go1.25.3

require (
	github.com/DATA-DOG/go-sqlmock v1.5.2
	github.com/alicebob/miniredis/v2 v2.30.3
	github.com/btcsuite/btcd/btcec/v2 v2.3.6
	github.com/cloudflare/circl v1.6.1
	github.com/dop251/goja v0.0.0-20251103141225-af2ceb9156d7
	github.com/dop251/goja_nodejs v0.0.0-20250409162600-f7acab6894b0
	github.com/emmansun/gmsm v0.34.1
	github.com/gin-contrib/pprof v1.5.3
	github.com/gin-gonic/gin v1.10.0
	github.com/go-sql-driver/mysql v1.8.1
	github.com/google/uuid v1.6.0
	github.com/jmoiron/sqlx v1.4.0
	github.com/redis/go-redis/v9 v9.7.0
	github.com/stretchr/testify v1.10.0
	github.com/xuri/excelize/v2 v2.9.1
	go.uber.org/zap v1.27.0
	golang.org/x/sync v0.17.0
	golang.org/x/time v0.13.0
)

require (
	github.com/alicebob/gopher-json v0.0.0-20200520072559-a9ecdc9d1d3a // indirect
	github.com/decred/dcrd/dcrec/secp256k1/v4 v4.0.1 // indirect
	github.com/rogpeppe/go-internal v1.14.1 // indirect
	github.com/stretchr/objx v0.5.2 // indirect
	github.com/yuin/gopher-lua v1.1.0 // indirect
	gopkg.in/check.v1 v1.0.0-20190902080502-41f04d3bba15 // indirect
)

require (
	filippo.io/edwards25519 v1.1.0 // indirect
	github.com/bytedance/sonic/loader v0.2.4 // indirect
	github.com/cloudwego/base64x v0.1.5 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/pmezard/go-difflib v1.0.0 // indirect
	github.com/valyala/bytebufferpool v1.0.0
)

require (
	github.com/bytedance/sonic v1.13.2 // indirect
	github.com/cespare/xxhash/v2 v2.3.0
	github.com/dlclark/regexp2 v1.11.5 // indirect
	github.com/dop251/base64dec v0.0.0-20231022112746-c6c9f9a96217 // indirect
	github.com/gabriel-vasile/mimetype v1.4.8 // indirect
	github.com/gin-contrib/sse v1.0.0 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.26.0 // indirect
	github.com/go-sourcemap/sourcemap v2.1.4+incompatible // indirect
	github.com/goccy/go-json v0.10.5 // indirect
	github.com/google/pprof v0.0.0-20251007162407-5df77e3f7d1d // indirect
	github.com/json-iterator/go v1.1.12
	github.com/klauspost/cpuid/v2 v2.2.10 // indirect
	github.com/leodido/go-urn v1.4.0 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/pelletier/go-toml/v2 v2.2.3 // indirect
	github.com/richardlehane/mscfb v1.0.4 // indirect
	github.com/richardlehane/msoleps v1.0.4 // indirect
	github.com/sony/gobreaker v1.0.0
	github.com/tiendc/go-deepcopy v1.6.0 // indirect
	github.com/twitchyliquid64/golang-asm v0.15.1 // indirect
	github.com/ugorji/go/codec v1.2.12 // indirect
	github.com/xuri/efp v0.0.1 // indirect
	github.com/xuri/nfp v0.0.1 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/arch v0.16.0 // indirect
	golang.org/x/crypto v0.42.0
	golang.org/x/net v0.43.0
	golang.org/x/sys v0.36.0 // indirect
	golang.org/x/text v0.30.0
	google.golang.org/protobuf v1.36.6 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

// 使用修复了 TypedArray 极值转换问题的 goja fork 版本（远程仓库），替换replace github.com/dop251/goja => ./fork_goja/goja（本地路径）
// Fork 仓库：https://github.com/renoelis/goja
// 标签版本：v0.0.1-typedarray-fix
// 如果 Go 代理未索引，可以临时使用：replace github.com/dop251/goja => github.com/renoelis/goja v0.0.1-typedarray-fix
replace github.com/dop251/goja => github.com/renoelis/goja v0.0.0-20251113131334-b6e882900a3f

replace github.com/dop251/goja_nodejs => github.com/renoelis/goja_nodejs v0.0.0-20251201054723-a9d20f34bc8f
