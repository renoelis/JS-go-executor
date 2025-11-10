// buf.readBigUInt64LE() - Node.js 官方文档示例测试
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

// Node.js v25.1.0 官方文档示例
// https://nodejs.org/api/buffer.html#bufreadbiguint64leoffset
test('官方示例: Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]) at offset 0', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
  const result = buf.readBigUInt64LE(0);
  // 官方文档期望值: 18446744069414584320n
  return result === 18446744069414584320n;
});

// 验证字节序解释
test('官方示例字节序解释验证', () => {
  // Little-Endian: 低位字节在前
  // [0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]
  // 位置: [0,    1,    2,    3,    4,    5,    6,    7]
  // 含义: [低位 -------------------------------→ 高位]
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
  
  // 手动计算:
  // 低 32 位 (字节 0-3): 0x00000000 = 0
  // 高 32 位 (字节 4-7): 0xffffffff = 4294967295
  // 完整值 = 4294967295 * 2^32 + 0 = 18446744069414584320
  
  const expected = 4294967295n * (2n ** 32n);
  return buf.readBigUInt64LE(0) === expected;
});

// 测试官方示例的反向操作
test('官方示例反向操作: write → read', () => {
  const buf = Buffer.alloc(8);
  const value = 18446744069414584320n;
  buf.writeBigUInt64LE(value, 0);
  
  // 验证写入的字节是否与官方示例一致
  const expected = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
  return buf.equals(expected) && buf.readBigUInt64LE(0) === value;
});

// 测试官方示例的各个字节位置
test('官方示例字节分解验证', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]);
  
  // 验证前 4 字节为 0
  let allZeros = true;
  for (let i = 0; i < 4; i++) {
    if (buf[i] !== 0x00) allZeros = false;
  }
  
  // 验证后 4 字节为 0xff
  let allOnes = true;
  for (let i = 4; i < 8; i++) {
    if (buf[i] !== 0xff) allOnes = false;
  }
  
  return allZeros && allOnes && buf.readBigUInt64LE(0) === 18446744069414584320n;
});

// 测试类似模式但不同的值
test('类似模式: [0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00]', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00]);
  // Little-Endian: 低 32 位全为 0xff, 高 32 位全为 0x00
  // 值 = 0xffffffff = 4294967295
  return buf.readBigUInt64LE(0) === 4294967295n;
});

// 测试全 0xff 的情况
test('全字节为 0xff: 最大值', () => {
  const buf = Buffer.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  const maxUInt64 = 18446744073709551615n; // 2^64 - 1
  return buf.readBigUInt64LE(0) === maxUInt64;
});

// 测试全 0x00 的情况
test('全字节为 0x00: 最小值', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64LE(0) === 0n;
});

// 测试单字节非零
test('仅第一个字节为 0x01', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64LE(0) === 1n;
});

test('仅最后一个字节为 0x01', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
  // 0x01 在最高位 (字节 7)
  // 值 = 0x01 * 2^56 = 72057594037927936
  return buf.readBigUInt64LE(0) === 72057594037927936n;
});

// 测试对称模式
test('对称模式: [0x12, 0x34, 0x56, 0x78, 0x78, 0x56, 0x34, 0x12]', () => {
  const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x78, 0x56, 0x34, 0x12]);
  const result = buf.readBigUInt64LE(0);
  
  // 手动计算验证
  const expected = 0x12n + (0x34n << 8n) + (0x56n << 16n) + (0x78n << 24n) +
                   (0x78n << 32n) + (0x56n << 40n) + (0x34n << 48n) + (0x12n << 56n);
  
  return result === expected;
});

// 测试递增模式
test('递增模式: [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
  const result = buf.readBigUInt64LE(0);
  
  // 手动计算
  const expected = 0x00n + (0x01n << 8n) + (0x02n << 16n) + (0x03n << 24n) +
                   (0x04n << 32n) + (0x05n << 40n) + (0x06n << 48n) + (0x07n << 56n);
  
  return result === expected;
});

// 测试递减模式
test('递减模式: [0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0x00]', () => {
  const buf = Buffer.from([0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0x00]);
  const result = buf.readBigUInt64LE(0);
  
  const expected = 0x07n + (0x06n << 8n) + (0x05n << 16n) + (0x04n << 24n) +
                   (0x03n << 32n) + (0x02n << 40n) + (0x01n << 48n) + (0x00n << 56n);
  
  return result === expected;
});

// 测试 2 的幂次
test('2^32 值测试', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
  // 字节 4 为 0x01，表示 2^32
  return buf.readBigUInt64LE(0) === 4294967296n;
});

test('2^40 值测试', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00]);
  // 字节 5 为 0x01，表示 2^40
  return buf.readBigUInt64LE(0) === 1099511627776n;
});

test('2^48 值测试', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00]);
  // 字节 6 为 0x01，表示 2^48
  return buf.readBigUInt64LE(0) === 281474976710656n;
});

test('2^56 值测试', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
  // 字节 7 为 0x01，表示 2^56
  return buf.readBigUInt64LE(0) === 72057594037927936n;
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
