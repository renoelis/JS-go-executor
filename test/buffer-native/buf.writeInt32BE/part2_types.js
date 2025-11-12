// buf.writeInt32BE() - 类型与兼容性测试
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

// 值类型测试
test('整数：正整数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(42, 0);
  return result === 4 && buf[3] === 42;
});

test('整数：负整数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(-42, 0);
  return result === 4;
});

test('浮点数：截断为整数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(123.456, 0);
  return result === 4;
});

test('浮点数：负浮点数截断', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(-123.789, 0);
  return result === 4;
});

test('字符串数字：会转换', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE('123', 0);
  return result === 4;
});

test('布尔值：true 转为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(true, 0);
  return result === 4 && buf[3] === 1;
});

test('布尔值：false 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(false, 0);
  return result === 4 && buf[3] === 0;
});

test('null：转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(null, 0);
  return result === 4 && buf[3] === 0;
});

test('undefined：转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(undefined, 0);
  return result === 4;
});

test('NaN：转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(NaN, 0);
  return result === 4 && buf[3] === 0;
});

test('Infinity：应抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

test('-Infinity：应抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(-Infinity, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('out of range');
  }
});

// 偏移量类型测试
test('偏移量：整数偏移', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeInt32BE(123, 2);
  return result === 6;
});

test('偏移量：零偏移', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(123, 0);
  return result === 4;
});

test('偏移量：字符串应抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(123, '2');
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('偏移量：浮点数应抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafe(8);
    buf.writeInt32BE(123, 2.9);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.message.includes('integer');
  }
});

test('偏移量：null 应抛出 TypeError', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeInt32BE(123, null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.message.includes('type');
  }
});

test('偏移量：undefined 转为 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(123, undefined);
  return result === 4;
});

// Buffer 子类型测试
test('Uint8Array：可写入', () => {
  const arr = new Uint8Array(4);
  const buf = Buffer.from(arr.buffer);
  const result = buf.writeInt32BE(0x12345678, 0);
  return result === 4 && buf[0] === 0x12;
});

test('Buffer.alloc：可写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt32BE(123, 0);
  return result === 4;
});

test('Buffer.allocUnsafe：可写入', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32BE(123, 0);
  return result === 4;
});

test('Buffer.from：可写入', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  const result = buf.writeInt32BE(123, 0);
  return result === 4;
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
