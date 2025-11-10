// buf.readBigInt64LE() - 性能和批量操作测试
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

// 批量连续读取
test('连续读取 100 个值', () => {
  const buf = Buffer.alloc(800);
  for (let i = 0; i < 100; i++) {
    buf.writeBigInt64LE(BigInt(i), i * 8);
  }
  for (let i = 0; i < 100; i++) {
    if (buf.readBigInt64LE(i * 8) !== BigInt(i)) {
      return false;
    }
  }
  return true;
});

test('大 Buffer 随机位置读取', () => {
  const buf = Buffer.alloc(10000);
  const positions = [0, 100, 500, 1000, 5000, 9992];
  const values = [111n, 222n, 333n, 444n, 555n, 666n];
  
  for (let i = 0; i < positions.length; i++) {
    buf.writeBigInt64LE(values[i], positions[i]);
  }
  
  for (let i = 0; i < positions.length; i++) {
    if (buf.readBigInt64LE(positions[i]) !== values[i]) {
      return false;
    }
  }
  return true;
});

// 重复读取相同位置
test('重复读取同一位置 1000 次', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(12345n, 0);
  for (let i = 0; i < 1000; i++) {
    if (buf.readBigInt64LE(0) !== 12345n) {
      return false;
    }
  }
  return true;
});

// 交替读写
test('交替读写 100 次', () => {
  const buf = Buffer.alloc(8);
  for (let i = 0; i < 100; i++) {
    const value = BigInt(i * 1000);
    buf.writeBigInt64LE(value, 0);
    if (buf.readBigInt64LE(0) !== value) {
      return false;
    }
  }
  return true;
});

// 多位置并发读取
test('多位置同时读取', () => {
  const buf = Buffer.alloc(64);
  const values = [100n, 200n, 300n, 400n, 500n, 600n, 700n, 800n];
  
  for (let i = 0; i < 8; i++) {
    buf.writeBigInt64LE(values[i], i * 8);
  }
  
  const results = [];
  for (let i = 0; i < 8; i++) {
    results.push(buf.readBigInt64LE(i * 8));
  }
  
  for (let i = 0; i < 8; i++) {
    if (results[i] !== values[i]) {
      return false;
    }
  }
  return true;
});

// 边界密集读取
test('边界附近密集读取', () => {
  const buf = Buffer.alloc(100);
  // 在 buffer 末尾附近写入多个值
  buf.writeBigInt64LE(111n, 84);
  buf.writeBigInt64LE(222n, 92);
  
  return buf.readBigInt64LE(84) === 111n && 
         buf.readBigInt64LE(92) === 222n;
});

// 极值批量测试
test('批量读取极值', () => {
  const buf = Buffer.alloc(24);
  const max = 9223372036854775807n;
  const min = -9223372036854775808n;
  
  buf.writeBigInt64LE(max, 0);
  buf.writeBigInt64LE(min, 8);
  buf.writeBigInt64LE(0n, 16);
  
  return buf.readBigInt64LE(0) === max &&
         buf.readBigInt64LE(8) === min &&
         buf.readBigInt64LE(16) === 0n;
});

// 稀疏读取
test('稀疏位置读取', () => {
  const buf = Buffer.alloc(1000);
  const positions = [0, 200, 400, 600, 800, 992];
  
  for (let i = 0; i < positions.length; i++) {
    buf.writeBigInt64LE(BigInt(positions[i]), positions[i]);
  }
  
  for (let i = 0; i < positions.length; i++) {
    if (buf.readBigInt64LE(positions[i]) !== BigInt(positions[i])) {
      return false;
    }
  }
  return true;
});

// 顺序 vs 逆序读取
test('顺序和逆序读取一致性', () => {
  const buf = Buffer.alloc(80);
  const values = [];
  
  for (let i = 0; i < 10; i++) {
    values[i] = BigInt(i * 111);
    buf.writeBigInt64LE(values[i], i * 8);
  }
  
  // 顺序读取
  for (let i = 0; i < 10; i++) {
    if (buf.readBigInt64LE(i * 8) !== values[i]) {
      return false;
    }
  }
  
  // 逆序读取
  for (let i = 9; i >= 0; i--) {
    if (buf.readBigInt64LE(i * 8) !== values[i]) {
      return false;
    }
  }
  
  return true;
});

// 读取不影响后续读取
test('连续读取互不影响', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(999n, 0);
  
  const r1 = buf.readBigInt64LE(0);
  const r2 = buf.readBigInt64LE(0);
  const r3 = buf.readBigInt64LE(0);
  
  return r1 === 999n && r2 === 999n && r3 === 999n && r1 === r2 && r2 === r3;
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
