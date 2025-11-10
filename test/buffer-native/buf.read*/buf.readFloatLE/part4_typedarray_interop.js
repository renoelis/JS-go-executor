// buf.readFloatLE() - TypedArray 互操作测试
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

// 从 Uint8Array 创建
test('从 Uint8Array 创建 Buffer 并读取', () => {
  const arr = new Uint8Array([0x00, 0x00, 0x80, 0x3F]); // 1.0 in LE
  const buf = Buffer.from(arr);
  return buf.readFloatLE(0) === 1.0;
});

// 从 ArrayBuffer 创建
test('从 ArrayBuffer 创建 Buffer 并读取', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 0x00;
  view[1] = 0x00;
  view[2] = 0x80;
  view[3] = 0x3F;
  const buf = Buffer.from(ab);
  return buf.readFloatLE(0) === 1.0;
});

// 与 DataView 对比
test('与 DataView.getFloat32 结果一致（LE）', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(3.14, 0);
  
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.length);
  const bufResult = buf.readFloatLE(0);
  const dvResult = dv.getFloat32(0, true); // true = little-endian
  
  return Math.abs(bufResult - dvResult) < 0.00001;
});

// Float32Array 互操作
test('与 Float32Array 互操作', () => {
  const f32 = new Float32Array([2.5]);
  const buf = Buffer.from(f32.buffer);
  return buf.readFloatLE(0) === 2.5;
});

// Buffer subarray 读取
test('Buffer.subarray 创建的视图可以读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(1.5, 4);
  const sub = buf.subarray(4);
  return sub.readFloatLE(0) === 1.5;
});

// Buffer slice 读取
test('Buffer.slice 创建的切片可以读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatLE(2.718, 4);
  const slice = buf.slice(4);
  return Math.abs(slice.readFloatLE(0) - 2.718) < 0.001;
});

// 跨 TypedArray 类型
test('从 Int32Array 的 buffer 创建 Buffer', () => {
  const i32 = new Int32Array([0x3F800000]); // 1.0 的整数表示（需要 LE）
  const buf = Buffer.from(i32.buffer);
  return buf.readFloatLE(0) === 1.0;
});

// Buffer.from 多种方式
test('Buffer.from 数组方式读取', () => {
  const buf = Buffer.from([0xDB, 0x0F, 0x49, 0x40]); // π in LE
  const result = buf.readFloatLE(0);
  return Math.abs(result - 3.14159) < 0.001;
});

// 连续读取多个值
test('从同一 Buffer 连续读取多个 Float32 值', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatLE(1.1, 0);
  buf.writeFloatLE(2.2, 4);
  buf.writeFloatLE(3.3, 8);
  
  return Math.abs(buf.readFloatLE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatLE(4) - 2.2) < 0.01 &&
         Math.abs(buf.readFloatLE(8) - 3.3) < 0.01;
});

// ArrayBuffer 共享测试
test('Buffer 与原始 ArrayBuffer 共享内存', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  buf.writeFloatLE(1.5, 0);
  
  const view = new Float32Array(ab);
  return view[0] === 1.5;
});

// 修改原 Buffer 影响 subarray
test('修改原 Buffer 影响 subarray', () => {
  const buf = Buffer.alloc(8);
  const sub = buf.subarray(4);
  
  buf.writeFloatLE(2.5, 4);
  return sub.readFloatLE(0) === 2.5;
});

// 修改 subarray 影响原 Buffer
test('修改 subarray 影响原 Buffer', () => {
  const buf = Buffer.alloc(8);
  const sub = buf.subarray(4);
  
  sub.writeFloatLE(3.5, 0);
  return buf.readFloatLE(4) === 3.5;
});

// Buffer 和 Uint8Array 视图共享数据
test('Buffer 和 Uint8Array 视图共享数据', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatLE(1.0, 0);
  
  const u8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  return u8[0] === 0x00 && u8[1] === 0x00 && u8[2] === 0x80 && u8[3] === 0x3F;
});

// Buffer.concat 后读取
test('Buffer.concat 合并后可以读取', () => {
  const buf1 = Buffer.from([0x00, 0x00]);
  const buf2 = Buffer.from([0x80, 0x3F]);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.readFloatLE(0) === 1.0;
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
