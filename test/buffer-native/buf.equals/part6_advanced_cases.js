// buf.equals() - Advanced Cases and Edge Scenarios
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

// Uint8Array byteOffset 和 byteLength 测试
test('Uint8Array - 从 ArrayBuffer 偏移位置创建', () => {
  const ab = new ArrayBuffer(10);
  const view1 = new Uint8Array(ab, 2, 3);
  view1[0] = 1;
  view1[1] = 2;
  view1[2] = 3;
  const buf = Buffer.from([1, 2, 3]);
  return buf.equals(view1) === true;
});

test('Uint8Array - 不同 byteOffset 相同内容', () => {
  const ab = new ArrayBuffer(10);
  const view1 = new Uint8Array(ab, 0, 3);
  view1[0] = 1;
  view1[1] = 2;
  view1[2] = 3;
  const view2 = new Uint8Array(ab, 5, 3);
  view2[0] = 1;
  view2[1] = 2;
  view2[2] = 3;
  const buf = Buffer.from([1, 2, 3]);
  return buf.equals(view1) === true && buf.equals(view2) === true;
});

test('Uint8Array - byteLength vs length', () => {
  const ab = new ArrayBuffer(10);
  const view = new Uint8Array(ab, 2, 3);
  view[0] = 1;
  view[1] = 2;
  view[2] = 3;
  const buf = Buffer.from([1, 2, 3]);
  return view.byteLength === 3 && view.length === 3 && buf.equals(view) === true;
});

test('Uint8Array - 从 Buffer 的 ArrayBuffer 创建', () => {
  // 注意：Buffer.buffer 可能包含额外的内存池数据，所以直接使用 Buffer 的数据
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3]);
  // 使用 Buffer.subarray 创建视图，然后转换为 Uint8Array
  const view = new Uint8Array(buf1.subarray(0, 3));
  return buf2.equals(view) === true;
});

test('Uint8Array - 从 Buffer 的 ArrayBuffer 偏移创建', () => {
  // 注意：Buffer.buffer 可能包含额外的内存池数据，所以直接使用 Buffer 的数据
  const buf1 = Buffer.from([0, 0, 1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  // 使用 Buffer.subarray 创建视图，然后转换为 Uint8Array
  const view = new Uint8Array(buf1.subarray(2, 5));
  return buf2.equals(view) === true;
});

// 单个字节 Buffer 测试
test('单个字节 - 相同', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.from([42]);
  return buf1.equals(buf2) === true;
});

test('单个字节 - 不同', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.from([43]);
  return buf1.equals(buf2) === false;
});

test('单个字节 - 0', () => {
  const buf1 = Buffer.from([0]);
  const buf2 = Buffer.from([0]);
  return buf1.equals(buf2) === true;
});

test('单个字节 - 255', () => {
  const buf1 = Buffer.from([255]);
  const buf2 = Buffer.from([255]);
  return buf1.equals(buf2) === true;
});

test('单个字节 vs 多字节', () => {
  const buf1 = Buffer.from([42]);
  const buf2 = Buffer.from([42, 0]);
  return buf1.equals(buf2) === false;
});

// 边界长度测试
test('长度 0 - 空 Buffer', () => {
  const buf1 = Buffer.alloc(0);
  const buf2 = Buffer.alloc(0);
  return buf1.equals(buf2) === true;
});

test('长度 1 - 单字节 Buffer', () => {
  const buf1 = Buffer.from([1]);
  const buf2 = Buffer.from([1]);
  return buf1.equals(buf2) === true;
});

test('长度 2 - 双字节 Buffer', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([1, 2]);
  return buf1.equals(buf2) === true;
});

// 非常大的 Buffer 测试
test('大 Buffer - 10MB', () => {
  const size = 10 * 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  return buf1.equals(buf2) === true;
});

test('大 Buffer - 10MB 不同内容', () => {
  const size = 10 * 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xBB);
  return buf1.equals(buf2) === false;
});

test('大 Buffer - 10MB 最后一个字节不同', () => {
  const size = 10 * 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  buf2[size - 1] = 0xBB;
  return buf1.equals(buf2) === false;
});

test('大 Buffer - 10MB 第一个字节不同', () => {
  const size = 10 * 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  buf2[0] = 0xBB;
  return buf1.equals(buf2) === false;
});

test('大 Buffer - 10MB 中间字节不同', () => {
  const size = 10 * 1024 * 1024;
  const buf1 = Buffer.alloc(size, 0xAA);
  const buf2 = Buffer.alloc(size, 0xAA);
  buf2[Math.floor(size / 2)] = 0xBB;
  return buf1.equals(buf2) === false;
});

