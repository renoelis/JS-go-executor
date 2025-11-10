'use strict';

// buf.readBigInt64LE() - 严格模式测试
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

// 严格模式下正常调用
test('严格模式下正常调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  return buf.readBigInt64LE(0) === 100n;
});

// 严格模式下错误的 this 绑定
test('严格模式下错误的 this 绑定应抛出错误', () => {
  try {
    const notBuffer = {};
    Buffer.prototype.readBigInt64LE.call(notBuffer, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// 严格模式下 undefined this
test('严格模式下 undefined this 应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64LE.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 严格模式下 null this
test('严格模式下 null this 应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64LE.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 严格模式下参数验证
test('严格模式下无效 offset 应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 严格模式下越界访问
test('严格模式下越界访问应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 严格模式下类型错误
test('严格模式下类型错误应抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE('0');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 严格模式下函数内部使用
test('严格模式下函数内部使用', () => {
  function strictRead(buf, offset) {
    'use strict';
    return buf.readBigInt64LE(offset);
  }
  
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(200n, 0);
  return strictRead(buf, 0) === 200n;
});

// 严格模式下箭头函数
test('严格模式下箭头函数', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(300n, 0);
  const read = (b, o) => b.readBigInt64LE(o);
  return read(buf, 0) === 300n;
});

// 严格模式下 bind
test('严格模式下 bind', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(400n, 0);
  const bound = buf.readBigInt64LE.bind(buf);
  return bound(0) === 400n;
});

// 严格模式下 call
test('严格模式下 call', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(500n, 0);
  return buf.readBigInt64LE.call(buf, 0) === 500n;
});

// 严格模式下 apply
test('严格模式下 apply', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(600n, 0);
  return buf.readBigInt64LE.apply(buf, [0]) === 600n;
});

// 严格模式下对象方法
test('严格模式下对象方法', () => {
  const obj = {
    buffer: Buffer.alloc(8),
    read: function() {
      'use strict';
      this.buffer.writeBigInt64LE(700n, 0);
      return this.buffer.readBigInt64LE(0);
    }
  };
  return obj.read() === 700n;
});

// 严格模式下类方法
test('严格模式下类方法', () => {
  class BufferReader {
    read(buf, offset) {
      'use strict';
      return buf.readBigInt64LE(offset);
    }
  }
  
  const reader = new BufferReader();
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(800n, 0);
  return reader.read(buf, 0) === 800n;
});

// 严格模式下异常捕获
test('严格模式下异常捕获', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.readBigInt64LE(100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 严格模式下多次调用
test('严格模式下多次调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(900n, 0);
  const r1 = buf.readBigInt64LE(0);
  const r2 = buf.readBigInt64LE(0);
  const r3 = buf.readBigInt64LE(0);
  return r1 === 900n && r2 === 900n && r3 === 900n;
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
