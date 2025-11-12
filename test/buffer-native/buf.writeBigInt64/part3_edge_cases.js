// buf.writeBigInt64BE/LE - Edge Cases Tests
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

// 边界值写入
test('writeBigInt64BE - 最大安全整数边界', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(9007199254740991n, 0);
  const read = buf.readBigInt64BE(0);
  return read === 9007199254740991n;
});

test('writeBigInt64BE - 超过最大安全整数但在64位范围内', () => {
  const buf = Buffer.alloc(8);
  const value = 9007199254740992n;
  buf.writeBigInt64BE(value, 0);
  const read = buf.readBigInt64BE(0);
  return read === value;
});

test('writeBigInt64LE - 最大安全整数边界', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(9007199254740991n, 0);
  const read = buf.readBigInt64LE(0);
  return read === 9007199254740991n;
});

test('writeBigInt64LE - 超过最大安全整数但在64位范围内', () => {
  const buf = Buffer.alloc(8);
  const value = 9007199254740992n;
  buf.writeBigInt64LE(value, 0);
  const read = buf.readBigInt64LE(0);
  return read === value;
});

// 64位边界值
test('writeBigInt64BE - 64位最大值 - 1', () => {
  const buf = Buffer.alloc(8);
  const value = 0x7FFFFFFFFFFFFFFEn;
  buf.writeBigInt64BE(value, 0);
  const read = buf.readBigInt64BE(0);
  return read === value;
});

test('writeBigInt64BE - 64位最小值 + 1', () => {
  const buf = Buffer.alloc(8);
  const value = -0x7FFFFFFFFFFFFFFFn;
  buf.writeBigInt64BE(value, 0);
  const read = buf.readBigInt64BE(0);
  return read === value;
});

test('writeBigInt64LE - 64位最大值 - 1', () => {
  const buf = Buffer.alloc(8);
  const value = 0x7FFFFFFFFFFFFFFEn;
  buf.writeBigInt64LE(value, 0);
  const read = buf.readBigInt64LE(0);
  return read === value;
});

test('writeBigInt64LE - 64位最小值 + 1', () => {
  const buf = Buffer.alloc(8);
  const value = -0x7FFFFFFFFFFFFFFFn;
  buf.writeBigInt64LE(value, 0);
  const read = buf.readBigInt64LE(0);
  return read === value;
});

// 超出64位范围的值（Node.js会抛错）
test('writeBigInt64BE - 超出64位正数范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const overflowValue = 0x8000000000000000n;
  try {
    buf.writeBigInt64BE(overflowValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

test('writeBigInt64BE - 超出64位负数范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const underflowValue = -0x8000000000000001n;
  try {
    buf.writeBigInt64BE(underflowValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 超出64位正数范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const overflowValue = 0x8000000000000000n;
  try {
    buf.writeBigInt64LE(overflowValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 超出64位负数范围（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const underflowValue = -0x8000000000000001n;
  try {
    buf.writeBigInt64LE(underflowValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

// 极大数值超出范围（应抛错）
test('writeBigInt64BE - 远超64位范围的正数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const hugeValue = 0x1234567890ABCDEFn * 0x1000000000000000n;
  try {
    buf.writeBigInt64BE(hugeValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

test('writeBigInt64BE - 远超64位范围的负数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const hugeValue = -0x1234567890ABCDEFn * 0x1000000000000000n;
  try {
    buf.writeBigInt64BE(hugeValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 远超64位范围的正数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const hugeValue = 0x1234567890ABCDEFn * 0x1000000000000000n;
  try {
    buf.writeBigInt64LE(hugeValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

test('writeBigInt64LE - 远超64位范围的负数（应抛错）', () => {
  const buf = Buffer.alloc(8);
  const hugeValue = -0x1234567890ABCDEFn * 0x1000000000000000n;
  try {
    buf.writeBigInt64LE(hugeValue, 0);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('range');
  }
});

// 刚好8字节的Buffer
test('writeBigInt64BE - 刚好8字节Buffer offset=0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64BE(0x0102030405060708n, 0);
  return result === 8 && buf[0] === 0x01 && buf[7] === 0x08;
});

test('writeBigInt64LE - 刚好8字节Buffer offset=0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigInt64LE(0x0102030405060708n, 0);
  return result === 8 && buf[0] === 0x08 && buf[7] === 0x01;
});

// 在超大Buffer中写入
test('writeBigInt64BE - 在大Buffer中的最后位置写入', () => {
  const buf = Buffer.alloc(1024);
  const offset = 1016;
  buf.writeBigInt64BE(0x7ABBCCDDEEFF0011n, offset);
  return buf[offset] === 0x7A && buf[offset + 7] === 0x11;
});

test('writeBigInt64LE - 在大Buffer中的最后位置写入', () => {
  const buf = Buffer.alloc(1024);
  const offset = 1016;
  buf.writeBigInt64LE(0x7ABBCCDDEEFF0011n, offset);
  return buf[offset] === 0x11 && buf[offset + 7] === 0x7A;
});

// 连续写入多个值
test('writeBigInt64BE - 连续写入不重叠', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64BE(0x2222222222222222n, 8);
  buf.writeBigInt64BE(0x3333333333333333n, 16);

  return buf[0] === 0x11 && buf[8] === 0x22 && buf[16] === 0x33;
});

test('writeBigInt64LE - 连续写入不重叠', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64LE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 8);
  buf.writeBigInt64LE(0x3333333333333333n, 16);

  return buf[0] === 0x11 && buf[8] === 0x22 && buf[16] === 0x33;
});

// offset 为最大有效值
test('writeBigInt64BE - offset为buffer.length-8', () => {
  const buf = Buffer.alloc(16);
  const offset = buf.writeBigInt64BE(0x7FEEDDCCBBAA9988n, 8);
  return offset === 16 && buf[8] === 0x7F && buf[15] === 0x88;
});

test('writeBigInt64LE - offset为buffer.length-8', () => {
  const buf = Buffer.alloc(16);
  const offset = buf.writeBigInt64LE(0x7FEEDDCCBBAA9988n, 8);
  return offset === 16 && buf[8] === 0x88 && buf[15] === 0x7F;
});

// 特殊数值模式
test('writeBigInt64BE - 所有位为1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-1n, 0);
  let allFF = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) allFF = false;
  }
  return allFF;
});

test('writeBigInt64BE - 交替位模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x5555555555555555n, 0);
  return buf[0] === 0x55 && buf[7] === 0x55;
});

test('writeBigInt64LE - 所有位为1', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-1n, 0);
  let allFF = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) allFF = false;
  }
  return allFF;
});

test('writeBigInt64LE - 交替位模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x5555555555555555n, 0);
  return buf[0] === 0x55 && buf[7] === 0x55;
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
