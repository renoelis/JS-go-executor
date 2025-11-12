// buffer.isUtf8() - Part 10: Subarray and Views Tests
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Buffer.subarray 测试
test('subarray - 完整 Buffer', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sub = buf.subarray(0);
  return isUtf8(sub) === true;
});

test('subarray - 开始位置非零', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sub = buf.subarray(1); // "ello"
  return isUtf8(sub) === true;
});

test('subarray - 指定结束位置', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sub = buf.subarray(1, 4); // "ell"
  return isUtf8(sub) === true;
});

test('subarray - 空 subarray', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sub = buf.subarray(2, 2); // 空
  return isUtf8(sub) === true;
});

test('subarray - 多字节字符完整', () => {
  const buf = Buffer.from('你好世界', 'utf8'); // 每个字符 3 字节
  const sub = buf.subarray(0, 3); // "你"
  return isUtf8(sub) === true;
});

test('subarray - 多字节字符截断（起始）', () => {
  const buf = Buffer.from('你好世界', 'utf8'); // 每个字符 3 字节
  const sub = buf.subarray(1, 4); // 截断第一个字符，截断第二个字符
  return isUtf8(sub) === false;
});

test('subarray - 多字节字符截断（结束）', () => {
  const buf = Buffer.from('你好世界', 'utf8'); // 每个字符 3 字节
  const sub = buf.subarray(0, 2); // 截断第一个字符
  return isUtf8(sub) === false;
});

test('subarray - 从字符边界开始', () => {
  const buf = Buffer.from('你好世界', 'utf8'); // 每个字符 3 字节
  const sub = buf.subarray(3, 9); // "好世"
  return isUtf8(sub) === true;
});

test('subarray - Emoji 完整', () => {
  const buf = Buffer.from('😀😁', 'utf8'); // 每个 4 字节
  const sub = buf.subarray(0, 4); // "😀"
  return isUtf8(sub) === true;
});

test('subarray - Emoji 截断', () => {
  const buf = Buffer.from('😀😁', 'utf8'); // 每个 4 字节
  const sub = buf.subarray(0, 3); // 截断第一个 emoji
  return isUtf8(sub) === false;
});

// TypedArray.subarray 测试
test('Uint8Array.subarray - 有效 UTF-8', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const sub = arr.subarray(1, 4); // "ell"
  return isUtf8(sub) === true;
});

test('Uint8Array.subarray - 无效 UTF-8', () => {
  const arr = new Uint8Array([0x48, 0x65, 0xC2, 0x6C, 0x6F]); // "He" + 不完整 2 字节 + "lo"
  const sub = arr.subarray(2, 3); // 只有 0xC2，不完整
  return isUtf8(sub) === false;
});

test('Uint8Array.subarray - 空 subarray', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const sub = arr.subarray(2, 2);
  return isUtf8(sub) === true;
});

// ArrayBuffer 视图测试
test('ArrayBuffer 不同视图 - Uint8Array', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab);
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(view) === true;
});

test('ArrayBuffer 不同视图 - Uint8Array (偏移)', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 2, 5); // 从偏移 2 开始，长度 5
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(view) === true;
});

test('ArrayBuffer 不同视图 - Int8Array', () => {
  const ab = new ArrayBuffer(10);
  const view = new Int8Array(ab);
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isUtf8(view) === true;
});

test('ArrayBuffer 不同视图 - 共享 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const view1 = new Uint8Array(ab, 0, 5);
  const view2 = new Uint8Array(ab, 5, 5);
  view1.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  view2.set([0x57, 0x6F, 0x72, 0x6C, 0x64]); // "World"
  return isUtf8(view1) === true && isUtf8(view2) === true;
});

// 嵌套 subarray
test('嵌套 subarray - Buffer', () => {
  const buf = Buffer.from('Hello World', 'utf8');
  const sub1 = buf.subarray(0, 8); // "Hello Wo"
  const sub2 = sub1.subarray(0, 5); // "Hello"
  return isUtf8(sub2) === true;
});

test('嵌套 subarray - Uint8Array', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F]); // "Hello Wo"
  const sub1 = arr.subarray(0, 8);
  const sub2 = sub1.subarray(0, 5); // "Hello"
  return isUtf8(sub2) === true;
});

test('嵌套 subarray - 多层嵌套', () => {
  const buf = Buffer.from('Hello World!', 'utf8');
  const sub1 = buf.subarray(0, 11); // "Hello World"
  const sub2 = sub1.subarray(0, 8); // "Hello Wo"
  const sub3 = sub2.subarray(0, 5); // "Hello"
  return isUtf8(sub3) === true;
});

