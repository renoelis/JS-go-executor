// Buffer 来源测试
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

// === Buffer.from() 不同来源 ===

test('BE: Buffer.from(array)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  return buf.readUIntBE(0, 3) === 0x123456;
});

test('LE: Buffer.from(array)', () => {
  const buf = Buffer.from([0x56, 0x34, 0x12]);
  return buf.readUIntLE(0, 3) === 0x123456;
});

test('BE: Buffer.from(string, "hex")', () => {
  const buf = Buffer.from('123456', 'hex');
  return buf.readUIntBE(0, 3) === 0x123456;
});

test('LE: Buffer.from(string, "hex")', () => {
  const buf = Buffer.from('563412', 'hex');
  return buf.readUIntLE(0, 3) === 0x123456;
});

test('BE: Buffer.from(buffer)', () => {
  const buf1 = Buffer.from([0x12, 0x34, 0x56]);
  const buf2 = Buffer.from(buf1);
  return buf2.readUIntBE(0, 3) === 0x123456;
});

test('LE: Buffer.from(buffer)', () => {
  const buf1 = Buffer.from([0x56, 0x34, 0x12]);
  const buf2 = Buffer.from(buf1);
  return buf2.readUIntLE(0, 3) === 0x123456;
});

// === Buffer.alloc() ===

test('BE: Buffer.alloc() 初始化为0', () => {
  const buf = Buffer.alloc(6);
  return buf.readUIntBE(0, 6) === 0;
});

test('LE: Buffer.alloc() 初始化为0', () => {
  const buf = Buffer.alloc(6);
  return buf.readUIntLE(0, 6) === 0;
});

test('BE: Buffer.alloc() 后写入', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntBE(0x123456789ABC, 0, 6);
  return buf.readUIntBE(0, 6) === 0x123456789ABC;
});

test('LE: Buffer.alloc() 后写入', () => {
  const buf = Buffer.alloc(6);
  buf.writeUIntLE(0x123456789ABC, 0, 6);
  return buf.readUIntLE(0, 6) === 0x123456789ABC;
});

// === Buffer.allocUnsafe() ===

test('BE: Buffer.allocUnsafe() 后写入', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0x123456789ABC, 0, 6);
  return buf.readUIntBE(0, 6) === 0x123456789ABC;
});

test('LE: Buffer.allocUnsafe() 后写入', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntLE(0x123456789ABC, 0, 6);
  return buf.readUIntLE(0, 6) === 0x123456789ABC;
});

// === Buffer.concat() ===

test('BE: Buffer.concat()', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readUIntBE(0, 4) === 0x12345678;
});

test('LE: Buffer.concat()', () => {
  const buf1 = Buffer.from([0x78, 0x56]);
  const buf2 = Buffer.from([0x34, 0x12]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readUIntLE(0, 4) === 0x12345678;
});

// === Buffer slice ===

test('BE: Buffer.slice() 读取', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x00]);
  const slice = buf.slice(1, 4);
  return slice.readUIntBE(0, 3) === 0x123456;
});

test('LE: Buffer.slice() 读取', () => {
  const buf = Buffer.from([0x00, 0x56, 0x34, 0x12, 0x00]);
  const slice = buf.slice(1, 4);
  return slice.readUIntLE(0, 3) === 0x123456;
});

test('BE: Buffer.slice() 修改不影响原buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const slice = buf.slice(0, 2);
  const original = buf.readUIntBE(0, 2);
  return original === 0x1234;
});

test('LE: Buffer.slice() 修改不影响原buffer', () => {
  const buf = Buffer.from([0x34, 0x12, 0x56, 0x78]);
  const slice = buf.slice(0, 2);
  const original = buf.readUIntLE(0, 2);
  return original === 0x1234;
});

// === Buffer subarray ===

test('BE: Buffer.subarray() 读取', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x00]);
  const sub = buf.subarray(1, 4);
  return sub.readUIntBE(0, 3) === 0x123456;
});

test('LE: Buffer.subarray() 读取', () => {
  const buf = Buffer.from([0x00, 0x56, 0x34, 0x12, 0x00]);
  const sub = buf.subarray(1, 4);
  return sub.readUIntLE(0, 3) === 0x123456;
});

// === 不同长度的 Buffer ===

test('BE: 1字节 Buffer', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntBE(0, 1) === 255;
});

test('LE: 1字节 Buffer', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readUIntLE(0, 1) === 255;
});

test('BE: 2字节 Buffer', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntBE(0, 2) === 65535;
});

test('LE: 2字节 Buffer', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readUIntLE(0, 2) === 65535;
});

test('BE: 6字节 Buffer', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('LE: 6字节 Buffer', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

test('BE: 大 Buffer 部分读取', () => {
  const buf = Buffer.alloc(100);
  buf.writeUIntBE(0x123456, 50, 3);
  return buf.readUIntBE(50, 3) === 0x123456;
});

test('LE: 大 Buffer 部分读取', () => {
  const buf = Buffer.alloc(100);
  buf.writeUIntLE(0x123456, 50, 3);
  return buf.readUIntLE(50, 3) === 0x123456;
});

// === 空 Buffer ===

test('BE: 空 Buffer 读取应抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readUIntBE(0, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('LE: 空 Buffer 读取应抛出错误', () => {
  try {
    const buf = Buffer.alloc(0);
    buf.readUIntLE(0, 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// === 填充的 Buffer ===

test('BE: Buffer.alloc(6, 0xFF)', () => {
  const buf = Buffer.alloc(6, 0xFF);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('LE: Buffer.alloc(6, 0xFF)', () => {
  const buf = Buffer.alloc(6, 0xFF);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

test('BE: Buffer.alloc(6, 0x00)', () => {
  const buf = Buffer.alloc(6, 0x00);
  return buf.readUIntBE(0, 6) === 0;
});

test('LE: Buffer.alloc(6, 0x00)', () => {
  const buf = Buffer.alloc(6, 0x00);
  return buf.readUIntLE(0, 6) === 0;
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
