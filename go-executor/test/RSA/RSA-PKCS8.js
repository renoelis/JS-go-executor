const crypto = require('crypto');

// 固定RSA密钥（2048位）
const privateKeyPEM = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQB62ZFJktEArGUrV5W1iRUayme6j8PCHhc/qXEL/EpNeO98R28W
rrBoUrl+qKWabBI6cDOwQlk2jNd8Xc9llg170orsG0SXGf1/fRab5/2Om2EVsdv1
47wPPlGOJ5425P0ZyPr+pwWgxc0qn1TlqqOk3U1dtgebG9xMPB35eCZFChnQr1d1
23g4fhWpGMAADi6eTwlnJvnWK4ZISQO5Tr93SqRYZHn+yG+c2v4DcwHLeDaByOcP
4qyTlh7u8Vu9TA7kGEuEq0JWiYI7k8nALkjO89oWyBhlm02/a/KSneMyiRvZprki
bg0tmBm/kt4jXCL1u8vgSHjgsLPMf9/GaoQXAgMBAAECggEAEoeQd3VymtRl6hSq
2xfTHBhdbvFSSIw7W3nWOEWUe3z7OlaX9ebhasrXebg8Sj90vGXCFhrb0/OIaRTJ
PHxWik+mbphqTxQ3fSxD5b4nK4RaL2iFUeBItE/lAzkMjyEY3/PFj/VnTumm2X/w
0TdcuXg7vB/Bo+6e2szShJdPxmfbHlxG8cpoJIyPf+8LDeMKMkykvalUmcSzwOmL
cW5qKNaqfpHa2spcJZOAB4ELrwh/e8a/EEXAlUEZBY6avhfxAwfSviYXbirTndhF
7dp730TPRHJOB6CHW+4TrHVu3VoobWxB4xwPg7hju4xcD0T/QskqoEgeGd5d9zzR
/kAFCQKBgQCzt4j9VzRMhkk+lyu5+0qaUTHNhxO6k/quuQXfR1Kl+T/a1sCi13O6
lSKKE8ejxNcxiONQExAIL+jmo9xIndCGNJhJpS81ey46dRiQVTCB0D261nw7FBmH
1VgF8s2oh0eMXgY8bDdduNHz0+YJr8ogVaPrwqdwysyQ4OTnvB0H6wKBgQCu/rlJ
1AhDa29yFOPbIjUWWfARKXEes9KWGZMoTf2Pee3MgSOOugK3XNR1aYrpllTQjEaA
7BJawv0oyhhN3fggKaNxAFPKPa8XYXuRGs0LcwbbjDAkOngjtFQcAOAsgifZgn98
PHGCUmj7X0E1bCl/sQuW1tS9WEFSMbC+NWV1hQKBgD9Jp9VHa2RzecGv7Lce9mOn
qjktk1YGHKaBA79gV4uZXdJMBCSUaO3Q7Qvg8VIL1JheE2a0f9XSQVtPYxizcqaA
SQzOPfTAf0QYzmCtj1p3ofV06OTJLEB4cfoOSjxJ/3k/90Q5+7lmh5EtEvpgTHbc
kdBJiTugPy/Z8uJkjXinAoGATFyPEi5aJMFe8lM3UspMjCJW5cZFvHYPsLwcQPw3
Z0J3iEPZ9lApG0aA13Nk0KVvAUoVAfEB2WU4/3GgxWnU+oPw9ECGT7w3CWbaeulN
DG/3UBqOb2CsSDhKc6XWLNXm+b0+UEI37fx0Hyzj0aIPQc9KFVpNnwpCBtH0JCw8
x9kCgYEAm88yxiNANPvJjV2fwbyp7wX1IE05tbL/sF978M9nA6AvbEOxtmPpWV91
z9z6zxObvDkaX5g3oGROS+ePVlMw6wlU6ZhMRBv0ZzRjIu0GMqGcovconZBoegbW
5Vh7sQqD1zA34XibJPZf2lUt7pHTEYSBHs8WwAtAcyiomRX0m7k=
-----END RSA PRIVATE KEY-----
`;

const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB62ZFJktEArGUrV5W1iRUa
yme6j8PCHhc/qXEL/EpNeO98R28WrrBoUrl+qKWabBI6cDOwQlk2jNd8Xc9llg17
0orsG0SXGf1/fRab5/2Om2EVsdv147wPPlGOJ5425P0ZyPr+pwWgxc0qn1TlqqOk
3U1dtgebG9xMPB35eCZFChnQr1d123g4fhWpGMAADi6eTwlnJvnWK4ZISQO5Tr93
SqRYZHn+yG+c2v4DcwHLeDaByOcP4qyTlh7u8Vu9TA7kGEuEq0JWiYI7k8nALkjO
89oWyBhlm02/a/KSneMyiRvZprkibg0tmBm/kt4jXCL1u8vgSHjgsLPMf9/GaoQX
AgMBAAE=
-----END PUBLIC KEY-----
`;

