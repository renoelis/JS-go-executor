// 特殊值和边缘情况测试
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

// 所有位为 0
test('BE: 全零 Buffer', () => {
  const buf = Buffer.alloc(4);
  return buf.readUInt16BE(0) === 0 && buf.readUInt16BE(2) === 0;
});

test('LE: 全零 Buffer', () => {
  const buf = Buffer.alloc(4);
  return buf.readUInt16LE(0) === 0 && buf.readUInt16LE(2) === 0;
});

// 所有位为 1
test('BE: 全 1 Buffer (0xFFFF)', () => {
  const buf = Buffer.alloc(4, 0xFF);
  return buf.readUInt16BE(0) === 0xFFFF && buf.readUInt16BE(2) === 0xFFFF;
});

test('LE: 全 1 Buffer (0xFFFF)', () => {
  const buf = Buffer.alloc(4, 0xFF);
  return buf.readUInt16LE(0) === 0xFFFF && buf.readUInt16LE(2) === 0xFFFF;
});

// 交替位模式
test('BE: 交替位 [0xAA, 0x55]', () => {
  const buf = Buffer.from([0xAA, 0x55]);
  return buf.readUInt16BE(0) === 0xAA55;
});

test('LE: 交替位 [0xAA, 0x55]', () => {
  const buf = Buffer.from([0xAA, 0x55]);
  return buf.readUInt16LE(0) === 0x55AA;
});

test('BE: 交替位 [0x55, 0xAA]', () => {
  const buf = Buffer.from([0x55, 0xAA]);
  return buf.readUInt16BE(0) === 0x55AA;
});

test('LE: 交替位 [0x55, 0xAA]', () => {
  const buf = Buffer.from([0x55, 0xAA]);
  return buf.readUInt16LE(0) === 0xAA55;
});

// 单字节最大值
test('BE: [0xFF, 0x00]', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readUInt16BE(0) === 0xFF00;
});

test('LE: [0xFF, 0x00]', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readUInt16LE(0) === 0x00FF;
});

test('BE: [0x00, 0xFF]', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readUInt16BE(0) === 0x00FF;
});

test('LE: [0x00, 0xFF]', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readUInt16LE(0) === 0xFF00;
});

// 2 的幂次值
test('BE: 0x0001', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUInt16BE(0) === 1;
});

test('LE: 0x0001', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUInt16LE(0) === 1;
});

test('BE: 0x0100', () => {
  const buf = Buffer.from([0x01, 0x00]);
  return buf.readUInt16BE(0) === 256;
});

test('LE: 0x0100', () => {
  const buf = Buffer.from([0x00, 0x01]);
  return buf.readUInt16LE(0) === 256;
});

test('BE: 0x8000', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readUInt16BE(0) === 32768;
});

test('LE: 0x8000', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readUInt16LE(0) === 32768;
});

// 连续递增值
test('BE: 连续递增 [0x00, 0x01, 0x02, 0x03]', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  return buf.readUInt16BE(0) === 0x0001 && buf.readUInt16BE(2) === 0x0203;
});

test('LE: 连续递增 [0x00, 0x01, 0x02, 0x03]', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  return buf.readUInt16LE(0) === 0x0100 && buf.readUInt16LE(2) === 0x0302;
});

// 连续递减值
test('BE: 连续递减 [0xFF, 0xFE, 0xFD, 0xFC]', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]);
  return buf.readUInt16BE(0) === 0xFFFE && buf.readUInt16BE(2) === 0xFDFC;
});

test('LE: 连续递减 [0xFF, 0xFE, 0xFD, 0xFC]', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFD, 0xFC]);
  return buf.readUInt16LE(0) === 0xFEFF && buf.readUInt16LE(2) === 0xFCFD;
});

// 重复模式
test('BE: 重复模式 [0x12, 0x12]', () => {
  const buf = Buffer.from([0x12, 0x12]);
  return buf.readUInt16BE(0) === 0x1212;
});

test('LE: 重复模式 [0x12, 0x12]', () => {
  const buf = Buffer.from([0x12, 0x12]);
  return buf.readUInt16LE(0) === 0x1212;
});

// 质数值
test('BE: 质数 0x0065 (101)', () => {
  const buf = Buffer.from([0x00, 0x65]);
  return buf.readUInt16BE(0) === 101;
});

test('LE: 质数 0x0065 (101)', () => {
  const buf = Buffer.from([0x65, 0x00]);
  return buf.readUInt16LE(0) === 101;
});

test('BE: 质数 0xFFF1 (65521)', () => {
  const buf = Buffer.from([0xFF, 0xF1]);
  return buf.readUInt16BE(0) === 65521;
});

test('LE: 质数 0xFFF1 (65521)', () => {
  const buf = Buffer.from([0xF1, 0xFF]);
  return buf.readUInt16LE(0) === 65521;
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
