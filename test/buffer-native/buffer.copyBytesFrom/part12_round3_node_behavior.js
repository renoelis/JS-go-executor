// Buffer.copyBytesFrom() - Part 12: Round 3 - Node Behavior and Edge Scenarios
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

// 测试 undefined 参数行为
test('offset 为 undefined 等同于不传', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view, undefined);
  const buf2 = Buffer.copyBytesFrom(view);
  return buf1.length === buf2.length && buf1[0] === buf2[0];
});

test('length 为 undefined 等同于不传', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf1 = Buffer.copyBytesFrom(view, 1, undefined);
  const buf2 = Buffer.copyBytesFrom(view, 1);
  return buf1.length === buf2.length && buf1[0] === buf2[0];
});

// 零值测试
test('offset 为 0 明确传入', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 0);
  return buf.length === 3 && buf[0] === 10;
});

test('length 为 0 明确传入', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 1, 0);
  return buf.length === 0;
});

// 边界组合
test('offset 在边界,length 为 0', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 3, 0);
  return buf.length === 0;
});

test('offset 超出,length 为任意值', () => {
  const view = new Uint8Array([10, 20, 30]);
  const buf = Buffer.copyBytesFrom(view, 10, 5);
  return buf.length === 0;
});

// TypedArray 视图字节对齐
test('Uint16Array 必须 2 字节对齐', () => {
  try {
    const ab = new ArrayBuffer(10);
    const view = new Uint16Array(ab, 1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('Uint32Array 必须 4 字节对齐', () => {
  try {
    const ab = new ArrayBuffer(10);
    const view = new Uint32Array(ab, 1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

test('Float64Array 必须 8 字节对齐', () => {
  try {
    const ab = new ArrayBuffer(16);
    const view = new Float64Array(ab, 1);
    return false;
  } catch (e) {
    return e instanceof RangeError;
  }
});

// 正确对齐的视图
test('Uint16Array 2 字节对齐可正常复制', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint16Array(ab, 2, 2);
  view[0] = 0x1234;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

test('Uint32Array 4 字节对齐可正常复制', () => {
  const ab = new ArrayBuffer(16);
  const view = new Uint32Array(ab, 4, 2);
  view[0] = 0x12345678;
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

// 不同长度 TypedArray 字节计算
test('Uint8Array length=10 复制 10 字节', () => {
  const view = new Uint8Array(10);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 10;
});

test('Uint16Array length=10 复制 20 字节', () => {
  const view = new Uint16Array(10);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 20;
});

test('Uint32Array length=10 复制 40 字节', () => {
  const view = new Uint32Array(10);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 40;
});

test('Float64Array length=10 复制 80 字节', () => {
  const view = new Float64Array(10);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 80;
});

test('BigInt64Array length=10 复制 80 字节', () => {
  const view = new BigInt64Array(10);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 80;
});

// 带 offset 的字节计算
test('Uint16Array offset=1 从第2个元素开始', () => {
  const view = new Uint16Array([0x1111, 0x2222, 0x3333]);
  const buf = Buffer.copyBytesFrom(view, 1);
  const check = new Uint16Array(buf.buffer, buf.byteOffset, 2);
  return check[0] === 0x2222;
});

test('Uint32Array offset=2 从第3个元素开始', () => {
  const view = new Uint32Array([0x11111111, 0x22222222, 0x33333333]);
  const buf = Buffer.copyBytesFrom(view, 2);
  const check = new Uint32Array(buf.buffer, buf.byteOffset, 1);
  return check[0] === 0x33333333;
});

// Buffer 属性验证
test('返回的 Buffer 有正确的 length', () => {
  const view = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.length === 3;
});

test('返回的 Buffer 有正确的 byteLength', () => {
  const view = new Uint8Array([1, 2, 3, 4, 5]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf.byteLength === 3;
});

test('返回的 Buffer 有 buffer 属性', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.buffer instanceof ArrayBuffer;
});

test('返回的 Buffer 有 byteOffset 属性', () => {
  const view = new Uint8Array([1, 2, 3]);
  const buf = Buffer.copyBytesFrom(view);
  return typeof buf.byteOffset === 'number';
});

// 空 TypedArray 各种类型
test('空 Int8Array', () => {
  const view = new Int8Array([]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 0;
});

test('空 Uint16Array', () => {
  const view = new Uint16Array([]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 0;
});

test('空 Float32Array', () => {
  const view = new Float32Array([]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 0;
});

test('空 BigInt64Array', () => {
  const view = new BigInt64Array([]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 0;
});

// 单元素 TypedArray
test('单元素 Uint8Array', () => {
  const view = new Uint8Array([99]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 1 && buf[0] === 99;
});

test('单元素 Uint16Array', () => {
  const view = new Uint16Array([0xABCD]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 2;
});

test('单元素 Float64Array', () => {
  const view = new Float64Array([3.14]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 8;
});

// 测试连续性
test('连续元素复制保持顺序', () => {
  const view = new Uint8Array([10, 20, 30, 40, 50]);
  const buf = Buffer.copyBytesFrom(view, 1, 3);
  return buf[0] === 20 && buf[1] === 30 && buf[2] === 40;
});

test('Uint16Array 连续元素字节连续', () => {
  const view = new Uint16Array([0x1122, 0x3344]);
  const buf = Buffer.copyBytesFrom(view);
  return buf.length === 4;
});

// 大小端测试辅助
test('Buffer 读取与 TypedArray 一致', () => {
  const view = new Uint32Array([0x12345678]);
  const buf = Buffer.copyBytesFrom(view);
  const value = buf.readUInt32LE(0);
  return value === 0x12345678;
});

test('浮点数读写一致', () => {
  const view = new Float32Array([1.5]);
  const buf = Buffer.copyBytesFrom(view);
  const value = buf.readFloatLE(0);
  return value === 1.5;
});

test('BigInt 读写一致', () => {
  const view = new BigInt64Array([123456789n]);
  const buf = Buffer.copyBytesFrom(view);
  const value = buf.readBigInt64LE(0);
  return value === 123456789n;
});

// 负数和符号位
test('Int8Array 负数转为无符号字节', () => {
  const view = new Int8Array([-1, -128]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 255 && buf[1] === 128;
});

test('Int16Array 负数字节表示', () => {
  const view = new Int16Array([-1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 255 && buf[1] === 255;
});

test('Int32Array 负数字节表示', () => {
  const view = new Int32Array([-1]);
  const buf = Buffer.copyBytesFrom(view);
  return buf[0] === 255 && buf[1] === 255 && buf[2] === 255 && buf[3] === 255;
});

test('BigInt64Array 负数字节表示', () => {
  const view = new BigInt64Array([-1n]);
  const buf = Buffer.copyBytesFrom(view);
  let allFF = true;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 255) allFF = false;
  }
  return allFF;
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
