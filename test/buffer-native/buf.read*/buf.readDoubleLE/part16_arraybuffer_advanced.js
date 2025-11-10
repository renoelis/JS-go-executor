// buf.readDoubleLE() - ArrayBuffer 高级边界测试
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

// Buffer 与原始 ArrayBuffer 共享内存
test('修改原 Buffer 影响 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(777.888, 0);
  const sub = buf.subarray(0, 8);
  buf.writeDoubleLE(888.999, 0);
  return Math.abs(sub.readDoubleLE(0) - 888.999) < 0.001;
});

test('修改 subarray 影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(999.111, 0);
  const sub = buf.subarray(0, 8);
  sub.writeDoubleLE(111.222, 0);
  return Math.abs(buf.readDoubleLE(0) - 111.222) < 0.001;
});

test('slice 和 subarray 在 Node.js 中都返回共享内存视图', () => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleLE(222.333, 0);
  const slice = buf.slice(0, 8);
  slice.writeDoubleLE(333.444, 0);
  return Math.abs(buf.readDoubleLE(0) - 333.444) < 0.001 &&
         Math.abs(slice.readDoubleLE(0) - 333.444) < 0.001;
});

test('从 TypedArray 的 buffer 属性创建 Buffer', () => {
  const ta = new Uint8Array(8);
  const buf = Buffer.from(ta.buffer);
  buf.writeDoubleLE(444.555, 0);
  return Math.abs(buf.readDoubleLE(0) - 444.555) < 0.001;
});

test('Buffer.concat 后读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeDoubleLE(555.666, 0);
  buf2.writeDoubleLE(666.777, 0);
  const concat = Buffer.concat([buf1, buf2]);
  return Math.abs(concat.readDoubleLE(0) - 555.666) < 0.001 &&
         Math.abs(concat.readDoubleLE(8) - 666.777) < 0.001;
});

test('零长度 Buffer.slice 不能读取', () => {
  try {
    const buf = Buffer.alloc(8);
    const slice = buf.slice(0, 0);
    slice.readDoubleLE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('ArrayBuffer 边界对齐测试', () => {
  const ab = new ArrayBuffer(24);
  const buf = Buffer.from(ab, 8, 8);
  buf.writeDoubleLE(777.888, 0);
  return Math.abs(buf.readDoubleLE(0) - 777.888) < 0.001;
});

test('多层 subarray 测试', () => {
  const buf = Buffer.alloc(32);
  buf.writeDoubleLE(888.999, 8);
  const sub1 = buf.subarray(4, 20);
  const sub2 = sub1.subarray(4, 12);
  return Math.abs(sub2.readDoubleLE(0) - 888.999) < 0.001;
});

test('Buffer.from 复制 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeDoubleLE(999.000, 0);
  const sub = buf.subarray(0, 8);
  const copy = Buffer.from(sub);
  buf.writeDoubleLE(101.202, 0);
  return Math.abs(copy.readDoubleLE(0) - 999.000) < 0.001 &&
         Math.abs(buf.readDoubleLE(0) - 101.202) < 0.001;
});

// ArrayBuffer 不同位置测试
test('从 ArrayBuffer 中间创建 Buffer', () => {
  const ab = new ArrayBuffer(32);
  const view = new DataView(ab);
  view.setFloat64(16, 123.456, true);
  const buf = Buffer.from(ab, 16, 8);
  return Math.abs(buf.readDoubleLE(0) - 123.456) < 0.001;
});

test('从 ArrayBuffer 开始位置创建 Buffer', () => {
  const ab = new ArrayBuffer(16);
  const view = new DataView(ab);
  view.setFloat64(0, 234.567, true);
  const buf = Buffer.from(ab, 0, 8);
  return Math.abs(buf.readDoubleLE(0) - 234.567) < 0.001;
});

test('从 ArrayBuffer 末尾位置创建 Buffer', () => {
  const ab = new ArrayBuffer(16);
  const view = new DataView(ab);
  view.setFloat64(8, 345.678, true);
  const buf = Buffer.from(ab, 8, 8);
  return Math.abs(buf.readDoubleLE(0) - 345.678) < 0.001;
});

// 共享 ArrayBuffer 的多个视图
test('从共享 ArrayBuffer 的多个 Buffer 视图读取', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);
  buf1.writeDoubleLE(111.111, 0);
  buf2.writeDoubleLE(222.222, 0);
  return Math.abs(buf1.readDoubleLE(0) - 111.111) < 0.001 &&
         Math.abs(buf2.readDoubleLE(0) - 222.222) < 0.001;
});

// Buffer.allocUnsafe 测试
test('Buffer.allocUnsafe 可以读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleLE(456.789, 0);
  return Math.abs(buf.readDoubleLE(0) - 456.789) < 0.001;
});

test('Buffer.allocUnsafeSlow 可以读取', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  buf.writeDoubleLE(567.890, 0);
  return Math.abs(buf.readDoubleLE(0) - 567.890) < 0.001;
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
