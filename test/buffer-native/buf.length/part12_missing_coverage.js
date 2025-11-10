// buf.length - Part 12: Missing Coverage Tests
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

// BigInt 写入方法测试
test('writeBigInt64BE 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(9007199254740991n, 0);
  return buf.length === 16;
});

test('writeBigInt64LE 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(9007199254740991n, 0);
  return buf.length === 16;
});

test('writeBigUInt64BE 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(18446744073709551615n, 0);
  return buf.length === 16;
});

test('writeBigUInt64LE 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(18446744073709551615n, 0);
  return buf.length === 16;
});

// swap 方法测试
test('swap16 后 length 不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();
  return buf.length === 4;
});

test('swap32 后 length 不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();
  return buf.length === 4;
});

test('swap64 后 length 不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();
  return buf.length === 8;
});

// indexOf/lastIndexOf 测试
test('indexOf 后 length 不变', () => {
  const buf = Buffer.from('hello world');
  const index = buf.indexOf('world');
  return buf.length === 11 && index === 6;
});

test('indexOf 未找到后 length 不变', () => {
  const buf = Buffer.from('hello world');
  const index = buf.indexOf('xyz');
  return buf.length === 11 && index === -1;
});

test('lastIndexOf 后 length 不变', () => {
  const buf = Buffer.from('hello hello');
  const index = buf.lastIndexOf('hello');
  return buf.length === 11 && index === 6;
});

test('lastIndexOf 未找到后 length 不变', () => {
  const buf = Buffer.from('hello world');
  const index = buf.lastIndexOf('xyz');
  return buf.length === 11 && index === -1;
});

// includes 测试
test('includes 后 length 不变', () => {
  const buf = Buffer.from('hello world');
  const result = buf.includes('world');
  return buf.length === 11 && result === true;
});

test('includes 未找到后 length 不变', () => {
  const buf = Buffer.from('hello world');
  const result = buf.includes('xyz');
  return buf.length === 11 && result === false;
});

// reverse 测试
test('reverse 后 length 不变', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();
  return buf.length === 5;
});

test('reverse 空 buffer 的 length', () => {
  const buf = Buffer.alloc(0);
  buf.reverse();
  return buf.length === 0;
});

test('reverse 单字节 buffer 的 length', () => {
  const buf = Buffer.from([1]);
  buf.reverse();
  return buf.length === 1;
});

// Buffer.isEncoding 相关测试
test('isEncoding 检查后可创建对应编码的 buffer', () => {
  const isUtf8 = Buffer.isEncoding('utf8');
  const buf = Buffer.from('hello', 'utf8');
  return isUtf8 && buf.length === 5;
});

test('isEncoding 检查无效编码', () => {
  const isInvalid = Buffer.isEncoding('invalid-encoding');
  return !isInvalid;
});

// ArrayBuffer offset/length 极端组合
test('ArrayBuffer 从最后一个字节开始', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 9, 1);
  return buf.length === 1;
});

test('ArrayBuffer offset 等于 byteLength', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 10, 0);
  return buf.length === 0;
});

test('ArrayBuffer length 为 0', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 5, 0);
  return buf.length === 0;
});

test('ArrayBuffer 完整范围', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab, 0, 10);
  return buf.length === 10;
});

// Buffer.from 空数组
test('Buffer.from 空数组的 length', () => {
  const buf = Buffer.from([]);
  return buf.length === 0;
});

test('Buffer.from 包含 0 的数组', () => {
  const buf = Buffer.from([0, 0, 0]);
  return buf.length === 3;
});

// Buffer.from 包含非法值的数组
test('Buffer.from 数组包含负数', () => {
  const buf = Buffer.from([-1, 256, 300]);
  // 负数和超出范围的值会被截断
  return buf.length === 3;
});

test('Buffer.from 数组包含浮点数', () => {
  const buf = Buffer.from([1.5, 2.7, 3.9]);
  // 浮点数会被截断为整数
  return buf.length === 3;
});

test('Buffer.from 数组包含 NaN', () => {
  const buf = Buffer.from([1, NaN, 3]);
  // NaN 会被转换为 0
  return buf.length === 3;
});

test('Buffer.from 数组包含 Infinity', () => {
  const buf = Buffer.from([1, Infinity, 3]);
  // Infinity 会被转换为 0
  return buf.length === 3;
});

test('Buffer.from 数组包含字符串数字', () => {
  const buf = Buffer.from(['65', '66', '67']);
  // 字符串数字会被转换为数字
  return buf.length === 3;
});

// readBigInt/readBigUInt 后 length 不变
test('readBigInt64BE 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(123n, 0);
  const val = buf.readBigInt64BE(0);
  return buf.length === 16 && val === 123n;
});

test('readBigUInt64BE 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(123n, 0);
  const val = buf.readBigUInt64BE(0);
  return buf.length === 16 && val === 123n;
});

// read 方法后 length 不变
test('readInt8 后 length 不变', () => {
  const buf = Buffer.from([127]);
  const val = buf.readInt8(0);
  return buf.length === 1 && val === 127;
});

test('readUInt8 后 length 不变', () => {
  const buf = Buffer.from([255]);
  const val = buf.readUInt8(0);
  return buf.length === 1 && val === 255;
});

test('readInt16BE 后 length 不变', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt16BE(32767, 0);
  const val = buf.readInt16BE(0);
  return buf.length === 4 && val === 32767;
});

test('readInt32BE 后 length 不变', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32BE(2147483647, 0);
  const val = buf.readInt32BE(0);
  return buf.length === 8 && val === 2147483647;
});

test('readFloatBE 后 length 不变', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(3.14, 0);
  const val = buf.readFloatBE(0);
  return buf.length === 8 && Math.abs(val - 3.14) < 0.01;
});

test('readDoubleBE 后 length 不变', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(3.14159, 0);
  const val = buf.readDoubleBE(0);
  return buf.length === 16 && Math.abs(val - 3.14159) < 0.00001;
});

// Buffer.concat 特殊情况
test('Buffer.concat 只包含空 buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 0;
});

test('Buffer.concat totalLength 为 0', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 0);
  return result.length === 0;
});

test('Buffer.concat totalLength 大于实际长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2], 100);
  return result.length === 100;
});

// slice/subarray 特殊参数
test('slice 只传 start 参数', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(6);
  return slice.length === 5;
});

test('subarray 只传 start 参数', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(6);
  return sub.length === 5;
});

test('slice start 为负数', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(-5);
  return slice.length === 5;
});

test('subarray start 为负数', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(-5);
  return sub.length === 5;
});

test('slice start 和 end 都为负数', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(-11, -6);
  return slice.length === 5;
});

test('subarray start 和 end 都为负数', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(-11, -6);
  return sub.length === 5;
});

// Buffer.alloc 填充值
test('Buffer.alloc 填充字符串后的 length', () => {
  const buf = Buffer.alloc(10, 'a');
  return buf.length === 10;
});

test('Buffer.alloc 填充数字后的 length', () => {
  const buf = Buffer.alloc(10, 255);
  return buf.length === 10;
});

test('Buffer.alloc 填充 Buffer 后的 length', () => {
  const fill = Buffer.from('ab');
  const buf = Buffer.alloc(10, fill);
  return buf.length === 10;
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
