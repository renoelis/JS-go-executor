package crypto

import (
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"fmt"
	"math/big"

	"github.com/btcsuite/btcd/btcec/v2"
	ed448lib "github.com/cloudflare/circl/sign/ed448"
)

// ============================================================================
// 🔥 JWK (JSON Web Key) 功能
// ============================================================================

// RSAPublicKeyToJWK 将 RSA 公钥转换为 JWK 格式
func RSAPublicKeyToJWK(pub *rsa.PublicKey) map[string]interface{} {
	// base64url 编码（无 padding）
	n := base64.RawURLEncoding.EncodeToString(pub.N.Bytes())
	e := base64.RawURLEncoding.EncodeToString(big.NewInt(int64(pub.E)).Bytes())

	return map[string]interface{}{
		"kty": "RSA",
		"n":   n,
		"e":   e,
	}
}

// RSAPrivateKeyToJWK 将 RSA 私钥转换为 JWK 格式
func RSAPrivateKeyToJWK(priv *rsa.PrivateKey) map[string]interface{} {
	// 公钥部分
	jwk := RSAPublicKeyToJWK(&priv.PublicKey)

	// 确保 CRT 参数已预计算
	if priv.Precomputed.Dp == nil || priv.Precomputed.Dq == nil || priv.Precomputed.Qinv == nil {
		priv.Precompute()
	}

	// 私钥部分（base64url 编码，无 padding）
	jwk["d"] = base64.RawURLEncoding.EncodeToString(priv.D.Bytes())
	jwk["p"] = base64.RawURLEncoding.EncodeToString(priv.Primes[0].Bytes())
	jwk["q"] = base64.RawURLEncoding.EncodeToString(priv.Primes[1].Bytes())
	jwk["dp"] = base64.RawURLEncoding.EncodeToString(priv.Precomputed.Dp.Bytes())
	jwk["dq"] = base64.RawURLEncoding.EncodeToString(priv.Precomputed.Dq.Bytes())
	jwk["qi"] = base64.RawURLEncoding.EncodeToString(priv.Precomputed.Qinv.Bytes())

	return jwk
}

// JWKToRSAPublicKey 从 JWK 格式转换为 RSA 公钥
func JWKToRSAPublicKey(jwk map[string]interface{}) (*rsa.PublicKey, error) {
	// 验证 kty
	kty, ok := jwk["kty"].(string)
	if !ok || kty != "RSA" {
		return nil, fmt.Errorf("JWK kty 必须是 'RSA'")
	}

	// 解析 n (modulus)
	nStr, ok := jwk["n"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'n' 字段")
	}
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'n' 失败: %w", err)
	}
	n := new(big.Int).SetBytes(nBytes)

	// 解析 e (exponent)
	eStr, ok := jwk["e"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'e' 字段")
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'e' 失败: %w", err)
	}
	e := new(big.Int).SetBytes(eBytes)

	return &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}, nil
}

// JWKToRSAPrivateKey 从 JWK 格式转换为 RSA 私钥
func JWKToRSAPrivateKey(jwk map[string]interface{}) (*rsa.PrivateKey, error) {
	// 先解析公钥部分
	pub, err := JWKToRSAPublicKey(jwk)
	if err != nil {
		return nil, err
	}

	priv := &rsa.PrivateKey{
		PublicKey: *pub,
	}

	// 解析 d (private exponent)
	dStr, ok := jwk["d"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'd' 字段（私钥）")
	}
	dBytes, err := base64.RawURLEncoding.DecodeString(dStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'd' 失败: %w", err)
	}
	priv.D = new(big.Int).SetBytes(dBytes)

	// 解析 p 和 q (primes)
	pStr, ok := jwk["p"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'p' 字段")
	}
	pBytes, err := base64.RawURLEncoding.DecodeString(pStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'p' 失败: %w", err)
	}

	qStr, ok := jwk["q"].(string)
	if !ok {
		return nil, fmt.Errorf("JWK 缺少 'q' 字段")
	}
	qBytes, err := base64.RawURLEncoding.DecodeString(qStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'q' 失败: %w", err)
	}

	priv.Primes = []*big.Int{
		new(big.Int).SetBytes(pBytes),
		new(big.Int).SetBytes(qBytes),
	}

	// 解析 CRT 参数（可选，如果没有则重新计算）
	if dpStr, ok := jwk["dp"].(string); ok {
		dpBytes, _ := base64.RawURLEncoding.DecodeString(dpStr)
		priv.Precomputed.Dp = new(big.Int).SetBytes(dpBytes)
	}
	if dqStr, ok := jwk["dq"].(string); ok {
		dqBytes, _ := base64.RawURLEncoding.DecodeString(dqStr)
		priv.Precomputed.Dq = new(big.Int).SetBytes(dqBytes)
	}
	if qiStr, ok := jwk["qi"].(string); ok {
		qiBytes, _ := base64.RawURLEncoding.DecodeString(qiStr)
		priv.Precomputed.Qinv = new(big.Int).SetBytes(qiBytes)
	}

	// 预计算（如果 CRT 参数不完整）
	priv.Precompute()

	// 验证密钥
	if err := priv.Validate(); err != nil {
		return nil, fmt.Errorf("JWK 密钥验证失败: %w", err)
	}

	return priv, nil
}

