// buf.writeBigUInt64BE/LE - 第1轮：offset 参数测试
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

// ===== offset 参数 =====

test('writeBigUInt64BE - offset 默认为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0xAABBCCDDEEFF1122n);
  return result === 8 &&
         buf[0] === 0xAA && buf[1] === 0xBB && buf[2] === 0xCC && buf[3] === 0xDD &&
         buf[4] === 0xEE && buf[5] === 0xFF && buf[6] === 0x11 && buf[7] === 0x22;
});

test('writeBigUInt64LE - offset 默认为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0xAABBCCDDEEFF1122n);
  return result === 8 &&
         buf[0] === 0x22 && buf[1] === 0x11 && buf[2] === 0xFF && buf[3] === 0xEE &&
         buf[4] === 0xDD && buf[5] === 0xCC && buf[6] === 0xBB && buf[7] === 0xAA;
});

test('writeBigUInt64BE - offset=1 写入', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xFF);
  const result = buf.writeBigUInt64BE(0x0102030405060708n, 1);
  return result === 9 &&
         buf[0] === 0xFF &&
         buf[1] === 0x01 && buf[2] === 0x02 && buf[3] === 0x03 && buf[4] === 0x04 &&
         buf[5] === 0x05 && buf[6] === 0x06 && buf[7] === 0x07 && buf[8] === 0x08 &&
         buf[9] === 0xFF;
});

test('writeBigUInt64LE - offset=1 写入', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xFF);
  const result = buf.writeBigUInt64LE(0x0102030405060708n, 1);
  return result === 9 &&
         buf[0] === 0xFF &&
         buf[1] === 0x08 && buf[2] === 0x07 && buf[3] === 0x06 && buf[4] === 0x05 &&
         buf[5] === 0x04 && buf[6] === 0x03 && buf[7] === 0x02 && buf[8] === 0x01 &&
         buf[9] === 0xFF;
});

test('writeBigUInt64BE - offset=buf.length-8（最大有效 offset）', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeBigUInt64BE(0xFEDCBA9876543210n, 8);
  return result === 16 &&
         buf[8] === 0xFE && buf[9] === 0xDC && buf[10] === 0xBA && buf[11] === 0x98 &&
         buf[12] === 0x76 && buf[13] === 0x54 && buf[14] === 0x32 && buf[15] === 0x10;
});

test('writeBigUInt64LE - offset=buf.length-8（最大有效 offset）', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeBigUInt64LE(0xFEDCBA9876543210n, 8);
  return result === 16 &&
         buf[8] === 0x10 && buf[9] === 0x32 && buf[10] === 0x54 && buf[11] === 0x76 &&
         buf[12] === 0x98 && buf[13] === 0xBA && buf[14] === 0xDC && buf[15] === 0xFE;
});

test('writeBigUInt64BE - offset=0 在长度为 8 的 buffer 中', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0x1122334455667788n, 0);
  return result === 8 &&
         buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0x33 && buf[3] === 0x44 &&
         buf[4] === 0x55 && buf[5] === 0x66 && buf[6] === 0x77 && buf[7] === 0x88;
});

test('writeBigUInt64LE - offset=0 在长度为 8 的 buffer 中', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0x1122334455667788n, 0);
  return result === 8 &&
         buf[0] === 0x88 && buf[1] === 0x77 && buf[2] === 0x66 && buf[3] === 0x55 &&
         buf[4] === 0x44 && buf[5] === 0x33 && buf[6] === 0x22 && buf[7] === 0x11;
});

test('writeBigUInt64BE - offset 连续写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 8);
  return buf[0] === 0x11 && buf[7] === 0x11 &&
         buf[8] === 0x22 && buf[15] === 0x22;
});

test('writeBigUInt64LE - offset 连续写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 8);
  return buf[0] === 0x11 && buf[7] === 0x11 &&
         buf[8] === 0x22 && buf[15] === 0x22;
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
