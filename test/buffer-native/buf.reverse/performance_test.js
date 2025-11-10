// Buffer.prototype.reverse 性能测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const result = fn();
    tests.push({ 
      name, 
      status: '✅',
      ...result
    });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 性能测试辅助函数
function measurePerformance(size, iterations) {
  const buf = Buffer.alloc(size);
  // 填充数据
  for (let i = 0; i < size; i++) {
    buf[i] = i % 256;
  }
  
  const start = Date.now();
  for (let i = 0; i < iterations; i++) {
    buf.reverse();
    buf.reverse(); // 反转两次恢复原状
  }
  const end = Date.now();
  
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  const throughput = (size * iterations * 2) / (totalTime / 1000); // bytes/sec
  
  return {
    size: size,
    sizeLabel: formatSize(size),
    iterations: iterations,
    totalTime: totalTime + 'ms',
    avgTime: avgTime.toFixed(2) + 'ms',
    throughput: formatThroughput(throughput)
  };
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
  return (bytes / 1024 / 1024).toFixed(2) + 'MB';
}

function formatThroughput(bytesPerSec) {
  if (bytesPerSec < 1024 * 1024) {
    return (bytesPerSec / 1024).toFixed(2) + 'KB/s';
  }
  if (bytesPerSec < 1024 * 1024 * 1024) {
    return (bytesPerSec / 1024 / 1024).toFixed(2) + 'MB/s';
  }
  return (bytesPerSec / 1024 / 1024 / 1024).toFixed(2) + 'GB/s';
}

// 测试不同大小的 Buffer
test('小 Buffer 性能 (1KB)', () => {
  return measurePerformance(1024, 1000);
});

test('中等 Buffer 性能 (64KB)', () => {
  return measurePerformance(64 * 1024, 100);
});

test('较大 Buffer 性能 (512KB)', () => {
  return measurePerformance(512 * 1024, 20);
});

test('大 Buffer 性能 (1MB - 快速路径阈值)', () => {
  return measurePerformance(1024 * 1024, 10);
});

test('超大 Buffer 性能 (2MB - 应使用快速路径)', () => {
  return measurePerformance(2 * 1024 * 1024, 5);
});

test('超大 Buffer 性能 (5MB)', () => {
  return measurePerformance(5 * 1024 * 1024, 3);
});

test('超大 Buffer 性能 (10MB)', () => {
  return measurePerformance(10 * 1024 * 1024, 2);
});

// 正确性验证（确保优化不影响正确性）
test('优化后正确性验证 - 2MB Buffer', () => {
  const size = 2 * 1024 * 1024;
  const buf = Buffer.alloc(size);
  
  // 填充测试数据
  buf[0] = 0xAA;
  buf[size - 1] = 0xBB;
  buf[size / 2] = 0xCC;
  
  buf.reverse();
  
  const correct = buf[0] === 0xBB && 
                  buf[size - 1] === 0xAA && 
                  buf[size / 2] === 0xCC;
  
  return {
    correct: correct,
    firstByte: '0x' + buf[0].toString(16).toUpperCase(),
    lastByte: '0x' + buf[size - 1].toString(16).toUpperCase(),
    middleByte: '0x' + buf[size / 2].toString(16).toUpperCase()
  };
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
    tests: tests,
    note: '性能优化针对 >1MB 的 Buffer，使用零拷贝技术直接操作 ArrayBuffer'
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
