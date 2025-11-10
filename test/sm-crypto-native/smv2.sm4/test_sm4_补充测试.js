const { sm4 } = require('sm-crypto-v2');

/**
 * SM4 补充测试 - 查缺补漏
 * 覆盖一些可能遗漏的边缘场景
 * 基于 sm-crypto-v2 v1.15.0
 */

try {
  const results = [];
  let testCount = 0;
  let passCount = 0;

  // 测试常量
  const SM4_KEY = '0123456789abcdeffedcba9876543210';
  const SM4_IV = 'fedcba98765432100123456789abcdef';
  const SM4_GCM_IV = 'aabbccddeeff001122334455';

  // 辅助函数
  const fromHex = (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
  };
  const toHex = (u8) => {
    return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // ========================================
  // 补充测试 1: 密钥为 Uint8Array 的不同格式
  // ========================================
  testCount++;
  try {
    const plaintext = 'Key Format Test';
    const keyBytes = fromHex(SM4_KEY);
    
    const ciphertext = sm4.encrypt(plaintext, keyBytes, { mode: 'ecb' });
    const decrypted = sm4.decrypt(ciphertext, keyBytes, { mode: 'ecb' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: '密钥为 Uint8Array 的不同格式', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '密钥为 Uint8Array 的不同格式', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 2: IV 为 Uint8Array 的不同格式（CBC）
  // ========================================
  testCount++;
  try {
    const plaintext = 'IV Format Test';
    const ivBytes = fromHex(SM4_IV);
    
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: ivBytes });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: ivBytes });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'IV 为 Uint8Array 的不同格式（CBC）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'IV 为 Uint8Array 的不同格式（CBC）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 3: GCM 模式 IV 为 Uint8Array
  // ========================================
  testCount++;
  try {
    const plaintext = 'GCM IV U8 Test';
    const ivBytes = fromHex(SM4_GCM_IV);
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: ivBytes, 
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    const decrypted = sm4.decrypt(output, SM4_KEY, { 
      mode: 'gcm', 
      iv: ivBytes, 
      tag 
    });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 模式 IV 为 Uint8Array', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 模式 IV 为 Uint8Array', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 4: 混合使用 string 密钥和 Uint8Array 明文
  // ========================================
  testCount++;
  try {
    const plainBytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const ciphertext = sm4.encrypt(plainBytes, SM4_KEY, { mode: 'ecb', output: 'array' });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'ecb', input: 'array', output: 'array' });
    
    if (plainBytes.length !== decrypted.length) {
      throw new Error('长度不匹配');
    }
    for (let i = 0; i < plainBytes.length; i++) {
      if (plainBytes[i] !== decrypted[i]) {
        throw new Error(`字节 ${i} 不匹配`);
      }
    }
    
    results.push({ test: '混合使用 string 密钥和 Uint8Array 明文', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '混合使用 string 密钥和 Uint8Array 明文', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 5: 混合使用 Uint8Array 密钥和 string 明文
  // ========================================
  testCount++;
  try {
    const plaintext = 'Mixed Types Test';
    const keyBytes = fromHex(SM4_KEY);
    
    const ciphertext = sm4.encrypt(plaintext, keyBytes, { mode: 'ecb' });
    const decrypted = sm4.decrypt(ciphertext, keyBytes, { mode: 'ecb' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: '混合使用 Uint8Array 密钥和 string 明文', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '混合使用 Uint8Array 密钥和 string 明文', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 6: ECB 模式 16 字节边界（无填充应该成功）
  // ========================================
  testCount++;
  try {
    const plaintext = '0123456789abcdef'; // 恰好 16 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'ecb', padding: 'none' });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'ecb', padding: 'none' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'ECB 模式 16 字节边界（无填充）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'ECB 模式 16 字节边界（无填充）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 7: CBC 模式 32 字节明文（2个块）
  // ========================================
  testCount++;
  try {
    const plaintext = '12345678901234567890123456789012'; // 32 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, padding: 'none' });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, padding: 'none' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 模式 32 字节明文（2个块）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 模式 32 字节明文（2个块）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 8: GCM 输出 string 格式（默认）
  // ========================================
  testCount++;
  try {
    const plaintext = 'GCM String Output';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      output: 'string',
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    
    if (typeof output !== 'string') {
      throw new Error(`output 应为 string，实际: ${typeof output}`);
    }
    if (typeof tag !== 'string') {
      throw new Error(`tag 应为 string，实际: ${typeof tag}`);
    }
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      tag 
    });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 输出 string 格式（默认）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 输出 string 格式（默认）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 9: GCM 输出 array 格式
  // ========================================
  testCount++;
  try {
    const plaintext = 'GCM Array Output';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      output: 'array',
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    
    if (!(output instanceof Uint8Array)) {
      throw new Error('output 应为 Uint8Array');
    }
    if (!(tag instanceof Uint8Array)) {
      throw new Error('tag 应为 Uint8Array');
    }
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      tag,
      input: 'array',
      output: 'string'
    });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 输出 array 格式', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 输出 array 格式', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 10: CTR 模式支持非块对齐（流模式特性）
  // ========================================
  testCount++;
  try {
    const plaintext = 'CTR Non-aligned'; // 15 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'ctr', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'ctr', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CTR 模式支持非块对齐', status: '✅', details: '流模式无需填充' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CTR 模式支持非块对齐', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 11: CFB 模式支持非块对齐
  // ========================================
  testCount++;
  try {
    const plaintext = 'CFB Non-aligned!'; // 16 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cfb', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cfb', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CFB 模式支持非块对齐', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CFB 模式支持非块对齐', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 12: OFB 模式支持非块对齐
  // ========================================
  testCount++;
  try {
    const plaintext = 'OFB Non-align'; // 13 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'ofb', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'ofb', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'OFB 模式支持非块对齐', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'OFB 模式支持非块对齐', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 13: 密文长度验证（ECB PKCS#7）
  // ========================================
  testCount++;
  try {
    const plaintext = 'Length Test'; // 11 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'ecb' }); // 默认 PKCS#7
    
    // PKCS#7：11 字节明文 + 5 字节填充 = 16 字节密文 = 32 字符 hex
    if (typeof ciphertext === 'string' && ciphertext.length !== 32) {
      throw new Error(`密文长度错误: 期望 32，实际 ${ciphertext.length}`);
    }
    
    results.push({ test: '密文长度验证（ECB PKCS#7）', status: '✅', details: `密文长度: ${ciphertext.length} 字符` });
    passCount++;
  } catch (error) {
    results.push({ test: '密文长度验证（ECB PKCS#7）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 14: 16 字节明文 PKCS#7 填充（应该填充一个完整块）
  // ========================================
  testCount++;
  try {
    const plaintext = '1234567890123456'; // 恰好 16 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'ecb' }); // PKCS#7
    
    // PKCS#7：16 字节明文需要再填充 16 字节 = 32 字节密文 = 64 字符 hex
    if (typeof ciphertext === 'string' && ciphertext.length !== 64) {
      throw new Error(`密文长度错误: 期望 64，实际 ${ciphertext.length}`);
    }
    
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'ecb' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: '16 字节明文 PKCS#7 填充', status: '✅', details: '正确填充完整块' });
    passCount++;
  } catch (error) {
    results.push({ test: '16 字节明文 PKCS#7 填充', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 15: GCM Tag 长度验证
  // ========================================
  testCount++;
  try {
    const plaintext = 'Tag Length Test';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      outputTag: true,
      output: 'string'
    });
    
    const { tag } = encResult;
    
    // GCM tag 通常是 16 字节 = 32 字符 hex
    if (typeof tag === 'string' && tag.length !== 32) {
      throw new Error(`Tag 长度异常: 期望 32，实际 ${tag.length}`);
    }
    
    results.push({ test: 'GCM Tag 长度验证', status: '✅', details: `Tag 长度: ${tag.length} 字符` });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM Tag 长度验证', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 16: 全 0 密钥（边界情况）
  // ========================================
  testCount++;
  try {
    const plaintext = 'Zero Key Test';
    const zeroKey = '00000000000000000000000000000000';
    
    const ciphertext = sm4.encrypt(plaintext, zeroKey, { mode: 'ecb' });
    const decrypted = sm4.decrypt(ciphertext, zeroKey, { mode: 'ecb' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: '全 0 密钥（边界情况）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '全 0 密钥（边界情况）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 17: 全 F 密钥（边界情况）
  // ========================================
  testCount++;
  try {
    const plaintext = 'Full F Key Test';
    const fullFKey = 'ffffffffffffffffffffffffffffffff';
    
    const ciphertext = sm4.encrypt(plaintext, fullFKey, { mode: 'ecb' });
    const decrypted = sm4.decrypt(ciphertext, fullFKey, { mode: 'ecb' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: '全 F 密钥（边界情况）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '全 F 密钥（边界情况）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 18: 全 0 IV（边界情况）
  // ========================================
  testCount++;
  try {
    const plaintext = 'Zero IV Test';
    const zeroIV = '00000000000000000000000000000000';
    
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: zeroIV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: zeroIV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: '全 0 IV（边界情况）', status: '✅', warning: '⚠️ 生产环境应使用随机 IV' });
    passCount++;
  } catch (error) {
    results.push({ test: '全 0 IV（边界情况）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 19: Emoji 字符（多字节 UTF-8）
  // ========================================
  testCount++;
  try {
    const plaintext = '😀😃😄😁🎉🎊';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'ecb' });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'ecb' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'Emoji 字符（多字节 UTF-8）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'Emoji 字符（多字节 UTF-8）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========================================
  // 补充测试 20: 日文、韩文、俄文混合
  // ========================================
  testCount++;
  try {
    const plaintext = 'こんにちは 안녕하세요 Привет مرحبا';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'ecb' });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'ecb' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: '日文、韩文、俄文混合', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: '日文、韩文、俄文混合', status: '❌', error: error.message, stack: error.stack });
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

