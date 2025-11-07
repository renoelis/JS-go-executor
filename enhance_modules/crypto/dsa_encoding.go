package crypto

import (
	"crypto/dsa"
	"crypto/x509/pkix"
	"encoding/asn1"
	"fmt"
	"math/big"
)

// DSA OID (1.2.840.10040.4.1)
var oidPublicKeyDSA = asn1.ObjectIdentifier{1, 2, 840, 10040, 4, 1}

// DSAAlgorithmParameters represents DSA algorithm parameters
type DSAAlgorithmParameters struct {
	P, Q, G *big.Int
}

// DSAPublicKey represents a DSA public key for encoding
type DSAPublicKey struct {
	Y *big.Int
}

// MarshalDSAPublicKeyPKIX marshals a DSA public key to SPKI format
func MarshalDSAPublicKeyPKIX(pub *dsa.PublicKey) ([]byte, error) {
	if pub == nil {
		return nil, fmt.Errorf("DSA public key is nil")
	}

	// Encode parameters
	params := DSAAlgorithmParameters{
		P: pub.P,
		Q: pub.Q,
		G: pub.G,
	}
	paramBytes, err := asn1.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal DSA parameters: %w", err)
	}

	// Encode public key value
	pubBytes, err := asn1.Marshal(pub.Y)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal DSA public key value: %w", err)
	}

	// Create SPKI structure
	spki := pkix.AlgorithmIdentifier{
		Algorithm:  oidPublicKeyDSA,
		Parameters: asn1.RawValue{FullBytes: paramBytes},
	}

	// Combine into SubjectPublicKeyInfo
	type subjectPublicKeyInfo struct {
		Algorithm pkix.AlgorithmIdentifier
		PublicKey asn1.BitString
	}

	spkiStruct := subjectPublicKeyInfo{
		Algorithm: spki,
		PublicKey: asn1.BitString{
			Bytes:     pubBytes,
			BitLength: len(pubBytes) * 8,
		},
	}

	return asn1.Marshal(spkiStruct)
}

// MarshalDSAPrivateKeyPKCS8 marshals a DSA private key to PKCS#8 format
func MarshalDSAPrivateKeyPKCS8(priv *dsa.PrivateKey) ([]byte, error) {
	if priv == nil {
		return nil, fmt.Errorf("DSA private key is nil")
	}

	// Encode parameters
	params := DSAAlgorithmParameters{
		P: priv.P,
		Q: priv.Q,
		G: priv.G,
	}
	paramBytes, err := asn1.Marshal(params)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal DSA parameters: %w", err)
	}

	// Encode private key value
	privBytes, err := asn1.Marshal(priv.X)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal DSA private key value: %w", err)
	}

	// Create PKCS#8 structure
	type pkcs8 struct {
		Version    int
		Algo       pkix.AlgorithmIdentifier
		PrivateKey []byte
	}

	pkcs8Struct := pkcs8{
		Version: 0,
		Algo: pkix.AlgorithmIdentifier{
			Algorithm:  oidPublicKeyDSA,
			Parameters: asn1.RawValue{FullBytes: paramBytes},
		},
		PrivateKey: privBytes,
	}

	return asn1.Marshal(pkcs8Struct)
}

// ParseDSAPublicKeyPKIX parses a DSA public key from SPKI format
func ParseDSAPublicKeyPKIX(der []byte) (*dsa.PublicKey, error) {
	type subjectPublicKeyInfo struct {
		Algorithm pkix.AlgorithmIdentifier
		PublicKey asn1.BitString
	}

	var spki subjectPublicKeyInfo
	if _, err := asn1.Unmarshal(der, &spki); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DSA public key SPKI: %w", err)
	}

	// Verify it's a DSA key
	if !spki.Algorithm.Algorithm.Equal(oidPublicKeyDSA) {
		return nil, fmt.Errorf("not a DSA public key")
	}

	// Parse parameters
	var params DSAAlgorithmParameters
	if _, err := asn1.Unmarshal(spki.Algorithm.Parameters.FullBytes, &params); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DSA parameters: %w", err)
	}

	// Parse public key value
	var y *big.Int
	if _, err := asn1.Unmarshal(spki.PublicKey.Bytes, &y); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DSA public key value: %w", err)
	}

	return &dsa.PublicKey{
		Parameters: dsa.Parameters{
			P: params.P,
			Q: params.Q,
			G: params.G,
		},
		Y: y,
	}, nil
}

// ParseDSAPrivateKeyPKCS8 parses a DSA private key from PKCS#8 format
func ParseDSAPrivateKeyPKCS8(der []byte) (*dsa.PrivateKey, error) {
	type pkcs8 struct {
		Version    int
		Algo       pkix.AlgorithmIdentifier
		PrivateKey []byte
	}

	var p8 pkcs8
	if _, err := asn1.Unmarshal(der, &p8); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DSA private key PKCS#8: %w", err)
	}

	// Verify it's a DSA key
	if !p8.Algo.Algorithm.Equal(oidPublicKeyDSA) {
		return nil, fmt.Errorf("not a DSA private key")
	}

	// Parse parameters
	var params DSAAlgorithmParameters
	if _, err := asn1.Unmarshal(p8.Algo.Parameters.FullBytes, &params); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DSA parameters: %w", err)
	}

	// Parse private key value
	var x *big.Int
	if _, err := asn1.Unmarshal(p8.PrivateKey, &x); err != nil {
		return nil, fmt.Errorf("failed to unmarshal DSA private key value: %w", err)
	}

	// Calculate public key: Y = G^X mod P
	y := new(big.Int).Exp(params.G, x, params.P)

	return &dsa.PrivateKey{
		PublicKey: dsa.PublicKey{
			Parameters: dsa.Parameters{
				P: params.P,
				Q: params.Q,
				G: params.G,
			},
			Y: y,
		},
		X: x,
	}, nil
}
