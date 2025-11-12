// Buffer.from() - Part 5: Buffer Copy and Isolation Tests
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

// Buffer.from(buffer) 复制测试
test('从 Buffer 创建 - 是新的 Buffer 实例', () => {
  const original = Buffer.from('hello');
  const copy = Buffer.from(original);
  return copy !== original;
});

test('从 Buffer 创建 - 内容相同', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const copy = Buffer.from(original);
  return copy.equals(original);
});

test('从 Buffer 创建 - 修改原始 Buffer 不影响副本', () => {
  const original = Buffer.from([10, 20, 30]);
  const copy = Buffer.from(original);
  original[0] = 99;
  return copy[0] === 10 && original[0] === 99;
});

test('从 Buffer 创建 - 修改副本不影响原始 Buffer', () => {
  const original = Buffer.from([10, 20, 30]);
  const copy = Buffer.from(original);
  copy[1] = 88;
  return original[1] === 20 && copy[1] === 88;
});

test('从空 Buffer 创建', () => {
  const original = Buffer.from([]);
  const copy = Buffer.from(original);
  return copy.length === 0 && copy !== original;
});

test('从大 Buffer 创建（1000 字节）', () => {
  const original = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    original[i] = i % 256;
  }
  const copy = Buffer.from(original);
  return copy.length === 1000 && copy[500] === original[500] && copy !== original;
});

test('从 Buffer 子类创建', () => {
  const original = Buffer.from('test');
  const copy = Buffer.from(original);
  return Buffer.isBuffer(copy) && copy.toString() === 'test';
});

// TypedArray 视图隔离测试
test('从 Uint8Array 创建 - 修改原始不影响 Buffer', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from(uint8);
  uint8[0] = 99;
  return buf[0] === 1;
});

test('从 Uint8Array 创建 - 修改 Buffer 不影响原始', () => {
  const uint8 = new Uint8Array([1, 2, 3]);
  const buf = Buffer.from(uint8);
  buf[1] = 88;
  return uint8[1] === 2;
});

// ArrayBuffer 视图隔离测试
test('从 ArrayBuffer 创建 - 共享内存（视图关系）', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[0] = 42;
  const buf = Buffer.from(ab);
  // 注意：Buffer.from(ArrayBuffer) 会创建视图，可能共享内存
  // 在 Node.js 中的实际行为需要测试
  return buf[0] === 42;
});

test('从 ArrayBuffer 创建带 offset - 正确的数据起点', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  for (let i = 0; i < 10; i++) {
    view[i] = i * 10;
  }
  const buf = Buffer.from(ab, 3, 4);
  return buf.length === 4 && buf[0] === 30 && buf[1] === 40;
});

test('从 ArrayBuffer 创建 - offset 和 length 提取正确范围', () => {
  const ab = new ArrayBuffer(20);
  const view = new Uint8Array(ab);
  view[5] = 100;
  view[9] = 200;
  const buf = Buffer.from(ab, 5, 5);
  return buf.length === 5 && buf[0] === 100 && buf[4] === 200;
});

// 多层嵌套测试
test('从 Buffer 创建的 Buffer 再创建', () => {
  const original = Buffer.from('nested');
  const copy1 = Buffer.from(original);
  const copy2 = Buffer.from(copy1);
  return copy2.toString() === 'nested' && copy2 !== copy1 && copy2 !== original;
});

test('Buffer 链式复制 - 每层独立', () => {
  const b1 = Buffer.from([1, 2, 3]);
  const b2 = Buffer.from(b1);
  const b3 = Buffer.from(b2);
  b1[0] = 10;
  b2[1] = 20;
  return b3[0] === 1 && b3[1] === 2 && b3[2] === 3;
});

// TypedArray 的不同类型
test('从 Int8Array 创建（负数转无符号）', () => {
  const int8 = new Int8Array([-1, -128, 127]);
  const buf = Buffer.from(int8);
  return buf[0] === 255 && buf[1] === 128 && buf[2] === 127;
});

test('从 Uint16Array.buffer 创建', () => {
  const uint16 = new Uint16Array([0x0102, 0x0304]);
  const buf = Buffer.from(uint16.buffer);
  // 应该获得 4 字节（取决于字节序）
  return buf.length === 4;
});

test('从 Uint32Array.buffer 创建', () => {
  const uint32 = new Uint32Array([0x01020304, 0x05060708]);
  const buf = Buffer.from(uint32.buffer);
  return buf.length === 8;
});

test('从 Float64Array.buffer 创建', () => {
  const float64 = new Float64Array([1.5, 2.5]);
  const buf = Buffer.from(float64.buffer);
  return buf.length === 16;
});

// 空缓冲区隔离
test('从空 Uint8Array 创建', () => {
  const uint8 = new Uint8Array(0);
  const buf = Buffer.from(uint8);
  return buf.length === 0;
});

test('从空 ArrayBuffer 创建', () => {
  const ab = new ArrayBuffer(0);
  const buf = Buffer.from(ab);
  return buf.length === 0;
});

// 边界字节值
test('从 Buffer 复制 - 所有字节值 0-255', () => {
  const original = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    original[i] = i;
  }
  const copy = Buffer.from(original);
  let allMatch = true;
  for (let i = 0; i < 256; i++) {
    if (copy[i] !== i) {
      allMatch = false;
      break;
    }
  }
  return allMatch && copy !== original;
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
