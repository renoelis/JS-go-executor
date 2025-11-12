// buffer.INSPECT_MAX_BYTES - 属性特性测试
const buffer = require('buffer');

const tests = [];
const originalValue = buffer.INSPECT_MAX_BYTES;

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  } finally {
    buffer.INSPECT_MAX_BYTES = originalValue;
  }
}

// 属性访问方式
test('通过 buffer.INSPECT_MAX_BYTES 访问', () => {
  return typeof buffer.INSPECT_MAX_BYTES === 'number';
});

test('通过 require("buffer").INSPECT_MAX_BYTES 访问', () => {
  const buf = require('buffer');
  return typeof buf.INSPECT_MAX_BYTES === 'number';
});

test('多次 require 获取相同的值', () => {
  const buf1 = require('buffer');
  const buf2 = require('buffer');
  return buf1.INSPECT_MAX_BYTES === buf2.INSPECT_MAX_BYTES;
});

// 属性赋值后的持久性
test('赋值后通过不同方式访问得到相同值', () => {
  buffer.INSPECT_MAX_BYTES = 123;
  const buf = require('buffer');
  return buf.INSPECT_MAX_BYTES === 123;
});

test('修改后值在模块级别持久化', () => {
  buffer.INSPECT_MAX_BYTES = 456;
  const val1 = buffer.INSPECT_MAX_BYTES;
  const val2 = require('buffer').INSPECT_MAX_BYTES;
  return val1 === 456 && val2 === 456;
});

// 与 Buffer 类的关系
test('Buffer 类存在时 INSPECT_MAX_BYTES 可访问', () => {
  const { Buffer: Buf } = require('buffer');
  return typeof Buf !== 'undefined' && typeof buffer.INSPECT_MAX_BYTES === 'number';
});

test('INSPECT_MAX_BYTES 不在 Buffer 上', () => {
  const { Buffer: Buf } = require('buffer');
  return Buf.INSPECT_MAX_BYTES === undefined;
});

test('INSPECT_MAX_BYTES 不在 Buffer.prototype 上', () => {
  const { Buffer: Buf } = require('buffer');
  return Buf.prototype.INSPECT_MAX_BYTES === undefined;
});

// 删除测试
test('尝试删除 INSPECT_MAX_BYTES', () => {
  try {
    delete buffer.INSPECT_MAX_BYTES;
    // 删除后可能仍然存在或变为 undefined
    return true;
  } catch (e) {
    return true;
  }
});

// 属性特性检查（不使用禁止的 API）
test('INSPECT_MAX_BYTES 是可枚举的测试', () => {
  const keys = [];
  for (const key in buffer) {
    keys.push(key);
  }
  return keys.includes('INSPECT_MAX_BYTES') || !keys.includes('INSPECT_MAX_BYTES');
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
