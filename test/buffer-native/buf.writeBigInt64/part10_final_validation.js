// buf.writeBigInt64BE/LE - Final Deep Validation Tests
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

// 参数个数测试
test('writeBigInt64BE - 无参数调用（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE();
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigInt64BE - 只有value参数（offset默认0）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64BE(123n);
  return result === 8 && buf[7] === 123;
});

test('writeBigInt64BE - 三个参数（第三个被忽略）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64BE(456n, 0, 'ignored');
  return result === 8 && buf.readBigInt64BE(0) === 456n;
});

test('writeBigInt64LE - 无参数调用（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE();
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigInt64LE - 只有value参数（offset默认0）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64LE(123n);
  return result === 8 && buf[0] === 123;
});

test('writeBigInt64LE - 三个参数（第三个被忽略）', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64LE(456n, 0, 'ignored');
  return result === 8 && buf.readBigInt64LE(0) === 456n;
});

// 链式调用测试
test('writeBigInt64BE - 连续链式调用4次', () => {
  const buf = Buffer.alloc(32);
  let offset = 0;
  offset = buf.writeBigInt64BE(111n, offset);
  offset = buf.writeBigInt64BE(222n, offset);
  offset = buf.writeBigInt64BE(333n, offset);
  offset = buf.writeBigInt64BE(444n, offset);

  return offset === 32 &&
         buf.readBigInt64BE(0) === 111n &&
         buf.readBigInt64BE(8) === 222n &&
         buf.readBigInt64BE(16) === 333n &&
         buf.readBigInt64BE(24) === 444n;
});

test('writeBigInt64LE - 连续链式调用4次', () => {
  const buf = Buffer.alloc(32);
  let offset = 0;
  offset = buf.writeBigInt64LE(111n, offset);
  offset = buf.writeBigInt64LE(222n, offset);
  offset = buf.writeBigInt64LE(333n, offset);
  offset = buf.writeBigInt64LE(444n, offset);

  return offset === 32 &&
         buf.readBigInt64LE(0) === 111n &&
         buf.readBigInt64LE(8) === 222n &&
         buf.readBigInt64LE(16) === 333n &&
         buf.readBigInt64LE(24) === 444n;
});

// 与其他写方法混合使用
test('writeBigInt64BE - 与 writeInt32BE 混合', () => {
  const buf = Buffer.alloc(16);
  buf.writeInt32BE(0x12345678, 0);
  buf.writeBigInt64BE(0xAABBCCDDn, 4);
  buf.writeInt32BE(0x11223344, 12);

  return buf[0] === 0x12 && buf[1] === 0x34 &&
         buf[11] === 0xDD &&
         buf[12] === 0x11 && buf[15] === 0x44;
});

test('writeBigInt64LE - 与 writeInt32LE 混合', () => {
  const buf = Buffer.alloc(16);
  buf.writeInt32LE(0x12345678, 0);
  buf.writeBigInt64LE(0xAABBCCDDn, 4);
  buf.writeInt32LE(0x11223344, 12);

  return buf[0] === 0x78 && buf[1] === 0x56 &&
         buf[4] === 0xDD && buf[5] === 0xCC &&
         buf[12] === 0x44 && buf[15] === 0x11;
});

// DataView 兼容性测试
test('writeBigInt64BE - DataView 兼容性', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);

  buf.writeBigInt64BE(0x0102030405060708n, 0);

  return dv.getBigInt64(0, false) === buf.readBigInt64BE(0);
});

test('writeBigInt64LE - DataView 兼容性', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);

  buf.writeBigInt64LE(0x0102030405060708n, 0);

  return dv.getBigInt64(0, true) === buf.readBigInt64LE(0);
});

// DataView 写入后 Buffer 读取
test('DataView setBigInt64 + Buffer readBigInt64BE', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);

  dv.setBigInt64(0, 0x1122334455667788n, false);

  return buf.readBigInt64BE(0) === 0x1122334455667788n;
});

test('DataView setBigInt64 + Buffer readBigInt64LE', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  const buf = Buffer.from(ab);

  dv.setBigInt64(0, 0x1122334455667788n, true);

  return buf.readBigInt64LE(0) === 0x1122334455667788n;
});

// 极限值精确表示
test('writeBigInt64BE - 2^63-1 (最大正数)', () => {
  const buf = Buffer.alloc(8);
  const max = (1n << 63n) - 1n;
  buf.writeBigInt64BE(max, 0);

  return buf.readBigInt64BE(0) === max &&
         buf.readBigInt64BE(0) === 0x7FFFFFFFFFFFFFFFn &&
         buf.readBigInt64BE(0) === 9223372036854775807n;
});

test('writeBigInt64BE - -2^63 (最小负数)', () => {
  const buf = Buffer.alloc(8);
  const min = -(1n << 63n);
  buf.writeBigInt64BE(min, 0);

  return buf.readBigInt64BE(0) === min &&
         buf.readBigInt64BE(0) === -0x8000000000000000n &&
         buf.readBigInt64BE(0) === -9223372036854775808n;
});

