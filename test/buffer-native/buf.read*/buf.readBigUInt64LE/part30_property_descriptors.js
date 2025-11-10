// buf.readBigUInt64LE() - 属性描述符测试
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

// 测试方法属性
test('readBigUInt64LE 是一个函数', () => {
  return typeof Buffer.prototype.readBigUInt64LE === 'function';
});

test('readBigUInt64LE 有 name 属性', () => {
  return Buffer.prototype.readBigUInt64LE.name === 'readBigUInt64LE';
});

test('readBigUInt64LE 有 length 属性', () => {
  // 方法接受一个可选参数 offset，length 应该是 0 或 1
  const len = Buffer.prototype.readBigUInt64LE.length;
  return len === 0 || len === 1;
});

test('别名 readBigUint64LE 是一个函数', () => {
  return typeof Buffer.prototype.readBigUint64LE === 'function';
});

test('别名 readBigUint64LE 有 name 属性', () => {
  // 别名方法的 name 可能是 'readBigUint64LE' 或 'readBigUInt64LE'
  const name = Buffer.prototype.readBigUint64LE.name;
  return name === 'readBigUint64LE' || name === 'readBigUInt64LE';
});

// 测试方法可调用性
test('readBigUInt64LE 可以直接调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(123n, 0);
  return buf.readBigUInt64LE(0) === 123n;
});

test('readBigUInt64LE 可以通过 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(456n, 0);
  return Buffer.prototype.readBigUInt64LE.call(buf, 0) === 456n;
});

test('readBigUInt64LE 可以通过 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(789n, 0);
  return Buffer.prototype.readBigUInt64LE.apply(buf, [0]) === 789n;
});

test('readBigUInt64LE 可以赋值给变量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(111n, 0);
  const fn = buf.readBigUInt64LE;
  return fn.call(buf, 0) === 111n;
});

test('readBigUInt64LE 可以通过 bind 绑定', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(222n, 0);
  const fn = buf.readBigUInt64LE.bind(buf);
  return fn(0) === 222n;
});

test('readBigUInt64LE 在 Buffer 实例上存在', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.readBigUInt64LE === 'function';
});

test('readBigUInt64LE 在 Buffer.prototype 上存在', () => {
  return typeof Buffer.prototype.readBigUInt64LE === 'function';
});

// 测试方法与原型链
test('Buffer 实例的 readBigUInt64LE 来自原型', () => {
  const buf = Buffer.alloc(8);
  // 实例没有自己的 readBigUInt64LE 属性
  return !buf.hasOwnProperty('readBigUInt64LE');
});

test('多个 Buffer 实例共享同一个方法', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  // 检查方法是否来自同一个原型
  return buf1.readBigUInt64LE === buf2.readBigUInt64LE;
});

// 测试方法的不可变性
test('readBigUInt64LE 方法存在后可以被调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(333n, 0);
  const method = Buffer.prototype.readBigUInt64LE;
  return method.call(buf, 0) === 333n;
});

test('修改实例的 readBigUInt64LE 不影响原型', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(444n, 0);
  const original = Buffer.prototype.readBigUInt64LE;
  buf.readBigUInt64LE = function() { return 999n; };
  const buf2 = Buffer.alloc(8);
  buf2.writeBigUInt64LE(555n, 0);
  return buf.readBigUInt64LE() === 999n && buf2.readBigUInt64LE(0) === 555n;
});

test('删除实例的 readBigUInt64LE 后仍可使用原型方法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(666n, 0);
  buf.readBigUInt64LE = function() { return 777n; };
  delete buf.readBigUInt64LE;
  return buf.readBigUInt64LE(0) === 666n;
});

// 测试方法的 this 绑定
test('readBigUInt64LE 没有绑定 this 时在正确的对象上调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(888n, 0);
  const fn = buf.readBigUInt64LE;
  return fn.call(buf, 0) === 888n;
});

test('readBigUInt64LE bind 后可以固定 this', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(999n, 0);
  const bound = buf.readBigUInt64LE.bind(buf, 0);
  return bound() === 999n;
});

// 测试方法返回值
test('readBigUInt64LE 返回 BigInt 类型', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(1010n, 0);
  const result = buf.readBigUInt64LE(0);
  return typeof result === 'bigint';
});

test('readBigUInt64LE 返回的 BigInt 可以进行运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(100n, 0);
  const result = buf.readBigUInt64LE(0);
  return result + 50n === 150n;
});

test('readBigUInt64LE 返回的 BigInt 可以比较', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(200n, 0);
  const result = buf.readBigUInt64LE(0);
  return result > 100n && result < 300n;
});

// 测试方法的参数处理
test('readBigUInt64LE 接受 0 个参数', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(300n, 0);
  return buf.readBigUInt64LE() === 300n;
});

test('readBigUInt64LE 接受 1 个参数', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(400n, 8);
  return buf.readBigUInt64LE(8) === 400n;
});

test('readBigUInt64LE 忽略多余参数', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(500n, 0);
  return buf.readBigUInt64LE(0, 'extra', 'params', 123) === 500n;
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
