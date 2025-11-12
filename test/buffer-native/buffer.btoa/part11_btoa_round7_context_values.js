// buffer.btoa() - Round 7: Function Context, Special Values & Error Messages
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 第7轮：函数上下文、特殊值转换和错误消息

// 函数引用和上下文测试
test('btoa函数直接引用调用', () => {
  const func = btoa;
  const result = func('test');
  return result === 'dGVzdA==';
});

test('btoa作为对象方法调用', () => {
  const obj = { encode: btoa };
  const result = obj.encode('test');
  return result === 'dGVzdA==';
});

test('btoa通过call调用', () => {
  const result = btoa.call(null, 'test');
  return result === 'dGVzdA==';
});

test('btoa通过apply调用', () => {
  const result = btoa.apply(null, ['test']);
  return result === 'dGVzdA==';
});

test('btoa通过bind调用', () => {
  const bound = btoa.bind(null);
  const result = bound('test');
  return result === 'dGVzdA==';
});

test('btoa函数length属性', () => {
  return btoa.length === 1;
});

test('btoa函数name属性', () => {
  return btoa.name === 'btoa';
});

// BigInt转换测试
test('BigInt - 小整数', () => {
  const result = btoa(123n);
  return result === 'MTIz' && atob(result) === '123';
});

test('BigInt - 大整数', () => {
  const result = btoa(9007199254740991n);
  return atob(result) === '9007199254740991';
});

test('BigInt - 负数', () => {
  const result = btoa(-456n);
  return atob(result) === '-456';
});

test('BigInt - 零', () => {
  const result = btoa(0n);
  return result === 'MA==' && atob(result) === '0';
});

