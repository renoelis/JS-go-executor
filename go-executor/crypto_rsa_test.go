package main

import (
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io/ioutil"
	"reflect"
	"testing"

	"github.com/dop251/goja"
	"github.com/dop251/goja_nodejs/require"
)

// setupTestRuntime 创建带有 crypto 和 Buffer 支持的测试运行时
func setupTestRuntime() (*goja.Runtime, *CryptoEnhancer) {
	runtime := goja.New()
	registry := require.NewRegistry()
	registry.Enable(runtime)

	// 注册 buffer 模块
	require.RegisterNativeModule("buffer", func(runtime *goja.Runtime, module *goja.Object) {
		bufferObj := runtime.NewObject()

		bufferObj.Set("from", func(call goja.FunctionCall) goja.Value {
			if len(call.Arguments) == 0 {
				panic(runtime.NewTypeError("Buffer.from requires at least one argument"))
			}

			arg := call.Arguments[0]
			var data []byte

			if arg.ExportType().Kind() == reflect.String {
				data = []byte(arg.String())
			} else if obj, ok := arg.(*goja.Object); ok {
				if lengthVal := obj.Get("length"); lengthVal != nil && !goja.IsUndefined(lengthVal) {
					length := int(lengthVal.ToInteger())
					data = make([]byte, length)
					for i := 0; i < length; i++ {
						if val := obj.Get(fmt.Sprintf("%d", i)); val != nil && !goja.IsUndefined(val) {
							data[i] = byte(val.ToInteger())
						}
					}
				}
			}

			bufferInst := runtime.NewObject()
			bufferInst.Set("length", runtime.ToValue(len(data)))
			for i, b := range data {
				bufferInst.Set(fmt.Sprintf("%d", i), runtime.ToValue(int(b)))
			}

			bufferInst.Set("toString", func(call goja.FunctionCall) goja.Value {
				encoding := "utf8"
				if len(call.Arguments) > 0 {
					encoding = call.Arguments[0].String()
				}

				switch encoding {
				case "utf8", "utf-8":
					return runtime.ToValue(string(data))
				case "hex":
					return runtime.ToValue(hex.EncodeToString(data))
				case "base64":
					return runtime.ToValue(base64.StdEncoding.EncodeToString(data))
				default:
					return runtime.ToValue(string(data))
				}
			})

			return bufferInst
		})

		module.Set("exports", bufferObj)
	})

	// 设置全局 Buffer
	runtime.RunString(`
		const Buffer = require('buffer');
		globalThis.Buffer = Buffer;
	`)

	// 注册 crypto 模块
	enhancer := NewCryptoEnhancer()
	enhancer.RegisterCryptoModule(registry)

	return runtime, enhancer
}

func TestRSASimpleFeatures(t *testing.T) {
	// 创建测试运行时
	runtime, _ := setupTestRuntime()

	// 读取测试脚本
	script, err := ioutil.ReadFile("../test/rsa-simple-test.js")
	if err != nil {
		t.Fatalf("Failed to read test script: %v", err)
	}

	// 执行测试
	result, err := runtime.RunString(string(script))
	if err != nil {
		t.Fatalf("Failed to execute test: %v", err)
	}

	// 解析结果
	resultObj := result.ToObject(runtime)

	// 检查错误
	if errorVal := resultObj.Get("error"); errorVal != nil && !goja.IsUndefined(errorVal) {
		t.Fatalf("Test returned error: %s", errorVal.String())
	}

	// 检查每个测试项
	tests := []string{
		"keyGeneration",
		"encryption",
		"decryption",
		"signaturePSS",
		"verificationPSS",
		"signaturePKCS1",
		"verificationPKCS1",
	}

	for _, testName := range tests {
		testResult := resultObj.Get(testName)
		if testResult == nil || goja.IsUndefined(testResult) {
			t.Errorf("%s: test not found", testName)
			continue
		}

		testObj := testResult.ToObject(runtime)
		success := testObj.Get("success")

		if success == nil || goja.IsUndefined(success) || !success.ToBoolean() {
			reason := testObj.Get("reason")
			reasonStr := "unknown"
			if reason != nil && !goja.IsUndefined(reason) {
				reasonStr = reason.String()
			}
			t.Errorf("%s: FAILED - %s", testName, reasonStr)
		} else {
			t.Logf("%s: PASSED ✓", testName)
		}
	}
}

