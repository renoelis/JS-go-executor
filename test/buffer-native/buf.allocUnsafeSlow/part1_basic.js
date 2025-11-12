const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ name, passed: result, details: result ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, passed: false, error: e.message, stack: e.stack });
  }
}

test('基本功能 - 分配空缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0 && buf instanceof Buffer;
});

test('基本功能 - 分配小型缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.length === 10 && buf instanceof Buffer;
});

test('基本功能 - 分配中型缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(1024);
  return buf.length === 1024 && buf instanceof Buffer;
});

test('基本功能 - 分配大型缓冲区（4KB+）', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  return buf.length === 8192 && buf instanceof Buffer;
});

test('基本功能 - 三个参数调用', () => {
  const buf = Buffer.allocUnsafeSlow(10, 65, 'ascii');
  return buf.length === 10 && buf[0] === 65;
});

test('基本功能 - 两个参数调用（fill）', () => {
  const buf = Buffer.allocUnsafeSlow(10, 65);
  return buf.length === 10 && buf.every(b => b === 65);
});

test('基本功能 - fill 为数字 0', () => {
  const buf = Buffer.allocUnsafeSlow(10, 0);
  return buf.length === 10 && buf.every(b => b === 0);
});

test('基本功能 - fill 为字符串', () => {
  const buf = Buffer.allocUnsafeSlow(5, 'hello');
  return buf.length === 5 && buf.toString() === 'hello';
});

test('基本功能 - fill 为 Buffer', () => {
  const fillBuf = Buffer.from('ABC');
  const buf = Buffer.allocUnsafeSlow(9, fillBuf);
  return buf.length === 9 && buf.toString() === 'ABCABCABC';
});

test('基本功能 - fill 为 Uint8Array', () => {
  const fillArr = new Uint8Array([65, 66, 67]);
  const buf = Buffer.allocUnsafeSlow(6, fillArr);
  return buf.length === 6 && buf.toString() === 'ABCABC';
});

test('基本功能 - encoding 参数生效', () => {
  const buf = Buffer.allocUnsafeSlow(8, Buffer.from('hello'));
  return buf.length === 8 && buf.toString() === 'hello';
});

test('基本功能 - 返回的 Buffer 可以正常修改', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 72; buf[1] = 105; buf[2] = 33;
  return buf.toString('ascii', 0, 3) === 'Hi!';
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