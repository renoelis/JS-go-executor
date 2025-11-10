// 大小端序验证测试
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

// 大小端序差异验证
test('BE vs LE: [0x12, 0x34, 0x56, 0x78]', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const be = buf.readUInt32BE(0);
  const le = buf.readUInt32LE(0);
  return be === 0x12345678 && le === 0x78563412;
});

test('BE vs LE: [0xFF, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0xFF000000 && buf.readUInt32LE(0) === 0x000000FF;
});

test('BE vs LE: [0x00, 0x00, 0x00, 0xFF]', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readUInt32BE(0) === 0x000000FF && buf.readUInt32LE(0) === 0xFF000000;
});

test('BE vs LE: [0xAB, 0xCD, 0xEF, 0x01]', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xEF, 0x01]);
  return buf.readUInt32BE(0) === 0xABCDEF01 && buf.readUInt32LE(0) === 0x01EFCDAB;
});

test('BE: 连续读取不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE]);
  return buf.readUInt32BE(0) === 0x12345678 && 
         buf.readUInt32BE(1) === 0x3456789A && 
         buf.readUInt32BE(2) === 0x56789ABC &&
         buf.readUInt32BE(3) === 0x789ABCDE;
});

test('LE: 连续读取不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE]);
  return buf.readUInt32LE(0) === 0x78563412 && 
         buf.readUInt32LE(1) === 0x9A785634 && 
         buf.readUInt32LE(2) === 0xBC9A7856 &&
         buf.readUInt32LE(3) === 0xDEBC9A78;
});

test('BE: 写入后读取验证', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x9ABCDEF0, 4);
  return buf.readUInt32BE(0) === 0x12345678 && buf.readUInt32BE(4) === 0x9ABCDEF0;
});

test('LE: 写入后读取验证', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32LE(0x9ABCDEF0, 4);
  return buf.readUInt32LE(0) === 0x12345678 && buf.readUInt32LE(4) === 0x9ABCDEF0;
});

test('BE: 最大值 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 4294967295;
});

test('LE: 最大值 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32LE(0) === 4294967295;
});

test('BE: 最小值 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 0;
});

test('LE: 最小值 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUInt32LE(0) === 0;
});

test('BE: 中间值 0x80000000', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readUInt32BE(0) === 2147483648;
});

test('LE: 中间值 0x80000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readUInt32LE(0) === 2147483648;
});

test('BE: 对称值 [0xAA, 0xAA, 0xAA, 0xAA]', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUInt32BE(0) === 0xAAAAAAAA;
});

test('LE: 对称值 [0xAA, 0xAA, 0xAA, 0xAA]', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUInt32LE(0) === 0xAAAAAAAA;
});

test('BE: 特殊值 0x7FFFFFFF', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readUInt32BE(0) === 2147483647;
});

test('LE: 特殊值 0x7FFFFFFF', () => {
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
