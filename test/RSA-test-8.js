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