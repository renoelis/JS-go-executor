/**
 * SM3 KDF (密钥派生函数) 测试 (Part 3)
 * 测试范围：
 * - KDF 基础功能 (GM/T 0003-2012 标准)
 * - 输入类型：string、Uint8Array
 * - keylen 参数：各种长度
 * - iv 参数：有/无 iv
 * - 输出格式：array (默认)、string (hex)
 * - 边界情况：keylen=1, 32, 64, 128, 256
 * - 错误处理：无效参数
 */

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
  // 测试 1: KDF 基础功能
  // ============================================================================

  test('KDF - 基础调用 (z="abc", keylen=32)', () => {
    const result = kdf('abc', 32);
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Expected Uint8Array, got ${typeof result}`);
    }
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - keylen=1', () => {
    const result = kdf('test', 1);
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Expected Uint8Array, got ${typeof result}`);
    }
    if (result.length !== 1) {
      throw new Error(`Expected length 1, got ${result.length}`);
    }
  });

  test('KDF - keylen=16', () => {
    const result = kdf('test', 16);
    if (result.length !== 16) {
      throw new Error(`Expected length 16, got ${result.length}`);
    }
  });

  test('KDF - keylen=64', () => {
    const result = kdf('test', 64);
    if (result.length !== 64) {
      throw new Error(`Expected length 64, got ${result.length}`);
    }
  });

  test('KDF - keylen=128', () => {
    const result = kdf('test', 128);
    if (result.length !== 128) {
      throw new Error(`Expected length 128, got ${result.length}`);
    }
  });

  test('KDF - keylen=256', () => {
    const result = kdf('test', 256);
    if (result.length !== 256) {
      throw new Error(`Expected length 256, got ${result.length}`);
    }
  });

  test('KDF - keylen=1024', () => {
    const result = kdf('test', 1024);
    if (result.length !== 1024) {
      throw new Error(`Expected length 1024, got ${result.length}`);
    }
  });

  // ============================================================================
  // 测试 2: KDF 输入类型 - Uint8Array
  // ============================================================================

  test('KDF - Uint8Array 输入', () => {
    const z = new Uint8Array([0x61, 0x62, 0x63]); // "abc"
    const result = kdf(z, 32);
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Expected Uint8Array, got ${typeof result}`);
    }
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - Uint8Array 输入，空数组', () => {
    const z = new Uint8Array([]);
    const result = kdf(z, 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - Uint8Array 输入，长数据', () => {
    const z = new Uint8Array(256);
    z.fill(0x42);
    const result = kdf(z, 64);
    if (result.length !== 64) {
      throw new Error(`Expected length 64, got ${result.length}`);
    }
  });

  // ============================================================================
  // 测试 3: KDF 带 IV 参数
  // ============================================================================

  test('KDF - 带 iv (string)', () => {
    const result = kdf('test', 32, 'iv-string');
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Expected Uint8Array, got ${typeof result}`);
    }
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - 带 iv (Uint8Array)', () => {
    const iv = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const result = kdf('test', 32, iv);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - 带 iv (空字符串)', () => {
    const result = kdf('test', 32, '');
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - 带 iv (空 Uint8Array)', () => {
    const iv = new Uint8Array([]);
    const result = kdf('test', 32, iv);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - 不同 iv 应产生不同结果', () => {
    const z = 'test';
    const keylen = 32;
    const result1 = kdf(z, keylen, 'iv1');
    const result2 = kdf(z, keylen, 'iv2');
    
    // 转换为 hex 比较
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 === hex2) {
      throw new Error('Different IVs should produce different results');
    }
  });

  test('KDF - 无 iv vs 空 iv 应产生相同结果', () => {
    const z = 'test';
    const keylen = 32;
    const result1 = kdf(z, keylen);
    const result2 = kdf(z, keylen, '');
    const result3 = kdf(z, keylen, new Uint8Array([]));
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex3 = Array.from(result3).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 !== hex2 || hex2 !== hex3) {
      throw new Error(`No IV and empty IV should produce same results: ${hex1} vs ${hex2} vs ${hex3}`);
    }
  });

  // ============================================================================
  // 测试 4: KDF 输出格式（仅 Uint8Array）
  // ============================================================================

  test('KDF - 输出始终是 Uint8Array', () => {
    const result = kdf('test', 32);
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Output should be Uint8Array, got ${typeof result}`);
    }
  });

  test('KDF - 可以手动转换为 hex 字符串', () => {
    const result = kdf('test', 32);
    const hexStr = Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
    if (hexStr.length !== 64) {
      throw new Error(`Hex length should be 64, got ${hexStr.length}`);
    }
  });

  // ============================================================================
  // 测试 5: KDF 一致性
  // ============================================================================

  test('KDF - 相同输入应产生相同输出', () => {
    const z = 'consistent test';
    const keylen = 48;
    
    const result1 = kdf(z, keylen);
    const result2 = kdf(z, keylen);
    const result3 = kdf(z, keylen);
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex3 = Array.from(result3).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 !== hex2 || hex2 !== hex3) {
      throw new Error(`Inconsistent results: ${hex1}, ${hex2}, ${hex3}`);
    }
  });

  test('KDF - 不同 z 应产生不同输出', () => {
    const keylen = 32;
    const result1 = kdf('input1', keylen);
    const result2 = kdf('input2', keylen);
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 === hex2) {
      throw new Error('Different inputs should produce different outputs');
    }
  });

  test('KDF - 不同 keylen 应产生不同长度输出', () => {
    const z = 'test';
    const result1 = kdf(z, 16);
    const result2 = kdf(z, 32);
    const result3 = kdf(z, 64);
    
    if (result1.length !== 16 || result2.length !== 32 || result3.length !== 64) {
      throw new Error(`Unexpected lengths: ${result1.length}, ${result2.length}, ${result3.length}`);
    }
  });

  // ============================================================================
  // 测试 6: 错误处理和边界情况
  // ============================================================================

  test('KDF - 缺少参数应抛出错误', () => {
    try {
      kdf();
      throw new Error('Should throw error when no arguments');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('KDF - 只有一个参数返回空数组', () => {
    // sm-crypto-v2 允许只传一个参数，返回空数组
    const result = kdf('test');
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Expected Uint8Array, got ${typeof result}`);
    }
    if (result.length !== 0) {
      throw new Error(`Expected length 0, got ${result.length}`);
    }
  });

  test('KDF - keylen=0 返回空数组', () => {
    // sm-crypto-v2 允许 keylen=0，返回空数组
    const result = kdf('test', 0);
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Expected Uint8Array, got ${typeof result}`);
    }
    if (result.length !== 0) {
      throw new Error(`Expected length 0, got ${result.length}`);
    }
  });

  test('KDF - keylen 为负数应抛出错误', () => {
    try {
      kdf('test', -10);
      throw new Error('Should throw error for negative keylen');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('KDF - z 为 null 应抛出错误', () => {
    try {
      kdf(null, 32);
      throw new Error('Should throw error for null z');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('KDF - z 为 undefined 应抛出错误', () => {
    try {
      kdf(undefined, 32);
      throw new Error('Should throw error for undefined z');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('KDF - keylen 为字符串应抛出错误或转换', () => {
    try {
      const result = kdf('test', '32');
      // 某些实现可能会自动转换，检查结果是否合理
      if (!(result instanceof Uint8Array) || result.length !== 32) {
        throw new Error('String keylen should either error or convert to 32');
      }
    } catch (error) {
      // 抛出错误也是可接受的
      if (error.message.includes('String keylen should')) {
        throw error;
      }
    }
  });

  // ============================================================================
  // 测试 7: KDF 特殊场景
  // ============================================================================

  test('KDF - 空字符串输入', () => {
    const result = kdf('', 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - 中文输入', () => {
    const result = kdf('你好世界', 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - 特殊字符输入', () => {
    const result = kdf('!@#$%^&*()', 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF - 长输入 (1KB)', () => {
    const longInput = 'a'.repeat(1024);
    const result = kdf(longInput, 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
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

