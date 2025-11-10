// 方法完整性测试
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

// readInt32BE 方法存在性测试
test('Buffer.prototype 有 readInt32BE 方法', () => {
  return typeof Buffer.prototype.readInt32BE === 'function';
});

test('Buffer实例有 readInt32BE 方法', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readInt32BE === 'function';
});

test('readInt32BE 方法 length 属性', () => {
  return Buffer.prototype.readInt32BE.length === 0 || Buffer.prototype.readInt32BE.length === 1;
});

test('readInt32BE 方法 name 属性', () => {
  return Buffer.prototype.readInt32BE.name === 'readInt32BE';
});

// readInt32LE 方法存在性测试
test('Buffer.prototype 有 readInt32LE 方法', () => {
  return typeof Buffer.prototype.readInt32LE === 'function';
});

test('Buffer实例有 readInt32LE 方法', () => {
  const buf = Buffer.alloc(4);
  return typeof buf.readInt32LE === 'function';
});

test('readInt32LE 方法 length 属性', () => {
  return Buffer.prototype.readInt32LE.length === 0 || Buffer.prototype.readInt32LE.length === 1;
});

test('readInt32LE 方法 name 属性', () => {
  return Buffer.prototype.readInt32LE.name === 'readInt32LE';
});

// 方法调用测试
test('readInt32BE 可以正常调用', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readInt32BE(0);
  return typeof result === 'number' && result === 0x12345678;
});

test('readInt32LE 可以正常调用', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readInt32LE(0);
  return typeof result === 'number' && result === 0x12345678;
});

// call/apply 测试
test('readInt32BE 通过 call 调用', () => {
  const buf = Buffer.from([0x7F, 0xFF, 0xFF, 0xFF]);
  const result = Buffer.prototype.readInt32BE.call(buf, 0);
  return result === 2147483647;
});

test('readInt32LE 通过 call 调用', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0x7F]);
  const result = Buffer.prototype.readInt32LE.call(buf, 0);
  return result === 2147483647;
});

test('readInt32BE 通过 apply 调用', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x00]);
  const result = Buffer.prototype.readInt32BE.apply(buf, [0]);
  return result === -2147483648;
});

test('readInt32LE 通过 apply 调用', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x80]);
  const result = Buffer.prototype.readInt32LE.apply(buf, [0]);
  return result === -2147483648;
});

// 绑定测试
test('readInt32BE 可以被绑定', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const bound = buf.readInt32BE.bind(buf);
  return bound(0) === 0x12345678;
});

test('readInt32LE 可以被绑定', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const bound = buf.readInt32LE.bind(buf);
  return bound(0) === 0x12345678;
});

// 在类Buffer对象上调用
test('readInt32BE 在类Buffer对象上调用成功', () => {
  const notBuffer = { length: 4, 0: 0x12, 1: 0x34, 2: 0x56, 3: 0x78 };
  const result = Buffer.prototype.readInt32BE.call(notBuffer, 0);
  return result === 0x12345678;
});

test('readInt32LE 在类Buffer对象上调用成功', () => {
  const notBuffer = { length: 4, 0: 0x78, 1: 0x56, 2: 0x34, 3: 0x12 };
  const result = Buffer.prototype.readInt32LE.call(notBuffer, 0);
  return result === 0x12345678;
});

// 方法不可配置测试
test('readInt32BE 方法不可删除', () => {
  const buf = Buffer.alloc(4);
  delete buf.readInt32BE;
  return typeof buf.readInt32BE === 'function';
});

test('readInt32LE 方法不可删除', () => {
  const buf = Buffer.alloc(4);
  delete buf.readInt32LE;
  return typeof buf.readInt32LE === 'function';
});

// 返回值类型测试
test('readInt32BE 返回值是number', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return typeof buf.readInt32BE(0) === 'number';
});

test('readInt32LE 返回值是number', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  return typeof buf.readInt32LE(0) === 'number';
});

test('readInt32BE 返回值不是对象', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  return typeof buf.readInt32BE(0) !== 'object';
});

test('readInt32LE 返回值不是对象', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  return typeof buf.readInt32LE(0) !== 'object';
});

// 返回值是整数
test('readInt32BE 返回整数', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const result = buf.readInt32BE(0);
  return Number.isInteger(result);
});

test('readInt32LE 返回整数', () => {
  const buf = Buffer.from([0x78, 0x56, 0x34, 0x12]);
  const result = buf.readInt32LE(0);
  return Number.isInteger(result);
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
