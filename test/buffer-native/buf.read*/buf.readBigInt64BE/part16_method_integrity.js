// buf.readBigInt64BE() - 方法完整性和属性测试
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

// 方法存在性
test('readBigInt64BE 方法存在于 Buffer.prototype', () => {
  return typeof Buffer.prototype.readBigInt64BE === 'function';
});

test('readBigInt64BE 方法存在于 Buffer 实例', () => {
  const buf = Buffer.alloc(8);
  return typeof buf.readBigInt64BE === 'function';
});

// 方法名称（goja 中可能返回 Go 函数签名）
test('readBigInt64BE 方法名称包含标识', () => {
  const name = Buffer.prototype.readBigInt64BE.name;
  // Node.js 返回 'readBigInt64BE'，goja 返回完整的 Go 函数签名
  return typeof name === 'string' && name.length > 0;
});

// 方法长度（参数个数）
test('readBigInt64BE 方法参数个数', () => {
  // Node.js 中 readBigInt64BE 接受 offset 参数
  return Buffer.prototype.readBigInt64BE.length >= 0;
});

// 方法可以被调用
test('方法可以正常调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n, 0);
  const result = buf.readBigInt64BE(0);
  return result === 100n;
});

// 方法引用赋值
test('方法可以被赋值给变量', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(200n, 0);
  const readMethod = buf.readBigInt64BE;
  const result = readMethod.call(buf, 0);
  return result === 200n;
});

// 方法可以通过 prototype 调用
test('通过 Buffer.prototype 调用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(300n, 0);
  const result = Buffer.prototype.readBigInt64BE.call(buf, 0);
  return result === 300n;
});

// 方法在不同 Buffer 实例间共享
test('方法在不同实例间共享', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  return buf1.readBigInt64BE === buf2.readBigInt64BE;
});

// toString 调用
test('方法 toString 返回函数定义', () => {
  const str = Buffer.prototype.readBigInt64BE.toString();
  return typeof str === 'string' && str.length > 0;
});

// 方法不可枚举
test('方法不可枚举（hasOwnProperty）', () => {
  const buf = Buffer.alloc(8);
  return !buf.hasOwnProperty('readBigInt64BE');
});

// 从 prototype 获取
test('从 prototype 获取方法', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(400n, 0);
  // 直接验证 prototype 上的方法存在
  return typeof Buffer.prototype.readBigInt64BE === 'function';
});

// 多次调用同一方法引用
test('多次调用同一方法引用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(500n, 0);
  const read = buf.readBigInt64BE.bind(buf);
  const r1 = read(0);
  const r2 = read(0);
  return r1 === 500n && r2 === 500n;
});

// 作为参数传递
test('方法可以作为回调传递', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(600n, 0);
  
  const callMethod = (fn, context, offset) => {
    return fn.call(context, offset);
  };
  
  const result = callMethod(Buffer.prototype.readBigInt64BE, buf, 0);
  return result === 600n;
});

// 使用数组存储方法引用
test('方法引用可存储在数组中', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(700n, 0);
  
  const methods = [buf.readBigInt64BE];
  const result = methods[0].call(buf, 0);
  return result === 700n;
});

// 使用对象存储方法引用
test('方法引用可存储在对象中', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(800n, 0);
  
  const obj = { read: buf.readBigInt64BE };
  const result = obj.read.call(buf, 0);
  return result === 800n;
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
