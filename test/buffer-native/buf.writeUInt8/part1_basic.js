// buf.writeUInt8() - 基本功能测试
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

// 基本写入测试
test('写入单个字节到默认位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x42);
  return buf[0] === 0x42 && buf[1] === 0 && buf[2] === 0 && buf[3] === 0;
});

test('写入单个字节到指定 offset', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x42, 2);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0x42 && buf[3] === 0;
});

test('写入 0 值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0, 0);
  return buf[0] === 0;
});

test('写入 255 最大值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(255, 0);
  return buf[0] === 255;
});

test('写入 128 中间值', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(128, 0);
  return buf[0] === 128;
});

test('写入 1 最小正数', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(1, 0);
  return buf[0] === 1;
});

test('连续写入多个字节', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0x11, 0);
  buf.writeUInt8(0x22, 1);
  buf.writeUInt8(0x33, 2);
  buf.writeUInt8(0x44, 3);
  return buf[0] === 0x11 && buf[1] === 0x22 && buf[2] === 0x33 && buf[3] === 0x44;
});

test('覆盖已有数据', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  buf.writeUInt8(0x00, 1);
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('写入到最后一个位置', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(0xAB, 3);
  return buf[3] === 0xAB && buf[0] === 0 && buf[1] === 0 && buf[2] === 0;
});

test('offset 省略时默认为 0', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt8(123);
  return buf[0] === 123;
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
