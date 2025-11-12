// Buffer.copyBytesFrom() - Part 9: ArrayBuffer Views and Subarray Tests
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

// ArrayBuffer 视图测试
test('从 ArrayBuffer 的完整视图复制', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[0] = 10;
  view[9] = 20;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 10 && buf[0] === 10 && buf[9] === 20;
});

test('从 ArrayBuffer 的部分视图复制(带 offset)', () => {
  const ab = new ArrayBuffer(20);
  const fullView = new Uint8Array(ab);
  fullView[10] = 100;
  fullView[11] = 101;
  const partialView = new Uint8Array(ab, 10);
  const buf = Buffer.copyBytesFrom(partialView);
  return buf.length === 10 && buf[0] === 100 && buf[1] === 101;
});

test('从 ArrayBuffer 的部分视图复制(带 offset 和 length)', () => {
  const ab = new ArrayBuffer(20);
  const fullView = new Uint8Array(ab);
  fullView[5] = 50;
  fullView[6] = 60;
  fullView[7] = 70;
  const partialView = new Uint8Array(ab, 5, 3);
  const buf = Buffer.copyBytesFrom(partialView);
  return buf.length === 3 && buf[0] === 50 && buf[1] === 60 && buf[2] === 70;
});

test('从 ArrayBuffer 中间视图复制', () => {
  const ab = new ArrayBuffer(100);
  const view = new Uint8Array(ab, 50, 10);
  for (let i = 0; i < 10; i++) view[i] = i;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 10 && buf[0] === 0 && buf[9] === 9;
});

test('从 ArrayBuffer 最后几个字节复制', () => {
  const ab = new ArrayBuffer(100);
  const fullView = new Uint8Array(ab);
  fullView[98] = 98;
  fullView[99] = 99;
  const endView = new Uint8Array(ab, 98);
  const buf = Buffer.copyBytesFrom(endView);
  return buf.length === 2 && buf[0] === 98 && buf[1] === 99;
});

// 多个视图共享同一 ArrayBuffer
test('从共享 ArrayBuffer 的第一个视图复制', () => {
  const ab = new ArrayBuffer(20);
  const view1 = new Uint8Array(ab, 0, 10);
  const view2 = new Uint8Array(ab, 10, 10);
  view1[0] = 1;
  view2[0] = 2;
  const buf1 = Buffer.copyBytesFrom(view1);
  return buf1[0] === 1 && buf1.length === 10;
});

test('从共享 ArrayBuffer 的第二个视图复制', () => {
  const ab = new ArrayBuffer(20);
  const view1 = new Uint8Array(ab, 0, 10);
  const view2 = new Uint8Array(ab, 10, 10);
  view1[0] = 1;
  view2[0] = 2;
  const buf2 = Buffer.copyBytesFrom(view2);
  return buf2[0] === 2 && buf2.length === 10;
});

test('从重叠视图复制不互相影响', () => {
  const ab = new ArrayBuffer(20);
  const view1 = new Uint8Array(ab, 0, 15);
  const view2 = new Uint8Array(ab, 5, 15);
  view1[5] = 100;
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  return buf1[5] === 100 && buf2[0] === 100 && buf1.buffer !== buf2.buffer;
});

// 不同类型视图同一 ArrayBuffer
test('Uint8Array 和 Uint16Array 视图共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(8);
  const u8 = new Uint8Array(ab);
  const u16 = new Uint16Array(ab);
  u8[0] = 0x12;
  u8[1] = 0x34;
  const buf8 = Buffer.copyBytesFrom(u8);
  const buf16 = Buffer.copyBytesFrom(u16);
  return buf8.length === 8 && buf16.length === 8 && buf8[0] === 0x12;
});

test('Int8Array 和 Uint8Array 视图共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  const i8 = new Int8Array(ab);
  const u8 = new Uint8Array(ab);
  i8[0] = -1;
  const buf1 = Buffer.copyBytesFrom(i8);
  const buf2 = Buffer.copyBytesFrom(u8);
  return buf1[0] === 255 && buf2[0] === 255;
});

// TypedArray.subarray() 测试
test('从 subarray 复制', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50]);
  const sub = original.subarray(1, 4);
  const buf = Buffer.copyBytesFrom(sub);
  return buf.length === 3 && buf[0] === 20 && buf[2] === 40;
});

