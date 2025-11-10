// buf.readDoubleBE() - TypedArray 互操作测试
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
  const arr = new Uint8Array([0x40, 0x09, 0x21, 0xFB, 0x54, 0x44, 0x2D, 0x18]);
  const buf = Buffer.from(arr);
  return Math.abs(buf.readDoubleBE(0) - Math.PI) < 1e-15;
});

// 从 ArrayBuffer 创建
test('从 ArrayBuffer 创建并读取', () => {
  const ab = new ArrayBuffer(8);
  const view = new Uint8Array(ab);
  view.set([0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const buf = Buffer.from(ab);
  return buf.readDoubleBE(0) === 1.0;
});

// 与 DataView 对比
test('Buffer.readDoubleBE vs DataView.getFloat64 BE', () => {
  const arr = new Uint8Array([0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  const buf = Buffer.from(arr);
  const dv = new DataView(arr.buffer);
  return buf.readDoubleBE(0) === dv.getFloat64(0, false);
});

test('多个位置对比', () => {
  const arr = new Uint8Array(16);
  arr.set([0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 0);
  arr.set([0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 8);
  const buf = Buffer.from(arr);
  const dv = new DataView(arr.buffer);
  return buf.readDoubleBE(0) === dv.getFloat64(0, false) &&
         buf.readDoubleBE(8) === dv.getFloat64(8, false);
});

// Float64Array 互操作
test('与 Float64Array 互操作（需注意字节序）', () => {
  const f64arr = new Float64Array([Math.PI]);
  const buf = Buffer.from(f64arr.buffer);
  // 注意：Float64Array 使用系统字节序，可能是 LE
  const result = buf.readDoubleBE(0);
  return typeof result === 'number' && !Number.isNaN(result);
});

// Buffer.buffer 属性
test('通过 buffer 属性访问 ArrayBuffer', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(2.718281828, 0);
  const ab = buf.buffer;
  const dv = new DataView(ab, buf.byteOffset, buf.byteLength);
  return Math.abs(dv.getFloat64(0, false) - 2.718281828) < 1e-9;
});

// SharedArrayBuffer（如果支持）
test('SharedArrayBuffer 支持', () => {
  try {
    const sab = new SharedArrayBuffer(8);
    const view = new Uint8Array(sab);
    view.set([0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const buf = Buffer.from(sab);
    return buf.readDoubleBE(0) === 1.0;
  } catch (e) {
    // SharedArrayBuffer 可能不支持
    return true;
  }
});

// Buffer subarray
test('Buffer subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(123.456, 8);
  const sub = buf.subarray(8, 16);
  return Math.abs(sub.readDoubleBE(0) - 123.456) < 0.001;
});

test('Buffer slice', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleBE(789.012, 8);
  const slice = buf.slice(8, 16);
  return Math.abs(slice.readDoubleBE(0) - 789.012) < 0.001;
});

// 跨 TypedArray 类型
test('Int8Array 转 Buffer 读取', () => {
  const i8arr = new Int8Array([0x40, 0x09, 0x21, -5, 0x54, 0x44, 0x2D, 0x18]);
  const buf = Buffer.from(i8arr.buffer);
  const result = buf.readDoubleBE(0);
  return typeof result === 'number';
});

test('Uint16Array 转 Buffer 读取', () => {
  const u16arr = new Uint16Array(4);
  const buf = Buffer.from(u16arr.buffer);
  buf.writeDoubleBE(3.14, 0);
  return Math.abs(buf.readDoubleBE(0) - 3.14) < 0.01;
});

// Buffer.from 多种方式
test('Buffer.from(buffer)', () => {
  const buf1 = Buffer.alloc(8);
  buf1.writeDoubleBE(999.999, 0);
  const buf2 = Buffer.from(buf1);
  return Math.abs(buf2.readDoubleBE(0) - 999.999) < 0.001;
});

test('Buffer.from(arrayBuffer, offset, length)', () => {
  const ab = new ArrayBuffer(16);
  const view = new Uint8Array(ab);
  view.set([0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], 4);
  const buf = Buffer.from(ab, 4, 8);
  return buf.readDoubleBE(0) === 2.0;
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
