// buf.readDoubleBE() - 返回值类型和特性测试
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

// 返回值类型
test('返回值是 number 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleBE(0);
  return typeof result === 'number';
});

test('返回值不是 bigint 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleBE(0);
  return typeof result !== 'bigint';
});

test('返回值不是 string 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleBE(0);
  return typeof result !== 'string';
});

test('返回值不是 object 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readDoubleBE(0);
  return typeof result !== 'object';
});

// Number 特性
test('返回值可以进行数学运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(100.5, 0);
  const result = buf.readDoubleBE(0);
  return Math.abs(result + 50.5 - 151) < 0.01;
});

test('返回值可以比较', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(100.5, 0);
  const result = buf.readDoubleBE(0);
  return result > 50 && result < 200;
});

test('返回值可以转换为字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456, 0);
  const result = buf.readDoubleBE(0);
  const str = result.toString();
  return typeof str === 'string' && str.includes('123.456');
});

test('返回值可以调用 Number 方法', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.789, 0);
  const result = buf.readDoubleBE(0);
  const fixed = result.toFixed(2);
  return fixed === '123.79';
});

// 特殊值的返回类型
test('Infinity 返回值是 number', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Infinity, 0);
  const result = buf.readDoubleBE(0);
  return typeof result === 'number' && result === Infinity;
});

test('NaN 返回值是 number', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(NaN, 0);
  const result = buf.readDoubleBE(0);
  return typeof result === 'number' && Number.isNaN(result);
});

test('零返回值是 number', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0, 0);
  const result = buf.readDoubleBE(0);
  return typeof result === 'number' && result === 0;
});

test('负零返回值是 number', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-0, 0);
  const result = buf.readDoubleBE(0);
  return typeof result === 'number' && result === 0 && 1 / result === -Infinity;
});

// Number 判断方法
test('isFinite 可以判断返回值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456, 0);
  const result = buf.readDoubleBE(0);
  return Number.isFinite(result);
});

test('isNaN 可以判断返回值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(NaN, 0);
  const result = buf.readDoubleBE(0);
  return Number.isNaN(result);
});

test('isInteger 可以判断返回值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(42, 0);
  const result = buf.readDoubleBE(0);
  return Number.isInteger(result);
});

test('isSafeInteger 可以判断返回值', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123, 0);
  const result = buf.readDoubleBE(0);
  return Number.isSafeInteger(result);
});

// 返回值与常量比较
test('返回值可以与 Number 常量比较', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MAX_VALUE, 0);
  const result = buf.readDoubleBE(0);
  return result === Number.MAX_VALUE;
});

test('返回值在 Number 范围内', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1e100, 0);
  const result = buf.readDoubleBE(0);
  return result >= -Number.MAX_VALUE && result <= Number.MAX_VALUE;
});

// 返回值严格相等
test('相同 Buffer 多次读取返回值严格相等', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.PI, 0);
  const r1 = buf.readDoubleBE(0);
  const r2 = buf.readDoubleBE(0);
  return r1 === r2;
});

test('NaN 返回值不严格相等自身', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(NaN, 0);
  const result = buf.readDoubleBE(0);
  return result !== result;
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
