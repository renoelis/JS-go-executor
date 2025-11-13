// buf.allocUnsafeSlow() - Boundary Cases Tests (Fixed Version)
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

// 边界情况测试
test('边界情况 - 长度 0 的缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

test('边界情况 - 长度 1 的缓冲区', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf.length === 1;
});

test('边界情况 - 最大安全整数边界', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(Number.MAX_SAFE_INTEGER);
    return false; // 应该抛出错误
  } catch (e) {
    // Node.js v25.0.0 实际错误信息: "Array buffer allocation failed"
    return e.message.includes('allocation') && e.message.includes('failed');
  }
});

test('边界情况 - 8KB边界（池化阈值）', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  return buf.length === 8192;
});

test('边界情况 - 16KB边界', () => {
  const buf = Buffer.allocUnsafeSlow(16384);
  return buf.length === 16384;
});

test('边界情况 - 1MB边界', () => {
  const buf = Buffer.allocUnsafeSlow(1048576);
  return buf.length === 1048576;
});

test('边界情况 - 参数接受但忽略填充', () => {
  const buf = Buffer.allocUnsafeSlow(10, 'test');
  return buf.length === 10;
});

test('边界情况 - 三参数调用', () => {
  const buf = Buffer.allocUnsafeSlow(10, 'test', 'utf8');
  return buf.length === 10;
});

test('边界情况 - 科学计数法大小', () => {
  const buf = Buffer.allocUnsafeSlow(1e3);
  return buf.length === 1000;
});

test('边界情况 - 十六进制大小', () => {
  const buf = Buffer.allocUnsafeSlow(0xFF);
  return buf.length === 255;
});

test('边界情况 - 内存可写性验证', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf[0] = 65;
  buf[9] = 90;
  return buf[0] === 65 && buf[9] === 90;
});

test('边界情况 - Buffer特性验证', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf instanceof Buffer && Buffer.isBuffer(buf);
});

test('边界情况 - TypedArray特性', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.BYTES_PER_ELEMENT === 1 && typeof buf[Symbol.iterator] === 'function';
});

test('边界情况 - 迭代器支持', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 1; buf[1] = 2; buf[2] = 3;
  const arr = Array.from(buf);
  return arr.length === 3 && arr[0] === 1 && arr[1] === 2 && arr[2] === 3;
});

test('边界情况 - for...of支持', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 10; buf[1] = 20; buf[2] = 30;
  const values = [];
  for (const val of buf) {
    values.push(val);
  }
  return values.length === 3 && values[0] === 10 && values[1] === 20 && values[2] === 30;
});

test('边界情况 - slice方法支持', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const sliced = buf.slice(2, 5);
  return sliced.length === 3 && Buffer.isBuffer(sliced);
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
