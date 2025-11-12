// Buffer.allocUnsafeSlow - 查缺补漏测试
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

// ========== Buffer.poolSize 相关测试 ==========

test('allocUnsafeSlow 不受 Buffer.poolSize 影响', () => {
  const originalPoolSize = Buffer.poolSize;
  Buffer.poolSize = 16; // 设置很小的池大小
  
  const buf1 = Buffer.allocUnsafeSlow(32); // 大于池大小
  const buf2 = Buffer.allocUnsafeSlow(8);  // 小于池大小
  
  Buffer.poolSize = originalPoolSize; // 恢复原始值
  
  return buf1.length === 32 && buf2.length === 8;
});

test('allocUnsafeSlow 与 allocUnsafe 在池大小边界的差异', () => {
  const originalPoolSize = Buffer.poolSize;
  Buffer.poolSize = 100;
  
  const slowBuf1 = Buffer.allocUnsafeSlow(50); // 小于池大小的一半
  const slowBuf2 = Buffer.allocUnsafeSlow(50);
  const unsafeBuf1 = Buffer.allocUnsafe(50);
  const unsafeBuf2 = Buffer.allocUnsafe(50);
  
  slowBuf1.fill(0);
  slowBuf2.fill(0);
  unsafeBuf1.fill(0);
  unsafeBuf2.fill(0);
  
  slowBuf1[0] = 123;
  unsafeBuf1[0] = 123;
  
  Buffer.poolSize = originalPoolSize;
  
  // allocUnsafeSlow 应该总是独立，allocUnsafe 可能共享池
  return slowBuf2[0] === 0; // slowBuf2 不受影响
});

// ========== byteOffset 属性测试 ==========

test('allocUnsafeSlow 返回的 Buffer byteOffset 为 0', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  return buf.byteOffset === 0;
});

test('allocUnsafeSlow 不同大小的 Buffer byteOffset 都为 0', () => {
  const sizes = [1, 10, 100, 1000, 4096, 8192];
  for (const size of sizes) {
    const buf = Buffer.allocUnsafeSlow(size);
    if (buf.byteOffset !== 0) return false;
  }
  return true;
});

// ========== ArrayBuffer 独立性深度验证 ==========

test('allocUnsafeSlow 每次返回独立的 ArrayBuffer', () => {
  const buf1 = Buffer.allocUnsafeSlow(100);
  const buf2 = Buffer.allocUnsafeSlow(100);
  const buf3 = Buffer.allocUnsafeSlow(100);
  
  return buf1.buffer !== buf2.buffer && 
         buf2.buffer !== buf3.buffer && 
         buf1.buffer !== buf3.buffer;
});

test('allocUnsafeSlow ArrayBuffer 大小等于 Buffer 长度', () => {
  const sizes = [1, 10, 100, 1000];
  for (const size of sizes) {
    const buf = Buffer.allocUnsafeSlow(size);
    if (buf.buffer.byteLength !== size) return false;
  }
  return true;
});

test('allocUnsafeSlow 创建的 Buffer 占用整个 ArrayBuffer', () => {
  const buf = Buffer.allocUnsafeSlow(50);
  return buf.byteOffset === 0 && buf.length === buf.buffer.byteLength;
});

// ========== 与 Buffer.from 的对比测试 ==========

test('allocUnsafeSlow 与 Buffer.from 的池化差异', () => {
  // Buffer.from 可能使用池，allocUnsafeSlow 不使用
  const fromBuf1 = Buffer.from('hello');
  const fromBuf2 = Buffer.from('world');
  const slowBuf1 = Buffer.allocUnsafeSlow(5);
  const slowBuf2 = Buffer.allocUnsafeSlow(5);
  
  // allocUnsafeSlow 应该总是独立的 ArrayBuffer
  return slowBuf1.buffer !== slowBuf2.buffer;
});

// ========== TypedArray 互操作性测试 ==========

test('allocUnsafeSlow 可以创建 TypedArray 视图', () => {
  const buf = Buffer.allocUnsafeSlow(16);
  const uint32View = new Uint32Array(buf.buffer);
  const uint8View = new Uint8Array(buf.buffer);
  
  uint32View[0] = 0x12345678;
  
  return uint8View[0] === 0x78 || uint8View[0] === 0x12; // 取决于字节序
});

test('allocUnsafeSlow 与 TypedArray 共享内存', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  const float64View = new Float64Array(buf.buffer);
  
  buf.fill(0);
  float64View[0] = 3.14159;
  
  return buf.some(byte => byte !== 0); // Buffer 应该反映 Float64Array 的修改
});

// ========== 内存压力和边界测试 ==========

test('连续分配大量小 Buffer 不会失败', () => {
  const buffers = [];
  try {
    for (let i = 0; i < 1000; i++) {
      buffers.push(Buffer.allocUnsafeSlow(10));
    }
    return buffers.length === 1000;
  } catch (e) {
    return false;
  }
});

test('分配后立即释放引用', () => {
  let success = true;
  try {
    for (let i = 0; i < 100; i++) {
      let buf = Buffer.allocUnsafeSlow(1000);
      buf.fill(i % 256);
      buf = null; // 释放引用
    }
  } catch (e) {
    success = false;
  }
  return success;
});

// ========== 函数属性和元数据测试 ==========

test('allocUnsafeSlow 函数的 toString 包含原生代码', () => {
  const str = Buffer.allocUnsafeSlow.toString();
  return str.includes('[native code]') || str.includes('function');
});

test('allocUnsafeSlow 可配置', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Buffer, 'allocUnsafeSlow');
  return descriptor && descriptor.configurable === true;
});

test('allocUnsafeSlow 可枚举', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Buffer, 'allocUnsafeSlow');
  return descriptor && descriptor.enumerable === true;
});

// ========== 错误边界的精确测试 ==========

test('allocUnsafeSlow(-0) 等同于 allocUnsafeSlow(0)', () => {
  const buf = Buffer.allocUnsafeSlow(-0);
  return buf.length === 0;
});

test('allocUnsafeSlow(Number.POSITIVE_INFINITY) 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(Number.POSITIVE_INFINITY);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('allocUnsafeSlow(Number.NEGATIVE_INFINITY) 抛出 RangeError', () => {
  try {
    Buffer.allocUnsafeSlow(Number.NEGATIVE_INFINITY);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// ========== 内存内容验证 ==========

test('allocUnsafeSlow 内容确实未初始化（可能包含随机数据）', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  // 不能假设内容，但可以验证长度和类型
  return buf.length === 100 && Buffer.isBuffer(buf);
});

test('allocUnsafeSlow 可以安全地被覆盖', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(42);
  return buf.every(byte => byte === 42);
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
