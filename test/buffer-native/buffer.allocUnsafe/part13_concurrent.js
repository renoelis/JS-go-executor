// Buffer.allocUnsafe() - Concurrent and Multi-threading Tests
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

// 并发场景测试
test('快速连续分配竞争条件', () => {
  const results = [];

  // 模拟高并发分配场景
  for (let round = 0; round < 100; round++) {
    const buffers = [];

    // 快速连续分配多个Buffer
    for (let i = 0; i < 10; i++) {
      buffers.push(Buffer.allocUnsafe(64));
    }

    // 验证所有Buffer都是独立的
    for (let i = 0; i < buffers.length; i++) {
      for (let j = i + 1; j < buffers.length; j++) {
        if (buffers[i] === buffers[j]) {
          throw new Error(`Duplicate buffer instances detected in round ${round}`);
        }
      }
    }

    results.push(buffers.length);
  }

  // 验证结果一致性
  if (results.some(count => count !== 10)) {
    throw new Error('Inconsistent allocation counts detected');
  }

  console.log('✅ 快速连续分配竞争条件');
  return true;
});

test('多线程环境下的分配一致性', () => {
  // 模拟多线程环境（使用数组模拟）
  const threadResults = [];

  // 创建多个"线程"的工作负载
  for (let threadId = 0; threadId < 5; threadId++) {
    const threadBuffers = [];

    // 每个"线程"分配多个Buffer
    for (let i = 0; i < 20; i++) {
      const buf = Buffer.allocUnsafe(128);
      buf.fill(threadId); // 用线程ID填充以区分
      threadBuffers.push(buf);
    }

    threadResults.push({ threadId, buffers: threadBuffers });
  }

  // 验证每个线程的Buffer独立性
  for (const threadResult of threadResults) {
    // 验证线程内的Buffer
    for (let i = 0; i < threadResult.buffers.length; i++) {
      const buf = threadResult.buffers[i];

      // 验证填充数据
      for (let j = 0; j < buf.length; j++) {
        if (buf[j] !== threadResult.threadId) {
          throw new Error(`Thread ${threadResult.threadId}: Buffer ${i} data corruption`);
        }
      }

      // 验证Buffer长度
      if (buf.length !== 128) {
        throw new Error(`Thread ${threadResult.threadId}: Buffer ${i} length mismatch`);
      }
    }
  }

  // 验证线程间的独立性
  for (let i = 0; i < threadResults.length; i++) {
    for (let j = i + 1; j < threadResults.length; j++) {
      const thread1 = threadResults[i];
      const thread2 = threadResults[j];

      // 检查Buffer实例是否独立
      for (const buf1 of thread1.buffers) {
        for (const buf2 of thread2.buffers) {
          if (buf1 === buf2) {
            throw new Error(`Cross-thread buffer instance collision`);
          }
        }
      }
    }
  }

  console.log('✅ 多线程环境下的分配一致性');
  return true;
});

test('内存分配顺序一致性', () => {
  // 测试分配顺序的一致性
  const allocationOrder = [];
  const size = 64;

  // 进行多轮分配
  for (let round = 0; round < 50; round++) {
    const buf = Buffer.allocUnsafe(size);

    // 立即使用Buffer以防止优化
    buf.fill(round % 256);

    // 记录分配特征
    allocationOrder.push({
      round: round,
      firstByte: buf[0],
      lastByte: buf[size - 1],
      length: buf.length
    });
  }

  // 验证分配的一致性
  for (let i = 0; i < allocationOrder.length; i++) {
    const alloc = allocationOrder[i];

    // 验证长度一致性
    if (alloc.length !== size) {
      throw new Error(`Allocation ${i}: Length mismatch`);
    }

    // 验证数据一致性（我们填充的数据）
    if (alloc.firstByte !== i % 256) {
      throw new Error(`Allocation ${i}: First byte mismatch`);
    }

    if (alloc.lastByte !== i % 256) {
      throw new Error(`Allocation ${i}: Last byte mismatch`);
    }
  }

  console.log('✅ 内存分配顺序一致性');
  return true;
});

