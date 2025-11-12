// buffer.isUtf8() - Part 3: TypedArray Types Tests
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Int8Array 测试
test('Int8Array - 有效 UTF-8 (ASCII)', () => {
  const arr = new Int8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr) === true;
});

test('Int8Array - 有效 UTF-8 (负值范围)', () => {
  const arr = new Int8Array([0x48, 0x65, -0x7E, 0x6C, 0x6F]); // 负值会被当作相应的无符号值
  const expected = isUtf8(new Uint8Array([0x48, 0x65, 0x82, 0x6C, 0x6F]));
  return isUtf8(arr) === expected;
});

test('Int8Array - 无效 UTF-8', () => {
  const arr = new Int8Array([-128, -128]); // 0x80, 0x80
  return isUtf8(arr) === false;
});

test('Int8Array - 空数组', () => {
  const arr = new Int8Array([]);
  return isUtf8(arr) === true;
});

// Uint16Array 测试
test('Uint16Array - 有效 UTF-8', () => {
  const arr = new Uint16Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr) === true;
});

test('Uint16Array - 值超过 255', () => {
  const arr = new Uint16Array([0x48, 0x100, 0x6C, 0x6C, 0x6F]); // 0x100 = 256
  return isUtf8(arr) === true;
});

test('Uint16Array - 空数组', () => {
  const arr = new Uint16Array([]);
  return isUtf8(arr) === true;
});

// Int16Array 测试
test('Int16Array - 有效 UTF-8', () => {
  const arr = new Int16Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr) === true;
});

test('Int16Array - 负值', () => {
  const arr = new Int16Array([0x48, -256, 0x6C, 0x6C, 0x6F]); // -256
  const uint8View = new Uint8Array(arr.buffer);
  return isUtf8(arr) === isUtf8(uint8View);
});

test('Int16Array - 空数组', () => {
  const arr = new Int16Array([]);
  return isUtf8(arr) === true;
});

// Uint32Array 测试
test('Uint32Array - 有效 UTF-8', () => {
  const arr = new Uint32Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr) === true;
});

test('Uint32Array - 大值', () => {
  const arr = new Uint32Array([0x48656C6C, 0x6F]); // "Hell" + "o"
  const uint8View = new Uint8Array(arr.buffer);
  return isUtf8(arr) === isUtf8(uint8View);
});

test('Uint32Array - 空数组', () => {
  const arr = new Uint32Array([]);
  return isUtf8(arr) === true;
});

// Int32Array 测试
test('Int32Array - 有效 UTF-8', () => {
  const arr = new Int32Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr) === true;
});

test('Int32Array - 负值', () => {
  const arr = new Int32Array([0x48, -1, 0x6C, 0x6C, 0x6F]); // -1
  const uint8View = new Uint8Array(arr.buffer);
  return isUtf8(arr) === isUtf8(uint8View);
});

test('Int32Array - 空数组', () => {
  const arr = new Int32Array([]);
  return isUtf8(arr) === true;
});

// Float32Array 测试
test('Float32Array - 字节解释', () => {
  const arr = new Float32Array([1.0]);
  const uint8View = new Uint8Array(arr.buffer);
  return isUtf8(arr) === isUtf8(uint8View);
});

test('Float32Array - 空数组', () => {
  const arr = new Float32Array([]);
  return isUtf8(arr) === true;
});

// Float64Array 测试
test('Float64Array - 字节解释', () => {
  const arr = new Float64Array([1.0]);
  const uint8View = new Uint8Array(arr.buffer);
  return isUtf8(arr) === isUtf8(uint8View);
});

test('Float64Array - 空数组', () => {
  const arr = new Float64Array([]);
  return isUtf8(arr) === true;
});

// BigInt64Array 测试
test('BigInt64Array - 字节解释', () => {
  const arr = new BigInt64Array([1n]);
  const uint8View = new Uint8Array(arr.buffer);
  return isUtf8(arr) === isUtf8(uint8View);
});

test('BigInt64Array - 空数组', () => {
  const arr = new BigInt64Array([]);
  return isUtf8(arr) === true;
});

// BigUint64Array 测试
test('BigUint64Array - 字节解释', () => {
  const arr = new BigUint64Array([1n]);
  const uint8View = new Uint8Array(arr.buffer);
  return isUtf8(arr) === isUtf8(uint8View);
});

test('BigUint64Array - 空数组', () => {
  const arr = new BigUint64Array([]);
  return isUtf8(arr) === true;
});

// Uint8ClampedArray 测试
test('Uint8ClampedArray - 有效 UTF-8', () => {
  const arr = new Uint8ClampedArray([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(arr) === true;
});

test('Uint8ClampedArray - 无效 UTF-8', () => {
  const arr = new Uint8ClampedArray([0x80, 0x80]);
  return isUtf8(arr) === false;
});

test('Uint8ClampedArray - 空数组', () => {
  const arr = new Uint8ClampedArray([]);
  return isUtf8(arr) === true;
});

// 混合 TypedArray 场景
test('TypedArray 共享 ArrayBuffer - 有效 UTF-8', () => {
  const ab = new ArrayBuffer(6); // 改为 6 字节，可以被 2 整除
  const uint8 = new Uint8Array(ab);
  uint8.set([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x00]); // "Hello" + NULL
  const uint16 = new Uint16Array(ab);
  return isUtf8(uint16) === true;
});

test('TypedArray 共享 ArrayBuffer - 无效 UTF-8', () => {
  const ab = new ArrayBuffer(2);
  const uint8 = new Uint8Array(ab);
  uint8.set([0x80, 0x80]);
  const int8 = new Int8Array(ab);
  return isUtf8(int8) === false;
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
