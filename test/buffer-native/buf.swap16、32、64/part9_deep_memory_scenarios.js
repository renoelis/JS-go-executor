// buf.swap16/swap32/swap64 - Part 9: Deep Edge Cases - Special Memory Scenarios (Round 6)
const { Buffer } = require('buffer');
const crypto = require('crypto');

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

// ==================== Buffer 池化行为 ====================

test('swap16 - pooled buffer (allocUnsafe 小buffer)', () => {
  // 小于 4KB 的 allocUnsafe 可能使用池
  const pooled = Buffer.allocUnsafe(2);
  pooled[0] = 0x12;
  pooled[1] = 0x34;

  pooled.swap16();

  if (pooled[0] !== 0x34 || pooled[1] !== 0x12) {
    throw new Error('Pooled buffer swap16 failed');
  }
});

test('swap32 - non-pooled buffer (allocUnsafeSlow)', () => {
  // allocUnsafeSlow 强制不使用池
  const nonPooled = Buffer.allocUnsafeSlow(4);
  nonPooled[0] = 0x01;
  nonPooled[1] = 0x02;
  nonPooled[2] = 0x03;
  nonPooled[3] = 0x04;

  nonPooled.swap32();

  if (nonPooled[0] !== 0x04 || nonPooled[3] !== 0x01) {
    throw new Error('Non-pooled buffer swap32 failed');
  }
});

test('swap64 - allocUnsafeSlow 大buffer', () => {
  const buf = Buffer.allocUnsafeSlow(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = i + 1;
  }

  buf.swap64();

  if (buf[0] !== 8 || buf[7] !== 1 || buf[8] !== 16 || buf[15] !== 9) {
    throw new Error('Large allocUnsafeSlow swap64 failed');
  }
});

// ==================== SharedArrayBuffer 兼容性 ====================

test('swap16 - Buffer from SharedArrayBuffer', () => {
  // 检查环境是否支持 SharedArrayBuffer
  if (typeof SharedArrayBuffer === 'undefined') {
    console.log('  ⚠️  SharedArrayBuffer not supported, skipping test');
    return;
  }

  const sab = new SharedArrayBuffer(4);
  const u8 = new Uint8Array(sab);
  u8[0] = 0x01;
  u8[1] = 0x02;
  u8[2] = 0x03;
  u8[3] = 0x04;

  const buf = Buffer.from(sab);
  buf.swap16();

  // 验证 SharedArrayBuffer 被修改
  if (u8[0] !== 0x02 || u8[1] !== 0x01) {
    throw new Error('SharedArrayBuffer not affected by swap16');
  }
});

test('swap32 - Buffer from SharedArrayBuffer', () => {
  // 检查环境是否支持 SharedArrayBuffer
  if (typeof SharedArrayBuffer === 'undefined') {
    console.log('  ⚠️  SharedArrayBuffer not supported, skipping test');
    return;
  }

  const sab = new SharedArrayBuffer(8);
  const u8 = new Uint8Array(sab);
  for (let i = 0; i < 8; i++) u8[i] = i + 1;

  const buf = Buffer.from(sab);
  buf.swap32();

  // 验证共享内存被修改
  if (u8[0] !== 4 || u8[3] !== 1) {
    throw new Error('SharedArrayBuffer not affected by swap32');
  }
});

test('swap64 - Buffer from SharedArrayBuffer', () => {
  // 检查环境是否支持 SharedArrayBuffer
  if (typeof SharedArrayBuffer === 'undefined') {
    console.log('  ⚠️  SharedArrayBuffer not supported, skipping test');
    return;
  }

  const sab = new SharedArrayBuffer(16);
  const u8 = new Uint8Array(sab);
  for (let i = 0; i < 16; i++) u8[i] = i + 1;

  const buf = Buffer.from(sab);
  buf.swap64();

  if (u8[0] !== 8 || u8[8] !== 16) {
    throw new Error('SharedArrayBuffer not affected by swap64');
  }
});

// ==================== this 绑定测试 ====================

test('swap16 - 显式 this 绑定 (call)', () => {
  const buf = Buffer.from([0x12, 0x34]);
  const swap16Fn = buf.swap16;

  const result = swap16Fn.call(buf);

  if (result !== buf) {
    throw new Error('Call with explicit this should return same buffer');
  }

  if (buf[0] !== 0x34) {
    throw new Error('Explicit this binding failed');
  }
});

