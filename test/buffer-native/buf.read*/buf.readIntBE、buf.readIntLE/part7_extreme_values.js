// 极端值和边界测试
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

// 1字节边界值
test('1字节: 最大正数 0x7F (127)', () => {
  const buf = Buffer.from([0x7F]);
  return buf.readIntBE(0, 1) === 127;
});

test('1字节: 最小负数 0x80 (-128)', () => {
  const buf = Buffer.from([0x80]);
  return buf.readIntBE(0, 1) === -128;
});

test('1字节: 零 0x00', () => {
  const buf = Buffer.from([0x00]);
  return buf.readIntBE(0, 1) === 0;
});

test('1字节: -1 (0xFF)', () => {
  const buf = Buffer.from([0xFF]);
  return buf.readIntBE(0, 1) === -1;
});

// 2字节边界值
test('2字节: 最大正数 0x7FFF (32767)', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  return buf.readIntBE(0, 2) === 32767;
});

test('2字节: 最小负数 0x8000 (-32768)', () => {
  const buf = Buffer.from([0x80, 0x00]);
  return buf.readIntBE(0, 2) === -32768;
});

test('2字节: -1 (0xFFFF)', () => {
  const buf = Buffer.from([0xFF, 0xFF]);
  return buf.readIntBE(0, 2) === -1;
});

test('2字节 LE: 最大正数', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  return buf.readIntLE(0, 2) === 32767;
});

test('2字节 LE: 最小负数', () => {
  const buf = Buffer.from([0x00, 0x80]);
  return buf.readIntLE(0, 2) === -32768;
});

// 3字节边界值
test('3字节: 最大正数 0x7FFFFF (8388607)', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF]);
  return buf.readIntBE(0, 3) === 8388607;
});

test('3字节: 最小负数 0x800000 (-8388608)', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00]);
  return buf.readIntBE(0, 3) === -8388608;
});

test('3字节: -1 (0xFFFFFF)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 3) === -1;
});

test('3字节 LE: 最大正数', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 3) === 8388607;
});

test('3字节 LE: 最小负数', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80]);
  return buf.readIntLE(0, 3) === -8388608;
});

// 4字节边界值
test('4字节: 最大正数 0x7FFFFFFF (2147483647)', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 4) === 2147483647;
});

test('4字节: 最小负数 0x80000000 (-2147483648)', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  return buf.readIntBE(0, 4) === -2147483648;
});

test('4字节: -1 (0xFFFFFFFF)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 4) === -1;
});

test('4字节 LE: 最大正数', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 4) === 2147483647;
});

test('4字节 LE: 最小负数', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  return buf.readIntLE(0, 4) === -2147483648;
});

// 5字节边界值
test('5字节: 最大正数 0x7FFFFFFFFF (549755813887)', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 5) === 549755813887;
});

test('5字节: 最小负数 0x8000000000 (-549755813888)', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00]);
  return buf.readIntBE(0, 5) === -549755813888;
});

test('5字节: -1 (0xFFFFFFFFFF)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 5) === -1;
});

test('5字节 LE: 最大正数', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 5) === 549755813887;
});

test('5字节 LE: 最小负数', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readIntLE(0, 5) === -549755813888;
});

// 6字节边界值
test('6字节: 最大正数 0x7FFFFFFFFFFF (140737488355327)', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 6) === 140737488355327;
});

test('6字节: 最小负数 0x800000000000 (-140737488355328)', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readIntBE(0, 6) === -140737488355328;
});

test('6字节: -1 (0xFFFFFFFFFFFF)', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return buf.readIntBE(0, 6) === -1;
});

test('6字节 LE: 最大正数', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x7F]);
  return buf.readIntLE(0, 6) === 140737488355327;
});

test('6字节 LE: 最小负数', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x80]);
  return buf.readIntLE(0, 6) === -140737488355328;
});

// 特殊模式
test('全0: 所有字节为0', () => {
  const buf = Buffer.alloc(6);
  return buf.readIntBE(0, 1) === 0 &&
         buf.readIntBE(0, 2) === 0 &&
         buf.readIntBE(0, 3) === 0 &&
         buf.readIntBE(0, 4) === 0 &&
         buf.readIntBE(0, 5) === 0 &&
         buf.readIntBE(0, 6) === 0;
});

test('全1: 所有字节为0xFF', () => {
  const buf = Buffer.alloc(6, 0xFF);
  return buf.readIntBE(0, 1) === -1 &&
         buf.readIntBE(0, 2) === -1 &&
         buf.readIntBE(0, 3) === -1 &&
         buf.readIntBE(0, 4) === -1 &&
         buf.readIntBE(0, 5) === -1 &&
         buf.readIntBE(0, 6) === -1;
});

test('交替模式: 0xAA (10101010)', () => {
  const buf = Buffer.alloc(6, 0xAA);
  const r1 = buf.readIntBE(0, 1);
  const r2 = buf.readIntBE(0, 2);
  return r1 === -86 && r2 === -21846;
});

test('交替模式: 0x55 (01010101)', () => {
  const buf = Buffer.alloc(6, 0x55);
  const r1 = buf.readIntBE(0, 1);
  const r2 = buf.readIntBE(0, 2);
  return r1 === 85 && r2 === 21845;
});

// 对称性测试
test('对称性: BE和LE反转后相等 (2字节)', () => {
  const bufBE = Buffer.from([0x12, 0x34]);
  const bufLE = Buffer.from([0x34, 0x12]);
  return bufBE.readIntBE(0, 2) === bufLE.readIntLE(0, 2);
});

test('对称性: BE和LE反转后相等 (4字节)', () => {
  const bufBE = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const bufLE = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return bufBE.readIntBE(0, 4) === bufLE.readIntLE(0, 4);
});

test('对称性: BE和LE反转后相等 (6字节)', () => {
  const bufBE = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x90, 0xAB]);
  const bufLE = Buffer.from([0xAB, 0x90, 0x78, 0x56, 0x34, 0x12]);
  return bufBE.readIntBE(0, 6) === bufLE.readIntLE(0, 6);
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
