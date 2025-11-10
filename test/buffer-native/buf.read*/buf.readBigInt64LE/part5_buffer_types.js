// buf.readBigInt64LE() - 不同 Buffer 类型测试
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

// 从 Uint8Array 创建的 Buffer
test('从 Uint8Array 创建的 Buffer', () => {
  const arr = new Uint8Array([0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const buf = Buffer.from(arr);
  return buf.readBigInt64LE(0) === 100n;
});

// 从 ArrayBuffer 创建的 Buffer
test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setBigInt64(0, 12345n, true); // true = little-endian
  const buf = Buffer.from(ab);
  return buf.readBigInt64LE(0) === 12345n;
});

// 从数组创建的 Buffer
test('从数组创建的 Buffer', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64LE(0) === 256n;
});

// Buffer.alloc 创建
test('Buffer.alloc 创建并写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(999n, 0);
  return buf.readBigInt64LE(0) === 999n;
});

// Buffer.allocUnsafe 创建
test('Buffer.allocUnsafe 创建并写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(-888n, 0);
  return buf.readBigInt64LE(0) === -888n;
});

// slice 后的 Buffer
test('slice 后的 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(777n, 4);
  const sliced = buf.slice(4, 12);
  return sliced.readBigInt64LE(0) === 777n;
});

// subarray 后的 Buffer
test('subarray 后的 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(666n, 8);
  const sub = buf.subarray(8, 16);
  return sub.readBigInt64LE(0) === 666n;
});

// 从 Buffer.concat 创建
test('从 Buffer.concat 创建', () => {
  const buf1 = Buffer.from([0x0A, 0x00, 0x00, 0x00]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readBigInt64LE(0) === 10n;
});

// 空 Buffer（长度不足）
test('空 Buffer 读取（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 长度不足的 Buffer
test('长度为 7 的 Buffer（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(7);
    buf.readBigInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 恰好 8 字节的 Buffer
test('恰好 8 字节的 Buffer', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(123n, 0);
  return buf.readBigInt64LE(0) === 123n;
});

// 超过 8 字节的 Buffer，从中间读取
test('16 字节 Buffer，从 offset=4 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(555n, 4);
  return buf.readBigInt64LE(4) === 555n;
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
