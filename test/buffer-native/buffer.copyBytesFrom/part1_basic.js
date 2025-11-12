// Buffer.copyBytesFrom() - Part 1: Basic Functionality Tests
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
test('从 Uint8Array 复制', () => {
  const view = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 5 && buf[0] === 1 && buf[4] === 5;
});

test('从 Uint8Array 复制 - 带 offset', () => {
  const view = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view, 2);
  return buf.length === 3 && buf[0] === 3 && buf[2] === 5;
});

test('从 Uint8Array 复制 - 带 offset 和 length', () => {
  const view = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 3 && buf[0] === 2 && buf[2] === 4;
});

test('从 Uint16Array 复制', () => {
  const view = new Uint16Array([0x0102, 0x0304]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('从 Uint32Array 复制', () => {
  const view = new Uint32Array([0x01020304]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('从 Float32Array 复制', () => {
  const view = new Float32Array([1.5, 2.5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('从 Float64Array 复制', () => {
  const view = new Float64Array([1.5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('从 DataView 复制（不支持）', () => {
  const ab = new ArrayBuffer(4);
  const dv = new DataView(ab);
  dv.setUint8(0, 0x41);
  dv.setUint8(1, 0x42);
  try {
    const buf = Buffer.copyBytesFrom(dv);
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError && e.message.includes('TypedArray');
  }
});

test('空 TypedArray', () => {
  const view = new Uint8Array([]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 0;
});

test('验证是复制而非引用', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  view[0] = 99;
  return buf[0] === 1; // 原始值不变
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
