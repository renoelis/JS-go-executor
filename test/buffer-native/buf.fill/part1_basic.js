// buf.fill() - Complete Tests
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

test('填充单个字节', () => {
  const buf = Buffer.alloc(5);
  buf.fill(0xFF);
  return buf.every(b => b === 0xFF);
});

test('填充字符串', () => {
  const buf = Buffer.alloc(10);
  buf.fill('abc');
  return buf.toString() === 'abcabcabca';
});

test('填充 Buffer', () => {
  const buf = Buffer.alloc(10);
  buf.fill(Buffer.from('ab'));
  return buf.toString() === 'ababababab';
});

test('指定 offset', () => {
  const buf = Buffer.alloc(10, 0);
  buf.fill('x', 5);
  return buf.toString() === '\x00\x00\x00\x00\x00xxxxx';
});

test('指定 offset 和 end', () => {
  const buf = Buffer.alloc(10, 0);
  buf.fill('x', 2, 5);
  return buf.slice(2, 5).every(b => b === 0x78);
});

test('填充编码字符串', () => {
  const buf = Buffer.alloc(6);
  buf.fill('aGVsbG8', 'base64');
  // 'aGVsbG8' 解码为 'hello'，填充6字节会重复：'helloh'
  return buf.toString('base64') === 'aGVsbG9o';
});

test('返回 this', () => {
  const buf = Buffer.alloc(5);
  const result = buf.fill(0);
  return result === buf;
});

test('offset 超出范围 - 静默处理', () => {
  const buf = Buffer.alloc(5, 0xFF);
  // offset 超出时，Node.js 不会抛出错误，而是不做任何操作
  buf.fill(0, 10);
  return buf.every(b => b === 0xFF);
});

test('end 小于 offset - 静默处理', () => {
  const buf = Buffer.alloc(5, 0xFF);
  // end < offset 时，Node.js 不会抛出错误，而是不做任何操作
  buf.fill(0, 3, 2);
  return buf.every(b => b === 0xFF);
});

test('空范围填充', () => {
  const buf = Buffer.alloc(5, 0);
  buf.fill(0xFF, 2, 2);
  return buf.every(b => b === 0);
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
