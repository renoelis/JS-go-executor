// buf.writeBigUInt64BE/LE - 深度补充轮3：字节级精确验证与完整性检查
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

// ===== 每个字节位置的独立验证 =====

test('writeBigUInt64BE - 验证每个字节位置（0x0102030405060708n）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0102030405060708n, 0);
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03 && buf[3] === 0x04 &&
         buf[4] === 0x05 && buf[5] === 0x06 && buf[6] === 0x07 && buf[7] === 0x08;
});

test('writeBigUInt64LE - 验证每个字节位置（0x0102030405060708n）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  return buf[0] === 0x08 && buf[1] === 0x07 && buf[2] === 0x06 && buf[3] === 0x05 &&
         buf[4] === 0x04 && buf[5] === 0x03 && buf[6] === 0x02 && buf[7] === 0x01;
});

test('writeBigUInt64BE - 验证每个字节位置（0xF0E1D2C3B4A59687n）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xF0E1D2C3B4A59687n, 0);
  return buf[0] === 0xF0 && buf[1] === 0xE1 && buf[2] === 0xD2 && buf[3] === 0xC3 &&
         buf[4] === 0xB4 && buf[5] === 0xA5 && buf[6] === 0x96 && buf[7] === 0x87;
});

test('writeBigUInt64LE - 验证每个字节位置（0xF0E1D2C3B4A59687n）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xF0E1D2C3B4A59687n, 0);
  return buf[0] === 0x87 && buf[1] === 0x96 && buf[2] === 0xA5 && buf[3] === 0xB4 &&
         buf[4] === 0xC3 && buf[5] === 0xD2 && buf[6] === 0xE1 && buf[7] === 0xF0;
});

// ===== 单字节递增模式 =====

for (let i = 0; i < 8; i++) {
  test(`writeBigUInt64BE - 只有第${i+1}字节为1`, () => {
    const buf = Buffer.alloc(8);
    const val = 1n << BigInt((7 - i) * 8);
    buf.writeBigUInt64BE(val, 0);
    return buf[i] === 1 && buf.filter((b, idx) => idx !== i).every(b => b === 0);
  });

  test(`writeBigUInt64LE - 只有第${i+1}字节为1`, () => {
    const buf = Buffer.alloc(8);
    const val = 1n << BigInt(i * 8);
    buf.writeBigUInt64LE(val, 0);
    return buf[i] === 1 && buf.filter((b, idx) => idx !== i).every(b => b === 0);
  });
}

// ===== 字节序翻转验证 =====

const flipTests = [
  0x0011223344556677n,
  0x8899AABBCCDDEEFFn,
  0x123456789ABCDEFn,
  0xFEDCBA987654321n,
];

flipTests.forEach((val, idx) => {
  test(`writeBigUInt64BE/LE - 字节序翻转验证 ${idx+1}`, () => {
    const bufBE = Buffer.alloc(8);
    const bufLE = Buffer.alloc(8);
    bufBE.writeBigUInt64BE(val, 0);
    bufLE.writeBigUInt64LE(val, 0);

    for (let i = 0; i < 8; i++) {
      if (bufBE[i] !== bufLE[7 - i]) {
        return false;
      }
    }
    return true;
  });
});

// ===== 不同 offset 下的字节写入位置验证 =====

test('writeBigUInt64BE - offset=0, 验证写入位置', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64BE(0x0102030405060708n, 0);
  return buf[0] === 0x01 && buf[7] === 0x08 && buf[8] === 0xFF;
});

test('writeBigUInt64LE - offset=0, 验证写入位置', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64LE(0x0102030405060708n, 0);
  return buf[0] === 0x08 && buf[7] === 0x01 && buf[8] === 0xFF;
});

test('writeBigUInt64BE - offset=4, 验证写入位置', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64BE(0x0102030405060708n, 4);
  return buf[3] === 0xFF && buf[4] === 0x01 && buf[11] === 0x08 && buf[12] === 0xFF;
});

test('writeBigUInt64LE - offset=4, 验证写入位置', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64LE(0x0102030405060708n, 4);
  return buf[3] === 0xFF && buf[4] === 0x08 && buf[11] === 0x01 && buf[12] === 0xFF;
});

test('writeBigUInt64BE - offset=8, 验证写入位置', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64BE(0x0102030405060708n, 8);
  return buf[7] === 0xFF && buf[8] === 0x01 && buf[15] === 0x08;
});

