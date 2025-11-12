// buf.writeFloatBE/LE() - 错误和异常测试
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

// offset 越界
test('writeFloatBE offset 超出范围抛出错误', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(1.5, 5);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeFloatLE offset 超出范围抛出错误', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(1.5, 5);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeFloatBE offset 为负数抛出错误', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(1.5, -1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset');
  }
});

test('writeFloatLE offset 为负数抛出错误', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(1.5, -1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset');
  }
});

test('writeFloatBE offset + 4 超出 buffer 长度', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(1.5, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeFloatLE offset + 4 超出 buffer 长度', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(1.5, 1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeFloatBE offset 刚好等于 buffer 长度', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatBE(1.5, 4);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeFloatLE offset 刚好等于 buffer 长度', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeFloatLE(1.5, 4);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeFloatBE 空 buffer 写入抛出错误', () => {
  const buf = Buffer.allocUnsafe(0);
  try {
    buf.writeFloatBE(1.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

test('writeFloatLE 空 buffer 写入抛出错误', () => {
  const buf = Buffer.allocUnsafe(0);
  try {
    buf.writeFloatLE(1.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('buffer bounds') || e.message.includes('out of range') || e.message.includes('beyond buffer');
  }
});

// this 绑定错误
test('writeFloatBE this 不是 Buffer 抛出错误', () => {
  try {
    const fn = Buffer.prototype.writeFloatBE;
    fn.call({}, 1.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

test('writeFloatLE this 不是 Buffer 抛出错误', () => {
  try {
    const fn = Buffer.prototype.writeFloatLE;
    fn.call({}, 1.5, 0);
    return false;
  } catch (e) {
    return e.message.includes('must be') || e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

test('writeFloatBE this 为 null 抛出错误', () => {
  try {
    const fn = Buffer.prototype.writeFloatBE;
    fn.call(null, 1.5, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE this 为 null 抛出错误', () => {
  try {
    const fn = Buffer.prototype.writeFloatLE;
    fn.call(null, 1.5, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatBE this 为 undefined 抛出错误', () => {
  try {
    const fn = Buffer.prototype.writeFloatBE;
    fn.call(undefined, 1.5, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeFloatLE this 为 undefined 抛出错误', () => {
  try {
    const fn = Buffer.prototype.writeFloatLE;
    fn.call(undefined, 1.5, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// 参数缺失
test('writeFloatBE 缺少 value 参数会写入 undefined 转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatBE();
  const value = buf.readFloatBE(0);
  return isNaN(value) && result === 4;
});

test('writeFloatLE 缺少 value 参数会写入 undefined 转为 NaN', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeFloatLE();
  const value = buf.readFloatLE(0);
  return isNaN(value) && result === 4;
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