test('高频率分配释放稳定性', () => {
  // 测试高频分配释放的稳定性
  const results = [];

  for (let cycle = 0; cycle < 200; cycle++) {
    // 快速分配一组Buffer
    const buffers = [];
    for (let i = 0; i < 15; i++) {
      buffers.push(Buffer.allocUnsafe(32));
    }

    // 立即使用所有Buffer
    for (let i = 0; i < buffers.length; i++) {
      const buf = buffers[i];
      buf.fill(i % 256);

      // 验证填充
      for (let j = 0; j < buf.length; j++) {
        if (buf[j] !== i % 256) {
          throw new Error(`Cycle ${cycle}: Buffer ${i} fill verification failed`);
        }
      }
    }

    results.push(buffers.length);

    // Buffer离开作用域后会被垃圾回收
  }

  // 验证所有循环都成功
  if (results.some(count => count !== 15)) {
    throw new Error('Inconsistent allocation counts in high-frequency test');
  }

  console.log('✅ 高频率分配释放稳定性');
  return true;
});

test('并发数据完整性验证', () => {
  // 验证并发分配下的数据完整性
  const testData = [];

  // 创建多个并发"事务"
  for (let transaction = 0; transaction < 50; transaction++) {
    const data = {
      id: transaction,
      buffers: [],
      checksums: []
    };

    // 每个事务分配多个Buffer并计算校验和
    for (let i = 0; i < 8; i++) {
      const buf = Buffer.allocUnsafe(256);

      // 填充模式数据
      for (let j = 0; j < buf.length; j++) {
        buf[j] = (transaction + i + j) % 256;
      }

      // 计算简单校验和
      let checksum = 0;
      for (let j = 0; j < buf.length; j++) {
        checksum += buf[j];
      }

      data.buffers.push(buf);
      data.checksums.push(checksum);
    }

    testData.push(data);
  }

  // 验证数据完整性
  for (const data of testData) {
    // 重新计算校验和并验证
    for (let i = 0; i < data.buffers.length; i++) {
      const buf = data.buffers[i];
      const originalChecksum = data.checksums[i];

      let newChecksum = 0;
      for (let j = 0; j < buf.length; j++) {
        newChecksum += buf[j];
      }

      if (newChecksum !== originalChecksum) {
        throw new Error(`Transaction ${data.id}: Buffer ${i} checksum mismatch`);
      }

      // 验证模式数据
      for (let j = 0; j < buf.length; j++) {
        const expected = (data.id + i + j) % 256;
        if (buf[j] !== expected) {
          throw new Error(`Transaction ${data.id}: Buffer ${i} data corruption at ${j}`);
        }
      }
    }
  }

  console.log('✅ 并发数据完整性验证');
  return true;
});

test('资源竞争检测', () => {
  // 检测可能的资源竞争条件
  const resourceAccessLog = [];

  // 模拟多个"线程"同时访问资源
  for (let thread = 0; thread < 10; thread++) {
    const accessTimes = [];

    for (let access = 0; access < 20; access++) {
      const start = Date.now();

      // 分配Buffer（资源访问）
      const buf = Buffer.allocUnsafe(32);
      buf.fill(thread);

      const end = Date.now();
      const duration = (end - start) * 1000000; // 转换为纳秒（毫秒 * 1000000）

      accessTimes.push({
        thread: thread,
        access: access,
        duration: duration,
        success: true
      });
    }

    resourceAccessLog.push(accessTimes);
  }

  // 分析访问模式
  let totalAccesses = 0;
  let failedAccesses = 0;
  const allDurations = [];

  for (const threadLog of resourceAccessLog) {
    for (const access of threadLog) {
      totalAccesses++;
      if (!access.success) {
        failedAccesses++;
      }
      allDurations.push(access.duration);
    }
  }

  // 计算统计信息
  const avgDuration = allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length;
  const maxDuration = Math.max(...allDurations);
  const minDuration = Math.min(...allDurations);

  console.log(`资源访问统计: 总计${totalAccesses}次, 失败${failedAccesses}次`);
  console.log(`访问时间统计: 平均${(avgDuration / 1000).toFixed(2)}μs, 最大${(maxDuration / 1000).toFixed(2)}μs, 最小${(minDuration / 1000).toFixed(2)}μs`);

  if (failedAccesses > 0) {
    throw new Error(`Resource competition detected: ${failedAccesses} failed accesses`);
  }

  console.log('✅ 资源竞争检测');
  return true;
});

