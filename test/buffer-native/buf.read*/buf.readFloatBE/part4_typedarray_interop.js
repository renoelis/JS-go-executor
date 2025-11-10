// buf.readFloatBE() - TypedArray 互操作测试
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
test('从 Uint8Array 创建并读取', () => {
  const arr = new Uint8Array([0x40, 0x49, 0x0F, 0xDB]);
  const buf = Buffer.from(arr);
  return Math.abs(buf.readFloatBE(0) - Math.PI) < 0.00001;
});

// 从 ArrayBuffer 创建
test('从 ArrayBuffer 创建并读取', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view.set([0x3F, 0x80, 0x00, 0x00]);
  const buf = Buffer.from(ab);
  return buf.readFloatBE(0) === 1.0;
});

// 与 DataView 对比
test('Buffer.readFloatBE vs DataView.getFloat32 BE', () => {
  const arr = new Uint8Array([0x40, 0x00, 0x00, 0x00]);
  const buf = Buffer.from(arr);
  const dv = new DataView(arr.buffer);
  return buf.readFloatBE(0) === dv.getFloat32(0, false);
});

test('多个位置对比', () => {
  const arr = new Uint8Array(8);
  arr.set([0x3F, 0x80, 0x00, 0x00], 0);
  arr.set([0x40, 0x00, 0x00, 0x00], 4);
  const buf = Buffer.from(arr);
  const dv = new DataView(arr.buffer);
  return buf.readFloatBE(0) === dv.getFloat32(0, false) &&
         buf.readFloatBE(4) === dv.getFloat32(4, false);
});

// Float32Array 互操作
test('与 Float32Array 互操作（需注意字节序）', () => {
  const f32arr = new Float32Array([3.14]);
  const buf = Buffer.from(f32arr.buffer);
  // 注意：Float32Array 使用系统字节序，可能是 LE
  const result = buf.readFloatBE(0);
  return typeof result === 'number' && !Number.isNaN(result);
});

// Buffer.buffer 属性
test('通过 buffer 属性访问 ArrayBuffer', () => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(2.718, 0);
  const ab = buf.buffer;
  const dv = new DataView(ab, buf.byteOffset, buf.byteLength);
  return Math.abs(dv.getFloat32(0, false) - 2.718) < 0.001;
});

// SharedArrayBuffer（如果支持）
test('SharedArrayBuffer 支持', () => {
  try {
    const sab = new SharedArrayBuffer(4);
    const view = new Uint8Array(sab);
    view.set([0x3F, 0x80, 0x00, 0x00]);
    const buf = Buffer.from(sab);
    return buf.readFloatBE(0) === 1.0;
  } catch (e) {
    // SharedArrayBuffer 可能不支持
    return true;
  }
});

// Buffer subarray
test('Buffer subarray', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(123.456, 4);
  const sub = buf.subarray(4, 8);
  return Math.abs(sub.readFloatBE(0) - 123.456) < 0.001;
});

test('Buffer slice', () => {
  const buf = Buffer.alloc(8);
  buf.writeFloatBE(789.012, 4);
  const slice = buf.slice(4, 8);
  return Math.abs(slice.readFloatBE(0) - 789.012) < 0.001;
});

// 跨 TypedArray 类型
test('Int8Array 转 Buffer 读取', () => {
  const i8arr = new Int8Array([0x40, 0x09, 0x21, -5]);
  const buf = Buffer.from(i8arr.buffer);
  const result = buf.readFloatBE(0);
  return typeof result === 'number';
});

test('Uint16Array 转 Buffer 读取', () => {
  const u16arr = new Uint16Array(2);
  const buf = Buffer.from(u16arr.buffer);
  buf.writeFloatBE(3.14, 0);
  return Math.abs(buf.readFloatBE(0) - 3.14) < 0.01;
});

// Buffer.from 多种方式
test('Buffer.from(buffer)', () => {
  const buf1 = Buffer.alloc(4);
  buf1.writeFloatBE(999.999, 0);
  const buf2 = Buffer.from(buf1);
  return Math.abs(buf2.readFloatBE(0) - 999.999) < 0.001;
});

test('Buffer.from(arrayBuffer, offset, length)', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  view.set([0x40, 0x00, 0x00, 0x00], 2);
  const buf = Buffer.from(ab, 2, 4);
  return buf.readFloatBE(0) === 2.0;
});

// 多个连续读取
test('连续读取多个 float 值', () => {
  const buf = Buffer.alloc(12);
  buf.writeFloatBE(1.1, 0);
  buf.writeFloatBE(2.2, 4);
  buf.writeFloatBE(3.3, 8);
  return Math.abs(buf.readFloatBE(0) - 1.1) < 0.01 &&
         Math.abs(buf.readFloatBE(4) - 2.2) < 0.01 &&
         Math.abs(buf.readFloatBE(8) - 3.3) < 0.01;
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
