// buf.set() - Part 4: Memory Overlap & Self-Reference Tests
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

// 自身重叠测试
test('从自身 subarray 设置（向后移动）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(0, 3); // [1, 2, 3]
  buf.set(sub, 2); // 复制到位置 2
  // 应该正确处理重叠：[1, 2, 1, 2, 3]
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 1 && 
         buf[3] === 2 && buf[4] === 3;
});

test('从自身 subarray 设置（向前移动）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 5); // [3, 4, 5]
  buf.set(sub, 0); // 复制到位置 0
  // 应该正确处理重叠：[3, 4, 5, 4, 5]
  return buf[0] === 3 && buf[1] === 4 && buf[2] === 5 && 
         buf[3] === 4 && buf[4] === 5;
});

test('从自身设置（完全重叠，offset=0）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.set(buf, 0);
  // 内容不变
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 4 && buf[4] === 5;
});

test('从自身 subarray 设置（部分重叠，中间区域）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
  const sub = buf.subarray(2, 5); // [3, 4, 5]
  buf.set(sub, 3); // 复制到位置 3
  // 重叠区域：[1, 2, 3, 3, 4, 5, 7]
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 3 && buf[4] === 4 && buf[5] === 5 && buf[6] === 7;
});

test('从自身 subarray 设置（单字节重叠）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(1, 2); // [2]
  buf.set(sub, 2);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 2 && 
         buf[3] === 4 && buf[4] === 5;
});

// 共享底层 ArrayBuffer 的重叠
test('从共享 ArrayBuffer 的 Uint8Array 设置（重叠）', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  buf[0] = 1;
  buf[1] = 2;
  buf[2] = 3;
  buf[3] = 4;
  buf[4] = 5;
  
  const uint8 = new Uint8Array(ab, 0, 3); // [1, 2, 3]
  buf.set(uint8, 2); // 复制到位置 2
  
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 1 && 
         buf[3] === 2 && buf[4] === 3;
});

test('从共享 ArrayBuffer 的不同偏移 Uint8Array 设置', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  for (let i = 0; i < 10; i++) buf[i] = i + 1;
  
  const uint8 = new Uint8Array(ab, 3, 3); // [4, 5, 6]
  buf.set(uint8, 0);
  
  return buf[0] === 4 && buf[1] === 5 && buf[2] === 6;
});

// 复杂重叠场景
test('从自身设置（完全覆盖后半部分）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const sub = buf.subarray(0, 3); // [1, 2, 3]
  buf.set(sub, 3);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 1 && buf[4] === 2 && buf[5] === 3;
});

test('从自身设置（完全覆盖前半部分）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const sub = buf.subarray(3, 6); // [4, 5, 6]
  buf.set(sub, 0);
  return buf[0] === 4 && buf[1] === 5 && buf[2] === 6 && 
         buf[3] === 4 && buf[4] === 5 && buf[5] === 6;
});

// 边界重叠
test('从自身 subarray 设置（刚好不重叠）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const sub = buf.subarray(0, 3); // [1, 2, 3]
  buf.set(sub, 3); // 刚好不重叠
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 1 && buf[4] === 2 && buf[5] === 3;
});

test('从自身 subarray 设置（边界重叠1字节）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const sub = buf.subarray(0, 3); // [1, 2, 3]
  buf.set(sub, 2); // 重叠1字节
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 1 && 
         buf[3] === 2 && buf[4] === 3 && buf[5] === 6;
});

// 多次重叠操作
test('连续多次从自身设置', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  buf.set(buf.subarray(0, 2), 2); // [1, 2, 1, 2, 5, 6, 7, 8]
  buf.set(buf.subarray(2, 4), 4); // [1, 2, 1, 2, 1, 2, 7, 8]
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 1 && 
         buf[3] === 2 && buf[4] === 1 && buf[5] === 2;
});

// 零长度重叠
test('从自身零长度 subarray 设置', () => {
  const buf = Buffer.from([1, 2, 3]);
  const sub = buf.subarray(1, 1); // 零长度
  buf.set(sub, 1);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 大数据重叠
test('从自身大数据 subarray 设置（重叠）', () => {
  const size = 1000;
  const buf = Buffer.alloc(size);
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }
  
  const sub = buf.subarray(0, 500);
  buf.set(sub, 250); // 重叠250字节
  // 复制 [0..499] 到 [250..749]
  // buf[250] = 原buf[0] = 0
  // buf[251] = 原buf[1] = 1
  // buf[749] = 原buf[499] = 499 % 256 = 243
  return buf[250] === 0 && buf[251] === 1 && buf[749] === 243;
});

// TypedArray 视图重叠
test('从 Uint8Array 视图设置（共享 Buffer）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
  const sub = uint8.subarray(1, 4); // [2, 3, 4]
  buf.set(sub, 0);
  return buf[0] === 2 && buf[1] === 3 && buf[2] === 4 && 
         buf[3] === 4 && buf[4] === 5;
});

test('从 Uint16Array 视图设置（共享 Buffer，重叠）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const uint16 = new Uint16Array(buf.buffer, buf.byteOffset, 4);
  // uint16[0] = 0x0201, uint16[1] = 0x0403, ...
  const sub = new Uint8Array(uint16.buffer, uint16.byteOffset, 4);
  buf.set(sub, 2);
  return buf[2] === 1 && buf[3] === 2 && buf[4] === 3 && buf[5] === 4;
});

// 反向重叠
test('从自身 subarray 设置（反向，完全重叠）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const sub = buf.subarray(2, 5); // [3, 4, 5]
  buf.set(sub, 1); // 向前移动
  return buf[0] === 1 && buf[1] === 3 && buf[2] === 4 && 
         buf[3] === 5 && buf[4] === 5;
});

test('从自身 subarray 设置（反向，部分重叠）', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6]);
  const sub = buf.subarray(3, 6); // [4, 5, 6]
  buf.set(sub, 1); // 向前移动
  return buf[0] === 1 && buf[1] === 4 && buf[2] === 5 && 
         buf[3] === 6 && buf[4] === 5 && buf[5] === 6;
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
