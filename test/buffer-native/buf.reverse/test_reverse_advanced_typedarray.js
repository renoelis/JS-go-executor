// buf.reverse() - 高级 TypedArray 测试
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

// Case 1: Uint32Array 上调用 reverse
test('Uint32Array 上调用 reverse（按元素反转）', () => {
  const uint32 = new Uint32Array([0x01020304, 0x05060708, 0x090A0B0C]);
  const before = Array.from(uint32);
  Buffer.prototype.reverse.call(uint32);
  const after = Array.from(uint32);

  const expected = before.slice().reverse();
  return JSON.stringify(after) === JSON.stringify(expected);
});

// Case 2: Int32Array 上调用 reverse
test('Int32Array 上调用 reverse（包含负数）', () => {
  const int32 = new Int32Array([-1000, 0, 1000, 2000]);
  const before = Array.from(int32);
  Buffer.prototype.reverse.call(int32);
  const after = Array.from(int32);

  const expected = before.slice().reverse();
  return JSON.stringify(after) === JSON.stringify(expected);
});

// Case 3: Float32Array 上调用 reverse
test('Float32Array 上调用 reverse', () => {
  const float32 = new Float32Array([1.1, 2.2, 3.3, 4.4]);
  const before = Array.from(float32);
  Buffer.prototype.reverse.call(float32);
  const after = Array.from(float32);

  const expected = before.slice().reverse();
  // 浮点数比较需要考虑精度
  return after.length === expected.length &&
         after.every((v, i) => Math.abs(v - expected[i]) < 0.0001);
});

// Case 4: Float64Array 上调用 reverse
test('Float64Array 上调用 reverse', () => {
  const float64 = new Float64Array([Math.PI, Math.E, Math.SQRT2]);
  const before = Array.from(float64);
  Buffer.prototype.reverse.call(float64);
  const after = Array.from(float64);

  const expected = before.slice().reverse();
  return after.length === expected.length &&
         after.every((v, i) => Math.abs(v - expected[i]) < 1e-10);
});

// Case 5: BigInt64Array 上调用 reverse
test('BigInt64Array 上调用 reverse', () => {
  const bigint64 = new BigInt64Array([1n, 2n, 3n, 9007199254740991n]);
  const before = Array.from(bigint64);
  Buffer.prototype.reverse.call(bigint64);
  const after = Array.from(bigint64);

  const expected = before.slice().reverse();
  return JSON.stringify(after.map(String)) === JSON.stringify(expected.map(String));
});

// Case 6: BigUint64Array 上调用 reverse
test('BigUint64Array 上调用 reverse', () => {
  const biguint64 = new BigUint64Array([18446744073709551615n, 1n, 100n]);
  const before = Array.from(biguint64);
  Buffer.prototype.reverse.call(biguint64);
  const after = Array.from(biguint64);

  const expected = before.slice().reverse();
  return JSON.stringify(after.map(String)) === JSON.stringify(expected.map(String));
});

// Case 7: DataView 上调用 reverse（应该抛出错误）
test('DataView 上调用 reverse', () => {
  try {
    const ab = new ArrayBuffer(8);
    const dv = new DataView(ab);
    dv.setUint8(0, 1);
    dv.setUint8(1, 2);
    dv.setUint8(2, 3);
    dv.setUint8(3, 4);

    Buffer.prototype.reverse.call(dv);
    return false; // 应该抛出错误
  } catch (err) {
    return err.name === 'TypeError';
  }
});

// Case 8: 有 offset 的 Uint32Array 视图
test('有 offset 的 Uint32Array 视图反转', () => {
  const ab = new ArrayBuffer(20);
  const bytes = new Uint8Array(ab);
  for (let i = 0; i < 20; i++) bytes[i] = i;

  const uint32View = new Uint32Array(ab, 4, 3); // offset=4, length=3
  const before = Array.from(uint32View);

  Buffer.prototype.reverse.call(uint32View);

  const after = Array.from(uint32View);
  const expected = before.slice().reverse();
  return JSON.stringify(after) === JSON.stringify(expected);
});

// Case 9: Float32Array 包含特殊值（NaN, Infinity, -Infinity）
test('Float32Array 包含特殊值（NaN, Infinity）', () => {
  const float32 = new Float32Array([NaN, Infinity, -Infinity, 0, -0]);
  const before = Array.from(float32);
  Buffer.prototype.reverse.call(float32);
  const after = Array.from(float32);

  const expected = before.slice().reverse();
  // 特殊值比较
  return after.length === expected.length &&
         after.every((v, i) => {
           if (Number.isNaN(expected[i])) return Number.isNaN(v);
           return Object.is(v, expected[i]);
         });
});

// Case 10: Int8Array（有符号）上调用 reverse
test('Int8Array（有符号）上调用 reverse', () => {
  const int8 = new Int8Array([-128, -1, 0, 1, 127]);
  const before = Array.from(int8);
  Buffer.prototype.reverse.call(int8);
  const after = Array.from(int8);

  const expected = before.slice().reverse();
  return JSON.stringify(after) === JSON.stringify(expected);
});

// Case 11: Uint8ClampedArray 上调用 reverse
test('Uint8ClampedArray 上调用 reverse', () => {
  const uint8clamped = new Uint8ClampedArray([0, 128, 255, 300, -10]);
  const before = Array.from(uint8clamped);
  Buffer.prototype.reverse.call(uint8clamped);
  const after = Array.from(uint8clamped);

  const expected = before.slice().reverse();
  return JSON.stringify(after) === JSON.stringify(expected);
});

// Case 12: 混合字节序验证 - Float64Array 按元素反转
test('Float64Array 按元素反转（非字节级）', () => {
  const ab = new ArrayBuffer(16);
  const float64 = new Float64Array(ab);
  float64[0] = 1.23456789;
  float64[1] = 9.87654321;

  const valueBefore = Array.from(float64);
  Buffer.prototype.reverse.call(float64);
  const valueAfter = Array.from(float64);

  // Float64Array 按元素反转，不是字节完全反转
  const expected = valueBefore.slice().reverse();
  return valueAfter.length === expected.length &&
         valueAfter.every((v, i) => Math.abs(v - expected[i]) < 1e-10);
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
