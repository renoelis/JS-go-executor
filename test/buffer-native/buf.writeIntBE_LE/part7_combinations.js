// buf.writeIntBE() 和 buf.writeIntLE() - Cross Combination Tests
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

// 交叉组合测试：不同数值 × 不同字节长度 × 不同offset
test('writeIntBE - 正数组合测试', () => {
  const buf = Buffer.alloc(20);
  const testCases = [
    { value: 1, offset: 0, byteLength: 1 },
    { value: 127, offset: 1, byteLength: 1 },
    { value: 128, offset: 2, byteLength: 2 },
    { value: 32767, offset: 4, byteLength: 2 },
    { value: 32768, offset: 6, byteLength: 3 },
    { value: 8388607, offset: 9, byteLength: 3 },
    { value: 8388608, offset: 12, byteLength: 4 },
    { value: 2147483647, offset: 16, byteLength: 4 }
  ];

  testCases.forEach(testCase => {
    const result = buf.writeIntBE(testCase.value, testCase.offset, testCase.byteLength);
    if (result !== testCase.offset + testCase.byteLength) {
      throw new Error(`返回值错误: ${testCase.value}`);
    }

    // 验证读取一致性
    const readValue = buf.readIntBE(testCase.offset, testCase.byteLength);
    if (readValue !== testCase.value) {
      throw new Error(`读写不一致: ${testCase.value}`);
    }
  });
  return true;
});

test('writeIntLE - 负数组合测试', () => {
  const buf = Buffer.alloc(20);
  const testCases = [
    { value: -1, offset: 0, byteLength: 1 },
    { value: -128, offset: 1, byteLength: 1 },
    { value: -129, offset: 2, byteLength: 2 },
    { value: -32768, offset: 4, byteLength: 2 },
    { value: -32769, offset: 6, byteLength: 3 },
    { value: -8388608, offset: 9, byteLength: 3 },
    { value: -8388609, offset: 12, byteLength: 4 },
    { value: -2147483648, offset: 16, byteLength: 4 }
  ];

  testCases.forEach(testCase => {
    const result = buf.writeIntLE(testCase.value, testCase.offset, testCase.byteLength);
    if (result !== testCase.offset + testCase.byteLength) {
      throw new Error(`返回值错误: ${testCase.value}`);
    }

    // 验证读取一致性
    const readValue = buf.readIntLE(testCase.offset, testCase.byteLength);
    if (readValue !== testCase.value) {
      throw new Error(`读写不一致: ${testCase.value}`);
    }
  });
  return true;
});

// 边界值组合测试
test('writeIntBE - 边界值组合测试', () => {
  const buf = Buffer.alloc(24);
  const boundaryCases = [
    { value: 0, offset: 0, byteLength: 1 },
    { value: 1, offset: 1, byteLength: 1 },
    { value: -1, offset: 2, byteLength: 1 },
    { value: 127, offset: 3, byteLength: 1 },
    { value: -128, offset: 4, byteLength: 1 },
    { value: 128, offset: 5, byteLength: 2 },
    { value: -129, offset: 7, byteLength: 2 },
    { value: 32767, offset: 9, byteLength: 2 },
    { value: -32768, offset: 11, byteLength: 2 },
    { value: 32768, offset: 13, byteLength: 3 },
    { value: -32769, offset: 16, byteLength: 3 },
    { value: 8388607, offset: 19, byteLength: 3 }
    // 移除了最后一个会越界的测试用例
  ];

  boundaryCases.forEach(testCase => {
    const result = buf.writeIntBE(testCase.value, testCase.offset, testCase.byteLength);
    if (result !== testCase.offset + testCase.byteLength) {
      throw new Error(`边界值返回值错误: ${testCase.value}`);
    }
  });
  return true;
});

// 连续写入的不同组合
test('writeIntBE - 连续写入组合测试', () => {
  const buf = Buffer.alloc(16);

  // 不同字节长度的连续写入，使用有效范围内的数值
  buf.writeIntBE(0x12, 0, 1);
  buf.writeIntBE(0x3456, 1, 2);
  buf.writeIntBE(0x789ABC, 3, 3);
  buf.writeIntBE(0x7ABCDEF0, 6, 4);  // 使用有效4字节值
  buf.writeIntBE(0x56789A, 10, 3);
  buf.writeIntBE(0x7CDE, 13, 2);     // 使用有效2字节值

  // 验证每个写入
  if (buf[0] !== 0x12) throw new Error('1字节写入错误');
  if (buf[1] !== 0x34 || buf[2] !== 0x56) throw new Error('2字节写入错误');
  if (buf[3] !== 0x78 || buf[4] !== 0x9A || buf[5] !== 0xBC) throw new Error('3字节写入错误');
  if (buf[6] !== 0x7A || buf[7] !== 0xBC || buf[8] !== 0xDE || buf[9] !== 0xF0) throw new Error('4字节写入错误');
  if (buf[10] !== 0x56 || buf[11] !== 0x78 || buf[12] !== 0x9A) throw new Error('第二个3字节写入错误');
  if (buf[13] !== 0x7C || buf[14] !== 0xDE) throw new Error('第二个2字节写入错误');

  return true;
});

// 重叠写入的不同组合
test('writeIntLE - 重叠写入组合测试', () => {
  const buf = Buffer.alloc(8);

  // 故意重叠写入，验证后写入覆盖前写入
  buf.writeIntLE(0x12345678, 0, 4);
  buf.writeIntLE(0x7ABCDEF0, 2, 4); // 与前一个重叠2字节，使用有效4字节值

  // 验证结果以最后一次写入为准
  if (buf[2] !== 0xF0 || buf[3] !== 0xDE || buf[4] !== 0xBC || buf[5] !== 0x7A) {
    throw new Error('重叠写入覆盖错误');
  }

  // 检查未被覆盖的部分
  if (buf[0] !== 0x78 || buf[1] !== 0x56) throw new Error('未被覆盖部分错误');

  return true;
});

