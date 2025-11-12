// buf.writeBigUInt64BE/LE - 第3轮：极端边界与特殊场景
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

// ===== offset 边界的精确测试 =====

test('writeBigUInt64BE - offset=buf.length-8 刚好合法', () => {
  const buf = Buffer.alloc(16);
  try {
    const result = buf.writeBigUInt64BE(0x1234567890ABCDEFn, 8);
    return result === 16;
  } catch (e) {
    return false;
  }
});

test('writeBigUInt64LE - offset=buf.length-8 刚好合法', () => {
  const buf = Buffer.alloc(16);
  try {
    const result = buf.writeBigUInt64LE(0x1234567890ABCDEFn, 8);
    return result === 16;
  } catch (e) {
    return false;
  }
});

test('writeBigUInt64BE - offset=buf.length-7 应抛错（差1字节）', () => {
  const buf = Buffer.alloc(15);
  try {
    buf.writeBigUInt64BE(0n, 8);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - offset=buf.length-7 应抛错（差1字节）', () => {
  const buf = Buffer.alloc(15);
  try {
    buf.writeBigUInt64LE(0n, 8);
    return false;
  } catch (e) {
    return true;
  }
});

// ===== 特殊 BigInt 值 =====

test('writeBigUInt64BE - 写入 2n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(2n, 0);
  return buf[7] === 0x02;
});

test('writeBigUInt64LE - 写入 2n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(2n, 0);
  return buf[0] === 0x02;
});

test('writeBigUInt64BE - 写入 255n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(255n, 0);
  return buf[7] === 0xFF && buf[6] === 0x00;
});

test('writeBigUInt64LE - 写入 255n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(255n, 0);
  return buf[0] === 0xFF && buf[1] === 0x00;
});

test('writeBigUInt64BE - 写入 65535n (2^16-1)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(65535n, 0);
  return buf[6] === 0xFF && buf[7] === 0xFF && buf[5] === 0x00;
});

test('writeBigUInt64LE - 写入 65535n (2^16-1)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(65535n, 0);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0x00;
});

test('writeBigUInt64BE - 写入 65536n (2^16)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(65536n, 0);
  return buf[5] === 0x01 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64LE - 写入 65536n (2^16)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(65536n, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01;
});

// ===== 连续多次写入不同位置 =====

test('writeBigUInt64BE - 连续写入3个位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(0x1111111111111111n, 0);
  buf.writeBigUInt64BE(0x2222222222222222n, 8);
  buf.writeBigUInt64BE(0x3333333333333333n, 16);
  return buf[0] === 0x11 && buf[8] === 0x22 && buf[16] === 0x33;
});

test('writeBigUInt64LE - 连续写入3个位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(0x1111111111111111n, 0);
  buf.writeBigUInt64LE(0x2222222222222222n, 8);
  buf.writeBigUInt64LE(0x3333333333333333n, 16);
  return buf[0] === 0x11 && buf[8] === 0x22 && buf[16] === 0x33;
});

// ===== 大 Buffer 测试 =====

test('writeBigUInt64BE - 在大 Buffer（1KB）中间位置写入', () => {
  const buf = Buffer.alloc(1024);
  const offset = 512;
  const result = buf.writeBigUInt64BE(0xDEADBEEFCAFEBABEn, offset);
  return result === offset + 8 &&
         buf[offset] === 0xDE && buf[offset+1] === 0xAD &&
         buf[offset+6] === 0xBA && buf[offset+7] === 0xBE;
});

test('writeBigUInt64LE - 在大 Buffer（1KB）中间位置写入', () => {
  const buf = Buffer.alloc(1024);
  const offset = 512;
  const result = buf.writeBigUInt64LE(0xDEADBEEFCAFEBABEn, offset);
  return result === offset + 8 &&
         buf[offset] === 0xBE && buf[offset+1] === 0xBA &&
         buf[offset+6] === 0xAD && buf[offset+7] === 0xDE;
});

test('writeBigUInt64BE - 在大 Buffer 最后8字节写入', () => {
  const buf = Buffer.alloc(1024);
  const offset = 1016;
  const result = buf.writeBigUInt64BE(0xFFFFFFFFFFFFFFFFn, offset);
  return result === 1024 && buf[1023] === 0xFF;
});

test('writeBigUInt64LE - 在大 Buffer 最后8字节写入', () => {
  const buf = Buffer.alloc(1024);
  const offset = 1016;
  const result = buf.writeBigUInt64LE(0xFFFFFFFFFFFFFFFFn, offset);
  return result === 1024 && buf[1016] === 0xFF;
});

// ===== 零拷贝行为验证 =====

test('writeBigUInt64BE - 写入会直接修改 buffer', () => {
  const buf = Buffer.alloc(8);
  const oldBuf = buf;
  buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0);
  return buf === oldBuf && buf[0] === 0x12;
});

test('writeBigUInt64LE - 写入会直接修改 buffer', () => {
  const buf = Buffer.alloc(8);
  const oldBuf = buf;
  buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0);
  return buf === oldBuf && buf[0] === 0xEF;
});

// ===== slice 视图行为 =====

test('writeBigUInt64BE - 在 slice 视图上写入影响原 buffer', () => {
  const buf = Buffer.alloc(16);
  const slice = buf.slice(4, 12);
  slice.writeBigUInt64BE(0xAABBCCDDEEFF0011n, 0);
  return buf[4] === 0xAA && buf[11] === 0x11;
});

test('writeBigUInt64LE - 在 slice 视图上写入影响原 buffer', () => {
  const buf = Buffer.alloc(16);
  const slice = buf.slice(4, 12);
  slice.writeBigUInt64LE(0xAABBCCDDEEFF0011n, 0);
  return buf[4] === 0x11 && buf[11] === 0xAA;
});

// ===== subarray 视图行为 =====

test('writeBigUInt64BE - 在 subarray 视图上写入影响原 buffer', () => {
  const buf = Buffer.alloc(16);
  const sub = buf.subarray(2, 10);
  sub.writeBigUInt64BE(0x1122334455667788n, 0);
  return buf[2] === 0x11 && buf[9] === 0x88;
});

test('writeBigUInt64LE - 在 subarray 视图上写入影响原 buffer', () => {
  const buf = Buffer.alloc(16);
  const sub = buf.subarray(2, 10);
  sub.writeBigUInt64LE(0x1122334455667788n, 0);
  return buf[2] === 0x88 && buf[9] === 0x11;
});

// ===== offset 为 0 的多种形式 =====

test('writeBigUInt64BE - offset 显式传入 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0xABCDEF0123456789n, 0);
  return result === 8 && buf[0] === 0xAB;
});

test('writeBigUInt64LE - offset 显式传入 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0xABCDEF0123456789n, 0);
  return result === 8 && buf[0] === 0x89;
});

// ===== 参数顺序错误 =====

test('writeBigUInt64BE - 缺少 value 参数应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64BE();
    return false;
  } catch (e) {
    return true;
  }
});

test('writeBigUInt64LE - 缺少 value 参数应抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeBigUInt64LE();
    return false;
  } catch (e) {
    return true;
  }
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
