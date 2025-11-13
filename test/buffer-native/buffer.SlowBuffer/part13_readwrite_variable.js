// Buffer.allocUnsafeSlow - 遗漏的 read/write 方法补充测试
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

// readIntLE / writeIntLE (可变字节数)
test('writeIntLE 和 readIntLE 1 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntLE(127, 0, 1);
  return buf.readIntLE(0, 1) === 127;
});

test('writeIntLE 和 readIntLE 2 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntLE(32767, 0, 2);
  return buf.readIntLE(0, 2) === 32767;
});

test('writeIntLE 和 readIntLE 3 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntLE(8388607, 0, 3);
  return buf.readIntLE(0, 3) === 8388607;
});

test('writeIntLE 和 readIntLE 4 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntLE(2147483647, 0, 4);
  return buf.readIntLE(0, 4) === 2147483647;
});

test('writeIntLE 和 readIntLE 5 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntLE(549755813887, 0, 5);
  return buf.readIntLE(0, 5) === 549755813887;
});

test('writeIntLE 和 readIntLE 6 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntLE(140737488355327, 0, 6);
  return buf.readIntLE(0, 6) === 140737488355327;
});

test('writeIntLE 负数', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeIntLE(-1000, 0, 2);
  return buf.readIntLE(0, 2) === -1000;
});

// readIntBE / writeIntBE (可变字节数)
test('writeIntBE 和 readIntBE 1 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntBE(127, 0, 1);
  return buf.readIntBE(0, 1) === 127;
});

test('writeIntBE 和 readIntBE 2 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntBE(32767, 0, 2);
  return buf.readIntBE(0, 2) === 32767;
});

test('writeIntBE 和 readIntBE 3 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntBE(8388607, 0, 3);
  return buf.readIntBE(0, 3) === 8388607;
});

test('writeIntBE 和 readIntBE 6 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeIntBE(140737488355327, 0, 6);
  return buf.readIntBE(0, 6) === 140737488355327;
});

test('writeIntBE 字节序验证', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeIntBE(0x12345678, 0, 4);
  return buf[0] === 0x12 && buf[3] === 0x78;
});

// readUIntLE / writeUIntLE (可变字节数)
test('writeUIntLE 和 readUIntLE 1 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntLE(255, 0, 1);
  return buf.readUIntLE(0, 1) === 255;
});

test('writeUIntLE 和 readUIntLE 2 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntLE(65535, 0, 2);
  return buf.readUIntLE(0, 2) === 65535;
});

test('writeUIntLE 和 readUIntLE 3 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntLE(16777215, 0, 3);
  return buf.readUIntLE(0, 3) === 16777215;
});

test('writeUIntLE 和 readUIntLE 4 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntLE(4294967295, 0, 4);
  return buf.readUIntLE(0, 4) === 4294967295;
});

test('writeUIntLE 和 readUIntLE 5 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntLE(1099511627775, 0, 5);
  return buf.readUIntLE(0, 5) === 1099511627775;
});

test('writeUIntLE 和 readUIntLE 6 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntLE(281474976710655, 0, 6);
  return buf.readUIntLE(0, 6) === 281474976710655;
});

// readUIntBE / writeUIntBE (可变字节数)
test('writeUIntBE 和 readUIntBE 1 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntBE(255, 0, 1);
  return buf.readUIntBE(0, 1) === 255;
});

test('writeUIntBE 和 readUIntBE 2 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntBE(65535, 0, 2);
  return buf.readUIntBE(0, 2) === 65535;
});

test('writeUIntBE 和 readUIntBE 3 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntBE(16777215, 0, 3);
  return buf.readUIntBE(0, 3) === 16777215;
});

test('writeUIntBE 和 readUIntBE 6 字节', () => {
  const buf = Buffer.allocUnsafeSlow(6);
  buf.writeUIntBE(281474976710655, 0, 6);
  return buf.readUIntBE(0, 6) === 281474976710655;
});

test('writeUIntBE 字节序验证', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeUIntBE(0x12345678, 0, 4);
  return buf[0] === 0x12 && buf[3] === 0x78;
});

// readFloatBE / writeFloatBE
test('writeFloatBE 和 readFloatBE', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeFloatBE(3.14, 0);
  const val = buf.readFloatBE(0);
  return Math.abs(val - 3.14) < 0.01;
});

test('writeFloatBE 字节序验证', () => {
  const buf1 = Buffer.allocUnsafeSlow(4);
  const buf2 = Buffer.allocUnsafeSlow(4);
  buf1.writeFloatBE(3.14, 0);
  buf2.writeFloatLE(3.14, 0);
  return buf1[0] !== buf2[0];
});

// readDoubleBE / writeDoubleBE
test('writeDoubleBE 和 readDoubleBE', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleBE(3.141592653589793, 0);
  const val = buf.readDoubleBE(0);
  return Math.abs(val - 3.141592653589793) < 0.0000000001;
});

test('writeDoubleBE 字节序验证', () => {
  const buf1 = Buffer.allocUnsafeSlow(8);
  const buf2 = Buffer.allocUnsafeSlow(8);
  buf1.writeDoubleBE(3.14, 0);
  buf2.writeDoubleLE(3.14, 0);
  return buf1[0] !== buf2[0];
});

// 偏移量测试
test('writeIntLE 支持偏移量', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.writeIntLE(1000, 5, 2);
  return buf.readIntLE(5, 2) === 1000;
});

test('writeUIntBE 支持偏移量', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.writeUIntBE(60000, 3, 3);
  return buf.readUIntBE(3, 3) === 60000;
});

// 边界测试
test('writeIntLE 最小值 1 字节', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeIntLE(-128, 0, 1);
  return buf.readIntLE(0, 1) === -128;
});

test('writeIntLE 最大值 1 字节', () => {
  const buf = Buffer.allocUnsafeSlow(2);
  buf.writeIntLE(127, 0, 1);
  return buf.readIntLE(0, 1) === 127;
});

test('writeUIntLE 最大值 3 字节', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  buf.writeUIntLE(16777215, 0, 3);
  return buf.readUIntLE(0, 3) === 16777215;
});

// 越界测试
test('writeIntLE 越界抛出错误', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  try {
    buf.writeIntLE(1000, 3, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('readUIntBE 越界抛出错误', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  try {
    buf.readUIntBE(3, 3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 无效字节长度
test('writeIntLE 字节长度为 0 抛出错误', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  try {
    buf.writeIntLE(100, 0, 0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('writeUIntBE 字节长度超过 6 抛出错误', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  try {
    buf.writeUIntBE(100, 0, 7);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
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
