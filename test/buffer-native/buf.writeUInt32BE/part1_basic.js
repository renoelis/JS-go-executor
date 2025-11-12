// buf.writeUInt32BE() - Basic Functionality Tests
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

// 基本功能测试
test('基本写入功能 - 小数值', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUInt32BE(0x12345678, 0);
  if (result !== 4) return false;
  if (buf[0] !== 0x12) return false;
  if (buf[1] !== 0x34) return false;
  if (buf[2] !== 0x56) return false;
  if (buf[3] !== 0x78) return false;
  return true;
});

test('基本写入功能 - 最大安全整数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUInt32BE(0xFFFFFFFF, 0);
  if (result !== 4) return false;
  if (buf[0] !== 0xFF) return false;
  if (buf[1] !== 0xFF) return false;
  if (buf[2] !== 0xFF) return false;
  if (buf[3] !== 0xFF) return false;
  return true;
});

test('基本写入功能 - 最小值 0', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeUInt32BE(0, 0);
  if (result !== 4) return false;
  if (buf[0] !== 0x00) return false;
  if (buf[1] !== 0x00) return false;
  if (buf[2] !== 0x00) return false;
  if (buf[3] !== 0x00) return false;
  return true;
});

test('偏移量写入 - 从中间位置', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.fill(0);
  const result = buf.writeUInt32BE(0x12345678, 2);
  if (result !== 6) return false;
  if (buf[2] !== 0x12) return false;
  if (buf[3] !== 0x34) return false;
  if (buf[4] !== 0x56) return false;
  if (buf[5] !== 0x78) return false;
  return true;
});

test('返回值测试', () => {
  const buf = Buffer.allocUnsafe(10);
  const result = buf.writeUInt32BE(0x12345678, 3);
  if (result !== 7) return false;
  return true;
});

test('多字节序验证', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x9ABCDEF0, 4);

  if (buf[0] !== 0x12) return false;
  if (buf[1] !== 0x34) return false;
  if (buf[2] !== 0x56) return false;
  if (buf[3] !== 0x78) return false;
  if (buf[4] !== 0x9A) return false;
  if (buf[5] !== 0xBC) return false;
  if (buf[6] !== 0xDE) return false;
  if (buf[7] !== 0xF0) return false;
  return true;
});

test('覆盖写入测试', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32BE(0x11111111, 0);
  buf.writeUInt32BE(0x22222222, 0);

  if (buf[0] !== 0x22) return false;
  if (buf[1] !== 0x22) return false;
  if (buf[2] !== 0x22) return false;
  if (buf[3] !== 0x22) return false;
  return true;
});

test('部分覆盖写入测试', () => {
  const buf = Buffer.allocUnsafe(6);
  buf.fill(0xFF);
  buf.writeUInt32BE(0x12345678, 1);

  if (buf[0] !== 0xFF) return false;
  if (buf[1] !== 0x12) return false;
  if (buf[2] !== 0x34) return false;
  if (buf[3] !== 0x56) return false;
  if (buf[4] !== 0x78) return false;
  if (buf[5] !== 0xFF) return false;
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