// Buffer.isBuffer() - 查缺补漏：Buffer.of、parent、swap、transcode 等
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

// Buffer.of 方法（TypedArray 风格）
test('Buffer.of 方法存在', () => {
  return typeof Buffer.of === 'function';
});

test('Buffer.of 创建的是 Buffer', () => {
  const buf = Buffer.of(1, 2, 3, 4, 5);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.of 无参数创建空 Buffer', () => {
  const buf = Buffer.of();
  return Buffer.isBuffer(buf) === true && buf.length === 0;
});

test('Buffer.of 单个参数', () => {
  const buf = Buffer.of(255);
  return Buffer.isBuffer(buf) === true && buf.length === 1 && buf[0] === 255;
});

test('Buffer.of 多个参数', () => {
  const buf = Buffer.of(0, 127, 255, 128, 64);
  return Buffer.isBuffer(buf) === true && buf.length === 5;
});

test('Buffer.of 参数超过 255 会被截断', () => {
  const buf = Buffer.of(256, 257, 1000);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.of 负数参数', () => {
  const buf = Buffer.of(-1, -128, -255);
  return Buffer.isBuffer(buf) === true;
});

// Buffer.parent 属性（已废弃但可能存在）
test('allocUnsafe 的 Buffer 有 parent 属性', () => {
  const buf = Buffer.allocUnsafe(100);
  return Buffer.isBuffer(buf) === true &&
         (buf.parent === undefined || buf.parent instanceof ArrayBuffer);
});

test('allocUnsafeSlow 的 Buffer 有 parent 属性', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return Buffer.isBuffer(buf) === true &&
         (buf.parent === undefined || buf.parent instanceof ArrayBuffer);
});

test('alloc 的 Buffer 有 parent 属性', () => {
  const buf = Buffer.alloc(100);
  return Buffer.isBuffer(buf) === true &&
         (buf.parent === undefined || buf.parent instanceof ArrayBuffer);
});

test('Buffer.parent 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(100);
  if (buf.parent !== undefined) {
    return Buffer.isBuffer(buf.parent) === false;
  }
  return true;
});

// Buffer.BYTES_PER_ELEMENT 属性
test('Buffer 实例有 BYTES_PER_ELEMENT', () => {
  const buf = Buffer.from([1, 2, 3]);
  return buf.BYTES_PER_ELEMENT === 1;
});

test('BYTES_PER_ELEMENT 不是 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  return typeof buf.BYTES_PER_ELEMENT === 'number' &&
         Buffer.isBuffer(buf.BYTES_PER_ELEMENT) === false;
});

// Buffer.compare 实例方法
test('Buffer.compare 静态方法返回数字', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('def');
  const result = Buffer.compare(buf1, buf2);
  return typeof result === 'number' && Buffer.isBuffer(result) === false;
});

test('buf.compare 实例方法返回数字', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('def');
  const result = buf1.compare(buf2);
  return typeof result === 'number' && Buffer.isBuffer(result) === false;
});

test('buf.compare 带参数返回数字', () => {
  const buf1 = Buffer.from('hello world');
  const buf2 = Buffer.from('world');
  const result = buf1.compare(buf2, 0, 5, 6, 11);
  return typeof result === 'number' && Buffer.isBuffer(result) === false;
});

// swap 方法的边界条件
test('swap16 要求长度是 2 的倍数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.swap16();
    return false;
  } catch (e) {
    return e.message.includes('multiple') || e.message.includes('16-bit');
  }
});

test('swap16 对 2 字节 Buffer 有效', () => {
  const buf = Buffer.from([0x01, 0x02]);
  buf.swap16();
  return Buffer.isBuffer(buf) === true && buf[0] === 0x02 && buf[1] === 0x01;
});

test('swap16 对 4 字节 Buffer 有效', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return Buffer.isBuffer(buf) === true;
});

test('swap32 要求长度是 4 的倍数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.swap32();
    return false;
  } catch (e) {
    return e.message.includes('multiple') || e.message.includes('32-bit');
  }
});

test('swap32 对 4 字节 Buffer 有效', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return Buffer.isBuffer(buf) === true;
});

test('swap64 要求长度是 8 的倍数', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4, 5]);
    buf.swap64();
    return false;
  } catch (e) {
    return e.message.includes('multiple') || e.message.includes('64-bit');
  }
});

test('swap64 对 8 字节 Buffer 有效', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return Buffer.isBuffer(buf) === true;
});

