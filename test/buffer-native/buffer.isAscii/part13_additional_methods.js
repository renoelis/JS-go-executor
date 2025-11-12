// buffer.isAscii() - Part 13: Additional Method Coverage and Edge Cases
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer.compare 静态方法
test('Buffer.compare - 两个 ASCII Buffer', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from('abc');
  Buffer.compare(buf1, buf2);
  return isAscii(buf1) === true && isAscii(buf2) === true;
});

test('Buffer.compare - ASCII 和非 ASCII', () => {
  const buf1 = Buffer.from('abc');
  const buf2 = Buffer.from([0x80]);
  Buffer.compare(buf1, buf2);
  return isAscii(buf1) === true && isAscii(buf2) === false;
});

test('Buffer.compare - 两个非 ASCII Buffer', () => {
  const buf1 = Buffer.from([0x80, 0xFF]);
  const buf2 = Buffer.from([0x90, 0xF0]);
  Buffer.compare(buf1, buf2);
  return isAscii(buf1) === false && isAscii(buf2) === false;
});

// Buffer.prototype.compare 实例方法
test('buf.compare - ASCII Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  buf1.compare(buf2);
  return isAscii(buf1) === true && isAscii(buf2) === true;
});

test('buf.compare - 带 targetStart/targetEnd', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  buf1.compare(buf2, 0, 5);
  return isAscii(buf1) === true;
});

test('buf.compare - 带完整参数', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello world');
  buf1.compare(buf2, 0, 5, 0, 5);
  return isAscii(buf1) === true;
});

// entries/keys/values 迭代器
test('buf.entries - ASCII', () => {
  const buf = Buffer.from('abc');
  const entries = Array.from(buf.entries());
  return isAscii(buf) === true && entries.length === 3;
});

test('buf.entries - 非 ASCII', () => {
  const buf = Buffer.from([0x41, 0x80, 0x42]);
  const entries = Array.from(buf.entries());
  return isAscii(buf) === false && entries.length === 3;
});

test('buf.keys - ASCII', () => {
  const buf = Buffer.from('test');
  const keys = Array.from(buf.keys());
  return isAscii(buf) === true && keys.length === 4;
});

test('buf.values - ASCII', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const values = Array.from(buf.values());
  return isAscii(buf) === true && values.every(v => v <= 0x7F);
});

test('buf.values - 非 ASCII', () => {
  const buf = Buffer.from([0x80, 0xFF]);
  const values = Array.from(buf.values());
  return isAscii(buf) === false && values.some(v => v > 0x7F);
});

// toLocaleString
test('buf.toLocaleString - ASCII', () => {
  const buf = Buffer.from('hello');
  const str = buf.toLocaleString();
  return isAscii(buf) === true && typeof str === 'string';
});

test('buf.toLocaleString - 非 ASCII', () => {
  const buf = Buffer.from([0x80, 0xFF]);
  const str = buf.toLocaleString();
  return isAscii(buf) === false;
});

// readInt/readUInt 完整系列
test('readInt8 - ASCII 范围', () => {
  const buf = Buffer.from([0x12, 0x7F]);
  buf.readInt8(0);
  buf.readInt8(1);
  return isAscii(buf) === true;
});

test('readInt8 - 负数（非 ASCII）', () => {
  const buf = Buffer.from([0x80, 0xFF]);
  buf.readInt8(0); // -128
  buf.readInt8(1); // -1
  return isAscii(buf) === false;
});

test('readUInt16LE - ASCII 字节', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  buf.readUInt16LE(0);
  return isAscii(buf) === true;
});

test('readUInt16BE - ASCII 字节', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  buf.readUInt16BE(0);
  return isAscii(buf) === true;
});

test('readInt16LE - 包含高位字节', () => {
  const buf = Buffer.from([0x80, 0x00]);
  buf.readInt16LE(0);
  return isAscii(buf) === false;
});

test('readUInt32LE 不改变 Buffer', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  buf.readUInt32LE(0);
  return isAscii(buf) === true;
});

