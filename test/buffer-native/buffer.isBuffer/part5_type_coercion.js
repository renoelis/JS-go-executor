// Buffer.isBuffer() - 类型转换与原型链测试
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

// 数字包装对象测试
test('Number 包装对象返回 false', () => {
  return Buffer.isBuffer(new Number(123)) === false;
});

test('String 包装对象返回 false', () => {
  return Buffer.isBuffer(new String('hello')) === false;
});

test('Boolean 包装对象返回 false', () => {
  return Buffer.isBuffer(new Boolean(true)) === false;
});

// 模拟 Buffer 对象测试
test('手动创建的类 Buffer 对象返回 false', () => {
  const fakeBuf = {
    length: 10,
    byteLength: 10,
    byteOffset: 0,
    buffer: new ArrayBuffer(10),
    slice: function() {},
    toString: function() {}
  };
  return Buffer.isBuffer(fakeBuf) === false;
});

test('继承 Uint8Array 的自定义类实例返回 false', () => {
  class CustomArray extends Uint8Array {}
  const custom = new CustomArray(5);
  return Buffer.isBuffer(custom) === false;
});

// 类型转换场景测试
test('字符串转 Buffer 后返回 true', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return Buffer.isBuffer(buf) === true;
});

test('数组转 Buffer 后返回 true', () => {
  const arr = [72, 101, 108, 108, 111];
  const buf = Buffer.from(arr);
  return Buffer.isBuffer(buf) === true;
});

test('ArrayBuffer 转 Buffer 后返回 true', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return Buffer.isBuffer(buf) === true;
});

// 对象到 Buffer 的转换失败场景
test('尝试从对象创建 Buffer 会抛错，但原对象不是 Buffer', () => {
  const obj = { a: 1, b: 2 };
  try {
    Buffer.from(obj);
  } catch (e) {
    // 预期抛错
  }
  return Buffer.isBuffer(obj) === false;
});

// toString 和 valueOf 测试
test('重写 toString 的对象返回 false', () => {
  const obj = {
    toString: () => 'hello'
  };
  return Buffer.isBuffer(obj) === false;
});

test('重写 valueOf 的对象返回 false', () => {
  const obj = {
    valueOf: () => 123
  };
  return Buffer.isBuffer(obj) === false;
});

test('同时重写 toString 和 valueOf 的对象返回 false', () => {
  const obj = {
    toString: () => 'hello',
    valueOf: () => [1, 2, 3]
  };
  return Buffer.isBuffer(obj) === false;
});

// Symbol.toStringTag 测试
test('自定义 Symbol.toStringTag 的对象返回 false', () => {
  const obj = {};
  obj[Symbol.toStringTag] = 'Buffer';
  return Buffer.isBuffer(obj) === false;
});

test('实际 Buffer 的 Symbol.toStringTag', () => {
  const buf = Buffer.from('hello');
  const tag = buf[Symbol.toStringTag];
  return Buffer.isBuffer(buf) === true && (tag === 'Uint8Array' || tag === 'Buffer');
});

// 可迭代对象测试
test('实现迭代器的对象返回 false', () => {
  const iterable = {
    [Symbol.iterator]: function* () {
      yield 1;
      yield 2;
      yield 3;
    }
  };
  return Buffer.isBuffer(iterable) === false;
});

test('Generator 函数返回 false', () => {
  function* gen() {
    yield 1;
    yield 2;
  }
  return Buffer.isBuffer(gen) === false;
});

test('Generator 对象返回 false', () => {
  function* gen() {
    yield 1;
    yield 2;
  }
  const genObj = gen();
  return Buffer.isBuffer(genObj) === false;
});

// 数组方法调用测试
test('对 Buffer 使用 Array.isArray 返回 false', () => {
  const buf = Buffer.from('hello');
  return Array.isArray(buf) === false && Buffer.isBuffer(buf) === true;
});

test('对数组使用 Buffer.isBuffer 返回 false', () => {
  const arr = [1, 2, 3];
  return Buffer.isBuffer(arr) === false && Array.isArray(arr) === true;
});

// 特殊值的包装测试
test('包装 NaN 的对象返回 false', () => {
  const obj = { value: NaN };
  return Buffer.isBuffer(obj) === false;
});

test('包装 Infinity 的对象返回 false', () => {
  const obj = { value: Infinity };
  return Buffer.isBuffer(obj) === false;
});

test('包装 undefined 的对象返回 false', () => {
  const obj = { value: undefined };
  return Buffer.isBuffer(obj) === false;
});

test('包装 null 的对象返回 false', () => {
  const obj = { value: null };
  return Buffer.isBuffer(obj) === false;
});

// 原型修改场景（通过实例行为验证，不直接访问原型）
test('Buffer 实例添加自定义方法后仍返回 true', () => {
  const buf = Buffer.from('hello');
  buf.customMethod = function() { return 'custom'; };
  return Buffer.isBuffer(buf) === true;
});

test('Buffer 实例添加数字索引后仍返回 true', () => {
  const buf = Buffer.from('hello');
  buf[100] = 255;
  return Buffer.isBuffer(buf) === true;
});

// 类型判断组合测试
test('Buffer 不是普通对象', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true && typeof buf === 'object';
});

test('Buffer 不是函数', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true && typeof buf !== 'function';
});

test('Buffer 不是字符串', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true && typeof buf !== 'string';
});

test('Buffer 不是数字', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true && typeof buf !== 'number';
});

// 复杂嵌套场景
test('对象中的 Buffer 属性是 Buffer', () => {
  const buf = Buffer.from('hello');
  const obj = { data: buf };
  return Buffer.isBuffer(obj) === false && Buffer.isBuffer(obj.data) === true;
});

test('Map 中的 Buffer 值是 Buffer', () => {
  const buf = Buffer.from('hello');
  const map = new Map([['key', buf]]);
  return Buffer.isBuffer(map) === false && Buffer.isBuffer(map.get('key')) === true;
});

test('Set 中的 Buffer 元素是 Buffer', () => {
  const buf = Buffer.from('hello');
  const set = new Set([buf]);
  const first = set.values().next().value;
  return Buffer.isBuffer(set) === false && Buffer.isBuffer(first) === true;
});

// 与 instanceof 的区别测试
test('Buffer.isBuffer 与 instanceof Uint8Array 的区别', () => {
  const buf = Buffer.from('hello');
  const u8 = new Uint8Array(5);
  return Buffer.isBuffer(buf) === true &&
         Buffer.isBuffer(u8) === false &&
         buf instanceof Uint8Array === true &&
         u8 instanceof Uint8Array === true;
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
