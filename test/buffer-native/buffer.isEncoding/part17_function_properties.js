// Buffer.isEncoding - part17: 函数属性与深度API验证
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

// 函数属性验证
test('Buffer.isEncoding 应该是函数', () => {
  return typeof Buffer.isEncoding === 'function';
});

test('Buffer.isEncoding.length 应该为 1', () => {
  return Buffer.isEncoding.length === 1;
});

test('Buffer.isEncoding.name 应该为 "isEncoding"', () => {
  return Buffer.isEncoding.name === 'isEncoding';
});

test('Buffer.isEncoding 不应该是箭头函数', () => {
  const funcStr = Buffer.isEncoding.toString();
  return !funcStr.includes('=>') && funcStr.includes('function');
});

// 函数调用方式验证
test('直接调用 Buffer.isEncoding', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('通过 call 调用', () => {
  return Buffer.isEncoding.call(null, 'utf8') === true;
});

test('通过 apply 调用', () => {
  return Buffer.isEncoding.apply(null, ['utf8']) === true;
});

test('通过 bind 调用', () => {
  const bound = Buffer.isEncoding.bind(null);
  return bound('utf8') === true;
});

// 参数传递验证
test('传入多个参数时只使用第一个', () => {
  return Buffer.isEncoding('utf8', 'extra', 'args') === true;
});

test('传入多个参数但第一个无效', () => {
  return Buffer.isEncoding('invalid', 'utf8') === false;
});

// Symbol 类型深度测试
test('Symbol.for 创建的 Symbol', () => {
  return Buffer.isEncoding(Symbol.for('utf8')) === false;
});

test('Symbol.iterator', () => {
  return Buffer.isEncoding(Symbol.iterator) === false;
});

test('Symbol.toPrimitive', () => {
  return Buffer.isEncoding(Symbol.toPrimitive) === false;
});

// 对象类型转换验证 (Buffer.isEncoding 不进行隐式转换)
test('自定义 toString 的对象应返回 false', () => {
  const obj = {
    toString: () => 'utf8'
  };
  return Buffer.isEncoding(obj) === false;
});

test('自定义 valueOf 的对象应返回 false', () => {
  const obj = {
    valueOf: () => 'utf8'
  };
  return Buffer.isEncoding(obj) === false;
});

test('同时有 toString 和 valueOf 的对象应返回 false', () => {
  const obj = {
    toString: () => 'utf8',
    valueOf: () => 'hex'
  };
  return Buffer.isEncoding(obj) === false;
});

test('toString 抛异常的对象应返回 false', () => {
  const obj = {
    toString: () => {
      throw new Error('toString error');
    }
  };
  return Buffer.isEncoding(obj) === false;
});

// 特殊数值验证
test('Number.MAX_SAFE_INTEGER', () => {
  return Buffer.isEncoding(Number.MAX_SAFE_INTEGER) === false;
});

test('Number.MIN_SAFE_INTEGER', () => {
  return Buffer.isEncoding(Number.MIN_SAFE_INTEGER) === false;
});

test('Number.MAX_VALUE', () => {
  return Buffer.isEncoding(Number.MAX_VALUE) === false;
});

test('Number.MIN_VALUE', () => {
  return Buffer.isEncoding(Number.MIN_VALUE) === false;
});

test('Number.POSITIVE_INFINITY', () => {
  return Buffer.isEncoding(Number.POSITIVE_INFINITY) === false;
});

test('Number.NEGATIVE_INFINITY', () => {
  return Buffer.isEncoding(Number.NEGATIVE_INFINITY) === false;
});

test('Number.EPSILON', () => {
  return Buffer.isEncoding(Number.EPSILON) === false;
});

// 特殊字符串验证
test('包含 null 字符的字符串', () => {
  return Buffer.isEncoding('utf8\0extra') === false;
});

test('包含控制字符的字符串', () => {
  return Buffer.isEncoding('utf8\x01\x02') === false;
});

test('包含高位 Unicode 字符的字符串', () => {
  return Buffer.isEncoding('utf8🚀') === false;
});

// 数组和类数组对象
test('空数组转为空字符串', () => {
  return Buffer.isEncoding([]) === false;
});

test('数组元素连接', () => {
  return Buffer.isEncoding(['u', 't', 'f', '8']) === false;
});

test('类数组对象', () => {
  const arrayLike = { 0: 'u', 1: 't', 2: 'f', 3: '8', length: 4 };
  return Buffer.isEncoding(arrayLike) === false;
});

// 原型链操作
test('String 对象包装器应返回 false', () => {
  const str = new String('utf8');
  return Buffer.isEncoding(str) === false;
});

// 正则表达式
test('正则转字符串', () => {
  return Buffer.isEncoding(/utf8/) === false;
});

test('正则 source 属性类似编码名', () => {
  const regex = /utf8/g;
  return Buffer.isEncoding(regex) === false;
});

// 函数转字符串
test('函数转字符串包含编码名', () => {
  function utf8() {}
  return Buffer.isEncoding(utf8) === false;
});

test('函数 name 属性是编码名', () => {
  const func = function utf8() {};
  return Buffer.isEncoding(func) === false;
});

// 错误对象
test('Error 对象转字符串', () => {
  const error = new Error('utf8');
  return Buffer.isEncoding(error) === false;
});

test('TypeError 对象', () => {
  const error = new TypeError('utf8');
  return Buffer.isEncoding(error) === false;
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