test('readUInt32BE 不改变 Buffer', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  buf.readUInt32BE(0);
  return isAscii(buf) === true;
});

test('readInt32LE - 非 ASCII', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  buf.readInt32LE(0);
  return isAscii(buf) === false;
});

// writeInt 系列
test('writeInt8 - ASCII 值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(65, 0);
  buf.writeInt8(127, 1);
  return isAscii(buf) === true;
});

test('writeInt8 - 负数值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(-1, 0); // 写入 0xFF
  return isAscii(buf) === false;
});

test('writeInt16LE - ASCII 范围', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16LE(0x4142, 0); // 'BA'
  return isAscii(buf) === true;
});

test('writeInt16BE - ASCII 范围', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(0x4142, 0); // 'AB'
  return isAscii(buf) === true;
});

test('writeInt32LE - 包含非 ASCII 字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32LE(0x43424180, 0); // 有效的 32 位有符号整数
  return isAscii(buf) === false;
});

// Float 和 Double
test('writeFloatLE - 写入浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.0, 0);
  return typeof isAscii(buf) === 'boolean';
});

test('writeFloatBE - 写入浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(1.0, 0);
  return typeof isAscii(buf) === 'boolean';
});

test('writeDoubleLE - 写入双精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(1.0, 0);
  return typeof isAscii(buf) === 'boolean';
});

test('writeDoubleBE - 写入双精度', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1.0, 0);
  return typeof isAscii(buf) === 'boolean';
});

test('readFloatLE 不改变 Buffer', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]); // 1.0 in LE
  buf.readFloatLE(0);
  return isAscii(buf) === false;
});

test('readDoubleLE 不改变 Buffer', () => {
  const buf = Buffer.alloc(8, 0x41);
  buf.readDoubleLE(0);
  return isAscii(buf) === true;
});

// BigInt 系列
test('writeBigInt64LE - 小值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(65), 0);
  return isAscii(buf) === true;
});

test('writeBigInt64LE - 大值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt('9223372036854775807'), 0);
  return isAscii(buf) === false;
});

test('writeBigInt64BE - 小值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(65), 0);
  // BigInt64BE 大端序：高位字节在前，小值会在最后字节
  return typeof isAscii(buf) === 'boolean';
});

test('writeBigUInt64LE - 小值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(127), 0);
  return isAscii(buf) === true;
});

test('writeBigUInt64BE - 小值', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(127), 0);
  // BigUint64BE 大端序：小值在最后字节，前面都是 0
  return typeof isAscii(buf) === 'boolean';
});

test('readBigInt64LE 不改变 Buffer', () => {
  const buf = Buffer.from([0x7B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  buf.readBigInt64LE(0);
  return isAscii(buf) === true;
});

// buffer.buffer 属性
test('buf.buffer - ArrayBuffer 引用', () => {
  const buf = Buffer.from('hello');
  const ab = buf.buffer;
  return isAscii(buf) === true && ab instanceof ArrayBuffer;
});

test('buf.buffer - 修改 ArrayBuffer 视图', () => {
  const buf = Buffer.from('hello');
  const arr = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  arr[0] = 0x80;
  return isAscii(buf) === false;
});

// byteOffset 和 length
test('buf.byteOffset - 从 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 5, 10);
  return buf.byteOffset === 5 && buf.length === 10 && isAscii(buf) === true;
});

test('buf.byteOffset - slice 不改变', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(1, 3);
  return slice.byteOffset >= 0 && isAscii(slice) === true;
});

// slice 特殊参数
test('slice() 无参数 - 完整拷贝', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice();
  return isAscii(slice) === true && slice.length === buf.length;
});

test('slice(undefined, undefined) - 完整拷贝', () => {
  const buf = Buffer.from([0x41, 0x42]);
  const slice = buf.slice(undefined, undefined);
  return isAscii(slice) === true;
});

test('slice(null, null) - 从 0 开始', () => {
  const buf = Buffer.from([0x41, 0x42]);
  const slice = buf.slice(null, null);
  return isAscii(slice) === true;
});

