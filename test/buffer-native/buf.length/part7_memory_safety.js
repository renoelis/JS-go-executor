// buf.length - Part 7: Memory Safety Tests
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

// 修改 Buffer 内容后 length 不变
test('修改单个字节后 length 不变', () => {
  const buf = Buffer.from('hello');
  buf[0] = 72; // 'H'
  return buf.length === 5;
});

test('修改多个字节后 length 不变', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 10; i++) {
    buf[i] = i;
  }
  return buf.length === 10;
});

test('使用 writeUInt8 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt8(255, 0);
  return buf.length === 10;
});

test('使用 writeUInt16BE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt16BE(0xFFFF, 0);
  return buf.length === 10;
});

test('使用 writeUInt32BE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeUInt32BE(0xFFFFFFFF, 0);
  return buf.length === 10;
});

test('使用 writeInt8 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeInt8(-128, 0);
  return buf.length === 10;
});

test('使用 writeFloatBE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeFloatBE(3.14, 0);
  return buf.length === 10;
});

test('使用 writeDoubleBE 后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.writeDoubleBE(3.14159, 0);
  return buf.length === 10;
});

// 共享内存测试
test('slice 修改后原 buffer length 不变', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(0, 5);
  slice[0] = 72; // 修改 slice
  return buf.length === 11 && slice.length === 5;
});

test('subarray 修改后原 buffer length 不变', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  sub[0] = 72; // 修改 subarray
  return buf.length === 11 && sub.length === 5;
});

test('多层 slice 的 length', () => {
  const buf = Buffer.alloc(20);
  const slice1 = buf.slice(5, 15);
  const slice2 = slice1.slice(2, 8);
  return buf.length === 20 && slice1.length === 10 && slice2.length === 6;
});

test('多层 subarray 的 length', () => {
  const buf = Buffer.alloc(20);
  const sub1 = buf.subarray(5, 15);
  const sub2 = sub1.subarray(2, 8);
  return buf.length === 20 && sub1.length === 10 && sub2.length === 6;
});

// Buffer 与 TypedArray 共享内存
test('TypedArray 视图修改后 Buffer length 不变', () => {
  const buf = Buffer.alloc(16);
  const view = new Uint32Array(buf.buffer);
  view[0] = 0xFFFFFFFF;
  return buf.length === 16;
});

test('DataView 修改后 Buffer length 不变', () => {
  const buf = Buffer.alloc(16);
  const view = new DataView(buf.buffer);
  view.setUint32(0, 0xFFFFFFFF);
  return buf.length === 16;
});

// 清空操作
test('fill(0) 后 length 不变', () => {
  const buf = Buffer.from('hello');
  buf.fill(0);
  return buf.length === 5;
});

test('fill 空字符串后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.fill('');
  return buf.length === 10;
});

// 越界访问
test('越界读取不影响 length', () => {
  const buf = Buffer.from('hello');
  const val = buf[100]; // undefined
  return buf.length === 5 && val === undefined;
});

test('越界写入不影响 length', () => {
  const buf = Buffer.from('hello');
  buf[100] = 65; // 不会真正写入
  return buf.length === 5;
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
