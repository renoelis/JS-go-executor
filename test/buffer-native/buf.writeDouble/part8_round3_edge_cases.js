// buf.writeDoubleBE/LE - Round 3: Edge Cases and Actual Behavior Tests
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

// 字符串数字格式测试
test('writeDoubleBE value 为十六进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('0x10');
  const readBack = buf.readDoubleBE();
  return readBack === 16;
});

test('writeDoubleLE value 为十六进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('0x10');
  const readBack = buf.readDoubleLE();
  return readBack === 16;
});

test('writeDoubleBE value 为八进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('0o10');
  const readBack = buf.readDoubleBE();
  return readBack === 8;
});

test('writeDoubleLE value 为八进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('0o10');
  const readBack = buf.readDoubleLE();
  return readBack === 8;
});

test('writeDoubleBE value 为二进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('0b10');
  const readBack = buf.readDoubleBE();
  return readBack === 2;
});

test('writeDoubleLE value 为二进制字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('0b10');
  const readBack = buf.readDoubleLE();
  return readBack === 2;
});

test('writeDoubleBE value 为科学计数法字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('1.23e5');
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - 123000) < 0.001;
});

test('writeDoubleLE value 为科学计数法字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('1.23e5');
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - 123000) < 0.001;
});

// 前后有空格的字符串
test('writeDoubleBE value 为带空格的字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE('  3.14  ');
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - 3.14) < 0.0001;
});

test('writeDoubleLE value 为带空格的字符串', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE('  3.14  ');
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - 3.14) < 0.0001;
});

// offset 为字符串数字 - Node v25.0.0 要求必须是 number 类型
test('writeDoubleBE offset 为数字字符串抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.23, '8');
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('offset');
  }
});

test('writeDoubleLE offset 为数字字符串抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.23, '8');
    return false;
  } catch (e) {
    return e.message.includes('number') || e.message.includes('offset');
  }
});

// 非常大的 offset
test('writeDoubleBE offset 超大值抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleBE(1.0, 1e10);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('outside buffer');
  }
});

test('writeDoubleLE offset 超大值抛出错误', () => {
  const buf = Buffer.alloc(16);
  try {
    buf.writeDoubleLE(1.0, 1e10);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('outside buffer');
  }
});

// 负的极小值
test('writeDoubleBE 写入 -Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-Number.MIN_VALUE);
  const readBack = buf.readDoubleBE();
  return readBack === -Number.MIN_VALUE;
});

test('writeDoubleLE 写入 -Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Number.MIN_VALUE);
  const readBack = buf.readDoubleLE();
  return readBack === -Number.MIN_VALUE;
});

// 混合 BE 和 LE 写入同一个 Buffer
test('同一 Buffer 混合使用 BE 和 LE', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(1.23, 0);
  buf.writeDoubleLE(4.56, 8);

  const v1 = buf.readDoubleBE(0);
  const v2 = buf.readDoubleLE(8);

  return Math.abs(v1 - 1.23) < 0.0001 && Math.abs(v2 - 4.56) < 0.0001;
});

// 重叠写入
test('writeDoubleBE 重叠写入部分覆盖', () => {
  const buf = Buffer.alloc(12);
  buf.fill(0);
  buf.writeDoubleBE(111.111, 0);
  buf.writeDoubleBE(222.222, 4);

  // 第一个值的后 4 字节被覆盖
  const v1 = buf.readDoubleBE(0);
  const v2 = buf.readDoubleBE(4);

  return v1 !== 111.111 && Math.abs(v2 - 222.222) < 0.0001;
});

test('writeDoubleLE 重叠写入部分覆盖', () => {
  const buf = Buffer.alloc(12);
  buf.fill(0);
  buf.writeDoubleLE(111.111, 0);
  buf.writeDoubleLE(222.222, 4);

  // 第一个值的后 4 字节被覆盖
  const v1 = buf.readDoubleLE(0);
  const v2 = buf.readDoubleLE(4);

  return v1 !== 111.111 && Math.abs(v2 - 222.222) < 0.0001;
});

