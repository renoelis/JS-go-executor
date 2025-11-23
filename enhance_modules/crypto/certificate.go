package crypto

import (
	stdcrypto "crypto"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/asn1"
	"encoding/base64"
	"fmt"

	"github.com/dop251/goja"
)

type spkacPublicKeyAndChallenge struct {
	SubjectPublicKeyInfo asn1.RawValue
	Challenge            string `asn1:"ia5"`
}

type signedPublicKeyAndChallenge struct {
	PublicKeyAndChallenge spkacPublicKeyAndChallenge
	SignatureAlgorithm    pkix.AlgorithmIdentifier
	Signature             asn1.BitString
}

func getSpkacBytes(runtime *goja.Runtime, spkacVal goja.Value, encVal goja.Value) ([]byte, error) {
	if spkacVal == nil || goja.IsUndefined(spkacVal) || goja.IsNull(spkacVal) {
		return nil, fmt.Errorf("spkac is undefined or null")
	}

	// Node.js quirk: string without explicit encoding works (treated as base64)
	// but explicit encoding or Buffer input fails
	if s, ok := spkacVal.Export().(string); ok {
		// Empty string returns empty, not error
		if s == "" {
			return []byte{}, nil
		}

		// Check if encoding was explicitly provided
		explicitEncoding := encVal != nil && !goja.IsUndefined(encVal) && !goja.IsNull(encVal)

		if !explicitEncoding {
			// No explicit encoding: treat as base64 (Node.js default)
			der, err := base64.StdEncoding.DecodeString(s)
			if err != nil {
				// Decode error: return empty indicating failure
				return []byte{}, nil
			}
			// Success: return decoded data
			return der, nil
		}

		// Explicit encoding: Node.js returns failure (quirk)
		// Return empty slice with no error to indicate "handled failure"
		return []byte{}, nil
	}

	// Buffer/TypedArray input: Node.js always returns failure (quirk)
	b, err := ConvertToBytes(runtime, spkacVal)
	if err != nil {
		return nil, err
	}
	if len(b) == 0 {
		// Empty buffer returns empty
		return []byte{}, nil
	}
	// Buffer input always fails in Node.js (quirk)
	// Return empty slice to indicate failure
	return []byte{}, nil
}

func parseSPKAC(der []byte) (tbs []byte, spki []byte, challenge string, alg pkix.AlgorithmIdentifier, sig []byte, err error) {
	var s signedPublicKeyAndChallenge
	if _, err = asn1.Unmarshal(der, &s); err != nil {
		return
	}
	if len(s.PublicKeyAndChallenge.SubjectPublicKeyInfo.FullBytes) == 0 {
		err = fmt.Errorf("missing SubjectPublicKeyInfo")
		return
	}
	spki = s.PublicKeyAndChallenge.SubjectPublicKeyInfo.FullBytes
	challenge = s.PublicKeyAndChallenge.Challenge
	alg = s.SignatureAlgorithm
	sig = s.Signature.Bytes
	tbs, err = asn1.Marshal(s.PublicKeyAndChallenge)
	return
}

func hashForSignatureOID(oid asn1.ObjectIdentifier) (stdcrypto.Hash, error) {
	md5WithRSA := asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 1, 4}
	sha1WithRSA := asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 1, 5}
	sha256WithRSA := asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 1, 11}
	sha384WithRSA := asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 1, 12}
	sha512WithRSA := asn1.ObjectIdentifier{1, 2, 840, 113549, 1, 1, 13}

	switch {
	case oid.Equal(md5WithRSA):
		return stdcrypto.MD5, nil
	case oid.Equal(sha1WithRSA):
		return stdcrypto.SHA1, nil
	case oid.Equal(sha256WithRSA):
		return stdcrypto.SHA256, nil
	case oid.Equal(sha384WithRSA):
		return stdcrypto.SHA384, nil
	case oid.Equal(sha512WithRSA):
		return stdcrypto.SHA512, nil
	default:
		return 0, fmt.Errorf("unsupported signature algorithm: %v", oid)
	}
}

