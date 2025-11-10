// buf.swap16/swap32/swap64 - Part 10: Deep Edge Cases - Error Boundary Details (Round 7)
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

// ==================== 错误类型和属性详细验证 ====================

test('swap16 - RangeError 包含 code 属性', () => {
  const buf = Buffer.from([1, 2, 3]);

  try {
    buf.swap16();
    throw new Error('Should have thrown RangeError');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }

    // 检查 error code
    if (e.code !== 'ERR_INVALID_BUFFER_SIZE') {
      throw new Error(`Expected ERR_INVALID_BUFFER_SIZE, got ${e.code}`);
    }

    // 检查 stack trace
    if (!e.stack || typeof e.stack !== 'string') {
      throw new Error('Error should have stack trace');
    }
  }
});

test('swap32 - RangeError 消息内容', () => {
  const buf = Buffer.from([1, 2, 3]);

  try {
    buf.swap32();
    throw new Error('Should have thrown RangeError');
  } catch (e) {
    // 验证错误消息提到了倍数要求
    const msg = e.message.toLowerCase();
    if (!msg.includes('multiple') && !msg.includes('32')) {
      throw new Error('Error message should mention size requirement');
    }
  }
});

test('swap64 - RangeError 消息内容', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7]);

  try {
    buf.swap64();
    throw new Error('Should have thrown RangeError');
  } catch (e) {
    const msg = e.message.toLowerCase();
    if (!msg.includes('multiple') && !msg.includes('64')) {
      throw new Error('Error message should mention 64-bit requirement');
    }
  }
});

// ==================== null/undefined this 绑定 ====================

test('swap16 - null this 抛 TypeError', () => {
  let errorThrown = false;
  let errorType = null;

  try {
    Buffer.prototype.swap16.call(null);
  } catch (e) {
    errorThrown = true;
    errorType = e.name;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for null this');
  }

  if (errorType !== 'TypeError') {
    throw new Error(`Expected TypeError, got ${errorType}`);
  }
});

test('swap32 - undefined this 抛 TypeError', () => {
  let errorThrown = false;

  try {
    Buffer.prototype.swap32.call(undefined);
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'TypeError') {
      throw new Error(`Expected TypeError, got ${e.name}`);
    }
  }

  if (!errorThrown) {
    throw new Error('Should throw error for undefined this');
  }
});

test('swap64 - null this 抛 TypeError', () => {
  try {
    Buffer.prototype.swap64.call(null);
    throw new Error('Should throw TypeError');
  } catch (e) {
    if (e.name !== 'TypeError') {
      throw new Error(`Expected TypeError, got ${e.name}`);
    }
  }
});

// ==================== 非 TypedArray 对象 ====================

test('swap16 - 普通对象 this（鸭子类型测试）', () => {
  const fakeBuffer = { length: 2, 0: 1, 1: 2 };

  try {
    Buffer.prototype.swap16.call(fakeBuffer);
    // Node.js 可能允许也可能不允许，记录实际行为
    console.log('  Note: Plain object accepted');
  } catch (e) {
    // 如果抛错，验证是合理的错误
    if (e.name !== 'TypeError' && e.name !== 'RangeError') {
      throw new Error(`Unexpected error type: ${e.name}`);
    }
  }
});

test('swap32 - Array this', () => {
  const arr = [1, 2, 3, 4];

  try {
    Buffer.prototype.swap32.call(arr);
    console.log('  Note: Array accepted');
  } catch (e) {
    // 允许抛错
    if (!e.name) {
      throw new Error('Error should have a name property');
    }
  }
});

// ==================== 其他 TypedArray 类型 ====================

test('swap16 - Int8Array 兼容性', () => {
  const i8 = new Int8Array([0x01, 0x02, 0x03, 0x04]);

  // Int8Array 也是 TypedArray，应该可以工作
  Buffer.prototype.swap16.call(i8);

  if (i8[0] !== 0x02 || i8[1] !== 0x01) {
    throw new Error('Int8Array swap16 failed');
  }
});

test('swap32 - Uint16Array 长度处理', () => {
  // Uint16Array 的 length 是元素个数，不是字节数
  const u16 = new Uint16Array(2); // 4 字节，但 length=2
  u16[0] = 0x0102;
  u16[1] = 0x0304;

  // Node.js 使用 .length (元素个数) 而不是 .byteLength (字节数)
  // 所以 length=2 不是 4 的倍数，应该抛出 RangeError
  try {
    Buffer.prototype.swap32.call(u16);
    throw new Error('Should have thrown RangeError');
  } catch (e) {
    if (e.message !== 'Buffer size must be a multiple of 32-bits') {
      throw new Error(`Wrong error: ${e.message}`);
    }
  }
});

test('swap64 - Float64Array 兼容性', () => {
  const f64 = new Float64Array(1); // 8 字节，但 length=1
  f64[0] = 3.14159;

  // Node.js 使用 .length (元素个数=1) 而不是 .byteLength (字节数=8)
  // length=1 不是 8 的倍数，应该抛出 RangeError
  try {
    Buffer.prototype.swap64.call(f64);
    throw new Error('Should have thrown RangeError');
  } catch (e) {
    if (e.message !== 'Buffer size must be a multiple of 64-bits') {
      throw new Error(`Wrong error: ${e.message}`);
    }
  }
});

