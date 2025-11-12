// buf.writeBigInt64BE/LE - Different Input Types Tests
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

// 在 Uint8Array 上调用
test('writeBigInt64BE - 在 Uint8Array 上调用', () => {
  try {
    const arr = new Uint8Array(8);
    Buffer.prototype.writeBigInt64BE.call(arr, 0x0102030405060708n, 0);
    return arr[0] === 0x01 && arr[7] === 0x08;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

test('writeBigInt64LE - 在 Uint8Array 上调用', () => {
  try {
    const arr = new Uint8Array(8);
    Buffer.prototype.writeBigInt64LE.call(arr, 0x0102030405060708n, 0);
    return arr[0] === 0x08 && arr[7] === 0x01;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

// 在其他 TypedArray 上调用
test('writeBigInt64BE - 在 Uint16Array 视图上调用', () => {
  try {
    const buffer = new ArrayBuffer(8);
    const view = new Uint16Array(buffer);
    const uint8View = new Uint8Array(buffer);

    Buffer.prototype.writeBigInt64BE.call(uint8View, 0x0102030405060708n, 0);
    return uint8View[0] === 0x01 && uint8View[7] === 0x08;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

test('writeBigInt64LE - 在 Uint16Array 视图上调用', () => {
  try {
    const buffer = new ArrayBuffer(8);
    const view = new Uint16Array(buffer);
    const uint8View = new Uint8Array(buffer);

    Buffer.prototype.writeBigInt64LE.call(uint8View, 0x0102030405060708n, 0);
    return uint8View[0] === 0x08 && uint8View[7] === 0x01;
  } catch (e) {
    return e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

// Buffer.from 创建的 Buffer
test('writeBigInt64BE - Buffer.from array', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
  buf.writeBigInt64BE(0x1122334455667788n, 0);
  return buf[0] === 0x11 && buf[7] === 0x88;
});

test('writeBigInt64BE - Buffer.from string', () => {
  const buf = Buffer.from('0000000000000000', 'hex');
  buf.writeBigInt64BE(0x1122334455667788n, 0);
  return buf[0] === 0x11 && buf[7] === 0x88;
});

test('writeBigInt64LE - Buffer.from array', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
  buf.writeBigInt64LE(0x1122334455667788n, 0);
  return buf[0] === 0x88 && buf[7] === 0x11;
});

test('writeBigInt64LE - Buffer.from string', () => {
  const buf = Buffer.from('0000000000000000', 'hex');
  buf.writeBigInt64LE(0x1122334455667788n, 0);
  return buf[0] === 0x88 && buf[7] === 0x11;
});

// Buffer.alloc vs Buffer.allocUnsafe
test('writeBigInt64BE - Buffer.alloc', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x7ABBCCDDEEFF0011n, 0);
  return buf[0] === 0x7A && buf[7] === 0x11;
});

test('writeBigInt64BE - Buffer.allocUnsafe', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64BE(0x7ABBCCDDEEFF0011n, 0);
  return buf[0] === 0x7A && buf[7] === 0x11;
});

test('writeBigInt64LE - Buffer.alloc', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x7ABBCCDDEEFF0011n, 0);
  return buf[0] === 0x11 && buf[7] === 0x7A;
});

test('writeBigInt64LE - Buffer.allocUnsafe', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64LE(0x7ABBCCDDEEFF0011n, 0);
  return buf[0] === 0x11 && buf[7] === 0x7A;
});

// Buffer.slice 创建的视图
test('writeBigInt64BE - 在 slice 视图上写入', () => {
  const original = Buffer.alloc(16);
  const sliced = original.slice(4, 12);
  sliced.writeBigInt64BE(0x1122334455667788n, 0);

  return original[4] === 0x11 && original[11] === 0x88;
});

test('writeBigInt64LE - 在 slice 视图上写入', () => {
  const original = Buffer.alloc(16);
  const sliced = original.slice(4, 12);
  sliced.writeBigInt64LE(0x1122334455667788n, 0);

  return original[4] === 0x88 && original[11] === 0x11;
});

// subarray 创建的视图
test('writeBigInt64BE - 在 subarray 视图上写入', () => {
  const original = Buffer.alloc(16);
  const sub = original.subarray(4, 12);
  sub.writeBigInt64BE(0x1122334455667788n, 0);

  return original[4] === 0x11 && original[11] === 0x88;
});

test('writeBigInt64LE - 在 subarray 视图上写入', () => {
  const original = Buffer.alloc(16);
  const sub = original.subarray(4, 12);
  sub.writeBigInt64LE(0x1122334455667788n, 0);

  return original[4] === 0x88 && original[11] === 0x11;
});

// 共享底层 ArrayBuffer 的 Buffer
test('writeBigInt64BE - 共享 ArrayBuffer 的多个视图', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);

  buf1.writeBigInt64BE(0x1111111111111111n, 0);
  buf2.writeBigInt64BE(0x2222222222222222n, 0);

  const view = new Uint8Array(ab);
  return view[0] === 0x11 && view[8] === 0x22;
});

test('writeBigInt64LE - 共享 ArrayBuffer 的多个视图', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);

  buf1.writeBigInt64LE(0x1111111111111111n, 0);
  buf2.writeBigInt64LE(0x2222222222222222n, 0);

  const view = new Uint8Array(ab);
  return view[0] === 0x11 && view[8] === 0x22;
});

// offset 参数的不同类型
test('writeBigInt64BE - offset 为正整数字符串（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(0x1122334455667788n, '8');
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('offset');
  }
});

test('writeBigInt64BE - offset 为浮点数（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64BE(0x1122334455667788n, 4.7);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

test('writeBigInt64BE - offset 为负零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x1122334455667788n, -0);
  return buf[0] === 0x11 && buf[7] === 0x88;
});

test('writeBigInt64LE - offset 为正整数字符串（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64LE(0x1122334455667788n, '8');
    return false;
  } catch (e) {
    return e.message.includes('type number') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - offset 为浮点数（应抛错）', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeBigInt64LE(0x1122334455667788n, 4.7);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('offset');
  }
});

test('writeBigInt64LE - offset 为负零', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x1122334455667788n, -0);
  return buf[0] === 0x88 && buf[7] === 0x11;
});

// 不同来源的 BigInt 值
test('writeBigInt64BE - BigInt 字面量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0);
  return buf[7] === 123;
});

test('writeBigInt64BE - BigInt() 函数创建', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(456), 0);
  const value = BigInt(456);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64BE - BigInt 运算结果', () => {
  const buf = Buffer.alloc(8);
  const value = 100n + 200n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === 300n;
});

test('writeBigInt64LE - BigInt 字面量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(123n, 0);
  return buf[0] === 123;
});

test('writeBigInt64LE - BigInt() 函数创建', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(456), 0);
  const value = BigInt(456);
  return buf.readBigInt64LE(0) === value;
});

test('writeBigInt64LE - BigInt 运算结果', () => {
  const buf = Buffer.alloc(8);
  const value = 100n + 200n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === 300n;
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
