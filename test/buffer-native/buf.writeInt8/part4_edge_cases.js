// buf.writeInt8() - Edge Cases Tests
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

// 长度边界测试
test('写入长度为 1 的 buffer', () => {
  const buf = Buffer.alloc(1);
  const result = buf.writeInt8(42, 0);
  return result === 1 && buf[0] === 42;
});

test('写入极大的 buffer（1MB）', () => {
  const buf = Buffer.alloc(1024 * 1024);
  const result = buf.writeInt8(99, 1024 * 1024 - 1);
  return result === 1024 * 1024 && buf[1024 * 1024 - 1] === 99;
});

test('写入非常大的 offset', () => {
  const buf = Buffer.alloc(10000);
  const result = buf.writeInt8(55, 9999);
  return result === 10000 && buf[9999] === 55;
});

// 正负数边界
test('写入 -127', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-127, 0);
  return result === 1 && buf[0] === (256 - 127);
});

test('写入 126', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(126, 0);
  return result === 1 && buf[0] === 126;
});

test('写入 -1 验证补码', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1, 0);
  return result === 1 && buf[0] === 0xFF;
});

// 特殊数值
test('写入 -0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-0, 0);
  return result === 1 && buf[0] === 0;
});

test('写入非常小的浮点数', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(0.1, 0);
  return result === 1 && buf[0] === 0;
});

test('写入 0.9 向下取整', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(0.9, 0);
  return result === 1 && buf[0] === 0;
});

test('写入 -0.9 向上取整', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-0.9, 0);
  return result === 1 && buf[0] === 0;
});

// 二进制边界值
test('写入 0x7F（最大正值）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(0x7F, 0);
  return result === 1 && buf[0] === 0x7F;
});

test('写入 -128 对应二进制 0x80', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-128, 0);
  return result === 1 && buf[0] === 0x80;
});

test('写入 -1 对应二进制 0xFF', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-1, 0);
  return result === 1 && buf[0] === 0xFF;
});

// 链式调用
test('writeInt8 返回值可用于链式调用', () => {
  const buf = Buffer.alloc(4);
  const offset1 = buf.writeInt8(10, 0);
  const offset2 = buf.writeInt8(20, offset1);
  const offset3 = buf.writeInt8(30, offset2);
  return offset3 === 3 && buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

// 同一位置多次写入
test('同一位置多次写入覆盖前值', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt8(100, 0);
  buf.writeInt8(50, 0);
  buf.writeInt8(25, 0);
  return buf[0] === 25;
});

// 视图共享测试
test('写入影响 Uint8Array 视图', () => {
  const buf = Buffer.alloc(4);
  const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  buf.writeInt8(88, 2);
  return view[2] === 88;
});

test('slice 后的 buffer 写入影响原 buffer', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.subarray(2, 6);
  slice.writeInt8(77, 0);
  return buf[2] === 77;
});

// 字符串 offset 边界
test('offset 为空字符串抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, '');
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

test('offset 为非数字字符串抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, 'abc');
    return false;
  } catch (e) {
    return true;
  }
});

// 极端 value 组合
test('写入大量连续的边界值', () => {
  const buf = Buffer.alloc(256);
  for (let i = -128; i <= 127; i++) {
    buf.writeInt8(i, i + 128);
  }
  return buf[0] === 0x80 && buf[255] === 0x7F;
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
