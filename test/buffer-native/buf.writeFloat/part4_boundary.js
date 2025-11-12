// buf.writeFloatBE/LE() - 边界值测试
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

// offset 边界
test('writeFloatBE offset=0 是有效的', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(5.5, 0);
  return result === 4;
});

test('writeFloatLE offset=0 是有效的', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(5.5, 0);
  return result === 4;
});

test('writeFloatBE 最大有效 offset', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.writeFloatBE(5.5, 6);
  return result === 10;
});

test('writeFloatLE 最大有效 offset', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.writeFloatLE(5.5, 6);
  return result === 10;
});

test('writeFloatBE 最大有效 offset + 1 应抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatBE(5.5, 7);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE 最大有效 offset + 1 应抛出错误', () => {
  const buf = Buffer.allocUnsafe(10);
  try {
    buf.writeFloatLE(5.5, 7);
    return false;
  } catch (e) {
    return true;
  }
});

// Buffer 长度边界
test('writeFloatBE 长度为 4 的 buffer offset=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE(8.5, 0);
  return result === 4 && buf.readFloatBE(0) === 8.5;
});

test('writeFloatLE 长度为 4 的 buffer offset=0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE(8.5, 0);
  return result === 4 && buf.readFloatLE(0) === 8.5;
});

test('writeFloatBE 长度为 5 的 buffer offset=0', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeFloatBE(8.5, 0);
  return result === 4;
});

test('writeFloatLE 长度为 5 的 buffer offset=0', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeFloatLE(8.5, 0);
  return result === 4;
});

test('writeFloatBE 长度为 5 的 buffer offset=1', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeFloatBE(8.5, 1);
  return result === 5;
});

test('writeFloatLE 长度为 5 的 buffer offset=1', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeFloatLE(8.5, 1);
  return result === 5;
});

test('writeFloatBE 长度为 3 的 buffer 不能写入', () => {
  const buf = Buffer.allocUnsafe(3);
  try {
    buf.writeFloatBE(8.5, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE 长度为 3 的 buffer 不能写入', () => {
  const buf = Buffer.allocUnsafe(3);
  try {
    buf.writeFloatLE(8.5, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// offset 为 0 的特殊情况
test('writeFloatBE offset 显式为 0 和省略 offset 行为相同', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatBE(6.5, 0);
  buf2.writeFloatBE(6.5);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1] && buf1[2] === buf2[2] && buf1[3] === buf2[3];
});

test('writeFloatLE offset 显式为 0 和省略 offset 行为相同', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeFloatLE(6.5, 0);
  buf2.writeFloatLE(6.5);
  return buf1[0] === buf2[0] && buf1[1] === buf2[1] && buf1[2] === buf2[2] && buf1[3] === buf2[3];
});

// 大 buffer
test('writeFloatBE 在大 buffer 中间写入', () => {
  const buf = Buffer.allocUnsafe(1000);
  buf.fill(0);
  buf.writeFloatBE(12.34, 500);
  const value = buf.readFloatBE(500);
  return Math.abs(value - 12.34) < 0.01;
});

test('writeFloatLE 在大 buffer 中间写入', () => {
  const buf = Buffer.allocUnsafe(1000);
  buf.fill(0);
  buf.writeFloatLE(12.34, 500);
  const value = buf.readFloatLE(500);
  return Math.abs(value - 12.34) < 0.01;
});

test('writeFloatBE 在大 buffer 末尾写入', () => {
  const buf = Buffer.allocUnsafe(1000);
  buf.fill(0);
  const result = buf.writeFloatBE(56.78, 996);
  return result === 1000;
});

test('writeFloatLE 在大 buffer 末尾写入', () => {
  const buf = Buffer.allocUnsafe(1000);
  buf.fill(0);
  const result = buf.writeFloatLE(56.78, 996);
  return result === 1000;
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
