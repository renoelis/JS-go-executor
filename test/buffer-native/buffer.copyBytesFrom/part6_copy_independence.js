// Buffer.copyBytesFrom() - Part 6: Copy Behavior and Independence Tests
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

// 验证复制行为(不是引用)
test('修改原 TypedArray 不影响已复制的 Buffer', () => {
  const view = new Uint8Array([100, 200]);
  const buf = Buffer.copyBytesFrom(view);
  view[0] = 1;
  view[1] = 2;
  return buf[0] === 100 && buf[1] === 200;
});

test('修改已复制的 Buffer 不影响原 TypedArray', () => {
  const view = new Uint8Array([100, 200]);
  const buf = Buffer.copyBytesFrom(view);
  buf[0] = 1;
  buf[1] = 2;
  return view[0] === 100 && view[1] === 200;
});

test('多次复制产生独立的 Buffer', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.copyBytesFrom(view);
  buf1[0] = 99;
  return buf2[0] === 10 && buf1[0] === 99;
});

test('带 offset 的复制也是独立的', () => {
  const view = new Uint8Array([10, 20, 30, 40]);
  const buf = Buffer.copyBytesFrom(view, 1);
  view[1] = 99;
  return buf[0] === 20;
});

test('带 offset 和 length 的复制也是独立的', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  view[2] = 99;
  return buf[1] === 30;
});

// 复制后 Buffer 的数据独立性（注意：小Buffer可能共享pool）
test('复制的 Buffer 数据独立', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.copyBytesFrom(view);
  // 修改一个不影响另一个
  buf1[0] = 99;
  return buf2[0] === 1;
});

test('复制的 Buffer 与原 TypedArray 内存不同', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.buffer !== view.buffer;
});

// 复制后数据完整性
test('Uint8Array 数据完整复制', () => {
  const view = new Uint8Array([0, 1, 127, 128, 255]);
  const buf = Buffer.copyBytesFrom(view);
  let match = true;
  for (let i = 0; i < view.length; i++) {
    if (buf[i] !== view[i]) match = false;
  }
  return match && buf.length === 5;
});

test('Int8Array 负数正确复制', () => {
  const view = new Int8Array([-128, -1, 0, 1, 127]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 128 && buf[1] === 255 && buf[2] === 0 && buf[3] === 1 && buf[4] === 127;
});

test('Uint16Array 字节序正确复制', () => {
  const view = new Uint16Array([0x1234]);
  const buf = Buffer.copyBytesFrom(view);
  const isLE = buf[0] === 0x34 && buf[1] === 0x12;
  const isBE = buf[0] === 0x12 && buf[1] === 0x34;
  return isLE || isBE;
});

test('Uint32Array 四字节正确复制', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Float32Array 浮点数据正确复制', () => {
  const view = new Float32Array([1.5]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.alloc(4);
  buf2.writeFloatLE(1.5, 0);
  let match = true;
  for (let i = 0; i < 4; i++) {
    if (buf1[i] !== buf2[i]) match = false;
  }
  return match;
});

test('Float64Array 双精度数据正确复制', () => {
  const view = new Float64Array([3.14159]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.alloc(8);
  buf2.writeDoubleLE(3.14159, 0);
  let match = true;
  for (let i = 0; i < 8; i++) {
    if (buf1[i] !== buf2[i]) match = false;
  }
  return match;
});

test('BigInt64Array 大整数正确复制', () => {
  const view = new BigInt64Array([123456789n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8 && buf.readBigInt64LE(0) === 123456789n;
});

test('BigUint64Array 无符号大整数正确复制', () => {
  const view = new BigUint64Array([9876543210n]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8 && buf.readBigUInt64LE(0) === 9876543210n;
});

// 从共享 ArrayBuffer 的视图复制
test('从共享 ArrayBuffer 的 TypedArray 复制', () => {
  const ab = new ArrayBuffer(10);
  const view1 = new Uint8Array(ab, 0, 5);
  const view2 = new Uint8Array(ab, 5, 5);
  view1[0] = 10;
  view2[0] = 20;
  const buf1 = Buffer.copyBytesFrom(view1);
  const buf2 = Buffer.copyBytesFrom(view2);
  // 验证数据正确复制且独立
  return buf1[0] === 10 && buf2[0] === 20;
});

test('从 TypedArray 的子视图复制', () => {
  const ab = new ArrayBuffer(20);
  const fullView = new Uint8Array(ab);
  fullView[5] = 100;
  fullView[6] = 101;
  const subView = new Uint8Array(ab, 5, 2);
  const buf = Buffer.copyBytesFrom(subView);
  return buf.length === 2 && buf[0] === 100 && buf[1] === 101;
});

// 复制后修改底层 ArrayBuffer
test('复制后修改原 ArrayBuffer 不影响 Buffer', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 50;
  view[1] = 60;
  const buf = Buffer.copyBytesFrom(view);
  view[0] = 1;
  view[1] = 2;
  return buf[0] === 50 && buf[1] === 60;
});

// 空复制的独立性
test('空 Buffer 复制也是独立的', () => {
  const view = new Uint8Array([]);
  const buf1 = Buffer.copyBytesFrom(view);
  const buf2 = Buffer.copyBytesFrom(view);
  return buf1.length === 0 && buf2.length === 0;
});

// 大量数据复制
test('大量数据复制保持独立', () => {
  const view = new Uint8Array(1000);
  for (let i = 0; i < 1000; i++) {
    view[i] = i % 256;
  }
  const buf = Buffer.copyBytesFrom(view);
  view[500] = 255;
  return buf[500] !== 255 && buf.length === 1000;
});

test('部分大数据复制保持独立', () => {
  const view = new Uint8Array(1000);
  for (let i = 0; i < 1000; i++) {
    view[i] = i % 256;
  }
  const buf = Buffer.copyBytesFrom(view, 100, 200);
  view[150] = 255;
  return buf[50] !== 255 && buf.length === 200;
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
