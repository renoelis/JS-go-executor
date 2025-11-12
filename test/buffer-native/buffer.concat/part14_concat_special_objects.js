// Buffer.concat() - Ultra Deep Round 2: Special Objects and Edge Cases
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

// 模拟复杂对象测试（替代Proxy测试）
test('伪装的Buffer对象应报错', () => {
  const buf = Buffer.from('test');
  const fakeBuffer = { 
    length: buf.length,
    0: buf[0], 1: buf[1], 2: buf[2], 3: buf[3],
    toString: buf.toString.bind(buf)
  };
  try {
    Buffer.concat([fakeBuffer]);
    return false;
  } catch (e) {
    return e.message.includes('TypedArray') || e.message.includes('length') ||
           e.message.includes('receiver') || e.message.includes('Buffer');
  }
});

// Getter/Setter 拦截
test('数组元素使用getter拦截', () => {
  const list = [];
  let accessCount = 0;
  Object.defineProperty(list, '0', {
    get() {
      accessCount++;
      return Buffer.from('a');
    },
    enumerable: true
  });
  list.length = 1;
  const result = Buffer.concat(list);
  // getter 会被多次调用
  return result.toString() === 'a' && accessCount >= 1;
});

// Symbol.toPrimitive 不影响 concat
test('Buffer的Symbol.toPrimitive不影响concat', () => {
  const buf = Buffer.from('test');
  buf[Symbol.toPrimitive] = () => 'modified';
  const result = Buffer.concat([buf]);
  return result.toString() === 'test' && result.length === 4;
});

// 循环引用
test('数组包含循环引用应报错', () => {
  const list = [Buffer.from('a')];
  list.push(list);
  try {
    Buffer.concat(list);
    return false;
  } catch (e) {
    return e.message.includes('Array') || e.message.includes('Uint8Array') ||
           e.message.includes('Buffer');
  }
});

// WeakMap 不影响
test('WeakMap中的Buffer仍可concat', () => {
  const wm = new WeakMap();
  const buf = Buffer.from('test');
  wm.set(buf, 'value');
  const result = Buffer.concat([buf]);
  return result.toString() === 'test';
});

// 极小小数 totalLength
test('totalLength为0.1应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], 0.1);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('totalLength为0.9应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], 0.9);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('totalLength为-0.5应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], -0.5);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range') ||
           e.message.includes('negative');
  }
});

// 数组 Symbol.iterator 被修改（不影响）
test('修改数组的Symbol.iterator不影响concat', () => {
  const list = [Buffer.from('a'), Buffer.from('b')];
  list[Symbol.iterator] = function*() {
    yield Buffer.from('x');
    yield Buffer.from('y');
  };
  const result = Buffer.concat(list);
  // concat 使用索引访问，不使用迭代器
  return result.toString() === 'ab';
});

// Promise
test('数组包含Promise应报错', () => {
  try {
    Buffer.concat([Promise.resolve(Buffer.from('test'))]);
    return false;
  } catch (e) {
    return e.message.includes('Promise') || e.message.includes('Uint8Array') ||
           e.message.includes('Buffer');
  }
});

// 修改 toString 不影响
test('修改Buffer的toString不影响concat', () => {
  const buf = Buffer.from('test');
  const originalToString = buf.toString;
  buf.toString = () => 'modified';
  const result = Buffer.concat([buf]);
  buf.toString = originalToString;
  return result.length === 4 && result[0] === 116; // 't'
});

// 类Buffer对象测试
test('类Buffer对象应报错', () => {
  const obj = { 0: 65, 1: 66, 2: 67, 3: 68, length: 4 }; // 模拟Buffer形状但不是真正的Buffer
  try {
    Buffer.concat([obj]);
    return false;
  } catch (e) {
    return e.message.includes('TypedArray') || e.message.includes('receiver') ||
           e.message.includes('Buffer') || e.message.includes('Uint8Array');
  }
});

