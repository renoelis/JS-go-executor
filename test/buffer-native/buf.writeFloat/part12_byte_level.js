// buf.writeFloatBE/LE() - 字节级精确验证测试
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

// 精确字节验证 - 特殊值
test('writeFloatBE 写入 0 的字节表示为 [0x00, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 0 的字节表示为 [0x00, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatBE 写入 -0 的字节表示为 [0x80, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(-0, 0);
  return buf[0] === 0x80 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 -0 的字节表示为 [0x00, 0x00, 0x00, 0x80]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(-0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x80;
});

test('writeFloatBE 写入 1.0 的字节表示为 [0x3f, 0x80, 0x00, 0x00]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(1.0, 0);
  return buf[0] === 0x3f && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 1.0 的字节表示为 [0x00, 0x00, 0x80, 0x3f]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(1.0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0x3f;
});

test('writeFloatBE 写入 -1.0 的字节表示为 [0xbf, 0x80, 0x00, 0x00]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(-1.0, 0);
  return buf[0] === 0xbf && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 -1.0 的字节表示为 [0x00, 0x00, 0x80, 0xbf]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(-1.0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0xbf;
});

test('writeFloatBE 写入 Infinity 的字节表示为 [0x7f, 0x80, 0x00, 0x00]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(Infinity, 0);
  return buf[0] === 0x7f && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 Infinity 的字节表示为 [0x00, 0x00, 0x80, 0x7f]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(Infinity, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0x7f;
});

test('writeFloatBE 写入 -Infinity 的字节表示为 [0xff, 0x80, 0x00, 0x00]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(-Infinity, 0);
  return buf[0] === 0xff && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 -Infinity 的字节表示为 [0x00, 0x00, 0x80, 0xff]', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(-Infinity, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0xff;
});

// BE/LE 字节序镜像验证
test('相同值 BE 和 LE 的字节序完全镜像 - 测试值 2.5', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeFloatBE(2.5, 0);
  bufLE.writeFloatLE(2.5, 0);
  return bufBE[0] === bufLE[3] && bufBE[1] === bufLE[2] &&
         bufBE[2] === bufLE[1] && bufBE[3] === bufLE[0];
});

test('相同值 BE 和 LE 的字节序完全镜像 - 测试值 -3.14', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeFloatBE(-3.14, 0);
  bufLE.writeFloatLE(-3.14, 0);
  return bufBE[0] === bufLE[3] && bufBE[1] === bufLE[2] &&
         bufBE[2] === bufLE[1] && bufBE[3] === bufLE[0];
});

test('相同值 BE 和 LE 的字节序完全镜像 - 测试值 123.456', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeFloatBE(123.456, 0);
  bufLE.writeFloatLE(123.456, 0);
  return bufBE[0] === bufLE[3] && bufBE[1] === bufLE[2] &&
         bufBE[2] === bufLE[1] && bufBE[3] === bufLE[0];
});

test('多个特殊值的字节序都镜像', () => {
  const values = [0, -0, 1, -1, Infinity, -Infinity];
  return values.every(val => {
    const bufBE = Buffer.allocUnsafe(4);
    const bufLE = Buffer.allocUnsafe(4);
    bufBE.writeFloatBE(val, 0);
    bufLE.writeFloatLE(val, 0);
    return bufBE[0] === bufLE[3] && bufBE[1] === bufLE[2] &&
           bufBE[2] === bufLE[1] && bufBE[3] === bufLE[0];
  });
});

// 精确数值的字节级验证
test('writeFloatBE 写入 0.5 的精确字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(0.5, 0);
  return buf[0] === 0x3f && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 0.5 的精确字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(0.5, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x3f;
});

test('writeFloatBE 写入 2.0 的精确字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(2.0, 0);
  return buf[0] === 0x40 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 写入 2.0 的精确字节', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(2.0, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x40;
});

// NaN 的字节表示验证
test('writeFloatBE 写入 NaN 的指数部分全为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatBE(NaN, 0);
  return (buf[0] & 0x7f) === 0x7f && (buf[1] & 0x80) !== 0;
});

test('writeFloatLE 写入 NaN 的指数部分全为 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(NaN, 0);
  return (buf[3] & 0x7f) === 0x7f && (buf[2] & 0x80) !== 0;
});

// 验证不同位置写入不影响其他字节
test('writeFloatBE 只修改指定的 4 字节', () => {
  const buf = Buffer.alloc(12, 0xff);
  buf.writeFloatBE(1.5, 4);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff &&
         buf[8] === 0xff && buf[9] === 0xff && buf[10] === 0xff && buf[11] === 0xff;
});

test('writeFloatLE 只修改指定的 4 字节', () => {
  const buf = Buffer.alloc(12, 0xff);
  buf.writeFloatLE(1.5, 4);
  return buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff && buf[3] === 0xff &&
         buf[8] === 0xff && buf[9] === 0xff && buf[10] === 0xff && buf[11] === 0xff;
});

// 边界浮点数的字节表示
test('writeFloatBE 最小正规化数的字节表示', () => {
  const buf = Buffer.allocUnsafe(4);
  const minNormal = 1.1754943508222875e-38;
  buf.writeFloatBE(minNormal, 0);
  return buf[0] === 0x00 && buf[1] === 0x80 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('writeFloatLE 最小正规化数的字节表示', () => {
  const buf = Buffer.allocUnsafe(4);
  const minNormal = 1.1754943508222875e-38;
  buf.writeFloatLE(minNormal, 0);
  return buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x80 && buf[3] === 0x00;
});

// 验证写入后每个字节都在有效范围
test('writeFloatBE 写入任意值后所有字节在 0-255 范围', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [0, 1, -1, 3.14, -2.71, 999.999, Infinity, -Infinity];
  return values.every(val => {
    buf.writeFloatBE(val, 0);
    return buf[0] >= 0 && buf[0] <= 255 &&
           buf[1] >= 0 && buf[1] <= 255 &&
           buf[2] >= 0 && buf[2] <= 255 &&
           buf[3] >= 0 && buf[3] <= 255;
  });
});

test('writeFloatLE 写入任意值后所有字节在 0-255 范围', () => {
  const buf = Buffer.allocUnsafe(4);
  const values = [0, 1, -1, 3.14, -2.71, 999.999, Infinity, -Infinity];
  return values.every(val => {
    buf.writeFloatLE(val, 0);
    return buf[0] >= 0 && buf[0] <= 255 &&
           buf[1] >= 0 && buf[1] <= 255 &&
           buf[2] >= 0 && buf[2] <= 255 &&
           buf[3] >= 0 && buf[3] <= 255;
  });
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
