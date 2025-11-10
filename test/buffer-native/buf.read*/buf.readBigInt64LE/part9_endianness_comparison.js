// buf.readBigInt64LE() - 字节序对比测试（BE vs LE）
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

// BE vs LE 对比
test('相同字节不同字节序：0x0000000000000001', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return be === 1n && le === 72057594037927936n;
});

test('相同字节不同字节序：0x0102030405060708', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return be === 72623859790382856n && le === 578437695752307201n;
});

test('相同字节不同字节序：0xFFFFFFFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return be === -1n && le === -1n;
});

test('相同字节不同字节序：0x8000000000000000', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return be === -9223372036854775808n && le === 128n;
});

test('相同字节不同字节序：0x0000000000000080', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return be === 128n && le === -9223372036854775808n;
});

// 写入 BE 读取 LE（验证不一致）
test('写入 BE 100n，读取 LE 应不同', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n, 0);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return be === 100n && le !== 100n;
});

test('写入 LE 100n，读取 BE 应不同', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return le === 100n && be !== 100n;
});

// 对称字节模式（BE = LE）
test('对称字节：0x0000000000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigInt64BE(0) === buf.readBigInt64LE(0);
});

test('对称字节：0x0123456776543210', () => {
  const buf = Buffer.from([0x01, 0x23, 0x45, 0x67, 0x76, 0x54, 0x32, 0x10]);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  // 这个不是完全对称，BE 和 LE 应该不同
  return be !== le;
});

// 完全对称的字节序列
test('完全对称字节：0x0123456754321001', () => {
  const buf = Buffer.from([0x01, 0x23, 0x45, 0x67, 0x67, 0x45, 0x23, 0x01]);
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  return be === le;
});

// 验证字节序转换
test('BE 写入转 LE 读取的数值关系', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  const le = buf.readBigInt64LE(0);
  return le === 0x0807060504030201n;
});

test('LE 写入转 BE 读取的数值关系', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);
  const be = buf.readBigInt64BE(0);
  return be === 0x0807060504030201n;
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
