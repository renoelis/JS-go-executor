package crypto

import (
	"crypto/ed25519"
	"encoding/asn1"
	"fmt"

	"github.com/dop251/goja"
)

// RFC 8410 OIDs for X25519, X448, Ed25519, Ed448
var (
	oidX25519  = asn1.ObjectIdentifier{1, 3, 101, 110}
	oidX448    = asn1.ObjectIdentifier{1, 3, 101, 111}
	oidEd25519 = asn1.ObjectIdentifier{1, 3, 101, 112}
	oidEd448   = asn1.ObjectIdentifier{1, 3, 101, 113}
)

// pkixPublicKey reflects the ASN.1 structure for SubjectPublicKeyInfo
type pkixPublicKey struct {
	Algorithm pkixAlgorithmIdentifier
	PublicKey asn1.BitString
}

type pkixAlgorithmIdentifier struct {
	Algorithm  asn1.ObjectIdentifier
	Parameters asn1.RawValue `asn1:"optional"`
}

// pkcs8PrivateKey reflects the ASN.1 structure for PKCS#8 private keys
type pkcs8PrivateKey struct {
	Version    int
	Algorithm  pkixAlgorithmIdentifier
	PrivateKey []byte
}

// MarshalX25519PublicKey marshals a X25519 public key to SPKI format
func MarshalX25519PublicKey(publicKey []byte) ([]byte, error) {
	if len(publicKey) != 32 {
		return nil, fmt.Errorf("X25519 public key must be 32 bytes, got %d", len(publicKey))
	}

	spki := pkixPublicKey{
		Algorithm: pkixAlgorithmIdentifier{
			Algorithm: oidX25519,
		},
		PublicKey: asn1.BitString{
			Bytes:     publicKey,
			BitLength: len(publicKey) * 8,
		},
	}

	return asn1.Marshal(spki)
}

// MarshalX25519PrivateKey marshals a X25519 private key to PKCS#8 format
func MarshalX25519PrivateKey(privateKey []byte) ([]byte, error) {
	if len(privateKey) != 32 {
		return nil, fmt.Errorf("X25519 private key must be 32 bytes, got %d", len(privateKey))
	}

	// PKCS#8 wraps the private key in an OCTET STRING
	privateKeyOctetString, err := asn1.Marshal(privateKey)
	if err != nil {
		return nil, err
	}

	pkcs8 := pkcs8PrivateKey{
		Version: 0,
		Algorithm: pkixAlgorithmIdentifier{
			Algorithm: oidX25519,
		},
		PrivateKey: privateKeyOctetString,
	}

	return asn1.Marshal(pkcs8)
}

// MarshalX448PublicKey marshals a X448 public key to SPKI format
func MarshalX448PublicKey(publicKey []byte) ([]byte, error) {
	if len(publicKey) != 56 {
		return nil, fmt.Errorf("X448 public key must be 56 bytes, got %d", len(publicKey))
	}

	spki := pkixPublicKey{
		Algorithm: pkixAlgorithmIdentifier{
			Algorithm: oidX448,
		},
		PublicKey: asn1.BitString{
			Bytes:     publicKey,
			BitLength: len(publicKey) * 8,
		},
	}

	return asn1.Marshal(spki)
}

// MarshalX448PrivateKey marshals a X448 private key to PKCS#8 format
func MarshalX448PrivateKey(privateKey []byte) ([]byte, error) {
	if len(privateKey) != 56 {
		return nil, fmt.Errorf("X448 private key must be 56 bytes, got %d", len(privateKey))
	}

	// PKCS#8 wraps the private key in an OCTET STRING
	privateKeyOctetString, err := asn1.Marshal(privateKey)
	if err != nil {
		return nil, err
	}

	pkcs8 := pkcs8PrivateKey{
		Version: 0,
		Algorithm: pkixAlgorithmIdentifier{
			Algorithm: oidX448,
		},
		PrivateKey: privateKeyOctetString,
	}

	return asn1.Marshal(pkcs8)
}

// MarshalEd25519PublicKeyPKIX marshals Ed25519 public key to SPKI (for completeness)
func MarshalEd25519PublicKeyPKIX(publicKey ed25519.PublicKey) ([]byte, error) {
	if len(publicKey) != ed25519.PublicKeySize {
		return nil, fmt.Errorf("Ed25519 public key must be %d bytes, got %d", ed25519.PublicKeySize, len(publicKey))
	}

	spki := pkixPublicKey{
		Algorithm: pkixAlgorithmIdentifier{
			Algorithm: oidEd25519,
		},
		PublicKey: asn1.BitString{
			Bytes:     publicKey,
			BitLength: len(publicKey) * 8,
		},
	}

	return asn1.Marshal(spki)
}

// MarshalEd25519PrivateKeyPKCS8 marshals Ed25519 private key to PKCS#8 (for completeness)
func MarshalEd25519PrivateKeyPKCS8(privateKey ed25519.PrivateKey) ([]byte, error) {
	if len(privateKey) != ed25519.PrivateKeySize {
		return nil, fmt.Errorf("Ed25519 private key must be %d bytes, got %d", ed25519.PrivateKeySize, len(privateKey))
	}

	// Ed25519 private key is 64 bytes, but PKCS#8 only stores the seed (first 32 bytes)
	seed := privateKey[:32]

	// PKCS#8 wraps the seed in an OCTET STRING
	privateKeyOctetString, err := asn1.Marshal(seed)
	if err != nil {
		return nil, err
	}

	pkcs8 := pkcs8PrivateKey{
		Version: 0,
		Algorithm: pkixAlgorithmIdentifier{
			Algorithm: oidEd25519,
		},
		PrivateKey: privateKeyOctetString,
	}

	return asn1.Marshal(pkcs8)
}

// GenerateX448KeyPair generates a X448 key pair (placeholder - needs actual X448 implementation)
func GenerateX448KeyPairReal(runtime *goja.Runtime, options *goja.Object) ([]byte, []byte, error) {
	// X448 需要第三方库或完整实现
	// 这里提供占位符，实际需要使用 golang.org/x/crypto/curve448 或类似库
	return nil, nil, fmt.Errorf("X448 generation requires additional crypto library implementation")
}
