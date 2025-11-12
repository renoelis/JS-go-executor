// buf.writeDoubleBE/LE - Round 4: Coverage补漏 Tests
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

// 零值的不同表示
test('writeDoubleBE 区分 0 和 -0 的符号位', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleBE(0);
  buf2.writeDoubleBE(-0);

  // 字节级别检查符号位
  return buf1[0] === 0x00 && buf2[0] === 0x80;
});

test('writeDoubleLE 区分 0 和 -0 的符号位', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);

  buf1.writeDoubleLE(0);
  buf2.writeDoubleLE(-0);

  // 字节级别检查符号位
  return buf1[7] === 0x00 && buf2[7] === 0x80;
});

// 非常接近 0 的值
test('writeDoubleBE 写入接近 0 的极小正数', () => {
  const buf = Buffer.alloc(8);
  const value = 1e-323; // 接近最小次正规数
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE();
  return readBack >= 0;
});

test('writeDoubleLE 写入接近 0 的极小正数', () => {
  const buf = Buffer.alloc(8);
  const value = 1e-323;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE();
  return readBack >= 0;
});

// 不同的 NaN 表示（虽然 JS 规范化了 NaN）
test('writeDoubleBE 写入 NaN 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(NaN);

  // NaN 的指数部分全为 1，尾数非零
  return buf[0] === 0x7f && buf[1] === 0xf8;
});

test('writeDoubleLE 写入 NaN 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(NaN);

  // NaN 的指数部分全为 1，尾数非零
  return buf[7] === 0x7f && buf[6] === 0xf8;
});

// 分数边界值
test('writeDoubleBE 写入 0.5', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0.5);
  const readBack = buf.readDoubleBE();
  return readBack === 0.5;
});

test('writeDoubleLE 写入 0.5', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0.5);
  const readBack = buf.readDoubleLE();
  return readBack === 0.5;
});

test('writeDoubleBE 写入 0.25', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0.25);
  const readBack = buf.readDoubleBE();
  return readBack === 0.25;
});

test('writeDoubleLE 写入 0.25', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0.25);
  const readBack = buf.readDoubleLE();
  return readBack === 0.25;
});

// 2 的幂次
test('writeDoubleBE 写入 2 的各种幂次', () => {
  const buf = Buffer.alloc(8);
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

  for (const p of powers) {
    buf.writeDoubleBE(p);
    const readBack = buf.readDoubleBE();
    if (readBack !== p) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 写入 2 的各种幂次', () => {
  const buf = Buffer.alloc(8);
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

  for (const p of powers) {
    buf.writeDoubleLE(p);
    const readBack = buf.readDoubleLE();
    if (readBack !== p) {
      return false;
    }
  }
  return true;
});

// 负的 2 的幂次
test('writeDoubleBE 写入负的 2 的幂次', () => {
  const buf = Buffer.alloc(8);
  const powers = [-1, -2, -4, -8, -16, -32, -64];

  for (const p of powers) {
    buf.writeDoubleBE(p);
    const readBack = buf.readDoubleBE();
    if (readBack !== p) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 写入负的 2 的幂次', () => {
  const buf = Buffer.alloc(8);
  const powers = [-1, -2, -4, -8, -16, -32, -64];

  for (const p of powers) {
    buf.writeDoubleLE(p);
    const readBack = buf.readDoubleLE();
    if (readBack !== p) {
      return false;
    }
  }
  return true;
});

// 常见小数
test('writeDoubleBE 写入常见小数 0.1', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0.1);
  const readBack = buf.readDoubleBE();
  // 0.1 在二进制中是无限循环小数
  return Math.abs(readBack - 0.1) < 1e-15;
});

test('writeDoubleLE 写入常见小数 0.1', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0.1);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - 0.1) < 1e-15;
});

// 10 的幂次
test('writeDoubleBE 写入 10 的各种幂次', () => {
  const buf = Buffer.alloc(8);
  const powers = [1, 10, 100, 1000, 10000, 100000];

  for (const p of powers) {
    buf.writeDoubleBE(p);
    const readBack = buf.readDoubleBE();
    if (Math.abs(readBack - p) > 0.0001) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 写入 10 的各种幂次', () => {
  const buf = Buffer.alloc(8);
  const powers = [1, 10, 100, 1000, 10000, 100000];

  for (const p of powers) {
    buf.writeDoubleLE(p);
    const readBack = buf.readDoubleLE();
    if (Math.abs(readBack - p) > 0.0001) {
      return false;
    }
  }
  return true;
});

// 验证 Buffer.allocUnsafe 也能正常工作
test('writeDoubleBE 在 allocUnsafe 的 buffer 上工作', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleBE(123.456);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - 123.456) < 0.0001;
});

test('writeDoubleLE 在 allocUnsafe 的 buffer 上工作', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleLE(123.456);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - 123.456) < 0.0001;
});

// 在 Buffer.from 创建的 buffer 上
test('writeDoubleBE 在 Buffer.from 的 buffer 上工作', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  buf.writeDoubleBE(3.14, 0);
  buf.writeDoubleBE(2.718, 8);

  return Math.abs(buf.readDoubleBE(0) - 3.14) < 0.0001 &&
         Math.abs(buf.readDoubleBE(8) - 2.718) < 0.0001;
});

test('writeDoubleLE 在 Buffer.from 的 buffer 上工作', () => {
  const buf = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  buf.writeDoubleLE(3.14, 0);
  buf.writeDoubleLE(2.718, 8);

  return Math.abs(buf.readDoubleLE(0) - 3.14) < 0.0001 &&
         Math.abs(buf.readDoubleLE(8) - 2.718) < 0.0001;
});

// Symbol 作为 value（应该抛出错误或转换）
test('writeDoubleBE value 为 Symbol 抛出错误或转换', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(Symbol('test'));
    // 如果没抛错，检查是否转换为 NaN
    const readBack = buf.readDoubleBE();
    return Number.isNaN(readBack);
  } catch (e) {
    // 抛出错误也是合法行为
    return true;
  }
});

test('writeDoubleLE value 为 Symbol 抛出错误或转换', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(Symbol('test'));
    // 如果没抛错，检查是否转换为 NaN
    const readBack = buf.readDoubleLE();
    return Number.isNaN(readBack);
  } catch (e) {
    // 抛出错误也是合法行为
    return true;
  }
});

// BigInt 作为 value
test('writeDoubleBE value 为 BigInt 应该转换或抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleBE(123n);
    // 可能转换成功
    return true;
  } catch (e) {
    // 或者抛出错误也是合法的
    return e.message.includes('BigInt') || e.message.includes('number');
  }
});

test('writeDoubleLE value 为 BigInt 应该转换或抛错', () => {
  const buf = Buffer.alloc(8);
  try {
    buf.writeDoubleLE(123n);
    // 可能转换成功
    return true;
  } catch (e) {
    // 或者抛出错误也是合法的
    return e.message.includes('BigInt') || e.message.includes('number');
  }
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
