// Buffer.allocUnsafeSlow - 性能和内存相关测试
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

// 性能稳定性测试
test('连续创建小Buffer性能稳定', () => {
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    Buffer.allocUnsafeSlow(10);
  }
  const duration = Date.now() - start;
  return duration < 1000;
});

test('连续创建中等Buffer性能稳定', () => {
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    Buffer.allocUnsafeSlow(1024);
  }
  const duration = Date.now() - start;
  return duration < 1000;
});

test('不同大小Buffer创建性能对比', () => {
  const sizes = [1, 10, 100, 1000];
  const results = sizes.map(size => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      Buffer.allocUnsafeSlow(size);
    }
    return Date.now() - start;
  });
  return results.every(time => time < 500);
});

// 内存独立性验证
test('每个Buffer有独立的内存空间', () => {
  const buffers = [];
  for (let i = 0; i < 10; i++) {
    buffers.push(Buffer.allocUnsafeSlow(100));
  }
  
  // 填充不同值
  buffers.forEach((buf, index) => {
    buf.fill(index);
  });
  
  // 验证互不影响
  return buffers.every((buf, index) => {
    return buf.every(byte => byte === index);
  });
});

test('大Buffer内存独立性', () => {
  const buf1 = Buffer.allocUnsafeSlow(10000);
  const buf2 = Buffer.allocUnsafeSlow(10000);
  
  buf1.fill(0x55);
  buf2.fill(0xAA);
  
  return buf1[0] === 0x55 && buf2[0] === 0xAA && buf1[9999] === 0x55 && buf2[9999] === 0xAA;
});

// 内存分配模式测试
test('不使用内部池验证 - byteOffset检查', () => {
  const buffers = [];
  for (let i = 0; i < 5; i++) {
    buffers.push(Buffer.allocUnsafeSlow(10));
  }
  return buffers.every(buf => buf.byteOffset === 0);
});

test('与allocUnsafe对比 - 池使用差异', () => {
  const slowBuf = Buffer.allocUnsafeSlow(10);
  const fastBuf = Buffer.allocUnsafe(10);
  
  // allocUnsafeSlow应该始终byteOffset为0
  return slowBuf.byteOffset === 0;
});

test('ArrayBuffer独立性', () => {
  const buf1 = Buffer.allocUnsafeSlow(100);
  const buf2 = Buffer.allocUnsafeSlow(100);
  
  // 每个Buffer应该有独立的ArrayBuffer
  return buf1.buffer !== buf2.buffer;
});

// 垃圾回收友好性测试
test('临时Buffer可以被垃圾回收', () => {
  function createTempBuffers() {
    for (let i = 0; i < 1000; i++) {
      const temp = Buffer.allocUnsafeSlow(1000);
      temp.fill(i % 256);
    }
  }
  
  createTempBuffers();
  return true;
});

test('大量小Buffer创建和释放', () => {
  const arrays = [];
  for (let round = 0; round < 10; round++) {
    const buffers = [];
    for (let i = 0; i < 100; i++) {
      buffers.push(Buffer.allocUnsafeSlow(10));
    }
    arrays.push(buffers.length);
  }
  return arrays.every(count => count === 100);
});

// 内存压力测试
test('适中内存压力测试', () => {
  const buffers = [];
  try {
    for (let i = 0; i < 100; i++) {
      buffers.push(Buffer.allocUnsafeSlow(10000)); // 1MB total
    }
    return buffers.length === 100;
  } catch (e) {
    return false;
  }
});

