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


test('默认 utf8', () => {
  const buf = Buffer.from('hello');
  return buf.toString() === 'hello';
});

test('指定 utf8', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8') === 'hello';
});

test('hex 编码', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.toString('hex') === '010203';
});

test('base64 编码', () => {
  const buf = Buffer.from('hello');
  return buf.toString('base64') === 'aGVsbG8=';
});

test('指定 start', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 2) === 'llo';
});

test('指定 start 和 end', () => {
  const buf = Buffer.from('hello');
  return buf.toString('utf8', 1, 4) === 'ell';
});

test('空 buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.toString() === '';
});

test('中文字符', () => {
  const buf = Buffer.from('你好');
  return buf.toString('utf8') === '你好';
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
