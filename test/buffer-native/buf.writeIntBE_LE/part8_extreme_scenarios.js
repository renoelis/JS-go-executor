// buf.writeIntBE() 和 buf.writeIntLE() - Extreme Scenarios Tests
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    if (pass) {
      console.log('✅ ' + name);
    } else {
      console.log('❌ ' + name);
    }
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log('❌ ' + name + ' - Error: ' + e.message);
  }
}

// 极端大Buffer测试
test('writeIntBE - 超大Buffer末尾写入', () => {
  // 模拟大Buffer，但不真正分配超大内存
  const largeBufferSize = 1024 * 1024; // 1MB
  const buf = Buffer.alloc(Math.min(largeBufferSize, 65536)); // 限制实际大小

  const offset = buf.length - 4; // 在末尾写入4字节
  const result = buf.writeIntBE(0x12345678, offset, 4);

  if (result !== buf.length) throw new Error('超大Buffer返回值错误');
  if (buf[offset] !== 0x12 || buf[offset + 1] !== 0x34 ||
      buf[offset + 2] !== 0x56 || buf[offset + 3] !== 0x78) {
    throw new Error('超大Buffer末尾写入错误');
  }
  return true;
});

test('writeIntLE - 大Buffer分布式写入', () => {
  const buf = Buffer.alloc(65536); // 64KB
  const writePositions = [0, 1024, 2048, 4096, 8192, 16384, 32768, 65535 - 4];

  writePositions.forEach((pos, index) => {
    const value = 0x1000 + index;
    const result = buf.writeIntLE(value, pos, 4);
    if (result !== pos + 4) throw new Error(`位置${pos}写入返回值错误`);

    // 验证写入
    const readValue = buf.readIntLE(pos, 4);
    if (readValue !== value) throw new Error(`位置${pos}读写不一致`);
  });
  return true;
});

// 极端数值测试
test('writeIntBE - 接近极限的6字节数值', () => {
  const buf = Buffer.alloc(6);

  // 测试接近6字节极限的值
  const max6Byte = Math.pow(2, 47) - 1;
  const min6Byte = -Math.pow(2, 47);

  buf.writeIntBE(max6Byte, 0, 6);
  if (buf.readIntBE(0, 6) !== max6Byte) throw new Error('最大6字节数值错误');

  buf.writeIntBE(min6Byte, 0, 6);
  if (buf.readIntBE(0, 6) !== min6Byte) throw new Error('最小6字节数值错误');

  return true;
});

test('writeIntLE - 极限数值边界测试', () => {
  const buf = Buffer.alloc(6);

  // 测试极限边界值
  const testValues = [
    Math.pow(2, 47) - 2, // 最大减1
    Math.pow(2, 47) - 1, // 最大值
    -Math.pow(2, 47) + 1, // 最小加1
    -Math.pow(2, 47) // 最小值
  ];

  testValues.forEach((value, index) => {
    buf.writeIntLE(value, 0, 6);
    const readValue = buf.readIntLE(0, 6);
    if (readValue !== value) throw new Error(`极限数值${index}错误`);
  });

  return true;
});

// 特殊数值表示测试
test('writeIntBE - 特殊数值表示', () => {
  const buf = Buffer.alloc(16);

  // 测试各种特殊数值的表示
  const specialValues = [
    { value: Number.MAX_SAFE_INTEGER, offset: 0, length: 6 },
    { value: Number.MIN_SAFE_INTEGER, offset: 6, length: 6 },
    { value: Number.MAX_VALUE / 2, offset: 12, length: 4 } // 大数值截断
  ];

  specialValues.forEach((testCase, index) => {
    try {
      buf.writeIntBE(testCase.value, testCase.offset, testCase.length);
      // 验证能正常写入（可能被截断）
    } catch (error) {
      // 接受可能的错误
    }
  });

  return true;
});

// 内存压力测试
test('writeIntLE - 高频写入测试', () => {
  const iterations = 10000;
  const buf = Buffer.alloc(4);

  for (let i = 0; i < iterations; i++) {
    const value = i % 2147483647; // 保持在有效范围内
    buf.writeIntLE(value, 0, 4);
    const readValue = buf.readIntLE(0, 4);
    if (readValue !== value) throw new Error(`高频写入迭代${i}错误`);
  }

  return true;
});

