// buf.swap16/swap32/swap64 - Part 7: Real Behavior Edge Cases (Round 3)
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

// ==================== 与其他 Buffer 方法结合 ====================

test('swap16 + slice 组合', () => {
  const original = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const slice = original.slice(1, 5); // [0x02, 0x03, 0x04, 0x05]

  slice.swap16();

  // slice 被修改
  if (slice[0] !== 0x03 || slice[1] !== 0x02) {
    throw new Error('Slice swap16 failed');
  }

  // 原 buffer 对应位置被修改
  if (original[1] !== 0x03 || original[2] !== 0x02) {
    throw new Error('Original buffer should reflect slice changes');
  }

  // 未被 slice 的部分不变
  if (original[0] !== 0x01 || original[5] !== 0x06) {
    throw new Error('Non-sliced parts should remain unchanged');
  }
});

test('swap32 + concat 后再 swap', () => {
  const buf1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const buf2 = Buffer.from([0x05, 0x06, 0x07, 0x08]);

  const concatenated = Buffer.concat([buf1, buf2]);
  concatenated.swap32();

  // 验证两个 4 字节组都被交换
  if (concatenated[0] !== 0x04 || concatenated[4] !== 0x08) {
    throw new Error('Concatenated buffer swap32 failed');
  }

  // 原 buffer 不受影响（concat 创建新 buffer）
  if (buf1[0] !== 0x01) {
    throw new Error('Original buf1 should not be modified');
  }
});

test('swap64 + copy 后的独立性', () => {
  const src = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const dest = Buffer.alloc(8);

  src.copy(dest);
  dest.swap64();

  // dest 被修改
  if (dest[0] !== 0x08) throw new Error('dest should be swapped');

  // src 不变
  if (src[0] !== 0x01) throw new Error('src should remain unchanged');
});

// ==================== 写入后立即 swap ====================

test('swap16 - writeUInt16LE 后立即 swap', () => {
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(0xAABB, 0);
  buf.writeUInt16LE(0xCCDD, 2);

  // [0xBB, 0xAA, 0xDD, 0xCC]
  buf.swap16();

  // [0xAA, 0xBB, 0xCC, 0xDD]
  if (buf[0] !== 0xAA || buf[1] !== 0xBB) {
    throw new Error('swap16 after writeUInt16LE failed');
  }
});

test('swap32 - writeInt32BE 后立即 swap', () => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(0x12345678, 0);

  // [0x12, 0x34, 0x56, 0x78]
  buf.swap32();

  // [0x78, 0x56, 0x34, 0x12]
  if (buf[0] !== 0x78 || buf[3] !== 0x12) {
    throw new Error('swap32 after writeInt32BE failed');
  }
});

test('swap64 - writeBigInt64LE 后立即 swap', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(0x0102030405060708n, 0);

  // 小端: [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]
  buf.swap64();

  // [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]
  if (buf[0] !== 0x01 || buf[7] !== 0x08) {
    throw new Error('swap64 after writeBigInt64LE failed');
  }
});

// ==================== swap 后读取 ====================

test('swap16 后 readUInt16LE', () => {
  const buf = Buffer.from([0x12, 0x34]);
  buf.swap16();

  // 现在是 [0x34, 0x12]
  const value = buf.readUInt16LE(0);

  // 小端读取: 0x1234
  if (value !== 0x1234) {
    throw new Error(`Expected 0x1234, got 0x${value.toString(16)}`);
  }
});

test('swap32 后 readUInt32BE', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  buf.swap32();

  // 现在是 [0x78, 0x56, 0x34, 0x12]
  const value = buf.readUInt32BE(0);

  // 大端读取: 0x78563412
  if (value !== 0x78563412) {
    throw new Error(`Expected 0x78563412, got 0x${value.toString(16)}`);
  }
});

test('swap64 后 readBigUInt64LE', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  // 现在是 [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]
  const value = buf.readBigUInt64LE(0);

  // 小端读取: 0x0102030405060708
  if (value !== 0x0102030405060708n) {
    throw new Error(`Expected 0x0102030405060708, got 0x${value.toString(16)}`);
  }
});

// ==================== 与 toString/toJSON 结合 ====================

test('swap16 + toString(hex)', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap16();

  const hex = buf.toString('hex');

  if (hex !== '02010403') {
    throw new Error(`Expected '02010403', got '${hex}'`);
  }
});

test('swap32 + toString(base64)', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.swap32();

  // [0x04, 0x03, 0x02, 0x01]
  const b64 = buf.toString('base64');

  // 'BAMCAg==' 或类似
  if (!b64 || b64.length === 0) {
    throw new Error('toString(base64) should return valid string');
  }
});