test('从 subarray 带 offset 复制', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50]);
  const sub = original.subarray(1, 4);
  const buf = Buffer.copyBytesFrom(sub, 1);
  return buf.length === 2 && buf[0] === 30 && buf[1] === 40;
});

test('从 subarray 带 offset 和 length 复制', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50, 60]);
  const sub = original.subarray(1, 5);
  const buf = Buffer.copyBytesFrom(sub, 1, 2);
  return buf.length === 2 && buf[0] === 30 && buf[1] === 40;
});

test('从嵌套 subarray 复制', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50, 60, 70]);
  const sub1 = original.subarray(1, 6);
  const sub2 = sub1.subarray(1, 4);
  const buf = Buffer.copyBytesFrom(sub2);
  return buf.length === 3 && buf[0] === 30 && buf[2] === 50;
});

test('subarray 修改不影响已复制的 Buffer', () => {
  const original = new Uint8Array([10, 20, 30, 40]);
  const sub = original.subarray(1, 3);
  const buf = Buffer.copyBytesFrom(sub);
  sub[0] = 99;
  return buf[0] === 20;
});

test('修改 Buffer 不影响 subarray', () => {
  const original = new Uint8Array([10, 20, 30, 40]);
  const sub = original.subarray(1, 3);
  const buf = Buffer.copyBytesFrom(sub);
  buf[0] = 99;
  return sub[0] === 20;
});

// slice vs subarray
test('从 TypedArray.slice 创建的数组复制', () => {
  const original = new Uint8Array([10, 20, 30, 40, 50]);
  const sliced = original.slice(1, 4);
  const buf = Buffer.copyBytesFrom(sliced);
  return buf.length === 3 && buf[0] === 20 && buf[2] === 40;
});

test('slice 后的数组是独立的', () => {
  const original = new Uint8Array([10, 20, 30, 40]);
  const sliced = original.slice(1, 3);
  sliced[0] = 99;
  const buf = Buffer.copyBytesFrom(sliced);
  return buf[0] === 99 && original[1] === 20;
});

// 空视图和子数组
test('空 subarray', () => {
  const original = new Uint8Array([10, 20, 30]);
  const sub = original.subarray(1, 1);
  const buf = Buffer.copyBytesFrom(sub);
  return buf.length === 0;
});

test('空 slice', () => {
  const original = new Uint8Array([10, 20, 30]);
  const sliced = original.slice(1, 1);
  const buf = Buffer.copyBytesFrom(sliced);
  return buf.length === 0;
});

test('从 ArrayBuffer 零长度视图复制', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 5, 0);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 0;
});

// 大 ArrayBuffer 小视图
test('大 ArrayBuffer 小视图复制', () => {
  const ab = new ArrayBuffer(10000);
  const view = new Uint8Array(ab, 5000, 10);
  for (let i = 0; i < 10; i++) view[i] = i;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 10 && buf[0] === 0 && buf[9] === 9;
});

// 对齐测试
test('非对齐 offset 的 Uint16Array 视图', () => {
  const ab = new ArrayBuffer(20);
  const u8 = new Uint8Array(ab);
  u8[1] = 0x12;
  u8[2] = 0x34;
  try {
    const u16 = new Uint16Array(ab, 1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('对齐的 Uint16Array 视图', () => {
  const ab = new ArrayBuffer(20);
  const u16 = new Uint16Array(ab, 2, 4);
  u16[0] = 0x1234;
  const buf = Buffer.copyBytesFrom(u16);
  return buf.length === 8;
});

test('对齐的 Uint32Array 视图', () => {
  const ab = new ArrayBuffer(20);
  const u32 = new Uint32Array(ab, 4, 2);
  u32[0] = 0x12345678;
  const buf = Buffer.copyBytesFrom(u32);
  return buf.length === 8;
});

test('对齐的 Float64Array 视图', () => {
  const ab = new ArrayBuffer(32);
  const f64 = new Float64Array(ab, 8, 2);
  f64[0] = 1.5;
  const buf = Buffer.copyBytesFrom(f64);
  return buf.length === 16;
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
