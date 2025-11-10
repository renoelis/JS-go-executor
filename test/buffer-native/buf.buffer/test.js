// buf.buffer - Complete Tests
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


test('返回底层 ArrayBuffer', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer instanceof ArrayBuffer;
});

test('ArrayBuffer 长度正确', () => {
  const buf = Buffer.alloc(10);
  return buf.buffer.byteLength >= 10;
});

test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return buf.buffer === ab;
});

test('slice 后共享 ArrayBuffer', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(2, 5);
  return slice.buffer === buf.buffer;
});

test('修改 buffer 影响原始数据', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  view[0] = 99;
  return buf[0] === 99;
});

test('空 buffer 也有 ArrayBuffer', () => {
  const buf = Buffer.alloc(0);
  return buf.buffer instanceof ArrayBuffer;
});

test('buffer 属性只读', () => {
  const buf = Buffer.alloc(5);
  const original = buf.buffer;
  try {
    buf.buffer = new ArrayBuffer(10);
  } catch (e) {
    // 可能抛出错误或静默失败
  }
  return buf.buffer === original;
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
