// Buffer.copyBytesFrom() - Part 3: All TypedArray Types Support
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

// 测试所有 TypedArray 类型
test('Int8Array 基本复制', () => {
  const view = new Int8Array([1, -2, 3, -4, 5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 5 && buf[0] === 1 && buf[1] === 254;
});

test('Int8Array 带 offset', () => {
  const view = new Int8Array([-10, -20, -30]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 2 && buf[0] === 236 && buf[1] === 226;
});

test('Int8Array 带 offset 和 length', () => {
  const view = new Int8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 3 && buf[0] === 20 && buf[2] === 40;
});

test('Uint8Array 基本复制', () => {
  const view = new Uint8Array([255, 128, 0, 1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4 && buf[0] === 255 && buf[1] === 128;
});

test('Uint8ClampedArray 基本复制', () => {
  const view = new Uint8ClampedArray([0, 127, 255]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 3 && buf[0] === 0 && buf[2] === 255;
});

test('Uint8ClampedArray 带 offset 和 length', () => {
  const view = new Uint8ClampedArray([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 2 && buf[0] === 20 && buf[1] === 30;
});

test('Int16Array 基本复制', () => {
  const view = new Int16Array([0x0102, 0x0304, -1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 6 && buf[0] === 2 && buf[1] === 1;
});

test('Int16Array 带 offset', () => {
  const view = new Int16Array([100, 200, 300]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 4;
});

test('Uint16Array 基本复制', () => {
  const view = new Uint16Array([0xFFFF, 0x1234]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4 && buf[0] === 255 && buf[1] === 255;
});

test('Uint16Array 带 offset 和 length', () => {
  const view = new Uint16Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 1);
  return buf.length === 2;
});

test('Int32Array 基本复制', () => {
  const view = new Int32Array([0x01020304, -1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Int32Array 带 offset', () => {
  const view = new Int32Array([100, 200, 300]);
  const buf = Buffer.copyBytesFrom(view, 2);
  return buf.length === 4;
});

test('Uint32Array 基本复制', () => {
  const view = new Uint32Array([0xFFFFFFFF, 0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

test('Uint32Array 带 offset 和 length', () => {
  const view = new Uint32Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0, 2);
  return buf.length === 8;
});

test('Float32Array 基本复制', () => {
  const view = new Float32Array([1.5, 2.5, 3.5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 12;
});

test('Float32Array 带 offset', () => {
  const view = new Float32Array([1.1, 2.2, 3.3]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 8;
});

test('Float32Array 带 offset 和 length', () => {
  const view = new Float32Array([1.0, 2.0, 3.0, 4.0]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 8;
});

test('Float64Array 基本复制', () => {
  const view = new Float64Array([1.5, 2.5]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 16;
});

test('Float64Array 带 offset', () => {
  const view = new Float64Array([1.1, 2.2, 3.3]);
  const buf = Buffer.copyBytesFrom(view, 2);
  return buf.length === 8;
});

test('Float64Array 带 offset 和 length', () => {
  const view = new Float64Array([1.0, 2.0, 3.0]);
  const buf = Buffer.copyBytesFrom(view, 0, 2);
  return buf.length === 16;
});

test('BigInt64Array 基本复制', () => {
  const view = new BigInt64Array([1n, 2n, 3n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 24;
});

test('BigInt64Array 带 offset', () => {
  const view = new BigInt64Array([100n, 200n, 300n]);
  const buf = Buffer.copyBytesFrom(view, 1);
  return buf.length === 16;
});

test('BigInt64Array 带 offset 和 length', () => {
  const view = new BigInt64Array([1n, 2n, 3n, 4n]);
  const buf = Buffer.copyBytesFrom(view, 1, 2);
  return buf.length === 16;
});

test('BigInt64Array 负数', () => {
  const view = new BigInt64Array([-1n, -2n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 16 && buf[0] === 255;
});

test('BigUint64Array 基本复制', () => {
  const view = new BigUint64Array([1n, 2n, 3n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 24;
});

test('BigUint64Array 带 offset', () => {
  const view = new BigUint64Array([100n, 200n, 300n]);
  const buf = Buffer.copyBytesFrom(view, 2);
  return buf.length === 8;
});

test('BigUint64Array 带 offset 和 length', () => {
  const view = new BigUint64Array([1n, 2n, 3n]);
  const buf = Buffer.copyBytesFrom(view, 0, 1);
  return buf.length === 8;
});

test('BigUint64Array 大数值', () => {
  const view = new BigUint64Array([18446744073709551615n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8 && buf[0] === 255;
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
