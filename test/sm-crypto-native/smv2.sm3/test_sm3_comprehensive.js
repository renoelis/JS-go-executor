/**
 * SM3 综合测试 - 完整功能覆盖
 * 
 * 测试目标：100% 覆盖 sm-crypto-v2 v1.15.0 的 SM3 API
 * 
 * 功能清单：
 * 1. sm3(input) - 普通哈希
 * 2. sm3(input, { key }) - HMAC 模式
 * 3. kdf(z, keylen, iv?) - 密钥派生
 * 
 * 覆盖维度：
 * - 输入类型：string, Uint8Array, Buffer
 * - 输出类型：string (hex) for hash/hmac, Uint8Array for kdf
 * - 参数组合：有/无可选参数
 * - 边界情况：空输入、超长输入、块边界
 * - 错误处理：缺失参数、非法参数、类型错误
 * - 一致性：多次调用、并发调用
 * - 安全性：HMAC key 处理、Unicode 支持
 */

const sm3Module = require('sm-crypto-v2').sm3;
const { kdf } = require('sm-crypto-v2');

function runTests() {
  const results = {
    success: true,
    total: 0,
    passed: 0,
    failed: 0,
    categories: {},
    details: []
  };

  function test(category, name, fn) {
    results.total++;
    if (!results.categories[category]) {
      results.categories[category] = { total: 0, passed: 0, failed: 0 };
    }
    results.categories[category].total++;
    
    try {
      fn();
      results.passed++;
      results.categories[category].passed++;
      results.details.push(`✅ [${category}] ${name}`);
      return true;
    } catch (error) {
      results.failed++;
      results.categories[category].failed++;
      results.success = false;
      results.details.push(`❌ [${category}] ${name}: ${error.message}\n${error.stack}`);
      return false;
    }
  }

  // ==========================================================================
  // 分类 1: SM3 基础哈希 - 标准测试向量
  // ==========================================================================

  test('SM3-Hash-Vectors', '空字符串', () => {
    const hash = sm3Module('');
    const expected = '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3-Hash-Vectors', 'abc', () => {
    const hash = sm3Module('abc');
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3-Hash-Vectors', '64 字节重复字符串', () => {
    const hash = sm3Module('abcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcdabcd');
    const expected = 'debe9ff92275b8a138604889c18e5a4d6fdb70e5387e5765293dcba39c0c5732';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  // ==========================================================================
  // 分类 2: SM3 输入类型覆盖
  // ==========================================================================

  test('SM3-Input-Types', 'string 输入', () => {
    const hash = sm3Module('test string');
    if (typeof hash !== 'string' || hash.length !== 64) {
      throw new Error(`Expected 64-char hex string, got ${typeof hash} with length ${hash.length}`);
    }
  });

  test('SM3-Input-Types', 'Uint8Array 输入', () => {
    const hash = sm3Module(new Uint8Array([0x61, 0x62, 0x63]));
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3-Input-Types', 'Buffer 输入', () => {
    const hash = sm3Module(Buffer.from([0x61, 0x62, 0x63]));
    const expected = '66c7f0f462eeedd9d1f2d46bdc10e4e24167c4875cf2f7a2297da02b8f4ba8e0';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3-Input-Types', '空 Uint8Array', () => {
    const hash = sm3Module(new Uint8Array([]));
    const expected = '1ab21d8355cfa17f8e61194831e81a8f22bec8c728fefb747ed035eb5082aa2b';
    if (hash !== expected) {
      throw new Error(`Expected ${expected}, got ${hash}`);
    }
  });

  test('SM3-Input-Types', 'Unicode 字符串（中文）', () => {
    const hash = sm3Module('你好世界');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3-Input-Types', 'Unicode 字符串（Emoji）', () => {
    const hash = sm3Module('👍🎉🔥');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  // ==========================================================================
  // 分类 3: SM3 边界情况
  // ==========================================================================

  test('SM3-Boundaries', '1 字节', () => {
    const hash = sm3Module('a');
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3-Boundaries', '块边界 64 字节', () => {
    const hash = sm3Module('x'.repeat(64));
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3-Boundaries', '块边界 -1 (63 字节)', () => {
    const hash = sm3Module('x'.repeat(63));
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3-Boundaries', '块边界 +1 (65 字节)', () => {
    const hash = sm3Module('x'.repeat(65));
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3-Boundaries', '1KB 输入', () => {
    const hash = sm3Module('a'.repeat(1024));
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3-Boundaries', '100KB 输入', () => {
    const hash = sm3Module('x'.repeat(100 * 1024));
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  test('SM3-Boundaries', '1MB 输入', () => {
    const hash = sm3Module('y'.repeat(1024 * 1024));
    if (hash.length !== 64) {
      throw new Error(`Hash length should be 64, got ${hash.length}`);
    }
  });

  // ==========================================================================
  // 分类 4: SM3 HMAC - 基础功能
  // ==========================================================================

  test('SM3-HMAC-Basic', 'hex key + string message', () => {
    const key = '0123456789abcdef0123456789abcdef';
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Basic', 'Uint8Array key + string message', () => {
    const key = new Uint8Array([0x01, 0x23, 0x45, 0x67]);
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Basic', 'hex key + Uint8Array message', () => {
    const key = '0123456789abcdef';
    const message = new Uint8Array([0x61, 0x62, 0x63]);
    const hmac = sm3Module(message, { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Basic', 'mode="hmac" 显式指定', () => {
    const key = '0123456789abcdef';
    const hmac = sm3Module('test', { mode: 'hmac', key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Basic', 'UTF-8 字符串作为 key', () => {
    const key = 'my-secret-key';
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  // ==========================================================================
  // 分类 5: SM3 HMAC - Key 边界测试
  // ==========================================================================

  test('SM3-HMAC-Key-Boundaries', '短 key (1 字节)', () => {
    const key = new Uint8Array([0x42]);
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Key-Boundaries', '中等 key (16 字节)', () => {
    const key = '0123456789abcdef0123456789abcdef';
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Key-Boundaries', '长 key (128 字节)', () => {
    const key = '0123456789abcdef'.repeat(16);
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Key-Boundaries', '超长 key (1KB)', () => {
    const key = 'a'.repeat(1024);
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  test('SM3-HMAC-Key-Boundaries', '空 Uint8Array key (允许)', () => {
    const key = new Uint8Array([]);
    const hmac = sm3Module('test', { key: key });
    if (hmac.length !== 64) {
      throw new Error(`HMAC length should be 64, got ${hmac.length}`);
    }
  });

  // ==========================================================================
  // 分类 6: SM3 HMAC - 等价性测试
  // ==========================================================================

  test('SM3-HMAC-Equivalence', 'hex key vs 等效 Uint8Array key', () => {
    const hexKey = '0123456789abcdef';
    const arrayKey = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
    const message = 'test message';
    
    const hmac1 = sm3Module(message, { key: hexKey });
    const hmac2 = sm3Module(message, { key: arrayKey });
    
    if (hmac1 !== hmac2) {
      throw new Error(`Hex key and equivalent array key should produce same HMAC`);
    }
  });

  test('SM3-HMAC-Equivalence', '不同 key 产生不同结果', () => {
    const key1 = '0123456789abcdef';
    const key2 = 'fedcba9876543210';
    const message = 'test';
    
    const hmac1 = sm3Module(message, { key: key1 });
    const hmac2 = sm3Module(message, { key: key2 });
    
    if (hmac1 === hmac2) {
      throw new Error('Different keys should produce different HMACs');
    }
  });

  test('SM3-HMAC-Equivalence', '不同 message 产生不同结果', () => {
    const key = '0123456789abcdef';
    const hmac1 = sm3Module('message1', { key: key });
    const hmac2 = sm3Module('message2', { key: key });
    
    if (hmac1 === hmac2) {
      throw new Error('Different messages should produce different HMACs');
    }
  });

  // ==========================================================================
  // 分类 7: KDF - 基础功能
  // ==========================================================================

  test('KDF-Basic', 'kdf(z, keylen) - 基础调用', () => {
    const result = kdf('abc', 32);
    if (!(result instanceof Uint8Array)) {
      throw new Error(`Expected Uint8Array, got ${typeof result}`);
    }
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF-Basic', 'Uint8Array 输入', () => {
    const z = new Uint8Array([0x61, 0x62, 0x63]);
    const result = kdf(z, 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF-Basic', '空字符串 z', () => {
    const result = kdf('', 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF-Basic', '带 iv 参数（string）', () => {
    const result = kdf('test', 32, 'iv-data');
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF-Basic', '带 iv 参数（Uint8Array）', () => {
    const iv = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const result = kdf('test', 32, iv);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  // ==========================================================================
  // 分类 8: KDF - keylen 边界测试
  // ==========================================================================

  test('KDF-Keylen-Boundaries', 'keylen=0 返回空数组', () => {
    const result = kdf('test', 0);
    if (result.length !== 0) {
      throw new Error(`Expected length 0, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=1', () => {
    const result = kdf('test', 1);
    if (result.length !== 1) {
      throw new Error(`Expected length 1, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=16', () => {
    const result = kdf('test', 16);
    if (result.length !== 16) {
      throw new Error(`Expected length 16, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=31 (SM3输出-1)', () => {
    const result = kdf('test', 31);
    if (result.length !== 31) {
      throw new Error(`Expected length 31, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=32 (SM3输出长度)', () => {
    const result = kdf('test', 32);
    if (result.length !== 32) {
      throw new Error(`Expected length 32, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=33 (SM3输出+1)', () => {
    const result = kdf('test', 33);
    if (result.length !== 33) {
      throw new Error(`Expected length 33, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=64', () => {
    const result = kdf('test', 64);
    if (result.length !== 64) {
      throw new Error(`Expected length 64, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=128', () => {
    const result = kdf('test', 128);
    if (result.length !== 128) {
      throw new Error(`Expected length 128, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=1024', () => {
    const result = kdf('test', 1024);
    if (result.length !== 1024) {
      throw new Error(`Expected length 1024, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=10KB', () => {
    const result = kdf('test', 10 * 1024);
    if (result.length !== 10 * 1024) {
      throw new Error(`Expected length ${10 * 1024}, got ${result.length}`);
    }
  });

  test('KDF-Keylen-Boundaries', 'keylen=100KB', () => {
    const result = kdf('test', 100 * 1024);
    if (result.length !== 100 * 1024) {
      throw new Error(`Expected length ${100 * 1024}, got ${result.length}`);
    }
  });

  // ==========================================================================
  // 分类 9: KDF - IV 影响测试
  // ==========================================================================

  test('KDF-IV-Effect', '无 iv vs 空字符串 iv (应相同)', () => {
    const z = 'test';
    const keylen = 32;
    const result1 = kdf(z, keylen);
    const result2 = kdf(z, keylen, '');
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 !== hex2) {
      throw new Error('No IV and empty IV should produce same results');
    }
  });

  test('KDF-IV-Effect', '无 iv vs 空 Uint8Array iv (应相同)', () => {
    const z = 'test';
    const keylen = 32;
    const result1 = kdf(z, keylen);
    const result3 = kdf(z, keylen, new Uint8Array([]));
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex3 = Array.from(result3).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 !== hex3) {
      throw new Error('No IV and empty Uint8Array IV should produce same results');
    }
  });

  test('KDF-IV-Effect', '不同 iv 产生不同结果', () => {
    const z = 'test';
    const keylen = 32;
    const result1 = kdf(z, keylen, 'iv1');
    const result2 = kdf(z, keylen, 'iv2');
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 === hex2) {
      throw new Error('Different IVs should produce different results');
    }
  });

  // ==========================================================================
  // 分类 10: 错误处理 - SM3 Hash
  // ==========================================================================

  test('Error-SM3-Hash', '缺少参数', () => {
    try {
      sm3Module();
      throw new Error('Should throw error when no argument');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-Hash', 'null 输入', () => {
    try {
      sm3Module(null);
      throw new Error('Should throw error for null');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-Hash', 'undefined 输入', () => {
    try {
      sm3Module(undefined);
      throw new Error('Should throw error for undefined');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-Hash', '数字输入', () => {
    try {
      sm3Module(12345);
      throw new Error('Should throw error for number');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-Hash', '对象输入（非 Uint8Array）', () => {
    try {
      sm3Module({ data: 'test' });
      throw new Error('Should throw error for plain object');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-Hash', '数组输入（非 TypedArray）', () => {
    try {
      sm3Module([0x61, 0x62, 0x63]);
      throw new Error('Should throw error for plain array');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  // ==========================================================================
  // 分类 11: 错误处理 - SM3 HMAC
  // ==========================================================================

  test('Error-SM3-HMAC', 'key 为空字符串', () => {
    try {
      sm3Module('test', { key: '' });
      throw new Error('Should throw error for empty string key');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-HMAC', 'key 为 null', () => {
    try {
      sm3Module('test', { key: null });
      throw new Error('Should throw error for null key');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-HMAC', 'mode 非法值', () => {
    try {
      sm3Module('test', { mode: 'invalid', key: '0123456789abcdef' });
      throw new Error('Should throw error for invalid mode');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-SM3-HMAC', 'key 为数字', () => {
    try {
      sm3Module('test', { key: 12345 });
      throw new Error('Should throw error for number key');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  // ==========================================================================
  // 分类 12: 错误处理 - KDF
  // ==========================================================================

  test('Error-KDF', '缺少参数', () => {
    try {
      kdf();
      throw new Error('Should throw error when no arguments');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-KDF', 'z 为 null', () => {
    try {
      kdf(null, 32);
      throw new Error('Should throw error for null z');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-KDF', 'z 为 undefined', () => {
    try {
      kdf(undefined, 32);
      throw new Error('Should throw error for undefined z');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  test('Error-KDF', 'keylen 为负数', () => {
    try {
      kdf('test', -10);
      throw new Error('Should throw error for negative keylen');
    } catch (error) {
      if (error.message.includes('Should throw')) {
        throw error;
      }
    }
  });

  // ==========================================================================
  // 分类 13: 一致性测试
  // ==========================================================================

  test('Consistency', 'SM3 多次调用相同输入', () => {
    const input = 'consistency test';
    const hash1 = sm3Module(input);
    const hash2 = sm3Module(input);
    const hash3 = sm3Module(input);
    
    if (hash1 !== hash2 || hash2 !== hash3) {
      throw new Error('Inconsistent hash results');
    }
  });

  test('Consistency', 'HMAC 多次调用相同输入', () => {
    const key = '0123456789abcdef';
    const message = 'test';
    const hmac1 = sm3Module(message, { key: key });
    const hmac2 = sm3Module(message, { key: key });
    const hmac3 = sm3Module(message, { key: key });
    
    if (hmac1 !== hmac2 || hmac2 !== hmac3) {
      throw new Error('Inconsistent HMAC results');
    }
  });

  test('Consistency', 'KDF 多次调用相同输入', () => {
    const z = 'test';
    const keylen = 32;
    const result1 = kdf(z, keylen);
    const result2 = kdf(z, keylen);
    
    const hex1 = Array.from(result1).map(b => b.toString(16).padStart(2, '0')).join('');
    const hex2 = Array.from(result2).map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hex1 !== hex2) {
      throw new Error('Inconsistent KDF results');
    }
  });

  // ==========================================================================
  // 分类 14: 并发测试
  // ==========================================================================

  test('Concurrency', 'SM3 并发 100 次', () => {
    const results = [];
    for (let i = 0; i < 100; i++) {
      results.push(sm3Module(`test${i}`));
    }
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].length !== 64) {
        throw new Error(`Result ${i} has invalid length`);
      }
    }
  });

  test('Concurrency', 'HMAC 并发 50 次', () => {
    const key = '0123456789abcdef';
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(sm3Module(`msg${i}`, { key: key }));
    }
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].length !== 64) {
        throw new Error(`HMAC result ${i} has invalid length`);
      }
    }
  });

  test('Concurrency', 'KDF 并发 50 次', () => {
    const results = [];
    for (let i = 0; i < 50; i++) {
      results.push(kdf(`input${i}`, 32));
    }
    
    for (let i = 0; i < results.length; i++) {
      if (results[i].length !== 32) {
        throw new Error(`KDF result ${i} has invalid length`);
      }
    }
  });

  // ==========================================================================
  // 生成分类报告
  // ==========================================================================

  const categoryReport = Object.keys(results.categories).map(cat => {
    const c = results.categories[cat];
    return `${cat}: ${c.passed}/${c.total} passed`;
  });

  const summary = {
    success: results.success,
    summary: `Total: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`,
    categories: categoryReport,
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

