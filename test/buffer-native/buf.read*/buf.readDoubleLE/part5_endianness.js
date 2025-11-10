// buf.readDoubleLE() - 字节序（Endianness）专项测试
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

// Little-Endian vs Big-Endian 对比
test('LE vs BE - 不同值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const le = buf.readDoubleLE(0);
  const be = buf.readDoubleBE(0);
  return le !== be && le === 5.447603722011605e-270;
});

test('LE vs BE - 对称值', () => {
  const buf = Buffer.from([0x18, 0x2D, 0x44, 0x54, 0xFB, 0x21, 0x09, 0x40]);
  const le = buf.readDoubleLE(0);
  const reversedBuf = Buffer.from([0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18]);
  const be = reversedBuf.readDoubleBE(0);
  return Math.abs(le - be) < 1e-15;
});

// IEEE 754 格式验证（Little-Endian）
test('1.0 的 IEEE 754 表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F]);
  return buf.readDoubleLE(0) === 1.0;
});

test('2.0 的 IEEE 754 表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x40]);
  return buf.readDoubleLE(0) === 2.0;
});

test('-1.0 的 IEEE 754 表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0xBF]);
  return buf.readDoubleLE(0) === -1.0;
});

test('0.5 的 IEEE 754 表示', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x3F]);
  return buf.readDoubleLE(0) === 0.5;
});

test('Math.PI 的 IEEE 754 表示', () => {
  const buf = Buffer.from([0x18, 0x2D, 0x44, 0x54, 0xFB, 0x21, 0x09, 0x40]);
  return Math.abs(buf.readDoubleLE(0) - Math.PI) < 1e-15;
});

test('Math.E 的 IEEE 754 表示', () => {
  const buf = Buffer.from([0x69, 0x57, 0x14, 0x8B, 0x0A, 0xBF, 0x05, 0x40]);
  return Math.abs(buf.readDoubleLE(0) - Math.E) < 1e-15;
});

// Little-Endian 特性：低位字节在前
test('最后一个字节影响符号位和指数', () => {
  const buf1 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F]);
  const buf2 = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0xBF]);
  return buf1.readDoubleLE(0) === 1.0 && buf2.readDoubleLE(0) === -1.0;
});

// 写入 LE 读取 LE
test('writeDoubleLE + readDoubleLE 一致性', () => {
  const buf = Buffer.alloc(8);
  const value = 123456789.987654321;
  buf.writeDoubleLE(value, 0);
  return buf.readDoubleLE(0) === value;
});

// 写入 BE 读取 LE（应该不同）
test('writeDoubleBE + readDoubleLE 不同', () => {
  const buf = Buffer.alloc(8);
  const value = 123456789.987654321;
  buf.writeDoubleBE(value, 0);
  const leValue = buf.readDoubleLE(0);
  return leValue !== value;
});

// 全 0xFF 测试
test('所有字节 0xFF（NaN）', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  return Number.isNaN(buf.readDoubleLE(0));
});

// 全 0x00 测试
test('所有字节 0x00（零）', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readDoubleLE(0) === 0;
});

// 递增序列
test('递增序列 0x01-0x08', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  return buf.readDoubleLE(0) === 5.447603722011605e-270;
});

// 递减序列
test('递减序列 0x08-0x01', () => {
  const buf = Buffer.from([0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]);
  const result = buf.readDoubleLE(0);
  return !Number.isNaN(result);
});

// 交替模式
test('交替模式 0xAA', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  const result = buf.readDoubleLE(0);
  return !Number.isNaN(result) && typeof result === 'number';
});

test('交替模式 0x55', () => {
  const buf = Buffer.from([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55]);
  const result = buf.readDoubleLE(0);
  return !Number.isNaN(result);
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
