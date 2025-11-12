// buf.writeInt8() - Input Types Tests
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

// value 参数类型测试
test('value 为整数字面量', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(50, 0);
  return result === 1 && buf[0] === 50;
});

test('value 为浮点数（向下取整）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(42.9, 0);
  return result === 1 && buf[0] === 42;
});

test('value 为负浮点数（向上取整）', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(-42.1, 0);
  return result === 1 && buf[0] === (256 - 42);
});

test('value 为字符串数字', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8('65', 0);
  return result === 1 && buf[0] === 65;
});

test('value 为布尔值 true', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(true, 0);
  return result === 1 && buf[0] === 1;
});

test('value 为布尔值 false', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(false, 0);
  return result === 1 && buf[0] === 0;
});

// offset 参数类型测试
test('offset 为整数', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(10, 2);
  return result === 3 && buf[2] === 10;
});

test('offset 为浮点数抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, 1.9);
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('integer');
  }
});

test('offset 为字符串抛出错误', () => {
  const buf = Buffer.alloc(4);
  try {
    buf.writeInt8(10, '2');
    return false;
  } catch (e) {
    return e.message.includes('offset') || e.message.includes('type');
  }
});

test('offset 为 0', () => {
  const buf = Buffer.alloc(2);
  const result = buf.writeInt8(10, 0);
  return result === 1 && buf[0] === 10;
});

// 对不同 Buffer 类型的测试
test('在 Buffer.alloc 创建的 buffer 上写入', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeInt8(100, 0);
  return result === 1 && buf[0] === 100;
});

test('在 Buffer.allocUnsafe 创建的 buffer 上写入', () => {
  const buf = Buffer.allocUnsafe(4);
  const result = buf.writeInt8(100, 0);
  return result === 1 && buf[0] === 100;
});

test('在 Buffer.from 创建的 buffer 上写入', () => {
  const buf = Buffer.from([0, 0, 0, 0]);
  const result = buf.writeInt8(100, 1);
  return result === 2 && buf[1] === 100;
});

// Uint8Array 视图
test('在 Uint8Array 视图上调用 writeInt8', () => {
  const arr = new Uint8Array(4);
  const result = Buffer.from(arr.buffer).writeInt8(50, 0);
  return result === 1 && arr[0] === 50;
});

// ArrayBuffer 视图
test('在 ArrayBuffer 创建的 Buffer 上写入', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const result = buf.writeInt8(75, 1);
  return result === 2 && buf[1] === 75;
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
