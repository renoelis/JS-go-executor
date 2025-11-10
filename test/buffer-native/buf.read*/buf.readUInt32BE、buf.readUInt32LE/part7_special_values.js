// 特殊值测试
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

// 全零值
test('BE: 全零值 [0x00, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0;
});

test('LE: 全零值 [0x00, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0;
});

// 全 1 值
test('BE: 全 1 值 [0xFF, 0xFF, 0xFF, 0xFF]', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 4294967295;
});

test('LE: 全 1 值 [0xFF, 0xFF, 0xFF, 0xFF]', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(0) === 4294967295;
});

// 单字节非零
test('BE: 单字节非零 [0xFF, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0xFF000000;
});

test('LE: 单字节非零 [0xFF, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0x000000FF;
});

test('BE: 单字节非零 [0x00, 0xFF, 0x00, 0x00]', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0x00FF0000;
});

test('LE: 单字节非零 [0x00, 0xFF, 0x00, 0x00]', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0x0000FF00;
});

test('BE: 单字节非零 [0x00, 0x00, 0xFF, 0x00]', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0x00]);
  return buf.readUInt32BE(0) === 0x0000FF00;
});

test('LE: 单字节非零 [0x00, 0x00, 0xFF, 0x00]', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF, 0x00]);
  return buf.readUInt32LE(0) === 0x00FF0000;
});

test('BE: 单字节非零 [0x00, 0x00, 0x00, 0xFF]', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readUInt32BE(0) === 0x000000FF;
});

test('LE: 单字节非零 [0x00, 0x00, 0x00, 0xFF]', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readUInt32LE(0) === 0xFF000000;
});

// 交替模式
test('BE: 交替模式 [0xAA, 0x55, 0xAA, 0x55]', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55]);
  return buf.readUInt32BE(0) === 0xAA55AA55;
});

test('LE: 交替模式 [0xAA, 0x55, 0xAA, 0x55]', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55]);
  return buf.readUInt32LE(0) === 0x55AA55AA;
});

test('BE: 交替模式 [0x55, 0xAA, 0x55, 0xAA]', () => {
  const buf = Buffer.from([0x55, 0xAA, 0x55, 0xAA]);
  return buf.readUInt32BE(0) === 0x55AA55AA;
});

test('LE: 交替模式 [0x55, 0xAA, 0x55, 0xAA]', () => {
  const buf = Buffer.from([0x55, 0xAA, 0x55, 0xAA]);
  return buf.readUInt32LE(0) === 0xAA55AA55;
});

// 递增序列
test('BE: 递增序列 [0x01, 0x02, 0x03, 0x04]', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  return buf.readUInt32BE(0) === 0x01020304;
});

test('LE: 递增序列 [0x01, 0x02, 0x03, 0x04]', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  return buf.readUInt32LE(0) === 0x04030201;
});

// 递减序列
test('BE: 递减序列 [0x04, 0x03, 0x02, 0x01]', () => {
  const buf = Buffer.from([0x04, 0x03, 0x02, 0x01]);
  return buf.readUInt32BE(0) === 0x04030201;
});

test('LE: 递减序列 [0x04, 0x03, 0x02, 0x01]', () => {
  const buf = Buffer.from([0x04, 0x03, 0x02, 0x01]);
  return buf.readUInt32LE(0) === 0x01020304;
});

// 2 的幂次
test('BE: 2^0 = 1', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readUInt32BE(0) === 1;
});

test('LE: 2^0 = 1', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 1;
});

test('BE: 2^8 = 256', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01, 0x00]);
  return buf.readUInt32BE(0) === 256;
});

test('LE: 2^8 = 256', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 256;
});

test('BE: 2^16 = 65536', () => {
  const buf = Buffer.from([0x00, 0x01, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 65536;
});

test('LE: 2^16 = 65536', () => {
  const buf = Buffer.from([0x00, 0x00, 0x01, 0x00]);
  return buf.readUInt32LE(0) === 65536;
});

test('BE: 2^24 = 16777216', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 16777216;
});

test('LE: 2^24 = 16777216', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x01]);
  return buf.readUInt32LE(0) === 16777216;
});

test('BE: 2^31 = 2147483648', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 2147483648;
});

test('LE: 2^31 = 2147483648', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readUInt32LE(0) === 2147483648;
});

// 2^31 - 1 (最大有符号 32 位整数)
test('BE: 2^31 - 1 = 2147483647', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 2147483647;
});

test('LE: 2^31 - 1 = 2147483647', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readUInt32LE(0) === 2147483647;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;
const result = {
  success: failed === 0,
  summary: { total: tests.length, passed, failed, successRate: ((passed / tests.length) * 100).toFixed(2) + '%' },
  tests
};
console.log(JSON.stringify(result, null, 2));
return result;