func TestRSAFullFeatures(t *testing.T) {
	// 创建测试运行时
	runtime, _ := setupTestRuntime()

	// 读取测试脚本
	script, err := ioutil.ReadFile("../test/rsa-full-test.js")
	if err != nil {
		t.Fatalf("Failed to read test script: %v", err)
	}

	// 执行测试
	result, err := runtime.RunString(string(script))
	if err != nil {
		t.Fatalf("Failed to execute test: %v", err)
	}

	// 解析结果
	resultObj := result.ToObject(runtime)

	// 获取摘要
	summaryVal := resultObj.Get("summary")
	if summaryVal == nil || goja.IsUndefined(summaryVal) {
		t.Fatal("No summary found in test results")
	}

	summaryObj := summaryVal.ToObject(runtime)
	total := summaryObj.Get("total").ToInteger()
	passed := summaryObj.Get("passed").ToInteger()
	failed := summaryObj.Get("failed").ToInteger()
	successRate := summaryObj.Get("successRate").String()

	t.Logf("=== RSA Full Test Summary ===")
	t.Logf("Total Tests: %d", total)
	t.Logf("Passed: %d", passed)
	t.Logf("Failed: %d", failed)
	t.Logf("Success Rate: %s", successRate)

	// 如果有失败的测试，输出详细信息
	if failed > 0 {
		resultsVal := resultObj.Get("results")
		if resultsVal != nil && !goja.IsUndefined(resultsVal) {
			resultsObj := resultsVal.ToObject(runtime)
			keys := resultsObj.Keys()

			t.Log("\n=== Failed Tests Details ===")
			for _, key := range keys {
				itemVal := resultsObj.Get(key)
				itemObj := itemVal.ToObject(runtime)

				configVal := itemObj.Get("config")
				configObj := configVal.ToObject(runtime)
				keySize := configObj.Get("keySize").ToInteger()
				hash := configObj.Get("hash").String()

				testsVal := itemObj.Get("tests")
				testsObj := testsVal.ToObject(runtime)
				testKeys := testsObj.Keys()

				for _, testKey := range testKeys {
					testVal := testsObj.Get(testKey)
					testObj := testVal.ToObject(runtime)
					success := testObj.Get("success")

					if success != nil && !goja.IsUndefined(success) && !success.ToBoolean() {
						reason := testObj.Get("reason")
						reasonStr := "unknown"
						if reason != nil && !goja.IsUndefined(reason) {
							reasonStr = reason.String()
						}
						t.Logf("  [KeySize: %d, Hash: %s, Test: %s] FAILED - %s",
							keySize, hash, testKey, reasonStr)
					}
				}
			}
		}

		t.Errorf("Some tests failed. See details above.")
	}
}

func TestRSAKeyGeneration(t *testing.T) {
	runtime, _ := setupTestRuntime()

	keySizes := []int{1024, 2048, 4096}

	for _, keySize := range keySizes {
		t.Run(fmt.Sprintf("KeySize_%d", keySize), func(t *testing.T) {
			script := fmt.Sprintf(`
				(function() {
					const crypto = require('crypto');
					const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
						modulusLength: %d,
					});
					
					// 验证密钥是否生成
					const hasPublicKey = publicKey && publicKey.length > 0;
					const hasPrivateKey = privateKey && privateKey.length > 0;
					
					return {
						success: hasPublicKey && hasPrivateKey,
						publicKeyLength: publicKey ? publicKey.length : 0,
						privateKeyLength: privateKey ? privateKey.length : 0
					};
				})();
			`, keySize)

			result, err := runtime.RunString(script)
			if err != nil {
				t.Fatalf("Failed to generate key pair: %v", err)
			}

			resultObj := result.ToObject(runtime)
			success := resultObj.Get("success").ToBoolean()

			if !success {
				t.Errorf("Key generation failed for key size %d", keySize)
			} else {
				pubKeyLen := resultObj.Get("publicKeyLength").ToInteger()
				privKeyLen := resultObj.Get("privateKeyLength").ToInteger()
				t.Logf("Key size %d: public key length=%d, private key length=%d ✓",
					keySize, pubKeyLen, privKeyLen)
			}
		})
	}
}

