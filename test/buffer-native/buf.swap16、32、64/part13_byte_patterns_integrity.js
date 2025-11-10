// buf.swap16/swap32/swap64 - Part 13: Byte Patterns & Data Integrity (Round 10)
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

// ==================== 字节模式完整性 ====================

test('swap16 - 递增序列完整性', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }

  buf.swap16();

  // 验证每对字节交换
  for (let i = 0; i < 256; i += 2) {
    if (buf[i] !== i + 1 || buf[i + 1] !== i) {
      throw new Error(`Swap failed at pair ${i}`);
    }
  }
});

test('swap32 - 递减序列完整性', () => {
  const buf = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = 255 - i;
  }

  buf.swap32();

  // 验证每4字节反转
  for (let i = 0; i < 256; i += 4) {
    if (buf[i] !== 255 - i - 3) {
      throw new Error(`Swap failed at offset ${i}`);
    }
  }
});

test('swap64 - 斐波那契序列模式', () => {
  const buf = Buffer.alloc(64);
  let a = 0, b = 1;

  for (let i = 0; i < 64; i++) {
    buf[i] = (a + b) % 256;
    const temp = b;
    b = (a + b) % 256;
    a = temp;
  }

  const copy = Buffer.from(buf);
  buf.swap64();

  // 验证每8字节段被完全反转
  for (let i = 0; i < 64; i += 8) {
    for (let j = 0; j < 8; j++) {
      if (buf[i + j] !== copy[i + 7 - j]) {
        throw new Error(`Fibonacci pattern swap failed at ${i + j}`);
      }
    }
  }
});

// ==================== 数据完整性校验 ====================

test('swap16 - CRC校验码变化', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC]);

  const crc1 = crypto.createHash('sha1').update(buf).digest();
  buf.swap16();
  const crc2 = crypto.createHash('sha1').update(buf).digest();

  if (crc1.equals(crc2)) {
    throw new Error('CRC should change after swap');
  }

  buf.swap16(); // swap back
  const crc3 = crypto.createHash('sha1').update(buf).digest();

  if (!crc1.equals(crc3)) {
    throw new Error('CRC should restore after double swap');
  }
});

test('swap32 - 数据和校验', () => {
  const buf = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) {
    buf[i] = i * 17; // 0, 17, 34, ...
  }

  let sumBefore = 0;
  for (let i = 0; i < 16; i++) {
    sumBefore += buf[i];
  }

  buf.swap32();

  let sumAfter = 0;
  for (let i = 0; i < 16; i++) {
    sumAfter += buf[i];
  }

  if (sumBefore !== sumAfter) {
    throw new Error('Sum should not change after swap');
  }
});

test('swap64 - 字节频率统计不变', () => {
  const buf = Buffer.alloc(64);
  for (let i = 0; i < 64; i++) {
    buf[i] = i % 16; // 重复模式
  }

  const freqBefore = new Array(256).fill(0);
  for (let i = 0; i < 64; i++) {
    freqBefore[buf[i]]++;
  }

  buf.swap64();

  const freqAfter = new Array(256).fill(0);
  for (let i = 0; i < 64; i++) {
    freqAfter[buf[i]]++;
  }

  for (let i = 0; i < 256; i++) {
    if (freqBefore[i] !== freqAfter[i]) {
      throw new Error('Byte frequency changed after swap');
    }
  }
});

// ==================== 位级别验证 ====================

test('swap16 - 位模式验证', () => {
  const buf = Buffer.from([0b10101010, 0b01010101]); // 0xAA, 0x55
  buf.swap16();

  if (buf[0] !== 0b01010101 || buf[1] !== 0b10101010) {
    throw new Error('Bit pattern not swapped correctly');
  }
});

test('swap32 - 单比特位置追踪', () => {
  const buf = Buffer.from([0x80, 0x00, 0x00, 0x01]); // 最高位和最低位设置
  buf.swap32();

  if (buf[0] !== 0x01 || buf[3] !== 0x80) {
    throw new Error('Single bits not swapped correctly');
  }
});

