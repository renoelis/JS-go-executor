// buf.length - Part 14: Extreme Edge Cases
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

// Object.freeze 测试（TypedArray 不能 freeze，测试错误处理）
test('Object.freeze Buffer 会抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    Object.freeze(buf);
    return false; // 不应该成功
  } catch (e) {
    // 应该抛出错误
    return buf.length === 5;
  }
});

// Object.seal 测试（TypedArray 不能 seal，测试错误处理）
test('Object.seal Buffer 会抛出错误', () => {
  const buf = Buffer.from('hello');
  try {
    Object.seal(buf);
    return false; // 不应该成功
  } catch (e) {
    // 应该抛出错误
    return buf.length === 5;
  }
});

// Object.preventExtensions 测试
test('Object.preventExtensions 后 length 仍可读', () => {
  const buf = Buffer.from('hello');
  try {
    Object.preventExtensions(buf);
    return buf.length === 5;
  } catch (e) {
    // 如果不支持，也返回 true
    return buf.length === 5;
  }
});

// 严格模式下的赋值测试
test('严格模式下尝试修改 length 为数字', () => {
  'use strict';
  const buf = Buffer.from('hello');
  let errorThrown = false;
  try {
    buf.length = 100;
  } catch (e) {
    errorThrown = true;
  }
  // 无论是否抛出错误，length 都应该保持不变
  return buf.length === 5;
});

test('严格模式下尝试删除 length', () => {
  'use strict';
  const buf = Buffer.from('hello');
  let errorThrown = false;
  try {
    delete buf.length;
  } catch (e) {
    errorThrown = true;
  }
  return buf.length === 5;
});

// length 与 buffer.buffer 的深入关系
test('slice 的 length 与 buffer.buffer.byteLength 关系', () => {
  const buf = Buffer.alloc(100);
  const slice = buf.slice(10, 20);
  // slice 的 length 是 10，但 buffer.byteLength 可能更大
  return slice.length === 10 && slice.buffer.byteLength >= slice.length;
});

test('多层 slice 的 length 与 buffer 关系', () => {
  const buf = Buffer.alloc(100);
  const slice1 = buf.slice(10, 50);
  const slice2 = slice1.slice(5, 15);
  return slice2.length === 10 && slice2.buffer.byteLength >= slice2.length;
});

test('subarray 的 length 与 buffer.buffer.byteLength 关系', () => {
  const buf = Buffer.alloc(100);
  const sub = buf.subarray(10, 20);
  return sub.length === 10 && sub.buffer.byteLength >= sub.length;
});

// length 与 byteOffset 的组合测试
test('length + byteOffset <= buffer.byteLength', () => {
  const buf = Buffer.alloc(100);
  const slice = buf.slice(10, 30);
  return slice.length + slice.byteOffset <= slice.buffer.byteLength;
});

test('subarray length + byteOffset <= buffer.byteLength', () => {
  const buf = Buffer.alloc(100);
  const sub = buf.subarray(20, 40);
  return sub.length + sub.byteOffset <= sub.buffer.byteLength;
});

// 极端大小的 Buffer
test('length 为 2^10 的 buffer', () => {
  const buf = Buffer.alloc(1024);
  return buf.length === 1024;
});

test('length 为 2^15 的 buffer', () => {
  const buf = Buffer.alloc(32768);
  return buf.length === 32768;
});

test('length 为 2^17 的 buffer', () => {
  const buf = Buffer.alloc(131072);
  return buf.length === 131072;
});

test('length 为 2^18 的 buffer', () => {
  const buf = Buffer.alloc(262144);
  return buf.length === 262144;
});

// Buffer.from 各种边界情况
test('Buffer.from 包含所有可能字节值', () => {
  const arr = [];
  for (let i = 0; i < 256; i++) {
    arr.push(i);
  }
  const buf = Buffer.from(arr);
  return buf.length === 256;
});

test('Buffer.from 重复的字节值', () => {
  const arr = new Array(1000).fill(0xFF);
  const buf = Buffer.from(arr);
  return buf.length === 1000;
});

// Buffer.concat 极端情况
test('Buffer.concat 1000 个小 buffer', () => {
  const buffers = [];
  for (let i = 0; i < 1000; i++) {
    buffers.push(Buffer.from([i % 256]));
  }
  const result = Buffer.concat(buffers);
  return result.length === 1000;
});