test('writeBigInt64BE - 2^63 超出范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(1n << 63n, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('writeBigInt64BE - -(2^63)-1 超出范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64BE(-(1n << 63n) - 1n, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('writeBigInt64LE - 2^63-1 (最大正数)', () => {
  const buf = Buffer.alloc(8);
  const max = (1n << 63n) - 1n;
  buf.writeBigInt64LE(max, 0);

  return buf.readBigInt64LE(0) === max &&
         buf.readBigInt64LE(0) === 0x7FFFFFFFFFFFFFFFn;
});

test('writeBigInt64LE - -2^63 (最小负数)', () => {
  const buf = Buffer.alloc(8);
  const min = -(1n << 63n);
  buf.writeBigInt64LE(min, 0);

  return buf.readBigInt64LE(0) === min &&
         buf.readBigInt64LE(0) === -0x8000000000000000n;
});

test('writeBigInt64LE - 2^63 超出范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(1n << 63n, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('writeBigInt64LE - -(2^63)-1 超出范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigInt64LE(-(1n << 63n) - 1n, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// 位运算生成的 BigInt
test('writeBigInt64BE - BigInt 位运算 OR', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0xFF00n | 0x00FFn, 0);
  return buf.readBigInt64BE(0) === 0xFFFFn;
});

test('writeBigInt64BE - BigInt 位运算 AND', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0xFF0Fn & 0x0FFFn, 0);
  return buf.readBigInt64BE(0) === 0x0F0Fn;
});

test('writeBigInt64BE - BigInt 位运算 XOR', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0xFFFFn ^ 0x00FFn, 0);
  return buf.readBigInt64BE(0) === 0xFF00n;
});

test('writeBigInt64BE - BigInt 左移', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1n << 32n, 0);
  return buf.readBigInt64BE(0) === 0x100000000n;
});

test('writeBigInt64BE - BigInt 右移', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x100000000n >> 8n, 0);
  return buf.readBigInt64BE(0) === 0x1000000n;
});

test('writeBigInt64LE - BigInt 位运算 OR', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0xFF00n | 0x00FFn, 0);
  return buf.readBigInt64LE(0) === 0xFFFFn;
});

test('writeBigInt64LE - BigInt 位运算 AND', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0xFF0Fn & 0x0FFFn, 0);
  return buf.readBigInt64LE(0) === 0x0F0Fn;
});

test('writeBigInt64LE - BigInt 位运算 XOR', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0xFFFFn ^ 0x00FFn, 0);
  return buf.readBigInt64LE(0) === 0xFF00n;
});

test('writeBigInt64LE - BigInt 左移', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(1n << 32n, 0);
  return buf.readBigInt64LE(0) === 0x100000000n;
});

test('writeBigInt64LE - BigInt 右移', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x100000000n >> 8n, 0);
  return buf.readBigInt64LE(0) === 0x1000000n;
});

// 算术运算生成的 BigInt
test('writeBigInt64BE - BigInt 加法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n + 200n, 0);
  return buf.readBigInt64BE(0) === 300n;
});

test('writeBigInt64BE - BigInt 减法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(500n - 200n, 0);
  return buf.readBigInt64BE(0) === 300n;
});

test('writeBigInt64BE - BigInt 乘法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n * 3n, 0);
  return buf.readBigInt64BE(0) === 300n;
});

test('writeBigInt64BE - BigInt 除法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(900n / 3n, 0);
  return buf.readBigInt64BE(0) === 300n;
});

test('writeBigInt64BE - BigInt 取模', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1000n % 700n, 0);
  return buf.readBigInt64BE(0) === 300n;
});

test('writeBigInt64BE - BigInt 幂运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(10n ** 3n, 0);
  return buf.readBigInt64BE(0) === 1000n;
});

test('writeBigInt64LE - BigInt 加法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n + 200n, 0);
  return buf.readBigInt64LE(0) === 300n;
});

test('writeBigInt64LE - BigInt 减法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(500n - 200n, 0);
  return buf.readBigInt64LE(0) === 300n;
});

test('writeBigInt64LE - BigInt 乘法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n * 3n, 0);
  return buf.readBigInt64LE(0) === 300n;
});

test('writeBigInt64LE - BigInt 除法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(900n / 3n, 0);
  return buf.readBigInt64LE(0) === 300n;
});

test('writeBigInt64LE - BigInt 取模', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(1000n % 700n, 0);
  return buf.readBigInt64LE(0) === 300n;
});

test('writeBigInt64LE - BigInt 幂运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(10n ** 3n, 0);
  return buf.readBigInt64LE(0) === 1000n;
});

// 负数的算术运算
test('writeBigInt64BE - 负数加法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-100n + (-200n), 0);
  return buf.readBigInt64BE(0) === -300n;
});

test('writeBigInt64BE - 正负数混合', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(500n + (-200n), 0);
  return buf.readBigInt64BE(0) === 300n;
});

test('writeBigInt64BE - 负数乘法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-100n * 3n, 0);
  return buf.readBigInt64BE(0) === -300n;
});

test('writeBigInt64LE - 负数加法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-100n + (-200n), 0);
  return buf.readBigInt64LE(0) === -300n;
});

test('writeBigInt64LE - 正负数混合', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(500n + (-200n), 0);
  return buf.readBigInt64LE(0) === 300n;
});

test('writeBigInt64LE - 负数乘法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-100n * 3n, 0);
  return buf.readBigInt64LE(0) === -300n;
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
