// Buffer 不同来源测试
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

// Buffer.alloc
test('BE: Buffer.alloc 创建并写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0x12345678, 0);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: Buffer.alloc 创建并写入', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0x12345678, 0);
  return buf.readUInt32LE(0) === 0x12345678;
});

// Buffer.allocUnsafe
test('BE: Buffer.allocUnsafe 创建并写入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x9ABCDEF0, 0);
  return buf.readUInt32BE(0) === 0x9ABCDEF0;
});

test('LE: Buffer.allocUnsafe 创建并写入', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0x9ABCDEF0, 0);
  return buf.readUInt32LE(0) === 0x9ABCDEF0;
});

// Buffer.from 数组
test('BE: Buffer.from 数组', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: Buffer.from 数组', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readUInt32LE(0) === 0x78563412;
});

// Buffer.from 字符串
test('BE: Buffer.from 字符串 (hex)', () => {
  const buf = Buffer.from('12345678', 'hex');
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: Buffer.from 字符串 (hex)', () => {
  const buf = Buffer.from('78563412', 'hex');
  return buf.readUInt32LE(0) === 0x12345678;
});

// Buffer.concat
test('BE: Buffer.concat 拼接', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: Buffer.concat 拼接', () => {
  const buf1 = Buffer.from([0x12, 0x34]);
  const buf2 = Buffer.from([0x56, 0x78]);
  const buf = Buffer.concat([buf1, buf2]);
  return buf.readUInt32LE(0) === 0x78563412;
});

// Buffer.slice
test('BE: Buffer.slice 切片', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x00]);
  const slice = buf.slice(1, 5);
  return slice.readUInt32BE(0) === 0x12345678;
});

test('LE: Buffer.slice 切片', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x00]);
  const slice = buf.slice(1, 5);
  return slice.readUInt32LE(0) === 0x78563412;
});

// Buffer.subarray
test('BE: Buffer.subarray 子数组', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x00]);
  const sub = buf.subarray(1, 5);
  return sub.readUInt32BE(0) === 0x12345678;
});

test('LE: Buffer.subarray 子数组', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34, 0x56, 0x78, 0x00]);
  const sub = buf.subarray(1, 5);
  return sub.readUInt32LE(0) === 0x78563412;
});

// 修改原 Buffer 影响 subarray
test('BE: 修改原 Buffer 影响 subarray', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  const sub = buf.subarray(1, 5);
  buf[1] = 0x12;
  buf[2] = 0x34;
  buf[3] = 0x56;
  buf[4] = 0x78;
  return sub.readUInt32BE(0) === 0x12345678;
});

test('LE: 修改原 Buffer 影响 subarray', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  const sub = buf.subarray(1, 5);
  buf[1] = 0x12;
  buf[2] = 0x34;
  buf[3] = 0x56;
  buf[4] = 0x78;
  return sub.readUInt32LE(0) === 0x78563412;
});

// Buffer.fill
test('BE: Buffer.fill 填充后读取', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xFF);
  return buf.readUInt32BE(0) === 0xFFFFFFFF;
});

test('LE: Buffer.fill 填充后读取', () => {
  const buf = Buffer.alloc(4);
  buf.fill(0xFF);
  return buf.readUInt32LE(0) === 0xFFFFFFFF;
});

// Buffer.copy
test('BE: Buffer.copy 复制', () => {
  const src = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const dst = Buffer.alloc(4);
  src.copy(dst);
  return dst.readUInt32BE(0) === 0x12345678;
});

test('LE: Buffer.copy 复制', () => {
  const src = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const dst = Buffer.alloc(4);
  src.copy(dst);
  return dst.readUInt32LE(0) === 0x78563412;
});

// 多次写入覆盖
test('BE: 多次写入覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(0x11111111, 0);
  buf.writeUInt32BE(0x12345678, 0);
  return buf.readUInt32BE(0) === 0x12345678;
});

test('LE: 多次写入覆盖', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(0x11111111, 0);
  buf.writeUInt32LE(0x12345678, 0);
  return buf.readUInt32LE(0) === 0x12345678;
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
