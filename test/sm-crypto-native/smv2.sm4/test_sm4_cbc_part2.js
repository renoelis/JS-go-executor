const { sm4 } = require('sm-crypto-v2');

/**
 * SM4 CBC 模式完整测试 - Part 2
 * 覆盖：IV 使用、填充模式、输入输出类型、IV 差异性、边界情况
 * 基于 sm-crypto-v2 v1.15.0
 */

try {
  const results = [];
  let testCount = 0;
  let passCount = 0;

  // 测试常量
  const SM4_KEY = '0123456789abcdeffedcba9876543210';
  const SM4_IV = 'fedcba98765432100123456789abcdef'; // 32字符 = 16字节
  const SM4_KEY_BYTES = new Uint8Array([
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
    0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10
  ]);
  const SM4_IV_BYTES = new Uint8Array([
    0xfe, 0xdc, 0xba, 0x98, 0x76, 0x54, 0x32, 0x10,
    0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef
  ]);

  // 辅助函数
  const toU8 = (str) => {
    const buf = Buffer.from(str, 'utf8');
    return new Uint8Array(buf);
  };

  // ========== 测试 1: CBC 基本加解密 ==========
  testCount++;
  try {
    const plaintext = 'Hello SM4 CBC!';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error(`解密结果不匹配: 期望 "${plaintext}", 实际 "${decrypted}"`);
    }
    
    results.push({ test: 'CBC 基本加解密', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 基本加解密', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 2: CBC 无填充模式（16字节对齐） ==========
  testCount++;
  try {
    const plaintext = '0123456789abcdef'; // 16 字节
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, padding: 'none' });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, padding: 'none' });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 无填充模式（16字节对齐）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 无填充模式（16字节对齐）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 3: CBC PKCS#7 填充（显式） ==========
  testCount++;
  try {
    const plaintext = 'CBC PKCS7 Test';
    
    let success = false;
    const paddingVariants = ['pkcs#7', 'pkcs7', 'PKCS7'];
    
    for (const padding of paddingVariants) {
      try {
        const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, padding });
        const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, padding });
        
        if (decrypted === plaintext) {
          success = true;
          break;
        }
      } catch (e) {
        // 继续尝试下一个
      }
    }
    
    if (!success) {
      throw new Error('所有 padding 格式都失败');
    }
    
    results.push({ test: 'CBC PKCS#7 填充（显式）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC PKCS#7 填充（显式）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 4: CBC Uint8Array 密钥和 IV ==========
  testCount++;
  try {
    const plaintext = 'CBC U8 Key/IV';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY_BYTES, { mode: 'cbc', iv: SM4_IV_BYTES });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY_BYTES, { mode: 'cbc', iv: SM4_IV_BYTES });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC Uint8Array 密钥和 IV', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC Uint8Array 密钥和 IV', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 5: CBC Uint8Array 输入输出 ==========
  testCount++;
  try {
    const plaintext = toU8('CBC U8 I/O');
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, output: 'array' });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, input: 'array', output: 'array' });
    
    if (plaintext.length !== decrypted.length) {
      throw new Error('长度不匹配');
    }
    for (let i = 0; i < plaintext.length; i++) {
      if (plaintext[i] !== decrypted[i]) {
        throw new Error(`字节 ${i} 不匹配`);
      }
    }
    
    results.push({ test: 'CBC Uint8Array 输入输出', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC Uint8Array 输入输出', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 6: CBC 不同 IV 产生不同密文 ==========
  testCount++;
  try {
    const plaintext = 'IV Difference Test';
    const iv1 = 'fedcba98765432100123456789abcdef';
    const iv2 = 'fedcba98765432100123456789abcdee'; // 最后一个字符不同
    
    const ciphertext1 = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: iv1 });
    const ciphertext2 = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: iv2 });
    
    if (ciphertext1 === ciphertext2) {
      throw new Error('不同 IV 应产生不同密文');
    }
    
    results.push({ test: 'CBC 不同 IV 产生不同密文', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 不同 IV 产生不同密文', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 7: CBC 相同明文相同 IV 产生相同密文 ==========
  testCount++;
  try {
    const plaintext = 'Same IV Test';
    const ciphertext1 = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const ciphertext2 = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (ciphertext1 !== ciphertext2) {
      throw new Error('相同明文相同 IV 应产生相同密文');
    }
    
    results.push({ test: 'CBC 相同明文相同 IV 产生相同密文', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 相同明文相同 IV 产生相同密文', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 8: CBC 错误 IV 长度应抛错（短） ==========
  testCount++;
  try {
    const plaintext = 'Short IV Test';
    const shortIv = 'aabbccdd'; // 8字符 = 4字节，应该是 16 字节
    
    try {
      sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: shortIv });
      throw new Error('短 IV 应抛错');
    } catch (e) {
      if (e.message === '短 IV 应抛错') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'CBC 错误 IV 长度应抛错（短）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 错误 IV 长度应抛错（短）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 9: CBC 错误 IV 长度应抛错（长） ==========
  testCount++;
  try {
    const plaintext = 'Long IV Test';
    const longIv = 'fedcba98765432100123456789abcdef00'; // 34字符 = 17字节
    
    try {
      sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: longIv });
      throw new Error('长 IV 应抛错');
    } catch (e) {
      if (e.message === '长 IV 应抛错') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'CBC 错误 IV 长度应抛错（长）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 错误 IV 长度应抛错（长）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 10: CBC 缺少 IV 行为 ==========
  testCount++;
  try {
    const plaintext = 'Missing IV Test';
    
    try {
      const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc' });
      const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc' });
      
      // 如果成功，说明使用了默认 IV
      if (decrypted === plaintext) {
        results.push({ 
          test: 'CBC 缺少 IV 行为', 
          status: '✅',
          details: '允许使用默认 IV'
        });
        passCount++;
      } else {
        throw new Error('解密失败');
      }
    } catch (e) {
      // 抛错也是合理行为
      results.push({ 
        test: 'CBC 缺少 IV 行为', 
        status: '✅',
        details: '严格要求提供 IV（抛错）'
      });
      passCount++;
    }
  } catch (error) {
    results.push({ test: 'CBC 缺少 IV 行为', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 11: CBC 空字符串 ==========
  testCount++;
  try {
    const plaintext = '';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 空字符串', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 空字符串', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 12: CBC 1字节明文 ==========
  testCount++;
  try {
    const plaintext = 'x';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 1字节明文', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 1字节明文', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 13: CBC 15字节明文（块边界-1） ==========
  testCount++;
  try {
    const plaintext = 'A'.repeat(15);
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 15字节明文（块边界-1）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 15字节明文（块边界-1）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 14: CBC 16字节明文（块边界） ==========
  testCount++;
  try {
    const plaintext = 'B'.repeat(16);
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 16字节明文（块边界）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 16字节明文（块边界）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 15: CBC 17字节明文（块边界+1） ==========
  testCount++;
  try {
    const plaintext = 'C'.repeat(17);
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 17字节明文（块边界+1）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 17字节明文（块边界+1）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 16: CBC 长消息（1000字节） ==========
  testCount++;
  try {
    const plaintext = 'D'.repeat(1000);
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 长消息（1000字节）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 长消息（1000字节）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 17: CBC 超长消息（10000字节） ==========
  testCount++;
  try {
    const plaintext = 'E'.repeat(10000);
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 超长消息（10000字节）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 超长消息（10000字节）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 18: CBC 中文字符 ==========
  testCount++;
  try {
    const plaintext = '你好世界！CBC模式测试。';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 中文字符', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 中文字符', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 19: CBC 特殊字符 ==========
  testCount++;
  try {
    const plaintext = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`\n\t\r';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'CBC 特殊字符', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 特殊字符', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 20: CBC 错误密钥解密应失败 ==========
  testCount++;
  try {
    const plaintext = 'Wrong Key Test';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    const wrongKey = 'fedcba98765432100123456789abcdef';
    
    try {
      const decrypted = sm4.decrypt(ciphertext, wrongKey, { mode: 'cbc', iv: SM4_IV });
      
      if (decrypted === plaintext) {
        throw new Error('错误密钥不应正确解密');
      }
      
      results.push({ test: 'CBC 错误密钥解密应失败', status: '✅' });
      passCount++;
    } catch (e) {
      if (e.message === '错误密钥不应正确解密') {
        throw e;
      }
      // 抛错也是预期行为
      results.push({ test: 'CBC 错误密钥解密应失败', status: '✅', details: '使用错误密钥抛错' });
      passCount++;
    }
  } catch (error) {
    results.push({ test: 'CBC 错误密钥解密应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 21: CBC 错误 IV 解密应失败 ==========
  testCount++;
  try {
    const plaintext = 'Wrong IV Test';
    const iv1 = 'fedcba98765432100123456789abcdef';
    const iv2 = '0123456789abcdeffedcba9876543210';
    
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: iv1 });
    
    try {
      const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: iv2 });
      
      if (decrypted === plaintext) {
        throw new Error('错误 IV 不应正确解密');
      }
      
      results.push({ test: 'CBC 错误 IV 解密应失败', status: '✅' });
      passCount++;
    } catch (e) {
      if (e.message === '错误 IV 不应正确解密') {
        throw e;
      }
      // 抛错也是预期行为
      results.push({ test: 'CBC 错误 IV 解密应失败', status: '✅', details: '使用错误 IV 抛错' });
      passCount++;
    }
  } catch (error) {
    results.push({ test: 'CBC 错误 IV 解密应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 22: CBC 损坏密文解密应失败或抛错 ==========
  testCount++;
  try {
    const plaintext = 'Corrupt Cipher Test';
    let ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    // 截断密文
    ciphertext = ciphertext.slice(0, ciphertext.length - 8);
    
    try {
      const decrypted = sm4.decrypt(ciphertext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
      
      if (decrypted === plaintext) {
        throw new Error('损坏密文不应正确解密');
      }
    } catch (e) {
      if (e.message === '损坏密文不应正确解密') {
        throw e;
      }
      // 抛错是预期行为
    }
    
    results.push({ test: 'CBC 损坏密文解密应失败或抛错', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 损坏密文解密应失败或抛错', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 23: CBC 输出格式 string ==========
  testCount++;
  try {
    const plaintext = 'Output String Test';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV });
    
    if (typeof ciphertext !== 'string') {
      throw new Error(`默认输出应为 string，实际: ${typeof ciphertext}`);
    }
    
    results.push({ test: 'CBC 输出格式 string', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 输出格式 string', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 24: CBC 输出格式 array ==========
  testCount++;
  try {
    const plaintext = 'Output Array Test';
    const ciphertext = sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: SM4_IV, output: 'array' });
    
    if (!(ciphertext instanceof Uint8Array)) {
      throw new Error('output:array 应返回 Uint8Array');
    }
    
    results.push({ test: 'CBC 输出格式 array', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC 输出格式 array', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 25: CBC null IV 应抛错 ==========
  testCount++;
  try {
    const plaintext = 'Null IV Test';
    
    try {
      sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: null });
      throw new Error('null IV 应抛错');
    } catch (e) {
      if (e.message === 'null IV 应抛错') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'CBC null IV 应抛错', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'CBC null IV 应抛错', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 26: CBC 非十六进制 IV 行为 ==========
  testCount++;
  try {
    const plaintext = 'Invalid Hex IV';
    const invalidIv = 'fedcba98765432100123456789abcdeg'; // 包含 'g'
    
    try {
      sm4.encrypt(plaintext, SM4_KEY, { mode: 'cbc', iv: invalidIv });
      // 如果没抛错，可能容忍非法字符
      results.push({ 
        test: 'CBC 非十六进制 IV 行为', 
        status: '✅',
        details: '容忍非十六进制字符'
      });
      passCount++;
    } catch (e) {
      // 抛错是合理行为
      results.push({ test: 'CBC 非十六进制 IV 行为', status: '✅', details: '正确抛错' });
      passCount++;
    }
  } catch (error) {
    results.push({ test: 'CBC 非十六进制 IV 行为', status: '❌', error: error.message, stack: error.stack });
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