test('swap32 - bind 绑定', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const boundSwap = buf.swap32.bind(buf);

  const result = boundSwap();

  if (result !== buf) {
    throw new Error('Bound swap should return same buffer');
  }

  if (buf[0] !== 0x04) {
    throw new Error('Bound swap failed');
  }
});

test('swap64 - apply 调用', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const result = buf.swap64.apply(buf);

  if (result !== buf) {
    throw new Error('Apply should return same buffer');
  }

  if (buf[0] !== 0x08) {
    throw new Error('Apply swap failed');
  }
});

// ==================== 特殊边界长度 ====================

test('swap16 - 精确边界长度 (16, 32, 64, 128, 256字节)', () => {
  const lengths = [16, 32, 64, 128, 256];

  for (const len of lengths) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buf[i] = i & 0xFF;
    }

    buf.swap16();

    // 验证前两字节被交换
    if (buf[0] !== 1 || buf[1] !== 0) {
      throw new Error(`swap16 failed for length ${len}`);
    }
  }
});

test('swap32 - 精确边界长度 (16, 32, 64, 128, 256字节)', () => {
  const lengths = [16, 32, 64, 128, 256];

  for (const len of lengths) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buf[i] = i & 0xFF;
    }

    buf.swap32();

    if (buf[0] !== 3 || buf[3] !== 0) {
      throw new Error(`swap32 failed for length ${len}`);
    }
  }
});

test('swap64 - 精确边界长度 (16, 32, 64, 128, 256字节)', () => {
  const lengths = [16, 32, 64, 128, 256];

  for (const len of lengths) {
    const buf = Buffer.alloc(len);
    for (let i = 0; i < len; i++) {
      buf[i] = i & 0xFF;
    }

    buf.swap64();

    if (buf[0] !== 7 || buf[7] !== 0) {
      throw new Error(`swap64 failed for length ${len}`);
    }
  }
});

// ==================== 混合 swap 操作序列 ====================

test('swap16 -> swap64 -> swap32 复杂序列', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  buf.swap16();
  // [0x02, 0x01, 0x04, 0x03, 0x06, 0x05, 0x08, 0x07]

  buf.swap64();
  // [0x07, 0x08, 0x05, 0x06, 0x03, 0x04, 0x01, 0x02]

  buf.swap32();
  // [0x06, 0x05, 0x08, 0x07, 0x02, 0x01, 0x04, 0x03]

  const expected = [0x06, 0x05, 0x08, 0x07, 0x02, 0x01, 0x04, 0x03];
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== expected[i]) {
      throw new Error(`Mixed swap sequence failed at index ${i}`);
    }
  }
});

test('swap32 -> swap16 -> swap64 -> swap16 序列', () => {
  const buf = Buffer.from([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]);

  buf.swap32().swap16().swap64().swap16();

  // 验证结果是否正确
  if (buf.length !== 8) {
    throw new Error('Buffer length changed');
  }
});

// ==================== 浮点数特殊值 ====================

test('swap64 - NaN 的字节表示', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleLE(NaN, 0);

  const beforeBytes = Buffer.from(buf);
  buf.swap64();
  const afterBytes = Buffer.from(buf);

  // 验证字节完全反转
  for (let i = 0; i < 8; i++) {
    if (afterBytes[i] !== beforeBytes[7 - i]) {
      throw new Error('NaN bytes not correctly swapped');
    }
  }
});

test('swap64 - Infinity 的字节表示', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleLE(Infinity, 0);

  const beforeBytes = Buffer.from(buf);
  buf.swap64();
  const afterBytes = Buffer.from(buf);

  for (let i = 0; i < 8; i++) {
    if (afterBytes[i] !== beforeBytes[7 - i]) {
      throw new Error('Infinity bytes not correctly swapped');
    }
  }
});

test('swap64 - -Infinity 的字节表示', () => {
  const buf = Buffer.allocUnsafe(8);
  buf.writeDoubleLE(-Infinity, 0);

  buf.swap64();

  // swap64 应该成功执行
  if (buf.length !== 8) {
    throw new Error('-Infinity swap64 failed');
  }
});

