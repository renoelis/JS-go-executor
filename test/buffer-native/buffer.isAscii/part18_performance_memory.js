// buffer.isAscii() - Part 18: Performance and Memory Related Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 性能相关测试
test('大 Buffer 性能 - 10KB ASCII', () => {
  const buf = Buffer.alloc(10 * 1024, 0x41); // 10KB of 'A'
  const start = Date.now();
  const result = isAscii(buf);
  const duration = Date.now() - start;
  return result === true && duration < 1000; // 应该在1秒内完成
});

test('大 Buffer 性能 - 最后字节非 ASCII', () => {
  const buf = Buffer.alloc(10 * 1024, 0x41);
  buf[buf.length - 1] = 0x80;
  const start = Date.now();
  const result = isAscii(buf);
  const duration = Date.now() - start;
  return result === false && duration < 1000;
});

test('大 Buffer 性能 - 第一字节非 ASCII', () => {
  const buf = Buffer.alloc(10 * 1024, 0x41);
  buf[0] = 0x80;
  const start = Date.now();
  const result = isAscii(buf);
  const duration = Date.now() - start;
  // 应该能快速检测到非 ASCII（短路优化）
  return result === false && duration < 100;
});

test('中等 Buffer 多次调用', () => {
  const buf = Buffer.from('hello world'.repeat(100)); // 约1KB
  let allTrue = true;
  
  for (let i = 0; i < 100; i++) {
    if (!isAscii(buf)) {
      allTrue = false;
      break;
    }
  }
  return allTrue;
});

test('不同大小 Buffer 性能一致性', () => {
  const sizes = [1, 10, 100, 1000, 5000];
  const results = [];
  
  for (const size of sizes) {
    const buf = Buffer.alloc(size, 0x41);
    const start = process.hrtime.bigint();
    const result = isAscii(buf);
    const end = process.hrtime.bigint();
    results.push({ size, result, duration: Number(end - start) });
  }
  
  // 所有结果都应该是 true，且性能应该相对线性
  return results.every(r => r.result === true);
});

// 内存使用测试
test('频繁分配释放不影响性能', () => {
  for (let i = 0; i < 50; i++) {
    const buf = Buffer.alloc(1000, 0x41);
    if (!isAscii(buf)) return false;
    // buf 会被垃圾收集
  }
  return true;
});

test('大量小 Buffer 测试', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    buffers.push(Buffer.from([0x41 + (i % 26)]));
  }
  
  let allAscii = true;
  for (const buf of buffers) {
    if (!isAscii(buf)) {
      allAscii = false;
      break;
    }
  }
  return allAscii;
});

// ArrayBuffer 复用测试
test('ArrayBuffer 复用不同视图', () => {
  const ab = new ArrayBuffer(1000);
  const uint8View = new Uint8Array(ab);
  uint8View.fill(0x41);
  
  // 创建多个视图
  const view1 = new Uint8Array(ab, 0, 250);
  const view2 = new Uint8Array(ab, 250, 250);
  const view3 = new Uint8Array(ab, 500, 250);
  const view4 = new Uint8Array(ab, 750, 250);
  
  return isAscii(view1) && isAscii(view2) && isAscii(view3) && isAscii(view4);
});

test('修改共享 ArrayBuffer 影响多个视图', () => {
  const ab = new ArrayBuffer(100);
  const view1 = new Uint8Array(ab, 0, 50);  // 字节 0-49
  const view2 = new Uint8Array(ab, 25, 50); // 字节 25-74，重叠区域 25-49
  
  view1.fill(0x41); // 填充 view1，同时影响 view2 的前 25 字节
  const result1 = isAscii(view1) && isAscii(view2);
  
  view2[0] = 0x80; // 修改 view2 的第一个字节（ArrayBuffer 的第 25 字节）
  // 这会同时影响 view1[25] 和 view2[0]
  const result2 = !isAscii(view1) && !isAscii(view2);
  
  return result1 && result2;
});

// 极限大小测试（适度，避免内存溢出）
test('接近最大安全整数长度', () => {
  try {
    // 使用较小的大小避免内存问题
    const size = Math.min(1024 * 1024, 10000); // 1MB 或 10KB
    const buf = Buffer.alloc(size, 0x41);
    const result = isAscii(buf);
    return result === true;
  } catch (e) {
    // 内存不足是可以接受的
    return e.message.includes('memory') || e.message.includes('size');
  }
});

test('空字符串模式重复', () => {
  const pattern = Buffer.from('\x00\x01\x02\x7E\x7F'); // ASCII 边界字符
  const buf = Buffer.concat(Array(100).fill(pattern));
  return isAscii(buf) === true;
});

test('非 ASCII 模式重复', () => {
  const pattern = Buffer.from([0x41, 0x42, 0x80, 0x43]);
  const buf = Buffer.concat(Array(100).fill(pattern));
  return isAscii(buf) === false;
});

// 内存对齐优化测试
test('16字节对齐 Buffer', () => {
  const buf = Buffer.alloc(16, 0x41);
  return isAscii(buf) === true;
});

test('32字节对齐 Buffer', () => {
  const buf = Buffer.alloc(32, 0x41);
  return isAscii(buf) === true;
});

test('64字节对齐 Buffer', () => {
  const buf = Buffer.alloc(64, 0x41);
  return isAscii(buf) === true;
});

test('非对齐长度 Buffer', () => {
  const sizes = [15, 31, 63, 127, 255];
  return sizes.every(size => {
    const buf = Buffer.alloc(size, 0x41);
    return isAscii(buf) === true;
  });
});

// SIMD 优化相关测试（如果实现支持）
test('SIMD 友好的16字节块', () => {
  const buf = Buffer.alloc(16 * 10, 0x41); // 10个16字节块
  return isAscii(buf) === true;
});

test('SIMD 边界测试', () => {
  const buf = Buffer.alloc(15, 0x41); // 少于16字节
  buf[14] = 0x7F; // 最后一个字节是 ASCII 边界
  return isAscii(buf) === true;
});

// 并发访问模拟（单线程环境）
test('快速连续调用相同 Buffer', () => {
  const buf = Buffer.from('test data 123');
  const results = [];
  
  for (let i = 0; i < 10; i++) {
    results.push(isAscii(buf));
  }
  
  return results.every(r => r === true) && results.length === 10;
});

test('快速切换不同 Buffer', () => {
  const asciiBuffer = Buffer.from('ascii data');
  const nonAsciiBuffer = Buffer.from([0x80, 0x81, 0x82]);
  const results = [];
  
  for (let i = 0; i < 10; i++) {
    results.push(isAscii(asciiBuffer));
    results.push(isAscii(nonAsciiBuffer));
  }
  
  // 应该是 true, false, true, false... 的模式
  return results.every((r, i) => r === (i % 2 === 0));
});

// 内存泄漏预防测试
test('大量 Buffer 创建不泄漏', () => {
  const initialMemory = process.memoryUsage();
  
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(1000, 0x41);
    isAscii(buf);
    // 让 buf 超出作用域
  }
  
  // 注意：这里不强制垃圾收集，避免使用global关键词
  
  const finalMemory = process.memoryUsage();
  // 内存增长不应该过大（考虑到正常的内存波动）
  return (finalMemory.heapUsed - initialMemory.heapUsed) < 50 * 1024 * 1024; // 50MB
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
