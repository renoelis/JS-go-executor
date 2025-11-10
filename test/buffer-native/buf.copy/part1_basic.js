// buf.copy() - Complete Tests
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

test('完整复制', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2);
  return buf2.toString() === 'hello';
});

test('指定 targetStart', () => {
  const buf1 = Buffer.from('world');
  const buf2 = Buffer.alloc(10, 0);
  buf1.copy(buf2, 5);
  return buf2.toString() === '\x00\x00\x00\x00\x00world';
});

test('指定 sourceStart', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(3);
  buf1.copy(buf2, 0, 2);
  return buf2.toString() === 'llo';
});

test('指定 sourceStart 和 sourceEnd', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(2);
  buf1.copy(buf2, 0, 1, 3);
  return buf2.toString() === 'el';
});

test('返回复制的字节数', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2);
  return bytes === 5;
});

test('目标 buffer 太小', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(3);
  const bytes = buf1.copy(buf2);
  return bytes === 3 && buf2.toString() === 'hel';
});

test('sourceEnd 超出范围', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  const bytes = buf1.copy(buf2, 0, 0, 100);
  return bytes === 5;
});

test('复制到自身', () => {
  const buf = Buffer.from('hello');
  buf.copy(buf, 1, 0, 3);
  return buf.toString() === 'hhelo';
});

test('空范围复制', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(5, 0);
  const bytes = buf1.copy(buf2, 0, 2, 2);
  return bytes === 0;
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
