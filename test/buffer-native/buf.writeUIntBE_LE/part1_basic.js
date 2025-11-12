// buf.writeUIntBE/LE() - 基本功能测试
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

// 基本写入功能 - BE
test('writeUIntBE 基本写入 1 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(0x12, 0, 1);
  return result === 1 && buf[0] === 0x12;
});

test('writeUIntBE 基本写入 2 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x12 && buf[1] === 0x34;
});

test('writeUIntBE 基本写入 3 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(0x123456, 0, 3);
  return result === 3 && buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56;
});

test('writeUIntBE 基本写入 4 字节', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeUIntBE(0x12345678, 0, 4);
  return result === 4 && buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('writeUIntBE 基本写入 5 字节', () => {
  const buf = Buffer.allocUnsafe(6);
  const result = buf.writeUIntBE(0x123456789a, 0, 5);
  return result === 5 && buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78 && buf[4] === 0x9a;
});

test('writeUIntBE 基本写入 6 字节', () => {
  const buf = Buffer.allocUnsafe(7);
  const result = buf.writeUIntBE(0x123456789abc, 0, 6);
  return result === 6 && buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78 && buf[4] === 0x9a && buf[5] === 0xbc;
});

// 基本写入功能 - LE
test('writeUIntLE 基本写入 1 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(0x12, 0, 1);
  return result === 1 && buf[0] === 0x12;
});

test('writeUIntLE 基本写入 2 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(0x1234, 0, 2);
  return result === 2 && buf[0] === 0x34 && buf[1] === 0x12;
});

test('writeUIntLE 基本写入 3 字节', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(0x123456, 0, 3);
  return result === 3 && buf[0] === 0x56 && buf[1] === 0x34 && buf[2] === 0x12;
});

test('writeUIntLE 基本写入 4 字节', () => {
  const buf = Buffer.allocUnsafe(5);
  const result = buf.writeUIntLE(0x12345678, 0, 4);
  return result === 4 && buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('writeUIntLE 基本写入 5 字节', () => {
  const buf = Buffer.allocUnsafe(6);
  const result = buf.writeUIntLE(0x123456789a, 0, 5);
  return result === 5 && buf[0] === 0x9a && buf[1] === 0x78 && buf[2] === 0x56 && buf[3] === 0x34 && buf[4] === 0x12;
});

test('writeUIntLE 基本写入 6 字节', () => {
  const buf = Buffer.allocUnsafe(7);
  const result = buf.writeUIntLE(0x123456789abc, 0, 6);
  return result === 6 && buf[0] === 0xbc && buf[1] === 0x9a && buf[2] === 0x78 && buf[3] === 0x56 && buf[4] === 0x34 && buf[5] === 0x12;
});

// 非零偏移量测试
test('writeUIntBE 非零偏移量', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeUIntBE(0x1234, 3, 2);
  return result === 5 && buf[3] === 0x12 && buf[4] === 0x34;
});

test('writeUIntLE 非零偏移量', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeUIntLE(0x1234, 3, 2);
  return result === 5 && buf[3] === 0x34 && buf[4] === 0x12;
});

// 连续写入测试
test('writeUIntBE 连续写入', () => {
  const buf = Buffer.allocUnsafe(6);
  const r1 = buf.writeUIntBE(0x1234, 0, 2);
  const r2 = buf.writeUIntBE(0x5678, r1, 2);
  const r3 = buf.writeUIntBE(0x9abc, r2, 2);
  return r3 === 6 && buf[0] === 0x12 && buf[2] === 0x56 && buf[4] === 0x9a;
});

test('writeUIntLE 连续写入', () => {
  const buf = Buffer.allocUnsafe(6);
  const r1 = buf.writeUIntLE(0x1234, 0, 2);
  const r2 = buf.writeUIntLE(0x5678, r1, 2);
  const r3 = buf.writeUIntLE(0x9abc, r2, 2);
  return r3 === 6 && buf[0] === 0x34 && buf[2] === 0x78 && buf[4] === 0xbc;
});

// 零值测试
test('writeUIntBE 写入零值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntBE(0, 0, 4);
  return result === 4 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

test('writeUIntLE 写入零值', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.fill(0xff);
  const result = buf.writeUIntLE(0, 0, 4);
  return result === 4 && buf[0] === 0 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

// 最大值测试
test('writeUIntBE 1字节最大值', () => {
  const buf = Buffer.allocUnsafe(2);
  const result = buf.writeUIntBE(0xff, 0, 1);
  return result === 1 && buf[0] === 0xff;
});

test('writeUIntBE 2字节最大值', () => {
  const buf = Buffer.allocUnsafe(3);
  const result = buf.writeUIntBE(0xffff, 0, 2);
  return result === 2 && buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntBE 3字节最大值', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntBE(0xffffff, 0, 3);
  return result === 3 && buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
});

test('writeUIntLE 1字节最大值', () => {
  const buf = Buffer.allocUnsafe(2);
  const result = buf.writeUIntLE(0xff, 0, 1);
  return result === 1 && buf[0] === 0xff;
});

test('writeUIntLE 2字节最大值', () => {
  const buf = Buffer.allocUnsafe(3);
  const result = buf.writeUIntLE(0xffff, 0, 2);
  return result === 2 && buf[0] === 0xff && buf[1] === 0xff;
});

test('writeUIntLE 3字节最大值', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUIntLE(0xffffff, 0, 3);
  return result === 3 && buf[0] === 0xff && buf[1] === 0xff && buf[2] === 0xff;
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
