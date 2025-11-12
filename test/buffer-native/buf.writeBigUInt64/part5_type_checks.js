// buf.writeBigUInt64BE/LE - 第2轮：this 类型检查与参数类型转换
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

// ===== this 类型检查 =====

test('writeBigUInt64BE - this 不是 Buffer 应抛错', () => {
  try {
    Buffer.prototype.writeBigUInt64BE.call({}, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - this 不是 Buffer 应抛错', () => {
  try {
    Buffer.prototype.writeBigUInt64LE.call({}, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - this 是 null 应抛错', () => {
  try {
    Buffer.prototype.writeBigUInt64BE.call(null, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - this 是 null 应抛错', () => {
  try {
    Buffer.prototype.writeBigUInt64LE.call(null, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - this 是 undefined 应抛错', () => {
  try {
    Buffer.prototype.writeBigUInt64BE.call(undefined, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - this 是 undefined 应抛错', () => {
  try {
    Buffer.prototype.writeBigUInt64LE.call(undefined, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - this 是普通对象应抛错', () => {
  try {
    const obj = { length: 8 };
    Buffer.prototype.writeBigUInt64BE.call(obj, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - this 是普通对象应抛错', () => {
  try {
    const obj = { length: 8 };
    Buffer.prototype.writeBigUInt64LE.call(obj, 0n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== offset 参数类型检查 =====

test('writeBigUInt64BE - offset 是字符串数字 "0" 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0x1122334455667788n, "0");
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset 是字符串数字 "0" 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0x1122334455667788n, "0");
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - offset 是字符串 "1" 应抛错', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeBigUInt64BE(0xAABBCCDDEEFF0011n, "1");
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset 是字符串 "1" 应抛错', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.writeBigUInt64LE(0xAABBCCDDEEFF0011n, "1");
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - offset 是非数字字符串应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, "abc");
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset 是非数字字符串应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, "abc");
    return false;
  } catch (e) {
    return true;
  }
});

// ===== 参数省略 =====

test('writeBigUInt64BE - 只传 value 参数（offset 省略）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0xFEDCBA9876543210n);
  return result === 8 &&
         buf[0] === 0xFE && buf[1] === 0xDC && buf[2] === 0xBA && buf[3] === 0x98 &&
         buf[4] === 0x76 && buf[5] === 0x54 && buf[6] === 0x32 && buf[7] === 0x10;
});

test('writeBigUInt64LE - 只传 value 参数（offset 省略）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0xFEDCBA9876543210n);
  return result === 8 &&
         buf[0] === 0x10 && buf[1] === 0x32 && buf[2] === 0x54 && buf[3] === 0x76 &&
         buf[4] === 0x98 && buf[5] === 0xBA && buf[6] === 0xDC && buf[7] === 0xFE;
});

// ===== 链式调用 =====

test('writeBigUInt64BE - 返回值可用于后续操作', () => {
  const buf = Buffer.alloc(16);
  const offset1 = buf.writeBigUInt64BE(0x1111111111111111n, 0);
  const offset2 = buf.writeBigUInt64BE(0x2222222222222222n, offset1);
  return offset1 === 8 && offset2 === 16 &&
         buf[0] === 0x11 && buf[7] === 0x11 &&
         buf[8] === 0x22 && buf[15] === 0x22;
});

test('writeBigUInt64LE - 返回值可用于后续操作', () => {
  const buf = Buffer.alloc(16);
  const offset1 = buf.writeBigUInt64LE(0x1111111111111111n, 0);
  const offset2 = buf.writeBigUInt64LE(0x2222222222222222n, offset1);
  return offset1 === 8 && offset2 === 16 &&
         buf[0] === 0x11 && buf[7] === 0x11 &&
         buf[8] === 0x22 && buf[15] === 0x22;
});

// ===== TypedArray 互操作 =====

test('writeBigUInt64BE - 在 Uint8Array 视图上调用', () => {
  const arr = new Uint8Array(8);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigUInt64BE(0x0102030405060708n, 0);
  return arr[0] === 0x01 && arr[1] === 0x02 && arr[2] === 0x03 && arr[3] === 0x04 &&
         arr[4] === 0x05 && arr[5] === 0x06 && arr[6] === 0x07 && arr[7] === 0x08;
});

test('writeBigUInt64LE - 在 Uint8Array 视图上调用', () => {
  const arr = new Uint8Array(8);
  const buf = Buffer.from(arr.buffer);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  return arr[0] === 0x08 && arr[1] === 0x07 && arr[2] === 0x06 && arr[3] === 0x05 &&
         arr[4] === 0x04 && arr[5] === 0x03 && arr[6] === 0x02 && arr[7] === 0x01;
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