test('swap64 - 全比特集合', () => {
  const buf = Buffer.from([
    0xFF, 0x00, 0xFF, 0x00,
    0xAA, 0x55, 0xCC, 0x33
  ]);

  const bitCountBefore = countBits(buf);
  buf.swap64();
  const bitCountAfter = countBits(buf);

  if (bitCountBefore !== bitCountAfter) {
    throw new Error('Bit count changed after swap');
  }
});

function countBits(buf) {
  let count = 0;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    while (byte) {
      count += byte & 1;
      byte >>= 1;
    }
  }
  return count;
}

// ==================== 边界值字节模式 ====================

test('swap16 - 最大最小值混合', () => {
  const buf = Buffer.from([0x00, 0xFF, 0xFF, 0x00, 0x7F, 0x80, 0x80, 0x7F]);
  const copy = Buffer.from(buf);

  buf.swap16();

  // 验证正确交换
  for (let i = 0; i < buf.length; i += 2) {
    if (buf[i] !== copy[i + 1] || buf[i + 1] !== copy[i]) {
      throw new Error('Min/max pattern swap failed');
    }
  }
});

test('swap32 - 有符号整数边界', () => {
  const buf = Buffer.alloc(8);
  buf.writeInt32LE(0x7FFFFFFF, 0); // 最大正数
  buf.writeInt32LE(-2147483648, 4); // 最小负数

  buf.swap32();

  // 验证字节被正确交换
  const val1 = buf.readInt32BE(0);
  const val2 = buf.readInt32BE(4);

  if (val1 !== 0x7FFFFFFF || val2 !== -2147483648) {
    throw new Error('Signed integer boundary swap failed');
  }
});

test('swap64 - BigInt边界值', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64LE(0x7FFFFFFFFFFFFFFFn, 0); // 最大正数
  buf.writeBigInt64LE(-0x8000000000000000n, 8); // 最小负数

  buf.swap64();

  const val1 = buf.readBigInt64BE(0);
  const val2 = buf.readBigInt64BE(8);

  if (val1 !== 0x7FFFFFFFFFFFFFFFn || val2 !== -0x8000000000000000n) {
    throw new Error('BigInt boundary swap failed');
  }
});

// ==================== 重复模式验证 ====================

test('swap16 - 重复2字节模式', () => {
  const pattern = [0x12, 0x34];
  const buf = Buffer.alloc(32);

  for (let i = 0; i < 32; i += 2) {
    buf[i] = pattern[0];
    buf[i + 1] = pattern[1];
  }

  buf.swap16();

  // 验证所有位置都正确交换
  for (let i = 0; i < 32; i += 2) {
    if (buf[i] !== 0x34 || buf[i + 1] !== 0x12) {
      throw new Error('Repeated 2-byte pattern swap failed');
    }
  }
});

test('swap32 - 重复4字节模式', () => {
  const pattern = [0x01, 0x02, 0x03, 0x04];
  const buf = Buffer.alloc(32);

  for (let i = 0; i < 32; i += 4) {
    buf[i] = pattern[0];
    buf[i + 1] = pattern[1];
    buf[i + 2] = pattern[2];
    buf[i + 3] = pattern[3];
  }

  buf.swap32();

  for (let i = 0; i < 32; i += 4) {
    if (buf[i] !== 0x04 || buf[i + 3] !== 0x01) {
      throw new Error('Repeated 4-byte pattern swap failed');
    }
  }
});

test('swap64 - 重复8字节模式', () => {
  const pattern = [0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88];
  const buf = Buffer.alloc(32);

  for (let i = 0; i < 32; i += 8) {
    for (let j = 0; j < 8; j++) {
      buf[i + j] = pattern[j];
    }
  }

  buf.swap64();

  for (let i = 0; i < 32; i += 8) {
    if (buf[i] !== 0x88 || buf[i + 7] !== 0x11) {
      throw new Error('Repeated 8-byte pattern swap failed');
    }
  }
});

// ==================== 随机数据完整性 ====================