// 不同字节长度的数值范围组合
test('writeIntBE - 数值范围与字节长度组合', () => {
  const buf = Buffer.alloc(21); // 1+2+3+4+5+6 = 21

  // 每个字节长度的最大值
  buf.writeIntBE(127, 0, 1);         // 1字节最大值
  buf.writeIntBE(32767, 1, 2);       // 2字节最大值
  buf.writeIntBE(8388607, 3, 3);     // 3字节最大值
  buf.writeIntBE(2147483647, 6, 4);  // 4字节最大值
  buf.writeIntBE(Math.pow(2, 39) - 1, 10, 5); // 5字节最大值
  buf.writeIntBE(Math.pow(2, 47) - 1, 15, 6); // 6字节最大值

  // 验证每个最大值
  if (buf.readIntBE(0, 1) !== 127) throw new Error('1字节最大值错误');
  if (buf.readIntBE(1, 2) !== 32767) throw new Error('2字节最大值错误');
  if (buf.readIntBE(3, 3) !== 8388607) throw new Error('3字节最大值错误');
  if (buf.readIntBE(6, 4) !== 2147483647) throw new Error('4字节最大值错误');
  if (buf.readIntBE(10, 5) !== Math.pow(2, 39) - 1) throw new Error('5字节最大值错误');
  if (buf.readIntBE(15, 6) !== Math.pow(2, 47) - 1) throw new Error('6字节最大值错误');

  return true;
});

// 负数符号扩展的组合测试
test('writeIntLE - 负数符号扩展组合', () => {
  const buf = Buffer.alloc(10); // 调整大小以适应测试

  // 相同的负数值，不同的字节长度
  const negativeValue = -5;
  buf.writeIntLE(negativeValue, 0, 1);
  buf.writeIntLE(negativeValue, 1, 2);
  buf.writeIntLE(negativeValue, 3, 3);
  buf.writeIntLE(negativeValue, 6, 4);

  // 验证符号扩展正确性
  if (buf.readIntLE(0, 1) !== -5) throw new Error('1字节负数错误');
  if (buf.readIntLE(1, 2) !== -5) throw new Error('2字节负数错误');
  if (buf.readIntLE(3, 3) !== -5) throw new Error('3字节负数错误');
  if (buf.readIntLE(6, 4) !== -5) throw new Error('4字节负数错误');

  return true;
});

// 零值的不同表示组合
test('writeIntBE - 零值的不同表示组合', () => {
  const buf = Buffer.alloc(21);

  // 不同的零值表示
  buf.writeIntBE(0, 0, 1);
  buf.writeIntBE(-0, 1, 2);
  buf.writeIntBE(+0, 3, 3);
  buf.writeIntBE(0.0, 6, 4);
  buf.writeIntBE(Math.pow(2, 32) - Math.pow(2, 32), 10, 5); // 计算得到的0
  buf.writeIntBE(parseInt("0"), 15, 6); // 从字符串转换的0

  // 验证所有都写入为0
  for (let i = 0; i < 21; i++) {
    if (buf[i] !== 0) throw new Error(`零值表示字节${i}不为0`);
  }

  return true;
});

// 大端小端混合使用组合
test('writeIntBE和writeIntLE - 混合使用组合', () => {
  const buf = Buffer.alloc(16);

  // 交替使用大端和小端，使用有效范围内的数值
  buf.writeIntBE(0x1234, 0, 2);
  buf.writeIntLE(0x5678, 2, 2);
  buf.writeIntBE(0x7ABC, 4, 2);      // 使用有效2字节值
  buf.writeIntLE(0x7EF0, 6, 2);      // 使用有效2字节值
  buf.writeIntBE(0x12345678, 8, 4);
  buf.writeIntLE(0x7ABCDEF0, 12, 4); // 使用有效4字节值

  // 验证大端写入
  if (buf[0] !== 0x12 || buf[1] !== 0x34) throw new Error('大端1错误');
  if (buf[4] !== 0x7A || buf[5] !== 0xBC) throw new Error('大端2错误');
  if (buf[8] !== 0x12 || buf[9] !== 0x34 || buf[10] !== 0x56 || buf[11] !== 0x78) {
    throw new Error('大端4错误');
  }

  // 验证小端写入
  if (buf[2] !== 0x78 || buf[3] !== 0x56) throw new Error('小端1错误');
  if (buf[6] !== 0xF0 || buf[7] !== 0x7E) throw new Error('小端2错误');
  if (buf[12] !== 0xF0 || buf[13] !== 0xDE || buf[14] !== 0xBC || buf[15] !== 0x7A) {
    throw new Error('小端4错误');
  }

  return true;
});

// 极端offset和byteLength组合
test('writeIntBE - 极端offset和byteLength组合', () => {
  const buf = Buffer.alloc(6);

  // 在Buffer末尾的精确写入
  buf.writeIntBE(0x12, 5, 1); // offset=5, length=1，刚好在末尾

  // 在整个Buffer范围的最大写入
  buf.writeIntBE(0x1234567890AB, 0, 6); // 占满整个Buffer

  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 ||
      buf[3] !== 0x78 || buf[4] !== 0x90 || buf[5] !== 0xAB) {
    throw new Error('最大范围写入错误');
  }

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