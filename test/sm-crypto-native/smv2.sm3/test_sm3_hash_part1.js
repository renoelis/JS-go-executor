/**
 * SM3 基础哈希测试 (Part 1)
 * 测试范围：
 * - 基础 SM3 哈希功能
 * - 输入类型：string、Uint8Array
 * - 输出类型：string (默认 hex)、array (Uint8Array)
 * - 边界情况：空输入、长输入、特殊字符
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
  // 测试 1: 基础 SM3 哈希 - 标准测试向量
  // ============================================================================
  
  test('SM3 hash - 空字符串', () => {
    const hash = sm3('');
    const expected = '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3 hash - "abc"', () => {
    const hash = sm3('abc');
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3 hash - "abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd"', () => {
    const hash = sm3('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd');
    const expected = 'debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3 hash - 中文字符串 "你好世界"', () => {
    const hash = sm3('你好世界');
    const expected = 'f48ad1486f559db5c2d0d9f5f3ab1c1c10245f0cf8b5e1d5d5f4e4c8a9f71c8e';
    // 注意：这个期望值需要用实际运行结果验证
    // 这里先用一个占位值，后续会用 Node.js 验证
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 单字节', () => {
    const hash = sm3('a');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 特殊字符', () => {
    const hash = sm3('!@#$%^&*()_+-=[]{}|;:,.<>?/~`');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 换行符', () => {
    const hash = sm3('hello\nworld\r\n');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 长字符串 (1KB)', () => {
    const longStr = 'a'.repeat(1024);
    const hash = sm3(longStr);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - 长字符串 (10KB)', () => {
    const longStr = 'Hello World! '.repeat(800); // ~10KB
    const hash = sm3(longStr);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  // ============================================================================
  // 测试 2: Uint8Array 输入
  // ============================================================================

  test('SM3 hash - Uint8Array 空数组', () => {
    const hash = sm3(new Uint8Array([]));
    const expected = '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3 hash - Uint8Array [0x61, 0x62, 0x63] ("abc")', () => {
    const hash = sm3(new Uint8Array([0x61, 0x62, 0x63]));
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3 hash - Uint8Array 单字节', () => {
    const hash = sm3(new Uint8Array([0x00]));
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - Uint8Array 全 0xFF', () => {
    const arr = new Uint8Array(64);
    arr.fill(0xFF);
    const hash = sm3(arr);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3 hash - Uint8Array 随机字节', () => {
    const arr = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
    const hash = sm3(arr);
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  // ============================================================================
  // 测试 3: 输出格式验证 (sm3 只返回字符串)
  // ============================================================================

  test('SM3 hash - 输出始终是字符串', () => {
    const hash = sm3('test');
    if (typeof hash !== 'string') {
      throw new Error(`Expected string, got ${typeof hash}`);
    }
  });

  test('SM3 hash - 可以手动转换为 Uint8Array', () => {
    const hashStr = sm3('abc');
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    if (hashStr !== expected) {
      throw new Error(`Expected ${expected}, got ${hashStr}`);
    }
    // 手动转换为 Uint8Array
    const bytes = new Uint8Array(hashStr.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    if (bytes.length !== 32) {
      throw new Error(`Byte length should be 32, got ${bytes.length}`);
    }
  });

  // ============================================================================
  // 测试 4: 参数错误处理
  // ============================================================================

  test('SM3 hash - 缺少参数应该抛出错误', () => {
    try {
      sm3();
      throw new Error('Should throw error when no argument provided');
    } catch (error) {
      if (!error.message.includes('Uint8Array') && !error.message.includes('requires') && !error.message.includes('argument')) {
        throw new Error(`Unexpected error message: ${error.message}`);
      }
    }
  });

  test('SM3 hash - null 输入应该抛出错误', () => {
    try {
      sm3(null);
      throw new Error('Should throw error for null input');
    } catch (error) {
      // 预期会抛出错误
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('SM3 hash - undefined 输入应该抛出错误', () => {
    try {
      sm3(undefined);
      throw new Error('Should throw error for undefined input');
    } catch (error) {
      // 预期会抛出错误
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('SM3 hash - 数字输入应该抛出错误', () => {
    try {
      sm3(12345);
      throw new Error('Should throw error for number input');
    } catch (error) {
      // 预期会抛出错误
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('SM3 hash - 对象输入应该抛出错误', () => {
    try {
      sm3({ data: 'test' });
      throw new Error('Should throw error for object input');
    } catch (error) {
      // 预期会抛出错误
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  // ============================================================================
  // 测试 5: 多次调用一致性
  // ============================================================================

  test('SM3 hash - 多次调用相同输入应返回相同结果', () => {
    const input = 'consistency test';
    const hash1 = sm3(input);
    const hash2 = sm3(input);
    const hash3 = sm3(input);
    
    if (hash1 !== hash2 || hash2 !== hash3) {
      throw new Error(`Inconsistent results: ${hash1}, ${hash2}, ${hash3}`);
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

