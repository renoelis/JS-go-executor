package sm_crypto

// SM2EncryptOptions SM2 加密选项
type SM2EncryptOptions struct {
	ASN1 bool // 是否使用 ASN.1 格式
}

// SM2DecryptOptions SM2 解密选项
type SM2DecryptOptions struct {
	Output string // "string" | "array"
	ASN1   bool   // 是否使用 ASN.1 格式
}

// SM2SignOptions SM2 签名选项
type SM2SignOptions struct {
	Der       bool          // 是否使用 DER 格式
	Hash      bool          // 是否计算摘要（含 Z 值）
	PublicKey string        // 公钥（hash=true 时需要）
	UserID    string        // 用户 ID（hash=true 时可选，默认 "1234567812345678"）
	PointPool []interface{} // 预计算点池（兼容 Node.js 行为，签名时会消费一个点）
}

// SM2VerifyOptions SM2 验签选项
type SM2VerifyOptions struct {
	Der    bool   // 是否使用 DER 格式
	Hash   bool   // 是否计算摘要（含 Z 值）
	UserID string // 用户 ID（hash=true 时可选）
}

// SM4Options SM4 加密/解密选项
type SM4Options struct {
	Padding        string // "pkcs#5" | "pkcs#7" | "none"，默认 "pkcs#7"
	Mode           string // "ecb" | "cbc" | "gcm"，默认 ECB
	IV             []byte // CBC/GCM 模式的初始化向量
	Output         string // "string" | "array"，默认 "string"
	AssociatedData []byte // GCM 模式的附加认证数据
	Tag            []byte // GCM 解密时的认证标签
	OutputTag      bool   // GCM 加密时是否输出标签
}

// SM3Options SM3 哈希选项
type SM3Options struct {
	Mode string // "hmac" 或空
	Key  []byte // HMAC 模式的密钥
}

// SM4GCMResult SM4 GCM 模式返回结果
type SM4GCMResult struct {
	Output []byte
	Tag    []byte
}
