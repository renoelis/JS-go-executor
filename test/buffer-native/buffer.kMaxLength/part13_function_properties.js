// buffer.kMaxLength - Part 13: Function Properties and Deep Analysis
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

// kMaxLength 的函数属性测试（虽然它是常量，但也需要验证不是函数）
test('kMaxLength 不是函数', () => {
  return typeof kMaxLength !== 'function';
});

test('kMaxLength 没有 length 属性', () => {
  return kMaxLength.length === undefined;
});

test('kMaxLength 没有 name 属性', () => {
  return kMaxLength.name === undefined;
});

test('kMaxLength 没有 prototype 属性', () => {
  return kMaxLength.prototype === undefined;
});

test('kMaxLength 不能调用', () => {
  try {
    kMaxLength();
    return false;
  } catch (e) {
    return e instanceof TypeError;
  }
});

// Buffer 构造器与 kMaxLength 的关系
test('Buffer.kMaxLength 不存在（kMaxLength 只通过 require 导入）', () => {
  return Buffer.kMaxLength === undefined;
});

test('Buffer 函数没有 kMaxLength 属性', () => {
  return !Buffer.hasOwnProperty('kMaxLength');
});

test('kMaxLength 不是 Buffer 实例的属性', () => {
  const buf = Buffer.alloc(10);
  return buf.kMaxLength === undefined;
});

// 数值精确性和边界测试
test('kMaxLength 在 JSON 序列化后保持精确', () => {
  const serialized = JSON.stringify({ kMaxLength });
  const parsed = JSON.parse(serialized);
  return parsed.kMaxLength === kMaxLength;
});

test('kMaxLength 在字符串化后保持精确', () => {
  return String(kMaxLength) === '9007199254740991';
});

test('kMaxLength 转换为字符串再解析保持不变', () => {
  const str = kMaxLength.toString();
  const parsed = parseInt(str, 10);
  return parsed === kMaxLength;
});

// 比较操作测试
test('kMaxLength 严格等于自身', () => {
  return kMaxLength === kMaxLength;
});

test('kMaxLength 与 Number.MAX_SAFE_INTEGER 严格相等', () => {
  return kMaxLength === Number.MAX_SAFE_INTEGER;
});

test('kMaxLength 不等于 Number.MAX_SAFE_INTEGER + 1', () => {
  return kMaxLength !== Number.MAX_SAFE_INTEGER + 1;
});

test('kMaxLength 小于 Infinity', () => {
  return kMaxLength < Infinity;
});

test('kMaxLength 大于 0', () => {
  return kMaxLength > 0;
});

// 数学运算精度测试
test('kMaxLength + 1 - 1 等于 kMaxLength', () => {
  return (kMaxLength + 1 - 1) === kMaxLength;
});

test('kMaxLength * 1 等于 kMaxLength', () => {
  return kMaxLength * 1 === kMaxLength;
});

test('kMaxLength / 1 等于 kMaxLength', () => {
  return kMaxLength / 1 === kMaxLength;
});

test('Math.floor(kMaxLength) 等于 kMaxLength', () => {
  return Math.floor(kMaxLength) === kMaxLength;
});

test('Math.ceil(kMaxLength) 等于 kMaxLength', () => {
  return Math.ceil(kMaxLength) === kMaxLength;
});

// 位运算测试（注意 JavaScript 位运算的 32 位限制）
test('kMaxLength 位运算会截断到 32 位', () => {
  const result = kMaxLength | 0;
  return result !== kMaxLength && result === -1;
});

test('kMaxLength >>> 0 进行无符号右移', () => {
  const result = kMaxLength >>> 0;
  return result !== kMaxLength;
});

// 类型转换边界测试
test('Boolean(kMaxLength) 为 true', () => {
  return Boolean(kMaxLength) === true;
});

test('Number(kMaxLength) 等于 kMaxLength', () => {
  return Number(kMaxLength) === kMaxLength;
});

test('kMaxLength.valueOf() 等于 kMaxLength', () => {
  return kMaxLength.valueOf() === kMaxLength;
});

// 模运算测试
test('kMaxLength % 2 测试奇偶性', () => {
  return (kMaxLength % 2) === 1;
});

test('kMaxLength % 10 获取个位数', () => {
  return (kMaxLength % 10) === 1;
});

// 极端比较测试
test('kMaxLength 与 Number.MIN_SAFE_INTEGER 比较', () => {
  return kMaxLength > Number.MIN_SAFE_INTEGER;
});

test('kMaxLength 与 Number.EPSILON 比较', () => {
  return kMaxLength > Number.EPSILON;
});

test('kMaxLength 与 Number.MAX_VALUE 比较', () => {
  return kMaxLength < Number.MAX_VALUE;
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
