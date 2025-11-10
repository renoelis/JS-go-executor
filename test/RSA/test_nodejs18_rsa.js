const crypto = require('crypto');

// 固定RSA密钥（2048位，PKCS#8格式 - Node.js 18+标准）
const privateKeyPKCS8 = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDfb8D/hy2ax7q+
Tqcvvn4aPae3CKrvae+5F+4X904Jbr9af0YNd9KeFjEQE2C76V8RLoFGMwKTYexZ
u2NOJj3kzaGzpSHWhmq83+pRENUiXWp4jwU6QPn0m3rNKIr9rSK+f93y0wkGheF2
QWgpS3/lqzLM1YcNOZSqkAlWPsqaqeiUU634ATeFbASM4N7LDj1BbYGtCAIQnOtT
rZ+qIU/7fjC+e6Wg2AnfH52rJ474irbMlgQVo5W3oygpaP7Mr7sXi/vQIiYv69kW
dTrLgGLRrIBCmTyM97rHQED8EpxcBjniIV/Bz/8h2af/JHo4CGGYvosVaOf/guKY
Ia1GWpfpAgMBAAECggEAaPBXuKuIY7WCo3bVVrslBrYGWxSbE66xhEEU9fSUliGJ
hbtY72JjbRQHHwG64QaOO8eXt5yljQrkspAr57xWPWvGklTwO40N/H890a0SLP2q
z8x8LAvwWU3csxZjkRkLxGTRnQY4qvOeHKhDf4GSJA/v3/w5XaC5jhHwEK2VAmYB
vC9Njs1eHOJt2G07YWVec3eTLVIugmJ5RbFQtvGxuyKP9VCKtU6r02mdThhDlTzi
lGX/CkxbSPLMfJmyWT5b5Zd9LAnTMIdc30NT68BCLDeTXmEGja+wtjfcplqXgLFk
YyunHuxLRMVw25wZq/mVPjE5EMXuMtTPgxnCQb9K8QKBgQD0inYgjPB6a7ITj3Jd
K5N3kaB1nh9mkbA7F7ch+ChnwdeBW2Hwkg2+fMP8Ac7NhpV6G7Ft4VMTj0DL/fIV
YPCmHcfJVlPKqu9pQSjjZO23hyTJcy2kcAu5QkPs73hHmfpyDE0F4joyjWM/RjZw
TYbJBUTYdUUDMqKSgNXbH+DjOwKBgQDp6B9oxbKD3DVpKi9uXztuN55qiG03a3zX
0nsLnaiXedtKOBSM67bBq02vovq5rl6Q8vWGZkFbsE0n+gr2+EyhGjVJXk0u0gwx
xBBD+sgukGmTkBL1pBsYDz6CLIv6G5BQEIO5CGCErZuF49aKZdaWJjwfy7JkAxyk
ZM0GHpx3KwKBgHnuyHP2kroYFRUXw6idX8yQ+ndrPrEAF+V/L7tqZ4tE5lYD4NP5
n4zJ3Vc894cXglT+lfv6DFiGZ4LPvvPWAGh0FPhZaTJ3BSVwbhjkbHvEkR05pxqF
G/NmDUSJK2pYZr6TT5yNbwNh6IjWU7KvlXOKgweDgcPUbaerQfce8B2dAoGATXWw
SRsHJgGbsmrk8DEbVkGW9YKeYHb5DePHGa6pMRiKlUaDD7PTfslC3cIkM69Z47iB
tHNSe5Gjy3RTgzvw7HzoXpabCsFGhoh+NnTrK/ho7hQNI0moK0yJD8S+yiGspccC
SBlNFUMEuM8dshFNgcXBrWngdpxNNOeoubkTaacCgYEAzUpW2zNlmdWUembKs0Ic
Ebu2NWduuLIef4OKpoyzjwTtPWY7uwuo3ItX3mX5OoLoQmVjN7nWGLAxcJOmJbpe
qQnaoA4D/O1ez5rd6/XzDrINtazTq8F1wMGxVIVJl9RJvWVRwfi/eoIDQ8FyLnwB
f513PgxeaRGTK8avBt8sJ2E=
-----END PRIVATE KEY-----`;

const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA32/A/4ctmse6vk6nL75+
Gj2ntwiq72nvuRfuF/dOCW6/Wn9GDXfSnhYxEBNgu+lfES6BRjMCk2HsWbtjTiY9
5M2hs6Uh1oZqvN/qURDVIl1qeI8FOkD59Jt6zSiK/a0ivn/d8tMJBoXhdkFoKUt/
5asyzNWHDTmUqpAJVj7KmqnolFOt+AE3hWwEjODeyw49QW2BrQgCEJzrU62fqiFP
+34wvnuloNgJ3x+dqyeO+Iq2zJYEFaOVt6MoKWj+zK+7F4v70CImL+vZFnU6y4Bi
0ayAQpk8jPe6x0BA/BKcXAY54iFfwc//Idmn/yR6OAhhmL6LFWjn/4LimCGtRlqX
6QIDAQAB
-----END PUBLIC KEY-----`;

