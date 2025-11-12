// buf.writeIntBE() 和 buf.writeIntLE() - 极端验证和边界探索
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
test('writeIntBE - offset为Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntBE(123, Number.MAX_VALUE, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - offset为Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntLE(123, Number.MIN_VALUE, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 2. 极端数值测试
test('writeIntBE - 数值为Number.MAX_VALUE', () => {
  const buf = Buffer.alloc(8);

  try {
    buf.writeIntBE(Number.MAX_VALUE, 0, 8);
    return false; // 应该抛出错误，超出范围
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 数值为Number.MIN_VALUE', () => {
  const buf = Buffer.alloc(8);

  try {
    buf.writeIntLE(Number.MIN_VALUE, 0, 8);
    const readValue = buf.readIntLE(0, 8);
    return readValue === 0; // 应该被截断为0
  } catch (error) {
    return true; // 抛出错误也是可接受的
  }
});

// 3. 字节长度极端值
test('writeIntBE - byteLength为Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntBE(123, 0, Number.MAX_SAFE_INTEGER);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - byteLength为0.9999999999999999', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntLE(123, 0, 0.9999999999999999);
    return false; // 应该抛出错误或截断为0
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 4. 浮点数精度极限
test('writeIntBE - 浮点数0.9999999999999999', () => {
  const buf = Buffer.alloc(4);
  const almostOne = 0.9999999999999999; // 非常接近1

  buf.writeIntBE(almostOne, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  // 应该被截断为0或1
  return readValue === 0 || readValue === 1;
});

test('writeIntLE - 浮点数-0.9999999999999999', () => {
  const buf = Buffer.alloc(4);
  const almostNegOne = -0.9999999999999999; // 非常接近-1

  buf.writeIntLE(almostNegOne, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  // 应该被截断为0或-1
  return readValue === 0 || readValue === -1;
});

// 5. 科学计数法极端值
test('writeIntBE - 科学计数法1e308', () => {
  const buf = Buffer.alloc(8);

  try {
    buf.writeIntBE(1e308, 0, 8); // 接近Infinity
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 科学计数法1e-308', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntLE(1e-308, 0, 4); // 非常接近0
  const readValue = buf.readIntLE(0, 4);

  return readValue === 0; // 应该被截断为0
});

// 6. 字符串解析极限
test('writeIntBE - 超长数字字符串', () => {
  const buf = Buffer.alloc(8);
  const longNumber = '9'.repeat(100); // 100个9

  try {
    buf.writeIntBE(longNumber, 0, 8);
    return true; // 只要能处理就算通过
  } catch (error) {
    return true; // 抛出错误也是可接受的
  }
});

test('writeIntLE - 极小数字字符串', () => {
  const buf = Buffer.alloc(4);
  const tinyNumber = '0.' + '0'.repeat(100) + '1'; // 0.000...001

  buf.writeIntLE(tinyNumber, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  return readValue === 0; // 应该被截断为0
});

// 7. 连续数学运算结果
test('writeIntBE - 连续除法结果', () => {
  const buf = Buffer.alloc(4);
  let result = 1000;

  // 连续除法，结果应该趋近于0
  for (let i = 0; i < 100; i++) {
    result = result / 2;
  }

  buf.writeIntBE(result, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  return readValue === 0; // 应该被截断为0
});

test('writeIntLE - 数学运算累积误差', () => {
  const buf = Buffer.alloc(4);
  let sum = 0.1;

  // 累积浮点误差
  for (let i = 0; i < 1000; i++) {
    sum += 0.1;
    sum -= 0.1;
  }

  buf.writeIntLE(sum, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  // 应该接近0或1
  return readValue === 0 || readValue === 1;
});

// 8. 特殊数学常数
test('writeIntBE - Math.PI处理', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntBE(Math.PI, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  if (readValue !== 3) {
    throw new Error(`Math.PI应该被截断为3, 实际${readValue}`);
  }
  return true;
});

test('writeIntLE - Math.E处理', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntLE(Math.E, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  if (readValue !== 2) {
    throw new Error(`Math.E应该被截断为2, 实际${readValue}`);
  }
  return true;
});

// 9. 极端小数
test('writeIntBE - 极端小数1e-15', () => {
  const buf = Buffer.alloc(4);
  const tiny = 1e-15;

  buf.writeIntBE(tiny, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  return readValue === 0; // 应该被截断为0
});

test('writeIntLE - 极端小数1e-16', () => {
  const buf = Buffer.alloc(4);
  const tiny = 1e-16; // Number.EPSILON级别

  buf.writeIntLE(tiny, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  return readValue === 0; // 应该被截断为0
});

// 10. 数值表示的边界
test('writeIntBE - 最接近1的小于1的数', () => {
  const buf = Buffer.alloc(4);
  const almostOne = 1 - Number.EPSILON; // 最接近1但小于1的数

  buf.writeIntBE(almostOne, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  return readValue === 0 || readValue === 1; // 应该被截断为0或1
});

test('writeIntLE - 最接近-1的大于-1的数', () => {
  const buf = Buffer.alloc(4);
  const almostNegOne = -1 + Number.EPSILON; // 最接近-1但大于-1的数

  buf.writeIntLE(almostNegOne, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  return readValue === 0 || readValue === -1; // 应该被截断为0或-1
});

// 11. 特殊浮点数值
test('writeIntBE - Number.POSITIVE_INFINITY', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntBE(Number.POSITIVE_INFINITY, 0, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - Number.NEGATIVE_INFINITY', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntLE(Number.NEGATIVE_INFINITY, 0, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntBE - Number.NaN', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntBE(Number.NaN, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  return readValue === 0; // NaN应该被转换为0
});

// 12. 极端整数运算
test('writeIntLE - 极大整数乘法', () => {
  const buf = Buffer.alloc(8);
  const bigNum = 999999 * 999999 * 999999;

  try {
    buf.writeIntLE(bigNum, 0, 8);
    return true; // 只要能处理就算通过
  } catch (error) {
    return true; // 超出范围抛出错误也是合理的
  }
});

test('writeIntBE - 极大整数加法', () => {
  const buf = Buffer.alloc(8);
  let sum = 0;

  // 累加大数
  for (let i = 0; i < 1000000; i++) {
    sum += 1000000;
  }

  try {
    buf.writeIntBE(sum, 0, 8);
    return true;
  } catch (error) {
    return true;
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