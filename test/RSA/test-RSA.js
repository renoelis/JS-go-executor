const crypto = require('crypto');

function main() {
  try {
    // 输入：如果外部传入 input.jsonString 则使用它，否则使用示例 JSON
    const jsonString = input && input.jsonString
      ? input.jsonString
      : JSON.stringify({ hello: "world", ts: Date.now(), nested: { a: 1, b: "文本" } });

    // 将要测试的密钥长度
    const keySizes = [2048, 3072, 4096];

    const results = [];

    keySizes.forEach((modulusLength) => {
      // 1) 生成 RSA 密钥对（私钥默认输出为 PKCS#8 PEM，公钥为 SPKI PEM）
      const { publicKey: publicPem, privateKey: privatePkcs8Pem } =
        crypto.generateKeyPairSync('rsa', {
          modulusLength,
          publicKeyEncoding: { type: 'spki', format: 'pem' },
          privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, // PKCS#8
        });

      // 2) 从 PKCS#8 转换出 PKCS#1 私钥 PEM（演示不同私钥格式）
      const privateKeyObj = crypto.createPrivateKey({ key: privatePkcs8Pem, format: 'pem', type: 'pkcs8' });
      const privatePkcs1Pem = privateKeyObj.export({ type: 'pkcs1', format: 'pem' });

      // 3) 导出公钥的 DER（Binary），以 Base64 表示（另一种格式）
      const pubDer = crypto.createPublicKey({ key: publicPem, format: 'pem', type: 'spki' })
        .export({ type: 'spki', format: 'der' });
      const publicDerBase64 = Buffer.from(pubDer).toString('base64');

      // 明文（JSON 字符串）
      const plaintextBuffer = Buffer.from(jsonString, 'utf8');

      // ---------- 加密/解密（使用 RSA-OAEP with SHA-256） ----------
      const oaepOptions = {
        key: publicPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      };

      const ciphertext = crypto.publicEncrypt(oaepOptions, plaintextBuffer);
      // 解密使用私钥（PKCS#8 及 PKCS#1 都可用于解密）
      const decryptedPkcs8 = crypto.privateDecrypt(
        {
          key: privatePkcs8Pem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        ciphertext
      );
      const decryptedPkcs1 = crypto.privateDecrypt(
        {
          key: privatePkcs1Pem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        ciphertext
      );

      const encryptionSuccess = decryptedPkcs8.toString('utf8') === jsonString
        && decryptedPkcs1.toString('utf8') === jsonString;

      // ---------- 签名 / 验签 ----------
      // 1) RSA-PSS 签名 (推荐): SHA-256 + PSS
      const pssSignature = crypto.sign('sha256', plaintextBuffer, {
        key: privatePkcs8Pem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      });
      const pssVerified = crypto.verify('sha256', plaintextBuffer, {
        key: publicPem,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      }, pssSignature);

      // 验证失败示例：用另一把新生成的 key 验证当前签名（应为 false）
      const { publicKey: otherPub } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      const pssVerifiedWithWrongKey = crypto.verify('sha256', plaintextBuffer, {
        key: otherPub,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
        saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
      }, pssSignature);

      // 2) RSA-SHA256 PKCS#1 v1.5 签名（兼容性场景）
      const pkcs1Signature = crypto.sign('sha256', plaintextBuffer, {
        key: privatePkcs8Pem,
        padding: crypto.constants.RSA_PKCS1_PADDING
      });
      const pkcs1Verified = crypto.verify('sha256', plaintextBuffer, {
        key: publicPem,
        padding: crypto.constants.RSA_PKCS1_PADDING
      }, pkcs1Signature);

      // ---------- 其他辅助信息 ----------
      // 不同输出编码展示
      const ciphertextBase64 = ciphertext.toString('base64');
      const ciphertextHex = ciphertext.toString('hex');
      const pssSigB64 = pssSignature.toString('base64');
      const pkcs1SigB64 = pkcs1Signature.toString('base64');

      // 将结果收集
      results.push({
        modulusLength,
        keys: {
          publicPem,                 // SPKI PEM
          publicDerBase64,           // SPKI DER base64
          privatePkcs8Pem,           // PKCS#8 PEM
          privatePkcs1Pem            // PKCS#1 PEM (转换得到)
        },
        encryption: {
          algorithm: 'RSA-OAEP-SHA256',
          ciphertextBase64,
          ciphertextHex,
          decryptedWithPkcs8: decryptedPkcs8.toString('utf8'),
          decryptedWithPkcs1: decryptedPkcs1.toString('utf8'),
          success: encryptionSuccess
        },
        signatures: {
          pss: {
            algorithm: 'RSA-PSS-SHA256',
            signatureBase64: pssSigB64,
            verified: Boolean(pssVerified),
            verifiedWithWrongKey: Boolean(pssVerifiedWithWrongKey)
          },
          pkcs1_v1_5: {
            algorithm: 'RSA-SHA256 (PKCS#1 v1.5)',
            signatureBase64: pkcs1SigB64,
            verified: Boolean(pkcs1Verified)
          }
        }
      });
    });

    // 汇总返回（只返回小心序列化的数据）
    return {
      success: true,
      data: {
        inputJsonString: jsonString,
        testedKeySizes: keySizes,
        results
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

return main();