test('swap64 + toJSON', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  buf.swap64();

  const json = buf.toJSON();

  if (!json.data || json.data.length !== 8) {
    throw new Error('toJSON should return valid object');
  }

  if (json.data[0] !== 0x08) {
    throw new Error('toJSON should reflect swapped bytes');
  }
});

// ==================== 连续不同 swap 操作 ====================

test('swap16 -> swap32（长度匹配时）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  buf.swap16();
  // [0x02, 0x01, 0x04, 0x03]

  buf.swap32();
  // [0x03, 0x04, 0x01, 0x02]

  if (buf[0] !== 0x03 || buf[3] !== 0x02) {
    throw new Error('swap16 -> swap32 combination failed');
  }
});

test('swap32 -> swap16（长度匹配时）', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44]);

  buf.swap32();
  // [0x44, 0x33, 0x22, 0x11]

  buf.swap16();
  // [0x33, 0x44, 0x11, 0x22]

  if (buf[0] !== 0x33 || buf[3] !== 0x22) {
    throw new Error('swap32 -> swap16 combination failed');
  }
});

test('swap64 -> swap32 -> swap16（长度8）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  buf.swap64();
  // [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]

  buf.swap32();
  // [0x05, 0x06, 0x07, 0x08, 0x01, 0x02, 0x03, 0x04]

  buf.swap16();
  // [0x06, 0x05, 0x08, 0x07, 0x02, 0x01, 0x04, 0x03]

  if (buf[0] !== 0x06 || buf[7] !== 0x03) {
    throw new Error('Triple swap combination failed');
  }
});

// ==================== 空 buffer 特殊处理 ====================

test('swap16 - 空 buffer（长度0）', () => {
  const buf = Buffer.alloc(0);

  try {
    const result = buf.swap16();

    // 如果成功，应该返回原 buffer
    if (result !== buf) {
      throw new Error('swap16 on empty buffer should return same buffer');
    }
  } catch (e) {
    // 如果抛错，确保是 RangeError
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError or success, got ${e.name}`);
    }
  }
});

test('swap32 - 空 buffer（长度0）', () => {
  const buf = Buffer.alloc(0);

  try {
    const result = buf.swap32();

    if (result !== buf) {
      throw new Error('swap32 on empty buffer should return same buffer');
    }
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError or success, got ${e.name}`);
    }
  }
});

test('swap64 - 空 buffer（长度0）', () => {
  const buf = Buffer.alloc(0);

  try {
    const result = buf.swap64();

    if (result !== buf) {
      throw new Error('swap64 on empty buffer should return same buffer');
    }
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError or success, got ${e.name}`);
    }
  }
});

// ==================== TypedArray 视图的实际互操作 ====================

test('swap16 - Int16Array 视图观察', () => {
  const buf = Buffer.alloc(4);
  const i16 = new Int16Array(buf.buffer, buf.byteOffset, 2);

  buf[0] = 0x01;
  buf[1] = 0x00;
  buf[2] = 0x02;
  buf[3] = 0x00;

  // i16[0] = 0x0001, i16[1] = 0x0002 (小端)

  buf.swap16();

  // 字节变为 [0x00, 0x01, 0x00, 0x02]
  // i16 视图的值会改变

  if (buf[0] !== 0x00 || buf[1] !== 0x01) {
    throw new Error('Bytes not swapped correctly');
  }
});

test('swap32 - Float32Array 视图观察', () => {
  const buf = Buffer.alloc(4);
  const f32 = new Float32Array(buf.buffer, buf.byteOffset, 1);

  buf.writeFloatLE(3.14, 0);

  const beforeFloat = f32[0];

  buf.swap32();

  const afterFloat = f32[0];

  // 字节序改变后，float 值会完全不同
  if (beforeFloat === afterFloat) {
    // 可能碰巧相等，但字节应该被交换
    if (buf[0] === buf[3]) {
      throw new Error('Bytes should be swapped');
    }
  }
});

// ==================== 压力场景 ====================

test('swap16 - 连续1000次 swap', () => {
  const buf = Buffer.from([0x12, 0x34]);

  for (let i = 0; i < 1000; i++) {
    buf.swap16();
  }

  // 偶数次应该恢复原值
  if (buf[0] !== 0x12 || buf[1] !== 0x34) {
    throw new Error('1000 swaps should restore original');
  }
});

test('swap32 - 连续1001次 swap（奇数次）', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const copy = Buffer.from(buf);

  for (let i = 0; i < 1001; i++) {
    buf.swap32();
  }

  // 奇数次应该等于一次 swap
  copy.swap32();

  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== copy[i]) {
      throw new Error('Odd number of swaps should equal one swap');
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
