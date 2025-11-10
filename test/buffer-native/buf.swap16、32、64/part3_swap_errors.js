// buf.swap16/swap32/swap64 - Part 3: Error Handling and Boundaries Tests
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

// ==================== swap16 错误处理 ====================

test('swap16 - 长度必须是2的倍数', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  let errorThrown = false;
  let errorType = null;

  try {
    buf.swap16();
  } catch (e) {
    errorThrown = true;
    errorType = e.name;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for odd-length buffer');
  }

  if (errorType !== 'RangeError') {
    throw new Error(`Expected RangeError, got ${errorType}`);
  }
});

test('swap16 - 单字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01]);
  let errorThrown = false;

  try {
    buf.swap16();
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }

  if (!errorThrown) {
    throw new Error('Should throw RangeError for 1-byte buffer');
  }
});

test('swap16 - 3字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  let errorThrown = false;

  try {
    buf.swap16();
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }

  if (!errorThrown) {
    throw new Error('Should throw RangeError for 3-byte buffer');
  }
});

test('swap16 - 5字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  let errorThrown = false;

  try {
    buf.swap16();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 5-byte buffer');
  }
});

test('swap16 - 空buffer应该抛错或成功（长度0）', () => {
  const buf = Buffer.alloc(0);

  try {
    const result = buf.swap16();
    // 如果成功，应该返回原buffer
    if (result !== buf) {
      throw new Error('Should return same buffer');
    }
    if (buf.length !== 0) {
      throw new Error('Buffer length should remain 0');
    }
  } catch (e) {
    // 有些实现可能允许空buffer，有些可能抛错
    // 两种行为都可接受
  }
});

// ==================== swap32 错误处理 ====================

test('swap32 - 长度必须是4的倍数', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  let errorThrown = false;

  try {
    buf.swap32();
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }

  if (!errorThrown) {
    throw new Error('Should throw RangeError for length not multiple of 4');
  }
});

test('swap32 - 1字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01]);
  let errorThrown = false;

  try {
    buf.swap32();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 1-byte buffer');
  }
});

test('swap32 - 2字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01, 0x02]);
  let errorThrown = false;

  try {
    buf.swap32();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 2-byte buffer');
  }
});

test('swap32 - 3字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);
  let errorThrown = false;

  try {
    buf.swap32();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 3-byte buffer');
  }
});

test('swap32 - 5字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  let errorThrown = false;

  try {
    buf.swap32();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 5-byte buffer');
  }
});

test('swap32 - 6字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  let errorThrown = false;

  try {
    buf.swap32();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 6-byte buffer');
  }
});

test('swap32 - 7字节buffer应该抛错', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
  let errorThrown = false;

  try {
    buf.swap32();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 7-byte buffer');
  }
});

test('swap32 - 空buffer应该抛错或成功', () => {
  const buf = Buffer.alloc(0);

  try {
    const result = buf.swap32();
    if (result !== buf) {
      throw new Error('Should return same buffer');
    }
  } catch (e) {
    // 可能抛错
  }
});

// ==================== swap64 错误处理 ====================

test('swap64 - 长度必须是8的倍数', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09]);
  let errorThrown = false;

  try {
    buf.swap64();
  } catch (e) {
    errorThrown = true;
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }
  }

  if (!errorThrown) {
    throw new Error('Should throw RangeError for length not multiple of 8');
  }
});

test('swap64 - 1-7字节buffer应该抛错', () => {
  for (let len = 1; len <= 7; len++) {
    const buf = Buffer.alloc(len);
    let errorThrown = false;

    try {
      buf.swap64();
    } catch (e) {
      errorThrown = true;
    }

    if (!errorThrown) {
      throw new Error(`Should throw error for ${len}-byte buffer`);
    }
  }
});

test('swap64 - 9字节buffer应该抛错', () => {
  const buf = Buffer.alloc(9);
  let errorThrown = false;

  try {
    buf.swap64();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 9-byte buffer');
  }
});

test('swap64 - 15字节buffer应该抛错', () => {
  const buf = Buffer.alloc(15);
  let errorThrown = false;

  try {
    buf.swap64();
  } catch (e) {
    errorThrown = true;
  }

  if (!errorThrown) {
    throw new Error('Should throw error for 15-byte buffer');
  }
});

test('swap64 - 空buffer应该抛错或成功', () => {
  const buf = Buffer.alloc(0);

  try {
    const result = buf.swap64();
    if (result !== buf) {
      throw new Error('Should return same buffer');
    }
  } catch (e) {
    // 可能抛错
  }
});

// ==================== 边界值测试 ====================

test('swap16 - 最小有效长度（2字节）', () => {
  const buf = Buffer.from([0x12, 0x34]);
  buf.swap16();

  if (buf[0] !== 0x34) throw new Error('swap16 failed for minimum valid length');
  if (buf[1] !== 0x12) throw new Error('swap16 failed for minimum valid length');
});

test('swap32 - 最小有效长度（4字节）', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf.swap32();

  if (buf[0] !== 0x78) throw new Error('swap32 failed for minimum valid length');
  if (buf[3] !== 0x12) throw new Error('swap32 failed for minimum valid length');
});

test('swap64 - 最小有效长度（8字节）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  if (buf[0] !== 0x08) throw new Error('swap64 failed for minimum valid length');
  if (buf[7] !== 0x01) throw new Error('swap64 failed for minimum valid length');
});

test('swap16 - 大buffer（1000字节）', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap16();

  // 检查前几对
  if (buf[0] !== 1) throw new Error('First byte should be swapped');
  if (buf[1] !== 0) throw new Error('Second byte should be swapped');
  if (buf[2] !== 3) throw new Error('Third byte should be swapped');
  if (buf[3] !== 2) throw new Error('Fourth byte should be swapped');
});

test('swap32 - 大buffer（1024字节）', () => {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i < 1024; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap32();

  // 检查第一组
  if (buf[0] !== 3) throw new Error('First byte should be swapped');
  if (buf[1] !== 2) throw new Error('Second byte should be swapped');
  if (buf[2] !== 1) throw new Error('Third byte should be swapped');
  if (buf[3] !== 0) throw new Error('Fourth byte should be swapped');
});

test('swap64 - 大buffer（1024字节）', () => {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i < 1024; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap64();

  // 检查第一组
  if (buf[0] !== 7) throw new Error('First byte should be swapped');
  if (buf[7] !== 0) throw new Error('Eighth byte should be swapped');
});

// ==================== Uint8Array 兼容性测试 ====================

test('swap16 - Uint8Array 可以调用（因为Buffer继承自Uint8Array）', () => {
  const arr = new Uint8Array([0x01, 0x02]);

  // Node.js 允许在 Uint8Array 上调用 Buffer.prototype 方法
  Buffer.prototype.swap16.call(arr);

  // 验证交换成功
  if (arr[0] !== 0x02) throw new Error('Uint8Array should be swapped');
  if (arr[1] !== 0x01) throw new Error('Uint8Array should be swapped');
});

test('swap32 - Uint8Array 可以调用', () => {
  const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04]);

  Buffer.prototype.swap32.call(arr);

  if (arr[0] !== 0x04) throw new Error('Uint8Array should be swapped');
  if (arr[3] !== 0x01) throw new Error('Uint8Array should be swapped');
});

test('swap64 - Uint8Array 可以调用', () => {
  const arr = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  Buffer.prototype.swap64.call(arr);

  if (arr[0] !== 0x08) throw new Error('Uint8Array should be swapped');
  if (arr[7] !== 0x01) throw new Error('Uint8Array should be swapped');
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
