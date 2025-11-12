// buf.writeBigInt64BE/LE - Advanced Scenarios Tests
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

// 写入后立即读取验证字节序
test('writeBigInt64BE - 验证字节序（高位在前）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);

  let isCorrectOrder = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== i + 1) {
      isCorrectOrder = false;
      break;
    }
  }
  return isCorrectOrder;
});

test('writeBigInt64LE - 验证字节序（低位在前）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);

  let isCorrectOrder = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 8 - i) {
      isCorrectOrder = false;
      break;
    }
  }
  return isCorrectOrder;
});

// 负数的二进制补码表示
test('writeBigInt64BE - 负1的二进制表示（全F）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-1n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return true;
});

test('writeBigInt64BE - 负2的二进制表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-2n, 0);

  if (buf[7] !== 0xFE) return false;
  for (let i = 0; i < 7; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return true;
});

test('writeBigInt64LE - 负1的二进制表示（全F）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-1n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return true;
});

test('writeBigInt64LE - 负2的二进制表示', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-2n, 0);

  if (buf[0] !== 0xFE) return false;
  for (let i = 1; i < 8; i++) {
    if (buf[i] !== 0xFF) return false;
  }
  return true;
});

// 边界值附近的测试
test('writeBigInt64BE - 2^32', () => {
  const buf = Buffer.alloc(8);
  const value = 0x100000000n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64BE - 2^32 - 1', () => {
  const buf = Buffer.alloc(8);
  const value = 0xFFFFFFFFn;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64BE - -(2^32)', () => {
  const buf = Buffer.alloc(8);
  const value = -0x100000000n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64LE - 2^32', () => {
  const buf = Buffer.alloc(8);
  const value = 0x100000000n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

test('writeBigInt64LE - 2^32 - 1', () => {
  const buf = Buffer.alloc(8);
  const value = 0xFFFFFFFFn;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

test('writeBigInt64LE - -(2^32)', () => {
  const buf = Buffer.alloc(8);
  const value = -0x100000000n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

// 使用链式调用
test('writeBigInt64BE - 链式调用返回值', () => {
  const buf = Buffer.alloc(16);
  const offset1 = buf.writeBigInt64BE(111n, 0);
  const offset2 = buf.writeBigInt64BE(222n, offset1);
  return offset1 === 8 && offset2 === 16;
});

test('writeBigInt64LE - 链式调用返回值', () => {
  const buf = Buffer.alloc(16);
  const offset1 = buf.writeBigInt64LE(111n, 0);
  const offset2 = buf.writeBigInt64LE(222n, offset1);
  return offset1 === 8 && offset2 === 16;
});

// 部分重叠写入
test('writeBigInt64BE - 部分重叠写入', () => {
  const buf = Buffer.alloc(12);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64BE(0x2222222222222222n, 4);

  if (buf[0] !== 0x11) return false;
  if (buf[4] !== 0x22) return false;
  if (buf[11] !== 0x22) return false;
  return true;
});

test('writeBigInt64LE - 部分重叠写入', () => {
  const buf = Buffer.alloc(12);
  buf.writeBigInt64LE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 4);

  if (buf[0] !== 0x11) return false;
  if (buf[4] !== 0x22) return false;
  if (buf[11] !== 0x22) return false;
  return true;
});

// 写入后不影响其他位置
test('writeBigInt64BE - 不影响前后数据', () => {
  const buf = Buffer.alloc(24);
  buf.fill(0xAA);
  buf.writeBigInt64BE(0n, 8);

  if (buf[0] !== 0xAA || buf[7] !== 0xAA) return false;
  if (buf[16] !== 0xAA || buf[23] !== 0xAA) return false;

  for (let i = 8; i < 16; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('writeBigInt64LE - 不影响前后数据', () => {
  const buf = Buffer.alloc(24);
  buf.fill(0xBB);
  buf.writeBigInt64LE(0n, 8);

  if (buf[0] !== 0xBB || buf[7] !== 0xBB) return false;
  if (buf[16] !== 0xBB || buf[23] !== 0xBB) return false;

  for (let i = 8; i < 16; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

// 零填充的 Buffer
test('writeBigInt64BE - 在零填充Buffer中写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123456789n, 0);
  return buf.readBigInt64BE(0) === 123456789n;
});

test('writeBigInt64LE - 在零填充Buffer中写入', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(123456789n, 0);
  return buf.readBigInt64LE(0) === 123456789n;
});

// 随机填充的 Buffer
test('writeBigInt64BE - 在随机填充Buffer中写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0x99);
  buf.writeBigInt64BE(987654321n, 0);
  return buf.readBigInt64BE(0) === 987654321n;
});

test('writeBigInt64LE - 在随机填充Buffer中写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0x99);
  buf.writeBigInt64LE(987654321n, 0);
  return buf.readBigInt64LE(0) === 987654321n;
});

// 数值精度边界
test('writeBigInt64BE - Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  const value = 9007199254740991n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64BE - Number.MAX_SAFE_INTEGER + 1', () => {
  const buf = Buffer.alloc(8);
  const value = 9007199254740992n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64BE - -Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  const value = -9007199254740991n;
  buf.writeBigInt64BE(value, 0);
  return buf.readBigInt64BE(0) === value;
});

test('writeBigInt64LE - Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  const value = 9007199254740991n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

test('writeBigInt64LE - Number.MAX_SAFE_INTEGER + 1', () => {
  const buf = Buffer.alloc(8);
  const value = 9007199254740992n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

test('writeBigInt64LE - -Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(8);
  const value = -9007199254740991n;
  buf.writeBigInt64LE(value, 0);
  return buf.readBigInt64LE(0) === value;
});

// 使用 offset 参数默认值
test('writeBigInt64BE - 省略 offset 参数（默认0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x1234567890ABCDEFn);
  return buf[0] === 0x12 && buf[7] === 0xEF;
});

test('writeBigInt64LE - 省略 offset 参数（默认0）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x1234567890ABCDEFn);
  return buf[0] === 0xEF && buf[7] === 0x12;
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