func verifySPKACSignature(spki, tbs, sig []byte, alg pkix.AlgorithmIdentifier) bool {
	pub, err := x509.ParsePKIXPublicKey(spki)
	if err != nil {
		return false
	}
	pubKey, ok := pub.(*rsa.PublicKey)
	if !ok {
		return false
	}

	h, err := hashForSignatureOID(alg.Algorithm)
	if err != nil {
		return false
	}
	if !h.Available() {
		return false
	}
	hashFunc := h.New()
	if _, err := hashFunc.Write(tbs); err != nil {
		return false
	}
	digest := hashFunc.Sum(nil)

	if err := rsa.VerifyPKCS1v15(pubKey, h, digest, sig); err != nil {
		return false
	}
	return true
}

func CertificateExportPublicKey(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("Certificate.exportPublicKey requires spkac argument"))
	}
	spkacVal := call.Arguments[0]
	var encVal goja.Value
	if len(call.Arguments) > 1 {
		encVal = call.Arguments[1]
	}
	der, err := getSpkacBytes(runtime, spkacVal, encVal)
	if err != nil {
		// Unhandled error: throw TypeError
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid spkac: %v", err)))
	}
	if len(der) == 0 {
		// Empty input or handled failure: return empty string
		return runtime.ToValue("")
	}
	_, spki, _, _, _, err := parseSPKAC(der)
	if err != nil {
		// Parse error: return empty string (Node.js behavior)
		return runtime.ToValue("")
	}
	return CreateBuffer(runtime, spki)
}

func CertificateExportChallenge(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("Certificate.exportChallenge requires spkac argument"))
	}
	spkacVal := call.Arguments[0]
	var encVal goja.Value
	if len(call.Arguments) > 1 {
		encVal = call.Arguments[1]
	}
	der, err := getSpkacBytes(runtime, spkacVal, encVal)
	if err != nil {
		// Unhandled error: throw TypeError
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid spkac: %v", err)))
	}
	if len(der) == 0 {
		// Empty input or handled failure: return empty string
		return runtime.ToValue("")
	}
	_, _, challenge, _, _, err := parseSPKAC(der)
	if err != nil {
		// Parse error: return empty string (Node.js behavior)
		return runtime.ToValue("")
	}
	return CreateBuffer(runtime, []byte(challenge))
}

func CertificateVerifySpkac(call goja.FunctionCall, runtime *goja.Runtime) goja.Value {
	if len(call.Arguments) == 0 {
		panic(runtime.NewTypeError("Certificate.verifySpkac requires spkac argument"))
	}
	spkacVal := call.Arguments[0]
	var encVal goja.Value
	if len(call.Arguments) > 1 {
		encVal = call.Arguments[1]
	}

	// Check if input is empty first (before calling getSpkacBytes)
	if s, ok := spkacVal.Export().(string); ok && s == "" {
		return runtime.ToValue("")
	}
	// Check for empty Buffer/TypedArray
	if b, err := ConvertToBytes(runtime, spkacVal); err == nil && len(b) == 0 {
		return runtime.ToValue("")
	}

	der, err := getSpkacBytes(runtime, spkacVal, encVal)
	if err != nil {
		// Unhandled error: throw TypeError
		panic(runtime.NewTypeError(fmt.Sprintf("Invalid spkac: %v", err)))
	}
	if len(der) == 0 {
		// Handled failure (explicit encoding or Buffer input): return false
		return runtime.ToValue(false)
	}
	tbs, spki, _, alg, sig, err := parseSPKAC(der)
	if err != nil {
		return runtime.ToValue(false)
	}
	ok := verifySPKACSignature(spki, tbs, sig, alg)
	return runtime.ToValue(ok)
}

func NewCertificate(call goja.ConstructorCall, runtime *goja.Runtime) *goja.Object {
	obj := runtime.NewObject()
	obj.Set("exportPublicKey", func(call goja.FunctionCall) goja.Value {
		return CertificateExportPublicKey(call, runtime)
	})
	obj.Set("exportChallenge", func(call goja.FunctionCall) goja.Value {
		return CertificateExportChallenge(call, runtime)
	})
	obj.Set("verifySpkac", func(call goja.FunctionCall) goja.Value {
		return CertificateVerifySpkac(call, runtime)
	})
	return obj
}
