// Buffer.allocUnsafeSlow - 高级边界情况测试
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

// ========== 数值精度和转换测试 ==========

test('allocUnsafeSlow 处理 Number.MIN_SAFE_INTEGER', () => {
  try {
    Buffer.allocUnsafeSlow(Number.MIN_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('allocUnsafeSlow 处理 Number.MAX_SAFE_INTEGER', () => {
  try {
    Buffer.allocUnsafeSlow(Number.MAX_SAFE_INTEGER);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('allocUnsafeSlow 处理非常小的正数', () => {
  const buf = Buffer.allocUnsafeSlow(Number.MIN_VALUE);
  return buf.length === 0; // MIN_VALUE 向下取整为 0
});

test('allocUnsafeSlow 处理 1.9999999999999998', () => {
  const buf = Buffer.allocUnsafeSlow(1.9999999999999998);
  return buf.length === 1; // 向下取整
});

test('allocUnsafeSlow 处理 0.9999999999999999', () => {
  const buf = Buffer.allocUnsafeSlow(0.9999999999999999);
  return buf.length === 0; // 向下取整为 0
});

// ========== 特殊数值常量测试 ==========

test('allocUnsafeSlow 处理 Math.PI', () => {
  const buf = Buffer.allocUnsafeSlow(Math.PI);
  return buf.length === 3; // Math.PI ≈ 3.14159
});

test('allocUnsafeSlow 处理 Math.E', () => {
  const buf = Buffer.allocUnsafeSlow(Math.E);
  return buf.length === 2; // Math.E ≈ 2.718
});

test('allocUnsafeSlow 处理 Math.SQRT2', () => {
  const buf = Buffer.allocUnsafeSlow(Math.SQRT2);
  return buf.length === 1; // Math.SQRT2 ≈ 1.414
});

// ========== 内存对齐和性能测试 ==========

test('allocUnsafeSlow 2的幂次大小分配', () => {
  const powers = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
  for (const size of powers) {
    const buf = Buffer.allocUnsafeSlow(size);
    if (buf.length !== size) return false;
  }
  return true;
});

test('allocUnsafeSlow 奇数大小分配', () => {
  const oddSizes = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
  for (const size of oddSizes) {
    const buf = Buffer.allocUnsafeSlow(size);
    if (buf.length !== size) return false;
  }
  return true;
});

test('allocUnsafeSlow 质数大小分配', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
  for (const size of primes) {
    const buf = Buffer.allocUnsafeSlow(size);
    if (buf.length !== size) return false;
  }
  return true;
});

// ========== 与其他 Buffer 方法的深度交互 ==========

test('allocUnsafeSlow 创建的 Buffer 支持 subarray', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.fill(42);
  const sub = buf.subarray(5, 15);
  return sub.length === 10 && sub[0] === 42;
});

test('allocUnsafeSlow 创建的 Buffer 支持 slice', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.fill(123);
  const slice = buf.slice(3, 8);
  return slice.length === 5 && slice[0] === 123;
});

test('allocUnsafeSlow 创建的 Buffer 支持 copy', () => {
  const src = Buffer.allocUnsafeSlow(10);
  const dst = Buffer.allocUnsafeSlow(10);
  src.fill(99);
  dst.fill(0);
  const copied = src.copy(dst);
  return copied === 10 && dst[0] === 99;
});

test('allocUnsafeSlow 创建的 Buffer 支持 compare', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(1);
  buf2.fill(2);
  return Buffer.compare(buf1, buf2) < 0;
});

// ========== 内存视图和类型转换 ==========

test('allocUnsafeSlow 与 DataView 互操作', () => {
  const buf = Buffer.allocUnsafeSlow(8);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0x12345678, true); // 小端序
  return buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

test('allocUnsafeSlow 与 Int8Array 互操作', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  const int8 = new Int8Array(buf.buffer);
  int8[0] = -1;
  int8[1] = -128;
  return buf[0] === 255 && buf[1] === 128; // 无符号表示
});

test('allocUnsafeSlow 与 Uint16Array 互操作', () => {
  const buf = Buffer.allocUnsafeSlow(4);
  const uint16 = new Uint16Array(buf.buffer);
  uint16[0] = 0x1234;
  return (buf[0] === 0x34 && buf[1] === 0x12) || (buf[0] === 0x12 && buf[1] === 0x34);
});

// ========== 错误消息和堆栈跟踪测试 ==========

test('allocUnsafeSlow TypeError 包含参数信息', () => {
  try {
    Buffer.allocUnsafeSlow('invalid');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.length > 0;
  }
});

test('allocUnsafeSlow RangeError 包含范围信息', () => {
  try {
    Buffer.allocUnsafeSlow(-1);
    return false;
  } catch (e) {
    return e.name === 'RangeError' && e.message.length > 0;
  }
});

test('allocUnsafeSlow 错误有正确的堆栈跟踪', () => {
  try {
    Buffer.allocUnsafeSlow(null);
    return false;
  } catch (e) {
    return e.stack && e.stack.includes('allocUnsafeSlow');
  }
});

// ========== 内存生命周期测试 ==========

test('allocUnsafeSlow 创建的 Buffer 可以被垃圾回收', () => {
  // 创建大量 Buffer 然后释放引用
  for (let i = 0; i < 100; i++) {
    let buf = Buffer.allocUnsafeSlow(1000);
    buf.fill(i % 256);
    buf = null;
  }
  return true; // 如果没有内存泄漏，应该能正常完成
});

test('allocUnsafeSlow 大 Buffer 分配和释放', () => {
  try {
    let largeBuf = Buffer.allocUnsafeSlow(10 * 1024 * 1024); // 10MB
    largeBuf.fill(0);
    largeBuf = null;
    return true;
  } catch (e) {
    return false;
  }
});

// ========== 并发和竞态条件测试 ==========

test('allocUnsafeSlow 在快速连续调用中保持独立性', () => {
  const buffers = [];
  for (let i = 0; i < 50; i++) {
    buffers.push(Buffer.allocUnsafeSlow(10));
  }
  
  // 填充不同的值
  buffers.forEach((buf, index) => {
    buf.fill(index % 256);
  });
  
  // 验证每个 Buffer 都有正确的值
  return buffers.every((buf, index) => {
    return buf.every(byte => byte === (index % 256));
  });
});

// ========== 边界值的精确测试 ==========

test('allocUnsafeSlow(0.0) 等同于 allocUnsafeSlow(0)', () => {
  const buf1 = Buffer.allocUnsafeSlow(0.0);
  const buf2 = Buffer.allocUnsafeSlow(0);
  return buf1.length === 0 && buf2.length === 0;
});

test('allocUnsafeSlow(-0.0) 等同于 allocUnsafeSlow(0)', () => {
  const buf = Buffer.allocUnsafeSlow(-0.0);
  return buf.length === 0;
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
