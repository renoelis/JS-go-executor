// buf.readBigInt64LE() - 返回值类型验证
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

// 返回值类型必须是 BigInt
test('返回值类型是 bigint', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint';
});

test('返回值不是 number', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const result = buf.readBigInt64LE(0);
  return typeof result !== 'number';
});

test('返回值不是 string', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const result = buf.readBigInt64LE(0);
  return typeof result !== 'string';
});

// BigInt 运算验证
test('返回值可以进行 BigInt 运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const result = buf.readBigInt64LE(0);
  return result + 50n === 150n;
});

test('返回值可以进行 BigInt 比较', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const result = buf.readBigInt64LE(0);
  return result > 50n && result < 200n;
});

// 零值返回类型
test('零值返回类型是 bigint', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint' && result === 0n;
});

// 负数返回类型
test('负数返回类型是 bigint', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-100n, 0);
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint' && result === -100n;
});

// 最大值返回类型
test('最大值返回类型是 bigint', () => {
  const buf = Buffer.alloc(8);
  const max = 9223372036854775807n;
  buf.writeBigInt64LE(max, 0);
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint' && result === max;
});

// 最小值返回类型
test('最小值返回类型是 bigint', () => {
  const buf = Buffer.alloc(8);
  const min = -9223372036854775808n;
  buf.writeBigInt64LE(min, 0);
  const result = buf.readBigInt64LE(0);
  return typeof result === 'bigint' && result === min;
});

// BigInt 字面量后缀 'n'
test('返回值与 BigInt 字面量严格相等', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  const result = buf.readBigInt64LE(0);
  return result === 12345n;
});

// 不等于 Number
test('返回值不等于同值的 Number', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const result = buf.readBigInt64LE(0);
  return result !== 100;
});

// BigInt 转换
test('返回值可以转换为字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  const result = buf.readBigInt64LE(0);
  return result.toString() === '12345';
});

test('返回值可以转换为 Number（在安全范围内）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(100n, 0);
  const result = buf.readBigInt64LE(0);
  return Number(result) === 100;
});

// 精度验证
test('大数值精度保持（超过 Number.MAX_SAFE_INTEGER）', () => {
  const buf = Buffer.alloc(8);
  const bigValue = 9007199254740992n; // 2^53
  buf.writeBigInt64LE(bigValue, 0);
  const result = buf.readBigInt64LE(0);
  return result === bigValue;
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
