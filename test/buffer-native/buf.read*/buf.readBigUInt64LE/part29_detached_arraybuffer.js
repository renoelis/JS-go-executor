// buf.readBigUInt64LE() - Detached ArrayBuffer 测试
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

// 测试 Detached ArrayBuffer (如果环境支持)
test('从正常 ArrayBuffer 创建的 Buffer 可以读取', () => {
  const ab = new ArrayBuffer(8);
  const buf = Buffer.from(ab);
  buf.writeBigUInt64LE(123n, 0);
  return buf.readBigUInt64LE(0) === 123n;
});

test('从 ArrayBuffer 视图创建的 Buffer 可以读取', () => {
  const ab = new ArrayBuffer(16);
  const view = new Uint8Array(ab, 8, 8);
  const buf = Buffer.from(view);
  buf.writeBigUInt64LE(456n, 0);
  return buf.readBigUInt64LE(0) === 456n;
});

test('Buffer 复制后原 ArrayBuffer 可以读取', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab);
  buf1.writeBigUInt64LE(789n, 0);
  const buf2 = Buffer.from(buf1);
  return buf2.readBigUInt64LE(0) === 789n;
});

test('从共享 ArrayBuffer 的多个 Buffer 视图读取', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab, 0, 8);
  const buf2 = Buffer.from(ab, 8, 8);
  buf1.writeBigUInt64LE(111n, 0);
  buf2.writeBigUInt64LE(222n, 0);
  return buf1.readBigUInt64LE(0) === 111n && buf2.readBigUInt64LE(0) === 222n;
});

test('Buffer.slice 后读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(333n, 0);
  buf.writeBigUInt64LE(444n, 8);
  const slice = buf.slice(0, 8);
  return slice.readBigUInt64LE(0) === 333n;
});

test('Buffer.subarray 后读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(555n, 0);
  buf.writeBigUInt64LE(666n, 8);
  const sub = buf.subarray(8, 16);
  return sub.readBigUInt64LE(0) === 666n;
});

test('修改原 Buffer 影响 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(777n, 0);
  const sub = buf.subarray(0, 8);
  buf.writeBigUInt64LE(888n, 0);
  return sub.readBigUInt64LE(0) === 888n;
});

test('修改 subarray 影响原 Buffer', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(999n, 0);
  const sub = buf.subarray(0, 8);
  sub.writeBigUInt64LE(1111n, 0);
  return buf.readBigUInt64LE(0) === 1111n;
});

test('slice 和 subarray 在 Node.js 中都返回共享内存视图', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(2222n, 0);
  const slice = buf.slice(0, 8);
  slice.writeBigUInt64LE(3333n, 0);
  // 在 Node.js 中，slice 现在也返回共享内存的视图，与 subarray 行为一致
  return buf.readBigUInt64LE(0) === 3333n && slice.readBigUInt64LE(0) === 3333n;
});

test('从 TypedArray 的 buffer 属性创建 Buffer', () => {
  const ta = new Uint8Array(8);
  const buf = Buffer.from(ta.buffer);
  buf.writeBigUInt64LE(4444n, 0);
  return buf.readBigUInt64LE(0) === 4444n;
});

test('Buffer.concat 后读取', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  buf1.writeBigUInt64LE(5555n, 0);
  buf2.writeBigUInt64LE(6666n, 0);
  const concat = Buffer.concat([buf1, buf2]);
  return concat.readBigUInt64LE(0) === 5555n && concat.readBigUInt64LE(8) === 6666n;
});

test('零长度 Buffer.slice 不能读取', () => {
  try {
    const buf = Buffer.alloc(8);
    const slice = buf.slice(0, 0);
    slice.readBigUInt64LE(0);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('ArrayBuffer 边界对齐测试', () => {
  const ab = new ArrayBuffer(24);
  const buf = Buffer.from(ab, 8, 8);
  buf.writeBigUInt64LE(7777n, 0);
  return buf.readBigUInt64LE(0) === 7777n;
});

test('多层 subarray 测试', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigUInt64LE(8888n, 8);
  const sub1 = buf.subarray(4, 20);
  const sub2 = sub1.subarray(4, 12);
  return sub2.readBigUInt64LE(0) === 8888n;
});

test('Buffer.from 复制 subarray', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(9999n, 0);
  const sub = buf.subarray(0, 8);
  const copy = Buffer.from(sub);
  buf.writeBigUInt64LE(1010n, 0);
  return copy.readBigUInt64LE(0) === 9999n && buf.readBigUInt64LE(0) === 1010n;
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
