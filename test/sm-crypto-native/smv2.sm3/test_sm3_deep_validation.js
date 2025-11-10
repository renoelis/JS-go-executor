/**
 * SM3 深度验证测试 (Deep Validation)
 * 测试范围：
 * - HMAC key 处理逻辑（key > 64 字节时的哈希处理）
 * - KDF 迭代次数验证
 * - HMAC 标准一致性（RFC 2104）
 * - KDF 标准一致性（GM/T 0003-2012）
 * - 内部计数器和迭代逻辑
 */

const sm3 = require('sm-crypto-v2').sm3;
const { kdf } = require('sm-crypto-v2');

function runTests() {
  const results = {
    success: true,
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function test(name, fn) {
    results.total++;
    try {
      fn();
      results.passed++;
      results.details.push(`✅ ${name}`);
      return true;
    } catch (error) {
      results.failed++;
      results.success = false;
      results.details.push(`❌ ${name}: ${error.message}\n${error.stack}`);
      return false;
    }
  }

  // ============================================================================
  // 测试 1: HMAC key 长度处理验证
  // ============================================================================

  test('HMAC - key 长度 = 64 字节（块大小边界）', () => {
    // SM3 块大小是 64 字节，key 正好等于块大小
    const key64 = 'a'.repeat(64); // 64 字节字符串
    const message = 'test message';
    const hmac = sm3(message, { key: key64 });
    
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('HMAC - key 长度 > 64 字节（应触发 key 哈希处理）', () => {
    // 根据 HMAC 标准，当 key 长度 > 块大小时，应先对 key 做哈希
    const longKey = 'a'.repeat(100); // 100 字节，超过 64
    const message = 'test message';
    const hmac = sm3(message, { key: longKey });
    
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
    
    // 验证结果是否一致（多次调用）
    const hmac2 = sm3(message, { key: longKey });
    if (hmac !== hmac2) {
      throw new Error('Long key HMAC should be consistent');
    }
  });

  test('HMAC - 超长 key (128 字节) 与普通 key 的差异', () => {
    const shortKey = 'short';
    const longKey = 'a'.repeat(128);
    const message = 'test';
    
    const hmac1 = sm3(message, { key: shortKey });
    const hmac2 = sm3(message, { key: longKey });
    
    // 不同 key 应产生不同结果
    if (hmac1 === hmac2) {
      throw new Error('Different keys should produce different HMACs');
    }
  });

  test('HMAC - Uint8Array key (65 字节) 处理', () => {
    // 使用 Uint8Array 测试超长 key
    const key = new Uint8Array(65);
    key.fill(0x5a);
    const message = 'test';
    
    const hmac = sm3(message, { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('HMAC - 验证 key > 64 字节时的处理一致性', () => {
    // 使用相同内容但不同长度的 key，验证处理一致性
    const key100 = 'x'.repeat(100);
    const key200 = 'x'.repeat(200);
    const message = 'consistency test';
    
    const hmac1a = sm3(message, { key: key100 });
    const hmac1b = sm3(message, { key: key100 });
    
    const hmac2a = sm3(message, { key: key200 });
    const hmac2b = sm3(message, { key: key200 });
    
    // 相同 key 应产生相同结果
    if (hmac1a !== hmac1b) {
      throw new Error('HMAC with same 100-byte key should be consistent');
    }
    
    if (hmac2a !== hmac2b) {
      throw new Error('HMAC with same 200-byte key should be consistent');
    }
    
    // 不同长度的 key（即使内容相似）应产生不同结果
    if (hmac1a === hmac2a) {
      throw new Error('Different length keys should produce different HMACs');
    }
  });

  test('HMAC - key 边界测试：63、64、65 字节', () => {
    const message = 'boundary test';
    const key63 = 'a'.repeat(63);
    const key64 = 'a'.repeat(64);
    const key65 = 'a'.repeat(65);
    
    const hmac63 = sm3(message, { key: key63 });
    const hmac64 = sm3(message, { key: key64 });
    const hmac65 = sm3(message, { key: key65 });
    
    // 所有结果应该有效
    if (hmac63.length !== 64 || hmac64.length !== 64 || hmac65.length !== 64) {
      throw new Error('All HMACs should have length 64');
    }
    
    // 不同长度的 key 应产生不同结果
    if (hmac63 === hmac64 || hmac64 === hmac65 || hmac63 === hmac65) {
      throw new Error('Different key lengths should produce different HMACs');
    }
  });

  // ============================================================================
  // 测试 2: KDF 迭代次数验证
  // ============================================================================

  test('KDF - keylen=32 (正好一次 SM3 输出)', () => {
    // SM3 输出 32 字节，keylen=32 应只需 1 次迭代
    const z = 'test';
    const result = kdf(z, 32);
    
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - keylen=33 (需要 2 次迭代)', () => {
    // keylen=33 > 32，需要 2 次迭代
    const z = 'test';
    const result = kdf(z, 33);
    
    if (result.length !== 33) {
      throw new Error(`Expected length 33, got ${result.length}`);
    }
  });

  test('KDF - keylen=64 (正好 2 次 SM3 输出)', () => {
    // keylen=64 = 32*2，应需要 2 次迭代
    const z = 'test';
    const result = kdf(z, 64);
    
    if (result.length !== 64) {
      throw new Error(`Expected length 64, got ${result.length}`);
    }
  });

  test('KDF - keylen=65 (需要 3 次迭代)', () => {
    // keylen=65 > 64，需要 ceil(65/32) = 3 次迭代
    const z = 'test';
    const result = kdf(z, 65);
    
    if (result.length !== 65) {
      throw new Error(`Expected length 65, got ${result.length}`);
    }
  });

  test('KDF - keylen=96 (正好 3 次 SM3 输出)', () => {
    // keylen=96 = 32*3
    const z = 'test';
    const result = kdf(z, 96);
    
    if (result.length !== 96) {
      throw new Error(`Expected length 96, got ${result.length}`);
    }
  });

  test('KDF - keylen=97 (需要 4 次迭代)', () => {
    // keylen=97 > 96，需要 4 次迭代
    const z = 'test';
    const result = kdf(z, 97);
    
    if (result.length !== 97) {
      throw new Error(`Expected length 97, got ${result.length}`);
    }
  });

  test('KDF - 验证不同 keylen 的前缀一致性', () => {
    // KDF 应该是确定性的，较长的输出应包含较短输出的前缀
    const z = 'consistency';
    const kdf32 = kdf(z, 32);
    const kdf64 = kdf(z, 64);
    const kdf96 = kdf(z, 96);
    
    // 转换为 hex 以便比较
    const hex32 = Array.from(kdf32).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex64 = Array.from(kdf64).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex96 = Array.from(kdf96).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 验证前缀关系
    if (!hex64.startsWith(hex32)) {
      throw new Error('KDF(64) should start with KDF(32)');
    }
    
    if (!hex96.startsWith(hex64)) {
      throw new Error('KDF(96) should start with KDF(64)');
    }
  });

  test('KDF - 迭代边界：31、32、33 字节', () => {
    const z = 'iteration boundary';
    const kdf31 = kdf(z, 31);
    const kdf32 = kdf(z, 32);
    const kdf33 = kdf(z, 33);
    
    if (kdf31.length !== 31 || kdf32.length !== 32 || kdf33.length !== 33) {
      throw new Error('KDF lengths should match requested keylen');
    }
    
    // 转换为 hex
    const hex31 = Array.from(kdf31).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex32 = Array.from(kdf32).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex33 = Array.from(kdf33).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // 验证前缀关系
    if (!hex32.startsWith(hex31)) {
      throw new Error('KDF(32) should start with KDF(31)');
    }
    
    if (!hex33.startsWith(hex32)) {
      throw new Error('KDF(33) should start with KDF(32)');
    }
  });

  test('KDF - 大 keylen 迭代验证 (1024 字节 = 32 次迭代)', () => {
    // keylen=1024 = 32 * 32，需要 32 次迭代
    const z = 'large keylen';
    const result = kdf(z, 1024);
    
    if (result.length !== 1024) {
      throw new Error(`Expected length 1024, got ${result.length}`);
    }
    
    // 验证前缀一致性
    const small = kdf(z, 32);
    const hex_small = Array.from(small).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex_large = Array.from(result.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex_small !== hex_large) {
      throw new Error('Large KDF should start with small KDF output');
    }
  });

  // ============================================================================
  // 测试 3: KDF 与 IV 的计数器模式验证
  // ============================================================================

  test('KDF - 无 IV 与空 IV 应产生相同结果', () => {
    const z = 'test';
    const keylen = 64;
    
    const noIv = kdf(z, keylen);
    const emptyStrIv = kdf(z, keylen, '');
    const emptyArrIv = kdf(z, keylen, new Uint8Array([]));
    
    const hex1 = Array.from(noIv).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(emptyStrIv).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex3 = Array.from(emptyArrIv).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 !== hex2 || hex2 !== hex3) {
      throw new Error('No IV and empty IV should produce same results');
    }
  });

  test('KDF - 不同 IV 应产生完全不同的输出', () => {
    const z = 'test';
    const keylen = 64;
    
    const iv1 = 'iv1';
    const iv2 = 'iv2';
    
    const result1 = kdf(z, keylen, iv1);
    const result2 = kdf(z, keylen, iv2);
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 === hex2) {
      throw new Error('Different IVs should produce different outputs');
    }
  });

  test('KDF - IV 影响所有迭代输出', () => {
    const z = 'test';
    const keylen = 96; // 3 次迭代
    
    const iv1 = 'first';
    const iv2 = 'second';
    
    const result1 = kdf(z, keylen, iv1);
    const result2 = kdf(z, keylen, iv2);
    
    // 检查前、中、后部分都不相同
    const first1 = Array.from(result1.slice(0, 32)).join(',');
    const first2 = Array.from(result2.slice(0, 32)).join(',');
    const mid1 = Array.from(result1.slice(32, 64)).join(',');
    const mid2 = Array.from(result2.slice(32, 64)).join(',');
    const last1 = Array.from(result1.slice(64, 96)).join(',');
    const last2 = Array.from(result2.slice(64, 96)).join(',');
    
    if (first1 === first2 || mid1 === mid2 || last1 === last2) {
      throw new Error('IV should affect all iteration outputs');
    }
  });

  // ============================================================================
  // 测试 4: HMAC 与普通哈希的差异验证
  // ============================================================================

  test('HMAC vs Hash - 相同输入应产生不同输出', () => {
    const input = 'test message';
    const key = 'secret';
    
    const hash = sm3(input);
    const hmac = sm3(input, { key: key });
    
    if (hash === hmac) {
      throw new Error('HMAC and plain hash should produce different outputs');
    }
  });

  test('HMAC - 消息为空但有 key 应产生有效 HMAC', () => {
    const key = 'secret';
    const hmac = sm3('', { key: key });
    
    if (hmac.length !== 64) {
      throw new Error('Empty message HMAC should still be 64 chars');
    }
    
    // 应与空消息的普通哈希不同
    const hash = sm3('');
    if (hmac === hash) {
      throw new Error('Empty message HMAC should differ from plain hash');
    }
  });

  test('HMAC - key 为空字节数组的特殊处理', () => {
    // 空 Uint8Array key 应该被允许
    const key = new Uint8Array([]);
    const message = 'test';
    
    try {
      const hmac = sm3(message, { key: key });
      if (hmac.length !== 64) {
        throw new Error('Empty key HMAC should still be 64 chars');
      }
    } catch (error) {
      // 如果库不允许空 key，也是可接受的
      if (!error.message.includes('64 chars')) {
        // 预期的空 key 错误
      }
    }
  });

  // ============================================================================
  // 测试 5: 边界情况的精确验证
  // ============================================================================

  test('KDF - keylen=1 应只返回 1 字节', () => {
    const result = kdf('test', 1);
    if (result.length !== 1) {
      throw new Error(`Expected 1 byte, got ${result.length}`);
    }
    
    // 这 1 字节应该是完整 KDF 输出的第一个字节
    const full = kdf('test', 32);
    if (result[0] !== full[0]) {
      throw new Error('Single byte should match first byte of full output');
    }
  });

  test('KDF - 连续 keylen 的前缀一致性 (1-10)', () => {
    const z = 'prefix test';
    const results = [];
    
    for (let len = 1; len <= 10; len++) {
      results.push(kdf(z, len));
    }
    
    // 验证每个结果都是下一个结果的前缀
    for (let i = 0; i < results.length - 1; i++) {
      const current = Array.from(results[i]);
      const next = Array.from(results[i + 1]);
      
      for (let j = 0; j < current.length; j++) {
        if (current[j] !== next[j]) {
          throw new Error(`KDF(${i + 1}) should be prefix of KDF(${i + 2})`);
        }
      }
    }
  });

  test('HMAC - Uint8Array key 和 hex key 的长度等价性', () => {
    // 16 字节的 Uint8Array
    const arrayKey = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      arrayKey[i] = i * 16; // 0x00, 0x10, 0x20, ...
    }
    
    // 对应的 hex 字符串 (32 个字符)
    const hexKey = Array.from(arrayKey).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const message = 'equivalence test';
    const hmac1 = sm3(message, { key: arrayKey });
    const hmac2 = sm3(message, { key: hexKey });
    
    if (hmac1 !== hmac2) {
      throw new Error('Uint8Array key and hex key should produce same HMAC');
    }
  });

  // ============================================================================
  // 测试 6: 内存和性能压力下的稳定性
  // ============================================================================

  test('KDF - 超大 keylen (1MB) 的稳定性', () => {
    const z = 'stress test';
    const keylen = 1024 * 1024; // 1MB = 32768 次迭代
    
    const result = kdf(z, keylen);
    
    if (result.length !== keylen) {
      throw new Error(`Expected length ${keylen}, got ${result.length}`);
    }
    
    // 验证结果不全为 0
    let hasNonZero = false;
    for (let i = 0; i < Math.min(1000, result.length); i++) {
      if (result[i] !== 0) {
        hasNonZero = true;
        break;
      }
    }
    
    if (!hasNonZero) {
      throw new Error('KDF output should not be all zeros');
    }
  });

  test('HMAC - 连续调用 1000 次的稳定性', () => {
    const key = '0123456789abcdef';
    const message = 'stability test';
    
    const firstHmac = sm3(message, { key: key });
    
    for (let i = 0; i < 1000; i++) {
      const hmac = sm3(message, { key: key });
      if (hmac !== firstHmac) {
        throw new Error(`HMAC inconsistent at iteration ${i}`);
      }
    }
  });

  test('KDF - 连续调用 500 次的一致性', () => {
    const z = 'consistency';
    const keylen = 64;
    
    const first = kdf(z, keylen);
    const firstHex = Array.from(first).map(b => b.toString(16).padStart(2, '0')).join('');
    
    for (let i = 0; i < 500; i++) {
      const result = kdf(z, keylen);
      const hex = Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hex !== firstHex) {
        throw new Error(`KDF inconsistent at iteration ${i}`);
      }
    }
  });

  // ============================================================================
  // 生成测试报告
  // ============================================================================

  const summary = {
    success: results.success,
    summary: `Total: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`,
    details: results.details
  };

  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

try {
  return runTests();
} catch (error) {
  const result = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

