// Buffer.from() - Part 1: Basic Functionality Tests
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

test('从字符串创建 - UTF-8', () => {
  const buf = Buffer.from('hello world', 'utf8');
  return buf.toString('utf8') === 'hello world';
});

test('从数组创建', () => {
  const buf = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  return buf.toString('utf8') === 'hello';
});

test('从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.length === 10;
});

test('从 Buffer 创建（复制）', () => {
  const original = Buffer.from('test');
  const copy = Buffer.from(original);
  return copy.equals(original) && copy !== original;
});

test('从 Uint8Array 创建', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.from(uint8);
  return buf.length === 5 && buf[0] === 1 && buf[4] === 5;
});

test('从字符串 - hex 编码', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.toString('utf8') === 'Hello';
});

test('从字符串 - base64 编码', () => {
  const buf = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  return buf.toString('utf8') === 'Hello World';
});

test('从空数组', () => {
  const buf = Buffer.from([]);
  return buf.length === 0;
});

test('从空字符串', () => {
  const buf = Buffer.from('');
  return buf.length === 0;
});

test('从 ArrayBuffer - 带 offset 和 length', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[2] = 0x41;
  view[3] = 0x42;
  const buf = Buffer.from(ab, 2, 2);
  return buf.length === 2 && buf[0] === 0x41 && buf[1] === 0x42;
});

test('多字节 UTF-8 字符', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  return buf.toString('utf8') === '你好世界';
});

test('Emoji 字符', () => {
  const buf = Buffer.from('😀🎉', 'utf8');
  return buf.toString('utf8') === '😀🎉';
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
