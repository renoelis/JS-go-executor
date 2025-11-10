// buf.readBigUInt64LE() - 多次读取和并发测试
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

// 同一位置多次读取
test('同一位置多次读取一致性', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(12345n, 0);
  const r1 = buf.readBigUInt64LE(0);
  const r2 = buf.readBigUInt64LE(0);
  const r3 = buf.readBigUInt64LE(0);
  return r1 === 12345n && r2 === 12345n && r3 === 12345n;
});

// 不同位置连续读取
test('连续读取不同位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(111n, 0);
  buf.writeBigUInt64LE(222n, 8);
  buf.writeBigUInt64LE(333n, 16);
  return buf.readBigUInt64LE(0) === 111n &&
         buf.readBigUInt64LE(8) === 222n &&
         buf.readBigUInt64LE(16) === 333n;
});

// 逆序读取
test('逆序读取', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(111n, 0);
  buf.writeBigUInt64LE(222n, 8);
  buf.writeBigUInt64LE(333n, 16);
  return buf.readBigUInt64LE(16) === 333n &&
         buf.readBigUInt64LE(8) === 222n &&
         buf.readBigUInt64LE(0) === 111n;
});

// 交错读取
test('交错读取', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64LE(111n, 0);
  buf.writeBigUInt64LE(222n, 8);
  buf.writeBigUInt64LE(333n, 16);
  return buf.readBigUInt64LE(8) === 222n &&
         buf.readBigUInt64LE(0) === 111n &&
         buf.readBigUInt64LE(16) === 333n;
});

// 重复读取同一值
test('重复读取 100 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(99999n, 0);
  for (let i = 0; i < 100; i++) {
    if (buf.readBigUInt64LE(0) !== 99999n) {
      return false;
    }
  }
  return true;
});

// 读取后修改再读取
test('读取-修改-读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(111n, 0);
  const r1 = buf.readBigUInt64LE(0);
  buf.writeBigUInt64LE(222n, 0);
  const r2 = buf.readBigUInt64LE(0);
  return r1 === 111n && r2 === 222n;
});

// 多个 Buffer 实例
test('多个 Buffer 实例独立性', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigUInt64LE(111n, 0);
  buf2.writeBigUInt64LE(222n, 0);
  return buf1.readBigUInt64LE(0) === 111n && buf2.readBigUInt64LE(0) === 222n;
});

// 循环读取数组
test('循环读取多个值', () => {
  const buf = Buffer.alloc(40);
  const values = [1n, 2n, 3n, 4n, 5n];
  for (let i = 0; i < values.length; i++) {
    buf.writeBigUInt64LE(values[i], i * 8);
  }
  for (let i = 0; i < values.length; i++) {
    if (buf.readBigUInt64LE(i * 8) !== values[i]) {
      return false;
    }
  }
  return true;
});

// 大量数据读取
test('读取 1000 个值', () => {
  const count = 1000;
  const buf = Buffer.alloc(count * 8);
  for (let i = 0; i < count; i++) {
    buf.writeBigUInt64LE(BigInt(i), i * 8);
  }
  for (let i = 0; i < count; i++) {
    if (buf.readBigUInt64LE(i * 8) !== BigInt(i)) {
      return false;
    }
  }
  return true;
});

// 读取不影响 Buffer 内容
test('读取操作不修改 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const before = buf.toString('hex');
  buf.readBigUInt64LE(0);
  const after = buf.toString('hex');
  return before === after;
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