// JWKToPublicKey 从 JWK 格式转换为任意类型的公钥
func JWKToPublicKey(jwk map[string]interface{}) (interface{}, string, error) {
	kty, ok := jwk["kty"].(string)
	if !ok {
		return nil, "", fmt.Errorf("JWK缺少 'kty' 字段")
	}

	switch kty {
	case "RSA":
		key, err := JWKToRSAPublicKey(jwk)
		return key, "rsa", err
	case "EC":
		key, err := JWKToECPublicKey(jwk)
		return key, "ec", err
	case "OKP":
		// 根据 crv 字段判断具体类型
		crv, ok := jwk["crv"].(string)
		if !ok {
			return nil, "", fmt.Errorf("OKP JWK 缺少 'crv' 字段")
		}
		switch crv {
		case "Ed25519":
			key, err := JWKToEd25519PublicKey(jwk)
			return key, "ed25519", err
		case "Ed448":
			key, err := JWKToEd448PublicKey(jwk)
			return key, "ed448", err
		case "X25519":
			key, err := JWKToX25519PublicKey(jwk)
			return key, "x25519", err
		case "X448":
			key, err := JWKToX448PublicKey(jwk)
			return key, "x448", err
		default:
			return nil, "", fmt.Errorf("不支持的 OKP 曲线: %s", crv)
		}
	default:
		return nil, "", fmt.Errorf("不支持的 JWK kty: %s", kty)
	}
}

// JWKToPrivateKey 从 JWK 格式转换为任意类型的私钥
func JWKToPrivateKey(jwk map[string]interface{}) (interface{}, string, error) {
	kty, ok := jwk["kty"].(string)
	if !ok {
		return nil, "", fmt.Errorf("JWK缺少 'kty' 字段")
	}

	switch kty {
	case "RSA":
		key, err := JWKToRSAPrivateKey(jwk)
		return key, "rsa", err
	case "EC":
		key, err := JWKToECPrivateKey(jwk)
		return key, "ec", err
	case "OKP":
		// 根据 crv 字段判断具体类型
		crv, ok := jwk["crv"].(string)
		if !ok {
			return nil, "", fmt.Errorf("OKP JWK 缺少 'crv' 字段")
		}
		switch crv {
		case "Ed25519":
			key, err := JWKToEd25519PrivateKey(jwk)
			return key, "ed25519", err
		case "Ed448":
			key, err := JWKToEd448PrivateKey(jwk)
			return key, "ed448", err
		case "X25519":
			key, err := JWKToX25519PrivateKey(jwk)
			return key, "x25519", err
		case "X448":
			key, err := JWKToX448PrivateKey(jwk)
			return key, "x448", err
		default:
			return nil, "", fmt.Errorf("不支持的 OKP 曲线: %s", crv)
		}
	default:
		return nil, "", fmt.Errorf("不支持的 JWK kty: %s", kty)
	}
}

// ============================================================================
// 🔥 EC JWK 支持
// ============================================================================

// JWKToECPublicKey 从 JWK 转换为 EC 公钥
func JWKToECPublicKey(jwk map[string]interface{}) (*ecdsa.PublicKey, error) {
	kty, ok := jwk["kty"].(string)
	if !ok || kty != "EC" {
		return nil, fmt.Errorf("JWK kty 必须是 'EC'")
	}

	crv, ok := jwk["crv"].(string)
	if !ok {
		return nil, fmt.Errorf("EC JWK 缺少 'crv' 字段")
	}

	// 选择曲线
	var curve elliptic.Curve
	switch crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	case "secp256k1":
		curve = btcec.S256()
	default:
		return nil, fmt.Errorf("不支持的 EC 曲线: %s", crv)
	}

	// 解析 x 和 y
	xStr, ok := jwk["x"].(string)
	if !ok {
		return nil, fmt.Errorf("EC JWK 缺少 'x' 字段")
	}
	xBytes, err := base64.RawURLEncoding.DecodeString(xStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'x' 失败: %w", err)
	}

	yStr, ok := jwk["y"].(string)
	if !ok {
		return nil, fmt.Errorf("EC JWK 缺少 'y' 字段")
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(yStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'y' 失败: %w", err)
	}

	return &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
	}, nil
}

