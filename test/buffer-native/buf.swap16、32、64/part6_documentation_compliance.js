// buf.swap16/swap32/swap64 - Part 6: Documentation Compliance Tests (Round 2)
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    fn();
    tests.push({ name, status: '✅' });
    console.log(`✅ ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// ==================== 文档规定的行为 ====================

// 根据 Node.js 文档：
// - buf.swap16() 将 buffer 解释为无符号 16位整数数组，并交换字节序
// - buf.swap32() 将 buffer 解释为无符号 32位整数数组，并交换字节序
// - buf.swap64() 将 buffer 解释为 64位数字数组，并交换字节序
// - 如果 buffer 长度不是相应大小的倍数，抛出 RangeError

test('swap16 - 官方文档示例', () => {
  const buf1 = Buffer.from([0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8]);
  buf1.swap16();

  const expected = Buffer.from([0x2, 0x1, 0x4, 0x3, 0x6, 0x5, 0x8, 0x7]);

  for (let i = 0; i < buf1.length; i++) {
    if (buf1[i] !== expected[i]) {
      throw new Error(`Mismatch at index ${i}: expected ${expected[i]}, got ${buf1[i]}`);
    }
  }
});

test('swap32 - 官方文档示例', () => {
  const buf2 = Buffer.from([0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8]);
  buf2.swap32();

  const expected = Buffer.from([0x4, 0x3, 0x2, 0x1, 0x8, 0x7, 0x6, 0x5]);

  for (let i = 0; i < buf2.length; i++) {
    if (buf2[i] !== expected[i]) {
      throw new Error(`Mismatch at index ${i}: expected ${expected[i]}, got ${buf2[i]}`);
    }
  }
});

test('swap64 - 官方文档示例', () => {
  const buf3 = Buffer.from([0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8]);
  buf3.swap64();

  const expected = Buffer.from([0x8, 0x7, 0x6, 0x5, 0x4, 0x3, 0x2, 0x1]);

  for (let i = 0; i < buf3.length; i++) {
    if (buf3[i] !== expected[i]) {
      throw new Error(`Mismatch at index ${i}: expected ${expected[i]}, got ${buf3[i]}`);
    }
  }
});

// ==================== 返回值行为 ====================

test('swap16 - 返回值是 buffer 引用（允许链式）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.swap16();

  if (result !== buf) {
    throw new Error('swap16 must return the buffer reference for chaining');
  }
});

test('swap32 - 返回值是 buffer 引用（允许链式）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.swap32();

  if (result !== buf) {
    throw new Error('swap32 must return the buffer reference');
  }
});

test('swap64 - 返回值是 buffer 引用（允许链式）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const result = buf.swap64();

  if (result !== buf) {
    throw new Error('swap64 must return the buffer reference');
  }
});

// ==================== 长度校验（文档明确说明） ====================

test('swap16 - 不合法长度必须抛 RangeError', () => {
  const invalidLengths = [1, 3, 5, 7, 9, 11];

  for (const len of invalidLengths) {
    const buf = Buffer.alloc(len);
    let errorThrown = false;
    let errorName = null;

    try {
      buf.swap16();
    } catch (e) {
      errorThrown = true;
      errorName = e.name;
    }

    if (!errorThrown) {
      throw new Error(`swap16 should throw RangeError for length ${len}`);
    }

    if (errorName !== 'RangeError') {
      throw new Error(`Expected RangeError for length ${len}, got ${errorName}`);
    }
  }
});

test('swap32 - 不合法长度必须抛 RangeError', () => {
  const invalidLengths = [1, 2, 3, 5, 6, 7, 9, 10, 11];

  for (const len of invalidLengths) {
    const buf = Buffer.alloc(len);
    let errorThrown = false;
    let errorName = null;

    try {
      buf.swap32();
    } catch (e) {
      errorThrown = true;
      errorName = e.name;
    }

    if (!errorThrown) {
      throw new Error(`swap32 should throw RangeError for length ${len}`);
    }

    if (errorName !== 'RangeError') {
      throw new Error(`Expected RangeError for length ${len}, got ${errorName}`);
    }
  }
});

test('swap64 - 不合法长度必须抛 RangeError', () => {
  const invalidLengths = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];

  for (const len of invalidLengths) {
    const buf = Buffer.alloc(len);
    let errorThrown = false;
    let errorName = null;

    try {
      buf.swap64();
    } catch (e) {
      errorThrown = true;
      errorName = e.name;
    }

    if (!errorThrown) {
      throw new Error(`swap64 should throw RangeError for length ${len}`);
    }

    if (errorName !== 'RangeError') {
      throw new Error(`Expected RangeError for length ${len}, got ${errorName}`);
    }
  }
});

// ==================== 字节序相关（官方文档用途） ====================

test('swap16 - 用于字节序转换（16位整数）', () => {
  const buf = Buffer.allocUnsafe(2);

  // 写入小端序 16位整数 0x1234
  buf.writeUInt16LE(0x1234, 0);

  // 应该是 [0x34, 0x12] (小端)
  if (buf[0] !== 0x34 || buf[1] !== 0x12) {
    throw new Error('writeUInt16LE behavior unexpected');
  }

  // swap16 交换字节
  buf.swap16();

  // 现在应该是 [0x12, 0x34] (大端)
  if (buf[0] !== 0x12 || buf[1] !== 0x34) {
    throw new Error('swap16 did not correctly swap bytes');
  }
});

test('swap32 - 用于字节序转换（32位整数）', () => {
  const buf = Buffer.allocUnsafe(4);

  // 写入小端序 32位整数 0x12345678
  buf.writeUInt32LE(0x12345678, 0);

  // 应该是 [0x78, 0x56, 0x34, 0x12] (小端)
  if (buf[0] !== 0x78) {
    throw new Error('writeUInt32LE behavior unexpected');
  }

  buf.swap32();

  // 现在应该是 [0x12, 0x34, 0x56, 0x78] (大端)
  if (buf[0] !== 0x12 || buf[3] !== 0x78) {
    throw new Error('swap32 did not correctly reverse bytes');
  }
});

test('swap64 - 用于字节序转换（64位整数）', () => {
  const buf = Buffer.allocUnsafe(8);

  // 写入小端序 64位整数
  buf.writeBigUInt64LE(0x0102030405060708n, 0);

  // 应该是 [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01] (小端)
  if (buf[0] !== 0x08) {
    throw new Error('writeBigUInt64LE behavior unexpected');
  }

  buf.swap64();

  // 现在应该是 [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08] (大端)
  if (buf[0] !== 0x01 || buf[7] !== 0x08) {
    throw new Error('swap64 did not correctly reverse bytes');
  }
});

// ==================== Buffer 子类行为 ====================

test('swap16 - 对 Buffer.from() 创建的buffer有效', () => {
  const buf = Buffer.from([0xAA, 0xBB, 0xCC, 0xDD]);
  buf.swap16();

  if (buf[0] !== 0xBB || buf[2] !== 0xDD) {
    throw new Error('swap16 failed on Buffer.from()');
  }
});

test('swap32 - 对 Buffer.alloc() 创建的buffer有效', () => {
  const buf = Buffer.alloc(8);
  buf[0] = 0x01;
  buf[1] = 0x02;
  buf[2] = 0x03;
  buf[3] = 0x04;

  buf.swap32();

  if (buf[0] !== 0x04 || buf[3] !== 0x01) {
    throw new Error('swap32 failed on Buffer.alloc()');
  }
});

test('swap64 - 对 Buffer.allocUnsafe() 创建的buffer有效', () => {
  const buf = Buffer.allocUnsafe(8);
  for (let i = 0; i < 8; i++) {
    buf[i] = i + 1;
  }

  buf.swap64();

  if (buf[0] !== 8 || buf[7] !== 1) {
    throw new Error('swap64 failed on Buffer.allocUnsafe()');
  }
});

// ==================== 性能考虑（文档提到的优化场景） ====================

test('swap16 - 适用于大量数据的字节序转换', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);

  for (let i = 0; i < size; i++) {
    buf[i] = i & 0xFF;
  }

  const start = Date.now();
  buf.swap16();
  const duration = Date.now() - start;

  // 验证正确性
  if (buf[0] !== 1) throw new Error('Large buffer swap16 failed');

  // 性能检查：10000字节应该在合理时间内完成（<100ms）
  if (duration > 100) {
    throw new Error(`swap16 took too long: ${duration}ms`);
  }
});

test('swap32 - 适用于大量数据的字节序转换', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);

  for (let i = 0; i < size; i++) {
    buf[i] = i & 0xFF;
  }

  const start = Date.now();
  buf.swap32();
  const duration = Date.now() - start;

  if (buf[0] !== 3) throw new Error('Large buffer swap32 failed');

  if (duration > 100) {
    throw new Error(`swap32 took too long: ${duration}ms`);
  }
});

test('swap64 - 适用于大量数据的字节序转换', () => {
  const size = 10000;
  const buf = Buffer.alloc(size);

  for (let i = 0; i < size; i++) {
    buf[i] = i & 0xFF;
  }

  const start = Date.now();
  buf.swap64();
  const duration = Date.now() - start;

  if (buf[0] !== 7) throw new Error('Large buffer swap64 failed');

  if (duration > 100) {
    throw new Error(`swap64 took too long: ${duration}ms`);
  }
});

// ==================== 总结 ====================

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