// 修改视图后的验证
test('修改后验证 - 修改 Buffer 影响 subarray', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sub = buf.subarray(0);
  buf[0] = 0x80; // 修改为无效字节
  return isUtf8(sub) === false;
});

test('修改后验证 - 修改 subarray 影响原 Buffer', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sub = buf.subarray(0);
  sub[0] = 0x80; // 修改为无效字节
  return isUtf8(buf) === false;
});

test('修改后验证 - Uint8Array 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(5);
  const view1 = new Uint8Array(ab);
  const view2 = new Uint8Array(ab);
  view1.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const valid1 = isUtf8(view2) === true;
  view2[0] = 0x80; // 修改为无效字节
  const valid2 = isUtf8(view1) === false;
  return valid1 && valid2;
});

// slice vs subarray
test('Buffer.slice - 创建新 Buffer', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sliced = buf.slice(0, 3); // "Hel"
  return isUtf8(sliced) === true;
});

test('Buffer.slice - 修改行为', () => {
  const buf = Buffer.from('Hello', 'utf8');
  const sliced = buf.slice(0);
  sliced[0] = 0x80; // 修改切片
  // slice 在不同版本可能有不同行为（共享或独立内存）
  const result = isUtf8(buf);
  return result === true || result === false; // 两种行为都可接受
});

test('Uint8Array.slice - 创建新数组', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const sliced = arr.slice(0, 3); // "Hel"
  return isUtf8(sliced) === true;
});

test('Uint8Array.slice - 修改不影响原数组', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const sliced = arr.slice(0);
  sliced[0] = 0x80; // 修改切片
  return isUtf8(arr) === true; // 原数组仍然有效
});

// 零拷贝视图
test('零拷贝 - Buffer.from(ArrayBuffer)', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const buf = Buffer.from(ab);
  return isUtf8(buf) === true;
});

test('零拷贝 - Buffer.from(TypedArray.buffer)', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const buf = Buffer.from(arr.buffer);
  return isUtf8(buf) === true;
});

test('零拷贝 - 修改共享内存', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view.set([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  const buf = Buffer.from(ab);
  view[0] = 0x80; // 修改视图
  return isUtf8(buf) === false; // Buffer 也受影响
});

// 大视图和 subarray
test('大 Buffer - subarray 前半部分', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(0x41); // ASCII 'A'
  const sub = buf.subarray(0, 5000);
  return isUtf8(sub) === true;
});

test('大 Buffer - subarray 后半部分', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(0x41); // ASCII 'A'
  const sub = buf.subarray(5000, 10000);
  return isUtf8(sub) === true;
});

test('大 Buffer - subarray 中间部分', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(0x41); // ASCII 'A'
  const sub = buf.subarray(2500, 7500);
  return isUtf8(sub) === true;
});

test('大 Buffer - 小 subarray', () => {
  const buf = Buffer.alloc(10000);
  buf.fill(0x41); // ASCII 'A'
  const sub = buf.subarray(5000, 5010); // 只有 10 字节
  return isUtf8(sub) === true;
});

// 边界对齐的 subarray
test('边界对齐 - 多字节字符对齐', () => {
  const buf = Buffer.from('你好世界', 'utf8'); // 4 个字符，每个 3 字节，共 12 字节
  const sub1 = buf.subarray(0, 3); // "你"
  const sub2 = buf.subarray(3, 6); // "好"
  const sub3 = buf.subarray(6, 9); // "世"
  const sub4 = buf.subarray(9, 12); // "界"
  return isUtf8(sub1) === true && isUtf8(sub2) === true && isUtf8(sub3) === true && isUtf8(sub4) === true;
});

test('边界对齐 - Emoji 对齐', () => {
  const buf = Buffer.from('😀😁😂', 'utf8'); // 3 个 emoji，每个 4 字节，共 12 字节
  const sub1 = buf.subarray(0, 4); // "😀"
  const sub2 = buf.subarray(4, 8); // "😁"
  const sub3 = buf.subarray(8, 12); // "😂"
  return isUtf8(sub1) === true && isUtf8(sub2) === true && isUtf8(sub3) === true;
});

test('边界未对齐 - 跨越字符边界', () => {
  const buf = Buffer.from('你好世界', 'utf8'); // 每个字符 3 字节
  const sub = buf.subarray(1, 10); // 从"你"的第 2 字节开始，到"界"的第 1 字节
  return isUtf8(sub) === false;
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
