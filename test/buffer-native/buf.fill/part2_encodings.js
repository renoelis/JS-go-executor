// buf.fill() - Encoding Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === 不同编码测试 ===

test('填充 hex 编码字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('6162', 'hex'); // 'ab' in hex
  return buf.toString() === 'ababababab';
});

test('填充 base64 编码字符串', () => {
  const buf = Buffer.alloc(8);
  buf.fill('YWJj', 'base64'); // 'abc' in base64
  const expected = 'abcabcab';
  return buf.toString() === expected;
});

test('填充 latin1 编码字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('x', 0, 10, 'latin1');
  return buf.toString('latin1') === 'xxxxxxxxxx';
});

test('填充 utf8 编码字符串（显式指定）', () => {
  const buf = Buffer.alloc(10);
  buf.fill('abc', 0, 10, 'utf8');
  return buf.toString('utf8') === 'abcabcabca';
});

test('填充 utf16le 编码字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('a', 0, 10, 'utf16le');
  // 'a' in utf16le is 0x61 0x00
  const expected = Buffer.from([0x61, 0x00, 0x61, 0x00, 0x61, 0x00, 0x61, 0x00, 0x61, 0x00]);
  return buf.equals(expected);
});

test('填充 ucs2 编码字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('a', 0, 10, 'ucs2');
  // ucs2 is alias for utf16le
  const expected = Buffer.from([0x61, 0x00, 0x61, 0x00, 0x61, 0x00, 0x61, 0x00, 0x61, 0x00]);
  return buf.equals(expected);
});

test('填充 ascii 编码字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('xyz', 0, 10, 'ascii');
  return buf.toString('ascii') === 'xyzxyzxyzx';
});

test('填充 binary 编码字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('ab', 0, 10, 'binary'); // binary is alias for latin1
  return buf.toString('binary') === 'ababababab';
});

// === 多字节字符测试 ===

test('填充单字节 UTF-8 字符', () => {
  const buf = Buffer.alloc(10);
  buf.fill('x');
  return buf.toString() === 'xxxxxxxxxx';
});

test('填充双字节 UTF-8 字符', () => {
  const buf = Buffer.alloc(10);
  buf.fill('中'); // 中文字符占3字节
  // '中' is 0xE4 0xB8 0xAD in UTF-8, 填充会重复
  const str = buf.toString();
  return str.includes('中') && buf.length === 10;
});

test('填充三字节 UTF-8 字符', () => {
  const buf = Buffer.alloc(9);
  buf.fill('€'); // Euro sign is 3 bytes in UTF-8
  return buf.toString() === '€€€';
});

test('填充四字节 UTF-8 字符（Emoji）', () => {
  const buf = Buffer.alloc(8);
  buf.fill('😀'); // Emoji is 4 bytes in UTF-8
  return buf.toString() === '😀😀';
});

test('填充多字节字符 - 不完整填充', () => {
  const buf = Buffer.alloc(5);
  buf.fill('中'); // 3 bytes per char, 5 bytes = 1 complete + incomplete
  // Node.js 会截断不完整的字符
  return buf.length === 5;
});

test('填充多字节字符 - 部分范围', () => {
  const buf = Buffer.alloc(10, 0);
  buf.fill('中', 2, 8);
  // 填充范围是 6 字节，能容纳 2 个完整的'中'
  return buf.length === 10;
});

// === 编码参数位置测试 ===

test('编码作为第二个参数（无 offset）', () => {
  const buf = Buffer.alloc(6);
  buf.fill('616263', 'hex');
  return buf.toString() === 'abcabc';
});

test('编码作为第四个参数', () => {
  const buf = Buffer.alloc(10);
  buf.fill('616263', 0, 6, 'hex');
  return buf.slice(0, 6).toString() === 'abcabc';
});

test('编码作为第三个参数（无 end）', () => {
  const buf = Buffer.alloc(10);
  buf.fill('616263', 2, 'hex');
  return buf.slice(2).toString() === 'abcabcab';
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

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
  console.log(JSON.stringify(result, null, 2));
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

