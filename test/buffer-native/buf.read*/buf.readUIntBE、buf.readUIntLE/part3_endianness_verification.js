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

// 2字节大小端序对比
test('BE vs LE: [0x12, 0x34] - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const be = buf.readUIntBE(0, 2);
  const le = buf.readUIntLE(0, 2);
  return be === 0x1234 && le === 0x3412;
});

test('BE vs LE: [0xFF, 0x00] - 2字节', () => {
  const buf = Buffer.from([0xFF, 0x00]);
  return buf.readUIntBE(0, 2) === 0xFF00 && buf.readUIntLE(0, 2) === 0x00FF;
});

test('BE vs LE: [0x00, 0xFF] - 2字节', () => {
  const buf = Buffer.from([0x00, 0xFF]);
  return buf.readUIntBE(0, 2) === 0x00FF && buf.readUIntLE(0, 2) === 0xFF00;
});

// 3字节大小端序对比
test('BE vs LE: [0x12, 0x34, 0x56] - 3字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const be = buf.readUIntBE(0, 3);
  const le = buf.readUIntLE(0, 3);
  return be === 0x123456 && le === 0x563412;
});

test('BE vs LE: [0xFF, 0x00, 0x00] - 3字节', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00]);
  return buf.readUIntBE(0, 3) === 0xFF0000 && buf.readUIntLE(0, 3) === 0x0000FF;
});

test('BE vs LE: [0x00, 0x00, 0xFF] - 3字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0xFF]);
  return buf.readUIntBE(0, 3) === 0x0000FF && buf.readUIntLE(0, 3) === 0xFF0000;
});

// 4字节大小端序对比
test('BE vs LE: [0x12, 0x34, 0x56, 0x78] - 4字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const be = buf.readUIntBE(0, 4);
  const le = buf.readUIntLE(0, 4);
  return be === 0x12345678 && le === 0x78563412;
});

test('BE vs LE: [0xFF, 0x00, 0x00, 0x00] - 4字节', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 4) === 0xFF000000 && buf.readUIntLE(0, 4) === 0x000000FF;
});

test('BE vs LE: [0x00, 0x00, 0x00, 0xFF] - 4字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0xFF]);
  return buf.readUIntBE(0, 4) === 0x000000FF && buf.readUIntLE(0, 4) === 0xFF000000;
});

// 5字节大小端序对比
test('BE vs LE: [0x12, 0x34, 0x56, 0x78, 0x9A] - 5字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  const be = buf.readUIntBE(0, 5);
  const le = buf.readUIntLE(0, 5);
  return be === 0x123456789A && le === 0x9A78563412;
});

test('BE vs LE: [0xFF, 0x00, 0x00, 0x00, 0x00] - 5字节', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 5) === 0xFF00000000 && buf.readUIntLE(0, 5) === 0x00000000FF;
});

test('BE vs LE: [0x00, 0x00, 0x00, 0x00, 0xFF] - 5字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xFF]);
  return buf.readUIntBE(0, 5) === 0x00000000FF && buf.readUIntLE(0, 5) === 0xFF00000000;
});

// 6字节大小端序对比
test('BE vs LE: [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC] - 6字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  const be = buf.readUIntBE(0, 6);
  const le = buf.readUIntLE(0, 6);
  return be === 0x123456789ABC && le === 0xBC9A78563412;
});

test('BE vs LE: [0xFF, 0x00, 0x00, 0x00, 0x00, 0x00] - 6字节', () => {
  const buf = Buffer.from([0xFF, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 0xFF0000000000 && buf.readUIntLE(0, 6) === 0x0000000000FF;
});

test('BE vs LE: [0x00, 0x00, 0x00, 0x00, 0x00, 0xFF] - 6字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0xFF]);
  return buf.readUIntBE(0, 6) === 0x0000000000FF && buf.readUIntLE(0, 6) === 0xFF0000000000;
});

// 连续读取不同 offset
test('BE: 连续读取不同 offset - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  return buf.readUIntBE(0, 2) === 0x1234 && 
         buf.readUIntBE(1, 2) === 0x3456 && 
         buf.readUIntBE(2, 2) === 0x5678 &&
         buf.readUIntBE(3, 2) === 0x789A;
});

test('LE: 连续读取不同 offset - 2字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  return buf.readUIntLE(0, 2) === 0x3412 && 
         buf.readUIntLE(1, 2) === 0x5634 && 
         buf.readUIntLE(2, 2) === 0x7856 &&
         buf.readUIntLE(3, 2) === 0x9A78;
});

test('BE: 连续读取不同 offset - 3字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  return buf.readUIntBE(0, 3) === 0x123456 && 
         buf.readUIntBE(1, 3) === 0x345678 && 
         buf.readUIntBE(2, 3) === 0x56789A &&
         buf.readUIntBE(3, 3) === 0x789ABC;
});

test('LE: 连续读取不同 offset - 3字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  return buf.readUIntLE(0, 3) === 0x563412 && 
         buf.readUIntLE(1, 3) === 0x785634 && 
         buf.readUIntLE(2, 3) === 0x9A7856 &&
         buf.readUIntLE(3, 3) === 0xBC9A78;
});

// 对称值测试
test('BE: 对称值 [0xAA, 0xAA] - 2字节', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUIntBE(0, 2) === 0xAAAA;
});

test('LE: 对称值 [0xAA, 0xAA] - 2字节', () => {
  const buf = Buffer.from([0xAA, 0xAA]);
  return buf.readUIntLE(0, 2) === 0xAAAA;
});

test('BE: 对称值 [0xAA, 0xAA, 0xAA, 0xAA] - 4字节', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUIntBE(0, 4) === 0xAAAAAAAA;
});

test('LE: 对称值 [0xAA, 0xAA, 0xAA, 0xAA] - 4字节', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUIntLE(0, 4) === 0xAAAAAAAA;
});

test('BE: 对称值 [0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA] - 6字节', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUIntBE(0, 6) === 187649984473770;
});

test('LE: 对称值 [0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA] - 6字节', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readUIntLE(0, 6) === 187649984473770;
});

// 特殊值测试
test('BE: 特殊值 0x7FFF - 2字节', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readUIntBE(0, 2) === 32767;
});

test('LE: 特殊值 0x7FFF - 2字节', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readUIntLE(0, 2) === 32767;
});

test('BE: 特殊值 0x7FFFFFFF - 4字节', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 4) === 2147483647;
});

test('LE: 特殊值 0x7FFFFFFF - 4字节', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readUIntLE(0, 4) === 2147483647;
});

test('BE: 特殊值 0x7FFFFFFFFFFF - 6字节', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 6) === 140737488355327;
});

test('LE: 特殊值 0x7FFFFFFFFFFF - 6字节', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readUIntLE(0, 6) === 140737488355327;
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
