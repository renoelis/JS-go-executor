// buf.writeBigUInt64BE/LE - 深度补充轮1：精确字节序与特殊参数
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

// ===== offset 特殊浮点零形式 =====

test('writeBigUInt64BE - offset=0.0（浮点零）应接受', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0x1234567890ABCDEFn, 0.0);
  return result === 8 && buf[0] === 0x12 && buf[7] === 0xEF;
});

test('writeBigUInt64LE - offset=0.0（浮点零）应接受', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0x1234567890ABCDEFn, 0.0);
  return result === 8 && buf[0] === 0xEF && buf[7] === 0x12;
});

test('writeBigUInt64BE - offset=-0.0（负浮点零）应接受', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0xAABBCCDDEEFF0011n, -0.0);
  return result === 8 && buf[0] === 0xAA && buf[7] === 0x11;
});

test('writeBigUInt64LE - offset=-0.0（负浮点零）应接受', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0xAABBCCDDEEFF0011n, -0.0);
  return result === 8 && buf[0] === 0x11 && buf[7] === 0xAA;
});

test('writeBigUInt64BE - offset=+0（正零）应接受', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0xFEDCBA9876543210n, +0);
  return result === 8 && buf[0] === 0xFE && buf[7] === 0x10;
});

test('writeBigUInt64LE - offset=+0（正零）应接受', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0xFEDCBA9876543210n, +0);
  return result === 8 && buf[0] === 0x10 && buf[7] === 0xFE;
});

// ===== offset=undefined 测试 =====

test('writeBigUInt64BE - offset=undefined 应视为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64BE(0x0102030405060708n, undefined);
  return result === 8 && buf[0] === 0x01 && buf[7] === 0x08;
});

test('writeBigUInt64LE - offset=undefined 应视为 0', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeBigUInt64LE(0x0102030405060708n, undefined);
  return result === 8 && buf[0] === 0x08 && buf[7] === 0x01;
});

// ===== 单字节边界值（0x7F、0x80、0xFF、0x100）=====

test('writeBigUInt64BE - 写入 0x7Fn (127)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x7Fn, 0);
  return buf.toString('hex') === '000000000000007f';
});

test('writeBigUInt64LE - 写入 0x7Fn (127)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x7Fn, 0);
  return buf.toString('hex') === '7f00000000000000';
});

test('writeBigUInt64BE - 写入 0x80n (128)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x80n, 0);
  return buf.toString('hex') === '0000000000000080';
});

test('writeBigUInt64LE - 写入 0x80n (128)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x80n, 0);
  return buf.toString('hex') === '8000000000000000';
});

test('writeBigUInt64BE - 写入 0xFFn (255)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0xFFn, 0);
  return buf.toString('hex') === '00000000000000ff';
});

test('writeBigUInt64LE - 写入 0xFFn (255)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0xFFn, 0);
  return buf.toString('hex') === 'ff00000000000000';
});

test('writeBigUInt64BE - 写入 0x100n (256)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x100n, 0);
  return buf.toString('hex') === '0000000000000100';
});

test('writeBigUInt64LE - 写入 0x100n (256)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x100n, 0);
  return buf.toString('hex') === '0001000000000000';
});

// ===== 字节序精确验证（高位字节）=====

test('writeBigUInt64BE - 0x8000000000000000n 字节序验证', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x8000000000000000n, 0);
  return buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeBigUInt64LE - 0x8000000000000000n 字节序验证', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x8000000000000000n, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x80;
});

test('writeBigUInt64BE - 0x0000000000000080n 字节序验证', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0000000000000080n, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x80;
});

test('writeBigUInt64LE - 0x0000000000000080n 字节序验证', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(0x0000000000000080n, 0);
  return buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 && buf[6] === 0x00 && buf[7] === 0x00;
});

// ===== BigInt 不同进制表示 =====

test('writeBigUInt64BE - 二进制表示 0b1111111111111111111111111111111111111111111111111111111111111111n', () => {
  const buf = Buffer.alloc(8);
  const val = 0b1111111111111111111111111111111111111111111111111111111111111111n;
  buf.writeBigUInt64BE(val, 0);
  return buf.toString('hex') === 'ffffffffffffffff';
});

test('writeBigUInt64LE - 二进制表示 0b1111111111111111111111111111111111111111111111111111111111111111n', () => {
  const buf = Buffer.alloc(8);
  const val = 0b1111111111111111111111111111111111111111111111111111111111111111n;
  buf.writeBigUInt64LE(val, 0);
  return buf.toString('hex') === 'ffffffffffffffff';
});

test('writeBigUInt64BE - 八进制表示 0o777777777777777777777n', () => {
  const buf = Buffer.alloc(8);
  const val = 0o777777777777777777777n;
  buf.writeBigUInt64BE(val, 0);
  return buf.toString('hex') === '7fffffffffffffff';
});

test('writeBigUInt64LE - 八进制表示 0o777777777777777777777n', () => {
  const buf = Buffer.alloc(8);
  const val = 0o777777777777777777777n;
  buf.writeBigUInt64LE(val, 0);
  return buf.toString('hex') === 'ffffffffffffff7f';
});

test('writeBigUInt64BE - 十进制大数 1234567890123456789n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1234567890123456789n, 0);
  return buf.toString('hex') === '112210f47de98115';
});

test('writeBigUInt64LE - 十进制大数 1234567890123456789n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(1234567890123456789n, 0);
  return buf.toString('hex') === '1581e97df4102211';
});

// ===== 连续 offset 边界（更多尺寸）=====

test('writeBigUInt64BE - buffer size=15, offset=7（最大）', () => {
  const buf = Buffer.alloc(15);
  const result = buf.writeBigUInt64BE(0xAAn, 7);
  return result === 15;
});

test('writeBigUInt64LE - buffer size=15, offset=7（最大）', () => {
  const buf = Buffer.alloc(15);
  const result = buf.writeBigUInt64LE(0xAAn, 7);
  return result === 15;
});

test('writeBigUInt64BE - buffer size=17, offset=9（最大）', () => {
  const buf = Buffer.alloc(17);
  const result = buf.writeBigUInt64BE(0xBBn, 9);
  return result === 17;
});

test('writeBigUInt64LE - buffer size=17, offset=9（最大）', () => {
  const buf = Buffer.alloc(17);
  const result = buf.writeBigUInt64LE(0xBBn, 9);
  return result === 17;
});

test('writeBigUInt64BE - buffer size=100, offset=92（最大）', () => {
  const buf = Buffer.alloc(100);
  const result = buf.writeBigUInt64BE(0xCCn, 92);
  return result === 100;
});

test('writeBigUInt64LE - buffer size=100, offset=92（最大）', () => {
  const buf = Buffer.alloc(100);
  const result = buf.writeBigUInt64LE(0xCCn, 92);
  return result === 100;
});

test('writeBigUInt64BE - buffer size=100, offset=93 应抛错', () => {
  const buf = Buffer.alloc(100);
  try {
    buf.writeBigUInt64BE(0xCCn, 93);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
  }
});

test('writeBigUInt64LE - buffer size=100, offset=93 应抛错', () => {
  const buf = Buffer.alloc(100);
  try {
    buf.writeBigUInt64LE(0xCCn, 93);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('range');
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
