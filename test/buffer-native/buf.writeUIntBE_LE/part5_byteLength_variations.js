// buf.writeUIntBE/LE() - byteLength 变化测试
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

// 不同 byteLength 的零值写入
test('writeUIntBE 1字节零值', () => {
  const buf = Buffer.from([0xff]);
  buf.writeUIntBE(0, 0, 1);
  return buf[0] === 0;
});

test('writeUIntBE 2字节零值', () => {
  const buf = Buffer.from([0xff, 0xff]);
  buf.writeUIntBE(0, 0, 2);
  return buf[0] === 0 && buf[1] === 0;
});

test('writeUIntBE 3字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff]);
  buf.writeUIntBE(0, 0, 3);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('writeUIntBE 4字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntBE(0, 0, 4);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

test('writeUIntBE 5字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntBE(0, 0, 5);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0 && buf[4] === 0;
});

test('writeUIntBE 6字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntBE(0, 0, 6);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0 && buf[4] === 0 && buf[5] === 0;
});

test('writeUIntLE 1字节零值', () => {
  const buf = Buffer.from([0xff]);
  buf.writeUIntLE(0, 0, 1);
  return buf[0] === 0;
});

test('writeUIntLE 2字节零值', () => {
  const buf = Buffer.from([0xff, 0xff]);
  buf.writeUIntLE(0, 0, 2);
  return buf[0] === 0 && buf[1] === 0;
});

test('writeUIntLE 3字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff]);
  buf.writeUIntLE(0, 0, 3);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('writeUIntLE 4字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntLE(0, 0, 4);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

test('writeUIntLE 5字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntLE(0, 0, 5);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0 && buf[4] === 0;
});

test('writeUIntLE 6字节零值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  buf.writeUIntLE(0, 0, 6);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0 && buf[4] === 0 && buf[5] === 0;
});

// 不同 byteLength 的 1 值写入
test('writeUIntBE 1字节值 1', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUIntBE(1, 0, 1);
  return buf[0] === 1;
});

test('writeUIntBE 2字节值 1', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUIntBE(1, 0, 2);
  return buf[0] === 0 && buf[1] === 1;
});

test('writeUIntBE 3字节值 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(1, 0, 3);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1;
});

test('writeUIntLE 1字节值 1', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUIntLE(1, 0, 1);
  return buf[0] === 1;
});

test('writeUIntLE 2字节值 1', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUIntLE(1, 0, 2);
  return buf[0] === 1 && buf[1] === 0;
});

test('writeUIntLE 3字节值 1', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(1, 0, 3);
  return buf[0] === 1 && buf[1] === 0 && buf[2] === 0;
});

// 所有 byteLength 的具体值验证
test('writeUIntBE byteLength=1 value=0x42', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUIntBE(0x42, 0, 1);
  return buf[0] === 0x42;
});

test('writeUIntBE byteLength=2 value=0x1234', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUIntBE(0x1234, 0, 2);
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUIntBE byteLength=3 value=0x123456', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntBE(0x123456, 0, 3);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56;
});

test('writeUIntBE byteLength=4 value=0x12345678', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.writeUIntBE(0x12345678, 0, 4);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('writeUIntBE byteLength=5 value=0x123456789a', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntBE(0x123456789a, 0, 5);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78 && buf[4] === 0x9a;
});

test('writeUIntBE byteLength=6 value=0x123456789abc', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.writeUIntBE(0x123456789abc, 0, 6);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78 && buf[4] === 0x9a && buf[5] === 0xbc;
});

test('writeUIntLE byteLength=1 value=0x42', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeUIntLE(0x42, 0, 1);
  return buf[0] === 0x42;
});

test('writeUIntLE byteLength=2 value=0x1234', () => {
  const buf = Buffer.allocUnsafe(3);
  buf.writeUIntLE(0x1234, 0, 2);
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUIntLE byteLength=3 value=0x123456', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUIntLE(0x123456, 0, 3);
  return buf[0] === 0x56 && buf[1] === 0x34 && buf[2] === 0x12;
});

test('writeUIntLE byteLength=4 value=0x12345678', () => {
  const buf = Buffer.allocUnsafe(5);
  buf.writeUIntLE(0x12345678, 0, 4);
  return buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('writeUIntLE byteLength=5 value=0x123456789a', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.writeUIntLE(0x123456789a, 0, 5);
  return buf[0] === 0x9a && buf[1] === 0x78 && buf[2] === 0x56 && buf[3] === 0x34 && buf[4] === 0x12;
});

test('writeUIntLE byteLength=6 value=0x123456789abc', () => {
  const buf = Buffer.allocUnsafe(7);
  buf.writeUIntLE(0x123456789abc, 0, 6);
  return buf[0] === 0xbc && buf[1] === 0x9a && buf[2] === 0x78 && buf[3] === 0x56 && buf[4] === 0x34 && buf[5] === 0x12;
});

// 同一 buffer 不同 byteLength 写入
test('writeUIntBE 同一位置不同 byteLength', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeUIntBE(0x12, 0, 1);
  buf2.writeUIntBE(0x12, 0, 2);
  return buf1[0] === 0x12 && buf2[0] === 0x00 && buf2[1] === 0x12;
});

test('writeUIntLE 同一位置不同 byteLength', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeUIntLE(0x12, 0, 1);
  buf2.writeUIntLE(0x12, 0, 2);
  return buf1[0] === 0x12 && buf2[0] === 0x12 && buf2[1] === 0x00;
});

// 高位截断测试
test('writeUIntBE 值大于 byteLength 能表示的范围（高位截断）', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntBE(0xabcd, 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE 值大于 byteLength 能表示的范围（高位截断）', () => {
  const buf = Buffer.allocUnsafe(4);
  try {
    buf.writeUIntLE(0xabcd, 0, 1);
    return false;
  } catch (e) {
    return true;
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
