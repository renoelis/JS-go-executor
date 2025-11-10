// buf.readBigInt64LE() - this 上下文绑定测试
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

// 正常 this 绑定
test('正常 this 绑定调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  return buf.readBigInt64LE(0) === 100n;
});

// call 方法调用
test('使用 call 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(200n, 0);
  const result = buf.readBigInt64LE.call(buf, 0);
  return result === 200n;
});

// apply 方法调用
test('使用 apply 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(300n, 0);
  const result = buf.readBigInt64LE.apply(buf, [0]);
  return result === 300n;
});

// bind 方法调用
test('使用 bind 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(400n, 0);
  const bound = buf.readBigInt64LE.bind(buf);
  return bound(0) === 400n;
});

// bind 到不同的 Buffer
test('bind 到不同的 Buffer', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigInt64LE(111n, 0);
  buf2.writeBigInt64LE(222n, 0);
  
  const readFromBuf2 = buf1.readBigInt64LE.bind(buf2);
  return readFromBuf2(0) === 222n;
});

// 错误的 this 绑定 - 非 Buffer 对象
test('this 绑定到非 Buffer 对象应抛出错误', () => {
  try {
    const notBuffer = { length: 8 };
    Buffer.prototype.readBigInt64LE.call(notBuffer, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// this 绑定到 null
test('this 绑定到 null 应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64LE.call(null, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// this 绑定到 undefined
test('this 绑定到 undefined 应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64LE.call(undefined, 0);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// this 绑定到普通对象
test('this 绑定到普通对象应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64LE.call({}, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// this 绑定到数组
test('this 绑定到数组应抛出错误', () => {
  try {
    Buffer.prototype.readBigInt64LE.call([], 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError' || e.name === 'TypeError';
  }
});

// this 绑定到 Uint8Array（实际上是允许的）
test('this 绑定到 Uint8Array 可以工作', () => {
  const arr = new Uint8Array(8);
  const view = new DataView(arr.buffer);
  view.setBigInt64(0, 100n, true); // Little-Endian
  const result = Buffer.prototype.readBigInt64LE.call(arr, 0);
  return result === 100n;
});

// 箭头函数中的 this
test('箭头函数中调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(500n, 0);
  const arrow = () => buf.readBigInt64LE(0);
  return arrow() === 500n;
});

// 对象方法中的 this
test('对象方法中调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(600n, 0);
  
  const obj = {
    buffer: buf,
    read: function() {
      return this.buffer.readBigInt64LE(0);
    }
  };
  
  return obj.read() === 600n;
});

// 解构赋值后调用
test('解构赋值后调用需要绑定 this', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(700n, 0);
  
  const { readBigInt64LE } = buf;
  const result = readBigInt64LE.call(buf, 0);
  return result === 700n;
});

// 多次 bind
test('多次 bind 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(800n, 0);
  
  const bound1 = buf.readBigInt64LE.bind(buf);
  const bound2 = bound1.bind(buf);
  return bound2(0) === 800n;
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
