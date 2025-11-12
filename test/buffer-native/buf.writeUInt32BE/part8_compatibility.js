// buf.writeUInt32BE() - Compatibility Tests
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

// Node.js 版本兼容性测试
test('基本API兼容性', () => {
  const buf = Buffer.allocUnsafe(4);

  // 验证方法存在且可调用
  if (typeof buf.writeUInt32BE !== 'function') return false;

  const result = buf.writeUInt32BE(0x12345678, 0);

  return result === 4 && buf.readUInt32BE(0) === 0x12345678;
});

test('参数顺序兼容性', () => {
  const buf = Buffer.allocUnsafe(8);

  // 测试不同的参数组合
  const result1 = buf.writeUInt32BE(0x12345678, 0);
  const result2 = buf.writeUInt32BE(0x9ABCDEF0, 4);

  return result1 === 4 && result2 === 8 &&
         buf.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt32BE(4) === 0x9ABCDEF0;
});

test('与其他Buffer方法的兼容性', () => {
  const buf = Buffer.allocUnsafe(8);

  // 与其他写入方法一起使用
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt16BE(0x9ABC, 4);
  buf.writeUInt8(0xDE, 6);
  buf.writeUInt8(0xF0, 7);

  return buf.readUInt32BE(0) === 0x12345678 &&
         buf.readUInt16BE(4) === 0x9ABC &&
         buf.readUInt8(6) === 0xDE &&
         buf.readUInt8(7) === 0xF0;
});

test('与readUInt32BE的兼容性', () => {
  const buf = Buffer.allocUnsafe(4);
  const originalValue = 0x12345678;

  buf.writeUInt32BE(originalValue, 0);
  const readValue = buf.readUInt32BE(0);

  return readValue === originalValue;
});

test('与readUInt32LE的交叉兼容性', () => {
  const buf = Buffer.allocUnsafe(4);
  const value = 0x12345678;

  buf.writeUInt32BE(value, 0);
  const beRead = buf.readUInt32BE(0);
  const leRead = buf.readUInt32LE(0);

  // BE写入后，BE读取应该相同，LE读取应该不同
  return beRead === value && leRead !== value;
});

test('缓冲区类型兼容性', () => {
  // 测试不同类型的缓冲区
  const allocUnsafe = Buffer.allocUnsafe(4);
  const alloc = Buffer.alloc(4);
  const from = Buffer.from([0, 0, 0, 0]);

  allocUnsafe.writeUInt32BE(0x12345678, 0);
  alloc.writeUInt32BE(0x12345678, 0);
  from.writeUInt32BE(0x12345678, 0);

  return allocUnsafe.readUInt32BE(0) === 0x12345678 &&
         alloc.readUInt32BE(0) === 0x12345678 &&
         from.readUInt32BE(0) === 0x12345678;
});

test('数值范围兼容性', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试边界值
  buf.writeUInt32BE(0, 0);           // 最小值
  buf.writeUInt32BE(0xFFFFFFFF, 4);  // 最大值
  buf.writeUInt32BE(0x80000000, 8);  // 中间值1
  buf.writeUInt32BE(0x7FFFFFFF, 12); // 中间值2

  return buf.readUInt32BE(0) === 0 &&
         buf.readUInt32BE(4) === 0xFFFFFFFF &&
         buf.readUInt32BE(8) === 0x80000000 &&
         buf.readUInt32BE(12) === 0x7FFFFFFF;
});

test('偏移量边界兼容性', () => {
  const buf = Buffer.allocUnsafe(8);

  // 测试各种偏移量
  buf.writeUInt32BE(0x11111111, 0);
  buf.writeUInt32BE(0x22222222, 4);

  return buf.readUInt32BE(0) === 0x11111111 &&
         buf.readUInt32BE(4) === 0x22222222;
});

test('异常处理兼容性', () => {
  const buf = Buffer.allocUnsafe(4);

  // 测试异常处理
  try {
    buf.writeUInt32BE(0x12345678, -1);
    return false;
  } catch (e) {
    if (!e.message.includes('out of range')) return false;
  }

  try {
    buf.writeUInt32BE(0x12345678, 4);
    return false;
  } catch (e) {
    if (!e.message.includes('out of range')) return false;
  }

  try {
    buf.writeUInt32BE(-1, 0);
    return false;
  } catch (e) {
    if (!e.message.includes('out of range')) return false;
  }

  return true;
});

test('字符串数值兼容性', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试字符串数值转换
  buf.writeUInt32BE('123', 0);
  buf.writeUInt32BE('0xFF', 4);
  buf.writeUInt32BE('1e2', 8);
  buf.writeUInt32BE('0777', 12); // Node.js将其视为十进制，不是八进制

  return buf.readUInt32BE(0) === 123 &&
         buf.readUInt32BE(4) === 255 &&
         buf.readUInt32BE(8) === 100 &&
         buf.readUInt32BE(12) === 777; // '0777' 被解析为十进制777
});

test('浮点数转换兼容性', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试浮点数转换
  buf.writeUInt32BE(123.7, 0);
  buf.writeUInt32BE(456.1, 4);
  buf.writeUInt32BE(789.9, 8);
  buf.writeUInt32BE(0.999, 12);

  return buf.readUInt32BE(0) === 123 &&
         buf.readUInt32BE(4) === 456 &&
         buf.readUInt32BE(8) === 789 &&
         buf.readUInt32BE(12) === 0;
});

test('特殊数值兼容性', () => {
  const buf = Buffer.allocUnsafe(16);

  // 测试特殊数值
  buf.writeUInt32BE(null, 0);
  buf.writeUInt32BE(undefined, 4);
  buf.writeUInt32BE(true, 8);
  buf.writeUInt32BE(false, 12);

  return buf.readUInt32BE(0) === 0 &&
         buf.readUInt32BE(4) === 0 &&
         buf.readUInt32BE(8) === 1 &&
         buf.readUInt32BE(12) === 0;
});

test('返回值兼容性', () => {
  const buf = Buffer.allocUnsafe(8);

  // 测试返回值
  const result1 = buf.writeUInt32BE(0x12345678, 0);
  const result2 = buf.writeUInt32BE(0x9ABCDEF0, 4);

  return result1 === 4 && result2 === 8;
});

test('与其他数据类型的兼容性', () => {
  const buf = Buffer.allocUnsafe(8);

  // 与其他数据类型混合使用
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeDoubleBE(123.456, 0); // 覆盖前面的数据

  const doubleValue = buf.readDoubleBE(0);

  // Double写入会覆盖前面的UInt32数据
  return Math.abs(doubleValue - 123.456) < 0.001;
});

test('字节序一致性兼容性', () => {
  const buf = Buffer.allocUnsafe(8);

  // 确保BE和LE的一致性
  buf.writeUInt32BE(0x01020304, 0);
  buf.writeUInt32LE(0x01020304, 4);

  const beBytes = [buf[0], buf[1], buf[2], buf[3]];
  const leBytes = [buf[4], buf[5], buf[6], buf[7]];

  // BE: 01 02 03 04
  // LE: 04 03 02 01
  return beBytes[0] === 0x01 && beBytes[1] === 0x02 &&
         beBytes[2] === 0x03 && beBytes[3] === 0x04 &&
         leBytes[0] === 0x04 && leBytes[1] === 0x03 &&
         leBytes[2] === 0x02 && leBytes[3] === 0x01;
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