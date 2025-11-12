// buf.writeBigUInt64BE/LE - 超深度补充轮2：大 Buffer 与往返一致性
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

// ===== 极限 offset 边界（大 Buffer）=====

const largeSizes = [255, 256, 511, 512, 1023, 1024, 2047, 2048, 4095, 4096];

largeSizes.forEach(size => {
  const maxOffset = size - 8;

  test(`writeBigUInt64BE - size=${size}, maxOffset=${maxOffset}`, () => {
    const buf = Buffer.alloc(size);
    buf.writeBigUInt64BE(0xABCDEF0123456789n, maxOffset);
    const readBack = buf.readBigUInt64BE(maxOffset);
    return readBack === 0xABCDEF0123456789n;
  });

  test(`writeBigUInt64LE - size=${size}, maxOffset=${maxOffset}`, () => {
    const buf = Buffer.alloc(size);
    buf.writeBigUInt64LE(0xABCDEF0123456789n, maxOffset);
    const readBack = buf.readBigUInt64LE(maxOffset);
    return readBack === 0xABCDEF0123456789n;
  });
});

// ===== 往返一致性（更多值）=====

const roundtripValues = [
  1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n,
  127n, 128n, 129n,
  255n, 256n, 257n,
  65535n, 65536n, 65537n,
  0xDEADBEEFn,
  0xCAFEBABEn,
  0x123456789ABCDEFn,
  0xFEDCBA987654321n,
  9223372036854775807n, // 2^63-1
  9223372036854775808n, // 2^63
  18446744073709551614n, // 2^64-2
  18446744073709551615n, // 2^64-1
];

roundtripValues.forEach(val => {
  test(`writeBigUInt64BE - 往返一致性 ${val}n`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(val, 0);
    const readBack = buf.readBigUInt64BE(0);
    return readBack === val;
  });

  test(`writeBigUInt64LE - 往返一致性 ${val}n`, () => {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(val, 0);
    const readBack = buf.readBigUInt64LE(0);
    return readBack === val;
  });
});

// ===== 连续边界值写入不相互干扰 =====

test('writeBigUInt64BE - 连续边界值写入 [0,8,16,24]', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigUInt64BE(0x0000000000000000n, 0);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 8);
  buf.writeBigUInt64BE(0x8000000000000000n, 16);
  buf.writeBigUInt64BE(0x7FFFFFFFFFFFFFFFn, 24);

  const r0 = buf.readBigUInt64BE(0);
  const r8 = buf.readBigUInt64BE(8);
  const r16 = buf.readBigUInt64BE(16);
  const r24 = buf.readBigUInt64BE(24);

  return r0 === 0x0000000000000000n &&
         r8 === 0xFFFFFFFFFFFFFFFFn &&
         r16 === 0x8000000000000000n &&
         r24 === 0x7FFFFFFFFFFFFFFFn;
});

test('writeBigUInt64LE - 连续边界值写入 [0,8,16,24]', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigUInt64LE(0x0000000000000000n, 0);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, 8);
  buf.writeBigUInt64LE(0x8000000000000000n, 16);
  buf.writeBigUInt64LE(0x7FFFFFFFFFFFFFFFn, 24);

  const r0 = buf.readBigUInt64LE(0);
  const r8 = buf.readBigUInt64LE(8);
  const r16 = buf.readBigUInt64LE(16);
  const r24 = buf.readBigUInt64LE(24);

  return r0 === 0x0000000000000000n &&
         r8 === 0xFFFFFFFFFFFFFFFFn &&
         r16 === 0x8000000000000000n &&
         r24 === 0x7FFFFFFFFFFFFFFFn;
});

// ===== 相同值不同表示的一致性 =====

test('writeBigUInt64BE - 相同值不同表示 255n', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  const buf3 = Buffer.alloc(8);
  const buf4 = Buffer.alloc(8);

  buf1.writeBigUInt64BE(255n, 0);
  buf2.writeBigUInt64BE(0xFFn, 0);
  buf3.writeBigUInt64BE(0b11111111n, 0);
  buf4.writeBigUInt64BE(0o377n, 0);

  return buf1.toString('hex') === buf2.toString('hex') &&
         buf2.toString('hex') === buf3.toString('hex') &&
         buf3.toString('hex') === buf4.toString('hex');
});

