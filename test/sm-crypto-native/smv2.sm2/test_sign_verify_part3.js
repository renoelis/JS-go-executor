const { sm2 } = require('sm-crypto-v2');

/**
 * SM2 签名验签完整测试 - Part 3
 * 覆盖：签名验签、der编码、hash、userId、publicKey、pointPool
 */

try {
  const results = [];
  let testCount = 0;
  let passCount = 0;

  // 生成测试用密钥对
  const keypair = sm2.generateKeyPairHex();
  const publicKey = keypair.publicKey;
  const privateKey = keypair.privateKey;

  // ========== 测试 1: 基本签名验签（纯签名） ==========
  testCount++;
  try {
    const msg = 'hello world';
    
    const signature = sm2.doSignature(msg, privateKey);
    const isValid = sm2.doVerifySignature(msg, signature, publicKey);
    
    if (!isValid) {
      throw new Error('签名验证失败');
    }
    
    // 验证签名格式为十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(signature)) {
      throw new Error('签名应为十六进制字符串');
    }
    
    // SM2签名长度通常为128位（64字节，r和s各32字节）
    if (signature.length !== 128) {
      throw new Error(`签名长度异常: ${signature.length}, 期望: 128`);
    }
    
    results.push({ test: '基本签名验签（纯签名）', status: '✅', details: `签名长度: ${signature.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: '基本签名验签（纯签名）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 2: 使用pointPool加速签名 ==========
  testCount++;
  try {
    const msg = 'test with point pool';
    
    // 预生成椭圆曲线点
    const pointPool = [sm2.getPoint(), sm2.getPoint(), sm2.getPoint(), sm2.getPoint()];
    
    const signature = sm2.doSignature(msg, privateKey, { pointPool });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey);
    
    if (!isValid) {
      throw new Error('使用pointPool的签名验证失败');
    }
    
    results.push({ test: '使用pointPool加速签名', status: '✅', details: `点池大小: ${pointPool.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: '使用pointPool加速签名', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 3: DER编码签名验签 ==========
  testCount++;
  try {
    const msg = 'DER encoding test';
    
    const signature = sm2.doSignature(msg, privateKey, { der: true });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { der: true });
    
    if (!isValid) {
      throw new Error('DER编码签名验证失败');
    }
    
    // DER编码的签名长度可能不同（通常在140-144之间）
    results.push({ test: 'DER编码签名验签', status: '✅', details: `DER签名长度: ${signature.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: 'DER编码签名验签', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 4: 带SM3杂凑的签名验签 ==========
  testCount++;
  try {
    const msg = 'hash test message';
    
    const signature = sm2.doSignature(msg, privateKey, { hash: true });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { hash: true });
    
    if (!isValid) {
      throw new Error('带SM3杂凑的签名验证失败');
    }
    
    results.push({ test: '带SM3杂凑的签名验签', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '带SM3杂凑的签名验签', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 5: 带SM3杂凑+传入publicKey（避免推导） ==========
  testCount++;
  try {
    const msg = 'hash with publicKey test';
    
    const signature = sm2.doSignature(msg, privateKey, { hash: true, publicKey });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { hash: true, publicKey });
    
    if (!isValid) {
      throw new Error('带publicKey的签名验证失败');
    }
    
    results.push({ test: '带SM3杂凑+传入publicKey', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '带SM3杂凑+传入publicKey', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 6: 自定义userId签名验签 ==========
  testCount++;
  try {
    const msg = 'custom userId test';
    const userId = 'testUser@example.com';
    
    const signature = sm2.doSignature(msg, privateKey, { hash: true, publicKey, userId });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { hash: true, userId });
    
    if (!isValid) {
      throw new Error('自定义userId签名验证失败');
    }
    
    results.push({ test: '自定义userId签名验签', status: '✅', details: `userId: ${userId}` });
    passCount++;
  } catch (error) {
    results.push({ test: '自定义userId签名验签', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 7: 默认userId（1234567812345678） ==========
  testCount++;
  try {
    const msg = 'default userId test';
    
    // 不传userId，使用默认值
    const signature1 = sm2.doSignature(msg, privateKey, { hash: true, publicKey });
    
    // 显式传入默认userId
    const signature2 = sm2.doSignature(msg, privateKey, { hash: true, publicKey, userId: '1234567812345678' });
    
    // 两个签名应该能互相验证（因为使用了相同的userId）
    const isValid1 = sm2.doVerifySignature(msg, signature1, publicKey, { hash: true, userId: '1234567812345678' });
    const isValid2 = sm2.doVerifySignature(msg, signature2, publicKey, { hash: true });
    
    if (!isValid1 || !isValid2) {
      throw new Error('默认userId验证失败');
    }
    
    results.push({ test: '默认userId（1234567812345678）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '默认userId（1234567812345678）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 8: userId长度边界测试（小于8192） ==========
  testCount++;
  try {
    const msg = 'long userId test';
    const longUserId = 'A'.repeat(8000); // 8000字符，应在限制内
    
    const signature = sm2.doSignature(msg, privateKey, { hash: true, publicKey, userId: longUserId });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { hash: true, userId: longUserId });
    
    if (!isValid) {
      throw new Error('长userId签名验证失败');
    }
    
    results.push({ test: 'userId长度边界（8000字符）', status: '✅', details: `userId长度: ${longUserId.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: 'userId长度边界（8000字符）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 9: DER + hash + userId组合 ==========
  testCount++;
  try {
    const msg = 'combined options test';
    const userId = 'combinedUser';
    
    const signature = sm2.doSignature(msg, privateKey, { der: true, hash: true, publicKey, userId });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { der: true, hash: true, userId });
    
    if (!isValid) {
      throw new Error('组合选项签名验证失败');
    }
    
    results.push({ test: 'DER + hash + userId组合', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'DER + hash + userId组合', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 10: pointPool + der + hash组合 ==========
  testCount++;
  try {
    const msg = 'full options test';
    const pointPool = [sm2.getPoint(), sm2.getPoint()];
    
    const signature = sm2.doSignature(msg, privateKey, { pointPool, der: true, hash: true, publicKey });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { der: true, hash: true });
    
    if (!isValid) {
      throw new Error('完整选项签名验证失败');
    }
    
    results.push({ test: 'pointPool + der + hash组合', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'pointPool + der + hash组合', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 11: 空消息签名验签 ==========
  testCount++;
  try {
    const msg = '';
    
    const signature = sm2.doSignature(msg, privateKey);
    const isValid = sm2.doVerifySignature(msg, signature, publicKey);
    
    if (!isValid) {
      throw new Error('空消息签名验证失败');
    }
    
    results.push({ test: '空消息签名验签', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '空消息签名验签', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 12: 超长消息签名验签 ==========
  testCount++;
  try {
    const msg = 'X'.repeat(100000); // 100KB数据
    
    const signature = sm2.doSignature(msg, privateKey, { hash: true });
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { hash: true });
    
    if (!isValid) {
      throw new Error('超长消息签名验证失败');
    }
    
    results.push({ test: '超长消息签名验签', status: '✅', details: `消息长度: ${msg.length}字符` });
    passCount++;
  } catch (error) {
    results.push({ test: '超长消息签名验签', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 13: 同一消息多次签名产生不同签名 ==========
  testCount++;
  try {
    const msg = 'same message';
    
    const sig1 = sm2.doSignature(msg, privateKey);
    const sig2 = sm2.doSignature(msg, privateKey);
    const sig3 = sm2.doSignature(msg, privateKey);
    
    // 由于随机数k不同，签名应该不同
    if (sig1 === sig2 || sig1 === sig3 || sig2 === sig3) {
      throw new Error('同一消息多次签名应产生不同签名（随机性）');
    }
    
    // 但都应能通过验证
    const valid1 = sm2.doVerifySignature(msg, sig1, publicKey);
    const valid2 = sm2.doVerifySignature(msg, sig2, publicKey);
    const valid3 = sm2.doVerifySignature(msg, sig3, publicKey);
    
    if (!valid1 || !valid2 || !valid3) {
      throw new Error('所有签名都应通过验证');
    }
    
    results.push({ test: '同一消息多次签名产生不同签名', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '同一消息多次签名产生不同签名', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 14: 错误的公钥验签应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    const wrongKeypair = sm2.generateKeyPairHex();
    
    const signature = sm2.doSignature(msg, privateKey);
    const isValid = sm2.doVerifySignature(msg, signature, wrongKeypair.publicKey);
    
    if (isValid) {
      throw new Error('使用错误公钥验签不应成功');
    }
    
    results.push({ test: '错误的公钥验签应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '错误的公钥验签应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 15: 篡改消息验签应失败 ==========
  testCount++;
  try {
    const msg = 'original message';
    const tamperedMsg = 'tampered message';
    
    const signature = sm2.doSignature(msg, privateKey);
    const isValid = sm2.doVerifySignature(tamperedMsg, signature, publicKey);
    
    if (isValid) {
      throw new Error('篡改消息后验签不应成功');
    }
    
    results.push({ test: '篡改消息验签应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '篡改消息验签应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 16: 篡改签名验签应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    
    const signature = sm2.doSignature(msg, privateKey);
    
    // 篡改签名（修改最后几个字符）
    const tamperedSig = signature.slice(0, -4) + 'ffff';
    
    const isValid = sm2.doVerifySignature(msg, tamperedSig, publicKey);
    
    if (isValid) {
      throw new Error('篡改签名后验签不应成功');
    }
    
    results.push({ test: '篡改签名验签应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '篡改签名验签应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 17: 不匹配的der选项应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    
    // 用DER编码签名
    const signature = sm2.doSignature(msg, privateKey, { der: true });
    
    // 用非DER方式验签，应该抛出错误或返回false
    try {
      const isValid = sm2.doVerifySignature(msg, signature, publicKey, { der: false });
      if (isValid) {
        throw new Error('DER选项不匹配时验签不应成功');
      }
    } catch (e) {
      // 预期应该抛出错误或返回false
      if (e.message === 'DER选项不匹配时验签不应成功') {
        throw e;
      }
      // 正确抛出了错误
    }
    
    results.push({ test: '不匹配的der选项应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '不匹配的der选项应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 18: 不匹配的hash选项应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    
    // 用hash签名
    const signature = sm2.doSignature(msg, privateKey, { hash: true });
    
    // 不用hash验签
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { hash: false });
    
    if (isValid) {
      throw new Error('hash选项不匹配时验签不应成功');
    }
    
    results.push({ test: '不匹配的hash选项应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '不匹配的hash选项应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 19: 不匹配的userId应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    
    // 用userId1签名
    const signature = sm2.doSignature(msg, privateKey, { hash: true, publicKey, userId: 'user1' });
    
    // 用userId2验签
    const isValid = sm2.doVerifySignature(msg, signature, publicKey, { hash: true, userId: 'user2' });
    
    if (isValid) {
      throw new Error('userId不匹配时验签不应成功');
    }
    
    results.push({ test: '不匹配的userId应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '不匹配的userId应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 20: 使用压缩公钥验签 ==========
  testCount++;
  try {
    const msg = 'compressed key test';
    const compressedPublicKey = sm2.compressPublicKeyHex(publicKey);
    
    const signature = sm2.doSignature(msg, privateKey);
    const isValid = sm2.doVerifySignature(msg, signature, compressedPublicKey);
    
    if (!isValid) {
      throw new Error('使用压缩公钥验签失败');
    }
    
    results.push({ test: '使用压缩公钥验签', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '使用压缩公钥验签', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 21: 使用预计算公钥验签 ==========
  testCount++;
  try {
    const msg = 'precomputed key test';
    const precomputedPublicKey = sm2.precomputePublicKey(publicKey);
    
    const signature = sm2.doSignature(msg, privateKey, { hash: true });
    const isValid = sm2.doVerifySignature(msg, signature, precomputedPublicKey, { hash: true });
    
    if (!isValid) {
      throw new Error('使用预计算公钥验签失败');
    }
    
    results.push({ test: '使用预计算公钥验签', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '使用预计算公钥验签', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 汇总结果 ==========
  const summary = {
    success: passCount === testCount,
    total: testCount,
    passed: passCount,
    failed: testCount - passCount,
    passRate: `${((passCount / testCount) * 100).toFixed(2)}%`
  };

  const output = {
    success: summary.success,
    summary,
    results
  };

  console.log(JSON.stringify(output, null, 2));
  return output;

} catch (error) {
  const output = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(output, null, 2));
  return output;
}

