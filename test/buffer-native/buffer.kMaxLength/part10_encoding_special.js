// buffer.kMaxLength - Part 10: Encoding and Special Cases
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 多种编码的 Buffer.from 测试
test('Buffer.from 使用 utf8 编码', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.length === 5 && buf.toString() === 'hello';
});

test('Buffer.from 使用 utf16le 编码', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.length === 10;
});

test('Buffer.from 使用 latin1 编码', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.length === 5;
});

test('Buffer.from 使用 base64 编码', () => {
  const buf = Buffer.from('aGVsbG8=', 'base64');
  return buf.toString('utf8') === 'hello';
});

test('Buffer.from 使用 base64url 编码', () => {
  const buf = Buffer.from('aGVsbG8', 'base64url');
  return buf.toString('utf8') === 'hello';
});

test('Buffer.from 使用 hex 编码', () => {
  const buf = Buffer.from('68656c6c6f', 'hex');
  return buf.toString('utf8') === 'hello';
});

test('Buffer.from 使用 binary 编码（已弃用但仍支持）', () => {
  const buf = Buffer.from('hello', 'binary');
  return buf.length === 5;
});

test('Buffer.from 使用 ascii 编码', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.length === 5;
});

// toString 使用不同编码
test('buffer.toString("utf16le")', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.toString('utf16le') === 'hello';
});

test('buffer.toString("latin1")', () => {
  const buf = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  return buf.toString('latin1') === 'hello';
});

test('buffer.toString("ascii")', () => {
  const buf = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  return buf.toString('ascii') === 'hello';
});

test('buffer.toString("base64url")', () => {
  const buf = Buffer.from('hello');
  const result = buf.toString('base64url');
  return typeof result === 'string' && result.length > 0;
});

// Buffer.byteLength 不同编码
test('Buffer.byteLength utf8', () => {
  return Buffer.byteLength('hello', 'utf8') === 5;
});

test('Buffer.byteLength utf16le', () => {
  return Buffer.byteLength('hello', 'utf16le') === 10;
});

test('Buffer.byteLength base64', () => {
  return Buffer.byteLength('aGVsbG8=', 'base64') === 5;
});

test('Buffer.byteLength latin1', () => {
  return Buffer.byteLength('hello', 'latin1') === 5;
});

// 特殊字符和 Unicode
test('Buffer.from 处理中文字符', () => {
  const buf = Buffer.from('你好世界');
  return buf.length === 12;
});

test('Buffer.from 处理日文字符', () => {
  const buf = Buffer.from('こんにちは');
  return buf.length === 15;
});

test('Buffer.from 处理特殊符号', () => {
  const buf = Buffer.from('★♥♦♣');
  return buf.length > 4;
});

test('Buffer.from 处理零宽字符', () => {
  const buf = Buffer.from('\u200B\u200C\u200D');
  return buf.length === 9;
});

// Buffer.from 数组和类数组对象
test('Buffer.from 接受普通数组', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.length === 5 && buf[0] === 1;
});

test('Buffer.from 数组元素超过 255 会取模', () => {
  const buf = Buffer.from([256, 257, 258]);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('Buffer.from 数组元素为负数', () => {
  const buf = Buffer.from([-1, -2, -3]);
  return buf[0] === 255 && buf[1] === 254 && buf[2] === 253;
});

test('Buffer.from 接受类数组对象', () => {
  const arrayLike = { 0: 1, 1: 2, 2: 3, length: 3 };
  const buf = Buffer.from(arrayLike);
  return buf.length === 3;
});

// Buffer.from 另一个 Buffer
test('Buffer.from 复制另一个 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  buf2[0] = 99;
  return buf1[0] === 1 && buf2[0] === 99;
});

test('Buffer.from 复制 Uint8Array', () => {
  const u8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from(u8);
  return buf.length === 3 && buf[0] === 1;
});

// Buffer.alloc 的 fill 参数
test('Buffer.alloc 使用字符串 fill', () => {
  const buf = Buffer.alloc(10, 'a');
  return buf[0] === 0x61 && buf[9] === 0x61;
});

test('Buffer.alloc 使用数字 fill', () => {
  const buf = Buffer.alloc(10, 255);
  return buf[0] === 255 && buf[9] === 255;
});

test('Buffer.alloc 使用 Buffer fill', () => {
  const fill = Buffer.from([1, 2, 3]);
  const buf = Buffer.alloc(10, fill);
  return buf[0] === 1 && buf[3] === 1 && buf[9] === 1;
});

test('Buffer.alloc 使用字符串 fill 和编码', () => {
  const buf = Buffer.alloc(10, 'hello', 'utf8');
  return buf[0] === 0x68;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
