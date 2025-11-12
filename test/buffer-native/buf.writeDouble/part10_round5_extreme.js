// buf.writeDoubleBE/LE - Round 5: Extreme Cases and Compatibility Tests
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

// 极端大小的 Buffer
test('writeDoubleBE 在非常大的 buffer 末尾写入', () => {
  const buf = Buffer.alloc(10000);
  buf.writeDoubleBE(999.888, 9992);
  const readBack = buf.readDoubleBE(9992);
  return Math.abs(readBack - 999.888) < 0.0001;
});

test('writeDoubleLE 在非常大的 buffer 末尾写入', () => {
  const buf = Buffer.alloc(10000);
  buf.writeDoubleLE(999.888, 9992);
  const readBack = buf.readDoubleLE(9992);
  return Math.abs(readBack - 999.888) < 0.0001;
});

// 连续大量写入性能测试
test('writeDoubleBE 连续写入 100 个值', () => {
  const buf = Buffer.alloc(800);

  for (let i = 0; i < 100; i++) {
    buf.writeDoubleBE(i * 1.1, i * 8);
  }

  // 验证几个值
  return Math.abs(buf.readDoubleBE(0) - 0) < 0.0001 &&
         Math.abs(buf.readDoubleBE(400) - 55) < 0.0001 &&
         Math.abs(buf.readDoubleBE(792) - 108.9) < 0.0001;
});

test('writeDoubleLE 连续写入 100 个值', () => {
  const buf = Buffer.alloc(800);

  for (let i = 0; i < 100; i++) {
    buf.writeDoubleLE(i * 1.1, i * 8);
  }

  // 验证几个值
  return Math.abs(buf.readDoubleLE(0) - 0) < 0.0001 &&
         Math.abs(buf.readDoubleLE(400) - 55) < 0.0001 &&
         Math.abs(buf.readDoubleLE(792) - 108.9) < 0.0001;
});

// IEEE 754 特殊位模式
test('writeDoubleBE 写入 Infinity 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Infinity);

  // +Infinity: 0x7FF0000000000000
  return buf[0] === 0x7f && buf[1] === 0xf0 &&
         buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeDoubleLE 写入 Infinity 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Infinity);

  // +Infinity: 0x7FF0000000000000 (LE)
  return buf[7] === 0x7f && buf[6] === 0xf0 &&
         buf[5] === 0x00 && buf[4] === 0x00;
});

test('writeDoubleBE 写入 -Infinity 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-Infinity);

  // -Infinity: 0xFFF0000000000000
  return buf[0] === 0xff && buf[1] === 0xf0 &&
         buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeDoubleLE 写入 -Infinity 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Infinity);

  // -Infinity: 0xFFF0000000000000 (LE)
  return buf[7] === 0xff && buf[6] === 0xf0 &&
         buf[5] === 0x00 && buf[4] === 0x00;
});

// 跨字节边界的值
test('writeDoubleBE 写入跨多个字节边界的值', () => {
  const buf = Buffer.alloc(8);
  const value = 12345.6789012345;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - value) < 1e-10;
});

test('writeDoubleLE 写入跨多个字节边界的值', () => {
  const buf = Buffer.alloc(8);
  const value = 12345.6789012345;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - value) < 1e-10;
});

// 次正规数（denormalized numbers）
test('writeDoubleBE 写入次正规数', () => {
  const buf = Buffer.alloc(8);
  const denorm = 2.2250738585072014e-308; // 接近最小正规数
  buf.writeDoubleBE(denorm);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - denorm) < 1e-320;
});

test('writeDoubleLE 写入次正规数', () => {
  const buf = Buffer.alloc(8);
  const denorm = 2.2250738585072014e-308;
  buf.writeDoubleLE(denorm);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - denorm) < 1e-320;
});

// 接近 overflow 的值
test('writeDoubleBE 写入接近溢出的值', () => {
  const buf = Buffer.alloc(8);
  const nearMax = 1.7976931348623157e+308; // 接近 MAX_VALUE
  buf.writeDoubleBE(nearMax);
  const readBack = buf.readDoubleBE();
  return readBack === nearMax;
});

test('writeDoubleLE 写入接近溢出的值', () => {
  const buf = Buffer.alloc(8);
  const nearMax = 1.7976931348623157e+308;
  buf.writeDoubleLE(nearMax);
  const readBack = buf.readDoubleLE();
  return readBack === nearMax;
});

// 特殊的科学计数值
test('writeDoubleBE 写入 1e-100', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1e-100);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - 1e-100) < 1e-115;
});

