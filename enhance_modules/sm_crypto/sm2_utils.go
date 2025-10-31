package sm_crypto

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"errors"
	"fmt"
	"math/big"

	"github.com/dop251/goja"
	"github.com/emmansun/gmsm/sm2"
)

// ============================================================================
// 🔧 SM2 密钥格式转换工具
// ============================================================================

// HexToPrivateKey 十六进制字符串转 SM2 私钥
// 输入: 64 字符十六进制字符串 (D)
func HexToPrivateKey(privateKeyHex string) (*sm2.PrivateKey, error) {
	// 严格校验长度：必须为 64 个十六进制字符（可带 0x 前缀）
	if len(privateKeyHex) >= 2 && (privateKeyHex[:2] == "0x" || privateKeyHex[:2] == "0X") {
		privateKeyHex = privateKeyHex[2:]
	}
	if len(privateKeyHex) != 64 {
		return nil, errors.New("invalid private key length: expected 64 hex chars")
	}

	// 解析 D 值
	d := new(big.Int)
	_, success := d.SetString(privateKeyHex, 16)
	if !success {
		return nil, errors.New("invalid private key hex string")
	}

	// 验证 D 在有效范围内 (1 到 n-1)
	curve := sm2.P256()
	n := curve.Params().N
	if d.Cmp(big.NewInt(1)) < 0 || d.Cmp(n) >= 0 {
		return nil, errors.New("private key out of range")
	}

	// 使用 gmsm 库的安全方法创建私钥
	// 这样可以避免直接使用 deprecated 的 ScalarBaseMult
	privateKey, err := sm2.NewPrivateKeyFromInt(d)
	if err != nil {
		return nil, fmt.Errorf("failed to create private key: %w", err)
	}

	return privateKey, nil
}

// PrivateKeyToHex SM2 私钥转十六进制字符串
// 输出: 64 字符十六进制字符串 (D)
func PrivateKeyToHex(privateKey *sm2.PrivateKey) string {
	return LeftPad(privateKey.D.Text(16), 64)
}

// ParsePublicKeyParam 从 goja.Value 解析公钥
// 支持两种格式:
//   - string: 十六进制公钥字符串
//   - object: {x: string, y: string} 格式（precomputePublicKey 返回的）
func ParsePublicKeyParam(val goja.Value, runtime *goja.Runtime) (*ecdsa.PublicKey, error) {
	if val == nil || goja.IsUndefined(val) || goja.IsNull(val) {
		return nil, errors.New("public key is undefined or null")
	}

	// 尝试作为对象 {x, y}
	// 使用 defer recover 保护，防止 nil 指针
	var isObject bool
	var x, y *big.Int

	func() {
		defer func() {
			if r := recover(); r != nil {
				// 不是对象或获取失败，继续尝试字符串
				isObject = false
			}
		}()

		obj := val.ToObject(runtime)
		if obj != nil {
			xVal := obj.Get("x")
			yVal := obj.Get("y")
			if xVal != nil && yVal != nil && !goja.IsUndefined(xVal) && !goja.IsUndefined(yVal) {
				// 这是一个 {x, y} 对象
				xHex := xVal.String()
				yHex := yVal.String()

				x = new(big.Int)
				y = new(big.Int)
				_, okX := x.SetString(xHex, 16)
				_, okY := y.SetString(yHex, 16)

				if okX && okY {
					isObject = true
				}
			}
		}
	}()

	if isObject {
		curve := sm2.P256()
		if !curve.IsOnCurve(x, y) {
			return nil, errors.New("public key point is not on curve")
		}
		return &ecdsa.PublicKey{
			Curve: curve,
			X:     x,
			Y:     y,
		}, nil
	}

	// 尝试作为字符串
	publicKeyHex := val.String()
	return HexToPublicKey(publicKeyHex)
}

// HexToPublicKey 十六进制字符串转 SM2 公钥
// 支持 3 种格式:
//   - 未压缩: "04" + X (64 字符) + Y (64 字符) = 130 字符
//   - 压缩 (Y 为偶数): "02" + X (64 字符) = 66 字符
//   - 压缩 (Y 为奇数): "03" + X (64 字符) = 66 字符
func HexToPublicKey(publicKeyHex string) (*ecdsa.PublicKey, error) {
	// 移除可能的 0x 前缀
	if len(publicKeyHex) >= 2 && (publicKeyHex[:2] == "0x" || publicKeyHex[:2] == "0X") {
		publicKeyHex = publicKeyHex[2:]
	}

	curve := sm2.P256()
	var x, y *big.Int

	if len(publicKeyHex) == 130 && publicKeyHex[:2] == "04" {
		// 未压缩格式: 04 + X + Y
		x = new(big.Int)
		y = new(big.Int)
		_, successX := x.SetString(publicKeyHex[2:66], 16)
		_, successY := y.SetString(publicKeyHex[66:130], 16)
		if !successX || !successY {
			return nil, errors.New("invalid uncompressed public key hex")
		}
	} else if len(publicKeyHex) == 66 && (publicKeyHex[:2] == "02" || publicKeyHex[:2] == "03") {
		// 压缩格式: 02/03 + X
		x = new(big.Int)
		_, success := x.SetString(publicKeyHex[2:66], 16)
		if !success {
			return nil, errors.New("invalid compressed public key hex")
		}

		// 从 X 恢复 Y
		y = decompressPoint(curve, x, publicKeyHex[0] == '0' && publicKeyHex[1] == '3')
		if y == nil {
			return nil, errors.New("failed to decompress public key")
		}
	} else {
		return nil, fmt.Errorf("invalid public key length: %d (expected 130 or 66)", len(publicKeyHex))
	}

	// 验证点在曲线上
	if !curve.IsOnCurve(x, y) {
		return nil, errors.New("public key point is not on curve")
	}

	return &ecdsa.PublicKey{
		Curve: curve,
		X:     x,
		Y:     y,
	}, nil
}

// PublicKeyToHex SM2 公钥转十六进制字符串
// compressed: true = 压缩格式(66 字符), false = 未压缩格式(130 字符)
func PublicKeyToHex(publicKey *ecdsa.PublicKey, compressed bool) string {
	if compressed {
		// 压缩格式: 02/03 + X
		prefix := "02"
		if publicKey.Y.Bit(0) == 1 {
			prefix = "03" // Y 为奇数
		}
		return prefix + LeftPad(publicKey.X.Text(16), 64)
	}

	// 未压缩格式: 04 + X + Y
	return "04" + LeftPad(publicKey.X.Text(16), 64) + LeftPad(publicKey.Y.Text(16), 64)
}

// ============================================================================
// 🔧 椭圆曲线点压缩/解压缩
// ============================================================================

// decompressPoint 从压缩格式恢复 Y 坐标
// 根据椭圆曲线方程: y^2 = x^3 + ax + b (mod p)
func decompressPoint(curve elliptic.Curve, x *big.Int, yOdd bool) *big.Int {
	params := curve.Params()

	// 计算 y^2 = x^3 + ax + b (mod p)
	x3 := new(big.Int).Mul(x, x)
	x3.Mul(x3, x)

	threeX := new(big.Int).Lsh(x, 1)
	threeX.Add(threeX, x)

	x3.Sub(x3, threeX)
	x3.Add(x3, params.B)
	x3.Mod(x3, params.P)

	// 计算 y = sqrt(y^2) mod p
	y := new(big.Int).ModSqrt(x3, params.P)
	if y == nil {
		return nil
	}

	// 根据 yOdd 选择正确的 y
	if yOdd != (y.Bit(0) == 1) {
		y.Sub(params.P, y)
	}

	return y
}
