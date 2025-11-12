// buf.writeBigInt64BE/LE - Performance and Stress Tests
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

// 大量连续写入
test('writeBigInt64BE - 1000次连续写入', () => {
  const buf = Buffer.alloc(8000);
  for (let i = 0; i < 1000; i++) {
    buf.writeBigInt64BE(BigInt(i), i * 8);
  }

  for (let i = 0; i < 1000; i++) {
    if (buf.readBigInt64BE(i * 8) !== BigInt(i)) return false;
  }
  return true;
});

test('writeBigInt64LE - 1000次连续写入', () => {
  const buf = Buffer.alloc(8000);
  for (let i = 0; i < 1000; i++) {
    buf.writeBigInt64LE(BigInt(i), i * 8);
  }

  for (let i = 0; i < 1000; i++) {
    if (buf.readBigInt64LE(i * 8) !== BigInt(i)) return false;
  }
  return true;
});

// 大数值范围测试
test('writeBigInt64BE - 混合正负数连续写入', () => {
  const buf = Buffer.alloc(80);
  const values = [
    0n, 1n, -1n, 100n, -100n,
    0x7FFFFFFFFFFFFFFFn, -0x8000000000000000n,
    123456789012345n, -987654321098765n, 0x1234567890ABCDEFn
  ];

  for (let i = 0; i < values.length; i++) {
    buf.writeBigInt64BE(values[i], i * 8);
  }

  for (let i = 0; i < values.length; i++) {
    if (buf.readBigInt64BE(i * 8) !== values[i]) return false;
  }
  return true;
});

test('writeBigInt64LE - 混合正负数连续写入', () => {
  const buf = Buffer.alloc(80);
  const values = [
    0n, 1n, -1n, 100n, -100n,
    0x7FFFFFFFFFFFFFFFn, -0x8000000000000000n,
    123456789012345n, -987654321098765n, 0x1234567890ABCDEFn
  ];

  for (let i = 0; i < values.length; i++) {
    buf.writeBigInt64LE(values[i], i * 8);
  }

  for (let i = 0; i < values.length; i++) {
    if (buf.readBigInt64LE(i * 8) !== values[i]) return false;
  }
  return true;
});

// 交替写入 BE 和 LE
test('交替使用 BE 和 LE 写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(0x1111111111111111n, 0);
  buf.writeBigInt64LE(0x2222222222222222n, 8);

  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(8);

  return be === 0x1111111111111111n && le === 0x2222222222222222n;
});

// 覆盖式写入测试
test('writeBigInt64BE - 重复覆盖同一位置', () => {
  const buf = Buffer.alloc(8);

  for (let i = 0; i < 100; i++) {
    buf.writeBigInt64BE(BigInt(i), 0);
  }

  return buf.readBigInt64BE(0) === 99n;
});

test('writeBigInt64LE - 重复覆盖同一位置', () => {
  const buf = Buffer.alloc(8);

  for (let i = 0; i < 100; i++) {
    buf.writeBigInt64LE(BigInt(i), 0);
  }

  return buf.readBigInt64LE(0) === 99n;
});

// 稀疏写入测试
test('writeBigInt64BE - 稀疏位置写入', () => {
  const buf = Buffer.alloc(100);
  buf.writeBigInt64BE(111n, 0);
  buf.writeBigInt64BE(222n, 20);
  buf.writeBigInt64BE(333n, 40);
  buf.writeBigInt64BE(444n, 92);

  return buf.readBigInt64BE(0) === 111n &&
         buf.readBigInt64BE(20) === 222n &&
         buf.readBigInt64BE(40) === 333n &&
         buf.readBigInt64BE(92) === 444n;
});

test('writeBigInt64LE - 稀疏位置写入', () => {
  const buf = Buffer.alloc(100);
  buf.writeBigInt64LE(111n, 0);
  buf.writeBigInt64LE(222n, 20);
  buf.writeBigInt64LE(333n, 40);
  buf.writeBigInt64LE(444n, 92);

  return buf.readBigInt64LE(0) === 111n &&
         buf.readBigInt64LE(20) === 222n &&
         buf.readBigInt64LE(40) === 333n &&
         buf.readBigInt64LE(92) === 444n;
});

// 位模式测试
test('writeBigInt64BE - 位模式 0x5555555555555555', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x5555555555555555n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x55) return false;
  }
  return true;
});

test('writeBigInt64BE - 位模式 0xAAAAAAAAAAAAAAAA（负数）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-0x5555555555555556n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xAA) return false;
  }
  return true;
});

test('writeBigInt64LE - 位模式 0x5555555555555555', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x5555555555555555n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x55) return false;
  }
  return true;
});

test('writeBigInt64LE - 位模式 0xAAAAAAAAAAAAAAAA（负数）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(-0x5555555555555556n, 0);

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xAA) return false;
  }
  return true;
});

// 递增递减模式
test('writeBigInt64BE - 递增序列写入', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeBigInt64BE(BigInt(i * 1000), i * 8);
  }

  for (let i = 0; i < 10; i++) {
    if (buf.readBigInt64BE(i * 8) !== BigInt(i * 1000)) return false;
  }
  return true;
});

test('writeBigInt64BE - 递减序列写入', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeBigInt64BE(BigInt((9 - i) * 1000), i * 8);
  }

  for (let i = 0; i < 10; i++) {
    if (buf.readBigInt64BE(i * 8) !== BigInt((9 - i) * 1000)) return false;
  }
  return true;
});

test('writeBigInt64LE - 递增序列写入', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeBigInt64LE(BigInt(i * 1000), i * 8);
  }

  for (let i = 0; i < 10; i++) {
    if (buf.readBigInt64LE(i * 8) !== BigInt(i * 1000)) return false;
  }
  return true;
});

test('writeBigInt64LE - 递减序列写入', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeBigInt64LE(BigInt((9 - i) * 1000), i * 8);
  }

  for (let i = 0; i < 10; i++) {
    if (buf.readBigInt64LE(i * 8) !== BigInt((9 - i) * 1000)) return false;
  }
  return true;
});

// 视图和原始buffer同步性验证
test('writeBigInt64BE - 视图写入影响原始buffer', () => {
  const original = Buffer.alloc(16);
  const view = original.subarray(4, 12);
  view.writeBigInt64BE(0x1234567890ABCDEFn, 0);

  return original.readBigInt64BE(4) === 0x1234567890ABCDEFn;
});

test('writeBigInt64LE - 视图写入影响原始buffer', () => {
  const original = Buffer.alloc(16);
  const view = original.subarray(4, 12);
  view.writeBigInt64LE(0x1234567890ABCDEFn, 0);

  return original.readBigInt64LE(4) === 0x1234567890ABCDEFn;
});

// 多层嵌套视图
test('writeBigInt64BE - 多层嵌套视图写入', () => {
  const original = Buffer.alloc(32);
  const view1 = original.subarray(8, 24);
  const view2 = view1.subarray(4, 12);
  view2.writeBigInt64BE(0x1122334455667788n, 0);

  return original.readBigInt64BE(12) === 0x1122334455667788n;
});

test('writeBigInt64LE - 多层嵌套视图写入', () => {
  const original = Buffer.alloc(32);
  const view1 = original.subarray(8, 24);
  const view2 = view1.subarray(4, 12);
  view2.writeBigInt64LE(0x1122334455667788n, 0);

  return original.readBigInt64LE(12) === 0x1122334455667788n;
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
