// buffer.kMaxLength - Part 1: Basic Property Tests
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 基本存在性测试
test('kMaxLength 存在', () => {
  return kMaxLength !== undefined;
});

test('kMaxLength 通过解构导入可用', () => {
  const { kMaxLength: k } = require('buffer');
  return k !== undefined && k === kMaxLength;
});

test('kMaxLength 通过 buffer 模块直接访问', () => {
  const buffer = require('buffer');
  return buffer.kMaxLength === kMaxLength;
});

// 类型测试
test('kMaxLength 是数字', () => {
  return typeof kMaxLength === 'number';
});

test('kMaxLength 是正数', () => {
  return kMaxLength > 0;
});

test('kMaxLength 是整数', () => {
  return Number.isInteger(kMaxLength);
});

test('kMaxLength 是有限数', () => {
  return Number.isFinite(kMaxLength);
});

test('kMaxLength 不是 NaN', () => {
  return !Number.isNaN(kMaxLength);
});

// 值的准确性测试
test('kMaxLength 在 Node v25.0.0 中等于 Number.MAX_SAFE_INTEGER', () => {
  return kMaxLength === Number.MAX_SAFE_INTEGER;
});

test('kMaxLength 的值是 9007199254740991', () => {
  return kMaxLength === 9007199254740991;
});

test('kMaxLength 等于 2^53 - 1', () => {
  return kMaxLength === Math.pow(2, 53) - 1;
});

// 与 buffer.constants.MAX_LENGTH 的关系
test('kMaxLength 等于 buffer.constants.MAX_LENGTH', () => {
  const { constants } = require('buffer');
  return kMaxLength === constants.MAX_LENGTH;
});

test('buffer.constants.MAX_LENGTH 也是 Number.MAX_SAFE_INTEGER', () => {
  const { constants } = require('buffer');
  return constants.MAX_LENGTH === Number.MAX_SAFE_INTEGER;
});

// 不可变性测试（kMaxLength 是通过解构得到的局部常量，模块导出本身可能允许修改）
test('kMaxLength 值在运行时保持稳定', () => {
  const original = kMaxLength;
  const { kMaxLength: current } = require('buffer');
  return current === original && original === 9007199254740991;
});

test('重新导入 buffer 模块 kMaxLength 值不变', () => {
  const buffer = require('buffer');
  return buffer.kMaxLength === kMaxLength;
});

// 数学边界测试
test('kMaxLength 小于或等于 Number.MAX_SAFE_INTEGER', () => {
  return kMaxLength <= Number.MAX_SAFE_INTEGER;
});

test('kMaxLength 大于 Number.MAX_SAFE_INTEGER - 1', () => {
  return kMaxLength > Number.MAX_SAFE_INTEGER - 1;
});

test('kMaxLength 可以安全地用于数组索引', () => {
  return kMaxLength >= 0 && kMaxLength <= Number.MAX_SAFE_INTEGER;
});

// 实际大小对比
test('kMaxLength 大于 8GB', () => {
  const eightGB = 8 * 1024 * 1024 * 1024;
  return kMaxLength > eightGB;
});

test('kMaxLength 大于 1TB', () => {
  const oneTB = 1024 * 1024 * 1024 * 1024;
  return kMaxLength > oneTB;
});

test('kMaxLength 约等于 8PB 量级', () => {
  const onePB = 1024 * 1024 * 1024 * 1024 * 1024;
  return kMaxLength > onePB;
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