// 稀疏数组/对象测试
test('稀疏对象 - 有 length 但缺少索引', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const sparseObj = { length: 3 };
    sparseObj[0] = 1;
    sparseObj[2] = 3;
    buf.equals(sparseObj);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('类 Buffer 对象 - 有 length 和索引但不是 Buffer', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const fakeBuffer = {
      length: 3,
      0: 1,
      1: 2,
      2: 3
    };
    buf.equals(fakeBuffer);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('类 Buffer 对象 - 缺少 length', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const fakeBuffer = {
      0: 1,
      1: 2,
      2: 3
    };
    buf.equals(fakeBuffer);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

// 错误消息精确性测试
test('错误消息 - null 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(null);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('null');
  }
});

test('错误消息 - undefined 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('undefined');
  }
});

test('错误消息 - 字符串参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals('hello');
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('string');
  }
});

test('错误消息 - 数字参数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    buf.equals(123);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('number');
  }
});

test('错误消息 - boolean 参数', () => {
  try {
    const buf = Buffer.from('hello');
    buf.equals(true);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('boolean');
  }
});

test('错误消息 - ArrayBuffer 参数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const ab = new ArrayBuffer(3);
    buf.equals(ab);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer');
  }
});

test('错误消息 - Int8Array 参数', () => {
  try {
    const buf = Buffer.from([1, 2, 3]);
    const arr = new Int8Array([1, 2, 3]);
    buf.equals(arr);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && 
           e.message.includes('otherBuffer') &&
           e.message.includes('Int8Array');
  }
});

// 字符串化数字索引 vs 数字索引
test('字符串化数字索引 - Buffer', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 3]);
  return buf1.equals(buf2) === true;
});

test('字符串化数字索引 - Uint8Array', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return buf.equals(arr) === true;
});

// 字节值边界测试
test('字节值 - 0x00', () => {
  const buf1 = Buffer.from([0x00]);
  const buf2 = Buffer.from([0x00]);
  return buf1.equals(buf2) === true;
});

test('字节值 - 0xFF', () => {
  const buf1 = Buffer.from([0xFF]);
  const buf2 = Buffer.from([0xFF]);
  return buf1.equals(buf2) === true;
});

test('字节值 - 0x00 和 0xFF 混合', () => {
  const buf1 = Buffer.from([0x00, 0xFF, 0x00]);
  const buf2 = Buffer.from([0x00, 0xFF, 0x00]);
  return buf1.equals(buf2) === true;
});

test('字节值 - 超出 0xFF 范围（会被截断）', () => {
  const buf1 = Buffer.from([256, 257, 258]);
  const buf2 = Buffer.from([0, 1, 2]);
  return buf1.equals(buf2) === true;
});

test('字节值 - 负数（会被转换）', () => {
  const buf1 = Buffer.from([-1, -2, -3]);
  const buf2 = Buffer.from([255, 254, 253]);
  return buf1.equals(buf2) === true;
});

// Uint8Array 边界情况
test('Uint8Array - 空 ArrayBuffer', () => {
  const ab = new ArrayBuffer(0);
  const view = new Uint8Array(ab);
  const buf = Buffer.alloc(0);
  return buf.equals(view) === true;
});

test('Uint8Array - 长度为 1', () => {
  const arr = new Uint8Array([42]);
  const buf = Buffer.from([42]);
  return buf.equals(arr) === true;
});

test('Uint8Array - 长度为 2', () => {
  const arr = new Uint8Array([1, 2]);
  const buf = Buffer.from([1, 2]);
  return buf.equals(arr) === true;
});

// Buffer 和 Uint8Array 互相比较
test('Buffer.equals(Uint8Array) - 相同内容', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  return buf.equals(arr) === true;
});

test('Buffer.equals(Uint8Array) - 不同内容', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([4, 5, 6]);
  return buf.equals(arr) === false;
});

test('Buffer.equals(Uint8Array) - 不同长度', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2]);
  return buf.equals(arr) === false;
});

test('Uint8Array.equals(Buffer) - 相同内容', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = new Uint8Array([1, 2, 3]);
  return arr.equals ? arr.equals(buf) === true : buf.equals(arr) === true;
});

// 特殊字符和编码边界
test('特殊字符 - 所有 ASCII 可打印字符', () => {
  const chars = [];
  for (let i = 32; i <= 126; i++) {
    chars.push(i);
  }
  const buf1 = Buffer.from(chars);
  const buf2 = Buffer.from(chars);
  return buf1.equals(buf2) === true;
});

test('特殊字符 - 所有控制字符 (0-31)', () => {
  const chars = [];
  for (let i = 0; i <= 31; i++) {
    chars.push(i);
  }
  const buf1 = Buffer.from(chars);
  const buf2 = Buffer.from(chars);
  return buf1.equals(buf2) === true;
});

test('特殊字符 - 所有扩展 ASCII (128-255)', () => {
  const chars = [];
  for (let i = 128; i <= 255; i++) {
    chars.push(i);
  }
  const buf1 = Buffer.from(chars);
  const buf2 = Buffer.from(chars);
  return buf1.equals(buf2) === true;
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

