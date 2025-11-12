// Buffer.byteLength() - 简化深度测试
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

// 1. 函数属性深度验证
test('Buffer.byteLength.length 属性值', () => {
  return Buffer.byteLength.length === 2;
});

test('Buffer.byteLength.name 属性值', () => {
  return Buffer.byteLength.name === 'byteLength';
});

// 2. 精确错误类型验证
test('undefined 参数错误代码精确验证', () => {
  try {
    Buffer.byteLength(undefined);
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE' && e.name === 'TypeError';
  }
});

// 3. Unicode 边界精确测试
test('U+10FFFF Unicode 最大码点', () => {
  return Buffer.byteLength('\u{10FFFF}') === 4;
});

// 4. BigInt64Array 测试
test('BigInt64Array 精确字节长度', () => {
  const arr = new BigInt64Array([1n, 2n, 3n]);
  return Buffer.byteLength(arr) === 24;
});

// 汇总测试结果
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
