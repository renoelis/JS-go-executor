// buf.writeInt32LE() - 基本功能测试
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

// 基本写入功能
test('基本写入：正数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32LE(0x12345678, 0);
  return result === 4 && buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('基本写入：负数', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32LE(-1, 0);
  return result === 4 && buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('基本写入：零', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32LE(0, 0);
  return result === 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x00;
});

test('基本写入：最大正数 (2^31-1)', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32LE(2147483647, 0);
  return result === 4 && buf[0] === 0xFF && buf[1] === 0xFF && buf[2] === 0xFF && buf[3] === 0x7F;
});

test('基本写入：最小负数 (-2^31)', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt32LE(-2147483648, 0);
  return result === 4 && buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0x80;
});

test('返回值：应返回写入后的偏移量 (offset + 4)', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeInt32LE(123, 0);
  return result === 4;
});

test('返回值：非零偏移量', () => {
  const buf = Buffer.allocUnsafe(8);
  const result = buf.writeInt32LE(456, 4);
  return result === 8;
});

test('链式调用：可以连续写入', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeInt32LE(0x12345678, 0);
  buf.writeInt32LE(0x7ABCDEF0, 4);
  return buf[0] === 0x78 && buf[4] === 0xF0;
});

test('字节序验证：小端序 (Little-Endian)', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeInt32LE(0x01020304, 0);
  return buf[0] === 0x04 && buf[1] === 0x03 && buf[2] === 0x02 && buf[3] === 0x01;
});

test('不影响其他位置：写入不修改其他字节', () => {
  const buf = Buffer.alloc(8, 0xFF);
  buf.writeInt32LE(0, 2);
  return buf[0] === 0xFF && buf[1] === 0xFF && buf[6] === 0xFF && buf[7] === 0xFF;
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
