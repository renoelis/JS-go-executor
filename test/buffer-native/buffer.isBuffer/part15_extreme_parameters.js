// Buffer.isBuffer() - 极端参数和边界测试
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

// 无参数调用
test('无参数调用返回 false', () => {
  return Buffer.isBuffer() === false;
});

// 多参数调用（只使用第一个）
test('多参数调用只检查第一个', () => {
  const buf = Buffer.alloc(5);
  return Buffer.isBuffer(buf, 'extra', 123, {}) === true;
});

test('多参数调用第一个非Buffer', () => {
  const buf = Buffer.alloc(5);
  return Buffer.isBuffer('not buffer', buf) === false;
});

// 循环引用对象
test('循环引用对象返回 false', () => {
  const obj = {};
  obj.self = obj;
  return Buffer.isBuffer(obj) === false;
});

test('循环引用数组返回 false', () => {
  const arr = [];
  arr.push(arr);
  return Buffer.isBuffer(arr) === false;
});

// 巨大数字参数
test('Number.MAX_SAFE_INTEGER 返回 false', () => {
  return Buffer.isBuffer(Number.MAX_SAFE_INTEGER) === false;
});

test('Number.MIN_SAFE_INTEGER 返回 false', () => {
  return Buffer.isBuffer(Number.MIN_SAFE_INTEGER) === false;
});

test('Number.MAX_VALUE 返回 false', () => {
  return Buffer.isBuffer(Number.MAX_VALUE) === false;
});

test('Number.MIN_VALUE 返回 false', () => {
  return Buffer.isBuffer(Number.MIN_VALUE) === false;
});

test('Number.EPSILON 返回 false', () => {
  return Buffer.isBuffer(Number.EPSILON) === false;
});

// 特殊数值
test('0x7FFFFFFF 返回 false', () => {
  return Buffer.isBuffer(0x7FFFFFFF) === false;
});

test('-0x80000000 返回 false', () => {
  return Buffer.isBuffer(-0x80000000) === false;
});

test('0o777 返回 false', () => {
  return Buffer.isBuffer(0o777) === false;
});

test('0b11111111 返回 false', () => {
  return Buffer.isBuffer(0b11111111) === false;
});

// 非标准数值类型
test('1n (BigInt) 返回 false', () => {
  return Buffer.isBuffer(1n) === false;
});

test('超大 BigInt 返回 false', () => {
  const bigNum = BigInt('123456789012345678901234567890');
  return Buffer.isBuffer(bigNum) === false;
});

// Symbol 类型
test('Symbol() 返回 false', () => {
  return Buffer.isBuffer(Symbol()) === false;
});

test('Symbol.for("test") 返回 false', () => {
  return Buffer.isBuffer(Symbol.for('test')) === false;
});

test('Symbol.iterator 返回 false', () => {
  return Buffer.isBuffer(Symbol.iterator) === false;
});

test('Symbol.toPrimitive 返回 false', () => {
  return Buffer.isBuffer(Symbol.toPrimitive) === false;
});

// 包装对象
test('new Boolean(true) 返回 false', () => {
  return Buffer.isBuffer(new Boolean(true)) === false;
});

test('new Number(123) 返回 false', () => {
  return Buffer.isBuffer(new Number(123)) === false;
});

test('new String("test") 返回 false', () => {
  return Buffer.isBuffer(new String('test')) === false;
});

// 奇异对象
test('document (如果存在) 返回 false', () => {
  if (typeof document !== 'undefined') {
    return Buffer.isBuffer(document) === false;
  }
  return true;
});

test('window (如果存在) 返回 false', () => {
  if (typeof window !== 'undefined') {
    return Buffer.isBuffer(window) === false;
  }
  return true;
});

test('global 对象返回 false', () => {
  if (typeof global !== 'undefined') {
    return Buffer.isBuffer(global) === false;
  }
  return true;
});

// 函数类型
test('箭头函数返回 false', () => {
  return Buffer.isBuffer(() => {}) === false;
});

test('async 函数返回 false', () => {
  return Buffer.isBuffer(async () => {}) === false;
});

test('generator 函数返回 false', () => {
  return Buffer.isBuffer(function* () {}) === false;
});

// async generator 不被 goja 支持，跳过该测试
// test('async generator 函数返回 false', () => {
//   return Buffer.isBuffer(async function* () {}) === false;
// });

// 类和构造器
test('class 构造器返回 false', () => {
  class TestClass {}
  return Buffer.isBuffer(TestClass) === false;
});

test('内置构造器返回 false', () => {
  return Buffer.isBuffer(Array) === false && 
         Buffer.isBuffer(Object) === false && 
         Buffer.isBuffer(Function) === false;
});

// 复杂嵌套对象
test('深度嵌套对象返回 false', () => {
  const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
  return Buffer.isBuffer(deep) === false;
});

test('复杂数组结构返回 false', () => {
  const complex = [[[[[1, 2, 3]]]]];
  return Buffer.isBuffer(complex) === false;
});

// 原型链操作（避免使用禁用关键词）
test('类数组对象返回 false', () => {
  const obj = { 0: 'a', 1: 'b', length: 2 };
  // 验证类数组对象不被识别为Buffer
  return Buffer.isBuffer(obj) === false && typeof obj.length === 'number';
});

// 冻结和密封对象
test('Object.freeze 对象返回 false', () => {
  const obj = Object.freeze({ test: 'value' });
  return Buffer.isBuffer(obj) === false;
});

test('Object.seal 对象返回 false', () => {
  const obj = Object.seal({ test: 'value' });
  return Buffer.isBuffer(obj) === false;
});

test('Object.preventExtensions 对象返回 false', () => {
  const obj = Object.preventExtensions({ test: 'value' });
  return Buffer.isBuffer(obj) === false;
});

// 包装对象测试（避免使用禁用词）
test('包装的 Buffer 返回正确结果', () => {
  const buf = Buffer.alloc(5);
  // 简单包装测试，避免使用禁用的 Proxy 关键词
  const wrapper = { buffer: buf, type: 'wrapped' };
  return Buffer.isBuffer(buf) === true && Buffer.isBuffer(wrapper) === false;
});

test('包装的非 Buffer 返回 false', () => {
  const arr = new Uint8Array(5);
  const wrapper = { array: arr, type: 'wrapped' };
  return Buffer.isBuffer(arr) === false && Buffer.isBuffer(wrapper) === false;
});

test('复杂包装对象测试', () => {
  const target = { length: 10, data: 'test' };
  const wrapper = { 
    target: target,
    getValue: function(prop) { return this.target[prop]; }
  };
  return Buffer.isBuffer(wrapper) === false;
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
