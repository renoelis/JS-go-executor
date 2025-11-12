// buf.writeUInt32LE() - Combination Tests
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

// 组合场景测试
test('连续写入多个32位无符号整数', () => {
  const buf = Buffer.allocUnsafe(16);
  buf.writeUInt32LE(0x11111111, 0);
  buf.writeUInt32LE(0x22222222, 4);
  buf.writeUInt32LE(0x33333333, 8);
  buf.writeUInt32LE(0x44444444, 12);

  return buf.readUInt32LE(0) === 0x11111111 &&
         buf.readUInt32LE(4) === 0x22222222 &&
         buf.readUInt32LE(8) === 0x33333333 &&
         buf.readUInt32LE(12) === 0x44444444;
});

test('交替写入LE和BE字节序', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32BE(0x12345678, 4);

  // LE: 78 56 34 12
  // BE: 12 34 56 78
  return buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12 &&
         buf[4] === 0x12 && buf[5] === 0x34 && buf[6] === 0x56 && buf[7] === 0x78;
});

test('写入后验证字节内容', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0xDEADBEEF, 0);

  return buf[0] === 0xEF && buf[1] === 0xBE && buf[2] === 0xAD && buf[3] === 0xDE;
});

test('写入最大值和最小值', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0xFFFFFFFF, 0);
  buf.writeUInt32LE(0x00000000, 4);

  return buf.readUInt32LE(0) === 0xFFFFFFFF && buf.readUInt32LE(4) === 0x00000000;
});

test('写入中间值和边界值', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.writeUInt32LE(0x80000000, 0); // 最高位为1
  buf.writeUInt32LE(0x7FFFFFFF, 4); // 最高位为0，其余全1
  buf.writeUInt32LE(0x00000001, 8); // 最小正数

  return buf.readUInt32LE(0) === 0x80000000 &&
         buf.readUInt32LE(4) === 0x7FFFFFFF &&
         buf.readUInt32LE(8) === 0x00000001;
});

test('覆盖写入验证', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0xAAAAAAAA, 0);
  buf.writeUInt32LE(0xBBBBBBBB, 4);

  // 覆盖第一个值
  buf.writeUInt32LE(0xCCCCCCCC, 0);

  return buf.readUInt32LE(0) === 0xCCCCCCCC &&
         buf.readUInt32LE(4) === 0xBBBBBBBB;
});

test('部分覆盖写入', () => {
  const buf = Buffer.allocUnsafe(12);
  buf.fill(0xFF);

  // 在中间写入，不覆盖边界
  buf.writeUInt32LE(0x12345678, 4);

  return buf.readUInt32LE(0) === 0xFFFFFFFF &&
         buf.readUInt32LE(4) === 0x12345678 &&
         buf.readUInt32LE(8) === 0xFFFFFFFF;
});

test('小端字节序验证', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(0x01020304, 0);

  // 小端序：低位字节在前
  return buf[0] === 0x04 && buf[1] === 0x03 && buf[2] === 0x02 && buf[3] === 0x01;
});

test('连续字节序测试', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0x01020304, 0);
  buf.writeUInt32LE(0x05060708, 4);

  return buf.readUInt32LE(0) === 0x01020304 &&
         buf.readUInt32LE(4) === 0x05060708 &&
         buf[0] === 0x04 && buf[7] === 0x05;
});

test('返回值验证', () => {
  const buf = Buffer.allocUnsafe(8);
  const result1 = buf.writeUInt32LE(0x12345678, 0);
  const result2 = buf.writeUInt32LE(0x9ABCDEF0, 4);

  return result1 === 4 && result2 === 8;
});

test('零偏移量写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32LE(0x9ABCDEF0, 0); // 覆盖

  return buf.readUInt32LE(0) === 0x9ABCDEF0;
});

test('最大偏移量写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32LE(0x12345678, 4);

  return buf.readUInt32LE(4) === 0x12345678;
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