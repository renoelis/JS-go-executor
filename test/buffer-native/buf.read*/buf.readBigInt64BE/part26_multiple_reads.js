// buf.readBigInt64BE() - 多次读取和混合使用测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 连续多次读取同一位置
test('连续读取同一位置 10 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(12345n, 0);
  for (let i = 0; i < 10; i++) {
    if (buf.readBigInt64BE(0) !== 12345n) {
      return false;
    }
  }
  return true;
});

test('连续读取同一位置 100 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-99999n, 0);
  for (let i = 0; i < 100; i++) {
    if (buf.readBigInt64BE(0) !== -99999n) {
      return false;
    }
  }
  return true;
});

// 读取不同位置
test('读取多个不同位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(111n, 0);
  buf.writeBigInt64BE(222n, 8);
  buf.writeBigInt64BE(333n, 16);
  
  return buf.readBigInt64BE(0) === 111n &&
         buf.readBigInt64BE(8) === 222n &&
         buf.readBigInt64BE(16) === 333n;
});

// 交替读取
test('交替读取不同位置', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(100n, 0);
  buf.writeBigInt64BE(200n, 8);
  
  for (let i = 0; i < 10; i++) {
    if (buf.readBigInt64BE(0) !== 100n) return false;
    if (buf.readBigInt64BE(8) !== 200n) return false;
  }
  return true;
});

// 读取后修改再读取
test('读取-修改-读取循环', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(1n, 0);
  
  if (buf.readBigInt64BE(0) !== 1n) return false;
  
  buf.writeBigInt64BE(2n, 0);
  if (buf.readBigInt64BE(0) !== 2n) return false;
  
  buf.writeBigInt64BE(3n, 0);
  if (buf.readBigInt64BE(0) !== 3n) return false;
  
  return true;
});

// 与 readBigInt64LE 混合使用
test('与 readBigInt64LE 混合使用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  
  const be = buf.readBigInt64BE(0);
  const le = buf.readBigInt64LE(0);
  
  return be === 72623859790382856n && le === 578437695752307201n;
});

// 与其他 read 方法混合使用
test('与 readInt32BE 混合使用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0000000100000002n, 0);
  
  const bigint = buf.readBigInt64BE(0);
  const int1 = buf.readInt32BE(0);
  const int2 = buf.readInt32BE(4);
  
  return bigint === 4294967298n && int1 === 1 && int2 === 2;
});

test('与 readUInt32BE 混合使用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(-1n, 0); // -1n 的二进制表示是全 1
  
  const bigint = buf.readBigInt64BE(0);
  const uint1 = buf.readUInt32BE(0);
  const uint2 = buf.readUInt32BE(4);
  
  return bigint === -1n && uint1 === 4294967295 && uint2 === 4294967295;
});

test('与 readInt8 混合使用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x0102030405060708n, 0);
  
  const bigint = buf.readBigInt64BE(0);
  const bytes = [];
  for (let i = 0; i < 8; i++) {
    bytes.push(buf.readInt8(i));
  }
  
  return bigint === 72623859790382856n &&
         bytes[0] === 1 && bytes[1] === 2 && bytes[7] === 8;
});

// 与 readUInt8 混合使用
test('与 readUInt8 混合使用', () => {
  const buf = Buffer.alloc(8);
  // 使用有符号范围内的值，二进制为 0xFF00FF00FF00FF00
  buf.writeBigInt64BE(-71777214294589696n, 0);
  
  const bigint = buf.readBigInt64BE(0);
  const byte0 = buf.readUInt8(0);
  const byte1 = buf.readUInt8(1);
  
  return bigint === -71777214294589696n && byte0 === 255 && byte1 === 0;
});

// 与 readDoubleBE 混合使用（同样是 8 字节）
test('与 readDoubleBE 混合使用', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(0x3FF0000000000000n, 0); // IEEE 754 表示 1.0
  
  const bigint = buf.readBigInt64BE(0);
  const double = buf.readDoubleBE(0);
  
  return bigint === 4607182418800017408n && double === 1.0;
});

// 读取后不影响 Buffer 内容
test('读取操作不修改 Buffer 内容', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
  const original = Buffer.from(buf);
  
  buf.readBigInt64BE(0);
  
  return buf.equals(original);
});

// 大量随机读取
test('大量随机位置读取', () => {
  const buf = Buffer.alloc(80);
  const values = [];
  
  for (let i = 0; i < 10; i++) {
    const val = BigInt(i * 1000);
    buf.writeBigInt64BE(val, i * 8);
    values.push(val);
  }
  
  // 随机顺序读取
  const indices = [3, 7, 1, 9, 0, 5, 2, 8, 4, 6];
  for (const idx of indices) {
    if (buf.readBigInt64BE(idx * 8) !== values[idx]) {
      return false;
    }
  }
  
  return true;
});

// 并发式读取（虽然 JS 是单线程，但测试快速连续调用）
test('快速连续读取 1000 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(9876543210n, 0);
  
  for (let i = 0; i < 1000; i++) {
    if (buf.readBigInt64BE(0) !== 9876543210n) {
      return false;
    }
  }
  return true;
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
