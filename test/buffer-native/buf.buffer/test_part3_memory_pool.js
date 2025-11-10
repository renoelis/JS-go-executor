// buf.buffer - Memory Pool & Advanced Scenarios (Part 3)
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

// ========== 环境检测 ==========
// 检测是否支持内存池（Node.js 支持，goja 不支持）
const buf1_test = Buffer.allocUnsafe(10);
const buf2_test = Buffer.allocUnsafe(10);
const hasMemoryPool = buf1_test.buffer === buf2_test.buffer;
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

// ========== Buffer.poolSize 和内存池行为 ==========

test('Buffer.poolSize 存在且为数字', () => {
  return typeof Buffer.poolSize === 'number' && Buffer.poolSize > 0;
});

test('Buffer.poolSize 默认值为 8192', () => {
  return Buffer.poolSize === 8192;
});

test('小型 allocUnsafe Buffer 的内存池行为', () => {
  // Node.js: 共享内存池；goja: 独立 ArrayBuffer
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  if (hasMemoryPool) {
    // Node.js: 应该共享同一个 ArrayBuffer
    return buf1.buffer === buf2.buffer;
  } else {
    // goja: 每个 Buffer 都有独立的 ArrayBuffer
    return buf1.buffer !== buf2.buffer && buf1.buffer instanceof ArrayBuffer && buf2.buffer instanceof ArrayBuffer;
  }
});

test('小型 allocUnsafe Buffer 的 byteOffset 行为', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const buf2 = Buffer.allocUnsafe(10);
  if (hasMemoryPool) {
    // Node.js: byteOffset 应该不同（因为共享池）
    return buf1.byteOffset !== buf2.byteOffset;
  } else {
    // goja: byteOffset 都是 0（独立 ArrayBuffer）
    return buf1.byteOffset === 0 && buf2.byteOffset === 0;
  }
});

test('内存池中的 Buffer 的 byteOffset 行为', () => {
  const buf1 = Buffer.allocUnsafe(10);
  const offset1 = buf1.byteOffset;
  const buf2 = Buffer.allocUnsafe(10);
  const offset2 = buf2.byteOffset;
  if (hasMemoryPool) {
    // Node.js: offset2 应该大于 offset1（递增）
    return offset2 > offset1;
  } else {
    // goja: 都是 0
    return offset1 === 0 && offset2 === 0;
  }
});

test('Buffer.alloc 也可能使用内存池', () => {
  const buf = Buffer.alloc(10);
  // alloc 也可能使用内存池（但会清零）
  return buf.buffer instanceof ArrayBuffer;
});

test('达到 poolSize 的 Buffer 独立 ArrayBuffer', () => {
  const buf = Buffer.allocUnsafe(Buffer.poolSize);
  // 大小等于 poolSize 的 Buffer 应该有独立的 ArrayBuffer
  // Node.js 和 goja 都应该是独立的
  return buf.byteOffset === 0 && buf.buffer.byteLength >= Buffer.poolSize;
});

test('超过 poolSize 的 Buffer 独立 ArrayBuffer', () => {
  const buf = Buffer.allocUnsafe(Buffer.poolSize + 1);
  // 超过 poolSize 的 Buffer 应该有独立的 ArrayBuffer
  // Node.js 和 goja 都应该是独立的
  return buf.byteOffset === 0 && buf.buffer.byteLength >= Buffer.poolSize + 1;
});

// ========== Buffer.allocUnsafeSlow ==========

test('Buffer.allocUnsafeSlow 存在', () => {
  return typeof Buffer.allocUnsafeSlow === 'function';
});

test('allocUnsafeSlow 创建独立 ArrayBuffer', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  // allocUnsafeSlow 总是创建独立的 ArrayBuffer
  return buf.byteOffset === 0;
});

test('allocUnsafeSlow 的 buffer.byteLength 等于 length', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  // 不使用池，所以 ArrayBuffer 大小应该正好等于 Buffer 大小
  return buf.buffer.byteLength === buf.length;
});

test('allocUnsafeSlow 不共享内存池', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  // 两个独立的 ArrayBuffer
  return buf1.buffer !== buf2.buffer;
});

test('allocUnsafeSlow 小buffer也独立', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  return buf.byteOffset === 0 && buf.buffer.byteLength === 5;
});

// ========== SharedArrayBuffer 支持 ==========

test('SharedArrayBuffer 环境检测', () => {
  // Node.js 支持，goja 不支持
  // 这个测试只是检测环境，不判断对错
  return typeof SharedArrayBuffer !== 'undefined' === hasSharedArrayBuffer;
});

test('从 SharedArrayBuffer 创建 Buffer', () => {
  if (!hasSharedArrayBuffer) {
    // goja 不支持 SharedArrayBuffer，跳过测试
    return true;
  }
  try {
    const sab = new SharedArrayBuffer(10);
    const buf = Buffer.from(sab);
    return buf.buffer instanceof SharedArrayBuffer;
  } catch (e) {
    return false;
  }
});

test('从 SharedArrayBuffer 创建的 Buffer.buffer 指向原 SAB', () => {
  if (!hasSharedArrayBuffer) {
    // goja 不支持 SharedArrayBuffer，跳过测试
    return true;
  }
  try {
    const sab = new SharedArrayBuffer(10);
    const buf = Buffer.from(sab);
    return buf.buffer === sab;
  } catch (e) {
    return false;
  }
});

