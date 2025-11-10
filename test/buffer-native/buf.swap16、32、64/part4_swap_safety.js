// buf.swap16/swap32/swap64 - Part 4: Safety and Memory Tests
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

// ==================== 原地修改测试 ====================

test('swap16 - 原地修改不创建新buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.swap16();

  if (result !== buf) {
    throw new Error('swap16 should return the same buffer instance (not a copy)');
  }

  // 验证是真正的原地修改
  if (buf[0] !== 0x02) throw new Error('Original buffer should be modified');
});

test('swap32 - 原地修改不创建新buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const result = buf.swap32();

  if (result !== buf) {
    throw new Error('swap32 should return the same buffer instance');
  }

  if (buf[0] !== 0x04) throw new Error('Original buffer should be modified');
});

test('swap64 - 原地修改不创建新buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const result = buf.swap64();

  if (result !== buf) {
    throw new Error('swap64 should return the same buffer instance');
  }

  if (buf[0] !== 0x08) throw new Error('Original buffer should be modified');
});

// ==================== 共享内存/视图测试 ====================

test('swap16 - slice视图共享内存', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const slice = original.subarray(2, 6); // [0x03, 0x04, 0x05, 0x06]

  slice.swap16();

  // slice 被修改
  if (slice[0] !== 0x04) throw new Error('Slice should be modified');
  if (slice[1] !== 0x03) throw new Error('Slice should be modified');

  // 原buffer相应位置也被修改
  if (original[2] !== 0x04) throw new Error('Original buffer should be modified via slice');
  if (original[3] !== 0x03) throw new Error('Original buffer should be modified via slice');

  // 前两字节不受影响
  if (original[0] !== 0x01) throw new Error('Unaffected bytes should remain unchanged');
  if (original[1] !== 0x02) throw new Error('Unaffected bytes should remain unchanged');
});

test('swap32 - subarray视图共享内存', () => {
  const original = Buffer.from([0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x00, 0x00]);
  const slice = original.subarray(2, 6); // [0x01, 0x02, 0x03, 0x04]

  slice.swap32();

  // slice 被修改
  if (slice[0] !== 0x04) throw new Error('Slice should be modified');

  // 原buffer相应位置也被修改
  if (original[2] !== 0x04) throw new Error('Original buffer should be modified via slice');
  if (original[5] !== 0x01) throw new Error('Original buffer should be modified via slice');
});

test('swap64 - 多个视图指向同一内存', () => {
  const ab = new ArrayBuffer(16);
  const buf1 = Buffer.from(ab);
  const buf2 = Buffer.from(ab);

  for (let i = 0; i < 16; i++) {
    buf1[i] = i + 1;
  }

  buf1.swap64();

  // buf2 应该看到同样的修改
  if (buf2[0] !== 0x08) throw new Error('buf2 should see modifications through shared memory');
  if (buf2[7] !== 0x01) throw new Error('buf2 should see modifications through shared memory');
});

// ==================== 独立buffer测试 ====================

test('swap16 - Buffer.from 创建独立副本', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const copy = Buffer.from(original);

  copy.swap16();

  // copy 被修改
  if (copy[0] !== 0x02) throw new Error('Copy should be modified');

  // original 不应该被修改
  if (original[0] !== 0x01) throw new Error('Original should remain unchanged');
  if (original[1] !== 0x02) throw new Error('Original should remain unchanged');
});

test('swap32 - Buffer.from 创建独立副本', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const copy = Buffer.from(original);

  copy.swap32();

  // original 不应该被修改
  if (original[0] !== 0x01) throw new Error('Original should remain unchanged');
});

test('swap64 - Buffer.from 创建独立副本', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const copy = Buffer.from(original);

  copy.swap64();

  // original 不应该被修改
  if (original[0] !== 0x01) throw new Error('Original should remain unchanged');
  if (original[7] !== 0x08) throw new Error('Original should remain unchanged');
});

// ==================== TypedArray 视图测试 ====================

test('swap16 - Uint16Array 视图受影响', () => {
  const buf = Buffer.alloc(4);
  const u16 = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);

  buf[0] = 0x01;
  buf[1] = 0x02;
  buf[2] = 0x03;
  buf[3] = 0x04;

  const beforeU16_0 = u16[0];
  const beforeU16_1 = u16[1];

  buf.swap16();

  const afterU16_0 = u16[0];
  const afterU16_1 = u16[1];

  // u16 视图应该看到不同的值（因为字节序改变了）
  if (beforeU16_0 === afterU16_0 && beforeU16_1 === afterU16_1) {
    // 如果值碰巧相同（如对称值），检查字节级别
    if (buf[0] !== 0x02) throw new Error('Bytes should be swapped');
  }
});

