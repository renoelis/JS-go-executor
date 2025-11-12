// buf.writeUIntBE/LE() - 内存视图与共享测试
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

// slice 视图写入影响原 buffer
test('writeUIntBE 在 slice 视图写入影响原 buffer', () => {
  const original = Buffer.alloc(10);
  const slice = original.slice(2, 6);
  slice.writeUIntBE(0x1234, 0, 2);
  return original[2] === 0x12 && original[3] === 0x34 && slice[0] === 0x12 && slice[1] === 0x34;
});

test('writeUIntLE 在 slice 视图写入影响原 buffer', () => {
  const original = Buffer.alloc(10);
  const slice = original.slice(2, 6);
  slice.writeUIntLE(0x1234, 0, 2);
  return original[2] === 0x34 && original[3] === 0x12 && slice[0] === 0x34 && slice[1] === 0x12;
});

// 原 buffer 写入影响 slice
test('writeUIntBE 在原 buffer 写入影响 slice', () => {
  const original = Buffer.alloc(10);
  const slice = original.slice(2, 6);
  original.writeUIntBE(0x5678, 2, 2);
  return slice[0] === 0x56 && slice[1] === 0x78;
});

test('writeUIntLE 在原 buffer 写入影响 slice', () => {
  const original = Buffer.alloc(10);
  const slice = original.slice(2, 6);
  original.writeUIntLE(0x5678, 2, 2);
  return slice[0] === 0x78 && slice[1] === 0x56;
});

// 多层 slice
test('writeUIntBE 多层 slice 视图', () => {
  const original = Buffer.alloc(20);
  const slice1 = original.slice(5, 15);
  const slice2 = slice1.slice(2, 8);
  slice2.writeUIntBE(0xabcd, 0, 2);
  return original[7] === 0xab && original[8] === 0xcd && slice1[2] === 0xab && slice2[0] === 0xab;
});

test('writeUIntLE 多层 slice 视图', () => {
  const original = Buffer.alloc(20);
  const slice1 = original.slice(5, 15);
  const slice2 = slice1.slice(2, 8);
  slice2.writeUIntLE(0xabcd, 0, 2);
  return original[7] === 0xcd && original[8] === 0xab && slice1[2] === 0xcd && slice2[0] === 0xcd;
});

// 不同 buffer 不共享内存
test('writeUIntBE Buffer.from 创建的 buffer 不共享内存', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.from(buf1);
  buf2.writeUIntBE(0xff, 0, 1);
  return buf1[0] === 1 && buf2[0] === 0xff;
});

test('writeUIntLE Buffer.from 创建的 buffer 不共享内存', () => {
  const buf1 = Buffer.from([1, 2, 3, 4]);
  const buf2 = Buffer.from(buf1);
  buf2.writeUIntLE(0xff, 0, 1);
  return buf1[0] === 1 && buf2[0] === 0xff;
});

// 空 slice
test('writeUIntBE 空 slice 应该报错', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 5);
  try {
    slice.writeUIntBE(0x12, 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE 空 slice 应该报错', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 5);
  try {
    slice.writeUIntLE(0x12, 0, 1);
    return false;
  } catch (e) {
    return true;
  }
});

// slice 长度限制
test('writeUIntBE slice 长度为 1', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 6);
  const r = slice.writeUIntBE(0x99, 0, 1);
  return r === 1 && slice[0] === 0x99 && buf[5] === 0x99;
});

test('writeUIntLE slice 长度为 1', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 6);
  const r = slice.writeUIntLE(0x99, 0, 1);
  return r === 1 && slice[0] === 0x99 && buf[5] === 0x99;
});

// slice 越界测试
test('writeUIntBE 在 slice 中越界应该报错', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 8);
  try {
    slice.writeUIntBE(0x12345678, 0, 4);
    return false;
  } catch (e) {
    return true;
  }
});

test('writeUIntLE 在 slice 中越界应该报错', () => {
  const buf = Buffer.alloc(10);
  const slice = buf.slice(5, 8);
  try {
    slice.writeUIntLE(0x12345678, 0, 4);
    return false;
  } catch (e) {
    return true;
  }
});

// 相邻区域写入不互相影响
test('writeUIntBE 相邻区域写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntBE(0x1234, 0, 2);
  buf.writeUIntBE(0x5678, 2, 2);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('writeUIntLE 相邻区域写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntLE(0x1234, 0, 2);
  buf.writeUIntLE(0x5678, 2, 2);
  return buf[0] === 0x34 && buf[1] === 0x12 && buf[2] === 0x78 && buf[3] === 0x56;
});

// 覆盖写入测试
test('writeUIntBE 完全覆盖之前的写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntBE(0xffffffff, 0, 4);
  buf.writeUIntBE(0x12345678, 0, 4);
  return buf[0] === 0x12 && buf[1] === 0x34 && buf[2] === 0x56 && buf[3] === 0x78;
});

test('writeUIntLE 完全覆盖之前的写入', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntLE(0xffffffff, 0, 4);
  buf.writeUIntLE(0x12345678, 0, 4);
  return buf[0] === 0x78 && buf[1] === 0x56 && buf[2] === 0x34 && buf[3] === 0x12;
});

// subarray（别名）行为
test('writeUIntBE 在 subarray 上写入', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 7);
  sub.writeUIntBE(0xabcd, 0, 2);
  return buf[3] === 0xab && buf[4] === 0xcd && sub[0] === 0xab && sub[1] === 0xcd;
});

test('writeUIntLE 在 subarray 上写入', () => {
  const buf = Buffer.alloc(10);
  const sub = buf.subarray(3, 7);
  sub.writeUIntLE(0xabcd, 0, 2);
  return buf[3] === 0xcd && buf[4] === 0xab && sub[0] === 0xcd && sub[1] === 0xab;
});

// 同一内存位置多次写入
test('writeUIntBE 同一位置多次写入不同值', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntBE(0x11, 5, 1);
  buf.writeUIntBE(0x22, 5, 1);
  buf.writeUIntBE(0x33, 5, 1);
  return buf[5] === 0x33;
});

test('writeUIntLE 同一位置多次写入不同值', () => {
  const buf = Buffer.alloc(10);
  buf.writeUIntLE(0x11, 5, 1);
  buf.writeUIntLE(0x22, 5, 1);
  buf.writeUIntLE(0x33, 5, 1);
  return buf[5] === 0x33;
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
