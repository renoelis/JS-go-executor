// buf.readBigInt64BE() - 方法调用上下文验证
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

// 正常调用
test('正常 Buffer 对象调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n, 0);
  return buf.readBigInt64BE(0) === 100n;
});

// 非 Buffer 对象调用
test('非 Buffer 对象调用（应抛出错误）', () => {
  try {
    const notBuffer = { length: 8 };
    Buffer.prototype.readBigInt64BE.call(notBuffer, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('普通对象调用（应抛出错误）', () => {
  try {
    Buffer.prototype.readBigInt64BE.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

test('null 调用（应抛出 TypeError）', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('undefined 调用（应抛出 TypeError）', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// Uint8Array 调用（Node.js 允许，因为 Buffer 继承自 Uint8Array）
test('Uint8Array 调用可以工作', () => {
  const arr = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64]);
  const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
  return result === 100n;
});

// ArrayBuffer 调用
test('ArrayBuffer 调用（应抛出错误）', () => {
  try {
    const ab = new ArrayBuffer(8);
    Buffer.prototype.readBigInt64BE.call(ab, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 数组调用（Node.js 允许，因为数组有 length 属性）
test('数组调用可以工作', () => {
  const arr = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x64];
  const result = Buffer.prototype.readBigInt64BE.call(arr, 0);
  return result === 100n;
});

// 字符串调用（应抛出错误）
test('字符串调用（应抛出错误）', () => {
  try {
    const str = '\x00\x00\x00\x00\x00\x00\x00\x64';
    Buffer.prototype.readBigInt64BE.call(str, 0);
    return false;
  } catch (e) {
    return e.name === 'SyntaxError' || e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 数字调用
test('数字调用（应抛出错误）', () => {
  try {
    Buffer.prototype.readBigInt64BE.call(12345678, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 使用 bind
test('使用 bind 绑定 Buffer', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0);
  const boundRead = buf.readBigInt64BE.bind(buf);
  return boundRead(0) === 123n;
});

test('使用 bind 绑定非 Buffer（应抛出错误）', () => {
  try {
    const notBuffer = {};
    const boundRead = Buffer.prototype.readBigInt64BE.bind(notBuffer);
    boundRead(0);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 使用 apply
test('使用 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(456n, 0);
  return Buffer.prototype.readBigInt64BE.apply(buf, [0]) === 456n;
});

test('使用 apply 调用非 Buffer（应抛出错误）', () => {
  try {
    Buffer.prototype.readBigInt64BE.apply({}, [0]);
    return false;
  } catch (e) {
    return e.name === 'TypeError' || e.name === 'RangeError';
  }
});

// 使用 call
test('使用 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(789n, 0);
  return Buffer.prototype.readBigInt64BE.call(buf, 0) === 789n;
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