// 固定测试数据
const testMessage = 'Node.js 18+ RSA Test';
const testLabel = 'test-label-2025';
const testPassphrase = 'my-secret-password-2025';

// 主测试函数：测试 Node.js 18+ RSA 功能
function testNodeJS18RSA() {
  const results = {
    testName: 'Node.js 18+ RSA API 兼容性测试',
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // ====================================================================
    // 测试 1: generateKeyPairSync 支持 PKCS8 编码（Node.js 18+ 默认）
    // ====================================================================
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      results.tests.test1_pkcs8_keygen = {
        name: 'PKCS8密钥生成',
        passed: privateKey.includes('BEGIN PRIVATE KEY'),
        details: {
          privateKeyFormat: privateKey.includes('BEGIN PRIVATE KEY') ? 'PKCS#8' : 'PKCS#1',
          publicKeyFormat: publicKey.includes('BEGIN PUBLIC KEY') ? 'SPKI' : 'unknown',
          privateKeyLength: privateKey.length,
          publicKeyLength: publicKey.length
        }
      };
    } catch (error) {
      results.tests.test1_pkcs8_keygen = {
        name: 'PKCS8密钥生成',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 2: PKCS1 格式支持（向后兼容）
    // ====================================================================
    try {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {
          type: 'pkcs1',
          format: 'pem'
        }
      });

      results.tests.test2_pkcs1_keygen = {
        name: 'PKCS1密钥生成（向后兼容）',
        passed: privateKey.includes('BEGIN RSA PRIVATE KEY'),
        details: {
          privateKeyFormat: privateKey.includes('BEGIN RSA PRIVATE KEY') ? 'PKCS#1' : 'PKCS#8'
        }
      };
    } catch (error) {
      results.tests.test2_pkcs1_keygen = {
        name: 'PKCS1密钥生成（向后兼容）',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 3: 加密私钥支持（passphrase + cipher）
    // ====================================================================
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: 'aes-256-cbc',
          passphrase: testPassphrase
        }
      });

      const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(testMessage));
      const decrypted = crypto.privateDecrypt({
        key: privateKey,
        passphrase: testPassphrase
      }, encrypted);

      const isEncrypted = privateKey.includes('ENCRYPTED');
      const decryptSuccess = decrypted.toString() === testMessage;

      results.tests.test3_encrypted_key = {
        name: '加密私钥支持',
        passed: isEncrypted && decryptSuccess,
        details: {
          keyIsEncrypted: isEncrypted,
          decryptionSuccess: decryptSuccess,
          cipher: 'aes-256-cbc',
          originalMessage: testMessage,
          decryptedMessage: decrypted.toString()
        }
      };
    } catch (error) {
      results.tests.test3_encrypted_key = {
        name: '加密私钥支持',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 4: OAEP 加密支持 oaepLabel
    // ====================================================================
    try {
      const label = Buffer.from(testLabel);
      const encrypted = crypto.publicEncrypt({
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
        oaepLabel: label
      }, Buffer.from(testMessage));

      const decrypted = crypto.privateDecrypt({
        key: privateKeyPKCS8,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
        oaepLabel: label
      }, encrypted);

      results.tests.test4_oaep_label = {
        name: 'OAEP oaepLabel支持',
        passed: decrypted.toString() === testMessage,
        details: {
          label: testLabel,
          originalMessage: testMessage,
          decryptedMessage: decrypted.toString(),
          encryptedBase64: encrypted.toString('base64').substring(0, 50) + '...'
        }
      };
    } catch (error) {
      results.tests.test4_oaep_label = {
        name: 'OAEP oaepLabel支持',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 5: PSS saltLength 常量
    // ====================================================================
    try {
      // 测试常量是否存在
      const constantsExist = 
        typeof crypto.constants.RSA_PSS_SALTLEN_DIGEST === 'number' &&
        typeof crypto.constants.RSA_PSS_SALTLEN_AUTO === 'number' &&
        crypto.constants.RSA_PSS_SALTLEN_DIGEST === -1 &&
        crypto.constants.RSA_PSS_SALTLEN_AUTO === -2;

      // 测试使用 SALTLEN_DIGEST 签名验证
      const sign1 = crypto.createSign('sha256');
      sign1.update(testMessage);
      const signature1 = sign1.sign({
        key: privateKeyPKCS8,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      });

      const verify1 = crypto.createVerify('sha256');
      verify1.update(testMessage);
      const valid1 = verify1.verify({
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      }, signature1);

      // 测试使用 SALTLEN_AUTO 签名验证
      const sign2 = crypto.createSign('sha256');
      sign2.update(testMessage);
      const signature2 = sign2.sign({
        key: privateKeyPKCS8,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_AUTO
      });

      const verify2 = crypto.createVerify('sha256');
      verify2.update(testMessage);
      const valid2 = verify2.verify({
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_AUTO
      }, signature2);

      results.tests.test5_pss_constants = {
        name: 'PSS saltLength常量',
        passed: constantsExist && valid1 && valid2,
        details: {
          constantsExist: constantsExist,
          RSA_PSS_SALTLEN_DIGEST: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
          RSA_PSS_SALTLEN_AUTO: crypto.constants.RSA_PSS_SALTLEN_AUTO,
          digestSignatureValid: valid1,
          autoSignatureValid: valid2,
          digestSignatureBase64: signature1.toString('base64').substring(0, 50) + '...',
          autoSignatureBase64: signature2.toString('base64').substring(0, 50) + '...'
        }
      };
    } catch (error) {
      results.tests.test5_pss_constants = {
        name: 'PSS saltLength常量',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 6: crypto.createPublicKey() 和 crypto.createPrivateKey()
    // ====================================================================
    try {
      const publicKeyObj = crypto.createPublicKey(publicKeyPEM);
      const privateKeyObj = crypto.createPrivateKey(privateKeyPKCS8);

      const typeCorrect = publicKeyObj.type === 'public' && privateKeyObj.type === 'private';
      const algorithmCorrect = 
        publicKeyObj.asymmetricKeyType === 'rsa' && 
        privateKeyObj.asymmetricKeyType === 'rsa';

      results.tests.test6_keyobject = {
        name: 'KeyObject API (createPublicKey/createPrivateKey)',
        passed: typeCorrect && algorithmCorrect,
        details: {
          publicKeyType: publicKeyObj.type,
          privateKeyType: privateKeyObj.type,
          publicKeyAlgorithm: publicKeyObj.asymmetricKeyType,
          privateKeyAlgorithm: privateKeyObj.asymmetricKeyType
        }
      };
    } catch (error) {
      results.tests.test6_keyobject = {
        name: 'KeyObject API (createPublicKey/createPrivateKey)',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 7: KeyObject.export() 方法 - 格式转换
    // ====================================================================
    try {
      const keyObj = crypto.createPrivateKey(privateKeyPKCS8);

      // 导出为 PKCS8
      const pkcs8 = keyObj.export({ type: 'pkcs8', format: 'pem' });
      const pkcs8Valid = pkcs8.includes('BEGIN PRIVATE KEY');

      // 导出为 PKCS1
      const pkcs1 = keyObj.export({ type: 'pkcs1', format: 'pem' });
      const pkcs1Valid = pkcs1.includes('BEGIN RSA PRIVATE KEY');

      // 导出为 DER
      const der = keyObj.export({ type: 'pkcs8', format: 'der' });
      const derValid = Buffer.isBuffer(der) && der.length > 0;

      results.tests.test7_export = {
        name: 'KeyObject.export() 格式转换',
        passed: pkcs8Valid && pkcs1Valid && derValid,
        details: {
          pkcs8Export: pkcs8Valid,
          pkcs1Export: pkcs1Valid,
          derExport: derValid,
          derLength: der.length,
          pkcs8Preview: pkcs8.substring(0, 40) + '...',
          pkcs1Preview: pkcs1.substring(0, 40) + '...'
        }
      };
    } catch (error) {
      results.tests.test7_export = {
        name: 'KeyObject.export() 格式转换',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 8: DER 格式密钥生成
    // ====================================================================
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'der'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'der'
        }
      });

      const pubValid = Buffer.isBuffer(publicKey) && publicKey.length > 0;
      const privValid = Buffer.isBuffer(privateKey) && privateKey.length > 0;

      // 测试使用 DER 密钥创建 KeyObject
      const pubKeyObj = crypto.createPublicKey({
        key: publicKey,
        format: 'der',
        type: 'spki'
      });

      const objValid = pubKeyObj.type === 'public';

      results.tests.test8_der_format = {
        name: 'DER格式密钥生成和使用',
        passed: pubValid && privValid && objValid,
        details: {
          publicKeyIsBuffer: pubValid,
          privateKeyIsBuffer: privValid,
          publicKeyLength: publicKey.length,
          privateKeyLength: privateKey.length,
          keyObjectCreated: objValid
        }
      };
    } catch (error) {
      results.tests.test8_der_format = {
        name: 'DER格式密钥生成和使用',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 测试 9: 完整加密签名流程（Node.js 18+ 标准用法）
    // ====================================================================
    try {
      // 使用固定密钥进行加密
      const encrypted = crypto.publicEncrypt(publicKeyPEM, Buffer.from(testMessage));
      const decrypted = crypto.privateDecrypt(privateKeyPKCS8, encrypted);

      // 签名（SHA256 - RSA2标准）
      const sign = crypto.createSign('sha256');
      sign.update(testMessage);
      const signature = sign.sign(privateKeyPKCS8, 'base64');

      // 验签
      const verify = crypto.createVerify('sha256');
      verify.update(testMessage);
      const isValid = verify.verify(publicKeyPEM, signature, 'base64');

      results.tests.test9_complete_flow = {
        name: '完整加密签名流程',
        passed: decrypted.toString() === testMessage && isValid,
        details: {
          originalMessage: testMessage,
          decryptedMessage: decrypted.toString(),
          encryptionSuccess: decrypted.toString() === testMessage,
          signatureValid: isValid,
          signatureBase64: signature.substring(0, 50) + '...',
          encryptedBase64: encrypted.toString('base64').substring(0, 50) + '...'
        }
      };
    } catch (error) {
      results.tests.test9_complete_flow = {
        name: '完整加密签名流程',
        passed: false,
        error: error.message
      };
    }

    // ====================================================================
    // 汇总结果
    // ====================================================================
    const testKeys = Object.keys(results.tests);
    const passedTests = testKeys.filter(key => results.tests[key].passed);
    const failedTests = testKeys.filter(key => !results.tests[key].passed);

    results.summary = {
      total: testKeys.length,
      passed: passedTests.length,
      failed: failedTests.length,
      passRate: ((passedTests.length / testKeys.length) * 100).toFixed(2) + '%',
      allPassed: failedTests.length === 0
    };

    results.status = failedTests.length === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE';

  } catch (error) {
    results.status = 'FATAL_ERROR';
    results.fatalError = error.message;
  }

  return results;
}

// 执行测试并输出结果
const testResults = testNodeJS18RSA();
console.log(JSON.stringify(testResults, null, 2));
return testResults;
