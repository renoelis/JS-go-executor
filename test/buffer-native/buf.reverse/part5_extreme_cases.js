// buf.reverse() - Part 5: Extreme & Exotic Cases
// 极端测试：冻结对象、质数长度、属性访问、特殊模式等

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

// === Object.freeze/seal 测试 ===

// Case 1: 尝试 freeze Buffer 会抛出错误（Node.js v25.0.0 行为）
test('Object.freeze Buffer 抛出 TypeError', () => {
  try {
    const buf = Buffer.from([1, 2, 3, 4]);
    Object.freeze(buf);
    return false; // 不应该到达这里
  } catch (err) {
    // Node.js 不允许 freeze TypedArray
    return err.name === 'TypeError' && 
           err.message.includes('Cannot freeze array buffer views');
  }
});

// Case 2: 尝试 seal Buffer 会抛出错误
test('Object.seal Buffer 抛出 TypeError', () => {
  try {
    const buf = Buffer.from([5, 10, 15, 20]);
    Object.seal(buf);
    return false; // 不应该到达这里
  } catch (err) {
    // Node.js 不允许 seal TypedArray
    return err.name === 'TypeError' && 
           err.message.includes('Cannot seal array buffer views');
  }
});

// === 质数长度测试 ===

// Case 3: 长度为 11（质数）
test('长度为 11（质数）的 Buffer 反转', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  buf.reverse();
  
  return buf[0] === 11 && buf[5] === 6 && buf[10] === 1;
});

// Case 4: 长度为 13（质数）
test('长度为 13（质数）的 Buffer 反转', () => {
  const buf = Buffer.alloc(13);
  for (let i = 0; i < 13; i++) buf[i] = i;
  
  buf.reverse();
  
  return buf[0] === 12 && buf[6] === 6 && buf[12] === 0;
});

// Case 5: 长度为 17（质数）
test('长度为 17（质数）的 Buffer 反转', () => {
  const buf = Buffer.alloc(17, 0xAB);
  buf[0] = 1;
  buf[16] = 2;
  
  buf.reverse();
  
  return buf[0] === 2 && buf[16] === 1 && buf[8] === 0xAB;
});

// === 索引访问边界测试 ===

// Case 6: 反转后通过负索引访问（Node.js 不支持负索引）
test('反转后负索引访问返回 undefined', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  buf.reverse(); // [4, 3, 2, 1]
  
  // 负索引在 Buffer 中不支持
  return buf[-1] === undefined && buf[-2] === undefined;
});

// Case 7: 反转后超出范围索引访问
test('反转后超出范围索引返回 undefined', () => {
  const buf = Buffer.from([10, 20, 30]);
  buf.reverse(); // [30, 20, 10]
  
  return buf[3] === undefined && buf[100] === undefined;
});

// === 更多编码测试 ===

// Case 8: ascii 编码的 Buffer 反转
test('ascii 编码的 Buffer 反转', () => {
  const buf = Buffer.from('ABC', 'ascii');
  buf.reverse();
  
  // 'ABC' = [65, 66, 67] → [67, 66, 65] = 'CBA'
  return buf.toString('ascii') === 'CBA';
});

// Case 9: ucs2/utf16le 编码的 Buffer 反转（字节级）
test('ucs2 编码的 Buffer 反转（字节级）', () => {
  const buf = Buffer.from('AB', 'ucs2');
  const originalLength = buf.length;
  
  buf.reverse();
  
  // 字节级反转会破坏 UTF-16 编码
  return buf.length === originalLength && buf.length === 4;
});

