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

// readInt16BE 方法存在性测试
test('Buffer.prototype 有 readInt16BE 方法', () => {
  return typeof Buffer.prototype.readInt16BE === 'function';
});

test('Buffer实例有 readInt16BE 方法', () => {
  const buf = Buffer.alloc(2);
  return typeof buf.readInt16BE === 'function';
});

test('readInt16BE 方法 length 属性', () => {
  return Buffer.prototype.readInt16BE.length === 0 || Buffer.prototype.readInt16BE.length === 1;
});

test('readInt16BE 方法 name 属性', () => {
  return Buffer.prototype.readInt16BE.name === 'readInt16BE';
});

// readInt16LE 方法存在性测试
test('Buffer.prototype 有 readInt16LE 方法', () => {
  return typeof Buffer.prototype.readInt16LE === 'function';
});

test('Buffer实例有 readInt16LE 方法', () => {
  const buf = Buffer.alloc(2);
  return typeof buf.readInt16LE === 'function';
});

test('readInt16LE 方法 length 属性', () => {
  return Buffer.prototype.readInt16LE.length === 0 || Buffer.prototype.readInt16LE.length === 1;
});

test('readInt16LE 方法 name 属性', () => {
  return Buffer.prototype.readInt16LE.name === 'readInt16LE';
});

// 方法调用测试
test('readInt16BE 可以正常调用', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readInt16BE(0);
  return typeof result === 'number' && result === 0x1234;
});

test('readInt16LE 可以正常调用', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const result = buf.readInt16LE(0);
  return typeof result === 'number' && result === 0x1234;
});

// call/apply 测试
test('readInt16BE 通过 call 调用', () => {
  const buf = Buffer.from([0x7F, 0xFF]);
  const result = Buffer.prototype.readInt16BE.call(buf, 0);
  return result === 32767;
});

test('readInt16LE 通过 call 调用', () => {
  const buf = Buffer.from([0xFF, 0x7F]);
  const result = Buffer.prototype.readInt16LE.call(buf, 0);
  return result === 32767;
});

test('readInt16BE 通过 apply 调用', () => {
  const buf = Buffer.from([0x80, 0x00]);
  const result = Buffer.prototype.readInt16BE.apply(buf, [0]);
  return result === -32768;
});

test('readInt16LE 通过 apply 调用', () => {
  const buf = Buffer.from([0x00, 0x80]);
  const result = Buffer.prototype.readInt16LE.apply(buf, [0]);
  return result === -32768;
});

// 绑定测试
test('readInt16BE 可以被绑定 - BE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const bound = buf.readInt16BE.bind(buf);
  return bound(0) === 0x1234;
});

test('readInt16LE 可以被绑定 - LE', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const bound = buf.readInt16LE.bind(buf);
  return bound(0) === 0x1234;
});

// 在类Buffer对象上调用（Node.js允许）
test('readInt16BE 在类Buffer对象上调用成功', () => {
  const notBuffer = { length: 2, 0: 0x12, 1: 0x34 };
  const result = Buffer.prototype.readInt16BE.call(notBuffer, 0);
  return result === 0x1234;
});

test('readInt16LE 在类Buffer对象上调用成功', () => {
  const notBuffer = { length: 2, 0: 0x34, 1: 0x12 };
  const result = Buffer.prototype.readInt16LE.call(notBuffer, 0);
  return result === 0x1234;
});

// 方法不可配置测试
test('readInt16BE 方法不可删除', () => {
  const buf = Buffer.alloc(2);
  delete buf.readInt16BE;
  return typeof buf.readInt16BE === 'function';
});

test('readInt16LE 方法不可删除', () => {
  const buf = Buffer.alloc(2);
  delete buf.readInt16LE;
  return typeof buf.readInt16LE === 'function';
});

// 返回值类型测试
test('readInt16BE 返回值是number', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return typeof buf.readInt16BE(0) === 'number';
});

test('readInt16LE 返回值是number', () => {
  const buf = Buffer.from([0x00, 0x00]);
  return typeof buf.readInt16LE(0) === 'number';
});

test('readInt16BE 返回值不是对象', () => {
  const buf = Buffer.from([0x12, 0x34]);
  return typeof buf.readInt16BE(0) !== 'object';
});

test('readInt16LE 返回值不是对象', () => {
  const buf = Buffer.from([0x34, 0x12]);
  return typeof buf.readInt16LE(0) !== 'object';
});

// 返回值是整数
test('readInt16BE 返回整数', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const result = buf.readInt16BE(0);
  return Number.isInteger(result);
});

test('readInt16LE 返回整数', () => {
  const buf = Buffer.from([0x34, 0x12]);
  const result = buf.readInt16LE(0);
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
