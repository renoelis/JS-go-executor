// buf.readBigUInt64BE() - 返回值类型和特性测试
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
test('返回值是 bigint 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readBigUInt64BE(0);
  return typeof result === 'bigint';
});

test('返回值不是 number 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readBigUInt64BE(0);
  return typeof result !== 'number';
});

test('返回值不是 string 类型', () => {
  const buf = Buffer.alloc(8);
  const result = buf.readBigUInt64BE(0);
  return typeof result !== 'string';
});

// BigInt 特性
test('返回值可以进行 BigInt 运算', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(100n, 0);
  const result = buf.readBigUInt64BE(0);
  return result + 50n === 150n;
});

test('返回值可以比较', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(100n, 0);
  const result = buf.readBigUInt64BE(0);
  return result > 50n && result < 200n;
});

test('返回值可以转换为字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(123n, 0);
  const result = buf.readBigUInt64BE(0);
  return result.toString() === '123';
});

test('返回值可以转换为十六进制', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(255n, 0);
  const result = buf.readBigUInt64BE(0);
  return result.toString(16) === 'ff';
});

test('返回值可以转换为二进制', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(8n, 0);
  const result = buf.readBigUInt64BE(0);
  return result.toString(2) === '1000';
});

// 返回值范围
test('返回值始终 >= 0', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  const result = buf.readBigUInt64BE(0);
  return result >= 0n;
});

test('返回值 <= 2^64-1', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  const result = buf.readBigUInt64BE(0);
  return result <= 18446744073709551615n;
});

// 返回值精度
test('返回值保持精度（大数）', () => {
  const buf = Buffer.alloc(8);
  const value = 9007199254740993n; // Number.MAX_SAFE_INTEGER + 2
  buf.writeBigUInt64BE(value, 0);
  return buf.readBigUInt64BE(0) === value;
});

test('返回值保持精度（最大值）', () => {
  const buf = Buffer.alloc(8);
  const max = 18446744073709551615n;
  buf.writeBigUInt64BE(max, 0);
  return buf.readBigUInt64BE(0) === max;
});

// 返回值不可变性
test('返回值是原始值（不可变）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(100n, 0);
  const result1 = buf.readBigUInt64BE(0);
  const result2 = buf.readBigUInt64BE(0);
  return result1 === result2;
});

// 返回值与 Number 的区别
test('返回值不等于同值的 Number', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(100n, 0);
  const result = buf.readBigUInt64BE(0);
  return result !== 100;
});

test('返回值严格等于 BigInt', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(100n, 0);
  const result = buf.readBigUInt64BE(0);
  return result === 100n;
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
