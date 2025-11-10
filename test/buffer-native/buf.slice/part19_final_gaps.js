const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = !!fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({
      name,
      status: '❌',
      error: e.message,
      stack: e.stack
    });
  }
}

// ============ slice 与严格模式行为 ============

test('严格模式：slice 在严格模式下工作正常', () => {
  'use strict';
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  return sliced.length === 2;
});

// ============ slice 与 ASCII 范围外的字节 ============

test('扩展 ASCII：处理 0x80-0xFF 范围', () => {
  const buf = Buffer.from([0x80, 0x90, 0xa0, 0xb0, 0xc0, 0xd0, 0xe0, 0xf0]);
  const sliced = buf.slice(2, 6);
  return sliced[0] === 0xa0 && sliced[3] === 0xd0;
});

test('扩展 ASCII：全 0xFF buffer 的 slice', () => {
  const buf = Buffer.alloc(10, 0xff);
  const sliced = buf.slice(3, 7);
  return sliced.every(byte => byte === 0xff);
});

test('扩展 ASCII：全 0x00 buffer 的 slice', () => {
  const buf = Buffer.alloc(10, 0x00);
  const sliced = buf.slice(2, 8);
  return sliced.every(byte => byte === 0x00);
});

// ============ slice 与位操作 ============

test('位操作：slice 后进行位运算', () => {
  const buf = Buffer.from([0b11110000, 0b00001111]);
  const sliced = buf.slice(0, 2);
  const result = sliced[0] & sliced[1];
  return result === 0;
});

test('位操作：slice 后修改位', () => {
  const buf = Buffer.from([0b00000000]);
  const sliced = buf.slice(0, 1);
  sliced[0] = sliced[0] | 0b10101010;
  return buf[0] === 0b10101010;
});

test('位操作：slice 验证字节的所有位', () => {
  const buf = Buffer.from([0b11111111]);
  const sliced = buf.slice(0, 1);
  return sliced[0] === 255;
});

// ============ slice 与 Base64 编码特殊场景 ============

test('Base64：slice padding 字符边界', () => {
  const buf = Buffer.from('hello', 'utf8');
  const sliced = buf.slice(0, 5);
  const base64 = sliced.toString('base64');
  return base64 === 'aGVsbG8=';
});

test('Base64：slice 不同长度的 base64', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const s1 = buf.slice(0, 3).toString('base64');
  const s2 = buf.slice(0, 4).toString('base64');
  return s1.length < s2.length;
});

// ============ slice 与 Hex 编码 ============

test('Hex：slice 单字节 hex', () => {
  const buf = Buffer.from([0x0f]);
  const sliced = buf.slice(0, 1);
  return sliced.toString('hex') === '0f';
});

test('Hex：slice 多字节 hex', () => {
  const buf = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
  const sliced = buf.slice(1, 3);
  return sliced.toString('hex') === 'adbe';
});

test('Hex：slice 全零字节', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00]);
  const sliced = buf.slice(0, 3);
  return sliced.toString('hex') === '000000';
});

// ============ slice 与 Latin1 编码 ============

test('Latin1：slice latin1 编码内容', () => {
  const buf = Buffer.from('café', 'latin1');
  const sliced = buf.slice(0, 4);
  return sliced.toString('latin1') === 'café';
});

test('Latin1：slice 高位字节', () => {
  const buf = Buffer.from([0xc0, 0xc1, 0xc2, 0xc3]);
  const sliced = buf.slice(1, 3);
  return sliced.length === 2 && sliced[0] === 0xc1;
});

// ============ slice 与 UCS2/UTF16LE 编码 ============

test('UTF16LE：slice 偶数字节边界', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const sliced = buf.slice(0, 4); // 2 个字符
  return sliced.toString('utf16le') === 'he';
});

test('UTF16LE：slice 奇数字节会损坏', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const sliced = buf.slice(0, 3); // 不完整
  const str = sliced.toString('utf16le');
  return str.length >= 1; // 至少有部分内容
});

// ============ slice 与 swap 方法 ============

test('swap 方法：slice 后使用 swap16', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);
  sliced.swap16();
  return buf[0] === 0x02 && buf[1] === 0x01;
});

test('swap 方法：slice 后使用 swap32', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);
  sliced.swap32();
  return buf[0] === 0x04 && buf[3] === 0x01;
});

test('swap 方法：slice 后使用 swap64', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const sliced = buf.slice(0, 8);
  sliced.swap64();
  return buf[0] === 0x08 && buf[7] === 0x01;
});

// ============ slice 与 readInt/writeInt 系列 ============

test('readInt：slice 后 readInt8', () => {
  const buf = Buffer.from([0x7f, 0x80, 0xff]);
  const sliced = buf.slice(0, 3);
  return sliced.readInt8(0) === 127 && sliced.readInt8(1) === -128;
});

test('readInt：slice 后 readInt16LE', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);
  return sliced.readInt16LE(0) === 0x0201;
});

test('readInt：slice 后 readInt32BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(0, 4);
  return sliced.readInt32BE(0) === 0x12345678;
});

test('writeInt：slice 后 writeInt8', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(1, 4);
  sliced.writeInt8(-1, 0);
  return buf[1] === 0xff;
});

test('writeInt：slice 后 writeInt16LE', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(1, 5);
  sliced.writeInt16LE(0x1234, 0);
  return buf[1] === 0x34 && buf[2] === 0x12;
});

test('writeInt：slice 后 writeInt32BE', () => {
  const buf = Buffer.alloc(8);
  const sliced = buf.slice(2, 6);
  sliced.writeInt32BE(0x12345678, 0);
  return buf[2] === 0x12 && buf[5] === 0x78;
});

