// buffer.kStringMaxLength - Part 1: Basic Properties
const { Buffer, kStringMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 存在性测试
test('kStringMaxLength 存在', () => {
  return kStringMaxLength !== undefined;
});

test('kStringMaxLength 不为 null', () => {
  return kStringMaxLength !== null;
});

test('kStringMaxLength 可以从 buffer 模块导入', () => {
  const buffer = require('buffer');
  return buffer.kStringMaxLength !== undefined;
});

test('kStringMaxLength 可以通过解构导入', () => {
  const { kStringMaxLength: imported } = require('buffer');
  return imported !== undefined;
});

// 类型测试
test('kStringMaxLength 是 number 类型', () => {
  return typeof kStringMaxLength === 'number';
});

test('kStringMaxLength 不是 bigint 类型', () => {
  return typeof kStringMaxLength !== 'bigint';
});

test('kStringMaxLength 不是 string 类型', () => {
  return typeof kStringMaxLength !== 'string';
});

test('kStringMaxLength 不是 object 类型', () => {
  return typeof kStringMaxLength !== 'object';
});

// 数值特性测试
test('kStringMaxLength 是正数', () => {
  return kStringMaxLength > 0;
});

test('kStringMaxLength 不是负数', () => {
  return kStringMaxLength >= 0;
});

test('kStringMaxLength 是整数', () => {
  return Number.isInteger(kStringMaxLength);
});

test('kStringMaxLength 不是 NaN', () => {
  return !Number.isNaN(kStringMaxLength);
});

test('kStringMaxLength 是有限数', () => {
  return Number.isFinite(kStringMaxLength);
});

test('kStringMaxLength 不是 Infinity', () => {
  return kStringMaxLength !== Infinity;
});

test('kStringMaxLength 不是 -Infinity', () => {
  return kStringMaxLength !== -Infinity;
});

// 安全整数测试
test('kStringMaxLength 是安全整数', () => {
  return Number.isSafeInteger(kStringMaxLength);
});

test('kStringMaxLength 小于 Number.MAX_SAFE_INTEGER', () => {
  return kStringMaxLength < Number.MAX_SAFE_INTEGER;
});

test('kStringMaxLength 大于 Number.MIN_SAFE_INTEGER', () => {
  return kStringMaxLength > Number.MIN_SAFE_INTEGER;
});

// 精度测试
test('kStringMaxLength 加 1 不等于自身', () => {
  return kStringMaxLength + 1 !== kStringMaxLength;
});

test('kStringMaxLength 减 1 不等于自身', () => {
  return kStringMaxLength - 1 !== kStringMaxLength;
});

// 布尔转换测试
test('kStringMaxLength 在布尔上下文中为 true', () => {
  return !!kStringMaxLength === true;
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
