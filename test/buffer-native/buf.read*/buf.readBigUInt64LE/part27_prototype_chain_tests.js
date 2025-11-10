// buf.readBigUInt64LE() - 原型链和继承测试
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

// 方法存在于原型链上
test('readBigUInt64LE 存在于 Buffer.prototype', () => {
  return 'readBigUInt64LE' in Buffer.prototype;
});

test('Buffer 实例可以访问 readBigUInt64LE', () => {
  const buf = Buffer.alloc(8);
  return 'readBigUInt64LE' in buf;
});

test('readBigUInt64LE 是从原型继承的', () => {
  const buf = Buffer.alloc(8);
  return buf.hasOwnProperty('readBigUInt64LE') === false;
});

// 方法可以通过原型调用
test('通过 Buffer.prototype 调用 readBigUInt64LE', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(12345n, 0);
  const result = Buffer.prototype.readBigUInt64LE.call(buf, 0);
  return result === 12345n;
});

test('通过 Buffer.prototype 使用 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(67890n, 0);
  const result = Buffer.prototype.readBigUInt64LE.apply(buf, [0]);
  return result === 67890n;
});

// 别名方法也在原型上
test('readBigUint64LE 别名存在于 Buffer.prototype', () => {
  return 'readBigUint64LE' in Buffer.prototype;
});

test('readBigUint64LE 和 readBigUInt64LE 都可用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(999n, 0);
  return buf.readBigUint64LE(0) === 999n && buf.readBigUInt64LE(0) === 999n;
});

// 方法不会被实例属性遮蔽
test('实例上添加同名属性不影响原型方法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(111n, 0);
  const originalResult = buf.readBigUInt64LE(0);
  buf.customProp = 'test';
  const afterResult = buf.readBigUInt64LE(0);
  return originalResult === 111n && afterResult === 111n;
});

// 方法的 this 绑定
test('readBigUInt64LE 需要正确的 this 绑定', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(222n, 0);
    const fn = buf.readBigUInt64LE;
    fn.call(buf, 0);
    return true;
  } catch (e) {
    return false;
  }
});

test('readBigUInt64LE 在错误的 this 上调用会失败', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readBigUInt64LE 在 null this 上调用会失败', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readBigUInt64LE 在 undefined this 上调用会失败', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 方法在不同类型的类数组对象上的行为
test('readBigUInt64LE 在类数组对象上可以调用', () => {
  try {
    const obj = { length: 8, 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    const result = Buffer.prototype.readBigUInt64LE.call(obj, 0);
    return typeof result === 'bigint';
  } catch (e) {
    return false;
  }
});

test('readBigUInt64LE 在数组上可以调用', () => {
  try {
    const arr = [0, 0, 0, 0, 0, 0, 0, 0];
    const result = Buffer.prototype.readBigUInt64LE.call(arr, 0);
    return typeof result === 'bigint';
  } catch (e) {
    return false;
  }
});

// Uint8Array 与 Buffer 的关系
test('Buffer 实例也是 Uint8Array', () => {
  const buf = Buffer.alloc(8);
  return buf instanceof Uint8Array;
});

test('readBigUInt64LE 可以在 Buffer 上调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(333n, 0);
  return typeof buf.readBigUInt64LE === 'function' && buf.readBigUInt64LE(0) === 333n;
});

// 方法的函数属性
test('readBigUInt64LE 是一个函数', () => {
  return typeof Buffer.prototype.readBigUInt64LE === 'function';
});

test('readBigUInt64LE 有 name 属性', () => {
  const name = Buffer.prototype.readBigUInt64LE.name;
  return typeof name === 'string';
});

test('readBigUInt64LE 有 length 属性', () => {
  const len = Buffer.prototype.readBigUInt64LE.length;
  return typeof len === 'number' && len >= 0 && len <= 1;
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
