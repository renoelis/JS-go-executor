// buf.toString() - Complete Tests
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

test('UTF-8 编码', () => {
  const buf = Buffer.from('hello world');
  return buf.toString('utf8') === 'hello world';
});

test('hex 编码', () => {
  const buf = Buffer.from('hello world');
  return buf.toString('hex') === '68656c6c6f20776f726c64';
});

test('base64 编码', () => {
  const buf = Buffer.from('hello world');
  return buf.toString('base64') === 'aGVsbG8gd29ybGQ=';
});

test('带 start 参数', () => {
  const buf = Buffer.from('hello world');
  return buf.toString('utf8', 6) === 'world';
});

test('带 start 和 end 参数', () => {
  const buf = Buffer.from('hello world');
  return buf.toString('utf8', 0, 5) === 'hello';
});

test('默认编码（UTF-8）', () => {
  const buf = Buffer.from('test');
  return buf.toString() === 'test';
});

test('latin1 编码', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.toString('latin1') === 'hello';
});

test('ascii 编码', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.toString('ascii') === 'hello';
});

test('utf16le 编码', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.toString('utf16le') === 'hello';
});

test('空 Buffer', () => {
  const buf = Buffer.from('');
  return buf.toString() === '';
});

test('多字节字符', () => {
  const buf = Buffer.from('你好');
  return buf.toString('utf8') === '你好';
});

test('Emoji', () => {
  const buf = Buffer.from('😀');
  return buf.toString('utf8') === '😀';
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
