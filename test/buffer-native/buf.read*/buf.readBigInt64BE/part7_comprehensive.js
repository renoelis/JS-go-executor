// buf.readBigInt64BE() - 综合场景测试
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

// 多次读取同一 Buffer
test('多次读取同一位置', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(123n, 0);
  const r1 = buf.readBigInt64BE(0);
  const r2 = buf.readBigInt64BE(0);
  const r3 = buf.readBigInt64BE(0);
  return r1 === 123n && r2 === 123n && r3 === 123n;
});

// 读取不影响 Buffer 内容
test('读取不修改 Buffer 内容', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(456n, 0);
  const before = buf.toString('hex');
  buf.readBigInt64BE(0);
  const after = buf.toString('hex');
  return before === after;
});

// 连续读取不同位置
test('连续读取不同位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(111n, 0);
  buf.writeBigInt64BE(222n, 8);
  buf.writeBigInt64BE(333n, 16);
  return buf.readBigInt64BE(0) === 111n &&
         buf.readBigInt64BE(8) === 222n &&
         buf.readBigInt64BE(16) === 333n;
});

// 乱序读取
test('乱序读取多个位置', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(100n, 0);
  buf.writeBigInt64BE(200n, 8);
  buf.writeBigInt64BE(300n, 16);
  return buf.readBigInt64BE(16) === 300n &&
         buf.readBigInt64BE(0) === 100n &&
         buf.readBigInt64BE(8) === 200n;
});

// 写入后立即读取
test('写入后立即读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(789n, 0);
  return buf.readBigInt64BE(0) === 789n;
});

// 覆盖写入后读取
test('覆盖写入后读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(100n, 0);
  buf.writeBigInt64BE(200n, 0);
  return buf.readBigInt64BE(0) === 200n;
});

// 部分覆盖
test('部分覆盖写入', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(1000n, 0);
  buf.writeBigInt64BE(2000n, 4);
  // offset=4 写入会覆盖 offset=0 的后4字节和 offset=8 的前4字节
  // 读取 offset=4 应该得到 2000n
  return buf.readBigInt64BE(4) === 2000n;
});

// 交叉读写
test('交叉读写操作', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(111n, 0);
  const r1 = buf.readBigInt64BE(0);
  buf.writeBigInt64BE(222n, 8);
  const r2 = buf.readBigInt64BE(8);
  return r1 === 111n && r2 === 222n;
});

// 边界对齐读取
test('8字节对齐读取', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigInt64BE(10n, 0);
  buf.writeBigInt64BE(20n, 8);
  buf.writeBigInt64BE(30n, 16);
  buf.writeBigInt64BE(40n, 24);
  return buf.readBigInt64BE(0) === 10n &&
         buf.readBigInt64BE(8) === 20n &&
         buf.readBigInt64BE(16) === 30n &&
         buf.readBigInt64BE(24) === 40n;
});

// 非对齐读取（offset 不是 8 的倍数）
test('非对齐 offset 读取', () => {
  const buf = Buffer.alloc(16);
  buf.writeBigInt64BE(999n, 3);
  return buf.readBigInt64BE(3) === 999n;
});

// 大 Buffer 中的小范围读取
test('大 Buffer 中读取', () => {
  const buf = Buffer.alloc(1024);
  buf.writeBigInt64BE(777n, 512);
  return buf.readBigInt64BE(512) === 777n;
});

// 正负值混合
test('正负值混合读取', () => {
  const buf = Buffer.alloc(32);
  buf.writeBigInt64BE(100n, 0);
  buf.writeBigInt64BE(-200n, 8);
  buf.writeBigInt64BE(300n, 16);
  buf.writeBigInt64BE(-400n, 24);
  return buf.readBigInt64BE(0) === 100n &&
         buf.readBigInt64BE(8) === -200n &&
         buf.readBigInt64BE(16) === 300n &&
         buf.readBigInt64BE(24) === -400n;
});

// 极值混合
test('极值混合读取', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigInt64BE(9223372036854775807n, 0);
  buf.writeBigInt64BE(-9223372036854775808n, 8);
  buf.writeBigInt64BE(0n, 16);
  return buf.readBigInt64BE(0) === 9223372036854775807n &&
         buf.readBigInt64BE(8) === -9223372036854775808n &&
         buf.readBigInt64BE(16) === 0n;
});

// 从十六进制字符串创建并读取
test('从十六进制字符串创建', () => {
  const buf = Buffer.from('0000000000000064', 'hex');
  return buf.readBigInt64BE(0) === 100n;
});

// 从 base64 创建并读取
test('从 base64 创建', () => {
  const buf = Buffer.from('AAAAAAAAAGQ=', 'base64');
  return buf.readBigInt64BE(0) === 100n;
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