test('Buffer.concat 混合大小的 buffer', () => {
  const buffers = [
    Buffer.alloc(0),
    Buffer.alloc(1),
    Buffer.alloc(10),
    Buffer.alloc(100),
    Buffer.alloc(1000)
  ];
  const result = Buffer.concat(buffers);
  return result.length === 1111;
});

// 特殊编码的极端情况
test('utf8 最长单字符（4字节）', () => {
  const buf = Buffer.from('𐍈', 'utf8'); // U+10348
  return buf.length === 4;
});

test('utf16le emoji 的 length', () => {
  const buf = Buffer.from('😀', 'utf16le');
  return buf.length === 4; // 代理对，2个16位单元
});

test('base64 最小有效输入', () => {
  const buf = Buffer.from('AA==', 'base64');
  return buf.length === 1;
});

test('hex 最小有效输入', () => {
  const buf = Buffer.from('00', 'hex');
  return buf.length === 1;
});

// write 方法的边界情况
test('write 到 buffer 末尾后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 5, 'utf8');
  return buf.length === 10;
});

test('write 超出范围被截断后 length 不变', () => {
  const buf = Buffer.alloc(5);
  buf.write('hello world', 0, 'utf8');
  return buf.length === 5;
});

test('write 从中间位置开始后 length 不变', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 10, 'utf8');
  return buf.length === 20;
});

// fill 方法的边界情况
test('fill 整个 buffer 后 length 不变', () => {
  const buf = Buffer.alloc(100);
  buf.fill(0xFF, 0, 100);
  return buf.length === 100;
});

test('fill 使用多字节字符后 length 不变', () => {
  const buf = Buffer.alloc(10);
  buf.fill('你好', 'utf8');
  return buf.length === 10;
});

test('fill 使用 buffer 作为填充值后 length 不变', () => {
  const fillBuf = Buffer.from([1, 2, 3]);
  const buf = Buffer.alloc(10);
  buf.fill(fillBuf);
  return buf.length === 10;
});

// copy 方法的边界情况
test('copy 到自身后 length 不变', () => {
  const buf = Buffer.from('hello world');
  buf.copy(buf, 0, 6, 11);
  return buf.length === 11;
});

test('copy 重叠区域后 length 不变', () => {
  const buf = Buffer.from('abcdefghij');
  buf.copy(buf, 2, 0, 5);
  return buf.length === 10;
});

test('copy 零字节后 length 不变', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2, 0, 0, 0);
  return buf1.length === 5 && buf2.length === 10;
});

// 索引访问的边界情况
test('访问 length 位置返回 undefined', () => {
  const buf = Buffer.from('hello');
  return buf.length === 5 && buf[5] === undefined;
});

test('访问负索引返回 undefined', () => {
  const buf = Buffer.from('hello');
  return buf.length === 5 && buf[-1] === undefined;
});

test('访问远超 length 的索引返回 undefined', () => {
  const buf = Buffer.from('hello');
  return buf.length === 5 && buf[1000] === undefined;
});

// Buffer 与其他类型的交互
test('Buffer 作为函数参数后 length 不变', () => {
  const buf = Buffer.from('hello');
  function processBuffer(b) {
    return b.length;
  }
  const len = processBuffer(buf);
  return buf.length === 5 && len === 5;
});

test('Buffer 作为返回值后 length 不变', () => {
  function createBuffer() {
    return Buffer.from('hello');
  }
  const buf = createBuffer();
  return buf.length === 5;
});

test('Buffer 在数组中的 length', () => {
  const buf = Buffer.from('hello');
  const arr = [buf];
  return arr[0].length === 5;
});

test('Buffer 在对象中的 length', () => {
  const buf = Buffer.from('hello');
  const obj = { buffer: buf };
  return obj.buffer.length === 5;
});

// 特殊的 TypedArray 转换
test('Buffer 转 Uint8Array 后 length 一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = new Uint8Array(buf);
  return buf.length === arr.length && arr.length === 5;
});

test('Buffer 转 Uint16Array 后元素数量关系', () => {
  const buf = Buffer.alloc(10);
  const arr = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
  return buf.length === 10 && arr.length === 5;
});

test('Buffer 转 Uint32Array 后元素数量关系', () => {
  const buf = Buffer.alloc(16);
  const arr = new Uint32Array(buf.buffer, buf.byteOffset, buf.length / 4);
  return buf.length === 16 && arr.length === 4;
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
