// buf.writeDoubleBE/LE - Deep Round 6-2: Byte-Level Verification Tests
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

// 特定值的字节模式验证 - IEEE 754 标准
test('writeDoubleBE 0.15625 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0.15625); // 2^-3 + 2^-5
  // 0x3FC4000000000000
  return buf[0] === 0x3f && buf[1] === 0xc4 &&
         buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeDoubleLE 0.15625 的字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0.15625);
  // 0x3FC4000000000000 (LE)
  return buf[7] === 0x3f && buf[6] === 0xc4 &&
         buf[5] === 0x00 && buf[4] === 0x00;
});

// 正负零的符号位差异
test('writeDoubleBE +0 符号位为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0);
  return buf[0] === 0x00;
});

test('writeDoubleBE -0 符号位为 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-0);
  return buf[0] === 0x80;
});

test('writeDoubleLE +0 符号位为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0);
  return buf[7] === 0x00;
});

test('writeDoubleLE -0 符号位为 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-0);
  return buf[7] === 0x80;
});

// +0 和 -0 其余字节都是 0
test('writeDoubleBE +0 其余字节全为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0);
  return buf[1] === 0 && buf[2] === 0 && buf[3] === 0 &&
         buf[4] === 0 && buf[5] === 0 && buf[6] === 0 && buf[7] === 0;
});

test('writeDoubleBE -0 其余字节全为 0', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-0);
  return buf[1] === 0 && buf[2] === 0 && buf[3] === 0 &&
         buf[4] === 0 && buf[5] === 0 && buf[6] === 0 && buf[7] === 0;
});

// 最小正规数字节模式
test('writeDoubleBE 最小正规数字节模式', () => {
  const buf = Buffer.alloc(8);
  const minNormal = 2.2250738585072014e-308;
  buf.writeDoubleBE(minNormal);
  // 0x0010000000000000
  return buf[0] === 0x00 && buf[1] === 0x10;
});

test('writeDoubleLE 最小正规数字节模式', () => {
  const buf = Buffer.alloc(8);
  const minNormal = 2.2250738585072014e-308;
  buf.writeDoubleLE(minNormal);
  // 0x0010000000000000 (LE)
  return buf[7] === 0x00 && buf[6] === 0x10;
});

// 最小次正规数字节模式
test('writeDoubleBE 最小次正规数字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Number.MIN_VALUE);
  // 0x0000000000000001
  return buf[0] === 0x00 && buf[1] === 0x00 &&
         buf[6] === 0x00 && buf[7] === 0x01;
});

test('writeDoubleLE 最小次正规数字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Number.MIN_VALUE);
  // 0x0000000000000001 (LE)
  return buf[7] === 0x00 && buf[6] === 0x00 &&
         buf[1] === 0x00 && buf[0] === 0x01;
});

// +Infinity 字节模式完整验证
test('writeDoubleBE +Infinity 完整字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Infinity);
  // 0x7FF0000000000000
  return buf[0] === 0x7f && buf[1] === 0xf0 &&
         buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 &&
         buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeDoubleLE +Infinity 完整字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Infinity);
  // 0x7FF0000000000000 (LE)
  return buf[7] === 0x7f && buf[6] === 0xf0 &&
         buf[5] === 0x00 && buf[4] === 0x00 &&
         buf[3] === 0x00 && buf[2] === 0x00 &&
         buf[1] === 0x00 && buf[0] === 0x00;
});

// -Infinity 字节模式完整验证
test('writeDoubleBE -Infinity 完整字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-Infinity);
  // 0xFFF0000000000000
  return buf[0] === 0xff && buf[1] === 0xf0 &&
         buf[2] === 0x00 && buf[3] === 0x00 &&
         buf[4] === 0x00 && buf[5] === 0x00 &&
         buf[6] === 0x00 && buf[7] === 0x00;
});

test('writeDoubleLE -Infinity 完整字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-Infinity);
  // 0xFFF0000000000000 (LE)
  return buf[7] === 0xff && buf[6] === 0xf0 &&
         buf[5] === 0x00 && buf[4] === 0x00 &&
         buf[3] === 0x00 && buf[2] === 0x00 &&
         buf[1] === 0x00 && buf[0] === 0x00;
});