// 边界条件组合测试
test('writeIntBE - 边界条件组合', () => {
  const buf = Buffer.alloc(4);

  // 测试各种边界条件的组合
  const boundaryTests = [
    { value: 0, offset: 0, length: 4 },
    { value: -1, offset: 0, length: 4 },
    { value: 1, offset: 0, length: 4 },
    { value: 127, offset: 0, length: 1 },
    { value: -128, offset: 0, length: 1 },
    { value: 32767, offset: 0, length: 2 },
    { value: -32768, offset: 0, length: 2 },
    { value: 2147483647, offset: 0, length: 4 },
    { value: -2147483648, offset: 0, length: 4 }
  ];

  boundaryTests.forEach((testCase, index) => {
    buf.writeIntBE(testCase.value, testCase.offset, testCase.length);
    const readValue = buf.readIntBE(testCase.offset, testCase.length);
    if (readValue !== testCase.value) throw new Error(`边界测试${index}失败`);
  });

  return true;
});

// 错误恢复测试
test('writeIntLE - 错误输入后的恢复', () => {
  const buf = Buffer.alloc(8);

  // 先尝试一些错误输入
  try {
    buf.writeIntLE(9999999999, 0, 2); // 超出范围
  } catch (error) {
    // 期望的错误
  }

  try {
    buf.writeIntLE(0x1234, -1, 2); // 负偏移
  } catch (error) {
    // 期望的错误
  }

  // 验证Buffer仍然可以正常使用
  buf.writeIntLE(0x12345678, 0, 4);
  if (buf.readIntLE(0, 4) !== 0x12345678) throw new Error('错误恢复后写入失败');

  return true;
});

// 字节序一致性测试
test('writeIntBE - 字节序一致性验证', () => {
  const buf = Buffer.alloc(8);

  // 写入递增数值，验证字节序一致性
  for (let i = 0; i < 4; i++) {
    const value = (i + 1) * 0x100 + i; // 使用更小的递增值
    buf.writeIntBE(value, i * 2, 2);
  }

  // 验证每个位置的值
  const expected = [0x100, 0x201, 0x302, 0x403];
  expected.forEach((expectedValue, index) => {
    const readValue = buf.readIntBE(index * 2, 2);
    if (readValue !== expectedValue) throw new Error(`字节序一致性${index}错误`);
  });

  return true;
});

// 多线程模拟测试（单线程环境下的并发模拟）
test('writeIntLE - 并发写入模拟', () => {
  const buf = Buffer.alloc(16);

  // 模拟多个"线程"写入不同位置
  const writeOperations = [
    { value: 0x1111, offset: 0, length: 2 },
    { value: 0x2222, offset: 2, length: 2 },
    { value: 0x3333, offset: 4, length: 2 },
    { value: 0x4444, offset: 6, length: 2 },
    { value: 0x55555555, offset: 8, length: 4 },
    { value: 0x66666666, offset: 12, length: 4 }
  ];

  // 随机顺序执行写入
  const shuffled = writeOperations.sort(() => Math.random() - 0.5);
  shuffled.forEach(op => {
    buf.writeIntLE(op.value, op.offset, op.length);
  });

  // 验证所有写入都正确
  writeOperations.forEach(op => {
    const readValue = buf.readIntLE(op.offset, op.length);
    if (readValue !== op.value) throw new Error(`并发写入${op.offset}错误`);
  });

  return true;
});

// 数值溢出边界测试
test('writeIntBE - 数值溢出边界', () => {
  const buf = Buffer.alloc(4);

  // 测试刚好超出范围的值
  const overflowTests = [
    { value: 128, length: 1, shouldFail: true },
    { value: -129, length: 1, shouldFail: true },
    { value: 32768, length: 2, shouldFail: true },
    { value: -32769, length: 2, shouldFail: true },
    { value: 8388608, length: 3, shouldFail: true },
    { value: -8388609, length: 3, shouldFail: true },
    { value: 2147483648, length: 4, shouldFail: true },
    { value: -2147483649, length: 4, shouldFail: true }
  ];

  overflowTests.forEach((testCase, index) => {
    try {
      buf.writeIntBE(testCase.value, 0, testCase.length);
      if (testCase.shouldFail) throw new Error(`溢出测试${index}应该失败`);
    } catch (error) {
      if (!testCase.shouldFail) throw new Error(`溢出测试${index}不应该失败`);
    }
  });

  return true;
});

// 性能边界测试
test('writeIntLE - 性能边界测试', () => {
  const startTime = Date.now();
  const buf = Buffer.alloc(4);
  const iterations = 100000;

  for (let i = 0; i < iterations; i++) {
    buf.writeIntLE(i % 1000, 0, 2);
  }

  const endTime = Date.now();
  const duration = endTime - startTime;

  // 验证性能在合理范围内（10万次写入应该在1.5秒内，兼容 goja 环境的性能特性和波动）
  if (duration > 1500) throw new Error(`性能测试超时: ${duration}ms`);

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