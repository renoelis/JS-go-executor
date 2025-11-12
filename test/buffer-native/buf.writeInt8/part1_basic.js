// buf.writeInt8() - Basic Functionality Tests
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
test('基本写入正整数', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(42, 0);
  return result === 1 && buf[0] === 42;
});

test('基本写入负整数', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(-42, 0);
  return result === 1 && buf[0] === (256 - 42);
});

test('写入到中间位置', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(100, 2);
  return result === 3 && buf[2] === 100;
});

test('写入到最后位置', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(127, 3);
  return result === 4 && buf[3] === 127;
});

// 边界值测试
test('写入最小值 -128', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-128, 0);
  return result === 1 && buf[0] === 0x80;
});

test('写入最大值 127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(127, 0);
  return result === 1 && buf[0] === 0x7F;
});

test('写入 0', () => {
  const buf = Buffer.alloc(2);
  buf.fill(0xFF);
  const result = buf.writeInt8(0, 0);
  return result === 1 && buf[0] === 0;
});

test('写入 -1', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1, 0);
  return result === 1 && buf[0] === 0xFF;
});

// 返回值验证
test('返回值等于 offset + 1（offset=0）', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(10, 0);
  return result === 1;
});

test('返回值等于 offset + 1（offset=5）', () => {
  const buf = Buffer.alloc(10);
  const result = buf.writeInt8(10, 5);
  return result === 6;
});

// 连续写入
test('连续写入多个值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(1, 0);
  buf.writeInt8(2, 1);
  buf.writeInt8(3, 2);
  buf.writeInt8(4, 3);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && buf[3] === 4;
});

test('覆盖已有值', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  buf.writeInt8(0, 1);
  return buf[0] === 0xFF && buf[1] === 0 && buf[2] === 0xFF;
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