// NaN 字节模式（符号位可能不同）
test('writeDoubleBE NaN 指数部分全 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(NaN);
  // 指数部分：0x7FF (11位全1)
  return buf[0] === 0x7f && buf[1] === 0xf8;
});

test('writeDoubleLE NaN 指数部分全 1', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(NaN);
  // 指数部分：0x7FF (11位全1) (LE)
  return buf[7] === 0x7f && buf[6] === 0xf8;
});

// 0.5 的字节模式
test('writeDoubleBE 0.5 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0.5);
  // 0x3FE0000000000000
  return buf[0] === 0x3f && buf[1] === 0xe0;
});

test('writeDoubleLE 0.5 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0.5);
  // 0x3FE0000000000000 (LE)
  return buf[7] === 0x3f && buf[6] === 0xe0;
});

// -1.0 的字节模式
test('writeDoubleBE -1.0 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-1.0);
  // 0xBFF0000000000000
  return buf[0] === 0xbf && buf[1] === 0xf0;
});

test('writeDoubleLE -1.0 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-1.0);
  // 0xBFF0000000000000 (LE)
  return buf[7] === 0xbf && buf[6] === 0xf0;
});

// 3.0 的字节模式
test('writeDoubleBE 3.0 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(3.0);
  // 0x4008000000000000
  return buf[0] === 0x40 && buf[1] === 0x08;
});

test('writeDoubleLE 3.0 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(3.0);
  // 0x4008000000000000 (LE)
  return buf[7] === 0x40 && buf[6] === 0x08;
});

// 0.1 的字节模式（二进制循环小数）
test('writeDoubleBE 0.1 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0.1);
  // 0x3FB999999999999A
  return buf[0] === 0x3f && buf[1] === 0xb9;
});

test('writeDoubleLE 0.1 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0.1);
  // 0x3FB999999999999A (LE)
  return buf[7] === 0x3f && buf[6] === 0xb9;
});

// Math.PI 的字节模式
test('writeDoubleBE Math.PI 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.PI);
  // 0x400921FB54442D18
  return buf[0] === 0x40 && buf[1] === 0x09;
});

test('writeDoubleLE Math.PI 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.PI);
  // 0x400921FB54442D18 (LE)
  return buf[7] === 0x40 && buf[6] === 0x09;
});

// Math.E 的字节模式
test('writeDoubleBE Math.E 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(Math.E);
  // 0x4005BF0A8B145769
  return buf[0] === 0x40 && buf[1] === 0x05;
});

test('writeDoubleLE Math.E 字节模式', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(Math.E);
  // 0x4005BF0A8B145769 (LE)
  return buf[7] === 0x40 && buf[6] === 0x05;
});

// 非对齐写入不影响前后字节
test('writeDoubleBE offset=1 不影响 offset=0', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xff);
  buf.writeDoubleBE(123.456, 1);
  return buf[0] === 0xff;
});

test('writeDoubleBE offset=1 不影响 offset=9', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xaa);
  buf.writeDoubleBE(123.456, 1);
  return buf[9] === 0xaa && buf[10] === 0xaa;
});

test('writeDoubleLE offset=3 不影响前后', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0x55);
  buf.writeDoubleLE(789.012, 3);
  return buf[0] === 0x55 && buf[1] === 0x55 &&
         buf[2] === 0x55 && buf[11] === 0x55;
});

// BE 和 LE 字节完全相反
test('writeDouble BE 和 LE 字节完全镜像', () => {
  const bufBE = Buffer.alloc(8);
  const bufLE = Buffer.alloc(8);
  const value = 12345.6789;

  bufBE.writeDoubleBE(value);
  bufLE.writeDoubleLE(value);

  for (let i = 0; i < 8; i++) {
    if (bufBE[i] !== bufLE[7 - i]) {
      return false;
    }
  }
  return true;
});

// 多个不同值的字节序镜像验证
test('writeDouble 多个值的 BE/LE 镜像', () => {
  const values = [0, 1, -1, 0.5, -0.5, 100, -100, 3.14];

  for (const val of values) {
    const bufBE = Buffer.alloc(8);
    const bufLE = Buffer.alloc(8);

    bufBE.writeDoubleBE(val);
    bufLE.writeDoubleLE(val);

    for (let i = 0; i < 8; i++) {
      if (bufBE[i] !== bufLE[7 - i]) {
        return false;
      }
    }
  }
  return true;
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