test('writeDoubleLE 写入 1e-100', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(1e-100);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - 1e-100) < 1e-115;
});

test('writeDoubleBE 写入 1e+100', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(1e100);
  const readBack = buf.readDoubleBE();
  return readBack === 1e100;
});

test('writeDoubleLE 写入 1e+100', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(1e100);
  const readBack = buf.readDoubleLE();
  return readBack === 1e100;
});

// 负的极端科学计数
test('writeDoubleBE 写入 -1e+100', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-1e100);
  const readBack = buf.readDoubleBE();
  return readBack === -1e100;
});

test('writeDoubleLE 写入 -1e+100', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-1e100);
  const readBack = buf.readDoubleLE();
  return readBack === -1e100;
});

// 多精度小数
test('writeDoubleBE 写入多位小数', () => {
  const buf = Buffer.alloc(8);
  const value = 0.123456789012345;
  buf.writeDoubleBE(value);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - value) < 1e-15;
});

test('writeDoubleLE 写入多位小数', () => {
  const buf = Buffer.alloc(8);
  const value = 0.123456789012345;
  buf.writeDoubleLE(value);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - value) < 1e-15;
});

// 质数值
test('writeDoubleBE 写入质数', () => {
  const buf = Buffer.alloc(8);
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];

  for (const p of primes) {
    buf.writeDoubleBE(p);
    if (buf.readDoubleBE() !== p) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 写入质数', () => {
  const buf = Buffer.alloc(8);
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];

  for (const p of primes) {
    buf.writeDoubleLE(p);
    if (buf.readDoubleLE() !== p) {
      return false;
    }
  }
  return true;
});

// 交替写入正负值
test('writeDoubleBE 交替写入正负值', () => {
  const buf = Buffer.alloc(80);

  for (let i = 0; i < 10; i++) {
    const value = i % 2 === 0 ? i * 1.1 : -i * 1.1;
    buf.writeDoubleBE(value, i * 8);
  }

  // 验证几个
  return Math.abs(buf.readDoubleBE(0) - 0) < 0.0001 &&
         Math.abs(buf.readDoubleBE(8) - (-1.1)) < 0.0001 &&
         Math.abs(buf.readDoubleBE(16) - 2.2) < 0.0001 &&
         Math.abs(buf.readDoubleBE(24) - (-3.3)) < 0.0001;
});

test('writeDoubleLE 交替写入正负值', () => {
  const buf = Buffer.alloc(80);

  for (let i = 0; i < 10; i++) {
    const value = i % 2 === 0 ? i * 1.1 : -i * 1.1;
    buf.writeDoubleLE(value, i * 8);
  }

  // 验证几个
  return Math.abs(buf.readDoubleLE(0) - 0) < 0.0001 &&
         Math.abs(buf.readDoubleLE(8) - (-1.1)) < 0.0001 &&
         Math.abs(buf.readDoubleLE(16) - 2.2) < 0.0001 &&
         Math.abs(buf.readDoubleLE(24) - (-3.3)) < 0.0001;
});

// 特殊角度值（弧度）
test('writeDoubleBE 写入角度弧度值', () => {
  const buf = Buffer.alloc(8);
  const angles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2, Math.PI];

  for (const angle of angles) {
    buf.writeDoubleBE(angle);
    const readBack = buf.readDoubleBE();
    if (Math.abs(readBack - angle) > 1e-15) {
      return false;
    }
  }
  return true;
});

test('writeDoubleLE 写入角度弧度值', () => {
  const buf = Buffer.alloc(8);
  const angles = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2, Math.PI];

  for (const angle of angles) {
    buf.writeDoubleLE(angle);
    const readBack = buf.readDoubleLE();
    if (Math.abs(readBack - angle) > 1e-15) {
      return false;
    }
  }
  return true;
});

// 黄金比例等特殊数学常数
test('writeDoubleBE 写入黄金比例', () => {
  const buf = Buffer.alloc(8);
  const golden = (1 + Math.sqrt(5)) / 2;
  buf.writeDoubleBE(golden);
  const readBack = buf.readDoubleBE();
  return Math.abs(readBack - golden) < 1e-15;
});

test('writeDoubleLE 写入黄金比例', () => {
  const buf = Buffer.alloc(8);
  const golden = (1 + Math.sqrt(5)) / 2;
  buf.writeDoubleLE(golden);
  const readBack = buf.readDoubleLE();
  return Math.abs(readBack - golden) < 1e-15;
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