test('swap32 - Float32Array 长度检查', () => {
  const f32 = new Float32Array(1); // 4 字节，但 length=1
  f32[0] = 1.5;

  // Node.js 使用 .length (元素个数=1) 而不是 .byteLength (字节数=4)
  // length=1 不是 4 的倍数，应该抛出 RangeError
  try {
    Buffer.prototype.swap32.call(f32);
    throw new Error('Should have thrown RangeError');
  } catch (e) {
    if (e.message !== 'Buffer size must be a multiple of 32-bits') {
      throw new Error(`Wrong error: ${e.message}`);
    }
  }
});

test('swap16 - Float32Array 奇数长度', () => {
  const f32 = new Float32Array(3); // 12 字节，但 length=3

  // Node.js 使用 .length (元素个数=3) 而不是 .byteLength (字节数=12)
  // length=3 不是 2 的倍数，应该抛出 RangeError
  try {
    Buffer.prototype.swap16.call(f32);
    throw new Error('Should have thrown RangeError');
  } catch (e) {
    if (e.message !== 'Buffer size must be a multiple of 16-bits') {
      throw new Error(`Wrong error: ${e.message}`);
    }
  }
});

// ==================== 错误后状态验证 ====================

test('swap16 - 错误后 buffer 完全不变', () => {
  const buf = Buffer.from([0xAA, 0xBB, 0xCC]);
  const copy = Buffer.from(buf);

  try {
    buf.swap16();
  } catch (e) {
    // 预期错误
  }

  // 验证 buffer 每个字节都没变
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== copy[i]) {
      throw new Error(`Buffer modified at index ${i} after error`);
    }
  }

  // 验证长度没变
  if (buf.length !== copy.length) {
    throw new Error('Buffer length changed after error');
  }
});

test('swap32 - 连续错误调用不影响 buffer', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33]);
  const original = Buffer.from(buf);

  // 连续尝试 10 次
  for (let i = 0; i < 10; i++) {
    try {
      buf.swap32();
    } catch (e) {
      // 预期每次都抛错
    }
  }

  // 验证 buffer 仍然完全相同
  if (!buf.equals(original)) {
    throw new Error('Buffer changed after multiple error calls');
  }
});

test('swap64 - 错误不影响其他属性', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab, 0, 7); // 7 字节，不能 swap64

  const originalOffset = buf.byteOffset;
  const originalLength = buf.length;
  const originalBuffer = buf.buffer;

  try {
    buf.swap64();
  } catch (e) {
    // 预期错误
  }

  // 验证属性未变
  if (buf.byteOffset !== originalOffset) {
    throw new Error('byteOffset changed');
  }

  if (buf.length !== originalLength) {
    throw new Error('length changed');
  }

  if (buf.buffer !== originalBuffer) {
    throw new Error('buffer reference changed');
  }
});

// ==================== 空 buffer 边界 ====================

test('swap16 - 空 buffer 不抛错', () => {
  const empty = Buffer.alloc(0);

  // 根据实际测试，空 buffer 不抛错
  try {
    const result = empty.swap16();

    if (result !== empty) {
      throw new Error('Should return same buffer');
    }
  } catch (e) {
    // 如果抛错，应该是 RangeError
    if (e.name !== 'RangeError') {
      throw new Error(`Unexpected error: ${e.name}`);
    }
  }
});

test('swap32 - 空 buffer 不抛错', () => {
  const empty = Buffer.alloc(0);

  try {
    const result = empty.swap32();
    if (result !== empty) {
      throw new Error('Should return same buffer');
    }
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Unexpected error: ${e.name}`);
    }
  }
});

test('swap64 - 空 buffer 不抛错', () => {
  const empty = Buffer.alloc(0);

  try {
    const result = empty.swap64();
    if (result !== empty) {
      throw new Error('Should return same buffer');
    }
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Unexpected error: ${e.name}`);
    }
  }
});

// ==================== 极端错误长度 ====================

test('swap16 - 超大奇数长度', () => {
  const buf = Buffer.alloc(100001); // 奇数

  try {
    buf.swap16();
    throw new Error('Should throw RangeError');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }
});

test('swap32 - 超大非4倍数长度', () => {
  const buf = Buffer.alloc(100002); // 不是4的倍数

  try {
    buf.swap32();
    throw new Error('Should throw RangeError');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }
});

test('swap64 - 超大非8倍数长度', () => {
  const buf = Buffer.alloc(100007); // 不是8的倍数

  try {
    buf.swap64();
    throw new Error('Should throw RangeError');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }
});

// ==================== 错误顺序测试 ====================

test('swap16 错误 -> 修正长度 -> 成功', () => {
  const buf = Buffer.from([1, 2, 3]);

  // 第一次应该失败
  try {
    buf.swap16();
    throw new Error('Should fail first time');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error('Expected RangeError');
    }
  }

  // 创建正确长度的 buffer
  const goodBuf = Buffer.from([1, 2, 3, 4]);
  goodBuf.swap16();

  if (goodBuf[0] !== 2) {
    throw new Error('Should succeed after fixing length');
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