// Symbol错误处理
test('Symbol - 不能隐式转换', () => {
  try {
    const sym = Symbol('test');
    btoa(sym);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Symbol - Symbol.iterator', () => {
  try {
    btoa(Symbol.iterator);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Symbol - 已注册Symbol', () => {
  try {
    const sym = Symbol.for('test');
    btoa(sym);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 函数和类作为参数
test('函数转字符串', () => {
  const func = function test() {};
  const result = btoa(func);
  const decoded = atob(result);
  return decoded.includes('function');
});

test('箭头函数转字符串', () => {
  const func = () => {};
  const result = btoa(func);
  const decoded = atob(result);
  return decoded.includes('=>') || decoded.includes('function');
});

test('类转字符串', () => {
  class TestClass {}
  const result = btoa(TestClass);
  const decoded = atob(result);
  return decoded.includes('class') || decoded.includes('TestClass');
});

// 特殊数值
test('Number.MAX_SAFE_INTEGER', () => {
  const result = btoa(Number.MAX_SAFE_INTEGER);
  return atob(result) === '9007199254740991';
});

test('Number.MIN_SAFE_INTEGER', () => {
  const result = btoa(Number.MIN_SAFE_INTEGER);
  return atob(result) === '-9007199254740991';
});

test('Number.EPSILON', () => {
  const result = btoa(Number.EPSILON);
  const decoded = atob(result);
  return decoded.includes('2.22') || decoded.includes('e-');
});

test('Number.MAX_VALUE', () => {
  const result = btoa(Number.MAX_VALUE);
  const decoded = atob(result);
  return decoded.includes('e+') || decoded.includes('1.79');
});

test('Number.MIN_VALUE', () => {
  const result = btoa(Number.MIN_VALUE);
  const decoded = atob(result);
  return decoded.includes('e-') || decoded.includes('5');
});

test('Infinity正无穷', () => {
  const result = btoa(Infinity);
  return result === 'SW5maW5pdHk=' && atob(result) === 'Infinity';
});

test('-Infinity负无穷', () => {
  const result = btoa(-Infinity);
  return atob(result) === '-Infinity';
});

test('NaN非数字', () => {
  const result = btoa(NaN);
  return result === 'TmFO' && atob(result) === 'NaN';
});

test('0和-0的区别', () => {
  const result1 = btoa(0);
  const result2 = btoa(-0);
  return result1 === result2 && result1 === 'MA==';
});

// 错误消息精确测试
test('错误消息 - U+0100字符', () => {
  try {
    btoa('\u0100');
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError' &&
           typeof e.message === 'string' &&
           e.message.length > 0;
  }
});

test('错误消息 - 中文字符', () => {
  try {
    btoa('测试');
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError' &&
           (e.message.includes('Invalid') || e.message.includes('character'));
  }
});

test('错误消息 - Emoji', () => {
  try {
    btoa('😀');
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError';
  }
});

test('错误消息 - 代理对', () => {
  try {
    btoa('\uD800\uDC00');
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError';
  }
});

test('错误有stack属性', () => {
  try {
    btoa('\u0100');
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

// 类数组对象
test('类数组对象 - arguments', () => {
  function test() {
    return btoa(arguments);
  }
  const result = test(1, 2, 3);
  return atob(result) === '[object Arguments]';
});

test('类数组对象 - 自定义', () => {
  const arrayLike = {
    0: 'a',
    1: 'b',
    2: 'c',
    length: 3
  };
  const result = btoa(arrayLike);
  return atob(result) === '[object Object]';
});

// 正则表达式
test('正则表达式转字符串', () => {
  const regex = /test/gi;
  const result = btoa(regex);
  const decoded = atob(result);
  return decoded.includes('test') && decoded.includes('g') && decoded.includes('i');
});

// 日期对象
test('Date对象 - 时间戳方式', () => {
  const timestamp = 1234567890000;
  const result = btoa(timestamp);
  return atob(result) === '1234567890000';
});

test('Date对象 - valueOf', () => {
  const date = new Date(2024, 0, 1);
  const timestamp = date.valueOf();
  const result = btoa(timestamp);
  return atob(result) === timestamp.toString();
});

// Map和Set
test('Map对象', () => {
  const map = new Map([['a', 1], ['b', 2]]);
  const result = btoa(map);
  return atob(result) === '[object Map]';
});

test('Set对象', () => {
  const set = new Set([1, 2, 3]);
  const result = btoa(set);
  return atob(result) === '[object Set]';
});

// WeakMap和WeakSet
test('WeakMap对象', () => {
  const weakMap = new WeakMap();
  const result = btoa(weakMap);
  return atob(result) === '[object WeakMap]';
});

test('WeakSet对象', () => {
  const weakSet = new WeakSet();
  const result = btoa(weakSet);
  return atob(result) === '[object WeakSet]';
});

// Error对象
test('Error对象', () => {
  const err = new Error('test error');
  const result = btoa(err);
  const decoded = atob(result);
  return decoded.includes('Error');
});

// Promise对象
test('Promise对象', () => {
  const promise = Promise.resolve('test');
  const result = btoa(promise);
  return atob(result) === '[object Promise]';
});

// TypedArray转换
test('Uint8Array对象', () => {
  const arr = new Uint8Array([1, 2, 3]);
  const result = btoa(arr);
  return atob(result) === '1,2,3';
});

test('Int16Array对象', () => {
  const arr = new Int16Array([1, 2, 3]);
  const result = btoa(arr);
  return atob(result) === '1,2,3';
});

// 特殊对象属性
test('对象with length属性', () => {
  const obj = { length: 5 };
  const result = btoa(obj);
  return atob(result) === '[object Object]';
});

test('对象with toString属性非函数', () => {
  const obj = { toString: 'not a function' };
  try {
    btoa(obj);
    return false; // 应该抛出错误
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 冻结对象
test('Object.freeze冻结对象', () => {
  const obj = { value: 'test' };
  Object.freeze(obj);
  const result = btoa(obj);
  return atob(result) === '[object Object]';
});

test('Object.seal密封对象', () => {
  const obj = { value: 'test' };
  Object.seal(obj);
  const result = btoa(obj);
  return atob(result) === '[object Object]';
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
