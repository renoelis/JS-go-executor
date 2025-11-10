// buf.slice() - Complete Tests
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


test('无参数', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice();
  return slice.toString() === 'hello';
});

test('指定 start', () => {
  const buf = Buffer.from('hello');
  return buf.slice(2).toString() === 'llo';
});

test('指定 start 和 end', () => {
  const buf = Buffer.from('hello');
  return buf.slice(1, 4).toString() === 'ell';
});

test('负数 start', () => {
  const buf = Buffer.from('hello');
  return buf.slice(-2).toString() === 'lo';
});

test('负数 end', () => {
  const buf = Buffer.from('hello');
  return buf.slice(0, -1).toString() === 'hell';
});

test('end 小于 start', () => {
  const buf = Buffer.from('hello');
  return buf.slice(3, 1).length === 0;
});

test('共享内存', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(0, 2);
  slice[0] = 0x58;
  return buf[0] === 0x58;
});

test('返回 Buffer 实例', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf.slice(1, 3));
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
