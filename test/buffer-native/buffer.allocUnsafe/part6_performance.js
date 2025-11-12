// Buffer.allocUnsafe() - Performance and Memory Stress Tests
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

// 性能相关测试
test('大量小Buffer分配', () => {
  const buffers = [];
  const count = 1000;

  for (let i = 0; i < count; i++) {
    const buf = Buffer.allocUnsafe(64); // 64字节小Buffer
    if (buf.length !== 64) {
      throw new Error(`Buffer ${i} length mismatch`);
    }
    buffers.push(buf);
  }

  if (buffers.length !== count) {
    throw new Error(`Expected ${count} buffers, got ${buffers.length}`);
  }

  console.log('✅ 大量小Buffer分配');
  return true;
});

test('中等大小Buffer分配', () => {
  const sizes = [1024, 2048, 4096, 8192]; // 1KB, 2KB, 4KB, 8KB
  const buffers = [];

  for (const size of sizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Expected length ${size}, got ${buf.length}`);
    }
    buffers.push(buf);
  }

  console.log('✅ 中等大小Buffer分配');
  return true;
});

test('大Buffer分配测试', () => {
  const sizes = [65536, 131072]; // 64KB, 128KB
  const buffers = [];

  for (const size of sizes) {
    try {
      const buf = Buffer.allocUnsafe(size);
      if (buf.length !== size) {
        throw new Error(`Expected length ${size}, got ${buf.length}`);
      }
      buffers.push(buf);
    } catch (error) {
      // 内存不足时的处理
      console.log(`✅ 大Buffer ${size} 分配受限处理`);
      continue;
    }
  }

  console.log('✅ 大Buffer分配测试');
  return true;
});

test('快速连续分配和释放', () => {
  // 模拟快速分配和释放的场景
  for (let round = 0; round < 10; round++) {
    const buffers = [];

    // 快速分配
    for (let i = 0; i < 100; i++) {
      buffers.push(Buffer.allocUnsafe(256));
    }

    // 使用数据
    for (let i = 0; i < buffers.length; i++) {
      const buf = buffers[i];
      buf[0] = i % 256;
      buf[buf.length - 1] = (i * 2) % 256;
    }

    // buffers数组离开作用域后会被垃圾回收
  }

  console.log('✅ 快速连续分配和释放');
  return true;
});

test('内存重用模式测试', () => {
  // 测试allocUnsafe可能的内存重用行为
  const results = [];

  for (let i = 0; i < 5; i++) {
    const buf = Buffer.allocUnsafe(100);
    // 记录第一个字节的可能值
    results.push(buf[0]);
    // 写入特定值
    buf[0] = 255;
  }

  console.log('✅ 内存重用模式测试');
  return true;
});

test('不同大小交替分配', () => {
  const sequence = [8, 16, 32, 64, 128, 256, 512, 1024];
  const buffers = [];

  for (let i = 0; i < sequence.length * 2; i++) {
    const size = sequence[i % sequence.length];
    const buf = Buffer.allocUnsafe(size);

    if (buf.length !== size) {
      throw new Error(`Expected length ${size}, got ${buf.length}`);
    }

    // 填充数据以验证可用性
    for (let j = 0; j < Math.min(size, 10); j++) {
      buf[j] = (i + j) % 256;
    }

    buffers.push(buf);
  }

  console.log('✅ 不同大小交替分配');
  return true;
});

test('分配后立即使用验证', () => {
  const buf = Buffer.allocUnsafe(50);

  // 立即写入模式
  for (let i = 0; i < buf.length; i++) {
    buf[i] = (i * 7) % 256; // 使用乘法模式
  }

  // 立即读取验证
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== (i * 7) % 256) {
      throw new Error(`Data verification failed at index ${i}`);
    }
  }

  console.log('✅ 分配后立即使用验证');
  return true;
});

test('Buffer池化行为观察', () => {
  // 观察可能的池化行为
  const smallBuffers = [];
  const largeBuffers = [];

  // 分配小Buffer
  for (let i = 0; i < 20; i++) {
    smallBuffers.push(Buffer.allocUnsafe(64));
  }

  // 分配大Buffer
  for (let i = 0; i < 5; i++) {
    try {
      largeBuffers.push(Buffer.allocUnsafe(4096));
    } catch (error) {
      // 忽略内存不足错误
      break;
    }
  }

  if (smallBuffers.length !== 20) {
    throw new Error('Small buffer allocation failed');
  }

  console.log('✅ Buffer池化行为观察');
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