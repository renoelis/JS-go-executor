// Node.js 官方文档示例验证 - readIntBE/readIntLE
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

// 官方示例: readIntBE
test('官方示例: [0x12, 0x34, 0x56, 0x78, 0x90, 0xab] readIntBE(0, 6)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
  const result = buf.readIntBE(0, 6);
  return result === 0x1234567890ab;
});

// 官方示例: readIntLE
test('官方示例: [0x12, 0x34, 0x56, 0x78, 0x90, 0xab] readIntLE(0, 6)', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
  const result = buf.readIntLE(0, 6);
  return result === -0x546f87a9cbee;
});

// 官方示例: 越界错误
test('官方示例: readIntBE(1, 6) 应该失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
    buf.readIntBE(1, 6);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('官方示例: readIntLE(1, 6) 应该失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xab]);
    buf.readIntLE(1, 6);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 两个补码验证
test('两个补码: [0xFF, 0xFF, 0xFF, 0xFF] readIntBE(0, 4) === -1', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 4) === -1;
});

test('两个补码: [0xFF, 0xFF, 0xFF, 0xFF] readIntLE(0, 4) === -1', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntLE(0, 4) === -1;
});

test('两个补码: [0x80, 0x00, 0x00, 0x00] readIntBE(0, 4) === -2147483648', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readIntBE(0, 4) === -2147483648;
});

test('两个补码: [0x00, 0x00, 0x00, 0x80] readIntLE(0, 4) === -2147483648', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readIntLE(0, 4) === -2147483648;
});

test('两个补码: [0x7F, 0xFF, 0xFF, 0xFF] readIntBE(0, 4) === 2147483647', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 4) === 2147483647;
});

test('两个补码: [0xFF, 0xFF, 0xFF, 0x7F] readIntLE(0, 4) === 2147483647', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 4) === 2147483647;
});

// 不同 byteLength 验证
test('byteLength=1: [0x7F] readIntBE(0, 1) === 127', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readIntBE(0, 1) === 127;
});

test('byteLength=1: [0x80] readIntBE(0, 1) === -128', () => {
  const buf = Buffer.from([0x80]);
  return buf.readIntBE(0, 1) === -128;
});

test('byteLength=2: [0x7F, 0xFF] readIntBE(0, 2) === 32767', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readIntBE(0, 2) === 32767;
});

test('byteLength=2: [0x80, 0x00] readIntBE(0, 2) === -32768', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readIntBE(0, 2) === -32768;
});

test('byteLength=3: [0x7F, 0xFF, 0xFF] readIntBE(0, 3) === 8388607', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF]);
  return buf.readIntBE(0, 3) === 8388607;
});

test('byteLength=3: [0x80, 0x00, 0x00] readIntBE(0, 3) === -8388608', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00]);
  return buf.readIntBE(0, 3) === -8388608;
});

test('byteLength=5: [0x7F, 0xFF, 0xFF, 0xFF, 0xFF] readIntBE(0, 5) === 549755813887', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 5) === 549755813887;
});

test('byteLength=5: [0x80, 0x00, 0x00, 0x00, 0x00] readIntBE(0, 5) === -549755813888', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00]);
  return buf.readIntBE(0, 5) === -549755813888;
});

test('byteLength=6: [0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF] readIntBE(0, 6) === 140737488355327', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 6) === 140737488355327;
});

test('byteLength=6: [0x80, 0x00, 0x00, 0x00, 0x00, 0x00] readIntBE(0, 6) === -140737488355328', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readIntBE(0, 6) === -140737488355328;
});

// LE 字节序验证
test('byteLength=1: [0x7F] readIntLE(0, 1) === 127', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readIntLE(0, 1) === 127;
});

test('byteLength=2: [0xFF, 0x7F] readIntLE(0, 2) === 32767', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readIntLE(0, 2) === 32767;
});

test('byteLength=3: [0xFF, 0xFF, 0x7F] readIntLE(0, 3) === 8388607', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 3) === 8388607;
});

test('byteLength=6: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F] readIntLE(0, 6) === 140737488355327', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 6) === 140737488355327;
});

// 返回值类型验证
test('返回值类型: readIntBE 返回 number', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readIntBE(0, 4);
  return typeof result === 'number';
});

test('返回值类型: readIntLE 返回 number', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readIntLE(0, 4);
  return typeof result === 'number';
});

test('返回值类型: readIntBE 返回整数', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readIntBE(0, 4);
  return Number.isInteger(result);
});

test('返回值类型: readIntLE 返回整数', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readIntLE(0, 4);
  return Number.isInteger(result);
});

// 字节序对比
test('字节序: BE 高字节在前', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return buf.readIntBE(0, 4) === 0x12345678;
});

test('字节序: LE 低字节在前', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return buf.readIntLE(0, 4) === 0x12345678;
});

test('字节序: 同一数据 BE 和 LE 不同', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const be = buf.readIntBE(0, 4);
  const le = buf.readIntLE(0, 4);
  return be !== le && be === 0x12345678 && le === 0x78563412;
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