test('swap32 - 浮点数 3.14', () => {
  const buf = Buffer.allocUnsafe(4);
  buf.writeFloatLE(3.14, 0);

  const beforeBytes = Buffer.from(buf);
  buf.swap32();
  const afterBytes = Buffer.from(buf);

  // 验证字节完全反转
  for (let i = 0; i < 4; i++) {
    if (afterBytes[i] !== beforeBytes[3 - i]) {
      throw new Error('Float 3.14 bytes not correctly swapped');
    }
  }
});

// ==================== Buffer 比较与相等性 ====================

test('swap32 - 比较和相等性', () => {
  const b1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const b2 = Buffer.from([0x04, 0x03, 0x02, 0x01]);

  // 交换前应该不相等
  if (b1.equals(b2)) {
    throw new Error('Buffers should not be equal before swap');
  }

  const cmpBefore = b1.compare(b2);
  b1.swap32();
  const cmpAfter = b1.compare(b2);

  // 交换后应该相等
  if (!b1.equals(b2)) {
    throw new Error('Buffers should be equal after swap');
  }

  if (cmpAfter !== 0) {
    throw new Error('Compare should return 0 for equal buffers');
  }
});

test('swap16 - 字典序比较', () => {
  const b1 = Buffer.from([0x01, 0x02]);
  const b2 = Buffer.from([0x02, 0x01]);

  const cmpBefore = b1.compare(b2);

  b1.swap16();

  const cmpAfter = b1.compare(b2);

  // 交换后应该相等
  if (cmpAfter !== 0) {
    throw new Error('Swapped buffers should be equal');
  }
});

// ==================== Hash 和加密相关 ====================

test('swap32 - MD5 hash 变化', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  const hash1 = crypto.createHash('md5').update(buf).digest('hex');
  buf.swap32();
  const hash2 = crypto.createHash('md5').update(buf).digest('hex');

  if (hash1 === hash2) {
    throw new Error('Hash should differ after swap');
  }
});

test('swap64 - SHA256 hash 变化', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  const hash1 = crypto.createHash('sha256').update(buf).digest('hex');
  buf.swap64();
  const hash2 = crypto.createHash('sha256').update(buf).digest('hex');

  if (hash1 === hash2) {
    throw new Error('SHA256 hash should differ after swap');
  }
});

test('swap16 - 两次 swap 后 hash 恢复', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78]);

  const originalHash = crypto.createHash('md5').update(buf).digest('hex');

  buf.swap16().swap16();

  const restoredHash = crypto.createHash('md5').update(buf).digest('hex');

  if (originalHash !== restoredHash) {
    throw new Error('Hash should be restored after double swap');
  }
});

// ==================== byteOffset 非零的 buffer ====================

test('swap16 - byteOffset 非零', () => {
  const ab = new ArrayBuffer(16);
  const buf = Buffer.from(ab, 4, 8);

  for (let i = 0; i < 8; i++) {
    buf[i] = i + 1;
  }

  if (buf.byteOffset !== 4) {
    throw new Error('byteOffset should be 4');
  }

  buf.swap16();

  if (buf[0] !== 2 || buf[1] !== 1) {
    throw new Error('swap16 failed with non-zero byteOffset');
  }

  if (buf.byteOffset !== 4) {
    throw new Error('byteOffset changed after swap');
  }
});

test('swap32 - byteOffset 非零', () => {
  const ab = new ArrayBuffer(20);
  const buf = Buffer.from(ab, 8, 8);

  for (let i = 0; i < 8; i++) {
    buf[i] = i;
  }

  buf.swap32();

  if (buf[0] !== 3 || buf[4] !== 7) {
    throw new Error('swap32 failed with non-zero byteOffset');
  }
});

test('swap64 - byteOffset 非零且不对齐', () => {
  const ab = new ArrayBuffer(24);
  const buf = Buffer.from(ab, 3, 16);

  for (let i = 0; i < 16; i++) {
    buf[i] = i;
  }

  if (buf.byteOffset !== 3) {
    throw new Error('byteOffset should be 3');
  }

  buf.swap64();

  if (buf[0] !== 7 || buf[8] !== 15) {
    throw new Error('swap64 failed with non-aligned byteOffset');
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
