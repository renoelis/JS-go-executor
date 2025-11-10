// buf[index] - Part 11: TypedArray Interactions Tests
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

// Int8Array 交互测试
test('Buffer 和 Int8Array 共享内存索引同步', () => {
  const ab = new ArrayBuffer(3);
  const buf = Buffer.from(ab);
  const int8 = new Int8Array(ab);
  buf[0] = 127;
  buf[1] = 255;
  buf[2] = 128;
  return int8[0] === 127 && int8[1] === -1 && int8[2] === -128;
});

test('Int8Array 修改影响 Buffer', () => {
  const ab = new ArrayBuffer(3);
  const buf = Buffer.from(ab);
  const int8 = new Int8Array(ab);
  int8[0] = -1;
  int8[1] = -128;
  return buf[0] === 255 && buf[1] === 128;
});

// Uint16Array 交互测试
test('Buffer 和 Uint16Array 字节序', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const uint16 = new Uint16Array(ab);
  buf[0] = 0x01;
  buf[1] = 0x02;
  // 小端序：0x0201
  return uint16[0] === 0x0201;
});

test('Uint16Array 写入影响 Buffer 两个字节', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const uint16 = new Uint16Array(ab);
  uint16[0] = 0x1234;
  return buf[0] === 0x34 && buf[1] === 0x12;
});

// Int16Array 交互测试
test('Buffer 和 Int16Array 负数', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const int16 = new Int16Array(ab);
  buf[0] = 0xFF;
  buf[1] = 0xFF;
  return int16[0] === -1;
});

test('Int16Array 写入负数影响 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const int16 = new Int16Array(ab);
  int16[0] = -256;
  return buf[0] === 0x00 && buf[1] === 0xFF;
});

// Uint32Array 交互测试
test('Buffer 和 Uint32Array 四字节', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const uint32 = new Uint32Array(ab);
  buf[0] = 0x01;
  buf[1] = 0x02;
  buf[2] = 0x03;
  buf[3] = 0x04;
  return uint32[0] === 0x04030201;
});

test('Uint32Array 写入影响 Buffer 四个字节', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const uint32 = new Uint32Array(ab);
  uint32[0] = 0x12345678;
  return buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

// Float32Array 交互测试
test('Buffer 和 Float32Array 浮点数', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const float32 = new Float32Array(ab);
  float32[0] = 1.5;
  return buf[0] !== 0 || buf[1] !== 0 || buf[2] !== 0 || buf[3] !== 0;
});

test('Float32Array 写入后 Buffer 索引可读', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const float32 = new Float32Array(ab);
  float32[0] = 3.14;
  const byte0 = buf[0];
  return typeof byte0 === 'number' && byte0 >= 0 && byte0 <= 255;
});

// Float64Array 交互测试
test('Buffer 和 Float64Array 双精度浮点数', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const float64 = new Float64Array(ab);
  float64[0] = 1.7976931348623157e+308;
  return buf[0] !== 0 || buf[7] !== 0;
});

test('Float64Array 写入后 Buffer 八字节都有值', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const float64 = new Float64Array(ab);
  float64[0] = Math.PI;
  let hasNonZero = false;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0) {
      hasNonZero = true;
      break;
    }
  }
  return hasNonZero;
});

// BigInt64Array 交互测试
test('Buffer 和 BigInt64Array 交互', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const bigInt64 = new BigInt64Array(ab);
  bigInt64[0] = 9007199254740991n;
  return buf[0] !== 0 || buf[7] !== 0;
});

test('BigInt64Array 写入后 Buffer 可读', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const bigInt64 = new BigInt64Array(ab);
  bigInt64[0] = 255n;
  return buf[0] === 255 && buf[1] === 0;
});

// BigUint64Array 交互测试
test('Buffer 和 BigUint64Array 交互', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const bigUint64 = new BigUint64Array(ab);
  bigUint64[0] = 18446744073709551615n;
  return buf[0] === 255 && buf[7] === 255;
});

test('BigUint64Array 写入后 Buffer 八字节全满', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab);
  const bigUint64 = new BigUint64Array(ab);
  bigUint64[0] = 18446744073709551615n;
  let allFF = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 255) {
      allFF = false;
      break;
    }
  }
  return allFF;
});

// 混合 TypedArray 测试
test('多个 TypedArray 共享同一 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const uint8 = new Uint8Array(ab);
  const uint16 = new Uint16Array(ab);
  const uint32 = new Uint32Array(ab);
  
  buf[0] = 0x12;
  buf[1] = 0x34;
  buf[2] = 0x56;
  buf[3] = 0x78;
  
  return uint8[0] === 0x12 && uint16[0] === 0x3412 && uint32[0] === 0x78563412;
});

test('不同 TypedArray 修改同步', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const uint8 = new Uint8Array(ab);
  const uint16 = new Uint16Array(ab);
  
  uint16[0] = 0xABCD;
  return buf[0] === 0xCD && buf[1] === 0xAB && uint8[0] === 0xCD && uint8[1] === 0xAB;
});

// 不同偏移的 TypedArray
test('不同偏移的 Uint8Array 和 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const uint8_offset = new Uint8Array(ab, 2, 5);
  
  buf[2] = 10;
  buf[3] = 20;
  buf[4] = 30;
  
  return uint8_offset[0] === 10 && uint8_offset[1] === 20 && uint8_offset[2] === 30;
});

test('不同偏移的 Uint16Array 和 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const uint16_offset = new Uint16Array(ab, 2, 3);
  
  buf[2] = 0x12;
  buf[3] = 0x34;
  
  return uint16_offset[0] === 0x3412;
});

// DataView 与 Buffer 交互
test('DataView 和 Buffer 共享内存', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  
  buf[0] = 0x12;
  buf[1] = 0x34;
  
  return dv.getUint8(0) === 0x12 && dv.getUint8(1) === 0x34;
});

test('DataView setUint16 影响 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  
  dv.setUint16(0, 0x1234, false); // 大端序
  
  return buf[0] === 0x12 && buf[1] === 0x34;
});

test('DataView setUint16 小端序影响 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  
  dv.setUint16(0, 0x1234, true); // 小端序
  
  return buf[0] === 0x34 && buf[1] === 0x12;
});

test('DataView setInt32 影响 Buffer', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  
  dv.setInt32(0, -1, true); // 小端序
  
  return buf[0] === 255 && buf[1] === 255 && buf[2] === 255 && buf[3] === 255;
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
