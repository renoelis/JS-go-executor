// buf.readBigUInt64BE() - 特殊情况和边缘场景
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

// 全零 Buffer
test('全零 Buffer', () => {
  const buf = Buffer.alloc(8);
  return buf.readBigUInt64BE(0) === 0n;
});

// 全 0xFF Buffer
test('全 0xFF Buffer（最大值）', () => {
  const buf = Buffer.alloc(8);
  buf.fill(0xFF);
  return buf.readBigUInt64BE(0) === 18446744073709551615n;
});

// 单字节值
test('只有最后一个字节非零', () => {
  const buf = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]);
  return buf.readBigUInt64BE(0) === 1n;
});

test('只有第一个字节非零', () => {
  const buf = Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  return buf.readBigUInt64BE(0) === 72057594037927936n; // 2^56
});

// 位模式测试
test('位模式 - 所有偶数位', () => {
  const buf = Buffer.from([0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA, 0xAA]);
  return buf.readBigUInt64BE(0) === 12297829382473034410n;
});

test('位模式 - 所有奇数位', () => {
  const buf = Buffer.from([0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55, 0x55]);
  return buf.readBigUInt64BE(0) === 6148914691236517205n;
});

// 连续相同字节
test('连续 0x11', () => {
  const buf = Buffer.from([0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x11]);
  return buf.readBigUInt64BE(0) === 1229782938247303441n;
});

test('连续 0x22', () => {
  const buf = Buffer.from([0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22, 0x22]);
  return buf.readBigUInt64BE(0) === 2459565876494606882n;
});

// 对称模式
test('对称模式 0x01-0x04-0x04-0x01', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x04, 0x03, 0x02, 0x01]);
  return buf.readBigUInt64BE(0) === 72623859773407745n;
});

// 从 Buffer.from 各种源创建
test('从十六进制字符串创建', () => {
  const buf = Buffer.from('0000000000000100', 'hex');
  return buf.readBigUInt64BE(0) === 256n;
});

test('从 base64 创建', () => {
  const buf = Buffer.from('AAAAAAAAAAE=', 'base64');
  return buf.readBigUInt64BE(0) === 1n;
});

// 重复写入同一位置
test('重复写入同一位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(111n, 0);
  buf.writeBigUInt64BE(222n, 0);
  buf.writeBigUInt64BE(333n, 0);
  return buf.readBigUInt64BE(0) === 333n;
});

// 部分重叠写入
test('部分重叠写入（8 字节 Buffer）', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64BE(111n, 0);
  buf.writeBigUInt64BE(222n, 4);
  const v1 = buf.readBigUInt64BE(0);
  const v2 = buf.readBigUInt64BE(4);
  return v1 !== 111n && v2 === 222n;
});

// 使用 Buffer.concat
test('从 concat 的 Buffer 读取', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);
  buf1.writeUInt32BE(0x00000000, 0);
  buf2.writeUInt32BE(0x00000100, 0);
  const combined = Buffer.concat([buf1, buf2]);
  return combined.readBigUInt64BE(0) === 256n;
});

// 从 TypedArray 视图
test('从 BigUint64Array 视图', () => {
  const arr = new BigUint64Array([12345n]);
  const buf = Buffer.from(arr.buffer);
  const value = buf.readBigUInt64BE(0);
  return typeof value === 'bigint';
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
