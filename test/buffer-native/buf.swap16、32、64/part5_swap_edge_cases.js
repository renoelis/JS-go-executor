// buf.swap16/swap32/swap64 - Part 5: Edge Cases and Extreme Scenarios
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

// ==================== 特殊值测试 ====================

test('swap16 - 全零buffer', () => {
  const buf = Buffer.alloc(8);
  buf.swap16();

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0x00) {
      throw new Error(`All bytes should remain 0x00, got 0x${buf[i].toString(16)} at index ${i}`);
    }
  }
});

test('swap16 - 全0xFF buffer', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  buf.swap16();

  for (let i = 0; i < 8; i++) {
    if (buf[i] !== 0xFF) {
      throw new Error(`All bytes should remain 0xFF, got 0x${buf[i].toString(16)} at index ${i}`);
    }
  }
});

test('swap32 - 全零buffer', () => {
  const buf = Buffer.alloc(16);
  buf.swap32();

  for (let i = 0; i < 16; i++) {
    if (buf[i] !== 0x00) {
      throw new Error(`All bytes should remain 0x00, got 0x${buf[i].toString(16)}`);
    }
  }
});

test('swap32 - 全0xFF buffer', () => {
  const buf = Buffer.alloc(16);
  buf.fill(0xFF);
  buf.swap32();

  for (let i = 0; i < 16; i++) {
    if (buf[i] !== 0xFF) {
      throw new Error(`All bytes should remain 0xFF`);
    }
  }
});

test('swap64 - 全零buffer', () => {
  const buf = Buffer.alloc(24);
  buf.swap64();

  for (let i = 0; i < 24; i++) {
    if (buf[i] !== 0x00) {
      throw new Error('All bytes should remain 0x00');
    }
  }
});

test('swap64 - 全0xFF buffer', () => {
  const buf = Buffer.alloc(24);
  buf.fill(0xFF);
  buf.swap64();

  for (let i = 0; i < 24; i++) {
    if (buf[i] !== 0xFF) {
      throw new Error('All bytes should remain 0xFF');
    }
  }
});

// ==================== 对称值测试 ====================

test('swap16 - 对称值 [0xAA, 0xAA]', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xBB, 0xBB]);
  buf.swap16();

  if (buf[0] !== 0xAA) throw new Error('Symmetric bytes should remain unchanged');
  if (buf[1] !== 0xAA) throw new Error('Symmetric bytes should remain unchanged');
  if (buf[2] !== 0xBB) throw new Error('Symmetric bytes should remain unchanged');
  if (buf[3] !== 0xBB) throw new Error('Symmetric bytes should remain unchanged');
});

test('swap32 - 对称值 [0x01, 0x02, 0x02, 0x01]', () => {
  const buf = Buffer.from([0x01, 0x02, 0x02, 0x01]);
  buf.swap32();

  if (buf[0] !== 0x01) throw new Error('Palindrome should remain palindrome after swap');
  if (buf[1] !== 0x02) throw new Error('Palindrome should remain palindrome after swap');
  if (buf[2] !== 0x02) throw new Error('Palindrome should remain palindrome after swap');
  if (buf[3] !== 0x01) throw new Error('Palindrome should remain palindrome after swap');
});

test('swap64 - 对称值', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x04, 0x03, 0x02, 0x01]);
  buf.swap64();

  const expected = [0x01, 0x02, 0x03, 0x04, 0x04, 0x03, 0x02, 0x01];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Palindrome should remain unchanged at index ${i}`);
    }
  }
});

// ==================== 极端长度测试 ====================

test('swap16 - 最小有效长度 2', () => {
  const buf = Buffer.from([0x01, 0x02]);
  buf.swap16();

  if (buf[0] !== 0x02) throw new Error('Failed for length 2');
  if (buf[1] !== 0x01) throw new Error('Failed for length 2');
});

test('swap16 - 较大buffer（10000字节）', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap16();

  // 验证首尾
  if (buf[0] !== 1) throw new Error('First byte not swapped correctly');
  if (buf[1] !== 0) throw new Error('Second byte not swapped correctly');
  if (buf[9998] !== (9999 & 0xFF)) throw new Error('Last pair not swapped correctly');
  if (buf[9999] !== (9998 & 0xFF)) throw new Error('Last pair not swapped correctly');
});

test('swap32 - 最小有效长度 4', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  if (buf[0] !== 0x04) throw new Error('Failed for length 4');
  if (buf[3] !== 0x01) throw new Error('Failed for length 4');
});

test('swap32 - 较大buffer（10000字节）', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap32();

  if (buf[0] !== 3) throw new Error('First group not swapped correctly');
  if (buf[3] !== 0) throw new Error('First group not swapped correctly');
});

test('swap64 - 最小有效长度 8', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  if (buf[0] !== 0x08) throw new Error('Failed for length 8');
  if (buf[7] !== 0x01) throw new Error('Failed for length 8');
});

test('swap64 - 较大buffer（10000字节）', () => {
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap64();

  if (buf[0] !== 7) throw new Error('First group not swapped correctly');
  if (buf[7] !== 0) throw new Error('First group not swapped correctly');
});

// ==================== 位模式测试 ====================

test('swap16 - 交替位模式 0xAA55', () => {
  const buf = Buffer.from([0xAA, 0x55, 0x55, 0xAA]);
  buf.swap16();

  if (buf[0] !== 0x55) throw new Error('Pattern swap failed');
  if (buf[1] !== 0xAA) throw new Error('Pattern swap failed');
  if (buf[2] !== 0xAA) throw new Error('Pattern swap failed');
  if (buf[3] !== 0x55) throw new Error('Pattern swap failed');
});

test('swap32 - 递增序列', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x10, 0x11, 0x12, 0x13]);
  buf.swap32();

  const expected = [0x03, 0x02, 0x01, 0x00, 0x13, 0x12, 0x11, 0x10];
  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Expected 0x${expected[i].toString(16)} at ${i}, got 0x${buf[i].toString(16)}`);
    }
  }
});

