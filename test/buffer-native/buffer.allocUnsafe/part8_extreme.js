// Buffer.allocUnsafe() - Extreme Scenarios and Compatibility Tests
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

// 极端场景测试
test('极限小数处理', () => {
  const testCases = [
    { input: 0.000000001, expected: 0 },
    { input: 0.1, expected: 0 },
    { input: 0.5, expected: 0 },
    { input: 0.9, expected: 0 },
    { input: 0.999, expected: 0 },
    { input: 1.0, expected: 1 },
    { input: 1.1, expected: 1 },
    { input: 1.5, expected: 1 },
    { input: 1.9, expected: 1 },
    { input: 1.999, expected: 1 }
  ];

  for (const testCase of testCases) {
    const buf = Buffer.allocUnsafe(testCase.input);
    if (buf.length !== testCase.expected) {
      throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
    }
  }

  console.log('✅ 极限小数处理');
  return true;
});

test('边界整数处理', () => {
  const testCases = [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
    { input: 255, expected: 255 },
    { input: 256, expected: 256 },
    { input: 65535, expected: 65535 },
    { input: 65536, expected: 65536 },
    { input: 1048576, expected: 1048576 } // 1MB
  ];

  for (const testCase of testCases) {
    const buf = Buffer.allocUnsafe(testCase.input);
    if (buf.length !== testCase.expected) {
      throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
    }
  }

  console.log('✅ 边界整数处理');
  return true;
});

