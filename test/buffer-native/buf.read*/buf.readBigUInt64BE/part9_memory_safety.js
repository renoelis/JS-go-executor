// buf.readBigUInt64BE() - 内存安全性测试
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

// Buffer 池化和复用
test('Buffer.allocUnsafe 读取', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeBigUInt64BE(12345n, 0);
  return buf.readBigUInt64BE(0) === 12345n;
});

test('Buffer.alloc 零初始化', () => {
  const buf = Buffer.alloc(8);
  return buf.readBigUInt64BE(0) === 0n;
});

// 边界对齐
test('未对齐的 offset（offset = 1）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(77777n, 1);
  return buf.readBigUInt64BE(1) === 77777n;
});

test('未对齐的 offset（offset = 3）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(88888n, 3);
  return buf.readBigUInt64BE(3) === 88888n;
});

test('未对齐的 offset（offset = 7）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(99999n, 7);
  return buf.readBigUInt64BE(7) === 99999n;
});

// 跨越 Buffer 边界（应该失败）
test('读取跨越边界（应抛出 RangeError）', () => {
  try {
    const buf = Buffer.alloc(10);
    buf.readBigUInt64BE(3);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 共享底层 ArrayBuffer
test('共享 ArrayBuffer 的多个 Buffer', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);
  buf1.writeBigUInt64BE(111n, 0);
  buf2.writeBigUInt64BE(222n, 0);
  return buf1.readBigUInt64BE(0) === 111n && buf2.readBigUInt64BE(0) === 222n;
});

// Buffer 修改不影响其他引用
test('Buffer.slice 独立性', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(111n, 0);
  const sliced = buf.slice(0, 8);
  sliced.writeBigUInt64BE(222n, 0);
  return buf.readBigUInt64BE(0) === 222n;
});

test('Buffer.subarray 共享内存', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(111n, 0);
  const sub = buf.subarray(0, 8);
  sub.writeBigUInt64BE(333n, 0);
  return buf.readBigUInt64BE(0) === 333n;
});

// 大 Buffer
test('大 Buffer（1MB）', () => {
  const buf = Buffer.alloc(1024 * 1024);
  const offset = 1024 * 512;
  buf.writeBigUInt64BE(123456789n, offset);
  return buf.readBigUInt64BE(offset) === 123456789n;
});

// 最小 Buffer
test('最小有效 Buffer（8 字节）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(111n, 0);
  return buf.readBigUInt64BE(0) === 111n;
});

// 读取后 Buffer 状态不变
test('读取不改变 Buffer.length', () => {
  const buf = Buffer.alloc(8);
  const lenBefore = buf.length;
  buf.readBigUInt64BE(0);
  return buf.length === lenBefore;
});

test('读取不改变 Buffer.byteLength', () => {
  const buf = Buffer.alloc(8);
  const byteLenBefore = buf.byteLength;
  buf.readBigUInt64BE(0);
  return buf.byteLength === byteLenBefore;
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
