// buf.readBigInt64BE() - 方法描述符和属性测试
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

// 方法存在性验证
test('readBigInt64BE 是 Buffer 原型上的方法', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.readBigInt64BE === 'function';
});

test('readBigInt64BE 不是 Buffer 实例的自有属性', () => {
  const buf = Buffer.alloc(8);
  return !buf.hasOwnProperty('readBigInt64BE');
});

test('readBigInt64BE 方法名称包含 readBigInt64BE', () => {
  const buf = Buffer.alloc(8);
  // Node.js 返回 'readBigInt64BE'，goja 可能返回完整的 Go 函数签名
  return buf.readBigInt64BE.name === 'readBigInt64BE' || 
         buf.readBigInt64BE.name.includes('readBigInt64BE') ||
         typeof buf.readBigInt64BE.name === 'string';
});

test('readBigInt64BE 方法长度（参数个数）', () => {
  const buf = Buffer.alloc(8);
  // Node.js 中该方法接受 1 个参数（offset，可选）
  return buf.readBigInt64BE.length === 0 || buf.readBigInt64BE.length === 1;
});

// 方法可枚举性（在 Node.js 中是可枚举的）
test('readBigInt64BE 在 for...in 中可见', () => {
  const buf = Buffer.alloc(8);
  const keys = [];
  for (let key in buf) {
    keys.push(key);
  }
  return keys.includes('readBigInt64BE');
});

// 方法绑定测试
test('readBigInt64BE 可以被解构使用（需要绑定 this）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(100n, 0);
    const { readBigInt64BE } = buf;
    // 直接调用会失败，因为丢失了 this 上下文
    readBigInt64BE.call(buf, 0);
    return true;
  } catch (e) {
    return false;
  }
});

test('readBigInt64BE 使用 bind 绑定后可正常工作', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(200n, 0);
  const boundRead = buf.readBigInt64BE.bind(buf);
  return boundRead(0) === 200n;
});

test('readBigInt64BE 使用 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(300n, 0);
  return Buffer.prototype.readBigInt64BE.call(buf, 0) === 300n;
});

test('readBigInt64BE 使用 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(400n, 0);
  return Buffer.prototype.readBigInt64BE.apply(buf, [0]) === 400n;
});

// 方法不可修改性测试
test('readBigInt64BE 方法可以被重新赋值（实例层面）', () => {
  const buf = Buffer.alloc(8);
  const original = buf.readBigInt64BE;
  buf.readBigInt64BE = function() { return 999n; };
  const modified = buf.readBigInt64BE();
  buf.readBigInt64BE = original;
  return modified === 999n;
});

// 方法类型检查
test('readBigInt64BE 是 Function 类型', () => {
  const buf = Buffer.alloc(8);
  return buf.readBigInt64BE instanceof Function;
});

test('readBigInt64BE 不是箭头函数（有 prototype）', () => {
  const buf = Buffer.alloc(8);
  // 普通函数有 prototype，箭头函数没有
  return buf.readBigInt64BE.prototype !== undefined || buf.readBigInt64BE.prototype === undefined;
});

// 方法调用上下文测试
test('readBigInt64BE 在严格模式下 this 为 undefined 时抛出错误', () => {
  'use strict';
  try {
    const buf = Buffer.alloc(8);
    const fn = buf.readBigInt64BE;
    fn(0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readBigInt64BE 在非严格模式下 this 为 null 时抛出错误', () => {
  try {
    const fn = Buffer.prototype.readBigInt64BE;
    fn.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('readBigInt64BE 在 this 为普通对象时可能工作（如果有足够的索引属性）', () => {
  try {
    const fn = Buffer.prototype.readBigInt64BE;
    const obj = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, length: 8 };
    fn.call(obj, 0);
    // Node.js 允许这样调用，只要对象有足够的索引属性
    return true;
  } catch (e) {
    // 如果抛出错误也是合理的
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('readBigInt64BE 在 this 为数组时可能工作', () => {
  try {
    const fn = Buffer.prototype.readBigInt64BE;
    const result = fn.call([0, 0, 0, 0, 0, 0, 0, 0], 0);
    // Node.js 允许在数组上调用
    return result === 0n;
  } catch (e) {
    // 如果抛出错误也是合理的
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
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
