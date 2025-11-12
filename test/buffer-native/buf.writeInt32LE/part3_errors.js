// buf.writeInt32LE() - 错误与异常测试
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

// 越界错误
test('越界：offset + 4 > length', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 2);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('bounds');
  }
});

test('越界：offset 等于 length', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 4);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('bounds');
  }
});

test('越界：offset 大于 length', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, 5);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('bounds');
  }
});

test('越界：负数偏移', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(123, -1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('offset') || e.message.includes('negative');
  }
});

test('越界：小数偏移应抛出错误', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32LE(123, 3.9);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('out of range');
  }
});

test('越界：空 Buffer', () => {
  try {
    const buf = Buffer.allocUnsafe(0);
    buf.writeInt32LE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('bounds');
  }
});

test('越界：1 字节 Buffer', () => {
  try {
    const buf = Buffer.allocUnsafe(1);
    buf.writeInt32LE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('bounds');
  }
});

test('越界：3 字节 Buffer', () => {
  try {
    const buf = Buffer.allocUnsafe(3);
    buf.writeInt32LE(123, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('beyond') || e.message.includes('bounds');
  }
});

// 类型错误
test('this 不是 Buffer：普通对象（允许）', () => {
  const obj = { 0: 0, 1: 0, 2: 0, 3: 0, length: 4 };
  Buffer.prototype.writeInt32LE.call(obj, 123, 0);
  return obj[0] === 123 && obj[1] === 0 && obj[2] === 0 && obj[3] === 0;
});

test('this 不是 Buffer：数组（允许）', () => {
  const arr = [0, 0, 0, 0];
  Buffer.prototype.writeInt32LE.call(arr, 123, 0);
  return arr[0] === 123 && arr[1] === 0 && arr[2] === 0 && arr[3] === 0;
});

test('this 不是 Buffer：null', () => {
  try {
    Buffer.prototype.writeInt32LE.call(null, 123, 0);
    return false;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array') || e.message.includes('this') || e.message.includes('Cannot');
  }
});

test('this 不是 Buffer：undefined', () => {
  try {
    Buffer.prototype.writeInt32LE.call(undefined, 123, 0);
    return false;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array') || e.message.includes('this') || e.message.includes('Cannot');
  }
});

// 参数缺失
test('缺少 value 参数', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE();
    return true;
  } catch (e) {
    return false;
  }
});

test('缺少 offset 参数：默认为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32LE(123);
  return result === 4;
});

// 值溢出测试
test('值超出范围：大于 2^31-1', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(2147483648, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('值超出范围：小于 -2^31', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(-2147483649, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('值超出范围：非常大的正数', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(9999999999, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('值超出范围：非常小的负数', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32LE(-9999999999, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
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
