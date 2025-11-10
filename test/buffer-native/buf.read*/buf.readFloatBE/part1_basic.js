// buf.readFloatBE() - 基础功能测试
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
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(0, 0);
  return buf.readFloatBE(0) === 0;
});

test('读取正浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 0);
  return Math.abs(buf.readFloatBE(0) - 3.14) < 0.01;
});

test('读取负浮点数', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(-2.718, 0);
  return Math.abs(buf.readFloatBE(0) - (-2.718)) < 0.001;
});

test('读取整数值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(42, 0);
  return buf.readFloatBE(0) === 42;
});

test('读取大数值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(1e30, 0);
  return Math.abs(buf.readFloatBE(0) - 1e30) < 1e25;
});

test('读取小数值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(1e-30, 0);
  return Math.abs(buf.readFloatBE(0) - 1e-30) < 1e-35;
});

// offset 默认值
test('offset 默认值为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  return Math.abs(buf.readFloatBE() - 123.456) < 0.001;
});

// 不同 offset 位置
test('offset = 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(111.111, 0);
  return Math.abs(buf.readFloatBE(0) - 111.111) < 0.001;
});

test('offset = 4', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(222.222, 4);
  return Math.abs(buf.readFloatBE(4) - 222.222) < 0.001;
});

test('offset = buf.length - 4（边界）', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(333.333, 4);
  return Math.abs(buf.readFloatBE(4) - 333.333) < 0.001;
});

// 往返测试
test('写入后读取一致性', () => {
  const buf = Buffer.alloc(4);
  const value = 987.654;
  buf.writeFloatBE(value, 0);
  return Math.abs(buf.readFloatBE(0) - value) < 0.001;
});

// Big-Endian 字节序验证
test('Big-Endian 字节序正确', () => {
  const buf = Buffer.from([0x40, 0x49, 0x0F, 0xDB]);
  // 这是 π (3.14159265...) 的 IEEE 754 float32 big-endian 表示
  return Math.abs(buf.readFloatBE(0) - Math.PI) < 0.00001;
});

test('Big-Endian 高位字节在前', () => {
  const buf = Buffer.from([0x3F, 0x80, 0x00, 0x00]);
  return buf.readFloatBE(0) === 1.0; // 第一个字节是最高位
});

test('官方示例值', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const expected = 2.387939260590663e-38;
  return buf.readFloatBE(0) === expected;
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
