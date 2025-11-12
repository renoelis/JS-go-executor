// buffer.isAscii() - Part 3: Buffer Views and Subarray Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer slice 测试
test('Buffer.slice - ASCII 子视图', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const slice = buf.slice(0, 5); // 'hello'
  return isAscii(slice) === true;
});

test('Buffer.slice - 空 slice', () => {
  const buf = Buffer.from('hello', 'utf8');
  const slice = buf.slice(5, 5);
  return isAscii(slice) === true;
});

test('Buffer.slice - 包含非 ASCII 的 slice', () => {
  const buf = Buffer.from('hello你好world', 'utf8');
  const slice = buf.slice(5, 11); // '你好'
  return isAscii(slice) === false;
});

test('Buffer.slice - 从非 ASCII 中提取 ASCII 部分', () => {
  const buf = Buffer.from('你好hello', 'utf8');
  const slice = buf.slice(6, 11); // 'hello'
  return isAscii(slice) === true;
});

test('Buffer.slice - 负索引', () => {
  const buf = Buffer.from('hello', 'utf8');
  const slice = buf.slice(-5); // 'hello'
  return isAscii(slice) === true;
});

// Buffer subarray 测试
test('Buffer.subarray - ASCII 子视图', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const sub = buf.subarray(6, 11); // 'world'
  return isAscii(sub) === true;
});

test('Buffer.subarray - 修改子视图影响原始 Buffer', () => {
  const buf = Buffer.from('hello', 'utf8');
  const sub = buf.subarray(0, 5);
  sub[0] = 0x80; // 修改为非 ASCII
  return isAscii(buf) === false && isAscii(sub) === false;
});

test('Buffer.subarray - 空 subarray', () => {
  const buf = Buffer.from('test', 'utf8');
  const sub = buf.subarray(2, 2);
  return isAscii(sub) === true;
});

// Uint8Array subarray 测试
test('Uint8Array.subarray - ASCII 子视图', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const sub = arr.subarray(0, 3);
  return isAscii(sub) === true;
});

test('Uint8Array.subarray - 非 ASCII 子视图', () => {
  const arr = new Uint8Array([0x48, 0x80, 0x6C, 0x6C, 0x6F]);
  const sub = arr.subarray(1, 2); // 仅包含 0x80
  return isAscii(sub) === false;
});

test('Uint8Array.subarray - 修改影响原数组', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const sub = arr.subarray(0, 2);
  sub[0] = 0xFF;
  return isAscii(arr) === false && isAscii(sub) === false;
});

// TypedArray 不同 offset 测试
test('Uint8Array with byteOffset - ASCII', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[5] = 0x48; // H
  view[6] = 0x65; // e
  view[7] = 0x6C; // l
  const offsetView = new Uint8Array(ab, 5, 3);
  return isAscii(offsetView) === true;
});

test('Uint8Array with byteOffset - 非 ASCII', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view[3] = 0x80;
  view[4] = 0xFF;
  const offsetView = new Uint8Array(ab, 3, 2);
  return isAscii(offsetView) === false;
});

test('Uint8Array with byteOffset - 空视图', () => {
  const ab = new ArrayBuffer(10);
  const offsetView = new Uint8Array(ab, 5, 0);
  return isAscii(offsetView) === true;
});

// 多层嵌套视图测试
test('多层 slice 嵌套 - ASCII', () => {
  const buf = Buffer.from('abcdefghij', 'utf8');
  const slice1 = buf.slice(2, 8); // 'cdefgh'
  const slice2 = slice1.slice(1, 4); // 'def'
  return isAscii(slice2) === true;
});

test('多层 subarray 嵌套 - 修改最内层', () => {
  const buf = Buffer.from('hello', 'utf8');
  const sub1 = buf.subarray(0, 5);
  const sub2 = sub1.subarray(0, 3);
  sub2[0] = 0x90;
  return isAscii(buf) === false && isAscii(sub1) === false && isAscii(sub2) === false;
});

// Buffer 和 TypedArray 混合视图
test('Buffer 和 Uint8Array 共享 ArrayBuffer - ASCII', () => {
  const ab = new ArrayBuffer(5);
  const buf = Buffer.from(ab);
  const arr = new Uint8Array(ab);
  arr[0] = 0x48;
  arr[1] = 0x65;
  arr[2] = 0x6C;
  arr[3] = 0x6C;
  arr[4] = 0x6F;
  return isAscii(buf) === true && isAscii(arr) === true;
});

test('Buffer 和 Uint8Array 共享 ArrayBuffer - 非 ASCII', () => {
  const ab = new ArrayBuffer(3);
  const buf = Buffer.from(ab);
  const arr = new Uint8Array(ab);
  arr[0] = 0x48;
  arr[1] = 0x80;
  arr[2] = 0x6F;
  return isAscii(buf) === false && isAscii(arr) === false;
});

// 边界对齐测试
test('slice 到字节边界 - 开始', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  const slice = buf.slice(0, 2);
  return isAscii(slice) === true;
});

test('slice 到字节边界 - 结束', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x44]);
  const slice = buf.slice(2, 4);
  return isAscii(slice) === true;
});

test('slice 单字节', () => {
  const buf = Buffer.from([0x41, 0x80, 0x43]);
  const slice1 = buf.slice(0, 1);
  const slice2 = buf.slice(1, 2);
  const slice3 = buf.slice(2, 3);
  return isAscii(slice1) === true && isAscii(slice2) === false && isAscii(slice3) === true;
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
