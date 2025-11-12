// Buffer.allocUnsafe() - Deep Boundary Value Tests
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

// 深度边界值测试
test('浮点数边界值精度测试', () => {
  const testCases = [
    { input: Number.EPSILON, expected: 0 },
    { input: Number.EPSILON * 2, expected: 0 },
    { input: 0.49999999999999994, expected: 0 }, // 接近0.5的边界
    { input: 0.5, expected: 0 },
    { input: 0.5000000000000001, expected: 0 },
    { input: 0.9999999999999998, expected: 0 },
    { input: 0.9999999999999999, expected: 0 },
    { input: 1.0000000000000002, expected: 1 },
    { input: 1.9999999999999998, expected: 1 },
    { input: 1.9999999999999996, expected: 1 }
  ];

  for (const testCase of testCases) {
    const buf = Buffer.allocUnsafe(testCase.input);
    if (buf.length !== testCase.expected) {
      throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
    }
  }

  console.log('✅ 浮点数边界值精度测试');
  return true;
});

test('2的幂次边界测试', () => {
  const powerOfTwoSizes = [
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536
  ];

  for (const size of powerOfTwoSizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Power of two size ${size} failed`);
    }

    // 验证Buffer可用性
    buf.fill(0xFF);
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] !== 0xFF) {
        throw new Error(`Buffer verification failed for size ${size} at index ${i}`);
      }
    }
  }

  console.log('✅ 2的幂次边界测试');
  return true;
});

test('2的幂次减1边界测试', () => {
  const nearPowerOfTwoSizes = [
    0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535
  ];

  for (const size of nearPowerOfTwoSizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Near power of two size ${size} failed`);
    }
  }

  console.log('✅ 2的幂次减1边界测试');
  return true;
});

test('2的幂次加1边界测试', () => {
  const overPowerOfTwoSizes = [
    2, 3, 5, 9, 17, 33, 65, 129, 257, 513, 1025, 2049, 4097, 8193, 16385, 32769, 65537
  ];

  for (const size of overPowerOfTwoSizes) {
    const buf = Buffer.allocUnsafe(size);
    if (buf.length !== size) {
      throw new Error(`Over power of two size ${size} failed`);
    }
  }

  console.log('✅ 2的幂次加1边界测试');
  return true;
});

test('32位整数边界测试', () => {
  const int32Boundaries = [
    { input: 2147483646, expected: 2147483646 }, // int32_max - 1
    { input: 2147483647, expected: 2147483647 }, // int32_max
    { input: 2147483648, expected: 2147483648 }, // int32_max + 1
    { input: 4294967294, expected: 4294967294 }, // uint32_max - 1
    { input: 4294967295, expected: 4294967295 }, // uint32_max
    { input: 4294967296, expected: 4294967296 }  // uint32_max + 1
  ];

  for (const testCase of int32Boundaries) {
    try {
      const buf = Buffer.allocUnsafe(testCase.input);
      if (buf.length !== testCase.expected) {
        throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
      }
    } catch (error) {
      // 如果内存不足，这是可以接受的
      const errorMsg = error.message.toLowerCase();
      if (!errorMsg.includes('invalid array length') && !errorMsg.includes('array buffer allocation')) {
        throw new Error(`Unexpected error for ${testCase.input}: ${error.message}`);
      }
    }
  }

  console.log('✅ 32位整数边界测试');
  return true;
});

