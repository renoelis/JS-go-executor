// buf.writeBigUInt64BE/LE - 第5轮：极端挑刺与兼容性测试
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

// ===== offset 为负数的各种形式 =====

test('writeBigUInt64BE - offset=-0 应视为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0x1234567890ABCDEFn, -0);
  return result === 8 && buf[0] === 0x12;
});

test('writeBigUInt64LE - offset=-0 应视为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0x1234567890ABCDEFn, -0);
  return result === 8 && buf[0] === 0xEF;
});

test('writeBigUInt64BE - offset=-1 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, -1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset=-1 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, -1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - offset=-100 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, -100);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset=-100 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, -100);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== 特殊数值边界 =====

test('writeBigUInt64BE - value 刚好等于 2^64-1', () => {
  const buf = Buffer.alloc(8);
  const val = (1n << 64n) - 1n;
  buf.writeBigUInt64BE(val, 0);
  return buf.toString('hex') === 'ffffffffffffffff';
});

test('writeBigUInt64LE - value 刚好等于 2^64-1', () => {
  const buf = Buffer.alloc(8);
  const val = (1n << 64n) - 1n;
  buf.writeBigUInt64LE(val, 0);
  return buf.toString('hex') === 'ffffffffffffffff';
});

test('writeBigUInt64BE - value 为 2^31-1（有符号最大正值）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(2147483647n, 0);
  return buf.toString('hex') === '000000007fffffff';
});

test('writeBigUInt64LE - value 为 2^31-1（有符号最大正值）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(2147483647n, 0);
  return buf.toString('hex') === 'ffffff7f00000000';
});

test('writeBigUInt64BE - value 为 2^31（有符号临界）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(2147483648n, 0);
  return buf.toString('hex') === '0000000080000000';
});

test('writeBigUInt64LE - value 为 2^31（有符号临界）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(2147483648n, 0);
  return buf.toString('hex') === '0000008000000000';
});

// ===== 负数 BigInt 测试（应全部抛错）=====

test('writeBigUInt64BE - value=-2^63 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(-9223372036854775808n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - value=-2^63 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(-9223372036854775808n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - value=-1000000n 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(-1000000n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - value=-1000000n 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(-1000000n, 0);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== 超大 offset 测试 =====

test('writeBigUInt64BE - offset=Number.MAX_SAFE_INTEGER 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset=Number.MAX_SAFE_INTEGER 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== 写入部分字节边界测试 =====

test('writeBigUInt64BE - 刚好最后8字节，验证每个字节', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0102030405060708n, 0);
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03 && buf[3] === 0x04 &&
         buf[4] === 0x05 && buf[5] === 0x06 && buf[6] === 0x07 && buf[7] === 0x08;
});

test('writeBigUInt64LE - 刚好最后8字节，验证每个字节', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  return buf[0] === 0x08 && buf[1] === 0x07 && buf[2] === 0x06 && buf[3] === 0x05 &&
         buf[4] === 0x04 && buf[5] === 0x03 && buf[6] === 0x02 && buf[7] === 0x01;
});

// ===== 与其他 Buffer 方法交互 =====

test('writeBigUInt64BE - 写入后用 slice 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0xAABBCCDDEEFF0011n, 4);
  const slice = buf.slice(4, 12);
  return slice.readBigUInt64BE(0) === 0xAABBCCDDEEFF0011n;
});

test('writeBigUInt64LE - 写入后用 slice 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0xAABBCCDDEEFF0011n, 4);
  const slice = buf.slice(4, 12);
  return slice.readBigUInt64LE(0) === 0xAABBCCDDEEFF0011n;
});

test('writeBigUInt64BE - 写入后用 subarray 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1122334455667788n, 2);
  const sub = buf.subarray(2, 10);
  return sub.readBigUInt64BE(0) === 0x1122334455667788n;
});

test('writeBigUInt64LE - 写入后用 subarray 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1122334455667788n, 2);
  const sub = buf.subarray(2, 10);
  return sub.readBigUInt64LE(0) === 0x1122334455667788n;
});

// ===== 连续 BE/LE 混合写入 =====

test('writeBigUInt64 - 先 BE 写入 offset=0，再 LE 写入 offset=8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 8);
  return buf[0] === 0x11 && buf[7] === 0x11 &&
         buf[8] === 0x22 && buf[15] === 0x22;
});

test('writeBigUInt64 - 先 LE 写入 offset=0，再 BE 写入 offset=8', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 8);
  return buf[0] === 0x11 && buf[7] === 0x11 &&
         buf[8] === 0x22 && buf[15] === 0x22;
});

// ===== offset 为浮点数（应被截断或抛错）=====

test('writeBigUInt64BE - offset=0.1 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, 0.1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset=0.1 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, 0.1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64BE - offset=0.9 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(0n, 0.9);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset=0.9 应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(0n, 0.9);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== 特殊 value 输入形式 =====

test('writeBigUInt64BE - value 使用科学计数法 1e3n', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE(1000n, 0);
    return buf.toString('hex') === '00000000000003e8';
  } catch (e) {
    return false;
  }
});

test('writeBigUInt64LE - value 使用科学计数法 1e3n', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE(1000n, 0);
    return buf.toString('hex') === 'e803000000000000';
  } catch (e) {
    return false;
  }
});

// ===== Buffer 长度边界精确测试 =====

test('writeBigUInt64BE - buffer 长度刚好 8，offset=0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0xFFEEDDCCBBAA9988n, 0);
  return result === 8 && buf.length === 8;
});

test('writeBigUInt64LE - buffer 长度刚好 8，offset=0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0xFFEEDDCCBBAA9988n, 0);
  return result === 8 && buf.length === 8;
});

test('writeBigUInt64BE - buffer 长度 9，offset=1（刚好）', () => {
  const buf = Buffer.alloc(9);
  const result = buf.writeBigUInt64BE(0x1234567890ABCDEFn, 1);
  return result === 9;
});

test('writeBigUInt64LE - buffer 长度 9，offset=1（刚好）', () => {
  const buf = Buffer.alloc(9);
  const result = buf.writeBigUInt64LE(0x1234567890ABCDEFn, 1);
  return result === 9;
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
