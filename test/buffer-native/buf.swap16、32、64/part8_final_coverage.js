// buf.swap16/swap32/swap64 - Part 8: Combination Coverage & Final Edge Cases (Round 4 & 5)
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

// ==================== 第4轮：测试组合缺口 ====================

test('swap16 - 所有合法长度（2, 4, 6, 8, 10）', () => {
  for (const len of [2, 4, 6, 8, 10]) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buf[i] = i;
    }

    buf.swap16();

    // 验证每对都被交换
    for (let i = 0; i < len; i += 2) {
      if (buf[i] !== i + 1 || buf[i + 1] !== i) {
        throw new Error(`Failed for length ${len} at position ${i}`);
      }
    }
  }
});

test('swap32 - 所有合法长度（4, 8, 12, 16, 20）', () => {
  for (const len of [4, 8, 12, 16, 20]) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buf[i] = i;
    }

    buf.swap32();

    // 验证每4字节组被反转
    for (let i = 0; i < len; i += 4) {
      if (buf[i] !== i + 3 || buf[i + 3] !== i) {
        throw new Error(`Failed for length ${len} at position ${i}`);
      }
    }
  }
});

test('swap64 - 所有合法长度（8, 16, 24, 32）', () => {
  for (const len of [8, 16, 24, 32]) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buf[i] = i;
    }

    buf.swap64();

    // 验证每8字节组被反转
    for (let i = 0; i < len; i += 8) {
      if (buf[i] !== i + 7 || buf[i + 7] !== i) {
        throw new Error(`Failed for length ${len} at position ${i}`);
      }
    }
  }
});

// ==================== offset/length 组合 ====================

test('swap16 - subarray 各种偏移和长度', () => {
  const original = Buffer.alloc(20);
  for (let i = 0; i < 20; i++) {
    original[i] = i;
  }

  // 测试多种偏移
  const offsets = [0, 1, 2, 4, 6];
  const lengths = [2, 4, 6, 8];

  for (const offset of offsets) {
    for (const length of lengths) {
      if (offset + length > 20) continue;

      const buf = Buffer.from(original);
      const view = buf.subarray(offset, offset + length);

      try {
        view.swap16();

        // 验证被修改
        for (let i = 0; i < length; i += 2) {
          if (view[i] !== offset + i + 1) {
            throw new Error(`Failed for offset=${offset}, length=${length}`);
          }
        }
      } catch (e) {
        if (length % 2 !== 0) {
          // 预期抛错
          if (e.name !== 'RangeError') {
            throw new Error(`Expected RangeError for odd length, got ${e.name}`);
          }
        } else {
          throw e;
        }
      }
    }
  }
});

test('swap32 - subarray 各种偏移和长度', () => {
  const original = Buffer.alloc(24);
  for (let i = 0; i < 24; i++) {
    original[i] = i;
  }

  const combinations = [
    { offset: 0, length: 4 },
    { offset: 0, length: 8 },
    { offset: 4, length: 8 },
    { offset: 8, length: 12 },
  ];

  for (const { offset, length } of combinations) {
    const buf = Buffer.from(original);
    const view = buf.subarray(offset, offset + length);

    view.swap32();

    // 验证每4字节组被反转
    for (let i = 0; i < length; i += 4) {
      if (view[i] !== offset + i + 3) {
        throw new Error(`Failed for offset=${offset}, length=${length} at ${i}`);
      }
    }
  }
});

// ==================== 第5轮：极端与历史兼容 ====================

test('swap16 - 最大实际应用长度（64KB）', () => {
  const buf = Buffer.alloc(65536);
  for (let i = 0; i < 65536; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap16();

  // 验证首尾
  if (buf[0] !== 1 || buf[65534] !== (65535 & 0xFF)) {
    throw new Error('64KB swap16 failed');
  }
});

test('swap32 - 常见网络包大小（1500字节）', () => {
  const buf = Buffer.alloc(1500);
  for (let i = 0; i < 1500; i++) {
    buf[i] = i & 0xFF;
  }

  // 1500 % 4 = 0，合法
  buf.swap32();

  // 验证首尾正确交换
  // buf[0] 应该是原来的 buf[3]，即 3
  // buf[1496] 应该是原来的 buf[1499]，即 1499 & 0xFF = 219
  if (buf[0] !== 3 || buf[1496] !== (1499 & 0xFF)) {
    throw new Error('1500-byte swap32 failed');
  }
});

test('swap64 - 文件块大小（4096字节）', () => {
  const buf = Buffer.alloc(4096);
  for (let i = 0; i < 4096; i++) {
    buf[i] = i & 0xFF;
  }

  buf.swap64();

  // 验证首尾正确交换
  // buf[0] 应该是原来的 buf[7]，即 7
  // buf[4088] 应该是原来的 buf[4095]，即 4095 & 0xFF = 255
  if (buf[0] !== 7 || buf[4088] !== (4095 & 0xFF)) {
    throw new Error('4096-byte swap64 failed');
  }
});

// ==================== 特殊数值模式 ====================

test('swap16 - 渐变模式', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }

  buf.swap16();

  // 验证模式
  for (let i = 0; i < 256; i += 2) {
    if (buf[i] !== i + 1 || buf[i + 1] !== i) {
      throw new Error(`Gradient pattern failed at ${i}`);
    }
  }
});

