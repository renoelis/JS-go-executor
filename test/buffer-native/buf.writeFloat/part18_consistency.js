// buf.writeFloatBE/LE() - 错误恢复和状态一致性测试
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

// 错误后 buffer 状态不变
test('writeFloatBE offset 越界后 buffer 内容不变', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const original = buf.toString('hex');
  try {
    buf.writeFloatBE(1.5, 10);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeFloatLE offset 越界后 buffer 内容不变', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const original = buf.toString('hex');
  try {
    buf.writeFloatLE(1.5, 10);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeFloatBE offset 为负数后 buffer 内容不变', () => {
  const buf = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);
  const original = buf.toString('hex');
  try {
    buf.writeFloatBE(2.5, -1);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

test('writeFloatLE offset 为负数后 buffer 内容不变', () => {
  const buf = Buffer.from([0xaa, 0xbb, 0xcc, 0xdd]);
  const original = buf.toString('hex');
  try {
    buf.writeFloatLE(2.5, -1);
  } catch (e) {
    // 预期抛错
  }
  return buf.toString('hex') === original;
});

// 部分写入不会发生
test('writeFloatBE offset 导致部分越界时完全不写入', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xff);
  try {
    buf.writeFloatBE(1.5, 2);
  } catch (e) {
    // 预期抛错
  }
  return buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff;
});

test('writeFloatLE offset 导致部分越界时完全不写入', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0xff);
  try {
    buf.writeFloatLE(1.5, 2);
  } catch (e) {
    // 预期抛错
  }
  return buf[2] === 0xff && buf[3] === 0xff && buf[4] === 0xff;
});

// 连续操作的一致性
test('writeFloatBE 连续操作保持一致性', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeFloatBE(1.1, 0);
  buf.writeFloatBE(2.2, 4);
  buf.writeFloatBE(3.3, 8);

  const v1 = buf.readFloatBE(0);
  const v2 = buf.readFloatBE(4);
  const v3 = buf.readFloatBE(8);

  return Math.abs(v1 - 1.1) < 0.01 &&
         Math.abs(v2 - 2.2) < 0.01 &&
         Math.abs(v3 - 3.3) < 0.01;
});

test('writeFloatLE 连续操作保持一致性', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  buf.writeFloatLE(3.3, 8);

  const v1 = buf.readFloatLE(0);
  const v2 = buf.readFloatLE(4);
  const v3 = buf.readFloatLE(8);

  return Math.abs(v1 - 1.1) < 0.01 &&
         Math.abs(v2 - 2.2) < 0.01 &&
         Math.abs(v3 - 3.3) < 0.01;
});

// 中间操作失败不影响其他位置
test('writeFloatBE 中间失败不影响已写入的数据', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(5.5, 0);

  try {
    buf.writeFloatBE(6.6, 10);
  } catch (e) {
    // 预期抛错
  }

  return buf.readFloatBE(0) === 5.5;
});

test('writeFloatLE 中间失败不影响已写入的数据', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(5.5, 0);

  try {
    buf.writeFloatLE(6.6, 10);
  } catch (e) {
    // 预期抛错
  }

  return buf.readFloatLE(0) === 5.5;
});

// 同一位置多次写入的幂等性
test('writeFloatBE 同一位置多次写入最后一次生效', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1.1, 0);
  buf.writeFloatBE(2.2, 0);
  buf.writeFloatBE(3.3, 0);

  return Math.abs(buf.readFloatBE(0) - 3.3) < 0.01;
});

test('writeFloatLE 同一位置多次写入最后一次生效', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 0);
  buf.writeFloatLE(3.3, 0);

  return Math.abs(buf.readFloatLE(0) - 3.3) < 0.01;
});

// 交错写入的一致性
test('writeFloatBE 和 writeFloatLE 交错写入不同位置', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeFloatBE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  buf.writeFloatBE(3.3, 8);
  buf.writeFloatLE(4.4, 12);

  return Math.abs(buf.readFloatBE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatLE(4) - 2.2) < 0.01 &&
         Math.abs(buf.readFloatBE(8) - 3.3) < 0.01 &&
         Math.abs(buf.readFloatLE(12) - 4.4) < 0.01;
});

// 异常值不导致后续操作失败
test('writeFloatBE 写入 NaN 后仍可正常写入其他值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatBE(NaN, 0);
  buf.writeFloatBE(42.5, 4);

  return isNaN(buf.readFloatBE(0)) && buf.readFloatBE(4) === 42.5;
});

test('writeFloatLE 写入 Infinity 后仍可正常写入其他值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeFloatLE(Infinity, 0);
  buf.writeFloatLE(42.5, 4);

  return buf.readFloatLE(0) === Infinity && buf.readFloatLE(4) === 42.5;
});

// Buffer 长度变化不影响已写入数据
test('writeFloatBE 在 subarray 上写入后原 buffer 可读', () => {
  const buf = Buffer.allocUnsafe(12);
  const sub = buf.subarray(0, 4);
  sub.writeFloatBE(7.7, 0);

  return Math.abs(buf.readFloatBE(0) - 7.7) < 0.01;
});

test('writeFloatLE 在 slice 上写入后原 buffer 可读', () => {
  const buf = Buffer.allocUnsafe(12);
  const slice = buf.slice(0, 4);
  slice.writeFloatLE(8.8, 0);

  return Math.abs(buf.readFloatLE(0) - 8.8) < 0.01;
});

// 零长度 buffer 的一致性
test('writeFloatBE 在零长度 buffer 上始终失败', () => {
  const buf = Buffer.allocUnsafe(0);
  let errors = 0;

  for (let i = 0; i < 10; i++) {
    try {
      buf.writeFloatBE(i * 0.1, 0);
    } catch (e) {
      errors++;
    }
  }

  return errors === 10;
});

test('writeFloatLE 在零长度 buffer 上始终失败', () => {
  const buf = Buffer.allocUnsafe(0);
  let errors = 0;

  for (let i = 0; i < 10; i++) {
    try {
      buf.writeFloatLE(i * 0.1, 0);
    } catch (e) {
      errors++;
    }
  }

  return errors === 10;
});

// 重入安全性
test('writeFloatBE 连续调用保持状态一致', () => {
  const buf = Buffer.allocUnsafe(4);
  let consistent = true;

  for (let i = 0; i < 100; i++) {
    const value = Math.random() * 100;
    buf.writeFloatBE(value, 0);
    const read = buf.readFloatBE(0);
    if (Math.abs(read - value) >= 0.01) {
      consistent = false;
      break;
    }
  }

  return consistent;
});

test('writeFloatLE 连续调用保持状态一致', () => {
  const buf = Buffer.allocUnsafe(4);
  let consistent = true;

  for (let i = 0; i < 100; i++) {
    const value = Math.random() * 100;
    buf.writeFloatLE(value, 0);
    const read = buf.readFloatLE(0);
    if (Math.abs(read - value) >= 0.01) {
      consistent = false;
      break;
    }
  }

  return consistent;
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