// Case 10: binary 编码的 Buffer 反转
test('binary(latin1) 编码的 Buffer 反转', () => {
  const buf = Buffer.from('\x01\x02\x03\x04', 'binary');
  buf.reverse();
  
  const expected = [4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 特殊数值模式测试 ===

// Case 11: 斐波那契数列模式
test('斐波那契数列模式 Buffer 反转', () => {
  const fib = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55];
  const buf = Buffer.from(fib);
  
  buf.reverse();
  
  const expected = [55, 34, 21, 13, 8, 5, 3, 2, 1, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 12: 递增后递减模式
test('递增后递减模式 Buffer 反转', () => {
  const pattern = [1, 2, 3, 4, 5, 4, 3, 2, 1];
  const buf = Buffer.from(pattern);
  
  buf.reverse();
  
  const expected = [1, 2, 3, 4, 5, 4, 3, 2, 1]; // 对称，反转不变
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 13: 2的幂次数列
test('2的幂次数列 Buffer 反转', () => {
  const powers = [1, 2, 4, 8, 16, 32, 64, 128];
  const buf = Buffer.from(powers);
  
  buf.reverse();
  
  const expected = [128, 64, 32, 16, 8, 4, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 属性和方法测试 ===

// Case 14: reverse 方法的 name 属性
test('reverse 方法的 name 属性', () => {
  return Buffer.prototype.reverse.name === 'reverse';
});

// Case 15: reverse 方法的 length 属性
test('reverse 方法的 length 属性为 0', () => {
  return Buffer.prototype.reverse.length === 0;
});

// === 跨 Buffer 共享内存测试 ===

// Case 16: 三个 Buffer 共享同一 ArrayBuffer
test('三个 Buffer 共享同一 ArrayBuffer 的反转传播', () => {
  const ab = new ArrayBuffer(12);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);
  const buf3 = Buffer.from(ab);
  
  for (let i = 0; i < 12; i++) buf1[i] = i;
  
  buf1.reverse();
  
  // 所有三个 Buffer 都应该看到反转结果
  const expected = Array.from({length: 12}, (_, i) => 11 - i);
  const actual1 = Array.from(buf1);
  const actual2 = Array.from(buf2);
  const actual3 = Array.from(buf3);
  
  return JSON.stringify(actual1) === JSON.stringify(expected) &&
         JSON.stringify(actual2) === JSON.stringify(expected) &&
         JSON.stringify(actual3) === JSON.stringify(expected);
});

// Case 17: 反转后再创建新的共享视图
test('反转后再创建新的共享视图', () => {
  const ab = new ArrayBuffer(8);
  const buf1 = Buffer.from(ab);
  for (let i = 0; i < 8; i++) buf1[i] = i + 1;
  
  buf1.reverse(); // [8, 7, 6, 5, 4, 3, 2, 1]
  
  // 反转后创建新视图
  const buf2 = Buffer.from(ab);
  
  // buf2 应该看到反转后的结果
  const expected = [8, 7, 6, 5, 4, 3, 2, 1];
  const actual = Array.from(buf2);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 特殊字节序列测试 ===

// Case 18: 全奇数字节
test('全奇数字节 Buffer 反转', () => {
  const buf = Buffer.from([1, 3, 5, 7, 9, 11, 13, 15]);
  buf.reverse();
  
  const expected = [15, 13, 11, 9, 7, 5, 3, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 19: 全偶数字节
test('全偶数字节 Buffer 反转', () => {
  const buf = Buffer.from([2, 4, 6, 8, 10, 12, 14, 16]);
  buf.reverse();
  
  const expected = [16, 14, 12, 10, 8, 6, 4, 2];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 20: 质数序列
test('质数序列 Buffer 反转', () => {
  const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
  const buf = Buffer.from(primes);
  
  buf.reverse();
  
  const expected = [37, 31, 29, 23, 19, 17, 13, 11, 7, 5, 3, 2];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// === 极小长度组合测试 ===

// Case 21: 连续反转不同长度（1-5）
test('连续反转长度 1-5 的 Buffer', () => {
  const results = [];
  
  for (let len = 1; len <= 5; len++) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) buf[i] = i + 1;
    
    buf.reverse();
    
    // 验证反转正确
    const correct = buf[0] === len && buf[len - 1] === 1;
    results.push(correct);
  }
  
  return results.every(r => r === true);
});

// === 内存对齐测试 ===

// Case 22: 长度为 64（缓存行大小）
test('长度为 64（缓存行大小）的 Buffer 反转', () => {
  const buf = Buffer.alloc(64);
  buf[0] = 1;
  buf[31] = 2;
  buf[32] = 3;
  buf[63] = 4;
  
  buf.reverse();
  
  return buf[0] === 4 && buf[31] === 3 && buf[32] === 2 && buf[63] === 1;
});

// Case 23: 长度为 4096（页大小）
test('长度为 4096（页大小）的 Buffer 反转', () => {
  const buf = Buffer.alloc(4096);
  buf[0] = 0xAA;
  buf[2047] = 0xBB;
  buf[2048] = 0xCC;
  buf[4095] = 0xDD;
  
  buf.reverse();
  
  return buf[0] === 0xDD && buf[2047] === 0xCC && 
         buf[2048] === 0xBB && buf[4095] === 0xAA;
});

// === Uint8Array 与 Buffer 混合 ===

// Case 24: Uint8Array 视图在 Buffer 反转后读取
test('Uint8Array 视图在 Buffer 反转后读取', () => {
  const ab = new ArrayBuffer(6);
  const buf = Buffer.from(ab);
  const uint8 = new Uint8Array(ab);
  
  for (let i = 0; i < 6; i++) buf[i] = (i + 1) * 10;
  
  buf.reverse(); // Buffer 反转
  
  // Uint8Array 应该看到相同的反转结果
  const expected = [60, 50, 40, 30, 20, 10];
  const actualBuf = Array.from(buf);
  const actualUint8 = Array.from(uint8);
  
  return JSON.stringify(actualBuf) === JSON.stringify(expected) &&
         JSON.stringify(actualUint8) === JSON.stringify(expected);
});

// Case 25: 反转后检查 BYTES_PER_ELEMENT
test('反转后 BYTES_PER_ELEMENT 保持不变', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const beforeBPE = buf.BYTES_PER_ELEMENT;
  
  buf.reverse();
  
  const afterBPE = buf.BYTES_PER_ELEMENT;
  
  return beforeBPE === 1 && afterBPE === 1;
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
