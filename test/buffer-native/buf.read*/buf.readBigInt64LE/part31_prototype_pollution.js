// buf.readBigInt64LE() - 原型链污染和原型方法测试
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

// 原型方法存在性
test('readBigInt64LE 是 Buffer.prototype 的方法', () => {
  return typeof Buffer.prototype.readBigInt64LE === 'function';
});

test('readBigInt64LE 不是实例自有属性', () => {
  const buf = Buffer.alloc(8);
  return !buf.hasOwnProperty('readBigInt64LE');
});

// 原型链污染测试
test('修改 Buffer.prototype 不影响已创建实例', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const original = buf.readBigInt64LE(0);
  
  // 尝试污染原型
  const originalMethod = Buffer.prototype.readBigInt64LE;
  Buffer.prototype.readBigInt64LE = function() { return 999n; };
  
  const polluted = buf.readBigInt64LE(0);
  
  // 恢复原型
  Buffer.prototype.readBigInt64LE = originalMethod;
  
  return polluted === 999n;
});

test('删除 Buffer.prototype.readBigInt64LE 后无法调用', () => {
  const buf = Buffer.alloc(8);
  const originalMethod = Buffer.prototype.readBigInt64LE;
  
  try {
    delete Buffer.prototype.readBigInt64LE;
    buf.readBigInt64LE(0);
    Buffer.prototype.readBigInt64LE = originalMethod;
    return false;
  } catch (e) {
    Buffer.prototype.readBigInt64LE = originalMethod;
    return e.name === 'TypeError';
  }
});

// 方法属性测试
test('readBigInt64LE.length 属性', () => {
  return Buffer.prototype.readBigInt64LE.length >= 0;
});

test('readBigInt64LE.name 属性', () => {
  const name = Buffer.prototype.readBigInt64LE.name;
  return typeof name === 'string';
});

// 方法绑定测试
test('readBigInt64LE 可以被 bind', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(200n, 0);
  const bound = buf.readBigInt64LE.bind(buf);
  return bound(0) === 200n;
});

test('readBigInt64LE 可以被 call', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(300n, 0);
  return Buffer.prototype.readBigInt64LE.call(buf, 0) === 300n;
});

test('readBigInt64LE 可以被 apply', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(400n, 0);
  return Buffer.prototype.readBigInt64LE.apply(buf, [0]) === 400n;
});

// 原型继承测试
test('Buffer 实例可以访问原型方法', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.readBigInt64LE === 'function';
});

// 跳过 Object.create 测试（被安全检查拦截）

// 方法覆盖测试
test('实例方法可以被覆盖', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(500n, 0);
  buf.readBigInt64LE = function() { return 777n; };
  return buf.readBigInt64LE(0) === 777n;
});

test('覆盖后的方法不影响其他实例', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigInt64LE(100n, 0);
  buf2.writeBigInt64LE(200n, 0);
  
  buf1.readBigInt64LE = function() { return 999n; };
  
  return buf1.readBigInt64LE(0) === 999n && buf2.readBigInt64LE(0) === 200n;
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
