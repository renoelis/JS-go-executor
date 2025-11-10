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

// === 最大值测试 ===

test('BE: 1字节最大值 0xFF', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntBE(0, 1) === 255;
});

test('LE: 1字节最大值 0xFF', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntLE(0, 1) === 255;
});

test('BE: 2字节最大值 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntBE(0, 2) === 65535;
});

test('LE: 2字节最大值 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntLE(0, 2) === 65535;
});

test('BE: 3字节最大值 0xFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 3) === 16777215;
});

test('LE: 3字节最大值 0xFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 3) === 16777215;
});

test('BE: 4字节最大值 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 4) === 4294967295;
});

test('LE: 4字节最大值 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 4) === 4294967295;
});

test('BE: 5字节最大值 0xFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 5) === 1099511627775;
});

test('LE: 5字节最大值 0xFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 5) === 1099511627775;
});

test('BE: 6字节最大值 0xFFFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('LE: 6字节最大值 0xFFFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

// === 最小值测试（全0） ===

test('BE: 1字节最小值 0x00', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUIntBE(0, 1) === 0;
});

test('LE: 1字节最小值 0x00', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUIntLE(0, 1) === 0;
});

test('BE: 2字节最小值 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUIntBE(0, 2) === 0;
});

test('LE: 2字节最小值 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUIntLE(0, 2) === 0;
});

test('BE: 3字节最小值 0x000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 3) === 0;
});

test('LE: 3字节最小值 0x000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 3) === 0;
});

test('BE: 4字节最小值 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 4) === 0;
});

test('LE: 4字节最小值 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 4) === 0;
});

test('BE: 5字节最小值 0x0000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 5) === 0;
});

test('LE: 5字节最小值 0x0000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 5) === 0;
});

test('BE: 6字节最小值 0x000000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 0;
});

test('LE: 6字节最小值 0x000000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 6) === 0;
});

// === 中间值测试 ===

test('BE: 2字节中间值 0x8000', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readUIntBE(0, 2) === 32768;
});

test('LE: 2字节中间值 0x8000', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readUIntLE(0, 2) === 32768;
});

test('BE: 4字节中间值 0x80000000', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 4) === 2147483648;
});

test('LE: 4字节中间值 0x80000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readUIntLE(0, 4) === 2147483648;
});

test('BE: 6字节中间值 0x800000000000', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 140737488355328;
});

test('LE: 6字节中间值 0x800000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readUIntLE(0, 6) === 140737488355328;
});

// === 单字节非零测试 ===

test('BE: 只有第一个字节非零 - 2字节', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readUIntBE(0, 2) === 0xFF00;
});

test('LE: 只有第一个字节非零 - 2字节', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readUIntLE(0, 2) === 0x00FF;
});

test('BE: 只有最后一个字节非零 - 2字节', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readUIntBE(0, 2) === 0x00FF;
});

test('LE: 只有最后一个字节非零 - 2字节', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readUIntLE(0, 2) === 0xFF00;
});

test('BE: 只有第一个字节非零 - 6字节', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 0xFF0000000000;
});

test('LE: 只有第一个字节非零 - 6字节', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 6) === 0x0000000000FF;
});

test('BE: 只有最后一个字节非零 - 6字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF]);
  return buf.readUIntBE(0, 6) === 0x0000000000FF;
});

test('LE: 只有最后一个字节非零 - 6字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF]);
  return buf.readUIntLE(0, 6) === 0xFF0000000000;
});

// === 交替模式 ===

test('BE: 交替模式 0xAA - 2字节', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUIntBE(0, 2) === 0xAAAA;
});

test('LE: 交替模式 0xAA - 2字节', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUIntLE(0, 2) === 0xAAAA;
});

test('BE: 交替模式 0x55 - 2字节', () => {
  const buf = Buffer.from([0x55, 0x55]);
  return buf.readUIntBE(0, 2) === 0x5555;
});

test('LE: 交替模式 0x55 - 2字节', () => {
  const buf = Buffer.from([0x55, 0x55]);
  return buf.readUIntLE(0, 2) === 0x5555;
});

test('BE: 交替模式 0xAA - 6字节', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUIntBE(0, 6) === 187649984473770;
});

test('LE: 交替模式 0xAA - 6字节', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUIntLE(0, 6) === 187649984473770;
});

// === 递增模式 ===

test('BE: 递增模式 [0x01, 0x02, 0x03]', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  return buf.readUIntBE(0, 3) === 0x010203;
});

test('LE: 递增模式 [0x03, 0x02, 0x01]', () => {
  const buf = Buffer.from([0x03, 0x02, 0x01]);
  return buf.readUIntLE(0, 3) === 0x010203;
});

test('BE: 递增模式 [0x01, 0x02, 0x03, 0x04, 0x05, 0x06]', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  return buf.readUIntBE(0, 6) === 0x010203040506;
});

test('LE: 递增模式 [0x06, 0x05, 0x04, 0x03, 0x02, 0x01]', () => {
  const buf = Buffer.from([0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
  return buf.readUIntLE(0, 6) === 0x010203040506;
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
