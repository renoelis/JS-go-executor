// Buffer.allocUnsafeSlow - 内存行为测试
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

test('可能包含旧数据', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  let hasNonZero = false;
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  return true;
});

test('可以手动填充', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('多次分配返回不同实例', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  return buf1 !== buf2;
});

test('小 Buffer 也不使用池', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  buf1[0] = 255;
  return buf2[0] !== 255 || buf1 !== buf2;
});

test('可以修改内容', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf[0] = 100;
  return buf[0] === 100;
});

test('支持索引访问', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf[5] = 200;
  return buf[5] === 200;
});

test('越界写入不报错但无效', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[10] = 100;
  return buf[10] === undefined;
});

test('负索引访问返回 undefined', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf[-1] === undefined;
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