test('swap32 - 重复块模式', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = Math.floor(i / 4) * 0x11;
  }

  // [0x00, 0x00, 0x00, 0x00, 0x11, 0x11, 0x11, 0x11, ...]
  buf.swap32();

  // 每4字节组内反转（但都相同）
  if (buf[0] !== 0x00 || buf[7] !== 0x11) {
    throw new Error('Repeated block pattern failed');
  }
});

test('swap64 - 镜像模式', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 8; i++) {
    buf[i] = i;
    buf[8 + i] = 7 - i;
  }

  // [0, 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 0]
  buf.swap64();

  // 第一组: [7, 6, 5, 4, 3, 2, 1, 0]
  // 第二组: [0, 1, 2, 3, 4, 5, 6, 7]

  if (buf[0] !== 7 || buf[8] !== 0) {
    throw new Error('Mirror pattern failed');
  }
});

// ==================== 与 Buffer 属性交互 ====================

test('swap16 - buffer.length 不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const originalLength = buf.length;

  buf.swap16();

  if (buf.length !== originalLength) {
    throw new Error('swap16 should not change buffer length');
  }
});

test('swap32 - buffer.byteLength 不变', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const originalByteLength = buf.byteLength;

  buf.swap32();

  if (buf.byteLength !== originalByteLength) {
    throw new Error('swap32 should not change buffer byteLength');
  }
});

test('swap64 - buffer.byteOffset 不变', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab, 4, 8);
  const originalOffset = buf.byteOffset;

  buf.swap64();

  if (buf.byteOffset !== originalOffset) {
    throw new Error('swap64 should not change buffer byteOffset');
  }
});

// ==================== 错误消息检查 ====================

test('swap16 - RangeError 包含有用信息', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);

  try {
    buf.swap16();
    throw new Error('Should throw RangeError');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }

    // 错误消息应该包含有用信息
    if (!e.message) {
      throw new Error('RangeError should have a message');
    }
  }
});

test('swap32 - RangeError 包含有用信息', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);

  try {
    buf.swap32();
    throw new Error('Should throw RangeError');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }

    if (!e.message) {
      throw new Error('RangeError should have a message');
    }
  }
});

test('swap64 - RangeError 包含有用信息', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03]);

  try {
    buf.swap64();
    throw new Error('Should throw RangeError');
  } catch (e) {
    if (e.name !== 'RangeError') {
      throw new Error(`Expected RangeError, got ${e.name}`);
    }

    if (!e.message) {
      throw new Error('RangeError should have a message');
    }
  }
});

// ==================== 实际应用场景 ====================

test('swap16 - 音频样本字节序转换', () => {
  // 模拟 16位音频样本
  const samples = new Int16Array([100, -100, 200, -200]);
  const buf = Buffer.from(samples.buffer);

  buf.swap16();

  // 验证字节被交换（但不验证具体值，因为依赖字节序）
  if (buf.length !== 8) {
    throw new Error('Audio sample buffer length changed');
  }
});

test('swap32 - IP地址字节序', () => {
  const buf = Buffer.alloc(4);

  // 模拟 IP: 192.168.1.1
  buf[0] = 192;
  buf[1] = 168;
  buf[2] = 1;
  buf[3] = 1;

  buf.swap32();

  // 字节序被反转
  if (buf[0] !== 1 || buf[3] !== 192) {
    throw new Error('IP address byte order swap failed');
  }
});

test('swap64 - 时间戳字节序转换', () => {
  const buf = Buffer.alloc(8);

  // 写入当前时间戳（毫秒）
  const timestamp = BigInt(Date.now());
  buf.writeBigUInt64LE(timestamp, 0);

  const before = Array.from(buf);

  buf.swap64();

  const after = Array.from(buf);

  // 验证完全反转
  for (let i = 0; i < 8; i++) {
    if (after[i] !== before[7 - i]) {
      throw new Error('Timestamp byte order swap failed');
    }
  }
});

// ==================== 兼容性边界 ====================

test('swap16 - Buffer vs Uint8Array 行为一致', () => {
  const arr = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
  const buf = Buffer.from(arr);

  Buffer.prototype.swap16.call(arr);
  buf.swap16();

  // 两者应该产生相同结果
  for (let i = 0; i < 4; i++) {
    if (arr[i] !== buf[i]) {
      throw new Error('Buffer and Uint8Array swap16 behavior differs');
    }
  }
});

test('swap32 - 跨平台字节序一致性', () => {
  const buf1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const buf2 = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  buf1.swap32();
  buf2.swap32();

  // 相同输入应产生相同输出
  for (let i = 0; i < 4; i++) {
    if (buf1[i] !== buf2[i]) {
      throw new Error('swap32 not deterministic');
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
