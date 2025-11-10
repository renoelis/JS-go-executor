// buf.toJSON() - Encoding Edge Cases and Invalid Input Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌', passed: pass });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', passed: false, error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// base64 特殊情况
test('base64 单字符 A', () => {
  const buf = Buffer.from('A', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 'A' 解码后是 0 字节
  if (json.data.length !== 0) return false;

  return true;
});

test('base64 双字符 AB', () => {
  const buf = Buffer.from('AB', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 'AB' 解码后是 1 字节
  if (json.data.length !== 1) return false;

  return true;
});

test('base64 三字符 ABC', () => {
  const buf = Buffer.from('ABC', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 'ABC' 解码后是 2 字节
  if (json.data.length !== 2) return false;

  return true;
});

test('base64 只有 padding ====', () => {
  const buf = Buffer.from('====', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('base64 包含无效字符', () => {
  const buf = Buffer.from('!@#$%^&*', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 无效字符会被忽略
  if (json.data.length !== 0) return false;

  return true;
});

test('base64 包含空格', () => {
  const buf = Buffer.from('SGVs bG8=', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 空格会被忽略,应该正常解码 'Hello'
  if (json.data.length !== 5) return false;

  return true;
});

test('base64 包含换行符', () => {
  const buf = Buffer.from('SGVs\nbG8=', 'base64');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 换行符会被忽略
  if (json.data.length !== 5) return false;

  return true;
});

test('base64url 编码 URL 安全字符', () => {
  const buf = Buffer.from('test-data_123', 'base64url');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (!Array.isArray(json.data)) return false;

  return true;
});

test('base64url 与 base64 的差异', () => {
  // base64url 使用 - 和 _ 替代 + 和 /
  const str = 'foo';
  const buf1 = Buffer.from(str);
  const b64 = buf1.toString('base64');
  const b64url = buf1.toString('base64url');

  const bufFromB64 = Buffer.from(b64, 'base64');
  const bufFromB64url = Buffer.from(b64url, 'base64url');

  const json1 = bufFromB64.toJSON();
  const json2 = bufFromB64url.toJSON();

  // 应该解码为相同的内容
  if (JSON.stringify(json1.data) !== JSON.stringify(json2.data)) return false;

  return true;
});

// hex 特殊情况
test('hex 奇数长度字符串', () => {
  const buf = Buffer.from('abc', 'hex');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 奇数长度会截断最后一个字符
  if (json.data.length !== 1) return false;
  if (json.data[0] !== 0xab) return false;

  return true;
});

test('hex 包含无效字符 g-z', () => {
  const buf = Buffer.from('xyz', 'hex');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 无效字符会导致解码失败
  if (json.data.length !== 0) return false;

  return true;
});

test('hex 包含大写字母', () => {
  const buf = Buffer.from('ABCDEF', 'hex');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 0xAB || json.data[1] !== 0xCD || json.data[2] !== 0xEF) return false;

  return true;
});

test('hex 包含小写字母', () => {
  const buf = Buffer.from('abcdef', 'hex');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 0xab || json.data[1] !== 0xcd || json.data[2] !== 0xef) return false;

  return true;
});

test('hex 大小写混合', () => {
  const buf = Buffer.from('AbCdEf', 'hex');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 0xab || json.data[1] !== 0xcd || json.data[2] !== 0xef) return false;

  return true;
});

test('hex 包含空格会失败', () => {
  const buf = Buffer.from('ab cd', 'hex');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 空格不是有效的 hex 字符
  if (json.data.length !== 1) return false;
  if (json.data[0] !== 0xab) return false;

  return true;
});

// latin1 边界情况
test('latin1 字节值 128-255', () => {
  const highBytes = String.fromCharCode(128, 200, 255);
  const buf = Buffer.from(highBytes, 'latin1');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 3) return false;
  if (json.data[0] !== 128 || json.data[1] !== 200 || json.data[2] !== 255) return false;

  return true;
});

test('latin1 与 UTF-8 高字节差异', () => {
  const str = 'café';
  const bufLatin1 = Buffer.from(str, 'latin1');
  const bufUtf8 = Buffer.from(str, 'utf8');

  const jsonLatin1 = bufLatin1.toJSON();
  const jsonUtf8 = bufUtf8.toJSON();

  // UTF-8 应该比 latin1 更长(因为 é 是多字节)
  if (jsonLatin1.data.length >= jsonUtf8.data.length) return false;

  return true;
});

// ascii 边界情况
test('ascii 只保留 0-127', () => {
  const buf = Buffer.from('test', 'ascii');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 4) return false;

  // 所有值应该 < 128
  for (let i = 0; i < json.data.length; i++) {
    if (json.data[i] >= 128) return false;
  }

  return true;
});

test('ascii 高位字节会被截断', () => {
  // String.fromCharCode(200) 在 ascii 编码下会被截断为 200 & 0x7F = 72
  const highChar = String.fromCharCode(200);
  const buf = Buffer.from(highChar, 'ascii');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 1) return false;
  if (json.data[0] !== (200 & 0x7F)) return false;

  return true;
});

// utf16le / ucs2 测试
test('utf16le 每字符 2 字节', () => {
  const buf = Buffer.from('ABC', 'utf16le');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  // 3 个字符 = 6 字节
  if (json.data.length !== 6) return false;

  return true;
});

test('ucs2 是 utf16le 的别名', () => {
  const str = 'test';
  const buf1 = Buffer.from(str, 'utf16le');
  const buf2 = Buffer.from(str, 'ucs2');

  const json1 = buf1.toJSON();
  const json2 = buf2.toJSON();

  // 应该完全相同
  if (JSON.stringify(json1.data) !== JSON.stringify(json2.data)) return false;

  return true;
});

test('utf16le 小端序验证', () => {
  const buf = Buffer.from('A', 'utf16le');
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 2) return false;

  // 'A' = 0x0041, 小端序应该是 [0x41, 0x00]
  if (json.data[0] !== 0x41 || json.data[1] !== 0x00) return false;

  return true;
});

// 无效编码名称
test('无效编码名称默认为 utf8', () => {
  let threw = false;
  try {
    const buf = Buffer.from('test', 'invalid-encoding');
  } catch (e) {
    threw = true;
    // 应该抛出错误
    if (!e.message.includes('encoding') && !e.message.includes('Unknown')) return false;
  }

  return threw;
});

// Buffer.alloc 和 fill 的边界
test('Buffer.alloc 长度为 0', () => {
  const buf = Buffer.alloc(0);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

test('Buffer.allocUnsafe 长度为 0', () => {
  const buf = Buffer.allocUnsafe(0);
  const json = buf.toJSON();

  if (json.type !== 'Buffer') return false;
  if (json.data.length !== 0) return false;

  return true;
});

const passed = tests.filter(t => t.passed).length;
const failed = tests.filter(t => !t.passed).length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
  };
  console.log('\n' + JSON.stringify(result, null, 2));
  return result;
} catch (error) {
  const errorResult = {
    success: false,
    error: error.message,
    stack: error.stack
  };
  console.log(JSON.stringify(errorResult, null, 2));
  return errorResult;
}