test('swap16 - 随机数据可逆性', () => {
  const buf = crypto.randomBytes(256);
  const copy = Buffer.from(buf);

  buf.swap16();
  buf.swap16();

  if (!buf.equals(copy)) {
    throw new Error('Random data not restored after double swap16');
  }
});

test('swap32 - 随机数据可逆性', () => {
  const buf = crypto.randomBytes(256);
  const copy = Buffer.from(buf);

  buf.swap32();
  buf.swap32();

  if (!buf.equals(copy)) {
    throw new Error('Random data not restored after double swap32');
  }
});

test('swap64 - 随机数据可逆性', () => {
  const buf = crypto.randomBytes(256);
  const copy = Buffer.from(buf);

  buf.swap64();
  buf.swap64();

  if (!buf.equals(copy)) {
    throw new Error('Random data not restored after double swap64');
  }
});

// ==================== 数据损坏检测 ====================

test('swap16 - 无数据丢失', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = i;
  }

  const setValuesBefore = new Set(buf);
  buf.swap16();
  const setValuesAfter = new Set(buf);

  if (setValuesBefore.size !== setValuesAfter.size) {
    throw new Error('Data lost after swap16');
  }
});

test('swap32 - 字节总数不变', () => {
  const buf = Buffer.alloc(128);
  for (let i = 0; i < 128; i++) {
    buf[i] = (i * 7) % 256;
  }

  const byteMap = new Map();
  for (let i = 0; i < 128; i++) {
    const val = buf[i];
    byteMap.set(val, (byteMap.get(val) || 0) + 1);
  }

  buf.swap32();

  const byteMapAfter = new Map();
  for (let i = 0; i < 128; i++) {
    const val = buf[i];
    byteMapAfter.set(val, (byteMapAfter.get(val) || 0) + 1);
  }

  // 验证每个字节的出现次数相同
  for (const [byte, count] of byteMap) {
    if (byteMapAfter.get(byte) !== count) {
      throw new Error(`Byte 0x${byte.toString(16)} count changed`);
    }
  }
});

test('swap64 - 熵不变性', () => {
  const buf = crypto.randomBytes(128);

  const entropyBefore = calculateEntropy(buf);
  buf.swap64();
  const entropyAfter = calculateEntropy(buf);

  // 熵值应该非常接近（允许浮点误差）
  if (Math.abs(entropyBefore - entropyAfter) > 0.001) {
    throw new Error('Entropy changed after swap');
  }
});

function calculateEntropy(buf) {
  const freq = new Array(256).fill(0);
  for (let i = 0; i < buf.length; i++) {
    freq[buf[i]]++;
  }

  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    if (freq[i] > 0) {
      const p = freq[i] / buf.length;
      entropy -= p * Math.log2(p);
    }
  }

  return entropy;
}

// ==================== Unicode和UTF-8数据 ====================

test('swap16 - UTF-8编码数据', () => {
  const str = '你好世界'; // 4个汉字
  const buf = Buffer.from(str, 'utf8');

  if (buf.length % 2 !== 0) {
    throw new Error('UTF-8 buffer length is odd');
  }

  const copy = Buffer.from(buf);
  buf.swap16();

  // swap16会破坏UTF-8编码
  const decoded = buf.toString('utf8');
  if (decoded === str) {
    throw new Error('UTF-8 should be corrupted after swap16');
  }

  // 但字节数据应该可恢复
  buf.swap16();
  if (!buf.equals(copy)) {
    throw new Error('UTF-8 data not restored');
  }
});

test('swap32 - Base64解码数据完整性', () => {
  const base64 = 'SGVsbG8gV29ybGQ=';
  const buf = Buffer.from(base64, 'base64');

  // 确保长度是4的倍数
  const aligned = Buffer.alloc(Math.ceil(buf.length / 4) * 4);
  buf.copy(aligned);

  const copy = Buffer.from(aligned);
  aligned.swap32();
  aligned.swap32();

  if (!aligned.slice(0, buf.length).equals(buf)) {
    throw new Error('Base64 data not restored');
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