// 特定浮点数位模式
test('writeDoubleBE 写入 1.0 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1.0);

  // IEEE 754: 1.0 = 0x3FF0000000000000 (BE)
  return buf[0] === 0x3f && buf[1] === 0xf0 &&
         buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 &&
         buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeDoubleLE 写入 1.0 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(1.0);

  // IEEE 754: 1.0 = 0x3FF0000000000000 (LE)
  return buf[7] === 0x3f && buf[6] === 0xf0 &&
         buf[5] === 0x00 && buf[4] === 0x00 &&
         buf[3] === 0x00 && buf[2] === 0x00 &&
         buf[1] === 0x00 && buf[0] === 0x00;
});

test('writeDoubleBE 写入 2.0 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(2.0);

  // IEEE 754: 2.0 = 0x4000000000000000 (BE)
  return buf[0] === 0x40 && buf[1] === 0x00;
});

test('writeDoubleLE 写入 2.0 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(2.0);

  // IEEE 754: 2.0 = 0x4000000000000000 (LE)
  return buf[7] === 0x40 && buf[6] === 0x00;
});

// 写入后立即读取
test('writeDoubleBE 写入后立即读取一致性', () => {
  const buf = Buffer.alloc(8);
  const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  for (const val of values) {
    buf.writeDoubleBE(val);
    const readBack = buf.readDoubleBE();
    if (Math.abs(readBack - val) > 1e-15) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 写入后立即读取一致性', () => {
  const buf = Buffer.alloc(8);
  const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

  for (const val of values) {
    buf.writeDoubleLE(val);
    const readBack = buf.readDoubleLE();
    if (Math.abs(readBack - val) > 1e-15) {
      return false;
    }
  }
  return true;
});

// 特殊数学常量
test('writeDoubleBE 写入 Math.SQRT2', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.SQRT2);
  const readBack = buf.readDoubleBE();
  return readBack === Math.SQRT2;
});

test('writeDoubleLE 写入 Math.SQRT2', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.SQRT2);
  const readBack = buf.readDoubleLE();
  return readBack === Math.SQRT2;
});

test('writeDoubleBE 写入 Math.LN2', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.LN2);
  const readBack = buf.readDoubleBE();
  return readBack === Math.LN2;
});

test('writeDoubleLE 写入 Math.LN2', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.LN2);
  const readBack = buf.readDoubleLE();
  return readBack === Math.LN2;
});

// 连续负数
test('writeDoubleBE 连续写入多个负数', () => {
  const buf = Buffer.alloc(32);
  buf.writeDoubleBE(-1.1, 0);
  buf.writeDoubleBE(-2.2, 8);
  buf.writeDoubleBE(-3.3, 16);
  buf.writeDoubleBE(-4.4, 24);

  return Math.abs(buf.readDoubleBE(0) - (-1.1)) < 0.0001 &&
         Math.abs(buf.readDoubleBE(8) - (-2.2)) < 0.0001 &&
         Math.abs(buf.readDoubleBE(16) - (-3.3)) < 0.0001 &&
         Math.abs(buf.readDoubleBE(24) - (-4.4)) < 0.0001;
});

test('writeDoubleLE 连续写入多个负数', () => {
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(-1.1, 0);
  buf.writeDoubleLE(-2.2, 8);
  buf.writeDoubleLE(-3.3, 16);
  buf.writeDoubleLE(-4.4, 24);

  return Math.abs(buf.readDoubleLE(0) - (-1.1)) < 0.0001 &&
         Math.abs(buf.readDoubleLE(8) - (-2.2)) < 0.0001 &&
         Math.abs(buf.readDoubleLE(16) - (-3.3)) < 0.0001 &&
         Math.abs(buf.readDoubleLE(24) - (-4.4)) < 0.0001;
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