test('writeBigUInt64LE - offset=8, 验证写入位置', () => {
  const buf = Buffer.alloc(16, 0xFF);
  buf.writeBigUInt64LE(0x0102030405060708n, 8);
  return buf[7] === 0xFF && buf[8] === 0x08 && buf[15] === 0x01;
});

// ===== 覆盖性验证（确保完整覆盖8字节）=====

test('writeBigUInt64BE - 完整覆盖验证（从全FF到特定值）', () => {
  const buf = Buffer.alloc(8, 0xFF);
  buf.writeBigUInt64BE(0x0000000000000000n, 0);
  return buf.every(b => b === 0x00);
});

test('writeBigUInt64LE - 完整覆盖验证（从全FF到特定值）', () => {
  const buf = Buffer.alloc(8, 0xFF);
  buf.writeBigUInt64LE(0x0000000000000000n, 0);
  return buf.every(b => b === 0x00);
});

test('writeBigUInt64BE - 完整覆盖验证（从全00到全FF）', () => {
  const buf = Buffer.alloc(8, 0x00);
  buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.every(b => b === 0xFF);
});

test('writeBigUInt64LE - 完整覆盖验证（从全00到全FF）', () => {
  const buf = Buffer.alloc(8, 0x00);
  buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, 0);
  return buf.every(b => b === 0xFF);
});

// ===== 边界外的字节不被影响 =====

test('writeBigUInt64BE - 确保不影响 offset 之前的字节', () => {
  const buf = Buffer.alloc(16, 0xAA);
  buf.writeBigUInt64BE(0x1122334455667788n, 4);
  return buf[0] === 0xAA && buf[1] === 0xAA && buf[2] === 0xAA && buf[3] === 0xAA;
});

test('writeBigUInt64LE - 确保不影响 offset 之前的字节', () => {
  const buf = Buffer.alloc(16, 0xAA);
  buf.writeBigUInt64LE(0x1122334455667788n, 4);
  return buf[0] === 0xAA && buf[1] === 0xAA && buf[2] === 0xAA && buf[3] === 0xAA;
});

test('writeBigUInt64BE - 确保不影响 offset+8 之后的字节', () => {
  const buf = Buffer.alloc(16, 0xBB);
  buf.writeBigUInt64BE(0x1122334455667788n, 4);
  return buf[12] === 0xBB && buf[13] === 0xBB && buf[14] === 0xBB && buf[15] === 0xBB;
});

test('writeBigUInt64LE - 确保不影响 offset+8 之后的字节', () => {
  const buf = Buffer.alloc(16, 0xBB);
  buf.writeBigUInt64LE(0x1122334455667788n, 4);
  return buf[12] === 0xBB && buf[13] === 0xBB && buf[14] === 0xBB && buf[15] === 0xBB;
});

// ===== 与 DataView 行为对比 =====

test('writeBigUInt64BE - 与 DataView.setBigUint64(BE) 行为一致', () => {
  const buf = Buffer.alloc(8);
  const dv = new DataView(new ArrayBuffer(8));

  const val = 0x123456789ABCDEFn;
  buf.writeBigUInt64BE(val, 0);
  dv.setBigUint64(0, val, false);

  const bufArray = Array.from(buf);
  const dvArray = Array.from(new Uint8Array(dv.buffer));

  return bufArray.every((b, i) => b === dvArray[i]);
});

test('writeBigUInt64LE - 与 DataView.setBigUint64(LE) 行为一致', () => {
  const buf = Buffer.alloc(8);
  const dv = new DataView(new ArrayBuffer(8));

  const val = 0x123456789ABCDEFn;
  buf.writeBigUInt64LE(val, 0);
  dv.setBigUint64(0, val, true);

  const bufArray = Array.from(buf);
  const dvArray = Array.from(new Uint8Array(dv.buffer));

  return bufArray.every((b, i) => b === dvArray[i]);
});

// ===== 幂等性验证 =====

test('writeBigUInt64BE - 连续写入相同值结果一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xDEADBEEFCAFEBABEn, 0);
  const hex1 = buf.toString('hex');
  buf.writeBigUInt64BE(0xDEADBEEFCAFEBABEn, 0);
  const hex2 = buf.toString('hex');
  return hex1 === hex2;
});

test('writeBigUInt64LE - 连续写入相同值结果一致', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xDEADBEEFCAFEBABEn, 0);
  const hex1 = buf.toString('hex');
  buf.writeBigUInt64LE(0xDEADBEEFCAFEBABEn, 0);
  const hex2 = buf.toString('hex');
  return hex1 === hex2;
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
