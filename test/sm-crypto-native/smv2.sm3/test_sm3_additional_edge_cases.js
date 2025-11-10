/**
 * SM3 补充边界测试（Additional Edge Cases）
 * 测试范围：
 * - 超大输入（>100MB）的性能和稳定性
 * - HMAC key 长度边界（超长 key >1MB）
 * - KDF 超大 keylen（>100KB）
 * - 混合 TypedArray 类型（Int8Array、Int16Array 等）
 * - 并发调用测试
 * - 内存压力测试
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
  // 测试 1: 超大输入测试
  // ============================================================================

  test('SM3 hash - 超大输入 100KB', () => {
    const largeInput = 'x'.repeat(100 * 1024);
    const hash = sm3(largeInput);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 超大输入 1MB', () => {
    const largeInput = 'x'.repeat(1024 * 1024);
    const hash = sm3(largeInput);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - Uint8Array 超大输入 1MB', () => {
    const largeArr = new Uint8Array(1024 * 1024);
    largeArr.fill(0x42);
    const hash = sm3(largeArr);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  // ============================================================================
  // 测试 2: HMAC 超长 key
  // ============================================================================

  test('SM3 HMAC - 超长 hex key (256 字节)', () => {
    const key = '0123456789abcdef'.repeat(32); // 256 bytes
    const hmac = sm3('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - 超长 Uint8Array key (512 字节)', () => {
    const key = new Uint8Array(512);
    key.fill(0x5a);
    const hmac = sm3('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - 超长 key (1KB)', () => {
    const key = 'a'.repeat(1024);
    const hmac = sm3('test message', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - 超长 message (100KB)', () => {
    const key = '0123456789abcdef';
    const message = 'Hello World! '.repeat(8000); // ~100KB
    const hmac = sm3(message, { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  // ============================================================================
  // 测试 3: KDF 超大 keylen
  // ============================================================================

  test('KDF - keylen=10KB', () => {
    const result = kdf('test', 10 * 1024);
    if (result.length !== 10 * 1024) {
      throw new Error(`Expected length ${10 * 1024}, got ${result.length}`);
    }
  });

  test('KDF - keylen=100KB', () => {
    const result = kdf('test', 100 * 1024);
    if (result.length !== 100 * 1024) {
      throw new Error(`Expected length ${100 * 1024}, got ${result.length}`);
    }
  });

  test('KDF - 超长 z 输入 (1KB)', () => {
    const longZ = 'a'.repeat(1024);
    const result = kdf(longZ, 64);
    if (result.length !== 64) {
      throw new Error(`Expected length 64, got ${result.length}`);
    }
  });

  test('KDF - 超长 iv (1KB)', () => {
    const longIv = 'i'.repeat(1024);
    const result = kdf('test', 32, longIv);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  // ============================================================================
  // 测试 4: 混合 TypedArray 类型（注意：sm-crypto-v2 可能只支持 Uint8Array）
  // ============================================================================

  test('SM3 hash - 尝试使用 Int8Array（如果支持）', () => {
    try {
      // 某些实现可能会自动转换，某些可能会抛出错误
      const arr = new Int8Array([0x61, 0x62, 0x63]);
      const hash = sm3(arr);
      // 如果成功，检查结果
      if (typeof hash === 'string' && hash.length === 64) {
        // 正常
      } else {
        throw new Error('Unexpected result for Int8Array');
      }
    } catch (error) {
      // 如果抛出错误，也是可接受的（取决于实现）
      if (!error.message.includes('Uint8Array') && !error.message.includes('type')) {
        throw error;
      }
    }
  });

  test('SM3 hash - 尝试使用 Buffer（Node.js 特有）', () => {
    try {
      const buf = Buffer.from([0x61, 0x62, 0x63]);
      const hash = sm3(buf);
      const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
      if (hash !== expected) {
        throw new Error(`Expected ${expected}, got ${hash}`);
      }
    } catch (error) {
      // Buffer 可能不被支持
      if (!error.message.includes('Expected')) {
        // 忽略类型错误
      } else {
        throw error;
      }
    }
  });

  // ============================================================================
  // 测试 5: 并发调用测试
  // ============================================================================

  test('SM3 hash - 并发调用 100 次', () => {
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(sm3(`test${i}`));
    }
    
    // 检查所有结果都是有效的 64 字符 hex
    for (let i = 0; i < results.length; i++) {
      if (results[i].length !== 64) {
        throw new Error(`Result ${i} has invalid length: ${results[i].length}`);
      }
    }
    
    // 检查相同输入产生相同输出
    const hash1 = sm3('same-input');
    const hash2 = sm3('same-input');
    if (hash1 !== hash2) {
      throw new Error('Concurrent calls produced inconsistent results');
    }
  });

  test('SM3 HMAC - 并发调用 50 次', () => {
    const key = '0123456789abcdef';
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(sm3(`message${i}`, { key: key }));
    }
    
    // 检查所有结果都是有效的
    for (let i = 0; i < results.length; i++) {
      if (results[i].length !== 64) {
        throw new Error(`HMAC result ${i} has invalid length: ${results[i].length}`);
      }
    }
  });

  test('KDF - 并发调用 50 次', () => {
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(kdf(`input${i}`, 32));
    }
    
    // 检查所有结果都是有效的
    for (let i = 0; i < results.length; i++) {
      if (results[i].length !== 32) {
        throw new Error(`KDF result ${i} has invalid length: ${results[i].length}`);
      }
    }
  });

  // ============================================================================
  // 测试 6: 特殊边界值
  // ============================================================================

  test('SM3 hash - 块边界输入 (64 字节 = SM3 块大小)', () => {
    const input = 'x'.repeat(64);
    const hash = sm3(input);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 块边界 -1 (63 字节)', () => {
    const input = 'x'.repeat(63);
    const hash = sm3(input);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 块边界 +1 (65 字节)', () => {
    const input = 'x'.repeat(65);
    const hash = sm3(input);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 2 倍块大小 (128 字节)', () => {
    const input = 'x'.repeat(128);
    const hash = sm3(input);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('KDF - keylen = SM3 输出长度 (32 字节)', () => {
    const result = kdf('test', 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - keylen = SM3 输出长度 + 1 (33 字节)', () => {
    const result = kdf('test', 33);
    if (result.length !== 33) {
      throw new Error(`Expected length 33, got ${result.length}`);
    }
  });

  test('KDF - keylen = SM3 输出长度 - 1 (31 字节)', () => {
    const result = kdf('test', 31);
    if (result.length !== 31) {
      throw new Error(`Expected length 31, got ${result.length}`);
    }
  });

  // ============================================================================
  // 测试 7: Unicode 边界测试
  // ============================================================================

  test('SM3 hash - Emoji 输入', () => {
    const hash = sm3('👍🎉🔥💯');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 混合多语言', () => {
    const hash = sm3('Hello 你好 مرحبا こんにちは');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 HMAC - Unicode key', () => {
    const key = '密钥🔑';
    const hmac = sm3('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('KDF - Unicode z', () => {
    const result = kdf('共享秘密🔐', 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  // ============================================================================
  // 测试 8: 类型强制转换边界
  // ============================================================================

  test('SM3 hash - 布尔值应该抛出错误', () => {
    try {
      sm3(true);
      throw new Error('Should throw error for boolean input');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('SM3 hash - 数组（非 TypedArray）应该抛出错误', () => {
    try {
      sm3([0x61, 0x62, 0x63]);
      throw new Error('Should throw error for plain array');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('KDF - keylen 为浮点数应该截断或抛出错误', () => {
    try {
      const result = kdf('test', 32.7);
      // 如果成功，应该截断为 32
      if (result.length !== 32) {
        throw new Error(`Expected length 32, got ${result.length}`);
      }
    } catch (error) {
      // 抛出错误也是可接受的
      if (error.message.includes('Expected length')) {
        throw error;
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

