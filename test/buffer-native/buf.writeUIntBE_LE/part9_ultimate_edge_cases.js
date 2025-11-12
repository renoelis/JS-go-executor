// buf.writeUIntBE/LE() - 终极边界情况测试
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

// JavaScript 数字精度边界
test('writeUIntBE 6字节接近 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.allocUnsafe(7);
  const value = 0xffffffffffff;
  buf.writeUIntBE(value, 0, 6);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff && buf[5] === 0xff;
});

test('writeUIntLE 6字节接近 Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.allocUnsafe(7);
  const value = 0xffffffffffff;
  buf.writeUIntLE(value, 0, 6);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff && buf[5] === 0xff;
});

// 边界值：2的幂次
test('writeUIntBE 值为 2^8 - 1 (255)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(Math.pow(2, 8) - 1, 0, 1);
  return buf[0] === 255;
});

test('writeUIntBE 值为 2^16 - 1 (65535)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(Math.pow(2, 16) - 1, 0, 2);
  return buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntBE 值为 2^24 - 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(Math.pow(2, 24) - 1, 0, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

test('writeUIntLE 值为 2^8 - 1 (255)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(Math.pow(2, 8) - 1, 0, 1);
  return buf[0] === 255;
});

test('writeUIntLE 值为 2^16 - 1 (65535)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(Math.pow(2, 16) - 1, 0, 2);
  return buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntLE 值为 2^24 - 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(Math.pow(2, 24) - 1, 0, 3);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

// 边界值：2的幂次 + 1（应该报错）
test('writeUIntBE 值为 2^8 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(Math.pow(2, 8), 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntBE 值为 2^16 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(Math.pow(2, 16), 0, 2);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE 值为 2^8 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(Math.pow(2, 8), 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE 值为 2^16 应该报错', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(Math.pow(2, 16), 0, 2);
    return false;
  } catch (e) {
    return true;
  }
});

// 所有位为 1
test('writeUIntBE 所有位为 1 (1字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0b11111111, 0, 1);
  return buf[0] === 0xff;
});

test('writeUIntBE 所有位为 1 (2字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0b1111111111111111, 0, 2);
  return buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntLE 所有位为 1 (1字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0b11111111, 0, 1);
  return buf[0] === 0xff;
});

test('writeUIntLE 所有位为 1 (2字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0b1111111111111111, 0, 2);
  return buf[0] === 0xff && buf[1] === 0xff;
});

// 只有最高位为 1
test('writeUIntBE 只有最高位为 1 (1字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0b10000000, 0, 1);
  return buf[0] === 0x80;
});

test('writeUIntBE 只有最高位为 1 (2字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0b1000000000000000, 0, 2);
  return buf[0] === 0x80 && buf[1] === 0x00;
});

test('writeUIntLE 只有最高位为 1 (1字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0b10000000, 0, 1);
  return buf[0] === 0x80;
});

test('writeUIntLE 只有最高位为 1 (2字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0b1000000000000000, 0, 2);
  return buf[0] === 0x00 && buf[1] === 0x80;
});

// 只有最低位为 1
test('writeUIntBE 只有最低位为 1 (2字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0b0000000000000001, 0, 2);
  return buf[0] === 0x00 && buf[1] === 0x01;
});

test('writeUIntLE 只有最低位为 1 (2字节)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0b0000000000000001, 0, 2);
  return buf[0] === 0x01 && buf[1] === 0x00;
});

// 奇数偶数边界
test('writeUIntBE 奇数值 byteLength=3', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0x123457, 0, 3);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x57;
});

test('writeUIntLE 奇数值 byteLength=3', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0x123457, 0, 3);
  return buf[0] === 0x57 && buf[1] === 0x34 && buf[2] === 0x12;
});

// 连续递增值
test('writeUIntBE 连续递增字节序列', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0x0102030405, 0, 5);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 4 && buf[4] === 5;
});

test('writeUIntLE 连续递增字节序列', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntLE(0x0102030405, 0, 5);
  return buf[0] === 5 && buf[1] === 4 && buf[2] === 3 && buf[3] === 2 && buf[4] === 1;
});

// 回文模式
test('writeUIntBE 回文字节模式', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0x123321, 0, 3);
  return buf[0] === 0x12 && buf[1] === 0x33 && buf[2] === 0x21;
});

test('writeUIntLE 回文字节模式', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntLE(0x123321, 0, 3);
  return buf[0] === 0x21 && buf[1] === 0x33 && buf[2] === 0x12;
});

// 极限长度 buffer
test('writeUIntBE 在长度为 6 的 buffer 写入 6 字节', () => {
  const buf = Buffer.allocUnsafe(6);
  const r = buf.writeUIntBE(0xffffffffffff, 0, 6);
  return r === 6 && buf.every(b => b === 0xff);
});

test('writeUIntLE 在长度为 6 的 buffer 写入 6 字节', () => {
  const buf = Buffer.allocUnsafe(6);
  const r = buf.writeUIntLE(0xffffffffffff, 0, 6);
  return r === 6 && buf.every(b => b === 0xff);
});

// 混合大小端写入同一 buffer
test('混合 BE 和 LE 写入不同位置', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeUIntBE(0x1234, 0, 2);
  buf.writeUIntLE(0x5678, 2, 2);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x78 && buf[3] === 0x56;
});

// 参数边界组合
test('writeUIntBE 最大合法参数组合', () => {
  const buf = Buffer.allocUnsafe(100);
  const r = buf.writeUIntBE(0xffffffffffff, 94, 6);
  return r === 100 && buf[94] === 0xff && buf[99] === 0xff;
});

test('writeUIntLE 最大合法参数组合', () => {
  const buf = Buffer.allocUnsafe(100);
  const r = buf.writeUIntLE(0xffffffffffff, 94, 6);
  return r === 100 && buf[94] === 0xff && buf[99] === 0xff;
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