test('swap16 对空 Buffer 有效', () => {
  const buf = Buffer.alloc(0);
  buf.swap16();
  return Buffer.isBuffer(buf) === true;
});

test('swap32 对空 Buffer 有效', () => {
  const buf = Buffer.alloc(0);
  buf.swap32();
  return Buffer.isBuffer(buf) === true;
});

test('swap64 对空 Buffer 有效', () => {
  const buf = Buffer.alloc(0);
  buf.swap64();
  return Buffer.isBuffer(buf) === true;
});

// slice 和 subarray 的细微区别
test('slice 和 subarray 返回不同实例', () => {
  const buf = Buffer.from('hello');
  const s1 = buf.slice(1, 4);
  const s2 = buf.subarray(1, 4);
  return Buffer.isBuffer(s1) === true &&
         Buffer.isBuffer(s2) === true &&
         s1 !== s2 &&
         s1.equals(s2) === true;
});

test('slice 和 subarray 都创建视图', () => {
  const buf = Buffer.from('hello');
  const s1 = buf.slice(0, 3);
  const s2 = buf.subarray(0, 3);
  s1[0] = 0x58;
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(s1) === true &&
         Buffer.isBuffer(s2) === true &&
         buf[0] === 0x58 &&
         s2[0] === 0x58;
});

// BigInt 读写方法
test('writeBigInt64LE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64LE(BigInt(12345), 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeBigInt64BE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigInt64BE(BigInt(12345), 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeBigUInt64LE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigUInt64LE(BigInt(12345), 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeBigUInt64BE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeBigUInt64BE(BigInt(12345), 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('readBigInt64BE 返回 BigInt 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigInt64BE(BigInt(12345), 0);
  const val = buf.readBigInt64BE(0);
  return typeof val === 'bigint' && Buffer.isBuffer(val) === false;
});

test('readBigUInt64LE 返回 BigInt 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64LE(BigInt(12345), 0);
  const val = buf.readBigUInt64LE(0);
  return typeof val === 'bigint' && Buffer.isBuffer(val) === false;
});

test('readBigUInt64BE 返回 BigInt 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64BE(BigInt(12345), 0);
  const val = buf.readBigUInt64BE(0);
  return typeof val === 'bigint' && Buffer.isBuffer(val) === false;
});

// Int16、Int32 的其他变体
test('writeInt16BE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(2);
  const offset = buf.writeInt16BE(0x1234, 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeUInt16LE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(2);
  const offset = buf.writeUInt16LE(0x1234, 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeInt32LE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(4);
  const offset = buf.writeInt32LE(0x12345678, 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeUInt32BE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(4);
  const offset = buf.writeUInt32BE(0x12345678, 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('readInt16BE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const val = buf.readInt16BE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readUInt16LE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const val = buf.readUInt16LE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readInt32LE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const val = buf.readInt32LE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readInt32BE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const val = buf.readInt32BE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readUInt32LE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const val = buf.readUInt32LE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

// Float/Double 的 BE 变体
test('writeFloatBE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(4);
  const offset = buf.writeFloatBE(3.14, 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeDoubleBE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  const offset = buf.writeDoubleBE(3.14159, 0);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('readFloatBE 返回数字不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(3.14, 0);
  const val = buf.readFloatBE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readDoubleBE 返回数字不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleBE(3.14159, 0);
  const val = buf.readDoubleBE(0);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

// IntLE/BE 通用方法
test('writeIntLE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(6);
  const offset = buf.writeIntLE(0x123456, 0, 3);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeIntBE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(6);
  const offset = buf.writeIntBE(0x123456, 0, 3);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeUIntLE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(6);
  const offset = buf.writeUIntLE(0x123456, 0, 3);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('writeUIntBE 返回 offset 不是 Buffer', () => {
  const buf = Buffer.allocUnsafe(6);
  const offset = buf.writeUIntBE(0x123456, 0, 3);
  return typeof offset === 'number' && Buffer.isBuffer(offset) === false;
});

test('readIntLE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const val = buf.readIntLE(0, 3);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readIntBE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const val = buf.readIntBE(0, 3);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readUIntLE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const val = buf.readUIntLE(0, 3);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

test('readUIntBE 返回数字不是 Buffer', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56]);
  const val = buf.readUIntBE(0, 3);
  return typeof val === 'number' && Buffer.isBuffer(val) === false;
});

const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

try {
  const result = {
    success: failed === 0,
    summary: {
      total: tests.length,
      passed: passed,
      failed: failed,
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%'
    },
    tests: tests
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
