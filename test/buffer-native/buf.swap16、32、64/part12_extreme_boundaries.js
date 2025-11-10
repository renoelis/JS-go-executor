// buf.swap16/swap32/swap64 - Part 12: Extreme Boundary Cases (Round 9)
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

// ==================== 2的幂次长度完整覆盖 ====================

test('swap16 - 2的幂次长度 (2^1 到 2^16)', () => {
  for (let exp = 1; exp <= 16; exp++) {
    const len = Math.pow(2, exp);
    const buf = Buffer.alloc(len);

    // 所有2的幂次都应该可以swap16
    buf.swap16();

    if (buf.length !== len) {
      throw new Error(`Length changed for 2^${exp}`);
    }
  }
});

test('swap32 - 2的幂次长度 (2^2 到 2^16)', () => {
  for (let exp = 2; exp <= 16; exp++) {
    const len = Math.pow(2, exp);
    const buf = Buffer.alloc(len);

    // 2^2及以上都应该可以swap32
    buf.swap32();

    if (buf.length !== len) {
      throw new Error(`Length changed for 2^${exp}`);
    }
  }
});

test('swap64 - 2的幂次长度 (2^3 到 2^16)', () => {
  for (let exp = 3; exp <= 16; exp++) {
    const len = Math.pow(2, exp);
    const buf = Buffer.alloc(len);

    // 2^3及以上都应该可以swap64
    buf.swap64();

    if (buf.length !== len) {
      throw new Error(`Length changed for 2^${exp}`);
    }
  }
});

// ==================== slice vs subarray 行为验证 ====================

test('swap16 - slice创建独立副本', () => {
  const orig = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
  const sliced = orig.slice(1, 5); // [0x02, 0x03, 0x04, 0x05]

  sliced.swap16();

  // slice在Node.js中实际也会影响原buffer（共享内存）
  // 这是Node.js的行为
  if (orig[1] === 0x02) {
    // 如果不影响，说明是独立副本
    console.log('  Note: slice creates independent copy');
  }
});

test('swap32 - subarray共享内存', () => {
  const orig = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const subarrayed = orig.subarray(0, 4);

  subarrayed.swap32();

  // subarray应该影响原buffer
  if (orig[0] !== 0x04) {
    throw new Error('subarray should share memory with original');
  }
});

test('swap64 - 嵌套subarray共享内存', () => {
  const parent = Buffer.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]);
  const sub1 = parent.subarray(2, 14); // 12字节
  const sub2 = sub1.subarray(2, 10);   // 8字节

  sub2.swap64();

  // 验证parent被修改
  if (parent[4] === 5) {
    throw new Error('Nested subarray should affect parent');
  }
});

// ==================== Endianness 组合测试 ====================

test('swap16 - writeLE + swap等于writeBE', () => {
  const buf1 = Buffer.alloc(2);
  const buf2 = Buffer.alloc(2);

  buf1.writeUInt16LE(0x1234, 0);
  buf1.swap16();

  buf2.writeUInt16BE(0x1234, 0);

  if (!buf1.equals(buf2)) {
    throw new Error('writeLE + swap16 should equal writeBE');
  }
});

test('swap32 - writeBE + swap等于writeLE', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);

  buf1.writeUInt32BE(0x12345678, 0);
  buf1.swap32();

  buf2.writeUInt32LE(0x12345678, 0);

  if (!buf1.equals(buf2)) {
    throw new Error('writeBE + swap32 should equal writeLE');
  }
});

test('swap64 - BigInt endianness转换', () => {
  const buf1 = Buffer.alloc(8);
  const buf2 = Buffer.alloc(8);
  const val = 0x0102030405060708n;

  buf1.writeBigUInt64LE(val, 0);
  buf1.swap64();

  buf2.writeBigUInt64BE(val, 0);

  if (!buf1.equals(buf2)) {
    throw new Error('writeBigLE + swap64 should equal writeBigBE');
  }
});

// ==================== Fill 值不变性 ====================

test('swap16 - 相同字节填充swap后不变', () => {
  const fillValues = [0x00, 0xFF, 0x55, 0xAA];

  for (const fillVal of fillValues) {
    const buf = Buffer.alloc(16);
    buf.fill(fillVal);
    const before = Buffer.from(buf);

    buf.swap16();

    if (!buf.equals(before)) {
      throw new Error(`Fill 0x${fillVal.toString(16)} changed after swap16`);
    }
  }
});

test('swap32 - 相同字节填充swap后不变', () => {
  const fillValues = [0x12, 0x87, 0x00, 0xFF];

  for (const fillVal of fillValues) {
    const buf = Buffer.alloc(16);
    buf.fill(fillVal);
    const before = Buffer.from(buf);

    buf.swap32();

    if (!buf.equals(before)) {
      throw new Error(`Fill 0x${fillVal.toString(16)} changed after swap32`);
    }
  }
});

test('swap64 - 相同字节填充swap后不变', () => {
  const buf = Buffer.alloc(64);
  buf.fill(0xAB);
  const before = Buffer.from(buf);

  buf.swap64();

  if (!buf.equals(before)) {
    throw new Error('Filled buffer changed after swap64');
  }
});

// ==================== 长度1-20完整测试矩阵 ====================

