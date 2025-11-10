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
test('BE vs LE: [0x12, 0x34]', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const be = buf.readUInt16BE(0);
  const le = buf.readUInt16LE(0);
  return be === 0x1234 && le === 0x3412;
});

test('BE vs LE: [0xFF, 0x00]', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readUInt16BE(0) === 0xFF00 && buf.readUInt16LE(0) === 0x00FF;
});

test('BE vs LE: [0x00, 0xFF]', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readUInt16BE(0) === 0x00FF && buf.readUInt16LE(0) === 0xFF00;
});

test('BE vs LE: [0xAB, 0xCD]', () => {
  const buf = Buffer.from([0xAB, 0xCD]);
  return buf.readUInt16BE(0) === 0xABCD && buf.readUInt16LE(0) === 0xCDAB;
});

test('BE: 连续读取不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt16BE(0) === 0x1234 && 
         buf.readUInt16BE(1) === 0x3456 && 
         buf.readUInt16BE(2) === 0x5678;
});

test('LE: 连续读取不同 offset', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt16LE(0) === 0x3412 && 
         buf.readUInt16LE(1) === 0x5634 && 
         buf.readUInt16LE(2) === 0x7856;
});

test('BE: 写入后读取验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, 0);
  buf.writeUInt16BE(0x5678, 2);
  return buf.readUInt16BE(0) === 0x1234 && buf.readUInt16BE(2) === 0x5678;
});

test('LE: 写入后读取验证', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0x1234, 0);
  buf.writeUInt16LE(0x5678, 2);
  return buf.readUInt16LE(0) === 0x1234 && buf.readUInt16LE(2) === 0x5678;
});

test('BE: 最大值 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16BE(0) === 65535;
});

test('LE: 最大值 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUInt16LE(0) === 65535;
});

test('BE: 最小值 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUInt16BE(0) === 0;
});

test('LE: 最小值 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUInt16LE(0) === 0;
});

test('BE: 中间值 0x8000', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readUInt16BE(0) === 32768;
});

test('LE: 中间值 0x8000', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readUInt16LE(0) === 32768;
});

test('BE: 对称值 [0xAA, 0xAA]', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUInt16BE(0) === 0xAAAA;
});

test('LE: 对称值 [0xAA, 0xAA]', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUInt16LE(0) === 0xAAAA;
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
