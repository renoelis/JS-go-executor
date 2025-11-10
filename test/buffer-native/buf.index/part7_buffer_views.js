// buf[index] - Part 7: Buffer Views & TypedArray Interaction Tests
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

// ArrayBuffer 视图交互
test('Buffer 和 Uint8Array 共享 ArrayBuffer 索引同步', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  const arr = new Uint8Array(ab);
  buf[0] = 10;
  arr[1] = 20;
  return buf[0] === 10 && buf[1] === 20 && arr[0] === 10 && arr[1] === 20;
});

test('Buffer 和 Uint16Array 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const arr16 = new Uint16Array(ab);
  buf[0] = 0x12;
  buf[1] = 0x34;
  return arr16[0] === 0x3412;
});

test('Buffer 和 Int8Array 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(3);
  const buf = Buffer.from(ab);
  const int8 = new Int8Array(ab);
  buf[0] = 255;
  return int8[0] === -1;
});

test('Buffer 和 DataView 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(4);
  const buf = Buffer.from(ab);
  const dv = new DataView(ab);
  buf[0] = 0xAB;
  buf[1] = 0xCD;
  return dv.getUint8(0) === 0xAB && dv.getUint8(1) === 0xCD;
});

// 不同 offset 的视图
test('Buffer.from(ArrayBuffer, offset) 索引访问', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 99;
  const buf = Buffer.from(ab, 5, 3);
  return buf[0] === 99;
});

test('Buffer.from(ArrayBuffer, offset) 写入不影响前面', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[0] = 10;
  view[5] = 20;
  const buf = Buffer.from(ab, 5, 3);
  buf[0] = 99;
  return view[0] === 10 && view[5] === 99;
});

// slice 的索引独立性
test('slice 索引从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const slice = buf.slice(2, 4);
  return slice[0] === 30 && slice[1] === 40;
});

test('slice 修改不影响原 Buffer 的索引范围外', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const slice = buf.slice(1, 3);
  slice[0] = 99;
  return buf[0] === 10 && buf[1] === 99 && buf[3] === 40;
});

test('多层 slice 索引访问', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const slice1 = buf.slice(2, 7);
  const slice2 = slice1.slice(1, 4);
  return slice2[0] === 4 && slice2[1] === 5 && slice2[2] === 6;
});

test('多层 slice 修改传播', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const slice1 = buf.slice(2, 7);
  const slice2 = slice1.slice(1, 4);
  slice2[1] = 99;
  return buf[4] === 99 && slice1[2] === 99;
});

// subarray 测试
test('subarray 索引从 0 开始', () => {
  const buf = Buffer.from([10, 20, 30, 40, 50]);
  const sub = buf.subarray(2, 4);
  return sub[0] === 30 && sub[1] === 40;
});

test('subarray 和 slice 行为一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(1, 4);
  const sub = buf.subarray(1, 4);
  return slice[0] === sub[0] && slice[1] === sub[1] && slice[2] === sub[2];
});

test('subarray 修改影响原 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 4);
  sub[1] = 99;
  return buf[2] === 99;
});

// 空 slice/subarray
test('空 slice 索引访问', () => {
  const buf = Buffer.from([1, 2, 3]);
  const slice = buf.slice(1, 1);
  return slice.length === 0 && slice[0] === undefined;
});

test('空 subarray 索引访问', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(1, 1);
  return sub.length === 0 && sub[0] === undefined;
});

// 负索引 slice/subarray
test('slice 负索引创建后正常访问', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const slice = buf.slice(-3, -1);
  return slice[0] === 3 && slice[1] === 4;
});

test('subarray 负索引创建后正常访问', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(-3, -1);
  return sub[0] === 3 && sub[1] === 4;
});

// Buffer.concat 后的索引访问
test('concat 后索引访问', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const concat = Buffer.concat([buf1, buf2]);
  return concat[0] === 1 && concat[3] === 4 && concat[5] === 6;
});

test('concat 后修改不影响原 Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const concat = Buffer.concat([buf1, buf2]);
  concat[1] = 99;
  return buf1[1] === 2;
});

test('concat 空 Buffer 列表', () => {
  const concat = Buffer.concat([]);
  return concat.length === 0 && concat[0] === undefined;
});

// Buffer.from 不同来源的索引访问
test('Buffer.from(string) 索引访问', () => {
  const buf = Buffer.from('ABC');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

test('Buffer.from(array) 索引访问', () => {
  const buf = Buffer.from([65, 66, 67]);
  return buf[0] === 65 && buf[1] === 66 && buf[2] === 67;
});

test('Buffer.from(Buffer) 索引独立', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from(buf1);
  buf2[1] = 99;
  return buf1[1] === 2 && buf2[1] === 99;
});

// 不同 TypedArray 创建的 Buffer
test('Buffer.from(Uint8Array) 索引访问', () => {
  const arr = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(arr);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30;
});

test('Buffer.from(Uint16Array.buffer) 索引访问', () => {
  const arr16 = new Uint16Array([0x4142, 0x4344]);
  const buf = Buffer.from(arr16.buffer);
  return buf.length === 4;
});

test('Buffer.from(Int8Array) 索引访问', () => {
  const int8 = new Int8Array([-1, -2, -3]);
  const buf = Buffer.from(int8);
  return buf[0] === 255 && buf[1] === 254 && buf[2] === 253;
});

// 修改 buffer 属性后的索引访问
test('修改 byteOffset 不影响索引访问', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalOffset = buf.byteOffset;
  buf.byteOffset = 100;
  return buf[0] === 1 && buf[1] === 2;
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
