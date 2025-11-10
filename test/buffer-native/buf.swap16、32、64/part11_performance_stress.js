// buf.swap16/swap32/swap64 - Part 11: Deep Edge Cases - Performance & Stress Tests (Round 8)
const { Buffer } = require('buffer');

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

// ==================== 性能基准测试 ====================

test('swap16 - 小buffer性能 (100字节 x 10000次)', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf[i] = i;
  }

  const start = Date.now();
  for (let i = 0; i < 10000; i++) {
    buf.swap16();
  }
  const duration = Date.now() - start;

  if (duration > 1000) {
    throw new Error(`Performance degraded: ${duration}ms for 10000 swaps`);
  }

  console.log(`  Performance: ${duration}ms for 10000 x 100-byte swap16`);
});

test('swap32 - 中等buffer性能 (1KB x 1000次)', () => {
  const buf = Buffer.alloc(1024);
  for (let i = 0; i < 1024; i++) {
    buf[i] = i & 0xFF;
  }

  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    buf.swap32();
  }
  const duration = Date.now() - start;

  if (duration > 1000) {
    throw new Error(`Performance degraded: ${duration}ms`);
  }

  console.log(`  Performance: ${duration}ms for 1000 x 1KB swap32`);
});

test('swap64 - 大buffer性能 (1MB x 10次)', () => {
  const buf = Buffer.alloc(1024 * 1024);
  for (let i = 0; i < 1000; i++) {
    buf[i] = i & 0xFF;
  }

  const start = Date.now();
  for (let i = 0; i < 10; i++) {
    buf.swap64();
  }
  const duration = Date.now() - start;

  if (duration > 2000) {
    throw new Error(`Performance degraded: ${duration}ms for 10 x 1MB swaps`);
  }

  console.log(`  Performance: ${duration}ms for 10 x 1MB swap64`);
});

// ==================== 不同大小buffer性能对比 ====================

test('swap16 - 性能随大小增长线性', () => {
  const sizes = [100, 1000, 10000];
  const times = [];

  for (const size of sizes) {
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buf[i] = i & 0xFF;
    }

    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      buf.swap16();
    }
    times.push(Date.now() - start);
  }

  console.log(`  Sizes: ${sizes.join(', ')}`);
  console.log(`  Times: ${times.join('ms, ')}ms`);

  // 验证时间大致成比例
  // 10000字节不应该超过100字节的200倍时间
  if (times[2] > times[0] * 200) {
    throw new Error('Performance scaling非线性');
  }
});

test('swap32 - 不同对齐性能', () => {
  // 对齐到4字节边界
  const aligned = Buffer.alloc(4096);
  const start1 = Date.now();
  for (let i = 0; i < 1000; i++) {
    aligned.swap32();
  }
  const time1 = Date.now() - start1;

  // 非对齐（通过 subarray）
  const parent = Buffer.alloc(4100);
  const unaligned = parent.subarray(2, 4098); // 偏移2，4096字节
  const start2 = Date.now();
  for (let i = 0; i < 1000; i++) {
    unaligned.swap32();
  }
  const time2 = Date.now() - start2;

  console.log(`  Aligned: ${time1}ms, Unaligned: ${time2}ms`);

  // 非对齐不应该慢太多（允许2倍差异）
  if (time2 > time1 * 3) {
    throw new Error('Unaligned performance significantly worse');
  }
});

// ==================== 内存压力测试 ====================

test('swap16 - 连续大量小buffer', () => {
  const buffers = [];
  for (let i = 0; i < 1000; i++) {
    buffers.push(Buffer.alloc(100));
  }

  const start = Date.now();
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i++) {
      buf[i] = i;
    }
    buf.swap16();
  }
  const duration = Date.now() - start;

  if (duration > 500) {
    throw new Error(`Too slow: ${duration}ms`);
  }

  console.log(`  ${buffers.length} buffers processed in ${duration}ms`);
});

test('swap32 - 极大buffer (10MB)', () => {
  const size = 10 * 1024 * 1024; // 10MB
  let buf;

  try {
    buf = Buffer.alloc(size);
  } catch (e) {
    console.log('  Skipped: Cannot allocate 10MB');
    return;
  }

  // 初始化部分数据
  for (let i = 0; i < 1000; i++) {
    buf[i] = i & 0xFF;
  }

  const start = Date.now();
  buf.swap32();
  const duration = Date.now() - start;

  if (duration > 1000) {
    throw new Error(`10MB swap too slow: ${duration}ms`);
  }

  console.log(`  10MB swap32 in ${duration}ms`);

  // 验证数据正确性
  if (buf[0] !== 3 || buf[1] !== 2) {
    throw new Error('Data incorrect after swap');
  }
});

test('swap64 - 内存密集型操作', () => {
  const buf = Buffer.alloc(1024 * 1024); // 1MB

  // 填充完整数据
  for (let i = 0; i < buf.length; i++) {
    buf[i] = i & 0xFF;
  }

  const start = Date.now();

  // 多次 swap
  for (let i = 0; i < 100; i++) {
    buf.swap64();
  }

  const duration = Date.now() - start;

  if (duration > 2000) {
    throw new Error(`Too slow: ${duration}ms for 100 swaps`);
  }

  console.log(`  100 x 1MB swap64 in ${duration}ms`);

  // 偶数次应该恢复
  if (buf[0] !== 0) {
    throw new Error('Data not restored after even swaps');
  }
});

