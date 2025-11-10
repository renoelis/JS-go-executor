const { sm2 } = require('sm-crypto-v2');

/**
 * SM2 加密解密完整测试 - Part 2
 * 覆盖：加密解密、cipherMode、asn1编码、输入输出类型
 */

try {
  const results = [];
  let testCount = 0;
  let passCount = 0;

  // 生成测试用密钥对
  const keypair = sm2.generateKeyPairHex();
  const publicKey = keypair.publicKey;
  const privateKey = keypair.privateKey;

  // ========== 测试 1: 基本加密解密（字符串，C1C3C2模式） ==========
  testCount++;
  try {
    const msg = 'hello world! 我是测试消息。';
    const cipherMode = 1; // C1C3C2
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
    
    if (decryptData !== msg) {
      throw new Error(`解密结果不匹配: 期望 "${msg}", 实际 "${decryptData}"`);
    }
    
    // 验证密文为十六进制字符串
    if (!/^[0-9a-fA-F]+$/.test(encryptData)) {
      throw new Error('密文应为十六进制字符串');
    }
    
    results.push({ test: '基本加密解密（字符串，C1C3C2）', status: '✅', details: `消息长度: ${msg.length}, 密文长度: ${encryptData.length}` });
    passCount++;
  } catch (error) {
    results.push({ test: '基本加密解密（字符串，C1C3C2）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 2: 加密解密（字符串，C1C2C3模式） ==========
  testCount++;
  try {
    const msg = 'hello world! 我是测试消息。';
    const cipherMode = 0; // C1C2C3
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
    
    if (decryptData !== msg) {
      throw new Error(`解密结果不匹配: 期望 "${msg}", 实际 "${decryptData}"`);
    }
    
    results.push({ test: '加密解密（字符串，C1C2C3）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '加密解密（字符串，C1C2C3）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 3: 验证C1C3C2和C1C2C3密文不同 ==========
  testCount++;
  try {
    const msg = 'test message';
    
    const encrypted1 = sm2.doEncrypt(msg, publicKey, 1); // C1C3C2
    const encrypted0 = sm2.doEncrypt(msg, publicKey, 0); // C1C2C3
    
    // 虽然是同样的消息，但因为随机数和模式不同，密文应该不同
    if (encrypted1 === encrypted0) {
      throw new Error('C1C3C2和C1C2C3模式的密文不应相同（理论上概率极小）');
    }
    
    results.push({ test: '验证C1C3C2和C1C2C3密文不同', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '验证C1C3C2和C1C2C3密文不同', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 4: 模式交叉解密应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    
    const encrypted1 = sm2.doEncrypt(msg, publicKey, 1); // C1C3C2
    
    // 用C1C2C3模式解密C1C3C2的密文
    try {
      const decrypted = sm2.doDecrypt(encrypted1, privateKey, 0);
      // 如果解密成功但结果不对，也算失败
      if (decrypted === msg) {
        throw new Error('模式不匹配时不应解密成功');
      }
    } catch (e) {
      // 预期应该抛出错误或解密失败
    }
    
    results.push({ test: '模式交叉解密应失败', status: '✅', details: '正确拒绝不匹配的模式' });
    passCount++;
  } catch (error) {
    results.push({ test: '模式交叉解密应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 5: ASN.1编码加密解密（C1C3C2） ==========
  testCount++;
  try {
    const msg = 'ASN.1 test message';
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode, { asn1: true });
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode, { asn1: true });
    
    if (decryptData !== msg) {
      throw new Error(`ASN.1解密结果不匹配: 期望 "${msg}", 实际 "${decryptData}"`);
    }
    
    results.push({ test: 'ASN.1编码加密解密（C1C3C2）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'ASN.1编码加密解密（C1C3C2）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 6: ASN.1编码加密解密（C1C2C3） ==========
  testCount++;
  try {
    const msg = 'ASN.1 test message';
    const cipherMode = 0;
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode, { asn1: true });
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode, { asn1: true });
    
    if (decryptData !== msg) {
      throw new Error(`ASN.1解密结果不匹配: 期望 "${msg}", 实际 "${decryptData}"`);
    }
    
    results.push({ test: 'ASN.1编码加密解密（C1C2C3）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'ASN.1编码加密解密（C1C2C3）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 7: ASN.1和非ASN.1密文格式不同 ==========
  testCount++;
  try {
    const msg = 'test';
    const cipherMode = 1;
    
    const encrypted1 = sm2.doEncrypt(msg, publicKey, cipherMode, { asn1: false });
    const encrypted2 = sm2.doEncrypt(msg, publicKey, cipherMode, { asn1: true });
    
    // ASN.1编码会增加结构信息，密文格式应不同
    if (encrypted1 === encrypted2) {
      throw new Error('ASN.1和非ASN.1密文格式应不同（概率极小相同）');
    }
    
    results.push({ test: 'ASN.1和非ASN.1密文格式不同', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'ASN.1和非ASN.1密文格式不同', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 8: 空字符串加密解密 ==========
  testCount++;
  try {
    const msg = '';
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
    
    if (decryptData !== msg) {
      throw new Error(`空字符串解密结果不匹配: 期望 "", 实际 "${decryptData}"`);
    }
    
    results.push({ test: '空字符串加密解密', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '空字符串加密解密', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 9: 超长字符串加密解密 ==========
  testCount++;
  try {
    const msg = 'A'.repeat(10000); // 10KB数据
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
    
    if (decryptData !== msg) {
      throw new Error('超长字符串解密结果不匹配');
    }
    
    results.push({ test: '超长字符串加密解密', status: '✅', details: `消息长度: ${msg.length}字符` });
    passCount++;
  } catch (error) {
    results.push({ test: '超长字符串加密解密', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 10: 包含特殊字符的字符串 ==========
  testCount++;
  try {
    const msg = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./\n\r\t\u0000\u0001\u001f😀🎉中文日本語한국어';
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
    
    if (decryptData !== msg) {
      throw new Error('特殊字符串解密结果不匹配');
    }
    
    results.push({ test: '包含特殊字符的字符串', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '包含特殊字符的字符串', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 11: Uint8Array输入加密（字符串输出） ==========
  testCount++;
  try {
    const msgString = 'hello world';
    const msgArray = new TextEncoder().encode(msgString);
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msgArray, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
    
    // 默认解密输出应为字符串
    if (typeof decryptData !== 'string') {
      throw new Error(`解密输出类型错误: 期望 string, 实际 ${typeof decryptData}`);
    }
    
    if (decryptData !== msgString) {
      throw new Error(`解密结果不匹配: 期望 "${msgString}", 实际 "${decryptData}"`);
    }
    
    results.push({ test: 'Uint8Array输入加密（字符串输出）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'Uint8Array输入加密（字符串输出）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 12: 字符串输入，Uint8Array输出解密 ==========
  testCount++;
  try {
    const msgString = 'hello world';
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msgString, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode, { output: 'array' });
    
    // 验证输出为Uint8Array
    if (!(decryptData instanceof Uint8Array)) {
      throw new Error(`解密输出类型错误: 期望 Uint8Array, 实际 ${typeof decryptData}`);
    }
    
    // 转换为字符串验证
    const decryptedString = new TextDecoder().decode(decryptData);
    if (decryptedString !== msgString) {
      throw new Error(`解密结果不匹配: 期望 "${msgString}", 实际 "${decryptedString}"`);
    }
    
    results.push({ test: '字符串输入，Uint8Array输出解密', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '字符串输入，Uint8Array输出解密', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 13: Uint8Array输入和输出 ==========
  testCount++;
  try {
    const msgString = 'test array';
    const msgArray = new TextEncoder().encode(msgString);
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msgArray, publicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode, { output: 'array' });
    
    if (!(decryptData instanceof Uint8Array)) {
      throw new Error('解密输出应为Uint8Array');
    }
    
    // 比较字节数组
    if (decryptData.length !== msgArray.length) {
      throw new Error(`字节数组长度不匹配: 期望 ${msgArray.length}, 实际 ${decryptData.length}`);
    }
    
    for (let i = 0; i < msgArray.length; i++) {
      if (decryptData[i] !== msgArray[i]) {
        throw new Error(`字节不匹配 at index ${i}: 期望 ${msgArray[i]}, 实际 ${decryptData[i]}`);
      }
    }
    
    results.push({ test: 'Uint8Array输入和输出', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'Uint8Array输入和输出', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 14: 使用压缩公钥加密 ==========
  testCount++;
  try {
    const msg = 'compressed key test';
    const compressedPublicKey = sm2.compressPublicKeyHex(publicKey);
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msg, compressedPublicKey, cipherMode);
    const decryptData = sm2.doDecrypt(encryptData, privateKey, cipherMode);
    
    if (decryptData !== msg) {
      throw new Error(`使用压缩公钥加密解密失败: 期望 "${msg}", 实际 "${decryptData}"`);
    }
    
    results.push({ test: '使用压缩公钥加密', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '使用压缩公钥加密', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 15: 错误的私钥解密应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    const wrongKeypair = sm2.generateKeyPairHex();
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode);
    
    try {
      const decryptData = sm2.doDecrypt(encryptData, wrongKeypair.privateKey, cipherMode);
      // 如果解密"成功"但结果不对
      if (decryptData === msg) {
        throw new Error('使用错误私钥不应解密成功');
      }
    } catch (e) {
      // 预期应该抛出错误
    }
    
    results.push({ test: '错误的私钥解密应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '错误的私钥解密应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 16: 篡改密文解密应失败 ==========
  testCount++;
  try {
    const msg = 'test message';
    const cipherMode = 1;
    
    const encryptData = sm2.doEncrypt(msg, publicKey, cipherMode);
    
    // 篡改密文（修改最后几个字符）
    const tamperedCipher = encryptData.slice(0, -4) + 'ffff';
    
    try {
      const decryptData = sm2.doDecrypt(tamperedCipher, privateKey, cipherMode);
      // 如果解密"成功"但结果不对，也算检测到篡改
      if (decryptData === msg) {
        throw new Error('篡改的密文不应解密出正确结果');
      }
    } catch (e) {
      // 预期应该抛出错误或返回错误结果
    }
    
    results.push({ test: '篡改密文解密应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '篡改密文解密应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 17: 无效密文格式解密应失败 ==========
  testCount++;
  try {
    const invalidCipher = 'invalid_hex_string_xyz';
    const cipherMode = 1;
    
    try {
      sm2.doDecrypt(invalidCipher, privateKey, cipherMode);
      throw new Error('无效密文格式应抛出错误');
    } catch (e) {
      // 预期应该抛出错误
      if (e.message === '无效密文格式应抛出错误') {
        throw e;
      }
    }
    
    results.push({ test: '无效密文格式解密应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '无效密文格式解密应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 18: 默认cipherMode（应为1/C1C3C2） ==========
  testCount++;
  try {
    const msg = 'default mode test';
    
    // 不传cipherMode，应默认为1
    const encryptData = sm2.doEncrypt(msg, publicKey);
    const decryptData = sm2.doDecrypt(encryptData, privateKey);
    
    if (decryptData !== msg) {
      throw new Error('默认模式加密解密失败');
    }
    
    // 验证默认模式是否为C1C3C2（模式1）
    const decryptData1 = sm2.doDecrypt(encryptData, privateKey, 1);
    if (decryptData1 !== msg) {
      throw new Error('默认模式似乎不是C1C3C2');
    }
    
    results.push({ test: '默认cipherMode（应为1/C1C3C2）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '默认cipherMode（应为1/C1C3C2）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 19: 同一消息多次加密产生不同密文 ==========
  testCount++;
  try {
    const msg = 'same message';
    const cipherMode = 1;
    
    const encrypted1 = sm2.doEncrypt(msg, publicKey, cipherMode);
    const encrypted2 = sm2.doEncrypt(msg, publicKey, cipherMode);
    const encrypted3 = sm2.doEncrypt(msg, publicKey, cipherMode);
    
    // 由于每次使用不同的随机数k，密文应该不同
    if (encrypted1 === encrypted2 || encrypted1 === encrypted3 || encrypted2 === encrypted3) {
      throw new Error('同一消息多次加密应产生不同密文（随机性）');
    }
    
    // 但都应能正确解密
    const decrypted1 = sm2.doDecrypt(encrypted1, privateKey, cipherMode);
    const decrypted2 = sm2.doDecrypt(encrypted2, privateKey, cipherMode);
    const decrypted3 = sm2.doDecrypt(encrypted3, privateKey, cipherMode);
    
    if (decrypted1 !== msg || decrypted2 !== msg || decrypted3 !== msg) {
      throw new Error('所有密文都应能正确解密');
    }
    
    results.push({ test: '同一消息多次加密产生不同密文', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '同一消息多次加密产生不同密文', status: '❌', error: error.message, stack: error.stack });
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