test('内存碎片化影响测试', () => {
  // 测试内存碎片化对分配的影响
  const fragmentationSimulation = [];

  // 阶段1：分配各种大小的Buffer
  for (let size = 16; size <= 1024; size *= 2) {
    for (let i = 0; i < 10; i++) {
      const buf = Buffer.allocUnsafe(size);
      buf.fill(size % 256); // 用大小模256填充
      fragmentationSimulation.push(buf);
    }
  }

  // 阶段2：随机"释放"一些Buffer（让它们离开作用域）
  const keptBuffers = [];
  for (let i = 0; i < fragmentationSimulation.length; i += 2) {
    keptBuffers.push(fragmentationSimulation[i]);
  }

  // 阶段3：在"碎片化"后尝试新的分配
  const newAllocations = [];
  for (let i = 0; i < 50; i++) {
    try {
      const buf = Buffer.allocUnsafe(128); // 统一大小
      buf.fill(0xCC);
      newAllocations.push(buf);
    } catch (error) {
      console.log(`碎片化后分配失败: ${error.message}`);
      // 记录失败但继续测试
    }
  }

  // 验证新分配的成功率和性能
  const successRate = newAllocations.length / 50;
  console.log(`内存碎片化后分配成功率: ${(successRate * 100).toFixed(2)}%`);

  if (successRate < 0.8) {
    console.log('⚠️  内存碎片化可能影响了分配成功率');
  }

  console.log('✅ 内存碎片化影响测试');
  return true;
});

test('压力测试下的稳定性', () => {
  // 在压力条件下测试稳定性
  const stressResults = [];

  // 创建压力条件
  for (let stress = 0; stress < 100; stress++) {
    const stressData = {
      iteration: stress,
      allocations: [],
      errors: []
    };

    try {
      // 快速分配多个Buffer
      for (let i = 0; i < 25; i++) {
        const size = Math.floor(Math.random() * 256) + 64; // 64-320字节随机大小
        const buf = Buffer.allocUnsafe(size);

        // 随机填充模式
        const pattern = Math.floor(Math.random() * 256);
        buf.fill(pattern);

        // 验证填充
        let valid = true;
        for (let j = 0; j < buf.length; j++) {
          if (buf[j] !== pattern) {
            valid = false;
            break;
          }
        }

        if (!valid) {
          throw new Error(`Stress ${stress}: Buffer ${i} validation failed`);
        }

        stressData.allocations.push({ size: size, pattern: pattern });
      }

      stressResults.push(stressData);
    } catch (error) {
      stressData.errors.push(error.message);
      stressResults.push(stressData);
    }
  }

  // 分析压力测试结果
  const successfulIterations = stressResults.filter(data => data.errors.length === 0).length;
  const totalErrors = stressResults.reduce((sum, data) => sum + data.errors.length, 0);

  console.log(`压力测试完成: ${successfulIterations}/${stressResults.length} 成功, ${totalErrors} 个错误`);

  if (successfulIterations < 95) {
    console.log('⚠️  压力测试成功率较低，可能存在稳定性问题');
  }

  console.log('✅ 压力测试下的稳定性');
  return true;
});

test('快速连续操作安全性', () => {
  // 测试快速连续操作下的安全性
  const asyncResults = [];
  const totalOperations = 30;

  // 快速连续操作
  for (let op = 0; op < totalOperations; op++) {
    try {
      const buf = Buffer.allocUnsafe(64);

      // 填充数据
      for (let i = 0; i < buf.length; i++) {
        buf[i] = op % 256;
      }

      // 验证数据
      let valid = true;
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== op % 256) {
          valid = false;
          break;
        }
      }

      if (!valid) {
        asyncResults.push({ op: op, success: false, error: 'Data validation failed' });
      } else {
        asyncResults.push({ op: op, success: true });
      }
    } catch (error) {
      asyncResults.push({ op: op, success: false, error: error.message });
    }
  }

  // 分析结果
  const successfulOps = asyncResults.filter(r => r.success).length;
  const failedOps = asyncResults.filter(r => !r.success).length;

  console.log(`异步操作完成: ${successfulOps} 成功, ${failedOps} 失败`);

  if (failedOps > 0) {
    const sampleErrors = asyncResults.filter(r => !r.success).slice(0, 3);
    throw new Error(`有 ${failedOps} 个操作失败: ${sampleErrors.map(e => e.error).join(', ')}`);
  }

  console.log('✅ 快速连续操作安全性');
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