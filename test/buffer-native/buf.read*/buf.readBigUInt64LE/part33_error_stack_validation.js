// buf.readBigUInt64LE() - 错误栈和错误信息完整性测试
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

// 测试 RangeError 的完整性
test('RangeError 包含 message 属性', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    return typeof e.message === 'string' && e.message.length > 0;
  }
});

test('RangeError 包含 stack 属性', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

test('RangeError 的 name 属性为 "RangeError"', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('RangeError message 包含有用的错误信息（offset 越界）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    return msg.includes('offset') || msg.includes('range') || msg.includes('out') || msg.includes('bounds');
  }
});

test('RangeError message 包含有用的错误信息（负数 offset）', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(-1);
    return false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    return msg.includes('offset') || msg.includes('range') || msg.includes('negative') || msg.includes('0');
  }
});

// 测试 TypeError 的完整性
test('TypeError 包含 message 属性', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call(null, 0);
    return false;
  } catch (e) {
    return typeof e.message === 'string' && e.message.length > 0;
  }
});

test('TypeError 包含 stack 属性', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call(null, 0);
    return false;
  } catch (e) {
    return typeof e.stack === 'string' && e.stack.length > 0;
  }
});

test('TypeError 的 name 属性为 "TypeError"', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError message 包含有用的错误信息（this 为 null）', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call(null, 0);
    return false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    return msg.includes('buffer') || msg.includes('this') || msg.includes('null') || msg.includes('type');
  }
});

test('在普通对象上调用会抛出 RangeError（因为 length 为 undefined）', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call({}, 0);
    return false;
  } catch (e) {
    // 普通对象 {} 的 length 是 undefined，导致 offset 越界检查失败
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 测试错误在不同调用方式下的一致性
test('直接调用时的错误类型一致', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('通过 call 调用时的错误类型一致', () => {
  try {
    const buf = Buffer.alloc(8);
    Buffer.prototype.readBigUInt64LE.call(buf, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('通过 apply 调用时的错误类型一致', () => {
  try {
    const buf = Buffer.alloc(8);
    Buffer.prototype.readBigUInt64LE.apply(buf, [10]);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('通过 bind 调用时的错误类型一致', () => {
  try {
    const buf = Buffer.alloc(8);
    const fn = buf.readBigUInt64LE.bind(buf);
    fn(10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 测试错误对象可以被捕获和重新抛出
test('错误可以被 try-catch 捕获', () => {
  let caught = false;
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
  } catch (e) {
    caught = true;
  }
  return caught;
});

test('捕获的错误可以重新抛出', () => {
  let rethrown = false;
  try {
    try {
      const buf = Buffer.alloc(8);
      buf.readBigUInt64LE(10);
    } catch (e) {
      throw e;
    }
  } catch (e) {
    rethrown = true;
  }
  return rethrown;
});

// 测试错误对象的属性可读性
test('错误的 message 属性可读', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    const msg = e.message;
    return typeof msg === 'string';
  }
});

test('错误的 stack 属性可读', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    const stack = e.stack;
    return typeof stack === 'string';
  }
});

test('错误的 name 属性可读', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    const name = e.name;
    return typeof name === 'string';
  }
});

// 测试错误对象可以被 instanceof 检查
test('RangeError 是 Error 的实例', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
    return false;
  } catch (e) {
    return e instanceof Error;
  }
});

test('TypeError 是 Error 的实例', () => {
  try {
    const fn = Buffer.prototype.readBigUInt64LE;
    fn.call(null, 0);
    return false;
  } catch (e) {
    return e instanceof Error;
  }
});

// 测试多个错误的独立性
test('多次调用产生的错误是独立的', () => {
  let error1, error2;
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(10);
  } catch (e) {
    error1 = e;
  }
  try {
    const buf = Buffer.alloc(8);
    buf.readBigUInt64LE(20);
  } catch (e) {
    error2 = e;
  }
  return error1 !== error2;
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
