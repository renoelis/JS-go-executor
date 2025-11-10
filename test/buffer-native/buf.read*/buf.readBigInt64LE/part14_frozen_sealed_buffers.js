// buf.readBigInt64LE() - 冻结和密封的 Buffer 测试
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

// Object.freeze 的 Buffer（Node.js v25 不允许冻结 TypedArray）
test('尝试 Object.freeze Buffer（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(12345n, 0);
    Object.freeze(buf);
    return false;
  } catch (e) {
    // Node.js v25+ 不允许冻结包含元素的 TypedArray
    return e.name === 'TypeError';
  }
});

// Object.seal 的 Buffer（Node.js v25 不允许密封 TypedArray）
test('尝试 Object.seal Buffer（应抛出错误）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(67890n, 0);
    Object.seal(buf);
    return false;
  } catch (e) {
    // Node.js v25+ 不允许密封包含元素的 TypedArray
    return e.name === 'TypeError';
  }
});

// Object.preventExtensions 的 Buffer
test('读取 Object.preventExtensions 的 Buffer', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(99999n, 0);
  Object.preventExtensions(buf);
  return buf.readBigInt64LE(0) === 99999n;
});

// 从冻结的数组创建 Buffer（数组可以冻结）
test('从冻结的数组创建 Buffer', () => {
  const arr = [0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  Object.freeze(arr);
  const buf = Buffer.from(arr);
  return buf.readBigInt64LE(0) === 256n;
});

// 从密封的数组创建 Buffer
test('从密封的数组创建 Buffer', () => {
  const arr = [0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
  Object.seal(arr);
  const buf = Buffer.from(arr);
  return buf.readBigInt64LE(0) === 100n;
});

// 不可扩展的 Buffer 读取
test('不可扩展的 Buffer 读取极值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-9223372036854775808n, 0);
  Object.preventExtensions(buf);
  return buf.readBigInt64LE(0) === -9223372036854775808n;
});

// preventExtensions 后多次读取
test('preventExtensions 后多次读取一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(555n, 0);
  Object.preventExtensions(buf);
  const r1 = buf.readBigInt64LE(0);
  const r2 = buf.readBigInt64LE(0);
  const r3 = buf.readBigInt64LE(0);
  return r1 === 555n && r2 === 555n && r3 === 555n;
});

// preventExtensions 的 slice
test('preventExtensions 的 slice 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(888n, 4);
  const sliced = buf.slice(4, 12);
  Object.preventExtensions(sliced);
  return sliced.readBigInt64LE(0) === 888n;
});

// preventExtensions 的 subarray
test('preventExtensions 的 subarray 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(999n, 8);
  const sub = buf.subarray(8, 16);
  Object.preventExtensions(sub);
  return sub.readBigInt64LE(0) === 999n;
});

// 空 Buffer 尝试 preventExtensions
test('空 Buffer preventExtensions', () => {
  const buf = Buffer.alloc(0);
  Object.preventExtensions(buf);
  return buf.length === 0;
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
