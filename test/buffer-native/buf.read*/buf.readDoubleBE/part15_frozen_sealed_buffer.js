// buf.readDoubleBE() - 冻结和密封 Buffer 测试
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

// 冻结 Buffer 测试（Node.js 不允许冻结有元素的 TypedArray/Buffer）
test('尝试冻结非空 Buffer 会抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(123.456, 0);
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('freeze');
  }
});

test('冻结空 Buffer 可以读取（长度为0）', () => {
  try {
    const buf = Buffer.alloc(0);
    Object.freeze(buf);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// 密封 Buffer 测试（Node.js 不允许密封有元素的 TypedArray/Buffer）
test('尝试密封非空 Buffer 会抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(543.21, 0);
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('seal');
  }
});

test('密封空 Buffer 可以读取（长度为0）', () => {
  try {
    const buf = Buffer.alloc(0);
    Object.seal(buf);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// 不可扩展 Buffer 测试
test('不可扩展 Buffer 可以读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(111.222, 0);
  Object.preventExtensions(buf);
  return Math.abs(buf.readDoubleBE(0) - 111.222) < 0.001;
});

test('不可扩展 Buffer 读取零', () => {
  const buf = Buffer.alloc(8);
  Object.preventExtensions(buf);
  return buf.readDoubleBE(0) === 0;
});

test('不可扩展 Buffer offset 越界仍抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    Object.preventExtensions(buf);
    buf.readDoubleBE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('不可扩展 Buffer 读取特殊值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Infinity, 0);
  Object.preventExtensions(buf);
  return buf.readDoubleBE(0) === Infinity;
});

test('不可扩展 Buffer 读取 NaN', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(NaN, 0);
  Object.preventExtensions(buf);
  return Number.isNaN(buf.readDoubleBE(0));
});

// 检查可扩展性
test('新 Buffer 默认是可扩展的', () => {
  const buf = Buffer.alloc(8);
  return Object.isExtensible(buf);
});

test('preventExtensions 后不可扩展', () => {
  const buf = Buffer.alloc(8);
  Object.preventExtensions(buf);
  return !Object.isExtensible(buf);
});

// 不可扩展但可修改
test('不可扩展 Buffer 可以修改并读取', () => {
  const buf = Buffer.alloc(8);
  Object.preventExtensions(buf);
  buf.writeDoubleBE(333.444, 0);
  return Math.abs(buf.readDoubleBE(0) - 333.444) < 0.001;
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