test('64位整数边界测试', () => {
  const int64Boundaries = [
    { input: Number.MAX_SAFE_INTEGER - 1, expected: Number.MAX_SAFE_INTEGER - 1 },
    { input: Number.MAX_SAFE_INTEGER, expected: Number.MAX_SAFE_INTEGER },
    { input: Number.MIN_SAFE_INTEGER + 1, shouldFail: true }, // 负数应该失败
    { input: Number.MIN_SAFE_INTEGER, shouldFail: true }      // 负数应该失败
  ];

  for (const testCase of int64Boundaries) {
    try {
      const buf = Buffer.allocUnsafe(testCase.input);
      if (testCase.shouldFail) {
        throw new Error(`Expected failure for ${testCase.input}`);
      }
      if (buf.length !== testCase.expected) {
        throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
      }
    } catch (error) {
      if (!testCase.shouldFail) {
        // 如果内存不足，这是可以接受的
        if (!error.message.includes('Invalid array length') && !error.message.includes('array buffer allocation') && !error.message.includes('Array buffer allocation')) {
          throw new Error(`Unexpected error for ${testCase.input}: ${error.message}`);
        }
      } else if (testCase.shouldFail && !error.message.includes('Invalid array length') && !error.message.includes('size')) {
        throw new Error(`Expected failure for negative ${testCase.input}, but got: ${error.message}`);
      }
    }
  }

  console.log('✅ 64位整数边界测试');
  return true;
});

test('浮点数到整数转换精度损失测试', () => {
  const precisionTestCases = [
    { input: 1.0000000000000001, expected: 1 },  // 最小可表示增量
    { input: 1.0000000000000002, expected: 1 },
    { input: 1.0000000000000004, expected: 1 },
    { input: 1.0000000000000009, expected: 1 },
    { input: 1.000000000000001, expected: 1 },
    { input: 1.00000000000001, expected: 1 },
    { input: 1.0000000000001, expected: 1 },
    { input: 1.000000000001, expected: 1 },
    { input: 1.00000000001, expected: 1 },
    { input: 1.0000000001, expected: 1 }
  ];

  for (const testCase of precisionTestCases) {
    const buf = Buffer.allocUnsafe(testCase.input);
    if (buf.length !== testCase.expected) {
      throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
    }
  }

  console.log('✅ 浮点数到整数转换精度损失测试');
  return true;
});

test('科学计数法边界测试', () => {
  const scientificNotationCases = [
    { input: 1e0, expected: 1 },
    { input: 1e1, expected: 10 },
    { input: 1e2, expected: 100 },
    { input: 1e3, expected: 1000 },
    { input: 1e4, expected: 10000 },
    { input: 1e5, expected: 100000 },
    { input: 1e6, expected: 1000000 },
    { input: 5e2, expected: 500 },
    { input: 2.5e3, expected: 2500 },
    { input: 1.5e4, expected: 15000 }
  ];

  for (const testCase of scientificNotationCases) {
    const buf = Buffer.allocUnsafe(testCase.input);
    if (buf.length !== testCase.expected) {
      throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
    }
  }

  console.log('✅ 科学计数法边界测试');
  return true;
});

test('负数科学计数法边界测试', () => {
  const negativeScientificCases = [
    { input: -1e0, shouldFail: true },
    { input: -1e1, shouldFail: true },
    { input: -1e2, shouldFail: true },
    { input: -5e2, shouldFail: true },
    { input: -2.5e3, shouldFail: true }
  ];

  for (const testCase of negativeScientificCases) {
    try {
      Buffer.allocUnsafe(testCase.input);
      if (testCase.shouldFail) {
        throw new Error(`Expected failure for ${testCase.input}`);
      }
    } catch (error) {
      if (!testCase.shouldFail) {
        throw new Error(`Unexpected failure for ${testCase.input}: ${error.message}`);
      }
      // 预期失败
    }
  }

  console.log('✅ 负数科学计数法边界测试');
  return true;
});

test('特殊数值常量边界测试', () => {
  const specialConstants = [
    { input: Math.PI, expected: 3 },
    { input: Math.E, expected: 2 },
    { input: Math.LN2, expected: 0 },
    { input: Math.LN10, expected: 2 },
    { input: Math.LOG2E, expected: 1 },
    { input: Math.LOG10E, expected: 0 },
    { input: Math.SQRT1_2, expected: 0 },
    { input: Math.SQRT2, expected: 1 }
  ];

  for (const testCase of specialConstants) {
    const buf = Buffer.allocUnsafe(testCase.input);
    if (buf.length !== testCase.expected) {
      throw new Error(`Expected length ${testCase.expected} for ${testCase.input}, got ${buf.length}`);
    }
  }

  console.log('✅ 特殊数值常量边界测试');
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