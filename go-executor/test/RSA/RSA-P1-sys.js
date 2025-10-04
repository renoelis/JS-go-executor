const crypto = require('crypto');

// 固定RSA密钥（2048位）
const privateKeyPEM = `-----BEGIN PRIVATE KEY-----
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

// 固定明文
const message = 'RSA Test Message';

function testRSAAsync() {
    return new Promise(function(resolve, reject) {
      try {
        console.log('开始异步 RSA 测试...');
        
        // 模拟异步操作延迟
        setTimeout(function() {
          try {
            // 第一步：异步生成加密数据
            const step1Promise = new Promise(function(resolveStep1) {
              setTimeout(function() {
                const encrypted = crypto.publicEncrypt(
                  {
                    key: publicKeyPEM,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                  },
                  Buffer.from(message, 'utf8')
                );
                console.log('异步加密完成');
                resolveStep1(encrypted);
              }, 50); // 50ms 延迟
            });
  
            // 第二步：异步解密
            step1Promise.then(function(encrypted) {
              return new Promise(function(resolveStep2) {
                setTimeout(function() {
                  const decrypted = crypto.privateDecrypt(
                    {
                      key: privateKeyPEM,
                      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                      oaepHash: 'sha256'
                    },
                    encrypted
                  );
                  console.log('异步解密完成');
                  resolveStep2({ encrypted, decrypted });
                }, 50); // 50ms 延迟
              });
            }).then(function(cryptoResult) {
              // 第三步：异步签名（PSS）
              return new Promise(function(resolveStep3) {
                setTimeout(function() {
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
                  
                  console.log('异步 PSS 签名完成');
                  resolveStep3({
                    ...cryptoResult,
                    signaturePSS,
                    isPSSValid
                  });
                }, 50); // 50ms 延迟
              });
            }).then(function(signResult) {
              // 第四步：异步签名（PKCS1）
              return new Promise(function(resolveStep4) {
                setTimeout(function() {
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
  
                  console.log('异步 PKCS1 签名完成');
                  resolveStep4({
                    ...signResult,
                    signaturePKCS1,
                    isPKCS1Valid
                  });
                }, 50); // 50ms 延迟
              });
            }).then(function(finalResult) {
              // 最终结果组装
              const result = {
                mode: 'async',
                message: message,
                encryptedBase64: finalResult.encrypted.toString('base64'),
                decryptedText: finalResult.decrypted.toString('utf8'),
                signaturePSSBase64: finalResult.signaturePSS.toString('base64'),
                signaturePSSValid: finalResult.isPSSValid,
                signaturePKCS1Base64: finalResult.signaturePKCS1.toString('base64'),
                signaturePKCS1Valid: finalResult.isPKCS1Valid,
                timestamp: Date.now(),
                processingSteps: 4,
                totalDelayMs: 200 // 4 * 50ms
              };
  
              console.log('异步 RSA 测试全部完成');
              resolve(result);
            }).catch(function(error) {
              console.error('异步处理链中出错:', error);
              reject(new Error('异步 RSA 处理失败: ' + error.message));
            });
  
          } catch (error) {
            console.error('异步 RSA 测试出错:', error);
            reject(new Error('异步 RSA 测试失败: ' + error.message));
          }
        }, 10); // 初始延迟 10ms
  
      } catch (error) {
        console.error('异步 RSA 测试初始化失败:', error);
        reject(new Error('异步 RSA 测试初始化失败: ' + error.message));
      }
    });
  }

  return testRSAAsync();
  