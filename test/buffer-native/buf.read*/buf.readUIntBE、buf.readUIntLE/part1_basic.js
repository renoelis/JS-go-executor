// buf.readUIntBE & buf.readUIntLE 基本功能测试
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

// === readUIntBE 基本功能测试 ===

// 1字节读取
test('BE: 读取 1 字节 - 0xFF', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntBE(0, 1) === 255;
});

test('BE: 读取 1 字节 - 0x00', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUIntBE(0, 1) === 0;
});

test('BE: 读取 1 字节 - 0x7F', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readUIntBE(0, 1) === 127;
});

// 2字节读取
test('BE: 读取 2 字节 - 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntBE(0, 2) === 65535;
});

test('BE: 读取 2 字节 - 0x1234', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readUIntBE(0, 2) === 0x1234;
});

test('BE: 读取 2 字节 - 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUIntBE(0, 2) === 0;
});

// 3字节读取
test('BE: 读取 3 字节 - 0xFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 3) === 16777215;
});

test('BE: 读取 3 字节 - 0x123456', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntBE(0, 3) === 0x123456;
});

test('BE: 读取 3 字节 - 0x000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 3) === 0;
});

// 4字节读取
test('BE: 读取 4 字节 - 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 4) === 4294967295;
});

test('BE: 读取 4 字节 - 0x12345678', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUIntBE(0, 4) === 0x12345678;
});

test('BE: 读取 4 字节 - 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 4) === 0;
});

// 5字节读取
test('BE: 读取 5 字节 - 0xFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 5) === 1099511627775;
});

test('BE: 读取 5 字节 - 0x123456789A', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A]);
  return buf.readUIntBE(0, 5) === 0x123456789A;
});

test('BE: 读取 5 字节 - 0x0000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 5) === 0;
});

// 6字节读取（最大）
test('BE: 读取 6 字节 - 0xFFFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('BE: 读取 6 字节 - 0x123456789ABC', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);
  return buf.readUIntBE(0, 6) === 0x123456789ABC;
});

test('BE: 读取 6 字节 - 0x000000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntBE(0, 6) === 0;
});

// offset 测试
test('BE: offset = 1, byteLength = 2', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x00]);
  return buf.readUIntBE(1, 2) === 0x1234;
});

test('BE: offset = 2, byteLength = 3', () => {
  const buf = Buffer.from([0x00, 0x00, 0x12, 0x34, 0x56, 0x00]);
  return buf.readUIntBE(2, 3) === 0x123456;
});

test('BE: offset = 3, byteLength = 4', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x12, 0x34, 0x56, 0x78]);
  return buf.readUIntBE(3, 4) === 0x12345678;
});

// === readUIntLE 基本功能测试 ===

// 1字节读取
test('LE: 读取 1 字节 - 0xFF', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntLE(0, 1) === 255;
});

test('LE: 读取 1 字节 - 0x00', () => {
  const buf = Buffer.from([0x00]);
  return buf.readUIntLE(0, 1) === 0;
});

test('LE: 读取 1 字节 - 0x7F', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readUIntLE(0, 1) === 127;
});

// 2字节读取
test('LE: 读取 2 字节 - 0xFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntLE(0, 2) === 65535;
});

test('LE: 读取 2 字节 - 0x1234', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readUIntLE(0, 2) === 0x1234;
});

test('LE: 读取 2 字节 - 0x0000', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return buf.readUIntLE(0, 2) === 0;
});

// 3字节读取
test('LE: 读取 3 字节 - 0xFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 3) === 16777215;
});

test('LE: 读取 3 字节 - 0x123456', () => {
  const buf = Buffer.from([0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 3) === 0x123456;
});

test('LE: 读取 3 字节 - 0x000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 3) === 0;
});

// 4字节读取
test('LE: 读取 4 字节 - 0xFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 4) === 4294967295;
});

test('LE: 读取 4 字节 - 0x12345678', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 4) === 0x12345678;
});

test('LE: 读取 4 字节 - 0x00000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 4) === 0;
});

// 5字节读取
test('LE: 读取 5 字节 - 0xFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 5) === 1099511627775;
});

test('LE: 读取 5 字节 - 0x123456789A', () => {
  const buf = Buffer.from([0x9A, 0x78, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 5) === 0x123456789A;
});

test('LE: 读取 5 字节 - 0x0000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 5) === 0;
});

// 6字节读取（最大）
test('LE: 读取 6 字节 - 0xFFFFFFFFFFFF', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

test('LE: 读取 6 字节 - 0x123456789ABC', () => {
  const buf = Buffer.from([0xBC, 0x9A, 0x78, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 6) === 0x123456789ABC;
});

test('LE: 读取 6 字节 - 0x000000000000', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readUIntLE(0, 6) === 0;
});

// offset 测试
test('LE: offset = 1, byteLength = 2', () => {
  const buf = Buffer.from([0x00, 0x34, 0x12, 0x00]);
  return buf.readUIntLE(1, 2) === 0x1234;
});

test('LE: offset = 2, byteLength = 3', () => {
  const buf = Buffer.from([0x00, 0x00, 0x56, 0x34, 0x12, 0x00]);
  return buf.readUIntLE(2, 3) === 0x123456;
});

test('LE: offset = 3, byteLength = 4', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x78, 0x56, 0x34, 0x12]);
  return buf.readUIntLE(3, 4) === 0x12345678;
});

// 往返测试
test('BE: 写入后读取验证 - 2字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntBE(0x1234, 0, 2);
  return buf.readUIntBE(0, 2) === 0x1234;
});

test('BE: 写入后读取验证 - 6字节', () => {
  const buf = Buffer.alloc(8);
  buf.writeUIntBE(0x123456789ABC, 0, 6);
  return buf.readUIntBE(0, 6) === 0x123456789ABC;
});

test('LE: 写入后读取验证 - 2字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUIntLE(0x1234, 0, 2);
  return buf.readUIntLE(0, 2) === 0x1234;
});

test('LE: 写入后读取验证 - 6字节', () => {
  const buf = Buffer.alloc(8);
  buf.writeUIntLE(0x123456789ABC, 0, 6);
  return buf.readUIntLE(0, 6) === 0x123456789ABC;
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