// ============ slice 与 readUInt/writeUInt 系列 ============

test('readUInt：slice 后 readUInt8', () => {
  const buf = Buffer.from([0x00, 0x7f, 0x80, 0xff]);
  const sliced = buf.slice(0, 4);
  return sliced.readUInt8(3) === 255;
});

test('readUInt：slice 后 readUInt16BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(0, 4);
  return sliced.readUInt16BE(0) === 0x1234;
});

test('readUInt：slice 后 readUInt32LE', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const sliced = buf.slice(0, 4);
  return sliced.readUInt32LE(0) === 0x12345678;
});

test('writeUInt：slice 后 writeUInt8', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(2, 5);
  sliced.writeUInt8(255, 0);
  return buf[2] === 0xff;
});

test('writeUInt：slice 后 writeUInt16BE', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(1, 5);
  sliced.writeUInt16BE(0x1234, 0);
  return buf[1] === 0x12 && buf[2] === 0x34;
});

// ============ slice 与 Float/Double 读写 ============

test('Float：slice 后 readFloatLE', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(3.14, 0);
  const sliced = buf.slice(0, 4);
  const value = sliced.readFloatLE(0);
  return Math.abs(value - 3.14) < 0.01;
});

test('Float：slice 后 writeFloatBE', () => {
  const buf = Buffer.alloc(8);
  const sliced = buf.slice(2, 6);
  sliced.writeFloatBE(2.71, 0);
  const value = buf.readFloatBE(2);
  return Math.abs(value - 2.71) < 0.01;
});

test('Double：slice 后 readDoubleLE', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeDoubleLE(Math.PI, 0);
  const sliced = buf.slice(0, 8);
  const value = sliced.readDoubleLE(0);
  return Math.abs(value - Math.PI) < 0.0001;
});

test('Double：slice 后 writeDoubleBE', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(1, 9);
  sliced.writeDoubleBE(Math.E, 0);
  const value = buf.readDoubleBE(1);
  return Math.abs(value - Math.E) < 0.0001;
});

// ============ slice 与 BigInt 读写 ============

test('BigInt：slice 后 readBigInt64LE', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeBigInt64LE(BigInt(12345), 0);
  const sliced = buf.slice(0, 8);
  const value = sliced.readBigInt64LE(0);
  return value === BigInt(12345);
});

test('BigInt：slice 后 writeBigInt64BE', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(1, 9);
  sliced.writeBigInt64BE(BigInt(67890), 0);
  const value = buf.readBigInt64BE(1);
  return value === BigInt(67890);
});

test('BigInt：slice 后 readBigUInt64LE', () => {
  const buf = Buffer.allocUnsafe(10);
  buf.writeBigUInt64LE(BigInt('0xFFFFFFFFFFFFFFFF'), 0);
  const sliced = buf.slice(0, 8);
  const value = sliced.readBigUInt64LE(0);
  return value === BigInt('0xFFFFFFFFFFFFFFFF');
});

test('BigInt：slice 后 writeBigUInt64BE', () => {
  const buf = Buffer.alloc(10);
  const sliced = buf.slice(1, 9);
  sliced.writeBigUInt64BE(BigInt(999999), 0);
  const value = buf.readBigUInt64BE(1);
  return value === BigInt(999999);
});

// ============ slice 与 IntLE/UIntLE 可变长度 ============

test('IntLE：slice 后 readIntLE 3 字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const sliced = buf.slice(0, 4);
  const value = sliced.readIntLE(0, 3);
  return value === 0x030201;
});

test('IntLE：slice 后 writeIntLE 3 字节', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(1, 5);
  sliced.writeIntLE(0x123456, 0, 3);
  return buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('UIntLE：slice 后 readUIntLE 5 字节', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const sliced = buf.slice(0, 6);
  const value = sliced.readUIntLE(0, 5);
  return value > 0;
});

test('UIntBE：slice 后 readUIntBE 3 字节', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const sliced = buf.slice(0, 4);
  const value = sliced.readUIntBE(0, 3);
  return value === 0x123456;
});

// ============ slice 与错误偏移的读写操作 ============

test('偏移错误：readInt8 在 slice 边界', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  try {
    sliced.readInt8(2); // 超出 slice 范围
    return false;
  } catch (e) {
    return true; // 应该抛出错误
  }
});

test('偏移错误：writeInt16LE 超出 slice 范围', () => {
  const buf = Buffer.alloc(5);
  const sliced = buf.slice(0, 3);
  try {
    sliced.writeInt16LE(0x1234, 2); // 需要 2 字节，但只剩 1 字节
    return false;
  } catch (e) {
    return true; // 应该抛出错误
  }
});

// ============ slice 的不可变特性验证 ============

test('不可变性：slice 方法不修改原 buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const original = buf.toString('hex');
  buf.slice(1, 4);
  return buf.toString('hex') === original;
});

test('不可变性：多次 slice 不改变原始数据', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.slice(0, 2);
  buf.slice(1, 3);
  buf.slice(2, 4);
  return buf[0] === 1 && buf[4] === 5;
});

// ============ slice 与 inspect 方法 ============

test('inspect：slice 的 inspect 输出', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sliced = buf.slice(0, 2);
  const inspected = sliced.inspect();
  return typeof inspected === 'string' && inspected.length > 0;
});

try {
  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    if (tests[i].status === '✅') passed++;
  }
  const total = tests.length;
  const failed = total - passed;

  const result = {
    success: failed === 0,
    summary: {
      total,
      passed,
      failed,
      successRate: total ? (passed * 100 / total).toFixed(2) + '%' : '0.00%'
    },
    tests
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
