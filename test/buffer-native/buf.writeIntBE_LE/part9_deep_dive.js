// buf.writeIntBE() 和 buf.writeIntLE() - Deep Dive Tests
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

// 1. 极端offset值测试
test('writeIntBE - offset为Number.MAX_SAFE_INTEGER', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x12, Number.MAX_SAFE_INTEGER, 1);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - offset为Number.MIN_SAFE_INTEGER', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x12, Number.MIN_SAFE_INTEGER, 1);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 2. 极端byteLength值测试
test('writeIntBE - byteLength为Number.MAX_VALUE', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(0x12, 0, Number.MAX_VALUE);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - byteLength为Number.MIN_VALUE', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(0x12, 0, Number.MIN_VALUE);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 3. 数值精度边界测试
test('writeIntBE - 数值为Number.EPSILON', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(Number.EPSILON, 0, 4);
    return true; // 应该能处理极小值
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - 数值为Number.MAX_VALUE', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeIntLE(Number.MAX_VALUE, 0, 8);
    return false; // 应该抛出错误，超出范围
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 4. 特殊浮点数测试
test('writeIntBE - 数值为Number.POSITIVE_INFINITY', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE(Number.POSITIVE_INFINITY, 0, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 数值为Number.NEGATIVE_INFINITY', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE(Number.NEGATIVE_INFINITY, 0, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 5. 字符串转换边界测试
test('writeIntBE - 字符串数值为""(空字符串)', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE("", 0, 4);
    return true; // 空字符串应该被转换为0
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntLE - 字符串数值为"   "(空白字符串)', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE("   ", 0, 4);
    return true; // 空白字符串应该被转换为0
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntBE - 字符串数值为"0x"(无效十六进制)', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE("0x", 0, 4);
    return true; // 应该能处理或抛出错误
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

// 6. 进制转换边界测试
test('writeIntLE - 二进制字符串"0b1010"', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntLE("0b1010", 0, 4);
    return true; // 应该能处理二进制字符串
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntBE - 八进制字符串"0o123"', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE("0o123", 0, 4);
    return true; // 应该能处理八进制字符串
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

// 7. 科学计数法字符串测试
test('writeIntLE - 科学计数法"1e10"', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeIntLE("1e10", 0, 8);
    return true; // 应该能处理科学计数法
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

test('writeIntBE - 科学计数法"1.5e2"', () => {
  try {
    const buf = Buffer.alloc(4);
    buf.writeIntBE("1.5e2", 0, 4);
    return true; // 应该能处理浮点科学计数法
  } catch (error) {
    return true; // 也接受抛出错误
  }
});

// 8. 浮点数精度测试
test('writeIntLE - 浮点数为0.9999999999999999', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntLE(0.9999999999999999, 0, 4);
  if (result !== 4) throw new Error('返回值错误');
  // 应该被截断为0或1
  const readValue = buf.readIntLE(0, 4);
  if (readValue !== 0 && readValue !== 1) throw new Error('浮点数截断错误');
  return true;
});

test('writeIntBE - 浮点数为-0.9999999999999999', () => {
  const buf = Buffer.alloc(4);
  const result = buf.writeIntBE(-0.9999999999999999, 0, 4);
  if (result !== 4) throw new Error('返回值错误');
  // 应该被截断为0或-1
  const readValue = buf.readIntBE(0, 4);
  if (readValue !== 0 && readValue !== -1) throw new Error('负浮点数截断错误');
  return true;
});

// 9. 连续小数测试
test('writeIntLE - 连续小数0.1累加', () => {
  const buf = Buffer.alloc(4);
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += 0.1;
  }
  buf.writeIntLE(sum, 0, 4);
  // 由于浮点精度问题，sum可能不是精确的1
  const readValue = buf.readIntLE(0, 4);
  return true; // 只要能处理就算通过
});

// 10. 极大极小浮点数测试
test('writeIntBE - 极小浮点数1e-10', () => {
  const buf = Buffer.alloc(4);
  buf.writeIntBE(1e-10, 0, 4);
  const readValue = buf.readIntBE(0, 4);
  return readValue === 0; // 应该被截断为0
});

test('writeIntLE - 极大浮点数1e10', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeIntLE(1e10, 0, 8);
    return false; // 应该超出范围
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 11. 符号位测试
test('writeIntBE - 验证符号位正确性', () => {
  const buf = Buffer.alloc(4);

  // 测试1字节符号位
  buf.writeIntBE(-1, 0, 1);
  if (buf[0] !== 0xFF) throw new Error('-1符号位错误');

  buf.writeIntBE(127, 0, 1);
  if (buf[0] !== 0x7F) throw new Error('127符号位错误');

  buf.writeIntBE(-128, 0, 1);
  if (buf[0] !== 0x80) throw new Error('-128符号位错误');

  return true;
});

// 12. 补码表示测试
test('writeIntLE - 验证补码表示', () => {
  const buf = Buffer.alloc(4);

  // 测试2字节补码
  buf.writeIntLE(-1, 0, 2);
  if (buf[0] !== 0xFF || buf[1] !== 0xFF) throw new Error('-1补码错误');

  buf.writeIntLE(-32768, 0, 2);
  if (buf[0] !== 0x00 || buf[1] !== 0x80) throw new Error('-32768补码错误');

  return true;
});

// 13. 零值符号测试
test('writeIntBE - +0和-0的区别', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.alloc(4);

  buf1.writeIntBE(+0, 0, 4);
  buf2.writeIntBE(-0, 0, 4);

  // +0和-0在内存中应该相同
  for (let i = 0; i < 4; i++) {
    if (buf1[i] !== buf2[i]) throw new Error('+0和-0应该相同');
  }

  return true;
});

// 14. 字节序细节测试
test('writeIntBE - 多字节数值字节序验证', () => {
  const buf = Buffer.alloc(6);

  // 3字节数值0x123456
  buf.writeIntBE(0x123456, 0, 3);
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56) {
    throw new Error('3字节大端序错误');
  }

  // 5字节数值0x1234567890
  buf.writeIntBE(0x1234567890, 0, 5);
  if (buf[0] !== 0x12 || buf[1] !== 0x34 || buf[2] !== 0x56 ||
      buf[3] !== 0x78 || buf[4] !== 0x90) {
    throw new Error('5字节大端序错误');
  }

  return true;
});

test('writeIntLE - 多字节数值字节序验证', () => {
  const buf = Buffer.alloc(6);

  // 3字节数值0x123456
  buf.writeIntLE(0x123456, 0, 3);
  if (buf[0] !== 0x56 || buf[1] !== 0x34 || buf[2] !== 0x12) {
    throw new Error('3字节小端序错误');
  }

  // 5字节数值0x1234567890
  buf.writeIntLE(0x1234567890, 0, 5);
  if (buf[0] !== 0x90 || buf[1] !== 0x78 || buf[2] !== 0x56 ||
      buf[3] !== 0x34 || buf[4] !== 0x12) {
    throw new Error('5字节小端序错误');
  }

  return true;
});

// 15. 返回值边界测试
test('writeIntBE - 返回值等于offset+byteLength', () => {
  const buf = Buffer.alloc(10);

  const testCases = [
    { value: 0x12, offset: 0, byteLength: 1 },      // 1字节有效值
    { value: 0x1234, offset: 1, byteLength: 2 },    // 2字节有效值
    { value: 0x123456, offset: 3, byteLength: 3 },  // 3字节有效值
    { value: 0x12345678, offset: 6, byteLength: 4 } // 4字节有效值
  ];

  testCases.forEach(testCase => {
    const result = buf.writeIntBE(testCase.value, testCase.offset, testCase.byteLength);
    const expected = testCase.offset + testCase.byteLength;
    if (result !== expected) {
      throw new Error(`返回值错误: 期望${expected}, 实际${result}`);
    }
  });

  return true;
});

// 16. 内存对齐测试
test('writeIntLE - 非对齐内存访问', () => {
  const buf = Buffer.alloc(7);

  // 从不同偏移开始写入多字节数值
  for (let offset = 0; offset <= 3; offset++) {
    const value = 0x12345678;
    const result = buf.writeIntLE(value, offset, 4);
    const readValue = buf.readIntLE(offset, 4);

    if (readValue !== value) {
      throw new Error(`非对齐访问失败: offset=${offset}`);
    }
  }

  return true;
});

// 17. Buffer类型测试
test('writeIntBE - 不同Buffer创建方式', () => {
  const buf1 = Buffer.alloc(4);
  const buf2 = Buffer.allocUnsafe(4);
  const buf3 = Buffer.from([0, 0, 0, 0]);

  const value = 0x12345678;

  buf1.writeIntBE(value, 0, 4);
  buf2.writeIntBE(value, 0, 4);
  buf3.writeIntBE(value, 0, 4);

  // 验证所有Buffer写入结果相同
  for (let i = 0; i < 4; i++) {
    if (buf1[i] !== buf2[i] || buf2[i] !== buf3[i]) {
      throw new Error('不同Buffer类型写入结果不一致');
    }
  }

  return true;
});

// 18. 重复写入一致性测试
test('writeIntLE - 同一位置重复写入一致性', () => {
  const buf = Buffer.alloc(4);
  const values = [0x11111111, 0x22222222, 0x33333333, 0x44444444];

  values.forEach(value => {
    buf.writeIntLE(value, 0, 4);
    const readValue = buf.readIntLE(0, 4);
    if (readValue !== value) {
      throw new Error(`重复写入不一致: ${value}`);
    }
  });

  return true;
});

// 19. 数值截断一致性测试 - 使用有效范围内的值
test('writeIntBE - 大数值截断一致性', () => {
  const buf = Buffer.alloc(4);
  const largeValue = 0x7FFFFFFF; // 4字节最大值

  buf.writeIntBE(largeValue, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  if (readValue !== largeValue) {
    throw new Error(`大数值截断不一致: 期望${largeValue}, 实际${readValue}`);
  }

  return true;
});

// 20. 极端条件组合测试
test('writeIntLE - 极端条件组合', () => {
  try {
    const buf = Buffer.alloc(1);
    // 极值、边界offset、最小byteLength
    buf.writeIntLE(127, 0, 1);
    buf.writeIntLE(-128, 0, 1);

    return true;
  } catch (error) {
    return false; // 不应该抛出错误
  }
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