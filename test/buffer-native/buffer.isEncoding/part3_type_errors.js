// Buffer.isEncoding - part3: 类型错误与非字符串输入
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

// 非字符串类型输入
test('数字 0 应返回 false', () => {
  return Buffer.isEncoding(0) === false;
});

test('数字 123 应返回 false', () => {
  return Buffer.isEncoding(123) === false;
});

test('负数 -1 应返回 false', () => {
  return Buffer.isEncoding(-1) === false;
});

test('浮点数 3.14 应返回 false', () => {
  return Buffer.isEncoding(3.14) === false;
});

test('null 应返回 false', () => {
  return Buffer.isEncoding(null) === false;
});

test('undefined 应返回 false', () => {
  return Buffer.isEncoding(undefined) === false;
});

test('布尔值 true 应返回 false', () => {
  return Buffer.isEncoding(true) === false;
});

test('布尔值 false 应返回 false', () => {
  return Buffer.isEncoding(false) === false;
});

test('空对象 {} 应返回 false', () => {
  return Buffer.isEncoding({}) === false;
});

test('对象 {encoding: "utf8"} 应返回 false', () => {
  return Buffer.isEncoding({encoding: 'utf8'}) === false;
});

test('空数组 [] 应返回 false', () => {
  return Buffer.isEncoding([]) === false;
});

test('数组 ["utf8"] 应返回 false', () => {
  return Buffer.isEncoding(['utf8']) === false;
});

test('函数应返回 false', () => {
  return Buffer.isEncoding(function(){}) === false;
});

test('箭头函数应返回 false', () => {
  return Buffer.isEncoding(() => {}) === false;
});

test('Symbol 应返回 false', () => {
  return Buffer.isEncoding(Symbol('utf8')) === false;
});

test('NaN 应返回 false', () => {
  return Buffer.isEncoding(NaN) === false;
});

test('Infinity 应返回 false', () => {
  return Buffer.isEncoding(Infinity) === false;
});

test('-Infinity 应返回 false', () => {
  return Buffer.isEncoding(-Infinity) === false;
});

test('BigInt 1n 应返回 false', () => {
  return Buffer.isEncoding(1n) === false;
});

test('Date 对象应返回 false', () => {
  return Buffer.isEncoding(new Date()) === false;
});

test('RegExp 对象应返回 false', () => {
  return Buffer.isEncoding(/utf8/) === false;
});

test('Buffer 对象应返回 false', () => {
  return Buffer.isEncoding(Buffer.from('utf8')) === false;
});

test('Uint8Array 应返回 false', () => {
  return Buffer.isEncoding(new Uint8Array([1, 2, 3])) === false;
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