test('writeBigUInt64LE - 相同值不同表示 255n', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  const buf3 = Buffer.alloc(8);
  const buf4 = Buffer.alloc(8);

  buf1.writeBigUInt64LE(255n, 0);
  buf2.writeBigUInt64LE(0xFFn, 0);
  buf3.writeBigUInt64LE(0b11111111n, 0);
  buf4.writeBigUInt64LE(0o377n, 0);

  return buf1.toString('hex') === buf2.toString('hex') &&
         buf2.toString('hex') === buf3.toString('hex') &&
         buf3.toString('hex') === buf4.toString('hex');
});

// ===== 极大 Buffer 的边界测试 =====

test('writeBigUInt64BE - 8KB Buffer 最后8字节', () => {
  const buf = Buffer.alloc(8192);
  const offset = 8184;
  buf.writeBigUInt64BE(0x123456789ABCDEFn, offset);
  const readBack = buf.readBigUInt64BE(offset);
  return readBack === 0x123456789ABCDEFn;
});

test('writeBigUInt64LE - 8KB Buffer 最后8字节', () => {
  const buf = Buffer.alloc(8192);
  const offset = 8184;
  buf.writeBigUInt64LE(0x123456789ABCDEFn, offset);
  const readBack = buf.readBigUInt64LE(offset);
  return readBack === 0x123456789ABCDEFn;
});

test('writeBigUInt64BE - 16KB Buffer 最后8字节', () => {
  const buf = Buffer.alloc(16384);
  const offset = 16376;
  buf.writeBigUInt64BE(0xFEDCBA987654321n, offset);
  const readBack = buf.readBigUInt64BE(offset);
  return readBack === 0xFEDCBA987654321n;
});

test('writeBigUInt64LE - 16KB Buffer 最后8字节', () => {
  const buf = Buffer.alloc(16384);
  const offset = 16376;
  buf.writeBigUInt64LE(0xFEDCBA987654321n, offset);
  const readBack = buf.readBigUInt64LE(offset);
  return readBack === 0xFEDCBA987654321n;
});

// ===== offset 为各种特殊位置 =====

test('writeBigUInt64BE - offset 为奇数位置 offset=1', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0xAABBCCDDEEFF0011n, 1);
  const readBack = buf.readBigUInt64BE(1);
  return readBack === 0xAABBCCDDEEFF0011n;
});

test('writeBigUInt64LE - offset 为奇数位置 offset=1', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0xAABBCCDDEEFF0011n, 1);
  const readBack = buf.readBigUInt64LE(1);
  return readBack === 0xAABBCCDDEEFF0011n;
});

test('writeBigUInt64BE - offset 为奇数位置 offset=3', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1122334455667788n, 3);
  const readBack = buf.readBigUInt64BE(3);
  return readBack === 0x1122334455667788n;
});

test('writeBigUInt64LE - offset 为奇数位置 offset=3', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1122334455667788n, 3);
  const readBack = buf.readBigUInt64LE(3);
  return readBack === 0x1122334455667788n;
});

test('writeBigUInt64BE - offset 为奇数位置 offset=5', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0xDEADBEEFCAFEBABEn, 5);
  const readBack = buf.readBigUInt64BE(5);
  return readBack === 0xDEADBEEFCAFEBABEn;
});

test('writeBigUInt64LE - offset 为奇数位置 offset=5', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0xDEADBEEFCAFEBABEn, 5);
  const readBack = buf.readBigUInt64LE(5);
  return readBack === 0xDEADBEEFCAFEBABEn;
});

test('writeBigUInt64BE - offset 为奇数位置 offset=7', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x0102030405060708n, 7);
  const readBack = buf.readBigUInt64BE(7);
  return readBack === 0x0102030405060708n;
});

test('writeBigUInt64LE - offset 为奇数位置 offset=7', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x0102030405060708n, 7);
  const readBack = buf.readBigUInt64LE(7);
  return readBack === 0x0102030405060708n;
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
