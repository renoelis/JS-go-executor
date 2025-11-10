// buf.readBigUInt64BE() - 并发操作和性能测试
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

// 大量连续读取
test('连续读取 1000 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(12345n, 0);
  for (let i = 0; i < 1000; i++) {
    if (buf.readBigUInt64BE(0) !== 12345n) {
      return false;
    }
  }
  return true;
});

test('连续读取 10000 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(67890n, 0);
  for (let i = 0; i < 10000; i++) {
    if (buf.readBigUInt64BE(0) !== 67890n) {
      return false;
    }
  }
  return true;
});

// 多个 Buffer 并发读取
test('多个 Buffer 同时读取', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(i), 0);
    buffers.push(buf);
  }
  for (let i = 0; i < 100; i++) {
    if (buffers[i].readBigUInt64BE(0) !== BigInt(i)) {
      return false;
    }
  }
  return true;
});

// 读写交替
test('读写交替 1000 次', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 1000; i++) {
    buf.writeBigUInt64BE(BigInt(i), 0);
    if (buf.readBigUInt64BE(0) !== BigInt(i)) {
      return false;
    }
  }
  return true;
});

// 不同位置并发读取
test('不同位置并发读取', () => {
  const buf = Buffer.alloc(80);
  for (let i = 0; i < 10; i++) {
    buf.writeBigUInt64BE(BigInt(i * 100), i * 8);
  }
  for (let i = 0; i < 10; i++) {
    if (buf.readBigUInt64BE(i * 8) !== BigInt(i * 100)) {
      return false;
    }
  }
  return true;
});

// 大 Buffer 多位置读取
test('大 Buffer 多位置读取', () => {
  const buf = Buffer.alloc(8000);
  for (let i = 0; i < 100; i++) {
    const offset = i * 80;
    buf.writeBigUInt64BE(BigInt(i), offset);
  }
  for (let i = 0; i < 100; i++) {
    const offset = i * 80;
    if (buf.readBigUInt64BE(offset) !== BigInt(i)) {
      return false;
    }
  }
  return true;
});

// 随机访问
test('随机位置访问', () => {
  const buf = Buffer.alloc(1000);
  const positions = [0, 8, 16, 100, 200, 500, 992];
  for (let i = 0; i < positions.length; i++) {
    buf.writeBigUInt64BE(BigInt(i * 111), positions[i]);
  }
  for (let i = 0; i < positions.length; i++) {
    if (buf.readBigUInt64BE(positions[i]) !== BigInt(i * 111)) {
      return false;
    }
  }
  return true;
});

// 性能：快速读取
test('快速读取 100000 次（性能测试）', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(999n, 0);
  const start = Date.now();
  for (let i = 0; i < 100000; i++) {
    buf.readBigUInt64BE(0);
  }
  const duration = Date.now() - start;
  return duration < 5000; // 应该在 5 秒内完成
});

// 内存稳定性
test('大量创建和读取不崩溃', () => {
  for (let i = 0; i < 1000; i++) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(i), 0);
    buf.readBigUInt64BE(0);
  }
  return true;
});

// 交错读取不同值
test('交错读取不同值', () => {
  const buf = Buffer.alloc(24);
  buf.writeBigUInt64BE(111n, 0);
  buf.writeBigUInt64BE(222n, 8);
  buf.writeBigUInt64BE(333n, 16);
  
  for (let i = 0; i < 100; i++) {
    if (buf.readBigUInt64BE(0) !== 111n) return false;
    if (buf.readBigUInt64BE(8) !== 222n) return false;
    if (buf.readBigUInt64BE(16) !== 333n) return false;
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