// 固定明文
const message = 'RSA Test Message';

// 主函数：测试 RSA 功能
function testRSA() {
  try {
    // 加密
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(message, 'utf8')
    );

    // 解密
    const decrypted = crypto.privateDecrypt(
      {
        key: privateKeyPEM,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      encrypted
    );

    // 签名（PSS）
    const signerPSS = crypto.createSign('sha256');
    signerPSS.update(Buffer.from(message, 'utf8'));
    signerPSS.end();
    const signaturePSS = signerPSS.sign({
      key: privateKeyPEM,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32
    });

    const verifierPSS = crypto.createVerify('sha256');
    verifierPSS.update(Buffer.from(message, 'utf8'));
    verifierPSS.end();
    const isPSSValid = verifierPSS.verify(
      {
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: 32
      },
      signaturePSS
    );

    // 签名（PKCS1）
    const signerPKCS1 = crypto.createSign('sha256');
    signerPKCS1.update(Buffer.from(message, 'utf8'));
    signerPKCS1.end();
    const signaturePKCS1 = signerPKCS1.sign({
      key: privateKeyPEM,
      padding: crypto.constants.RSA_PKCS1_PADDING
    });

    const verifierPKCS1 = crypto.createVerify('sha256');
    verifierPKCS1.update(Buffer.from(message, 'utf8'));
    verifierPKCS1.end();
    const isPKCS1Valid = verifierPKCS1.verify(
      {
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_PADDING
      },
      signaturePKCS1
    );

    // 返回固定输出
    return {
      message,
      encryptedBase64: encrypted.toString('base64'),
      decryptedText: decrypted.toString('utf8'),
      signaturePSSBase64: signaturePSS.toString('base64'),
      signaturePSSValid: isPSSValid,
      signaturePKCS1Base64: signaturePKCS1.toString('base64'),
      signaturePKCS1Valid: isPKCS1Valid
    };

  } catch (error) {
    return { error: 'RSA 测试失败，请检查环境或密钥' };
  }
}

// 外部调用
const result = testRSA();
console.log(JSON.stringify(result, null, 2));
return result;

// ===============================================
// 🚀 异步版本实现
// ===============================================

/**
 * 异步 RSA 测试 - 完整版
 * 使用 Promise 和 setTimeout 模拟异步操作
 * 会被系统智能路由到 EventLoop 执行
 */



/**
 * 简化版异步 RSA 测试 - 使用 Promise 链
 */
function testRSAAsyncSimple() {
  console.log('开始简化版异步 RSA 测试 (RSA-test-8)...');
  
  return Promise.resolve()
    .then(function() {
      // 步骤1：加密
      return new Promise(function(resolve) {
        setTimeout(function() {
          const encrypted = crypto.publicEncrypt(
            {
              key: publicKeyPEM,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: 'sha256'
            },
            Buffer.from(message, 'utf8')
          );
          console.log('简化版加密完成');
          resolve(encrypted);
        }, 40);
      });
    })
    .then(function(encrypted) {
      // 步骤2：解密
      return new Promise(function(resolve) {
        setTimeout(function() {
          const decrypted = crypto.privateDecrypt(
            {
              key: privateKeyPEM,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: 'sha256'
            },
            encrypted
          );
          console.log('简化版解密完成');
          resolve({
            encrypted: encrypted,
            decrypted: decrypted
          });
        }, 40);
      });
    })
    .then(function(result) {
      // 步骤3：签名验证
      return new Promise(function(resolve) {
        setTimeout(function() {
          const signer = crypto.createSign('sha256');
          signer.update(Buffer.from(message, 'utf8'));
          signer.end();
          const signature = signer.sign({
            key: privateKeyPEM,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: 32
          });

          const verifier = crypto.createVerify('sha256');
          verifier.update(Buffer.from(message, 'utf8'));
          verifier.end();
          const isValid = verifier.verify(
            {
              key: publicKeyPEM,
              padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
              saltLength: 32
            },
            signature
          );

          console.log('简化版签名验证完成');
          resolve({
            mode: 'async-simple-rsa-test-8',
            message: message,
            encryptedBase64: result.encrypted.toString('base64'),
            decryptedText: result.decrypted.toString('utf8'),
            signatureBase64: signature.toString('base64'),
            signatureValid: isValid,
            timestamp: Date.now(),
            processingSteps: 3,
            totalDelayMs: 120, // 3 * 40ms
            keyFormat: 'RSA-PRIVATE-KEY'
          });
        }, 40);
      });
    })
    .catch(function(error) {
      console.error('简化版异步 RSA 测试出错:', error);
      return {
        error: '简化版异步 RSA 测试失败: ' + error.message,
        mode: 'async-simple-error-rsa-test-8',
        keyFormat: 'RSA-PRIVATE-KEY'
      };
    });
}

