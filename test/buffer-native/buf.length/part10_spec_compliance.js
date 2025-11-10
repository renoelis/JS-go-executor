// buf.length - Part 10: Specification Compliance
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

// ECMAScript 规范兼容性
test('length 是数据属性', () => {
  const buf = Buffer.alloc(10);
  // 验证 length 属性存在且可读
  return buf.length === 10 && typeof buf.length === 'number';
});

test('length 值为非负整数', () => {
  const buf = Buffer.alloc(10);
  return Number.isInteger(buf.length) && buf.length >= 0;
});

test('length 在安全整数范围内', () => {
  const buf = Buffer.alloc(100);
  return Number.isSafeInteger(buf.length);
});

// 与 TypedArray 规范一致性
test('length 与 TypedArray.length 行为一致', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  return buf.length === arr.length && buf.length === 5;
});

test('空 Buffer length 与空 TypedArray 一致', () => {
  const buf = Buffer.alloc(0);
  const arr = new Uint8Array(0);
  return buf.length === arr.length && buf.length === 0;
});

// String.prototype.length 对比
test('Buffer.length 是字节长度，非字符长度', () => {
  const str = '你好';
  const buf = Buffer.from(str);
  return str.length === 2 && buf.length === 6;
});

test('ASCII 字符串 Buffer.length 等于 String.length', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return str.length === buf.length && buf.length === 5;
});

// Array.length 对比
test('Buffer.length 不可扩展', () => {
  const buf = Buffer.from([1, 2, 3]);
  const arr = [1, 2, 3];
  arr.length = 5; // 数组可以改变 length
  const originalBufLen = buf.length;
  buf.length = 5; // Buffer 不能改变 length
  return buf.length === originalBufLen && buf.length === 3;
});

// 官方文档示例验证
test('官方示例 - alloc 后 write 不改变 length', () => {
  const buf = Buffer.alloc(1234);
  const len1 = buf.length; // 1234
  buf.write('some string', 0, 'utf8');
  const len2 = buf.length; // 仍然是 1234
  return len1 === 1234 && len2 === 1234;
});

// Buffer.poolSize 相关
test('小于 poolSize 的 Buffer length 正确', () => {
  const poolSize = Buffer.poolSize || 8192;
  const buf = Buffer.allocUnsafe(poolSize / 2);
  return buf.length === poolSize / 2;
});

test('等于 poolSize 的 Buffer length 正确', () => {
  const poolSize = Buffer.poolSize || 8192;
  const buf = Buffer.allocUnsafe(poolSize);
  return buf.length === poolSize;
});

test('大于 poolSize 的 Buffer length 正确', () => {
  const poolSize = Buffer.poolSize || 8192;
  const buf = Buffer.allocUnsafe(poolSize + 1);
  return buf.length === poolSize + 1;
});

// Buffer.constants 相关
test('MAX_LENGTH 范围内的 length', () => {
  const maxLen = Buffer.constants ? Buffer.constants.MAX_LENGTH : 2147483647;
  const buf = Buffer.alloc(100);
  return buf.length <= maxLen;
});

test('MAX_STRING_LENGTH 相关', () => {
  const maxStrLen = Buffer.constants ? Buffer.constants.MAX_STRING_LENGTH : 536870888;
  const buf = Buffer.alloc(100);
  return buf.length <= maxStrLen;
});

// 零拷贝语义
test('slice 共享内存但 length 独立', () => {
  const buf = Buffer.from('hello world');
  const slice = buf.slice(0, 5);
  slice[0] = 72; // 修改 slice 会影响 buf
  return buf[0] === 72 && buf.length === 11 && slice.length === 5;
});

test('subarray 共享内存但 length 独立', () => {
  const buf = Buffer.from('hello world');
  const sub = buf.subarray(0, 5);
  sub[0] = 72; // 修改 subarray 会影响 buf
  return buf[0] === 72 && buf.length === 11 && sub.length === 5;
});

// 内存对齐
test('length 不受内存对齐影响', () => {
  const buf1 = Buffer.alloc(1);
  const buf2 = Buffer.alloc(3);
  const buf3 = Buffer.alloc(7);
  return buf1.length === 1 && buf2.length === 3 && buf3.length === 7;
});

// 跨平台一致性
test('不同大小 Buffer 的 length 类型一致', () => {
  const buf1 = Buffer.alloc(1);
  const buf2 = Buffer.alloc(1000);
  const buf3 = Buffer.alloc(1000000);
  return typeof buf1.length === 'number' && 
         typeof buf2.length === 'number' && 
         typeof buf3.length === 'number';
});

// 边界值
test('length 为 0 的边界情况', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0 && buf.length === buf.byteLength;
});

test('length 为 1 的边界情况', () => {
  const buf = Buffer.alloc(1);
  return buf.length === 1 && buf.length === buf.byteLength;
});

test('length 为 2^16 的情况', () => {
  const buf = Buffer.alloc(65536);
  return buf.length === 65536;
});

test('length 为 2^20 的情况', () => {
  const buf = Buffer.alloc(1048576);
  return buf.length === 1048576;
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
