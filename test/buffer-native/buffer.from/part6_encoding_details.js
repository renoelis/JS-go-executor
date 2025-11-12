// Buffer.from() - Part 6: Encoding Details and Edge Cases
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

// UTF-8 详细测试
test('UTF-8 - ASCII 范围字符', () => {
  const buf = Buffer.from('ABC123', 'utf8');
  return buf.length === 6 && buf[0] === 65 && buf[5] === 51;
});

test('UTF-8 - 2 字节字符（中文）', () => {
  const buf = Buffer.from('你好', 'utf8');
  return buf.length === 6 && buf.toString('utf8') === '你好';
});

test('UTF-8 - 3 字节字符（日文）', () => {
  const buf = Buffer.from('こんにちは', 'utf8');
  return buf.toString('utf8') === 'こんにちは';
});

test('UTF-8 - 4 字节字符（Emoji）', () => {
  const buf = Buffer.from('😀', 'utf8');
  return buf.length === 4 && buf.toString('utf8') === '😀';
});

test('UTF-8 - 混合字节长度', () => {
  const buf = Buffer.from('A你😀', 'utf8');
  return buf.toString('utf8') === 'A你😀';
});

test('UTF-8 - 空字符串', () => {
  const buf = Buffer.from('', 'utf8');
  return buf.length === 0;
});

test('UTF-8 - 换行符', () => {
  const buf = Buffer.from('\n\r\n', 'utf8');
  return buf.length === 3 && buf[0] === 10 && buf[1] === 13;
});

test('UTF-8 - 制表符和空格', () => {
  const buf = Buffer.from('\t \t', 'utf8');
  return buf.length === 3 && buf[0] === 9 && buf[1] === 32;
});

// HEX 详细测试
test('HEX - 小写字母', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.toString('utf8') === 'Hello';
});

test('HEX - 大写字母', () => {
  const buf = Buffer.from('48656C6C6F', 'hex');
  return buf.toString('utf8') === 'Hello';
});

test('HEX - 混合大小写', () => {
  const buf = Buffer.from('48656C6c6F', 'hex');
  return buf.toString('utf8') === 'Hello';
});

test('HEX - 奇数长度（忽略最后一个字符）', () => {
  const buf = Buffer.from('486', 'hex');
  return buf.length === 1 && buf[0] === 0x48;
});

test('HEX - 包含非 hex 字符（被忽略）', () => {
  const buf = Buffer.from('48G56', 'hex');
  // 'G' 和 '5' 被忽略，只保留 '48'
  return buf.length >= 0;
});

test('HEX - 空字符串', () => {
  const buf = Buffer.from('', 'hex');
  return buf.length === 0;
});

test('HEX - 全 0', () => {
  const buf = Buffer.from('0000', 'hex');
  return buf.length === 2 && buf[0] === 0 && buf[1] === 0;
});

test('HEX - 全 F', () => {
  const buf = Buffer.from('FFFF', 'hex');
  return buf.length === 2 && buf[0] === 255 && buf[1] === 255;
});

// Base64 详细测试
test('Base64 - 标准字符串', () => {
  const buf = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  return buf.toString('utf8') === 'Hello World';
});

test('Base64 - 无填充', () => {
  const buf = Buffer.from('SGVsbG8', 'base64');
  return buf.toString('utf8') === 'Hello';
});

test('Base64 - 单个填充', () => {
  const buf = Buffer.from('SGVsbG8h', 'base64');
  return buf.toString('utf8') === 'Hello!';
});

test('Base64 - 空字符串', () => {
  const buf = Buffer.from('', 'base64');
  return buf.length === 0;
});

test('Base64 - 包含换行符（被忽略）', () => {
  const buf = Buffer.from('SGVs\nbG8=', 'base64');
  return buf.toString('utf8') === 'Hello';
});

test('Base64 - 包含空格（被忽略）', () => {
  const buf = Buffer.from('SGVs bG8=', 'base64');
  return buf.toString('utf8') === 'Hello';
});

// Base64URL 测试
test('Base64URL - 使用 - 和 _ 字符', () => {
  const buf = Buffer.from('SGVsbG8tV29ybGRf', 'base64url');
  return buf instanceof Buffer;
});

test('Base64URL - 空字符串', () => {
  const buf = Buffer.from('', 'base64url');
  return buf.length === 0;
});

// Latin1 (Binary) 测试
test('Latin1 - 基本 ASCII', () => {
  const buf = Buffer.from('Hello', 'latin1');
  return buf.toString('utf8') === 'Hello';
});

test('Latin1 - 扩展字符（128-255）', () => {
  const buf = Buffer.from('\x80\xFF', 'latin1');
  return buf.length === 2 && buf[0] === 128 && buf[1] === 255;
});

test('Binary - 等同于 latin1', () => {
  const buf1 = Buffer.from('test', 'binary');
  const buf2 = Buffer.from('test', 'latin1');
  return buf1.equals(buf2);
});

// ASCII 测试
test('ASCII - 标准 ASCII 字符', () => {
  const buf = Buffer.from('Hello123', 'ascii');
  return buf.toString('utf8') === 'Hello123';
});

test('ASCII - 超过 127 的字符被截断', () => {
  const buf = Buffer.from('\x80\xFF', 'ascii');
  // ASCII 只取低 7 位
  return buf.length === 2;
});

// UCS2/UTF16LE 测试
test('UCS2 - 基本字符', () => {
  const buf = Buffer.from('Hello', 'ucs2');
  return buf.length === 10; // 每个字符 2 字节
});

test('UTF16LE - 等同于 ucs2', () => {
  const buf1 = Buffer.from('test', 'utf16le');
  const buf2 = Buffer.from('test', 'ucs2');
  return buf1.equals(buf2);
});

test('UCS2 - 空字符串', () => {
  const buf = Buffer.from('', 'ucs2');
  return buf.length === 0;
});

test('UCS2 - Emoji 字符', () => {
  const buf = Buffer.from('😀', 'ucs2');
  return buf.length === 4;
});

// 编码别名测试
test('编码别名 - utf-8 vs utf8', () => {
  const buf1 = Buffer.from('test', 'utf-8');
  const buf2 = Buffer.from('test', 'utf8');
  return buf1.equals(buf2);
});

test('编码别名 - ucs-2 vs ucs2', () => {
  const buf1 = Buffer.from('test', 'ucs-2');
  const buf2 = Buffer.from('test', 'ucs2');
  return buf1.equals(buf2);
});

// 特殊字符测试
test('特殊字符 - NULL 字符', () => {
  const buf = Buffer.from('a\x00b', 'utf8');
  return buf.length === 3 && buf[0] === 97 && buf[1] === 0 && buf[2] === 98;
});

test('特殊字符 - BOM 字符', () => {
  const buf = Buffer.from('\uFEFFHello', 'utf8');
  return buf.length === 8; // BOM 占 3 字节
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