func TestRSAEncryptionDecryption(t *testing.T) {
	runtime, _ := setupTestRuntime()

	hashes := []string{"sha1", "sha256", "sha384", "sha512"}

	for _, hash := range hashes {
		t.Run(fmt.Sprintf("Hash_%s", hash), func(t *testing.T) {
			script := fmt.Sprintf(`
				(function() {
					const crypto = require('crypto');
					const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
						modulusLength: 2048,
					});
					
					const message = 'Test message for encryption';
					
					// 加密
					const encrypted = crypto.publicEncrypt(
						{
							key: publicKey,
							padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
							oaepHash: '%s',
						},
						Buffer.from(message)
					);
					
					// 解密
					const decrypted = crypto.privateDecrypt(
						{
							key: privateKey,
							padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
							oaepHash: '%s',
						},
						encrypted
					);
					
					const decryptedMessage = decrypted.toString('utf8');
					
					return {
						success: decryptedMessage === message,
						original: message,
						decrypted: decryptedMessage
					};
				})();
			`, hash, hash)

			result, err := runtime.RunString(script)
			if err != nil {
				t.Fatalf("Encryption/Decryption failed: %v", err)
			}

			resultObj := result.ToObject(runtime)
			success := resultObj.Get("success").ToBoolean()

			if !success {
				original := resultObj.Get("original").String()
				decrypted := resultObj.Get("decrypted").String()
				t.Errorf("Hash %s: decryption mismatch. Original: %s, Decrypted: %s",
					hash, original, decrypted)
			} else {
				t.Logf("Hash %s: encryption/decryption successful ✓", hash)
			}
		})
	}
}

func TestRSASignatureVerification(t *testing.T) {
	runtime, _ := setupTestRuntime()

	modes := []string{"PSS", "PKCS1"}
	hashes := []string{"sha1", "sha256", "sha384", "sha512"}

	for _, mode := range modes {
		for _, hash := range hashes {
			t.Run(fmt.Sprintf("Mode_%s_Hash_%s", mode, hash), func(t *testing.T) {
				paddingType := "RSA_PKCS1_PSS_PADDING"
				if mode == "PKCS1" {
					paddingType = "RSA_PKCS1_PADDING"
				}

				var signOptsExtra string
				var verifyOptsExtra string
				if mode == "PSS" {
					signOptsExtra = ", saltLength: 32"
					verifyOptsExtra = ", saltLength: 32"
				}

				script := fmt.Sprintf(`
					(function() {
						const crypto = require('crypto');
						const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
							modulusLength: 2048,
						});
						
						const message = 'Test message for signing';
						
						// 签名
						const signer = crypto.createSign('%s');
						signer.update(message);
						signer.end();
						
						const signOpts = { key: privateKey, padding: crypto.constants.%s%s };
						const signature = signer.sign(signOpts);
						
						// 验证
						const verifier = crypto.createVerify('%s');
						verifier.update(message);
						verifier.end();
						
						const verifyOpts = { key: publicKey, padding: crypto.constants.%s%s };
						const isValid = verifier.verify(verifyOpts, signature);
						
						return {
							success: isValid,
							mode: '%s',
							hash: '%s'
						};
					})();
				`, hash, paddingType, signOptsExtra, hash, paddingType, verifyOptsExtra, mode, hash)

				result, err := runtime.RunString(script)
				if err != nil {
					t.Fatalf("Signature/Verification failed: %v", err)
				}

				resultObj := result.ToObject(runtime)
				success := resultObj.Get("success").ToBoolean()

				if !success {
					t.Errorf("Mode %s, Hash %s: signature verification failed", mode, hash)
				} else {
					t.Logf("Mode %s, Hash %s: signature verification successful ✓", mode, hash)
				}
			})
		}
	}
}