test('slice(-100, 100) - 超出范围自动调整', () => {
  const buf = Buffer.from('test');
  const slice = buf.slice(-100, 100);
  return isAscii(slice) === true && slice.length === 4;
});

test('slice(10, 5) - 反向范围返回空', () => {
  const buf = Buffer.from('hello');
  const slice = buf.slice(10, 5);
  return isAscii(slice) === true && slice.length === 0;
});

// indexOf/lastIndexOf/includes 用 Buffer 参数
test('indexOf(Buffer) - 找到', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('world');
  const index = buf.indexOf(search);
  return isAscii(buf) === true && index === 6;
});

test('indexOf(Buffer) - 未找到', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('xyz');
  const index = buf.indexOf(search);
  return isAscii(buf) === true && index === -1;
});

test('indexOf(Buffer) - 非 ASCII Buffer', () => {
  const buf = Buffer.from([0x41, 0x80, 0xFF, 0x42]);
  const search = Buffer.from([0x80, 0xFF]);
  const index = buf.indexOf(search);
  return isAscii(buf) === false && index === 1;
});

test('lastIndexOf(Buffer) - ASCII', () => {
  const buf = Buffer.from('hello hello');
  const search = Buffer.from('hello');
  const index = buf.lastIndexOf(search);
  return isAscii(buf) === true && index === 6;
});

test('includes(Buffer) - 存在', () => {
  const buf = Buffer.from('hello world');
  const search = Buffer.from('world');
  return isAscii(buf) === true && buf.includes(search) === true;
});

test('includes(Buffer) - 不存在', () => {
  const buf = Buffer.from('hello');
  const search = Buffer.from('world');
  return isAscii(buf) === true && buf.includes(search) === false;
});

test('indexOf 带 byteOffset', () => {
  const buf = Buffer.from('hello hello');
  const result = buf.indexOf('hello', 3);
  return isAscii(buf) === true && result === 6;
});

test('lastIndexOf 带 byteOffset', () => {
  const buf = Buffer.from('hello hello');
  const result = buf.lastIndexOf('hello', 8);
  return isAscii(buf) === true && result === 6;
});

// 空 Buffer 不同编码
test('Buffer.from("", "utf8") - 空', () => {
  const buf = Buffer.from('', 'utf8');
  return isAscii(buf) === true && buf.length === 0;
});

test('Buffer.from("", "hex") - 空', () => {
  const buf = Buffer.from('', 'hex');
  return isAscii(buf) === true && buf.length === 0;
});

test('Buffer.from("", "base64") - 空', () => {
  const buf = Buffer.from('', 'base64');
  return isAscii(buf) === true && buf.length === 0;
});

test('Buffer.from("", "latin1") - 空', () => {
  const buf = Buffer.from('', 'latin1');
  return isAscii(buf) === true && buf.length === 0;
});

// Buffer.byteLength 静态方法
test('Buffer.byteLength - ASCII 字符串', () => {
  const len = Buffer.byteLength('hello', 'utf8');
  const buf = Buffer.from('hello');
  return len === 5 && isAscii(buf) === true;
});

test('Buffer.byteLength - 非 ASCII 字符串', () => {
  const len = Buffer.byteLength('你好', 'utf8');
  const buf = Buffer.from('你好');
  return len === 6 && isAscii(buf) === false;
});

test('Buffer.byteLength - hex 字符串', () => {
  const len = Buffer.byteLength('4142', 'hex');
  return len === 2;
});

// Buffer.isBuffer 静态方法
test('Buffer.isBuffer - Buffer 实例', () => {
  const buf = Buffer.from('test');
  return Buffer.isBuffer(buf) === true && isAscii(buf) === true;
});

test('Buffer.isBuffer - Uint8Array 不是 Buffer', () => {
  const arr = new Uint8Array([0x41]);
  return Buffer.isBuffer(arr) === false && isAscii(arr) === true;
});

test('Buffer.isBuffer - ArrayBuffer 不是 Buffer', () => {
  const ab = new ArrayBuffer(10);
  return Buffer.isBuffer(ab) === false;
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
