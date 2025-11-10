// buf.readBigUInt64BE() - 字节序（Endianness）专项测试
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

// Big-Endian vs Little-Endian 对比
test('BE vs LE - 256n', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00]);
  const be = buf.readBigUInt64BE(0);
  const le = buf.readBigUInt64LE(0);
  return be === 256n && le === 281474976710656n && be !== le;
});

test('BE vs LE - 不同值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const be = buf.readBigUInt64BE(0);
  const le = buf.readBigUInt64LE(0);
  return be === 72623859790382856n && le === 578437695752307201n && be !== le;
});

// 字节序验证 - 每个字节位置
test('第一个字节（最高位）', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64BE(0) === 18374686479671623680n; // 0xFF << 56
});

test('第二个字节', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64BE(0) === 71776119061217280n; // 0xFF << 48
});

test('第三个字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64BE(0) === 280375465082880n; // 0xFF << 40
});

test('第四个字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64BE(0) === 1095216660480n; // 0xFF << 32
});

test('第五个字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64BE(0) === 4278190080n; // 0xFF << 24
});

test('第六个字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00]);
  return buf.readBigUInt64BE(0) === 16711680n; // 0xFF << 16
});

test('第七个字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x00]);
  return buf.readBigUInt64BE(0) === 65280n; // 0xFF << 8
});

test('第八个字节（最低位）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF]);
  return buf.readBigUInt64BE(0) === 255n; // 0xFF
});

// 所有字节都是 0xFF
test('所有字节 0xFF（最大值）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readBigUInt64BE(0) === 18446744073709551615n;
});

// 交替模式
test('交替模式 0xAA', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readBigUInt64BE(0) === 12297829382473034410n;
});

test('交替模式 0x55', () => {
  const buf = Buffer.from([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55]);
  return buf.readBigUInt64BE(0) === 6148914691236517205n;
});

// 递增序列
test('递增序列 0x01-0x08', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  return buf.readBigUInt64BE(0) === 72623859790382856n;
});

// 递减序列
test('递减序列 0x08-0x01', () => {
  const buf = Buffer.from([0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
  return buf.readBigUInt64BE(0) === 578437695752307201n;
});

// 写入 BE 读取 BE
test('writeBigUInt64BE + readBigUInt64BE 一致性', () => {
  const buf = Buffer.alloc(8);
  const value = 1234567890123456789n;
  buf.writeBigUInt64BE(value, 0);
  return buf.readBigUInt64BE(0) === value;
});

// 写入 LE 读取 BE（应该不同）
test('writeBigUInt64LE + readBigUInt64BE 不同', () => {
  const buf = Buffer.alloc(8);
  const value = 1234567890123456789n;
  buf.writeBigUInt64LE(value, 0);
  const beValue = buf.readBigUInt64BE(0);
  return beValue !== value;
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
