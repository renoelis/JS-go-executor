// buf.readBigUInt64BE() - BigInt 边界值和特殊值测试
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

// 2 的幂次方测试
test('2^0 = 1n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1n, 0);
  return buf.readBigUInt64BE(0) === 1n;
});

test('2^1 = 2n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(2n, 0);
  return buf.readBigUInt64BE(0) === 2n;
});

test('2^7 = 128n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(128n, 0);
  return buf.readBigUInt64BE(0) === 128n;
});

test('2^8 = 256n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(256n, 0);
  return buf.readBigUInt64BE(0) === 256n;
});

test('2^15 = 32768n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(32768n, 0);
  return buf.readBigUInt64BE(0) === 32768n;
});

test('2^16 = 65536n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(65536n, 0);
  return buf.readBigUInt64BE(0) === 65536n;
});

test('2^31 = 2147483648n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(2147483648n, 0);
  return buf.readBigUInt64BE(0) === 2147483648n;
});

test('2^32 = 4294967296n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(4294967296n, 0);
  return buf.readBigUInt64BE(0) === 4294967296n;
});

test('2^53 = 9007199254740992n (Number.MAX_SAFE_INTEGER + 1)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(9007199254740992n, 0);
  return buf.readBigUInt64BE(0) === 9007199254740992n;
});

test('2^62 = 4611686018427387904n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(4611686018427387904n, 0);
  return buf.readBigUInt64BE(0) === 4611686018427387904n;
});

test('2^63 = 9223372036854775808n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(9223372036854775808n, 0);
  return buf.readBigUInt64BE(0) === 9223372036854775808n;
});

// 边界值附近
test('2^64 - 1 = 18446744073709551615n（最大值）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(18446744073709551615n, 0);
  return buf.readBigUInt64BE(0) === 18446744073709551615n;
});

test('2^64 - 2 = 18446744073709551614n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(18446744073709551614n, 0);
  return buf.readBigUInt64BE(0) === 18446744073709551614n;
});

test('2^63 + 1 = 9223372036854775809n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(9223372036854775809n, 0);
  return buf.readBigUInt64BE(0) === 9223372036854775809n;
});

test('2^63 - 1 = 9223372036854775807n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(9223372036854775807n, 0);
  return buf.readBigUInt64BE(0) === 9223372036854775807n;
});

// 特殊数学值
test('1n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1n, 0);
  return buf.readBigUInt64BE(0) === 1n;
});

test('10n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(10n, 0);
  return buf.readBigUInt64BE(0) === 10n;
});

test('100n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(100n, 0);
  return buf.readBigUInt64BE(0) === 100n;
});

test('1000n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1000n, 0);
  return buf.readBigUInt64BE(0) === 1000n;
});

test('1000000n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1000000n, 0);
  return buf.readBigUInt64BE(0) === 1000000n;
});

test('1000000000n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1000000000n, 0);
  return buf.readBigUInt64BE(0) === 1000000000n;
});

test('1000000000000n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(1000000000000n, 0);
  return buf.readBigUInt64BE(0) === 1000000000000n;
});

// 质数测试
test('质数 7n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(7n, 0);
  return buf.readBigUInt64BE(0) === 7n;
});

test('质数 13n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(13n, 0);
  return buf.readBigUInt64BE(0) === 13n;
});

test('质数 97n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(97n, 0);
  return buf.readBigUInt64BE(0) === 97n;
});

test('大质数 2147483647n (2^31 - 1)', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(2147483647n, 0);
  return buf.readBigUInt64BE(0) === 2147483647n;
});

// 连续值测试
test('连续值 123456789n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(123456789n, 0);
  return buf.readBigUInt64BE(0) === 123456789n;
});

test('连续值 987654321n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(987654321n, 0);
  return buf.readBigUInt64BE(0) === 987654321n;
});

test('回文数 12321n', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(12321n, 0);
  return buf.readBigUInt64BE(0) === 12321n;
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
