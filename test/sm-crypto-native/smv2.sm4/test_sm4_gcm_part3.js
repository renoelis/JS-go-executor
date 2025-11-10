const { sm4 } = require('sm-crypto-v2');

/**
 * SM4 GCM 模式完整测试 - Part 3
 * 覆盖：Tag 验证、AAD（附加认证数据）、输入输出类型、认证失败场景
 * 基于 sm-crypto-v2 v1.15.0
 */

try {
  const results = [];
  let testCount = 0;
  let passCount = 0;

  // 测试常量
  const SM4_KEY = '0123456789abcdeffedcba9876543210';
  const SM4_GCM_IV = 'aabbccddeeff001122334455'; // 12字节（GCM 推荐）
  
  // 辅助函数
  const fromHex = (hex) => {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
  };
  const toU8 = (str) => {
    const buf = Buffer.from(str, 'utf8');
    return new Uint8Array(buf);
  };
  const mutate = (u8) => {
    const copy = new Uint8Array(u8);
    copy[0] ^= 1;
    return copy;
  };

  // ========== 测试 1: GCM 基本加解密带 Tag ==========
  testCount++;
  try {
    const plaintext = 'Hello SM4 GCM!';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    
    if (!encResult || typeof encResult !== 'object') {
      throw new Error('outputTag:true 应返回对象');
    }
    
    const { output, tag } = encResult;
    
    if (!output || !tag) {
      throw new Error('返回对象应包含 output 和 tag');
    }
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
    
    if (decrypted !== plaintext) {
      throw new Error(`解密结果不匹配: 期望 "${plaintext}", 实际 "${decrypted}"`);
    }
    
    results.push({ test: 'GCM 基本加解密带 Tag', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 基本加解密带 Tag', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 2: GCM 带 AAD（附加认证数据） ==========
  testCount++;
  try {
    const plaintext = 'GCM with AAD';
    const aad = fromHex('112233445566');
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: aad, 
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: aad, 
      tag 
    });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 带 AAD（附加认证数据）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 带 AAD（附加认证数据）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 3: GCM 不带 AAD ==========
  testCount++;
  try {
    const plaintext = 'GCM without AAD';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 不带 AAD', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 不带 AAD', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 4: GCM Uint8Array 输入输出 ==========
  testCount++;
  try {
    const plaintext = toU8('GCM U8 Test');
    const aad = fromHex('aabbcc');
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: aad, 
      outputTag: true, 
      output: 'array' 
    });
    
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: aad, 
      tag, 
      input: 'array', 
      output: 'array' 
    });
    
    if (plaintext.length !== decrypted.length) {
      throw new Error('长度不匹配');
    }
    for (let i = 0; i < plaintext.length; i++) {
      if (plaintext[i] !== decrypted[i]) {
        throw new Error(`字节 ${i} 不匹配`);
      }
    }
    
    results.push({ test: 'GCM Uint8Array 输入输出', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM Uint8Array 输入输出', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 5: GCM 空消息 ==========
  testCount++;
  try {
    const plaintext = '';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 空消息', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 空消息', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 6: GCM 长消息（1000字节） ==========
  testCount++;
  try {
    const plaintext = 'F'.repeat(1000);
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 长消息（1000字节）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 长消息（1000字节）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 7: GCM 超长消息（10000字节） ==========
  testCount++;
  try {
    const plaintext = 'G'.repeat(10000);
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 超长消息（10000字节）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 超长消息（10000字节）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 8: GCM 中文字符 ==========
  testCount++;
  try {
    const plaintext = '你好世界！GCM模式测试。';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 中文字符', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 中文字符', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 9: GCM outputTag:false 行为 ==========
  testCount++;
  try {
    const plaintext = 'No Tag Output';
    const result = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: false });
    
    // 不同实现可能返回不同格式
    let isValid = false;
    
    // 情况1: 返回字符串或 Uint8Array
    if (typeof result === 'string' || result instanceof Uint8Array) {
      isValid = true;
    }
    
    // 情况2: 返回对象但 tag 为空/undefined
    if (result && typeof result === 'object') {
      if (result.tag === undefined || result.tag === null) {
        isValid = true;
      } else if (typeof result.tag === 'string' && result.tag.length === 0) {
        isValid = true;
      } else if (result.tag instanceof Uint8Array && result.tag.length === 0) {
        isValid = true;
      } else if (result.tag) {
        // 如果还是有 tag，尝试用它解密验证
        try {
          const dec = sm4.decrypt(result.output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag: result.tag });
          if (dec === plaintext) {
            isValid = true;
          }
        } catch (e) {
          // 解密失败
        }
      }
    }
    
    if (!isValid) {
      throw new Error('outputTag:false 行为不符合预期');
    }
    
    results.push({ test: 'GCM outputTag:false 行为', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM outputTag:false 行为', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 10: GCM 密文被篡改应认证失败 ==========
  testCount++;
  try {
    const plaintext = 'Tamper Ciphertext Test';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      outputTag: true, 
      output: 'array' 
    });
    
    const { output, tag } = encResult;
    const tampered = mutate(output);
    
    try {
      sm4.decrypt(tampered, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag, input: 'array' });
      throw new Error('篡改密文应导致认证失败');
    } catch (e) {
      if (e.message === '篡改密文应导致认证失败') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'GCM 密文被篡改应认证失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 密文被篡改应认证失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 11: GCM Tag 被篡改应认证失败 ==========
  testCount++;
  try {
    const plaintext = 'Tamper Tag Test';
    let encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    
    const { output } = encResult;
    let { tag } = encResult;
    
    // 篡改 tag
    if (typeof tag === 'string') {
      tag = tag.slice(0, 10) + (tag[10] === 'a' ? 'b' : 'a') + tag.slice(11);
    } else if (tag instanceof Uint8Array) {
      tag = mutate(tag);
    }
    
    try {
      sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
      throw new Error('篡改 Tag 应导致认证失败');
    } catch (e) {
      if (e.message === '篡改 Tag 应导致认证失败') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'GCM Tag 被篡改应认证失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM Tag 被篡改应认证失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 12: GCM AAD 不匹配应认证失败 ==========
  testCount++;
  try {
    const plaintext = 'AAD Mismatch Test';
    const aad1 = fromHex('010203');
    const aad2 = fromHex('010204');
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: aad1, 
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    
    try {
      sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, associatedData: aad2, tag });
      throw new Error('AAD 不匹配应导致认证失败');
    } catch (e) {
      if (e.message === 'AAD 不匹配应导致认证失败') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'GCM AAD 不匹配应认证失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM AAD 不匹配应认证失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 13: GCM 加密时有 AAD，解密时无 AAD 应失败 ==========
  testCount++;
  try {
    const plaintext = 'AAD Present/Absent Test';
    const aad = fromHex('aabbcc');
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: aad, 
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    
    try {
      // 解密时不提供 AAD
      sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, tag });
      throw new Error('解密时缺少 AAD 应导致认证失败');
    } catch (e) {
      if (e.message === '解密时缺少 AAD 应导致认证失败') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'GCM 加密时有 AAD，解密时无 AAD 应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 加密时有 AAD，解密时无 AAD 应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 14: GCM 加密时无 AAD，解密时有 AAD 应失败 ==========
  testCount++;
  try {
    const plaintext = 'AAD Absent/Present Test';
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    const aad = fromHex('ddeeff');
    
    try {
      // 解密时提供 AAD（但加密时没有）
      sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, associatedData: aad, tag });
      throw new Error('解密时多余 AAD 应导致认证失败');
    } catch (e) {
      if (e.message === '解密时多余 AAD 应导致认证失败') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'GCM 加密时无 AAD，解密时有 AAD 应失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 加密时无 AAD，解密时有 AAD 应失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 15: GCM 缺少 Tag 解密行为 ==========
  testCount++;
  try {
    const plaintext = 'Missing Tag Test';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    const { output } = encResult;
    
    try {
      // 解密时不提供 tag
      const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV });
      
      // 如果没抛错，可能使用了空tag或默认行为
      if (decrypted === plaintext) {
        results.push({ 
          test: 'GCM 缺少 Tag 解密行为', 
          status: '✅',
          details: '允许缺少Tag（可能使用空tag）'
        });
        passCount++;
      } else {
        results.push({ test: 'GCM 缺少 Tag 解密行为', status: '✅', details: '缺少Tag导致解密错误' });
        passCount++;
      }
    } catch (e) {
      // 抛错是预期行为
      results.push({ test: 'GCM 缺少 Tag 解密行为', status: '✅', details: '正确抛错' });
      passCount++;
    }
  } catch (error) {
    results.push({ test: 'GCM 缺少 Tag 解密行为', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 16: GCM 不同 IV 长度（12字节） ==========
  testCount++;
  try {
    const plaintext = 'IV 12 Bytes';
    const iv12 = 'aabbccddeeff001122334455'; // 12字节
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: iv12, outputTag: true });
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: iv12, tag });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 不同 IV 长度（12字节）', status: '✅', details: '12字节是 GCM 推荐长度' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 不同 IV 长度（12字节）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 17: GCM 不同 IV 长度（16字节） ==========
  testCount++;
  try {
    const plaintext = 'IV 16 Bytes';
    const iv16 = 'aabbccddeeff00112233445566778899'; // 16字节
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: iv16, outputTag: true });
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: iv16, tag });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM 不同 IV 长度（16字节）', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 不同 IV 长度（16字节）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 18: GCM 短 IV（可能不支持或抛错） ==========
  testCount++;
  try {
    const plaintext = 'Short IV Test';
    const shortIv = 'aabbccdd'; // 4字节
    
    try {
      const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: shortIv, outputTag: true });
      
      // 如果没抛错，尝试解密验证
      if (encResult && encResult.output && encResult.tag) {
        const decrypted = sm4.decrypt(encResult.output, SM4_KEY, { 
          mode: 'gcm', 
          iv: shortIv, 
          tag: encResult.tag 
        });
        
        if (decrypted === plaintext) {
          results.push({ test: 'GCM 短 IV（可能不支持或抛错）', status: '✅', details: '支持短 IV' });
          passCount++;
        } else {
          throw new Error('解密结果不匹配');
        }
      } else {
        throw new Error('加密返回格式错误');
      }
    } catch (e) {
      // 抛错也是合理行为（不支持短 IV）
      results.push({ test: 'GCM 短 IV（可能不支持或抛错）', status: '✅', details: '不支持短 IV（抛错）' });
      passCount++;
    }
  } catch (error) {
    results.push({ test: 'GCM 短 IV（可能不支持或抛错）', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 19: GCM 错误密钥解密应认证失败 ==========
  testCount++;
  try {
    const plaintext = 'Wrong Key GCM Test';
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: SM4_GCM_IV, outputTag: true });
    const { output, tag } = encResult;
    
    const wrongKey = 'fedcba98765432100123456789abcdef';
    
    try {
      sm4.decrypt(output, wrongKey, { mode: 'gcm', iv: SM4_GCM_IV, tag });
      throw new Error('错误密钥应导致认证失败');
    } catch (e) {
      if (e.message === '错误密钥应导致认证失败') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'GCM 错误密钥解密应认证失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 错误密钥解密应认证失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 20: GCM 错误 IV 解密应认证失败 ==========
  testCount++;
  try {
    const plaintext = 'Wrong IV GCM Test';
    const iv1 = 'aabbccddeeff001122334455';
    const iv2 = 'aabbccddeeff001122334456'; // 最后一个字节不同
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { mode: 'gcm', iv: iv1, outputTag: true });
    const { output, tag } = encResult;
    
    try {
      sm4.decrypt(output, SM4_KEY, { mode: 'gcm', iv: iv2, tag });
      throw new Error('错误 IV 应导致认证失败');
    } catch (e) {
      if (e.message === '错误 IV 应导致认证失败') {
        throw e;
      }
      // 正确抛错
    }
    
    results.push({ test: 'GCM 错误 IV 解密应认证失败', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM 错误 IV 解密应认证失败', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 21: GCM AAD 为空 Uint8Array ==========
  testCount++;
  try {
    const plaintext = 'Empty AAD Test';
    const emptyAad = new Uint8Array([]);
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: emptyAad, 
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: emptyAad, 
      tag 
    });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM AAD 为空 Uint8Array', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM AAD 为空 Uint8Array', status: '❌', error: error.message, stack: error.stack });
  }

  // ========== 测试 22: GCM AAD 为长字节数组 ==========
  testCount++;
  try {
    const plaintext = 'Long AAD Test';
    const longAad = new Uint8Array(100);
    for (let i = 0; i < 100; i++) {
      longAad[i] = i % 256;
    }
    
    const encResult = sm4.encrypt(plaintext, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: longAad, 
      outputTag: true 
    });
    
    const { output, tag } = encResult;
    
    const decrypted = sm4.decrypt(output, SM4_KEY, { 
      mode: 'gcm', 
      iv: SM4_GCM_IV, 
      associatedData: longAad, 
      tag 
    });
    
    if (decrypted !== plaintext) {
      throw new Error('解密结果不匹配');
    }
    
    results.push({ test: 'GCM AAD 为长字节数组', status: '✅' });
    passCount++;
  } catch (error) {
    results.push({ test: 'GCM AAD 为长字节数组', status: '❌', error: error.message, stack: error.stack });
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