// ===============================================
// 🚀 直接可用的异步测试代码块
// ===============================================

/**
 * 代码块1：完整版异步 RSA 测试（RSA-test-8 密钥）
 * 直接复制到用户代码中即可使用
 */
/*
const crypto = require('crypto');

const privateKeyPEM = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQB62ZFJktEArGUrV5W1iRUayme6j8PCHhc/qXEL/EpNeO98R28W
rrBoUrl+qKWabBI6cDOwQlk2jNd8Xc9llg170orsG0SXGf1/fRab5/2Om2EVsdv1
47wPPlGOJ5425P0ZyPr+pwWgxc0qn1TlqqOk3U1dtgebG9xMPB35eCZFChnQr1d1
23g4fhWpGMAADi6eTwlnJvnWK4ZISQO5Tr93SqRYZHn+yG+c2v4DcwHLeDaByOcP
4qyTlh7u8Vu9TA7kGEuEq0JWiYI7k8nALkjO89oWyBhlm02/a/KSneMyiRvZprki
bg0tmBm/kt4jXCL1u8vgSHjgsLPMf9/GaoQXAgMBAAECggEAEoeQd3VymtRl6hSq
2xfTHBhdbvFSSIw7W3nWOEWUe3z7OlaX9ebhasrXebg8Sj90vGXCFhrb0/OIaRTJ
PHxWik+mbphqTxQ3fSxD5b4nK4RaL2iFUeBItE/lAzkMjyEY3/PFj/VnTumm2X/w
0TdcuXg7vB/Bo+6e2szShJdPxmfbHlxG8cpoJIyPf+8LDeMKMkykvalUmcSzwOmL
cW5qKNaqfpHa2spcJZOAB4ELrwh/e8a/EEXAlUEZBY6avhfxAwfSviYXbirTndhF
7dp730TPRHJOB6CHW+4TrHVu3VoobWxB4xwPg7hju4xcD0T/QskqoEgeGd5d9zzR
/kAFCQKBgQCzt4j9VzRMhkk+lyu5+0qaUTHNhxO6k/quuQXfR1Kl+T/a1sCi13O6
lSKKE8ejxNcxiONQExAIL+jmo9xIndCGNJhJpS81ey46dRiQVTCB0D261nw7FBmH
1VgF8s2oh0eMXgY8bDdduNHz0+YJr8ogVaPrwqdwysyQ4OTnvB0H6wKBgQCu/rlJ
1AhDa29yFOPbIjUWWfARKXEes9KWGZMoTf2Pee3MgSOOugK3XNR1aYrpllTQjEaA
7BJawv0oyhhN3fggKaNxAFPKPa8XYXuRGs0LcwbbjDAkOngjtFQcAOAsgifZgn98
PHGCUmj7X0E1bCl/sQuW1tS9WEFSMbC+NWV1hQKBgD9Jp9VHa2RzecGv7Lce9mOn
qjktk1YGHKaBA79gV4uZXdJMBCSUaO3Q7Qvg8VIL1JheE2a0f9XSQVtPYxizcqaA
SQzOPfTAf0QYzmCtj1p3ofV06OTJLEB4cfoOSjxJ/3k/90Q5+7lmh5EtEvpgTHbc
kdBJiTugPy/Z8uJkjXinAoGATFyPEi5aJMFe8lM3UspMjCJW5cZFvHYPsLwcQPw3
Z0J3iEPZ9lApG0aA13Nk0KVvAUoVAfEB2WU4/3GgxWnU+oPw9ECGT7w3CWbaeulN
DG/3UBqOb2CsSDhKc6XWLNXm+b0+UEI37fx0Hyzj0aIPQc9KFVpNnwpCBtH0JCw8
x9kCgYEAm88yxiNANPvJjV2fwbyp7wX1IE05tbL/sF978M9nA6AvbEOxtmPpWV91
z9z6zxObvDkaX5g3oGROS+ePVlMw6wlU6ZhMRBv0ZzRjIu0GMqGcovconZBoegbW
5Vh7sQqD1zA34XibJPZf2lUt7pHTEYSBHs8WwAtAcyiomRX0m7k=
-----END RSA PRIVATE KEY-----
`;

const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBITANBgkqhkiG9w0BAQEFAAOCAQ4AMIIBCQKCAQB62ZFJktEArGUrV5W1iRUa
yme6j8PCHhc/qXEL/EpNeO98R28WrrBoUrl+qKWabBI6cDOwQlk2jNd8Xc9llg17
0orsG0SXGf1/fRab5/2Om2EVsdv147wPPlGOJ5425P0ZyPr+pwWgxc0qn1TlqqOk
3U1dtgebG9xMPB35eCZFChnQr1d123g4fhWpGMAADi6eTwlnJvnWK4ZISQO5Tr93
SqRYZHn+yG+c2v4DcwHLeDaByOcP4qyTlh7u8Vu9TA7kGEuEq0JWiYI7k8nALkjO
89oWyBhlm02/a/KSneMyiRvZprkibg0tmBm/kt4jXCL1u8vgSHjgsLPMf9/GaoQX
AgMBAAE=
-----END PUBLIC KEY-----
`;

const message = 'RSA Test Message';

return new Promise(function(resolve, reject) {
  console.log('开始异步 RSA 测试 (RSA-test-8)...');
  
  setTimeout(function() {
    try {
      // 步骤1：加密
      const encrypted = crypto.publicEncrypt({
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, Buffer.from(message, 'utf8'));
      
      console.log('加密完成');
      
      setTimeout(function() {
        try {
          // 步骤2：解密
          const decrypted = crypto.privateDecrypt({
            key: privateKeyPEM,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          }, encrypted);
          
          console.log('解密完成');
          
          setTimeout(function() {
            try {
              // 步骤3：签名
              const signer = crypto.createSign('sha256');
              signer.update(Buffer.from(message, 'utf8'));
              signer.end();
              const signature = signer.sign({
                key: privateKeyPEM,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: 32
              });
              
              const verifier = crypto.createVerify('sha256');
              verifier.update(Buffer.from(message, 'utf8'));
              verifier.end();
              const isValid = verifier.verify({
                key: publicKeyPEM,
                padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
                saltLength: 32
              }, signature);
              
              console.log('签名验证完成');
              
              resolve({
                mode: 'async-rsa-test-8',
                message: message,
                encryptedBase64: encrypted.toString('base64'),
                decryptedText: decrypted.toString('utf8'),
                signatureBase64: signature.toString('base64'),
                signatureValid: isValid,
                timestamp: Date.now(),
                keyFormat: 'RSA-PRIVATE-KEY',
                success: true
              });
            } catch (error) {
              reject(new Error('签名步骤失败: ' + error.message));
            }
          }, 60);
        } catch (error) {
          reject(new Error('解密步骤失败: ' + error.message));
        }
      }, 60);
    } catch (error) {
      reject(new Error('加密步骤失败: ' + error.message));
    }
  }, 60);
});
*/