// concat.call 和 concat.apply
test('Buffer.concat.call可以正常调用', () => {
  const result = Buffer.concat.call(null, [Buffer.from('test')]);
  return result.toString() === 'test';
});

test('Buffer.concat.apply可以正常调用', () => {
  const result = Buffer.concat.apply(null, [[Buffer.from('test')]]);
  return result.toString() === 'test';
});

test('Buffer.concat.call使用其他this不影响', () => {
  const result = Buffer.concat.call({}, [Buffer.from('test')]);
  return result.toString() === 'test';
});

// 极大值 totalLength
test('totalLength为Number.MAX_VALUE应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('allocation') ||
           e.message.includes('failed');
  }
});

test('totalLength为-Number.MAX_VALUE应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], -Number.MAX_VALUE);
    return false;
  } catch (e) {
    return e.message.includes('range') || e.message.includes('negative');
  }
});

test('totalLength为Number.MAX_SAFE_INTEGER应报错', () => {
  try {
    Buffer.concat([Buffer.from('a')], Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.message.includes('allocation') || e.message.includes('failed') ||
           e.message.includes('range');
  }
});

// concat 同一个 Buffer 多次
test('concat同一个Buffer实例多次', () => {
  const buf = Buffer.from('test');
  const result = Buffer.concat([buf, buf, buf]);
  return result.toString() === 'testtesttest' &&
         result.length === 12 &&
         result !== buf;
});

// 超大数组空 Buffer
test('连接10000个空Buffer', () => {
  const list = Array(10000).fill(Buffer.alloc(0));
  const result = Buffer.concat(list);
  return result.length === 0 && Buffer.isBuffer(result);
});

// Buffer.concat 函数属性
test('Buffer.concat.length属性为2', () => {
  return Buffer.concat.length === 2;
});

test('Buffer.concat.name属性为concat', () => {
  return Buffer.concat.name === 'concat';
});

// 零长度 + 大 totalLength
test('空Buffer数组指定大totalLength', () => {
  const list = [Buffer.alloc(0), Buffer.alloc(0)];
  const result = Buffer.concat(list, 1000);
  return result.length === 1000 && result.every(b => b === 0);
});

// 科学计数法
test('totalLength使用科学计数法1e3', () => {
  const result = Buffer.concat([Buffer.from('test')], 1e3);
  return result.length === 1000;
});

test('totalLength使用科学计数法1e-3应报错', () => {
  try {
    Buffer.concat([Buffer.from('test')], 1e-3);
    return false;
  } catch (e) {
    return e.message.includes('integer') || e.message.includes('range');
  }
});

test('totalLength使用科学计数法2.5e2', () => {
  const result = Buffer.concat([Buffer.from('test')], 2.5e2);
  return result.length === 250;
});

// JSON.stringify
test('concat结果可以JSON.stringify', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  const json = JSON.stringify(result);
  const parsed = JSON.parse(json);
  return parsed.type === 'Buffer' &&
         parsed.data[0] === 1 &&
         parsed.data[2] === 3;
});

// for...in 遍历
test('concat结果使用for...in可遍历索引和方法', () => {
  const result = Buffer.concat([Buffer.from([1, 2])]);
  const keys = [];
  for (const key in result) {
    keys.push(key);
    if (keys.length > 5) break;
  }
  return keys.includes('0') && keys.includes('1');
});

// Object.keys
test('concat结果的Object.keys返回索引', () => {
  const result = Buffer.concat([Buffer.from([1, 2, 3])]);
  const keys = Object.keys(result);
  return keys.length === 3 &&
         keys[0] === '0' &&
         keys[1] === '1' &&
         keys[2] === '2';
});

// Object.getOwnPropertyNames
test('concat结果的getOwnPropertyNames', () => {
  const result = Buffer.concat([Buffer.from([1, 2])]);
  const names = Object.getOwnPropertyNames(result);
  return names.length === 2 && names.includes('0') && names.includes('1');
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