// JWKToECPrivateKey 从 JWK 转换为 EC 私钥
func JWKToECPrivateKey(jwk map[string]interface{}) (*ecdsa.PrivateKey, error) {
	// 先解析公钥部分
	pub, err := JWKToECPublicKey(jwk)
	if err != nil {
		return nil, err
	}

	// 解析私钥
	dStr, ok := jwk["d"].(string)
	if !ok {
		return nil, fmt.Errorf("EC JWK 缺少 'd' 字段（私钥）")
	}
	dBytes, err := base64.RawURLEncoding.DecodeString(dStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'd' 失败: %w", err)
	}

	return &ecdsa.PrivateKey{
		PublicKey: *pub,
		D:         new(big.Int).SetBytes(dBytes),
	}, nil
}

// ============================================================================
// 🔥 Ed25519 JWK 支持
// ============================================================================

// JWKToEd25519PublicKey 从 JWK 转换为 Ed25519 公钥
func JWKToEd25519PublicKey(jwk map[string]interface{}) (ed25519.PublicKey, error) {
	kty, ok := jwk["kty"].(string)
	if !ok || kty != "OKP" {
		return nil, fmt.Errorf("JWK kty 必须是 'OKP'")
	}

	crv, ok := jwk["crv"].(string)
	if !ok || crv != "Ed25519" {
		return nil, fmt.Errorf("JWK crv 必须是 'Ed25519'")
	}

	xStr, ok := jwk["x"].(string)
	if !ok {
		return nil, fmt.Errorf("Ed25519 JWK 缺少 'x' 字段")
	}
	xBytes, err := base64.RawURLEncoding.DecodeString(xStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'x' 失败: %w", err)
	}

	if len(xBytes) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("Ed25519 公钥长度错误: %d", len(xBytes))
	}

	return ed25519.PublicKey(xBytes), nil
}

// JWKToEd25519PrivateKey 从 JWK 转换为 Ed25519 私钥
func JWKToEd25519PrivateKey(jwk map[string]interface{}) (ed25519.PrivateKey, error) {
	// 解析公钥部分
	pub, err := JWKToEd25519PublicKey(jwk)
	if err != nil {
		return nil, err
	}

	// 解析私钥
	dStr, ok := jwk["d"].(string)
	if !ok {
		return nil, fmt.Errorf("Ed25519 JWK 缺少 'd' 字段（私钥）")
	}
	dBytes, err := base64.RawURLEncoding.DecodeString(dStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'd' 失败: %w", err)
	}

	if len(dBytes) != 32 {
		return nil, fmt.Errorf("Ed25519 私钥种子长度错误: %d", len(dBytes))
	}

	// Ed25519 私钥 = 种子(32字节) + 公钥(32字节)
	privKey := make([]byte, ed25519.PrivateKeySize)
	copy(privKey[:32], dBytes)
	copy(privKey[32:], pub)

	return ed25519.PrivateKey(privKey), nil
}

// ============================================================================
// 🔥 Ed448 JWK 支持
// ============================================================================

// JWKToEd448PublicKey 从 JWK 转换为 Ed448 公钥
func JWKToEd448PublicKey(jwk map[string]interface{}) (ed448lib.PublicKey, error) {
	kty, ok := jwk["kty"].(string)
	if !ok || kty != "OKP" {
		return nil, fmt.Errorf("JWK kty 必须是 'OKP'")
	}

	crv, ok := jwk["crv"].(string)
	if !ok || crv != "Ed448" {
		return nil, fmt.Errorf("JWK crv 必须是 'Ed448'")
	}

	xStr, ok := jwk["x"].(string)
	if !ok {
		return nil, fmt.Errorf("Ed448 JWK 缺少 'x' 字段")
	}
	xBytes, err := base64.RawURLEncoding.DecodeString(xStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'x' 失败: %w", err)
	}

	if len(xBytes) != ed448lib.PublicKeySize {
		return nil, fmt.Errorf("Ed448 公钥长度错误: %d", len(xBytes))
	}

	return ed448lib.PublicKey(xBytes), nil
}

