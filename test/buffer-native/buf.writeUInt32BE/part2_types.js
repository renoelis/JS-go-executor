// buf.writeUInt32BE() - Input Types Tests
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

// 数值类型测试
test('正整数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(12345, 0);
  return buf.readUInt32BE(0) === 12345;
});

test('零值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0, 0);
  return buf.readUInt32BE(0) === 0;
});

test('字符串数字', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE('12345', 0);
  return buf.readUInt32BE(0) === 12345;
});

test('浮点数转换为整数', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(123.789, 0);
  return buf.readUInt32BE(0) === 123;
});

test('科学计数法', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(1.5e4, 0);
  return buf.readUInt32BE(0) === 15000;
});

test('十六进制字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0xFF, 0);
  return buf.readUInt32BE(0) === 255;
});

test('二进制字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0b1010, 0);
  return buf.readUInt32BE(0) === 10;
});

test('八进制字符串', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0o777, 0);
  return buf.readUInt32BE(0) === 511;
});

// 特殊数值
test('32位无符号整数最大值', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(0xFFFFFFFF, 0);
    return buf.readUInt32BE(0) === 0xFFFFFFFF;
  } catch (e) {
    return false;
  }
});

test('超出32位范围应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(Number.MAX_SAFE_INTEGER, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('out of range');
  }
});

test('负数超出范围应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(-1000, 0);
    return false; // 应该抛出异常
  } catch (e) {
    return e.message.includes('out of range');
  }
});

// 偏移量类型测试 - 应该抛出异常
test('偏移量为字符串数字应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(12345, '0');
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('偏移量为浮点数应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(12345, 1.7);
    return false;
  } catch (e) {
    return e.message.includes('must be an integer');
  }
});

// 布尔值
test('布尔值 true 作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(true, 0);
  return buf.readUInt32BE(0) === 1;
});

test('布尔值 false 作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(false, 0);
  return buf.readUInt32BE(0) === 0;
});

test('布尔值 true 作为偏移量应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(5);
    buf.writeUInt32BE(12345, true);
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('布尔值 false 作为偏移量应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(12345, false);
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

// null 和 undefined
test('null 作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(null, 0);
  return buf.readUInt32BE(0) === 0;
});

test('undefined 作为数值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(undefined, 0);
  return buf.readUInt32BE(0) === 0;
});

test('null 作为偏移量应该抛出异常', () => {
  try {
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt32BE(12345, null);
    return false;
  } catch (e) {
    return e.message.includes('must be of type number');
  }
});

test('undefined 作为偏移量应该正常工作', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(12345, undefined);
  return buf.readUInt32BE(0) === 12345;
});

// 大数值
test('大数值 0xFFFFFFFF', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0xFFFFFFFF, 0);
  return buf.readUInt32BE(0) === 0xFFFFFFFF;
});

test('大数值 0x80000000', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x80000000, 0);
  return buf.readUInt32BE(0) === 0x80000000;
});

test('大数值 0x7FFFFFFF', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x7FFFFFFF, 0);
  return buf.readUInt32BE(0) === 0x7FFFFFFF;
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