// Buffer.isBuffer() - 基本功能测试
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

// 基础 Buffer 实例测试
test('Buffer.alloc 创建的实例返回 true', () => {
  const buf = Buffer.alloc(5);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.alloc 零长度返回 true', () => {
  const buf = Buffer.alloc(0);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.from 字符串创建返回 true', () => {
  const buf = Buffer.from('hello');
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.from 数组创建返回 true', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.from ArrayBuffer 创建返回 true', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.allocUnsafe 创建返回 true', () => {
  const buf = Buffer.allocUnsafe(10);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.allocUnsafeSlow 创建返回 true', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return Buffer.isBuffer(buf) === true;
});

test('Buffer.concat 结果返回 true', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const result = Buffer.concat([buf1, buf2]);
  return Buffer.isBuffer(result) === true;
});

// 非 Buffer 类型测试
test('Uint8Array 返回 false', () => {
  const arr = new Uint8Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('Int8Array 返回 false', () => {
  const arr = new Int8Array(5);
  return Buffer.isBuffer(arr) === false;
});

test('ArrayBuffer 返回 false', () => {
  const ab = new ArrayBuffer(5);
  return Buffer.isBuffer(ab) === false;
});

test('普通数组返回 false', () => {
  return Buffer.isBuffer([1, 2, 3]) === false;
});

test('字符串返回 false', () => {
  return Buffer.isBuffer('hello') === false;
});

test('数字返回 false', () => {
  return Buffer.isBuffer(123) === false;
});

test('布尔值 true 返回 false', () => {
  return Buffer.isBuffer(true) === false;
});

test('布尔值 false 返回 false', () => {
  return Buffer.isBuffer(false) === false;
});

test('null 返回 false', () => {
  return Buffer.isBuffer(null) === false;
});

test('undefined 返回 false', () => {
  return Buffer.isBuffer(undefined) === false;
});

test('空对象返回 false', () => {
  return Buffer.isBuffer({}) === false;
});

test('对象返回 false', () => {
  return Buffer.isBuffer({ length: 10, data: [1, 2, 3] }) === false;
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