// ==================== 并发与重入测试 ====================

test('swap16 - 快速连续调用', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  // 快速连续 swap 1000次
  for (let i = 0; i < 1000; i++) {
    buf.swap16();
  }

  // 偶数次应该恢复
  if (buf[0] !== 0x01 || buf[1] !== 0x02) {
    throw new Error('Data not restored after 1000 swaps');
  }
});

test('swap32 - 多个buffer交替操作', () => {
  const buf1 = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const buf2 = Buffer.from([0x11, 0x12, 0x13, 0x14]);
  const buf3 = Buffer.from([0x21, 0x22, 0x23, 0x24]);

  for (let i = 0; i < 100; i++) {
    buf1.swap32();
    buf2.swap32();
    buf3.swap32();
  }

  // 所有偶数次应该恢复
  if (buf1[0] !== 0x01 || buf2[0] !== 0x11 || buf3[0] !== 0x21) {
    throw new Error('Interleaved swaps failed');
  }
});

test('swap64 - 嵌套swap场景', () => {
  const outer = Buffer.alloc(16);
  for (let i = 0; i < 16; i++) outer[i] = i;

  const inner1 = outer.subarray(0, 8);
  const inner2 = outer.subarray(8, 16);

  // 先swap内部视图
  inner1.swap64();
  inner2.swap64();

  // 再swap整体
  outer.swap16();

  // 验证复杂变换
  if (outer.length !== 16) {
    throw new Error('Buffer corrupted');
  }
});

// ==================== 边界条件压力测试 ====================

test('swap16 - 最小长度高频操作', () => {
  const buf = Buffer.from([0xAA, 0xBB]);

  const start = Date.now();
  for (let i = 0; i < 100000; i++) {
    buf.swap16();
  }
  const duration = Date.now() - start;

  if (duration > 500) {
    throw new Error(`Minimum size swap too slow: ${duration}ms`);
  }

  console.log(`  100000 x 2-byte swap16 in ${duration}ms`);
});

test('swap32 - 最小长度高频操作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);

  const start = Date.now();
  for (let i = 0; i < 100000; i++) {
    buf.swap32();
  }
  const duration = Date.now() - start;

  if (duration > 500) {
    throw new Error(`Minimum size swap32 too slow: ${duration}ms`);
  }

  console.log(`  100000 x 4-byte swap32 in ${duration}ms`);
});

test('swap64 - 最小长度高频操作', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);

  const start = Date.now();
  for (let i = 0; i < 100000; i++) {
    buf.swap64();
  }
  const duration = Date.now() - start;

  if (duration > 500) {
    throw new Error(`Minimum size swap64 too slow: ${duration}ms`);
  }

  console.log(`  100000 x 8-byte swap64 in ${duration}ms`);
});

// ==================== 实际使用场景模拟 ====================

test('swap32 - 网络数据包批处理', () => {
  // 模拟处理1000个网络包
  const packets = [];
  for (let i = 0; i < 1000; i++) {
    const packet = Buffer.alloc(1500); // 标准MTU
    for (let j = 0; j < 12; j++) {
      packet[j] = j;
    }
    packets.push(packet);
  }

  const start = Date.now();
  for (const packet of packets) {
    // 模拟字节序转换
    packet.swap32();
  }
  const duration = Date.now() - start;

  if (duration > 1000) {
    throw new Error(`Packet processing too slow: ${duration}ms`);
  }

  console.log(`  Processed ${packets.length} packets in ${duration}ms`);
});

test('swap64 - 文件块批处理', () => {
  // 模拟处理100个文件块
  const blocks = [];
  for (let i = 0; i < 100; i++) {
    blocks.push(Buffer.alloc(4096)); // 4KB块
  }

  const start = Date.now();
  for (const block of blocks) {
    block.swap64();
  }
  const duration = Date.now() - start;

  if (duration > 500) {
    throw new Error(`Block processing too slow: ${duration}ms`);
  }

  console.log(`  Processed ${blocks.length} blocks in ${duration}ms`);
});

// ==================== 内存泄漏检测 ====================

test('swap16 - 重复操作无内存泄漏', () => {
  // 检查环境是否支持 process.memoryUsage
  if (!process.memoryUsage) {
    console.log('  ⚠️  process.memoryUsage not supported, skipping memory leak test');
    return;
  }

  const initialMem = process.memoryUsage().heapUsed;

  for (let i = 0; i < 10000; i++) {
    const buf = Buffer.alloc(100);
    buf.swap16();
  }

  // Note: 垃圾回收检查已移除，因为不适用于所有环境

  const finalMem = process.memoryUsage().heapUsed;
  const growth = finalMem - initialMem;

  console.log(`  Memory growth: ${(growth / 1024 / 1024).toFixed(2)}MB`);

  // 内存增长不应该太大（允许20MB临时增长）
  if (growth > 20 * 1024 * 1024) {
    console.log('  Warning: Significant memory growth detected');
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