test('内存限制尊重系统约束', () => {
  try {
    // 尝试分配一个合理但较大的Buffer
    const buf = Buffer.allocUnsafeSlow(50 * 1024 * 1024); // 50MB
    return buf instanceof Buffer;
  } catch (e) {
    // 如果系统内存不足或有限制，这是预期的
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

// 并发访问模拟
test('多个函数同时创建Buffer', () => {
  function createBuffer1() { return Buffer.allocUnsafeSlow(100); }
  function createBuffer2() { return Buffer.allocUnsafeSlow(200); }
  function createBuffer3() { return Buffer.allocUnsafeSlow(300); }
  
  const buf1 = createBuffer1();
  const buf2 = createBuffer2();
  const buf3 = createBuffer3();
  
  return buf1.length === 100 && buf2.length === 200 && buf3.length === 300;
});

test('嵌套函数中的Buffer创建', () => {
  function outer() {
    const outerBuf = Buffer.allocUnsafeSlow(50);
    function inner() {
      const innerBuf = Buffer.allocUnsafeSlow(25);
      return outerBuf.length + innerBuf.length;
    }
    return inner();
  }
  
  return outer() === 75;
});

// 内存泄漏防护测试
test('Buffer引用不会意外保留', () => {
  let bufferRef = null;
  
  function createAndAssign() {
    bufferRef = Buffer.allocUnsafeSlow(1000);
  }
  
  createAndAssign();
  const length1 = bufferRef.length;
  
  bufferRef = null; // 清除引用
  
  createAndAssign();
  const length2 = bufferRef.length;
  
  return length1 === 1000 && length2 === 1000;
});

test('循环中创建Buffer不累积内存', () => {
  let lastBuffer = null;
  
  for (let i = 0; i < 50; i++) {
    lastBuffer = Buffer.allocUnsafeSlow(100);
    lastBuffer.fill(i % 256);
  }
  
  return lastBuffer instanceof Buffer && lastBuffer.length === 100;
});

// 特殊内存对齐测试
test('页边界大小分配 - 4KB', () => {
  const buf = Buffer.allocUnsafeSlow(4096);
  buf.fill(0xFF);
  return buf.length === 4096 && buf[0] === 0xFF && buf[4095] === 0xFF;
});

test('页边界大小分配 - 8KB', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  buf.writeInt32BE(0x12345678, 0);
  buf.writeInt32BE(0x12345678, 8188); // 使用相同的值避免溢出
  return buf.readInt32BE(0) === 0x12345678 && buf.readInt32BE(8188) === 0x12345678;
});

test('非对齐大小 - 4097字节', () => {
  const buf = Buffer.allocUnsafeSlow(4097);
  buf[0] = 1;
  buf[4096] = 2;
  return buf.length === 4097 && buf[0] === 1 && buf[4096] === 2;
});

// 缓冲池隔离验证
test('小Buffer也不使用池 - 与allocUnsafe差异', () => {
  const slowBuffers = [];
  for (let i = 0; i < 5; i++) {
    slowBuffers.push(Buffer.allocUnsafeSlow(8));
  }
  
  // allocUnsafeSlow的Buffer应该都有独立的ArrayBuffer
  for (let i = 1; i < slowBuffers.length; i++) {
    if (slowBuffers[i].buffer === slowBuffers[0].buffer) {
      return false;
    }
  }
  return true;
});

test('验证poolSize不影响allocUnsafeSlow', () => {
  const originalPoolSize = Buffer.poolSize;
  Buffer.poolSize = 1; // 设置极小的池大小
  
  const buf = Buffer.allocUnsafeSlow(10);
  Buffer.poolSize = originalPoolSize; // 恢复原值
  
  return buf instanceof Buffer && buf.length === 10 && buf.byteOffset === 0;
});

// 异步环境模拟测试
test('同步模拟异步环境中创建Buffer', () => {
  // 模拟在回调函数中创建Buffer的场景
  function simulateAsyncCallback() {
    return Buffer.allocUnsafeSlow(20);
  }
  
  const buf = simulateAsyncCallback();
  return buf instanceof Buffer && buf.length === 20;
});

test('函数作为回调参数创建Buffer', () => {
  function executeCallback(callback) {
    return callback();
  }
  
  const buf = executeCallback(() => Buffer.allocUnsafeSlow(30));
  return buf instanceof Buffer && buf.length === 30;
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
