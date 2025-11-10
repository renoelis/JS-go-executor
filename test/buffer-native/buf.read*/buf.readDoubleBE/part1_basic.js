// buf.readDoubleBE() - 基础功能测试
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

// 基本读取测试
test('读取零', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0, 0);
  return buf.readDoubleBE(0) === 0;
});

test('读取正浮点数', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(3.14159, 0);
  return Math.abs(buf.readDoubleBE(0) - 3.14159) < 0.00001;
});

test('读取负浮点数', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-2.71828, 0);
  return Math.abs(buf.readDoubleBE(0) - (-2.71828)) < 0.00001;
});

test('读取整数值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(42, 0);
  return buf.readDoubleBE(0) === 42;
});

test('读取大数值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1e100, 0);
  return buf.readDoubleBE(0) === 1e100;
});

test('读取小数值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1e-100, 0);
  return buf.readDoubleBE(0) === 1e-100;
});

// offset 默认值
test('offset 默认值为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456, 0);
  return Math.abs(buf.readDoubleBE() - 123.456) < 0.001;
});

// 不同 offset 位置
test('offset = 0', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(111.111, 0);
  return Math.abs(buf.readDoubleBE(0) - 111.111) < 0.001;
});

test('offset = 8', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(222.222, 8);
  return Math.abs(buf.readDoubleBE(8) - 222.222) < 0.001;
});

test('offset = buf.length - 8（边界）', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(333.333, 8);
  return Math.abs(buf.readDoubleBE(8) - 333.333) < 0.001;
});

// 往返测试
test('写入后读取一致性', () => {
  const buf = Buffer.alloc(8);
  const value = 987654.321;
  buf.writeDoubleBE(value, 0);
  return buf.readDoubleBE(0) === value;
});

// Big-Endian 字节序验证
test('Big-Endian 字节序正确', () => {
  const buf = Buffer.from([0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18]);
  // 这是 π (3.141592653589793) 的 IEEE 754 big-endian 表示
  return Math.abs(buf.readDoubleBE(0) - Math.PI) < 1e-15;
});

test('Big-Endian 高位字节在前', () => {
  const buf = Buffer.from([0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readDoubleBE(0) === 1.0; // 第一个字节是最高位
});

test('官方示例值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const expected = 8.20788039913184e-304;
  return buf.readDoubleBE(0) === expected;
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
