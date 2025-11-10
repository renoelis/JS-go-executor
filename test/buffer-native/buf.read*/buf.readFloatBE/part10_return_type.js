// buf.readFloatBE() - 返回类型验证
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

// 返回值类型检查
test('返回值是 number 类型', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(3.14, 0);
  return typeof buf.readFloatBE(0) === 'number';
});

test('返回 Infinity 是 number', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(Infinity, 0);
  return typeof buf.readFloatBE(0) === 'number';
});

test('返回 NaN 是 number', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(NaN, 0);
  return typeof buf.readFloatBE(0) === 'number';
});

test('返回 0 是 number', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(0, 0);
  return typeof buf.readFloatBE(0) === 'number';
});

// 不是其他类型
test('不返回字符串', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123, 0);
  return typeof buf.readFloatBE(0) !== 'string';
});

test('不返回对象', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123, 0);
  return typeof buf.readFloatBE(0) !== 'object';
});

test('不返回 undefined', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123, 0);
  return typeof buf.readFloatBE(0) !== 'undefined';
});

// 特殊值检查
test('Infinity === Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(Infinity, 0);
  return buf.readFloatBE(0) === Infinity;
});

test('-Infinity === -Infinity', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(-Infinity, 0);
  return buf.readFloatBE(0) === -Infinity;
});

test('NaN 使用 Number.isNaN 检测', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(NaN, 0);
  return Number.isNaN(buf.readFloatBE(0));
});

test('0 === 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(0, 0);
  return buf.readFloatBE(0) === 0;
});

// 正负零区分
test('+0 使用 1/x 区分', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(+0, 0);
  return 1 / buf.readFloatBE(0) === Infinity;
});

test('-0 使用 1/x 区分', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(-0, 0);
  return 1 / buf.readFloatBE(0) === -Infinity;
});

// 有限数值
test('isFinite 检测有限值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(123.456, 0);
  return Number.isFinite(buf.readFloatBE(0));
});

test('Infinity 不是有限值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(Infinity, 0);
  return !Number.isFinite(buf.readFloatBE(0));
});

test('NaN 不是有限值', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(NaN, 0);
  return !Number.isFinite(buf.readFloatBE(0));
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