test('内存对齐测试', () => {
  // 测试不同对齐要求的分配
  const sizes = [1, 2, 3, 4, 5, 7, 8, 9, 15, 16, 17, 31, 32, 33, 63, 64, 65];
  const buffers = [];

  for (const size of sizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Size ${size} allocation failed`);
    }

    // 验证Buffer可用性
    for (let i = 0; i < buf.length; i++) {
      buf[i] = i % 256;
    }

    for (let i = 0; i < buf.length; i++) {
      if (buf[i] !== i % 256) {
        throw new Error(`Data verification failed for size ${size} at index ${i}`);
      }
    }

    buffers.push(buf);
  }

  if (buffers.length !== sizes.length) {
    throw new Error('Not all allocations succeeded');
  }

  console.log('✅ 内存对齐测试');
  return true;
});

test('零长度Buffer特殊行为', () => {
  const zeroBuf = Buffer.allocUnsafe(0);

  // 验证基本属性
  if (zeroBuf.length !== 0) throw new Error('Zero buffer should have length 0');
  if (!(zeroBuf instanceof Buffer)) throw new Error('Zero buffer should be Buffer instance');

  // 验证操作
  const str = zeroBuf.toString('utf8');
  const hex = zeroBuf.toString('hex');
  const base64 = zeroBuf.toString('base64');

  if (str !== '') throw new Error(`Expected empty string, got '${str}'`);
  if (hex !== '') throw new Error(`Expected empty hex, got '${hex}'`);
  if (base64 !== '') throw new Error(`Expected empty base64, got '${base64}'`);

  // 验证slice
  const slice = zeroBuf.slice(0, 0);
  if (slice.length !== 0) throw new Error('Slice of zero buffer should be zero length');

  console.log('✅ 零长度Buffer特殊行为');
  return true;
});

test('超大数值边界测试', () => {
  const testCases = [
    { input: 2147483647, shouldFail: true }, // int32 max
    { input: 2147483648, shouldFail: true }, // int32 max + 1
    { input: 4294967295, shouldFail: true }, // uint32 max
    { input: 1000000000, shouldFail: false } // 1GB
  ];

  for (const testCase of testCases) {
    try {
      const buf = Buffer.allocUnsafe(testCase.input);
      if (testCase.shouldFail) {
        throw new Error(`Expected failure for size ${testCase.input}`);
      }
      // 如果成功，验证长度
      if (buf.length !== testCase.input) {
        throw new Error(`Length mismatch for ${testCase.input}`);
      }
    } catch (error) {
      if (!testCase.shouldFail) {
        throw new Error(`Unexpected failure for size ${testCase.input}: ${error.message}`);
      }
      // 预期失败
    }
  }

  console.log('✅ 超大数值边界测试');
  return true;
});

test('浮点数精度边界', () => {
  const testCases = [
    { input: 0.0000000000000001, expected: 0 },
    { input: 0.4999999999999999, expected: 0 },
    { input: 0.5, expected: 0 },
    { input: 0.5000000000000001, expected: 0 },
    { input: 0.9999999999999999, expected: 0 },
    { input: 1.0000000000000001, expected: 1 },
    { input: 1.4999999999999999, expected: 1 },
    { input: 1.5, expected: 1 },
    { input: 1.5000000000000001, expected: 1 }
  ];

  for (const testCase of testCases) {
    const buf = Buffer.allocUnsafe(testCase.input);
    if (buf.length !== testCase.expected) {
      throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
    }
  }

  console.log('✅ 浮点数精度边界');
  return true;
});

test('多轮分配模式', () => {
  // 模拟真实应用场景的多轮分配
  const rounds = [];

  for (let round = 0; round < 5; round++) {
    const buffers = [];

    // 每轮分配不同大小的Buffer
    for (let size = 16; size <= 256; size *= 2) {
      const buf = Buffer.allocUnsafe(size);
      if (buf.length !== size) {
        throw new Error(`Round ${round}: Size ${size} allocation failed`);
      }

      // 填充验证数据
      buf.fill(round + 1);
      buffers.push(buf);
    }

    rounds.push(buffers);
  }

  // 验证所有轮次的数据完整性
  for (let round = 0; round < rounds.length; round++) {
    for (const buf of rounds[round]) {
      for (let i = 0; i < buf.length; i++) {
        if (buf[i] !== round + 1) {
          throw new Error(`Round ${round}: Data corruption detected`);
        }
      }
    }
  }

  console.log('✅ 多轮分配模式');
  return true;
});

test('错误恢复场景', () => {
  // 测试在错误后能否继续正常工作
  let errorOccurred = false;

  // 触发错误
  try {
    Buffer.allocUnsafe(-1);
  } catch (error) {
    errorOccurred = true;
  }

  if (!errorOccurred) {
    throw new Error('Expected error for negative size');
  }

  // 错误后继续正常分配
  const buf = Buffer.allocUnsafe(10);
  if (buf.length !== 10) {
    throw new Error('Normal allocation after error failed');
  }

  // 验证Buffer可用性
  buf.fill(42);
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] !== 42) {
      throw new Error('Buffer functionality compromised after error');
    }
  }

  console.log('✅ 错误恢复场景');
  return true;
});

test('与其他Buffer创建方法对比', () => {
  const size = 20;

  // 不同方法创建Buffer
  const unsafeBuf = Buffer.allocUnsafe(size);
  const safeBuf = Buffer.alloc(size);
  const fromBuf = Buffer.from(new Array(size).fill(0));
  const arrayBuf = Buffer.from(new Uint8Array(size));

  // 验证长度
  if (unsafeBuf.length !== size || safeBuf.length !== size ||
      fromBuf.length !== size || arrayBuf.length !== size) {
    throw new Error('Length mismatch between creation methods');
  }

  // 验证safeBuf和fromBuf是全零
  for (let i = 0; i < size; i++) {
    if (safeBuf[i] !== 0 || fromBuf[i] !== 0 || arrayBuf[i] !== 0) {
      throw new Error('Safe buffers should be zero-initialized');
    }
  }

  // 验证unsafeBuf可用性（不管内容如何）
  unsafeBuf.fill(255);
  for (let i = 0; i < size; i++) {
    if (unsafeBuf[i] !== 255) {
      throw new Error('Unsafe buffer should be modifiable');
    }
  }

  console.log('✅ 与其他Buffer创建方法对比');
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