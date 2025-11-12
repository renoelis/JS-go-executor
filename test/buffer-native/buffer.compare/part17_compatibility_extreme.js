// buffer.compare() - 历史兼容性与极端边界最终测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅', name);
    } else {
      console.log('❌', name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌', name, '-', e.message);
  }
}

test('字典序比较正确性', () => {
  const buf1 = Buffer.from([0x01, 0x02]);
  const buf2 = Buffer.from([0x01, 0x03]);
  const result = buf1.compare(buf2);
  return result < 0; // 第二个字节决定
});

test('首字节差异立即返回', () => {
  const buf1 = Buffer.from([0xFF, 0x00, 0x00, 0x00]);
  const buf2 = Buffer.from([0x00, 0xFF, 0xFF, 0xFF]);
  const result = buf1.compare(buf2);
  return result > 0; // 首字节决定
});

test('长度为1000的buffer精确比较', () => {
  const buf1 = Buffer.alloc(1000, 0x42);
  const buf2 = Buffer.alloc(1000, 0x42);
  buf2[999] = 0x43;
  const result = buf1.compare(buf2);
  return result < 0; // 最后一个字节不同
});

test('长度为1001的buffer精确比较', () => {
  const buf1 = Buffer.alloc(1001, 0xAA);
  const buf2 = Buffer.alloc(1001, 0xAA);
  buf2[500] = 0xAB;
  const result = buf1.compare(buf2);
  return result < 0; // 中间字节不同
});

test('内存对齐边界 - 3字节', () => {
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([1, 2, 4]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('内存对齐边界 - 5字节', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 6]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('内存对齐边界 - 7字节', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 8]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('内存对齐边界 - 9字节', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 10]);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('全0与全1比较', () => {
  const buf1 = Buffer.alloc(100, 0x00);
  const buf2 = Buffer.alloc(100, 0xFF);
  const result = buf1.compare(buf2);
  return result < 0;
});

test('全0与包含单个1比较', () => {
  const buf1 = Buffer.alloc(100, 0x00);
  const buf2 = Buffer.alloc(100, 0x00);
  buf2[50] = 0x01;
  const result = buf1.compare(buf2);
  return result < 0;
});

test('二进制数据比较 - 图片头部', () => {
  const png = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
  const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  const result = png.compare(jpg);
  return result < 0; // PNG魔数 < JPEG魔数
});

test('二进制数据比较 - ZIP头部', () => {
  const zip1 = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  const zip2 = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
  const result = zip1.compare(zip2);
  return result === 0;
});

test('哈希值比较场景', () => {
  const hash1 = Buffer.from('5d41402abc4b2a76b9719d911017c592', 'hex'); // MD5("hello")
  const hash2 = Buffer.from('5d41402abc4b2a76b9719d911017c592', 'hex');
  const result = hash1.compare(hash2);
  return result === 0;
});

test('不同哈希值比较', () => {
  const hash1 = Buffer.from('5d41402abc4b2a76b9719d911017c592', 'hex');
  const hash2 = Buffer.from('098f6bcd4621d373cade4e832627b4f6', 'hex');
  const result = hash1.compare(hash2);
  return result > 0; // 按字典序比较
});

test('UUID格式比较', () => {
  const uuid1 = Buffer.from('550e8400-e29b-41d4-a716-446655440000'.replace(/-/g, ''), 'hex');
  const uuid2 = Buffer.from('550e8400-e29b-41d4-a716-446655440001'.replace(/-/g, ''), 'hex');
  const result = uuid1.compare(uuid2);
  return result < 0;
});

test('时间戳buffer比较', () => {
  const time1 = Buffer.allocUnsafe(8);
  const time2 = Buffer.allocUnsafe(8);
  time1.writeBigInt64BE(BigInt(Date.now()));
  time2.writeBigInt64BE(BigInt(Date.now()) + 1000n);
  const result = time1.compare(time2);
  return result < 0;
});

test('网络字节序比较', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeUInt32BE(0x12345678);
  buf2.writeUInt32BE(0x12345678);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('小端字节序比较', () => {
  const buf1 = Buffer.allocUnsafe(4);
  const buf2 = Buffer.allocUnsafe(4);
  buf1.writeUInt32LE(0x12345678);
  buf2.writeUInt32LE(0x12345678);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('混合字节序不应相等', () => {
  const bufBE = Buffer.allocUnsafe(4);
  const bufLE = Buffer.allocUnsafe(4);
  bufBE.writeUInt32BE(0x12345678);
  bufLE.writeUInt32LE(0x12345678);
  const result = bufBE.compare(bufLE);
  return result !== 0;
});

test('负数表示在无符号比较中的行为', () => {
  const buf1 = Buffer.allocUnsafe(1);
  const buf2 = Buffer.allocUnsafe(1);
  buf1.writeInt8(-1);  // 0xFF
  buf2.writeUInt8(255); // 0xFF
  const result = buf1.compare(buf2);
  return result === 0; // 字节级别相同
});

test('浮点数buffer比较', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeDoubleLE(3.14);
  buf2.writeDoubleLE(3.14);
  const result = buf1.compare(buf2);
  return result === 0;
});

test('不同浮点数buffer比较', () => {
  const buf1 = Buffer.allocUnsafe(8);
  const buf2 = Buffer.allocUnsafe(8);
  buf1.writeDoubleLE(3.14);
  buf2.writeDoubleLE(3.15);
  const result = buf1.compare(buf2);
  return result !== 0;
});

test('循环buffer比较 - 环形队列场景', () => {
  const ringSize = 16;
  const buf1 = Buffer.alloc(ringSize);
  const buf2 = Buffer.alloc(ringSize);

  for (let i = 0; i < ringSize; i++) {
    buf1[i] = i % 256;
    buf2[i] = i % 256;
  }

  const result = buf1.compare(buf2);
  return result === 0;
});

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