// JWKToEd448PrivateKey 从 JWK 转换为 Ed448 私钥
func JWKToEd448PrivateKey(jwk map[string]interface{}) (ed448lib.PrivateKey, error) {
	// 解析公钥部分
	pub, err := JWKToEd448PublicKey(jwk)
	if err != nil {
		return nil, err
	}

	// 解析私钥
	dStr, ok := jwk["d"].(string)
	if !ok {
		return nil, fmt.Errorf("Ed448 JWK 缺少 'd' 字段（私钥）")
	}
	dBytes, err := base64.RawURLEncoding.DecodeString(dStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'd' 失败: %w", err)
	}

	if len(dBytes) != 57 {
		return nil, fmt.Errorf("Ed448 私钥种子长度错误: %d", len(dBytes))
	}

	// Ed448 私钥 = 种子(57字节) + 公钥(57字节)
	privKey := make([]byte, ed448lib.PrivateKeySize)
	copy(privKey[:57], dBytes)
	copy(privKey[57:], pub)

	return ed448lib.PrivateKey(privKey), nil
}

// ============================================================================
// 🔥 X25519 JWK 支持
// ============================================================================

// JWKToX25519PublicKey 从 JWK 转换为 X25519 公钥
func JWKToX25519PublicKey(jwk map[string]interface{}) ([]byte, error) {
	kty, ok := jwk["kty"].(string)
	if !ok || kty != "OKP" {
		return nil, fmt.Errorf("JWK kty 必须是 'OKP'")
	}

	crv, ok := jwk["crv"].(string)
	if !ok || crv != "X25519" {
		return nil, fmt.Errorf("JWK crv 必须是 'X25519'")
	}

	xStr, ok := jwk["x"].(string)
	if !ok {
		return nil, fmt.Errorf("X25519 JWK 缺少 'x' 字段")
	}
	xBytes, err := base64.RawURLEncoding.DecodeString(xStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'x' 失败: %w", err)
	}

	if len(xBytes) != 32 {
		return nil, fmt.Errorf("X25519 公钥长度错误: %d", len(xBytes))
	}

	return xBytes, nil
}

// JWKToX25519PrivateKey 从 JWK 转换为 X25519 私钥
func JWKToX25519PrivateKey(jwk map[string]interface{}) ([]byte, error) {
	dStr, ok := jwk["d"].(string)
	if !ok {
		return nil, fmt.Errorf("X25519 JWK 缺少 'd' 字段（私钥）")
	}
	dBytes, err := base64.RawURLEncoding.DecodeString(dStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'd' 失败: %w", err)
	}

	if len(dBytes) != 32 {
		return nil, fmt.Errorf("X25519 私钥长度错误: %d", len(dBytes))
	}

	return dBytes, nil
}

// ============================================================================
// 🔥 X448 JWK 支持
// ============================================================================

// JWKToX448PublicKey 从 JWK 转换为 X448 公钥
func JWKToX448PublicKey(jwk map[string]interface{}) ([]byte, error) {
	kty, ok := jwk["kty"].(string)
	if !ok || kty != "OKP" {
		return nil, fmt.Errorf("JWK kty 必须是 'OKP'")
	}

	crv, ok := jwk["crv"].(string)
	if !ok || crv != "X448" {
		return nil, fmt.Errorf("JWK crv 必须是 'X448'")
	}

	xStr, ok := jwk["x"].(string)
	if !ok {
		return nil, fmt.Errorf("X448 JWK 缺少 'x' 字段")
	}
	xBytes, err := base64.RawURLEncoding.DecodeString(xStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'x' 失败: %w", err)
	}

	if len(xBytes) != 56 {
		return nil, fmt.Errorf("X448 公钥长度错误: %d", len(xBytes))
	}

	return xBytes, nil
}

// JWKToX448PrivateKey 从 JWK 转换为 X448 私钥
func JWKToX448PrivateKey(jwk map[string]interface{}) ([]byte, error) {
	dStr, ok := jwk["d"].(string)
	if !ok {
		return nil, fmt.Errorf("X448 JWK 缺少 'd' 字段（私钥）")
	}
	dBytes, err := base64.RawURLEncoding.DecodeString(dStr)
	if err != nil {
		return nil, fmt.Errorf("解码 JWK 'd' 失败: %w", err)
	}

	if len(dBytes) != 56 {
		return nil, fmt.Errorf("X448 私钥长度错误: %d", len(dBytes))
	}

	return dBytes, nil
}
