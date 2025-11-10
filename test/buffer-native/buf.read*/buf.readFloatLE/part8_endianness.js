// buf.readFloatLE() - 字节序测试
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

// LE vs BE 对比
test('LE vs BE 字节序差异（相同字节不同顺序）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const le = buf.readFloatLE(0);
  const be = buf.readFloatBE(0);
  return le !== be;
});

test('LE 字节序正确性：1.0', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x3F]);
  return buf.readFloatLE(0) === 1.0;
});

test('BE 字节序与 LE 相反：1.0', () => {
  const bufLE = Buffer.from([0x00, 0x00, 0x80, 0x3F]); // LE: 1.0
  const bufBE = Buffer.from([0x3F, 0x80, 0x00, 0x00]); // BE: 1.0
  return bufLE.readFloatLE(0) === bufBE.readFloatBE(0);
});

// 特殊值的字节序
test('Infinity LE 字节序', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0x7F]);
  return buf.readFloatLE(0) === Infinity;
});

test('-Infinity LE 字节序', () => {
  const buf = Buffer.from([0x00, 0x00, 0x80, 0xFF]);
  return buf.readFloatLE(0) === -Infinity;
});

test('NaN LE 字节序', () => {
  const buf = Buffer.from([0x00, 0x00, 0xC0, 0x7F]);
  return Number.isNaN(buf.readFloatLE(0));
});

// 往返测试（LE）
test('writeFloatLE + readFloatLE 往返一致', () => {
  const buf = Buffer.alloc(4);
  const value = 3.14159;
  buf.writeFloatLE(value, 0);
  const result = buf.readFloatLE(0);
  return Math.abs(result - value) < 0.001;
});

test('writeFloatBE + readFloatLE 字节序不匹配', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(1.0, 0);
  const result = buf.readFloatLE(0);
  return result !== 1.0; // 字节序错误，结果应该不同
});

// 读取预定义字节序列
test('读取 π 的 LE 字节表示', () => {
  const buf = Buffer.from([0xDB, 0x0F, 0x49, 0x40]);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 3.14159) < 0.001;
});

test('读取 e 的 LE 字节表示', () => {
  const buf = Buffer.from([0x54, 0xF8, 0x2D, 0x40]);
  const result = buf.readFloatLE(0);
  return Math.abs(result - 2.71828) < 0.001;
});

// LE 字节顺序验证
test('LE 字节序：低位字节在前', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.0, 0);
  // LE: [0x00, 0x00, 0x80, 0x3F]
  // 最低位字节 0x00 在 index 0
  return buf[0] === 0x00 && buf[3] === 0x3F;
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