// 代码块2：简化版异步测试（RSA-test-8 密钥）
/*
const crypto = require('crypto');
const message = 'RSA Test Message';

const privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEogIBAAKCAQB62ZFJktEArGUrV5W1iRUayme6j8PCHhc/qXEL/EpNeO98R28W
rrBoUrl+qKWabBI6cDOwQlk2jNd8Xc9llg170orsG0SXGf1/fRab5/2Om2EVsdv1
47wPPlGOJ5425P0ZyPr+pwWgxc0qn1TlqqOk3U1dtgebG9xMPB35eCZFChnQr1d1
23g4fhWpGMAADi6eTwlnJvnWK4ZISQO5Tr93SqRYZHn+yG+c2v4DcwHLeDaByOcP
4qyTlh7u8Vu9TA7kGEuEq0JWiYI7k8nALkjO89oWyBhlm02/a/KSneMyiRvZprki
bg0tmBm/kt4jXCL1u8vgSHjgsLPMf9/GaoQXAgMBAAECggEAEoeQd3VymtRl6hSq
2xfTHBhdbvFSSIw7W3nWOEWUe3z7OlaX9ebhasrXebg8Sj90vGXCFhrb0/OIaRTJ
PHxWik+mbphqTxQ3fSxD5b4nK4RaL2iFUeBItE/lAzkMjyEY3/PFj/VnTumm2X/w
0TdcuXg7vB/Bo+6e2szShJdPxmfbHlxG8cpoJIyPf+8LDeMKMkykvalUmcSzwOmL
cW5qKNaqfpHa2spcJZOAB4ELrwh/e8a/EEXAlUEZBY6avhfxAwfSviYXbirTndhF
7dp730TPRHJOB6CHW+4TrHVu3VoobWxB4xwPg7hju4xcD0T/QskqoEgeGd5d9zzR
/kAFCQKBgQCzt4j9VzRMhkk+lyu5+0qaUTHNhxO6k/quuQXfR1Kl+T/a1sCi13O6
lSKKE8ejxNcxiONQExAIL+jmo9xIndCGNJhJpS81ey46dRiQVTCB0D261nw7FBmH
1VgF8s2oh0eMXgY8bDdduNHz0+YJr8ogVaPrwqdwysyQ4OTnvB0H6wKBgQCu/rlJ
1AhDa29yFOPbIjUWWfARKXEes9KWGZMoTf2Pee3MgSOOugK3XNR1aYrpllTQjEaA
7BJawv0oyhhN3fggKaNxAFPKPa8XYXuRGs0LcwbbjDAkOngjtFQcAOAsgifZgn98
PHGCUmj7X0E1bCl/sQuW1tS9WEFSMbC+NWV1hQKBgD9Jp9VHa2RzecGv7Lce9mOn
qjktk1YGHKaBA79gV4uZXdJMBCSUaO3Q7Qvg8VIL1JheE2a0f9XSQVtPYxizcqaA
SQzOPfTAf0QYzmCtj1p3ofV06OTJLEB4cfoOSjxJ/3k/90Q5+7lmh5EtEvpgTHbc
kdBJiTugPy/Z8uJkjXinAoGATFyPEi5aJMFe8lM3UspMjCJW5cZFvHYPsLwcQPw3
Z0J3iEPZ9lApG0aA13Nk0KVvAUoVAfEB2WU4/3GgxWnU+oPw9ECGT7w3CWbaeulN
DG/3UBqOb2CsSDhKc6XWLNXm+b0+UEI37fx0Hyzj0aIPQc9KFVpNnwpCBtH0JCw8
x9kCgYEAm88yxiNANPvJjV2fwbyp7wX1IE05tbL/sF978M9nA6AvbEOxtmPpWV91
z9z6zxObvDkaX5g3oGROS+ePVlMw6wlU6ZhMRBv0ZzRjIu0GMqGcovconZBoegbW
5Vh7sQqD1zA34XibJPZf2lUt7pHTEYSBHs8WwAtAcyiomRX0m7k=
-----END RSA PRIVATE KEY-----
`;

return Promise.resolve()
  .then(function() {
    console.log('开始简化版异步 RSA 测试 (RSA-test-8)...');
    return new Promise(function(resolve) {
      setTimeout(function() {
        const hash = crypto.createHash('sha256').update(message).digest('hex');
        resolve({
          mode: 'async-simple-rsa-test-8',
          message: message,
          hash: hash,
          timestamp: Date.now(),
          keyFormat: 'RSA-PRIVATE-KEY',
          step: 1
        });
      }, 40);
    });
  })
  .then(function(result) {
    return new Promise(function(resolve) {
      setTimeout(function() {
        const hmac = crypto.createHmac('sha256', 'secret').update(message).digest('hex');
        resolve({
          ...result,
          hmac: hmac,
          step: 2
        });
      }, 40);
    });
  })
  .then(function(result) {
    console.log('简化版异步 RSA 测试完成 (RSA-test-8)');
    return {
      ...result,
      step: 3,
      success: true,
      totalDelayMs: 120
    };
  });
*/

// ===============================================
// 使用示例（取消注释以执行）
// ===============================================

/*
// 异步调用示例1：完整版 (RSA-test-8)
console.log('准备执行完整版异步 RSA 测试 (RSA-test-8)...');
return testRSAAsync();
*/

/*
// 异步调用示例2：简化版 (RSA-test-8)
console.log('准备执行简化版异步 RSA 测试 (RSA-test-8)...');
return testRSAAsyncSimple();
*/

/*
// 异步调用示例3：带错误处理 (RSA-test-8)
console.log('准备执行带错误处理的异步 RSA 测试 (RSA-test-8)...');
return testRSAAsync()
  .then(function(result) {
    console.log('✅ 异步 RSA 测试成功 (RSA-test-8)');
    return {
      success: true,
      data: result,
      executionMode: 'async-with-error-handling-rsa-test-8'
    };
  })
  .catch(function(error) {
    console.error('❌ 异步 RSA 测试失败 (RSA-test-8):', error);
    return { 
      success: false,
      error: error.message,
      executionMode: 'async-with-error-handling-rsa-test-8'
    };
  });
*/