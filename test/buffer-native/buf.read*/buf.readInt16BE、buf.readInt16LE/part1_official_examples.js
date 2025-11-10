// Node.js 官方文档示例验证
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

// 官方示例 1: readInt16BE
test('官方示例: [0, 5] readInt16BE(0) === 5', () => {
  const buf = Buffer.from([0, 5]);
  return buf.readInt16BE(0) === 5;
});

// 官方示例 2: readInt16LE
test('官方示例: [0, 5] readInt16LE(0) === 1280', () => {
  const buf = Buffer.from([0, 5]);
  return buf.readInt16LE(0) === 1280;
});

// 官方示例 3: readInt16LE 越界
test('官方示例: [0, 5] readInt16LE(1) 抛出错误', () => {
  try {
    const buf = Buffer.from([0, 5]);
    buf.readInt16LE(1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 补充: 两个补码解释验证
test('两个补码: [0xFF, 0xFF] BE 解释为 -1', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16BE(0) === -1;
});

test('两个补码: [0xFF, 0xFF] LE 解释为 -1', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readInt16LE(0) === -1;
});

test('两个补码: [0x80, 0x00] BE 解释为 -32768', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readInt16BE(0) === -32768;
});

test('两个补码: [0x00, 0x80] LE 解释为 -32768', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readInt16LE(0) === -32768;
});

test('两个补码: [0x7F, 0xFF] BE 解释为 32767', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readInt16BE(0) === 32767;
});

test('两个补码: [0xFF, 0x7F] LE 解释为 32767', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readInt16LE(0) === 32767;
});

// 验证 offset 参数约束
test('offset 约束: 0 <= offset <= buf.length - 2 (offset=0)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('offset 约束: 0 <= offset <= buf.length - 2 (offset=buf.length-2)', () => {
  const buf = Buffer.from([0x00, 0x12, 0x34]);
  return buf.readInt16BE(1) === 0x1234;
});

test('offset 约束: offset = buf.length - 1 应该失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset 约束: offset = buf.length 应该失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(2);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

test('offset 约束: offset < 0 应该失败', () => {
  try {
    const buf = Buffer.from([0x12, 0x34]);
    buf.readInt16BE(-1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 验证返回值类型
test('返回值类型: readInt16BE 返回 number 类型', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readInt16BE(0);
  return typeof result === 'number';
});

test('返回值类型: readInt16LE 返回 number 类型', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const result = buf.readInt16LE(0);
  return typeof result === 'number';
});

test('返回值类型: readInt16BE 返回整数', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readInt16BE(0);
  return Number.isInteger(result);
});

test('返回值类型: readInt16LE 返回整数', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const result = buf.readInt16LE(0);
  return Number.isInteger(result);
});

// 验证 offset 默认值
test('offset 默认值: readInt16BE() 等价于 readInt16BE(0)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE() === buf.readInt16BE(0);
});

test('offset 默认值: readInt16LE() 等价于 readInt16LE(0)', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE() === buf.readInt16LE(0);
});

// 字节序验证
test('字节序: BE 高字节在前', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return buf.readInt16BE(0) === 0x1234;
});

test('字节序: LE 低字节在前', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return buf.readInt16LE(0) === 0x1234;
});

test('字节序: 同一数据 BE 和 LE 不同', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const be = buf.readInt16BE(0);
  const le = buf.readInt16LE(0);
  return be !== le && be === 0x1234 && le === 0x3412;
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