test('swap64 - 递增序列', () => {
  const buf = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77]);
  buf.swap64();

  const expected = [0x77, 0x66, 0x55, 0x44, 0x33, 0x22, 0x11, 0x00];
  for (let i = 0; i < expected.length; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Expected 0x${expected[i].toString(16)} at ${i}, got 0x${buf[i].toString(16)}`);
    }
  }
});

// ==================== 混合操作测试 ====================

test('swap16 + write 操作组合', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16BE(0x1234, 0);
  buf.writeUInt16BE(0x5678, 2);

  buf.swap16();

  // 小端系统：writeUInt16BE(0x1234) 写入 [0x12, 0x34]
  // swap16 后变为 [0x34, 0x12]
  const val1 = buf.readUInt16LE(0);
  const val2 = buf.readUInt16LE(2);

  // 验证值被正确交换
  if (buf[0] !== 0x34) throw new Error('First byte should be 0x34');
  if (buf[1] !== 0x12) throw new Error('Second byte should be 0x12');
});

test('swap32 + write 操作组合', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0x12345678, 0);
  buf.writeUInt32BE(0x9ABCDEF0, 4);

  buf.swap32();

  // 验证字节被反转
  if (buf[0] !== 0x78) throw new Error('First byte should be 0x78');
  if (buf[3] !== 0x12) throw new Error('Fourth byte should be 0x12');
});

test('swap64 + write 操作组合', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0102030405060708n, 0);

  buf.swap64();

  if (buf[0] !== 0x08) throw new Error('First byte should be 0x08');
  if (buf[7] !== 0x01) throw new Error('Last byte should be 0x01');
});

// ==================== 多次swap的幂等性 ====================

test('swap16 - 偶数次swap恢复原值', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const copy = Buffer.from(original);

  // swap 4次
  original.swap16().swap16().swap16().swap16();

  for (let i = 0; i < original.length; i++) {
    if (original[i] !== copy[i]) {
      throw new Error(`4 swaps should restore original at index ${i}`);
    }
  }
});

test('swap32 - 偶数次swap恢复原值', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const copy = Buffer.from(original);

  original.swap32().swap32().swap32().swap32();

  for (let i = 0; i < original.length; i++) {
    if (original[i] !== copy[i]) {
      throw new Error('4 swaps should restore original');
    }
  }
});

test('swap64 - 偶数次swap恢复原值', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const copy = Buffer.from(original);

  original.swap64().swap64().swap64().swap64();

  for (let i = 0; i < original.length; i++) {
    if (original[i] !== copy[i]) {
      throw new Error('4 swaps should restore original');
    }
  }
});

// ==================== 字节序转换实际应用测试 ====================

test('swap16 - 大小端转换场景', () => {
  const buf = Buffer.alloc(2);
  // 写入大端序 16位整数
  buf.writeUInt16BE(0x1234, 0);

  // 使用 swap16 转换字节序
  buf.swap16();

  // 现在应该能用小端序读取到相同的值（在正确的字节序下）
  if (buf[0] !== 0x34) throw new Error('Byte order conversion failed');
  if (buf[1] !== 0x12) throw new Error('Byte order conversion failed');
});

test('swap32 - 网络字节序转换', () => {
  const buf = Buffer.alloc(4);
  // 模拟网络字节序（大端）
  buf[0] = 0x12;
  buf[1] = 0x34;
  buf[2] = 0x56;
  buf[3] = 0x78;

  buf.swap32();

  // 转换为小端序
  if (buf[0] !== 0x78) throw new Error('Network byte order conversion failed');
  if (buf[3] !== 0x12) throw new Error('Network byte order conversion failed');
});

test('swap64 - 64位整数字节序转换', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(0x0102030405060708n, 0);

  const beforeBytes = Array.from(buf);
  buf.swap64();
  const afterBytes = Array.from(buf);

  // 验证完全反转
  for (let i = 0; i < 8; i++) {
    if (afterBytes[i] !== beforeBytes[7 - i]) {
      throw new Error('64-bit byte order conversion failed');
    }
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
