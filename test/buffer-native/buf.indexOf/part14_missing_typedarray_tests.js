// buf.indexOf() - Missing TypedArray Tests
// 补充其他 TypedArray 类型的测试
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error but none thrown' });
  } catch (e) {
    const pass = e.name === expectedErrorType || e.message.includes(expectedErrorType);
    tests.push({ name, status: pass ? '✅' : '❌', error: pass ? undefined : e.message });
  }
}

// Int16Array 测试
test('Int16Array - 基本查找', () => {
  const arr = new Int16Array([256, 257, 258]); // 0x0100, 0x0101, 0x0102
  const buf = Buffer.from([0, 1, 1, 1, 2, 1]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 0;
});

test('Int16Array - 单个元素', () => {
  const arr = new Int16Array([0x0201]); // 小端序: 01 02
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

test('Int16Array - 负数值', () => {
  const arr = new Int16Array([-1]); // 0xFFFF
  const buf = Buffer.from([0, 0xFF, 0xFF, 3]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

// Int32Array 测试
test('Int32Array - 基本查找', () => {
  const arr = new Int32Array([0x04030201]); // 小端序: 01 02 03 04
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

test('Int32Array - 多个元素', () => {
  const arr = new Int32Array([0x04030201, 0x08070605]);
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

test('Int32Array - 负数', () => {
  const arr = new Int32Array([-1]); // 0xFFFFFFFF
  const buf = Buffer.from([0, 0xFF, 0xFF, 0xFF, 0xFF, 5]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

// Uint16Array 测试
test('Uint16Array - 基本查找', () => {
  const arr = new Uint16Array([0x0201, 0x0403]); // 小端序: 01 02 03 04
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

test('Uint16Array - 单个元素', () => {
  const arr = new Uint16Array([0xFFFF]);
  const buf = Buffer.from([0, 0xFF, 0xFF, 3]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

test('Uint16Array - 空数组', () => {
  const arr = new Uint16Array(0);
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.from(arr.buffer)) === 0;
});

// Uint32Array 测试
test('Uint32Array - 基本查找', () => {
  const arr = new Uint32Array([0x04030201]);
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

test('Uint32Array - 最大值', () => {
  const arr = new Uint32Array([0xFFFFFFFF]);
  const buf = Buffer.from([0, 0xFF, 0xFF, 0xFF, 0xFF, 5]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 1;
});

test('Uint32Array - 零值', () => {
  const arr = new Uint32Array([0]);
  const buf = Buffer.from([0, 0, 0, 0, 1]);
  return buf.indexOf(Buffer.from(arr.buffer)) === 0;
});

// Float32Array 测试
test('Float32Array - 基本查找', () => {
  const arr = new Float32Array([1.5]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2, 3);
  return buf2.indexOf(buf1) === 3;
});

test('Float32Array - 多个元素', () => {
  const arr = new Float32Array([1.5, 2.5, 3.5]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 5);
  return buf2.indexOf(buf1) === 5;
});

test('Float32Array - NaN 值', () => {
  const arr = new Float32Array([NaN]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2, 2);
  return buf2.indexOf(buf1) === 2;
});

// Float64Array 测试
test('Float64Array - 基本查找', () => {
  const arr = new Float64Array([Math.PI]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 4);
  return buf2.indexOf(buf1) === 4;
});

test('Float64Array - 多个元素', () => {
  const arr = new Float64Array([1.1, 2.2, 3.3]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(30);
  buf1.copy(buf2, 2);
  return buf2.indexOf(buf1) === 2;
});

test('Float64Array - Infinity', () => {
  const arr = new Float64Array([Infinity]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 5);
  return buf2.indexOf(buf1) === 5;
});

test('Float64Array - -Infinity', () => {
  const arr = new Float64Array([-Infinity]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 3);
  return buf2.indexOf(buf1) === 3;
});

// BigInt64Array 测试
test('BigInt64Array - 基本查找', () => {
  const arr = new BigInt64Array([123n]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 5);
  return buf2.indexOf(buf1) === 5;
});

test('BigInt64Array - 大数值', () => {
  const arr = new BigInt64Array([9007199254740991n]); // Number.MAX_SAFE_INTEGER
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 2);
  return buf2.indexOf(buf1) === 2;
});

test('BigInt64Array - 负数', () => {
  const arr = new BigInt64Array([-123n]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 4);
  return buf2.indexOf(buf1) === 4;
});

// BigUint64Array 测试
test('BigUint64Array - 基本查找', () => {
  const arr = new BigUint64Array([456n]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 3);
  return buf2.indexOf(buf1) === 3;
});

test('BigUint64Array - 最大值', () => {
  const arr = new BigUint64Array([18446744073709551615n]); // 2^64 - 1
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 1);
  return buf2.indexOf(buf1) === 1;
});

test('BigUint64Array - 零值', () => {
  const arr = new BigUint64Array([0n]);
  const buf1 = Buffer.from(arr.buffer);
  const buf2 = Buffer.alloc(20);
  return buf2.indexOf(buf1) === 0;
});

// ArrayBuffer 直接使用测试
test('ArrayBuffer - 直接查找', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  view[3] = 4;
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from(ab)) === 1;
});

test('ArrayBuffer - 空 ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.from(ab)) === 0;
});

test('ArrayBuffer - 大 ArrayBuffer', () => {
  const ab = new ArrayBuffer(100);
  const view = new Uint8Array(ab);
  view.fill(42);
  const buf = Buffer.alloc(200);
  buf.fill(42, 50, 150);
  return buf.indexOf(Buffer.from(ab)) === 50;
});

// DataView 测试
test('DataView - 基本查找', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setUint8(0, 1);
  dv.setUint8(1, 2);
  dv.setUint8(2, 3);
  dv.setUint8(3, 4);
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from(ab, 0, 4)) === 1;
});

test('DataView - 设置不同类型的值', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setInt16(0, 0x0201, true); // 小端序: 01 02
  dv.setInt16(2, 0x0403, true); // 小端序: 03 04
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from(ab, 0, 4)) === 1;
});

test('DataView - Float64 值', () => {
  const ab = new ArrayBuffer(8);
  const dv = new DataView(ab);
  dv.setFloat64(0, Math.PI, true);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.alloc(20);
  buf1.copy(buf2, 5);
  return buf2.indexOf(buf1) === 5;
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
