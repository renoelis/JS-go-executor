// buf.set() - Part 3: TypedArray Comprehensive Tests
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

// 所有 TypedArray 类型测试
test('从 Int8Array 设置（负数处理）', () => {
  const buf = Buffer.alloc(5);
  const int8 = new Int8Array([-128, -1, 0, 1, 127]);
  buf.set(int8);
  return buf[0] === 128 && buf[1] === 255 && buf[2] === 0 && 
         buf[3] === 1 && buf[4] === 127;
});

test('从 Uint8ClampedArray 设置', () => {
  const buf = Buffer.alloc(5);
  const clamped = new Uint8ClampedArray([0, 127, 255, 300, -10]);
  buf.set(clamped);
  // Uint8ClampedArray 会 clamp 值到 0-255
  return buf[0] === 0 && buf[1] === 127 && buf[2] === 255 && 
         buf[3] === 255 && buf[4] === 0;
});

test('从 Uint16Array 设置（截断高位）', () => {
  const buf = Buffer.alloc(4);
  const uint16 = new Uint16Array([0x0102, 0x0304, 0xABCD, 0xFFFF]);
  buf.set(uint16);
  // 只取低8位
  return buf[0] === 0x02 && buf[1] === 0x04 && buf[2] === 0xCD && buf[3] === 0xFF;
});

test('从 Int16Array 设置（截断高位）', () => {
  const buf = Buffer.alloc(4);
  const int16 = new Int16Array([-1, -256, 256, 32767]);
  buf.set(int16);
  // -1 = 0xFFFF -> 0xFF
  // -256 = 0xFF00 -> 0x00
  // 256 = 0x0100 -> 0x00
  // 32767 = 0x7FFF -> 0xFF
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0xFF;
});

test('从 Uint32Array 设置（截断高位）', () => {
  const buf = Buffer.alloc(4);
  const uint32 = new Uint32Array([0x12345678, 0xABCDEF00, 0x000000FF, 0xFFFFFFFF]);
  buf.set(uint32);
  // 只取低8位
  return buf[0] === 0x78 && buf[1] === 0x00 && buf[2] === 0xFF && buf[3] === 0xFF;
});

test('从 Int32Array 设置（截断高位）', () => {
  const buf = Buffer.alloc(4);
  const int32 = new Int32Array([-1, -256, 256, 2147483647]);
  buf.set(int32);
  // -1 = 0xFFFFFFFF -> 0xFF
  // -256 = 0xFFFFFF00 -> 0x00
  // 256 = 0x00000100 -> 0x00
  // 2147483647 = 0x7FFFFFFF -> 0xFF
  return buf[0] === 0xFF && buf[1] === 0x00 && buf[2] === 0x00 && buf[3] === 0xFF;
});

test('从 Float32Array 设置（转换为整数）', () => {
  const buf = Buffer.alloc(5);
  const float32 = new Float32Array([0.5, 1.9, 2.1, 255.9, -0.5]);
  buf.set(float32);
  // 浮点数转整数：截断小数部分
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2 && 
         buf[3] === 255 && buf[4] === 0;
});

test('从 Float64Array 设置（转换为整数）', () => {
  const buf = Buffer.alloc(5);
  const float64 = new Float64Array([0.5, 1.9, 2.1, 255.9, -0.5]);
  buf.set(float64);
  // 浮点数转整数：截断小数部分
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2 && 
         buf[3] === 255 && buf[4] === 0;
});

// TypedArray 视图测试
test('从 TypedArray 的 subarray 设置', () => {
  const buf = Buffer.alloc(5);
  const uint8 = new Uint8Array([10, 20, 30, 40, 50]);
  const sub = uint8.subarray(1, 4); // [20, 30, 40]
  buf.set(sub);
  return buf[0] === 20 && buf[1] === 30 && buf[2] === 40 && 
         buf[3] === 0 && buf[4] === 0;
});

test('从不同字节序的 TypedArray 设置', () => {
  const buf = Buffer.alloc(8);
  const ab = new ArrayBuffer(8);
  const view = new DataView(ab);
  view.setUint16(0, 0x0102, false); // Big Endian
  view.setUint16(2, 0x0304, true);  // Little Endian
  const uint8 = new Uint8Array(ab);
  buf.set(uint8);
  // Big Endian: 0x01, 0x02
  // Little Endian: 0x04, 0x03
  return buf[0] === 0x01 && buf[1] === 0x02 && 
         buf[2] === 0x04 && buf[3] === 0x03;
});

// 零长度 TypedArray
test('从零长度 Uint8Array 设置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const uint8 = new Uint8Array(0);
  buf.set(uint8);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

test('从零长度 Float32Array 设置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const float32 = new Float32Array(0);
  buf.set(float32);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 大型 TypedArray
test('从大型 Uint8Array 设置', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);
  const uint8 = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    uint8[i] = i % 256;
  }
  buf.set(uint8);
  return buf[0] === 0 && buf[255] === 255 && buf[256] === 0 && 
         buf[9999] === (9999 % 256);
});

// TypedArray 与 offset
test('从 Uint16Array 设置（指定 offset）', () => {
  const buf = Buffer.alloc(6);
  const uint16 = new Uint16Array([0x0102, 0x0304]);
  buf.set(uint16, 2);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 0x02 && 
         buf[3] === 0x04 && buf[4] === 0 && buf[5] === 0;
});

test('从 Float32Array 设置（指定 offset）', () => {
  const buf = Buffer.alloc(5);
  const float32 = new Float32Array([1.5, 2.7]);
  buf.set(float32, 2);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && 
         buf[3] === 2 && buf[4] === 0;
});

// 混合类型连续设置
test('连续从不同 TypedArray 设置', () => {
  const buf = Buffer.alloc(10);
  buf.set(new Uint8Array([1, 2]), 0);
  buf.set(new Uint16Array([0x0304]), 2);
  buf.set(new Float32Array([5.5]), 3);
  buf.set(new Int8Array([-1]), 4);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 0x04 && 
         buf[3] === 5 && buf[4] === 255;
});

// TypedArray 特殊值
test('Float32Array 包含 NaN', () => {
  const buf = Buffer.alloc(3);
  const float32 = new Float32Array([NaN, 1, 2]);
  buf.set(float32);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('Float32Array 包含 Infinity', () => {
  const buf = Buffer.alloc(3);
  const float32 = new Float32Array([Infinity, -Infinity, 1]);
  buf.set(float32);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1;
});

test('Float64Array 包含 NaN', () => {
  const buf = Buffer.alloc(3);
  const float64 = new Float64Array([NaN, 1, 2]);
  buf.set(float64);
  return buf[0] === 0 && buf[1] === 1 && buf[2] === 2;
});

test('Float64Array 包含 Infinity', () => {
  const buf = Buffer.alloc(3);
  const float64 = new Float64Array([Infinity, -Infinity, 1]);
  buf.set(float64);
  return buf[0] === 0 && buf[1] === 0 && buf[2] === 1;
});

// 从共享 ArrayBuffer 的不同视图设置
test('从共享 ArrayBuffer 的不同 TypedArray 视图设置', () => {
  const ab = new ArrayBuffer(8);
  const uint8 = new Uint8Array(ab);
  uint8[0] = 1;
  uint8[1] = 2;
  
  const uint16 = new Uint16Array(ab, 2, 2); // offset=2, length=2
  uint16[0] = 0x0304;
  uint16[1] = 0x0506;
  
  const buf = Buffer.alloc(8);
  buf.set(uint8);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 0x04 && 
         buf[3] === 0x03 && buf[4] === 0x06 && buf[5] === 0x05;
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
