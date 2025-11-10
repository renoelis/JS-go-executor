// buf.readInt8() - 不同 Buffer 来源测试
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

// Buffer.from() 不同参数
test('Buffer.from(array) 读取', () => {
  const buf = Buffer.from([127, -128, 0]);
  return buf.readInt8(0) === 127 && buf.readInt8(1) === -128 && buf.readInt8(2) === 0;
});

test('Buffer.from(string, encoding) 读取', () => {
  const buf = Buffer.from('test', 'utf8');
  const firstByte = buf.readInt8(0);
  // 't' 的 ASCII 码是 116
  return firstByte === 116;
});

test('Buffer.from(buffer) 读取', () => {
  const original = Buffer.from([100, -50]);
  const copy = Buffer.from(original);
  return copy.readInt8(0) === 100 && copy.readInt8(1) === -50;
});

// Buffer.alloc()
test('Buffer.alloc() 默认值读取', () => {
  const buf = Buffer.alloc(3);
  return buf.readInt8(0) === 0 && buf.readInt8(1) === 0 && buf.readInt8(2) === 0;
});

test('Buffer.alloc(size, fill) 读取', () => {
  const buf = Buffer.alloc(3, 100);
  return buf.readInt8(0) === 100 && buf.readInt8(1) === 100 && buf.readInt8(2) === 100;
});

test('Buffer.alloc() 负数填充读取', () => {
  const buf = Buffer.alloc(3, -50);
  return buf.readInt8(0) === -50 && buf.readInt8(1) === -50 && buf.readInt8(2) === -50;
});

// Buffer.allocUnsafe()
test('Buffer.allocUnsafe() 写入后读取', () => {
  const buf = Buffer.allocUnsafe(2);
  buf.writeInt8(127, 0);
  buf.writeInt8(-128, 1);
  return buf.readInt8(0) === 127 && buf.readInt8(1) === -128;
});

// ArrayBuffer 视图
test('从 Uint8Array 创建的 Buffer 读取', () => {
  const arr = new Uint8Array([127, 128, 255]);
  const buf = Buffer.from(arr.buffer);
  return buf.readInt8(0) === 127 && buf.readInt8(1) === -128 && buf.readInt8(2) === -1;
});

test('从 Int8Array 创建的 Buffer 读取', () => {
  const arr = new Int8Array([127, -128, -1]);
  const buf = Buffer.from(arr.buffer);
  return buf.readInt8(0) === 127 && buf.readInt8(1) === -128 && buf.readInt8(2) === -1;
});

test('从 ArrayBuffer 创建的 Buffer 读取', () => {
  const ab = new ArrayBuffer(3);
  const view = new Uint8Array(ab);
  view[0] = 127;
  view[1] = 128;
  view[2] = 0;
  const buf = Buffer.from(ab);
  return buf.readInt8(0) === 127 && buf.readInt8(1) === -128 && buf.readInt8(2) === 0;
});

// Buffer.concat()
test('Buffer.concat() 后读取', () => {
  const buf1 = Buffer.from([100]);
  const buf2 = Buffer.from([-50]);
  const buf3 = Buffer.from([0]);
  const combined = Buffer.concat([buf1, buf2, buf3]);
  return combined.readInt8(0) === 100 && combined.readInt8(1) === -50 && combined.readInt8(2) === 0;
});

// slice 后读取
test('Buffer.slice() 后读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sliced = buf.slice(1, 4);
  return sliced.readInt8(0) === 20 && sliced.readInt8(1) === 30 && sliced.readInt8(2) === 40;
});

test('Buffer.subarray() 后读取', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2, 5);
  return sub.readInt8(0) === 30 && sub.readInt8(1) === 40 && sub.readInt8(2) === 50;
});

// 填充后读取
test('Buffer.fill() 后读取', () => {
  const buf = Buffer.alloc(5);
  buf.fill(127);
  return buf.readInt8(0) === 127 && buf.readInt8(4) === 127;
});

test('Buffer.fill() 负数后读取', () => {
  const buf = Buffer.alloc(5);
  buf.fill(-128);
  return buf.readInt8(0) === -128 && buf.readInt8(4) === -128;
});

// 复制后读取
test('Buffer.copy() 后读取', () => {
  const src = Buffer.from([127, -128, 0]);
  const dst = Buffer.alloc(5);
  src.copy(dst, 1);
  return dst.readInt8(0) === 0 && dst.readInt8(1) === 127 && dst.readInt8(2) === -128 && dst.readInt8(3) === 0;
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
