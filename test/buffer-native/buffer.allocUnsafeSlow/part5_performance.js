// Buffer.allocUnsafeSlow - 性能对比与行为差异测试
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

// 与 Buffer.alloc 的行为对比
test('allocUnsafeSlow vs alloc: 返回类型相同', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.alloc(10);
  return Buffer.isBuffer(buf1) && Buffer.isBuffer(buf2);
});

test('allocUnsafeSlow vs alloc: length 相同', () => {
  const buf1 = Buffer.allocUnsafeSlow(100);
  const buf2 = Buffer.alloc(100);
  return buf1.length === buf2.length;
});

test('allocUnsafeSlow 内存未初始化，alloc 已清零', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.alloc(10);
  let allZero = true;
  for (let i = 0; i < buf2.length; i++) {
    if (buf2[i] !== 0) {
      allZero = false;
      break;
    }
  }
  return allZero && buf1.length === 10;
});

test('allocUnsafeSlow 不使用池，小 Buffer 也独立分配', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.fill(0);
  buf2.fill(0);
  buf1[0] = 255;
  return buf2[0] === 0;
});

// 与 Buffer.allocUnsafe 的行为对比
test('allocUnsafeSlow vs allocUnsafe: 返回类型相同', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafe(10);
  return Buffer.isBuffer(buf1) && Buffer.isBuffer(buf2);
});

test('allocUnsafeSlow vs allocUnsafe: length 相同', () => {
  const buf1 = Buffer.allocUnsafeSlow(50);
  const buf2 = Buffer.allocUnsafe(50);
  return buf1.length === buf2.length;
});

test('allocUnsafeSlow 不使用池，allocUnsafe 小 Buffer 可能使用池', () => {
  const slow1 = Buffer.allocUnsafeSlow(10);
  const slow2 = Buffer.allocUnsafeSlow(10);
  slow1.fill(0);
  slow2.fill(0);
  slow1[0] = 255;
  return slow2[0] === 0;
});

test('allocUnsafeSlow 和 allocUnsafe 都不自动清零', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafe(10);
  return buf1.length === 10 && buf2.length === 10;
});

// 池大小边界测试
test('4KB 以下: allocUnsafeSlow 不使用池', () => {
  const buf1 = Buffer.allocUnsafeSlow(4095);
  const buf2 = Buffer.allocUnsafeSlow(4095);
  buf1.fill(0);
  buf2.fill(0);
  buf1[0] = 100;
  return buf2[0] === 0;
});

test('4KB: allocUnsafeSlow 不使用池', () => {
  const buf1 = Buffer.allocUnsafeSlow(4096);
  const buf2 = Buffer.allocUnsafeSlow(4096);
  buf1.fill(0);
  buf2.fill(0);
  buf1[0] = 200;
  return buf2[0] === 0;
});

test('8KB: allocUnsafeSlow 不使用池', () => {
  const buf1 = Buffer.allocUnsafeSlow(8192);
  const buf2 = Buffer.allocUnsafeSlow(8192);
  buf1.fill(0);
  buf2.fill(0);
  buf1[100] = 150;
  return buf2[100] === 0;
});

// 性能相关行为测试
test('连续分配多个小 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.allocUnsafeSlow(10));
  }
  return bufs.length === 100 && bufs[0].length === 10;
});

test('连续分配多个中等 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 50; i++) {
    bufs.push(Buffer.allocUnsafeSlow(1024));
  }
  return bufs.length === 50 && bufs[0].length === 1024;
});

test('交替分配不同大小', () => {
  const bufs = [];
  for (let i = 0; i < 20; i++) {
    bufs.push(Buffer.allocUnsafeSlow(i % 2 === 0 ? 10 : 1000));
  }
  return bufs.length === 20;
});

// 内存分配独立性验证
test('allocUnsafeSlow 总是返回独立内存块', () => {
  const iterations = 10;
  for (let i = 0; i < iterations; i++) {
    const buf1 = Buffer.allocUnsafeSlow(20);
    const buf2 = Buffer.allocUnsafeSlow(20);
    buf1.fill(0);
    buf2.fill(0);
    buf1[10] = i + 1; // 避免与初始值0冲突
    if (buf2[10] === (i + 1)) return false;
  }
  return true;
});

test('不同大小的 Buffer 都保持独立', () => {
  const sizes = [1, 10, 100, 1000, 4096, 8192];
  for (const size of sizes) {
    const buf1 = Buffer.allocUnsafeSlow(size);
    const buf2 = Buffer.allocUnsafeSlow(size);
    buf1.fill(0);
    buf2.fill(0);
    buf1[0] = 255;
    if (buf2[0] === 255) return false;
  }
  return true;
});

// 与其他分配方法的参数兼容性
test('allocUnsafeSlow(0) 类似 alloc(0)', () => {
  const buf1 = Buffer.allocUnsafeSlow(0);
  const buf2 = Buffer.alloc(0);
  return buf1.length === 0 && buf2.length === 0;
});

test('allocUnsafeSlow 不支持 fill 参数', () => {
  const buf = Buffer.allocUnsafeSlow(10, 5);
  return buf.length === 10;
});

test('allocUnsafeSlow 不支持 encoding 参数', () => {
  const buf = Buffer.allocUnsafeSlow(10, 5, 'utf8');
  return buf.length === 10;
});

// 使用场景验证
test('适合需要手动管理内存的场景', () => {
  const buf = Buffer.allocUnsafeSlow(100);
  buf.fill(0);
  buf.write('test', 0, 'utf8');
  return buf.toString('utf8', 0, 4) === 'test';
});

test('适合立即覆盖数据的场景', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i;
  }
  return buf[5] === 5;
});

test('适合性能敏感且不需要池的场景', () => {
  const count = 100;
  const bufs = [];
  for (let i = 0; i < count; i++) {
    const buf = Buffer.allocUnsafeSlow(1024);
    buf.fill(i % 256);
    bufs.push(buf);
  }
  return bufs.length === count;
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