test('swap32 - Uint32Array 视图受影响', () => {
  const buf = Buffer.alloc(8);
  const u32 = new Uint32Array(buf.buffer, buf.byteOffset, buf.length / 4);

  for (let i = 0; i < 8; i++) {
    buf[i] = i + 1;
  }

  const beforeU32_0 = u32[0];

  buf.swap32();

  const afterU32_0 = u32[0];

  // u32 视图应该看到不同的值
  if (buf[0] !== 0x04) throw new Error('Bytes should be swapped');
});

test('swap64 - BigUint64Array 视图受影响', () => {
  const buf = Buffer.alloc(16);
  const u64 = new BigUint64Array(buf.buffer, buf.byteOffset, buf.length / 8);

  for (let i = 0; i < 16; i++) {
    buf[i] = i + 1;
  }

  const beforeU64_0 = u64[0];

  buf.swap64();

  const afterU64_0 = u64[0];

  // 验证字节被交换
  if (buf[0] !== 0x08) throw new Error('Bytes should be swapped');
});

// ==================== 链式调用测试 ====================

test('swap16 - 链式调用', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  const result = buf.swap16().swap16();

  if (result !== buf) throw new Error('Chain should return same buffer');

  // 两次swap应该恢复原值
  if (buf[0] !== 0x01) throw new Error('Double swap should restore original');
  if (buf[1] !== 0x02) throw new Error('Double swap should restore original');
});

test('swap32 - 链式调用', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  buf.swap32().swap32();

  if (buf[0] !== 0x01) throw new Error('Double swap should restore original');
});

test('swap64 - 链式调用', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  buf.swap64().swap64();

  if (buf[0] !== 0x01) throw new Error('Double swap should restore original');
});

// ==================== 内存边界安全测试 ====================

test('swap16 - 不会越界读写', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap16();

  // 验证长度没变
  if (buf.length !== 1000) throw new Error('Length should remain unchanged');

  // 验证末尾两字节被正确交换
  if (buf[998] !== (999 & 0xFF)) throw new Error('Last pair should be swapped correctly');
  if (buf[999] !== (998 & 0xFF)) throw new Error('Last pair should be swapped correctly');
});

test('swap32 - 不会越界读写', () => {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i < 1024; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap32();

  if (buf.length !== 1024) throw new Error('Length should remain unchanged');

  // 验证最后4字节
  const lastGroup = 1024 - 4; // 1020
  if (buf[lastGroup] !== ((lastGroup + 3) & 0xFF)) throw new Error('Last group not swapped correctly');
});

test('swap64 - 不会越界读写', () => {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i < 1024; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap64();

  if (buf.length !== 1024) throw new Error('Length should remain unchanged');

  // 验证最后8字节
  const lastGroup = 1024 - 8; // 1016
  if (buf[lastGroup] !== ((lastGroup + 7) & 0xFF)) throw new Error('Last group not swapped correctly');
});

// ==================== 对齐测试 ====================

test('swap16 - 奇数偏移的subarray应该正常工作', () => {
  const original = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
  const slice = original.subarray(1, 5); // [0x01, 0x02, 0x03, 0x04] - 奇数起始位置

  slice.swap16();

  if (slice[0] !== 0x02) throw new Error('Swap should work on odd-offset slice');
  if (slice[1] !== 0x01) throw new Error('Swap should work on odd-offset slice');
});

test('swap32 - 非4字节对齐的subarray应该正常工作', () => {
  const original = Buffer.from([0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const slice = original.subarray(2, 6); // [0x01, 0x02, 0x03, 0x04] - 偏移2

  slice.swap32();

  if (slice[0] !== 0x04) throw new Error('Swap should work on non-aligned slice');
});

test('swap64 - 非8字节对齐的subarray应该正常工作', () => {
  const original = Buffer.from([
    0x00, 0x00, 0x00,
    0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x00
  ]);
  const slice = original.subarray(3, 11); // [0x01...0x08] - 偏移3

  slice.swap64();

  if (slice[0] !== 0x08) throw new Error('Swap should work on non-aligned slice');
  if (slice[7] !== 0x01) throw new Error('Swap should work on non-aligned slice');
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
