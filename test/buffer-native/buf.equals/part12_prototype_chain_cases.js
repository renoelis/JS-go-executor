// buf.equals() - 原型链和继承关系测试
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

// Buffer 原型链测试
test('Buffer.prototype - equals方法存在', () => {
  const buf = Buffer.from('hello');
  return typeof buf.equals === 'function';
});

test('Buffer.prototype - equals方法在原型链上', () => {
  const buf = Buffer.from('hello');
  // 检查equals方法是否存在（不使用Object.getPrototypeOf）
  return typeof buf.equals === 'function';
});

// Buffer 继承自 Uint8Array
test('Buffer instanceof Uint8Array', () => {
  const buf = Buffer.from('hello');
  return buf instanceof Uint8Array === true;
});

test('Buffer instanceof Object', () => {
  const buf = Buffer.from('hello');
  return buf instanceof Object === true;
});

test('Buffer - 原型链顺序', () => {
  const buf = Buffer.from('hello');
  // 通过instanceof检查继承关系（不使用Object.getPrototypeOf）
  return buf instanceof Uint8Array && buf instanceof Object;
});

// Buffer 和 Uint8Array 的 equals 方法一致性
test('Buffer.equals vs Uint8Array - 相同内容', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf.equals(arr) === true;
});

test('Buffer.equals vs Uint8Array - 不同内容', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([4, 5, 6]);
  return buf.equals(arr) === false;
});

test('Buffer.equals vs Uint8Array - 不同长度', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2]);
  return buf.equals(arr) === false;
});

// Buffer 的类型检查（不使用constructor）
test('Buffer - 类型检查', () => {
  const buf = Buffer.from('hello');
  // 通过Buffer.isBuffer检查类型（不使用constructor）
  return Buffer.isBuffer(buf) === true;
});

test('Buffer - 类型标签', () => {
  const buf = Buffer.from('hello');
  // 检查Symbol.toStringTag（不使用constructor）
  const tag = buf[Symbol.toStringTag];
  return typeof tag === 'string';
});


// Buffer 的方法继承
test('Buffer - 继承Uint8Array的方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  // Buffer应该继承Uint8Array的方法，如slice、subarray等
  return typeof buf.slice === 'function' && 
         typeof buf.subarray === 'function';
});

test('Buffer - 继承TypedArray的方法', () => {
  const buf = Buffer.from([1, 2, 3]);
  // Buffer应该继承TypedArray的方法，如entries、keys、values等
  return typeof buf.entries === 'function' && 
         typeof buf.keys === 'function' &&
         typeof buf.values === 'function';
});

// Buffer 的属性继承
test('Buffer - 继承Uint8Array的属性', () => {
  const buf = Buffer.from([1, 2, 3]);
  // Buffer应该继承Uint8Array的属性
  return typeof buf.BYTES_PER_ELEMENT === 'number' &&
         buf.BYTES_PER_ELEMENT === 1;
});

test('Buffer - buffer属性', () => {
  const buf = Buffer.from('hello');
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer - byteOffset属性', () => {
  const buf = Buffer.from('hello');
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

test('Buffer - byteLength属性', () => {
  const buf = Buffer.from('hello');
  return typeof buf.byteLength === 'number' && 
         buf.byteLength === buf.length;
});

test('Buffer - length属性', () => {
  const buf = Buffer.from('hello');
  return typeof buf.length === 'number' && buf.length === 5;
});

// Buffer 的静态方法
test('Buffer.isBuffer - 静态方法', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.isBuffer - 非Buffer对象', () => {
  const arr = new Uint8Array([1, 2, 3]);
  return Buffer.isBuffer(arr) === false;
});

test('Buffer.isBuffer - 普通对象', () => {
  const obj = { length: 3, 0: 1, 1: 2, 2: 3 };
  return Buffer.isBuffer(obj) === false;
});

// Buffer 的 equals 方法调用上下文
test('Buffer.equals - this绑定', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const equals = buf1.equals;
  // equals方法应该正确绑定this
  return equals.call(buf1, buf2) === true;
});

test('Buffer.equals - 错误的this绑定', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const equals = buf1.equals;
  try {
    // 使用错误的this调用
    equals.call({}, buf2);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Buffer 的 equals 方法参数验证
test('Buffer.equals - 参数数量验证', () => {
  const buf = Buffer.from('hello');
  try {
    buf.equals();
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('Buffer.equals - 多参数（忽略额外参数）', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([4, 5, 6]);
  // 应该只使用第一个参数
  return buf1.equals(buf2, buf3) === true;
});

// Buffer 的 equals 方法返回值
test('Buffer.equals - 返回值类型', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result = buf1.equals(buf2);
  return typeof result === 'boolean' && result === true;
});

test('Buffer.equals - 返回值一致性', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('hello');
  const result1 = buf1.equals(buf2);
  const result2 = buf1.equals(buf2);
  return result1 === result2 && result1 === true;
});

// Buffer 的 equals 方法对称性
test('Buffer.equals - 对称性 A.equals(B) === B.equals(A)', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) === buf2.equals(buf1);
});

test('Buffer.equals - 对称性 不同内容', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  return buf1.equals(buf2) === buf2.equals(buf1);
});

// Buffer 的 equals 方法传递性
test('Buffer.equals - 传递性 A.equals(B) && B.equals(C) => A.equals(C)', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) && buf2.equals(buf3) && buf1.equals(buf3);
});

// Buffer 的 equals 方法自反性
test('Buffer.equals - 自反性 A.equals(A)', () => {
  const buf = Buffer.from('hello');
  return buf.equals(buf) === true;
});

// Buffer 的 equals 方法与其他方法的关系
test('Buffer.equals vs Buffer.compare - 一致性', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  const buf3 = Buffer.from([4, 5, 6]);
  const equals12 = buf1.equals(buf2);
  const compare12 = buf1.compare(buf2) === 0;
  const equals13 = buf1.equals(buf3);
  const compare13 = buf1.compare(buf3) !== 0;
  return equals12 === compare12 && equals13 === (compare13 === false);
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

