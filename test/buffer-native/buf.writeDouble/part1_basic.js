// buf.writeDoubleBE/LE - Basic Functionality Tests
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

// 基本写入测试 - writeDoubleBE
test('writeDoubleBE 基本功能 - 默认 offset', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleBE(1.0);
  return result === 8 && buf[0] === 0x3f && buf[1] === 0xf0;
});

test('writeDoubleBE 基本功能 - 指定 offset', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleBE(2.5, 4);
  return result === 12 && buf[4] === 0x40 && buf[5] === 0x04;
});

test('writeDoubleBE 写入正数', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(123.456);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const readBack = view.getFloat64(0, false);
  return Math.abs(readBack - 123.456) < 0.0001;
});

test('writeDoubleBE 写入负数', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(-987.654);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const readBack = view.getFloat64(0, false);
  return Math.abs(readBack - (-987.654)) < 0.0001;
});

test('writeDoubleBE 写入零', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(0);
  return buf.every(byte => byte === 0);
});

// 基本写入测试 - writeDoubleLE
test('writeDoubleLE 基本功能 - 默认 offset', () => {
  const buf = Buffer.alloc(8);
  const result = buf.writeDoubleLE(1.0);
  return result === 8 && buf[7] === 0x3f && buf[6] === 0xf0;
});

test('writeDoubleLE 基本功能 - 指定 offset', () => {
  const buf = Buffer.alloc(16);
  const result = buf.writeDoubleLE(2.5, 4);
  return result === 12 && buf[11] === 0x40 && buf[10] === 0x04;
});

test('writeDoubleLE 写入正数', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(123.456);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const readBack = view.getFloat64(0, true);
  return Math.abs(readBack - 123.456) < 0.0001;
});

test('writeDoubleLE 写入负数', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(-987.654);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const readBack = view.getFloat64(0, true);
  return Math.abs(readBack - (-987.654)) < 0.0001;
});

test('writeDoubleLE 写入零', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(0);
  return buf.every(byte => byte === 0);
});

// 返回值测试
test('writeDoubleBE 返回正确的 offset + 8', () => {
  const buf = Buffer.alloc(24);
  const r1 = buf.writeDoubleBE(1.0, 0);
  const r2 = buf.writeDoubleBE(2.0, 8);
  const r3 = buf.writeDoubleBE(3.0, 16);
  return r1 === 8 && r2 === 16 && r3 === 24;
});

test('writeDoubleLE 返回正确的 offset + 8', () => {
  const buf = Buffer.alloc(24);
  const r1 = buf.writeDoubleLE(1.0, 0);
  const r2 = buf.writeDoubleLE(2.0, 8);
  const r3 = buf.writeDoubleLE(3.0, 16);
  return r1 === 8 && r2 === 16 && r3 === 24;
});

// 大端序与小端序差异验证
test('BE vs LE 字节序差异', () => {
  const bufBE = Buffer.alloc(8);
  const bufLE = Buffer.alloc(8);
  bufBE.writeDoubleBE(12345.6789);
  bufLE.writeDoubleLE(12345.6789);

  // 字节序应该相反
  for (let i = 0; i < 8; i++) {
    if (bufBE[i] !== bufLE[7 - i]) {
      return false;
    }
  }
  return true;
});

// 连续写入多个值
test('连续写入多个 double 值 - BE', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleBE(1.1, 0);
  buf.writeDoubleBE(2.2, 8);
  buf.writeDoubleBE(3.3, 16);

  const v1 = buf.readDoubleBE(0);
  const v2 = buf.readDoubleBE(8);
  const v3 = buf.readDoubleBE(16);

  return Math.abs(v1 - 1.1) < 0.0001 &&
         Math.abs(v2 - 2.2) < 0.0001 &&
         Math.abs(v3 - 3.3) < 0.0001;
});

test('连续写入多个 double 值 - LE', () => {
  const buf = Buffer.alloc(24);
  buf.writeDoubleLE(1.1, 0);
  buf.writeDoubleLE(2.2, 8);
  buf.writeDoubleLE(3.3, 16);

  const v1 = buf.readDoubleLE(0);
  const v2 = buf.readDoubleLE(8);
  const v3 = buf.readDoubleLE(16);

  return Math.abs(v1 - 1.1) < 0.0001 &&
         Math.abs(v2 - 2.2) < 0.0001 &&
         Math.abs(v3 - 3.3) < 0.0001;
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