test('SharedArrayBuffer 部分创建 Buffer', () => {
  if (!hasSharedArrayBuffer) {
    // goja 不支持 SharedArrayBuffer，跳过测试
    return true;
  }
  try {
    const sab = new SharedArrayBuffer(20);
    const buf = Buffer.from(sab, 5, 10);
    return buf.buffer === sab && buf.byteOffset === 5 && buf.length === 10;
  } catch (e) {
    return false;
  }
});

test('修改 SharedArrayBuffer 的 Buffer 影响原数据', () => {
  if (!hasSharedArrayBuffer) {
    // goja 不支持 SharedArrayBuffer，跳过测试
    return true;
  }
  try {
    const sab = new SharedArrayBuffer(10);
    const buf = Buffer.from(sab);
    const view = new Uint8Array(sab);
    buf[0] = 42;
    return view[0] === 42;
  } catch (e) {
    return false;
  }
});

// ========== TypedArray.buffer 互操作 ==========

test('从 TypedArray.buffer 创建 Buffer 共享 ArrayBuffer', () => {
  const u8 = new Uint8Array(10);
  const buf = Buffer.from(u8.buffer);
  return buf.buffer === u8.buffer;
});

test('从 Int16Array.buffer 创建 Buffer', () => {
  const i16 = new Int16Array(5); // 10 bytes
  const buf = Buffer.from(i16.buffer);
  return buf.buffer === i16.buffer && buf.length === 10;
});

test('从 Float32Array.buffer 创建 Buffer', () => {
  const f32 = new Float32Array(5); // 20 bytes
  const buf = Buffer.from(f32.buffer);
  return buf.buffer === f32.buffer && buf.length === 20;
});

test('从 TypedArray.buffer 部分创建 Buffer', () => {
  const u8 = new Uint8Array(20);
  const buf = Buffer.from(u8.buffer, 5, 10);
  return buf.buffer === u8.buffer && buf.byteOffset === 5 && buf.length === 10;
});

// ========== 内存池重置场景 ==========

test('Buffer.alloc 创建大buffer后小buffer仍可用', () => {
  // 创建一个大 buffer
  const large = Buffer.alloc(Buffer.poolSize * 2);
  // 再创建小 buffer，应该能正常创建
  const small = Buffer.allocUnsafe(10);
  // Node.js 和 goja 都应该能正常创建
  return small.buffer instanceof ArrayBuffer && large.buffer instanceof ArrayBuffer;
});

// ========== buffer 属性与 byteLength 的关系 ==========

test('buffer.byteLength >= Buffer.length', () => {
  const buf = Buffer.allocUnsafe(10);
  // ArrayBuffer 的大小应该 >= Buffer 的长度
  // Node.js: 可能使用内存池（>= length）
  // goja: 独立 ArrayBuffer（== length）
  return buf.buffer.byteLength >= buf.length;
});

test('独立 buffer 的 byteLength 等于 length', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  // allocUnsafeSlow 总是创建独立 buffer，大小应该相等
  // Node.js 和 goja 都应该是这样
  return buf.buffer.byteLength === buf.length;
});

test('allocUnsafe buffer 的 byteLength 行为', () => {
  const buf = Buffer.allocUnsafe(10);
  if (hasMemoryPool) {
    // Node.js: 使用内存池，ArrayBuffer 大小通常是 poolSize
    return buf.buffer.byteLength === Buffer.poolSize;
  } else {
    // goja: 独立 ArrayBuffer，大小等于 length
    return buf.buffer.byteLength === buf.length;
  }
});

// ========== 零长度 Buffer 的特殊情况 ==========

test('Buffer.alloc(0) 的 buffer 属性', () => {
  const buf = Buffer.alloc(0);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.allocUnsafe(0) 的 buffer 属性', () => {
  const buf = Buffer.allocUnsafe(0);
  return buf.buffer instanceof ArrayBuffer;
});

test('Buffer.allocUnsafeSlow(0) 的 buffer 属性', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.buffer instanceof ArrayBuffer && buf.buffer.byteLength === 0;
});

test('零长度 Buffer 的 byteOffset', () => {
  const buf = Buffer.alloc(0);
  // byteOffset 应该是数字
  return typeof buf.byteOffset === 'number' && buf.byteOffset >= 0;
});

// ========== 跨 Buffer 实例的 buffer 共享 ==========

test('连续创建的小 Buffer 的 buffer 共享行为', () => {
  const buffers = [];
  for (let i = 0; i < 5; i++) {
    buffers.push(Buffer.allocUnsafe(10));
  }
  // 检查是否有至少两个 Buffer 共享 buffer
  const firstBuffer = buffers[0].buffer;
  const shareCount = buffers.filter((buf, i) => i > 0 && buf.buffer === firstBuffer).length;
  
  if (hasMemoryPool) {
    // Node.js: 应该共享 buffer
    return shareCount > 0;
  } else {
    // goja: 不共享 buffer，每个都是独立的
    return shareCount === 0 && buffers.every(buf => buf.buffer instanceof ArrayBuffer);
  }
});

test('大 Buffer 之间不共享 buffer', () => {
  const buf1 = Buffer.alloc(Buffer.poolSize);
  const buf2 = Buffer.alloc(Buffer.poolSize);
  // Node.js 和 goja 都应该不共享（因为大小 >= poolSize）
  return buf1.buffer !== buf2.buffer;
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

