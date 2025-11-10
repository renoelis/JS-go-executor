/**
 * SM3 HMAC 测试 (Part 2)
 * 测试范围：
 * - SM3 HMAC 功能
 * - key 类型：hex 字符串、Uint8Array
 * - 输入类型：string、Uint8Array
 * - 输出类型：string (hex)、array (Uint8Array)
 * - 边界情况：空 key、短 key、长 key
 * - 错误处理：缺少 key、无效 key
 */

const sm3 = require('sm-crypto-v2').sm3;

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
  // 测试 1: 基础 HMAC - hex key
  // ============================================================================

  test('SM3 HMAC - hex key, 空消息', () => {
    const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const hmac = sm3('', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - hex key, "abc"', () => {
    const key = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const hmac = sm3('abc', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - 短 hex key (8 字节)', () => {
    const key = '0123456789abcdef';
    const hmac = sm3('test message', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - 长 hex key (128 字节)', () => {
    const key = '0123456789abcdef'.repeat(16); // 128 bytes
    const hmac = sm3('test message', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - hex key, 中文消息', () => {
    const key = '0123456789abcdef0123456789abcdef';
    const hmac = sm3('你好世界', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - hex key, 长消息', () => {
    const key = '0123456789abcdef0123456789abcdef';
    const message = 'Hello World! '.repeat(100); // ~1.3KB
    const hmac = sm3(message, { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  // ============================================================================
  // 测试 2: HMAC - Uint8Array key
  // ============================================================================

  test('SM3 HMAC - Uint8Array key, 空消息', () => {
    const key = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
    const hmac = sm3('', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - Uint8Array key, "abc"', () => {
    const key = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
    const hmac = sm3('abc', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - Uint8Array key, Uint8Array 消息', () => {
    const key = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
    const message = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
    const hmac = sm3(message, { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - Uint8Array key (1 字节)', () => {
    const key = new Uint8Array([0x42]);
    const hmac = sm3('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - Uint8Array key (64 字节)', () => {
    const key = new Uint8Array(64);
    key.fill(0x5a);
    const hmac = sm3('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  // ============================================================================
  // 测试 3: HMAC 输出格式（仅字符串）
  // ============================================================================

  test('SM3 HMAC - 输出始终是字符串', () => {
    const key = '0123456789abcdef';
    const hmac = sm3('test', { key: key });
    if (typeof hmac !== 'string') {
      throw new Error(`Expected string, got ${typeof hmac}`);
    }
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64 hex chars, got ${hmac.length}`);
    }
  });

  // ============================================================================
  // 测试 4: HMAC mode 参数
  // ============================================================================

  test('SM3 HMAC - 显式指定 mode="hmac"', () => {
    const key = '0123456789abcdef';
    const hmac = sm3('test', { mode: 'hmac', key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3 HMAC - mode 和 key 同时存在', () => {
    const key = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
    const hmac = sm3('test', { mode: 'hmac', key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  // ============================================================================
  // 测试 5: 错误处理
  // ============================================================================

  test('SM3 HMAC - key 为空字符串应该抛出错误', () => {
    try {
      sm3('test', { key: '' });
      throw new Error('Should throw error for empty key');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
      // 预期错误
    }
  });

  test('SM3 HMAC - key 为空 Uint8Array 应该正常工作', () => {
    // sm-crypto-v2 允许空 key，会正常计算 HMAC
    const hmac = sm3('test', { key: new Uint8Array([]) });
    if (typeof hmac !== 'string' || hmac.length !== 64) {
      throw new Error(`Expected valid HMAC string, got ${typeof hmac} with length ${hmac.length}`);
    }
  });

  test('SM3 HMAC - mode 非法值应该抛出错误', () => {
    try {
      sm3('test', { mode: 'invalid', key: '0123456789abcdef' });
      throw new Error('Should throw error for invalid mode');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
      // 预期错误
    }
  });

  test('SM3 HMAC - key 为 null 应该抛出错误', () => {
    try {
      sm3('test', { key: null });
      throw new Error('Should throw error for null key');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
      // 预期错误
    }
  });

  test('SM3 HMAC - key 为数字应该抛出错误', () => {
    try {
      sm3('test', { key: 12345 });
      throw new Error('Should throw error for number key');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
      // 预期错误
    }
  });

  test('SM3 HMAC - key 为非 hex 字符串应该按 UTF-8 处理', () => {
    // sm-crypto-v2 会将字符串按 UTF-8 字节处理，不要求必须是 hex
    const hmac = sm3('test', { key: 'not-a-hex-string!!!' });
    if (typeof hmac !== 'string' || hmac.length !== 64) {
      throw new Error(`Expected valid HMAC string, got ${typeof hmac} with length ${hmac.length}`);
    }
  });

  // ============================================================================
  // 测试 6: HMAC 一致性和边界
  // ============================================================================

  test('SM3 HMAC - 相同 key 和消息应返回相同结果', () => {
    const key = '0123456789abcdef';
    const message = 'test message';
    const hmac1 = sm3(message, { key: key });
    const hmac2 = sm3(message, { key: key });
    const hmac3 = sm3(message, { key: key });
    
    if (hmac1 !== hmac2 || hmac2 !== hmac3) {
      throw new Error(`Inconsistent HMAC results: ${hmac1}, ${hmac2}, ${hmac3}`);
    }
  });

  test('SM3 HMAC - 不同 key 应返回不同结果', () => {
    const key1 = '0123456789abcdef';
    const key2 = 'fedcba9876543210';
    const message = 'test message';
    const hmac1 = sm3(message, { key: key1 });
    const hmac2 = sm3(message, { key: key2 });
    
    if (hmac1 === hmac2) {
      throw new Error(`Different keys should produce different HMACs`);
    }
  });

  test('SM3 HMAC - 不同消息应返回不同结果', () => {
    const key = '0123456789abcdef';
    const hmac1 = sm3('message 1', { key: key });
    const hmac2 = sm3('message 2', { key: key });
    
    if (hmac1 === hmac2) {
      throw new Error(`Different messages should produce different HMACs`);
    }
  });

  test('SM3 HMAC - hex key vs 等效 Uint8Array key 应返回相同结果', () => {
    const hexKey = '0123456789abcdef';
    const arrayKey = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
    const message = 'test message';
    
    const hmac1 = sm3(message, { key: hexKey });
    const hmac2 = sm3(message, { key: arrayKey });
    
    if (hmac1 !== hmac2) {
      throw new Error(`Hex key and equivalent Uint8Array key should produce same HMAC: ${hmac1} vs ${hmac2}`);
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