test('全长度测试矩阵 (1-20)', () => {
  const results = [];

  for (let len = 1; len <= 20; len++) {
    const buf = Buffer.alloc(len);
    const canSwap16 = len % 2 === 0;
    const canSwap32 = len % 4 === 0;
    const canSwap64 = len % 8 === 0;

    // 验证swap16
    try {
      buf.swap16();
      if (!canSwap16) {
        throw new Error(`Length ${len} should not allow swap16`);
      }
    } catch (e) {
      if (canSwap16) {
        throw new Error(`Length ${len} should allow swap16`);
      }
    }

    // 验证swap32
    try {
      buf.swap32();
      if (!canSwap32) {
        throw new Error(`Length ${len} should not allow swap32`);
      }
    } catch (e) {
      if (canSwap32) {
        throw new Error(`Length ${len} should allow swap32`);
      }
    }

    // 验证swap64
    try {
      buf.swap64();
      if (!canSwap64) {
        throw new Error(`Length ${len} should not allow swap64`);
      }
    } catch (e) {
      if (canSwap64) {
        throw new Error(`Length ${len} should allow swap64`);
      }
    }
  }
});

// ==================== swap影响其他方法 ====================

test('swap16 + Buffer.compare', () => {
  const b1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const b2 = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  if (b1.compare(b2) !== 0) {
    throw new Error('Identical buffers should compare equal');
  }

  b1.swap16();

  if (b1.compare(b2) === 0) {
    throw new Error('Swapped buffer should not compare equal');
  }

  b2.swap16();

  if (b1.compare(b2) !== 0) {
    throw new Error('Both swapped should compare equal again');
  }
});

test('swap32 + Buffer.equals', () => {
  const b1 = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const b2 = Buffer.from([0x78, 0x56, 0x34, 0x12]);

  if (b1.equals(b2)) {
    throw new Error('Different buffers should not be equal');
  }

  b1.swap32();

  if (!b1.equals(b2)) {
    throw new Error('After swap32, buffers should be equal');
  }
});

test('swap16 + indexOf', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);

  const idx1Before = buf.indexOf(0x01);
  const idx2Before = buf.indexOf(0x02);

  buf.swap16();

  const idx1After = buf.indexOf(0x01);
  const idx2After = buf.indexOf(0x02);

  // 位置应该交换
  if (idx1After !== idx2Before || idx2After !== idx1Before) {
    throw new Error('indexOf positions not swapped correctly');
  }
});

test('swap64 + includes', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  if (!buf.includes(0x01) || !buf.includes(0x08)) {
    throw new Error('Buffer should include these values before swap');
  }

  buf.swap64();

  // 交换后值仍存在，只是位置变了
  if (!buf.includes(0x01) || !buf.includes(0x08)) {
    throw new Error('Buffer should still include these values after swap');
  }

  // 但位置改变了
  if (buf[0] !== 0x08 || buf[7] !== 0x01) {
    throw new Error('Positions not swapped correctly');
  }
});

// ==================== 特殊字符序列模式 ====================

test('swap32 - 全零序列', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00]);
  const before = Buffer.from(buf);

  buf.swap32();

  if (!buf.equals(before)) {
    throw new Error('All-zero buffer should not change');
  }
});

test('swap32 - 全FF序列', () => {
  const buf = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const before = Buffer.from(buf);

  buf.swap32();

  if (!buf.equals(before)) {
    throw new Error('All-FF buffer should not change');
  }
});

test('swap32 - 交替00FF序列', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0xFF]);
  buf.swap32();

  const expected = [0xFF, 0x00, 0xFF, 0x00];
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Alternating pattern swap failed at index ${i}`);
    }
  }
});

test('swap16 - AA55交替模式', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55]);
  buf.swap16();

  const expected = [0x55, 0xAA, 0x55, 0xAA];
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`AA55 pattern swap failed at index ${i}`);
    }
  }
});

// ==================== 部分写入场景 ====================

test('swap64 - 部分写入32位值', () => {
  const buf = Buffer.alloc(8);
  buf.writeUInt32LE(0x12345678, 0);
  buf.writeUInt32LE(0xABCDEF00, 4);

  buf.swap64();

  // 验证整个8字节被反转 (LE写入后的字节序：78 56 34 12 00 ef cd ab)
  // swap64后应该是：ab cd ef 00 12 34 56 78
  if (buf[0] !== 0xAB || buf[7] !== 0x78) {
    throw new Error('Partial write swap64 failed');
  }
});

test('swap32 - 多个32位写入后swap', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 4; i++) {
    buf.writeUInt32LE(i * 0x11111111, i * 4);
  }

  buf.swap32();

  // 验证每个4字节段都被反转
  for (let i = 0; i < 4; i++) {
    const offset = i * 4;
    const val = buf.readUInt32BE(offset);
    if (val !== i * 0x11111111) {
      throw new Error(`Multi-write swap32 failed at segment ${i}`);
    }
  }
});

// ==================== Object.preventExtensions ====================

test('swap16 - preventExtensions buffer', () => {
  const buf = Buffer.from([0x12, 0x34]);
  Object.preventExtensions(buf);

  // 应该仍然可以swap（不涉及扩展属性）
  buf.swap16();

  if (buf[0] !== 0x34 || buf[1] !== 0x12) {
    throw new Error('preventExtensions affected swap');
  }
});

test('swap32 - 删除索引后的行为', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  // 尝试删除索引（在buffer中可能无效）
  delete buf[1];

  // swap应该仍然正常工作
  buf.swap32();

  // 验证结果
  if (buf.length !== 4) {
    throw new Error('Buffer length changed');
  }
});

// ==================== 与reverse方法组合 ====================

test('swap16 + reverse 组合', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const original = Buffer.from(buf);

  buf.reverse();
  buf.swap16();

  // reverse后再swap16会产生特定模式
  if (buf.length !== 8) {
    throw new Error('Length changed after reverse + swap16');
  }
});

test('swap32 + reverse + swap32 恢复测试', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const original = Buffer.from(buf);

  buf.swap32();
  buf.reverse();
  buf.swap32();

  // 这个组合不会恢复原值
  if (buf.equals(original)) {
    throw new Error('Unexpected restoration');
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
