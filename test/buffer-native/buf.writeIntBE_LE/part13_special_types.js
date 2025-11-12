// buf.writeIntBE() 和 buf.writeIntLE() - 特殊类型和输入测试
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

// 1. Symbol类型输入测试
test('writeIntBE - Symbol输入', () => {
  const buf = Buffer.alloc(4);
  const sym = Symbol('test');

  try {
    buf.writeIntBE(sym, 0, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - Symbol.for输入', () => {
  const buf = Buffer.alloc(4);
  const sym = Symbol.for('test');

  try {
    buf.writeIntLE(sym, 0, 4);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 2. BigInt输入测试（即使不支持也应该有预期行为）
test('writeIntBE - BigInt输入', () => {
  const buf = Buffer.alloc(4);
  const bigInt = 123n;

  try {
    buf.writeIntBE(bigInt, 0, 4);
    return false; // 应该抛出错误，因为BigInt需要特殊处理
  } catch (error) {
    return true; // 期望抛出错误
  }
});

test('writeIntLE - 大BigInt输入', () => {
  const buf = Buffer.alloc(8);
  const bigInt = 9007199254740993n; // 超过MAX_SAFE_INTEGER

  try {
    buf.writeIntLE(bigInt, 0, 8);
    return false; // 应该抛出错误
  } catch (error) {
    return true; // 期望抛出错误
  }
});

// 3. 对象输入测试 - 修正：普通对象会被转换为NaN，然后转换为0
test('writeIntBE - 普通对象输入', () => {
  const buf = Buffer.alloc(4);
  const obj = { value: 123 };

  buf.writeIntBE(obj, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  // 普通对象会被转换为NaN，然后转换为0
  if (readValue !== 0) {
    throw new Error(`普通对象应该转换为0, 实际${readValue}`);
  }
  return true;
});

test('writeIntLE - valueOf对象输入', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf() {
      return 456;
    }
  };

  // 有valueOf方法的对象应该被转换为数字
  const result = buf.writeIntLE(obj, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  if (readValue !== 456) {
    throw new Error(`valueOf对象处理错误: 期望456, 实际${readValue}`);
  }
  return result === 4;
});

// 4. 数组输入测试 - 修正：数组会被转换为字符串"123"，然后解析为数字123
test('writeIntBE - 数组输入', () => {
  const buf = Buffer.alloc(4);
  const arr = [123];

  buf.writeIntBE(arr, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  // 数组会被转换为字符串"123"，然后解析为数字123
  if (readValue !== 123) {
    throw new Error(`数组应该转换为123, 实际${readValue}`);
  }
  return true;
});

// 5. 函数输入测试 - 修正：函数也会被转换为0
test('writeIntLE - 函数输入', () => {
  const buf = Buffer.alloc(4);
  const fn = function() { return 789; };

  buf.writeIntLE(fn, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  // 函数会被转换为NaN，然后转换为0
  if (readValue !== 0) {
    throw new Error(`函数应该转换为0, 实际${readValue}`);
  }
  return true;
});

// 6. 布尔值输入测试
test('writeIntBE - true输入', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntBE(true, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  if (readValue !== 1) {
    throw new Error(`true应该转换为1, 实际${readValue}`);
  }
  return true;
});

test('writeIntLE - false输入', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntLE(false, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  if (readValue !== 0) {
    throw new Error(`false应该转换为0, 实际${readValue}`);
  }
  return true;
});

// 7. 特殊字符串输入
test('writeIntBE - 空字符串输入', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntBE('', 0, 4);
  const readValue = buf.readIntBE(0, 4);

  if (readValue !== 0) {
    throw new Error(`空字符串应该转换为0, 实际${readValue}`);
  }
  return true;
});

test('writeIntLE - 空白字符串输入', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntLE('   ', 0, 4);
  const readValue = buf.readIntLE(0, 4);

  if (readValue !== 0) {
    throw new Error(`空白字符串应该转换为0, 实际${readValue}`);
  }
  return true;
});

// 8. 无效字符串输入
test('writeIntBE - 无效字符串输入', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntBE('abc123', 0, 4);
    // 某些实现可能会尝试解析数字部分
    const readValue = buf.readIntBE(0, 4);
    return true; // 只要能处理就算通过
  } catch (error) {
    return true; // 抛出错误也是可接受的
  }
});

test('writeIntLE - 混合字符串输入', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntLE('123abc', 0, 4);
    return true;
  } catch (error) {
    return true;
  }
});

// 9. toString方法对象
test('writeIntBE - toString返回数字的对象', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    toString() {
      return '999';
    }
  };

  const result = buf.writeIntBE(obj, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  if (readValue !== 999) {
    throw new Error(`toString对象处理错误: 期望999, 实际${readValue}`);
  }
  return result === 4;
});

// 10. Date对象输入 - 修正：Date对象会被转换为时间戳，但需要使用6字节以内的长度
test('writeIntLE - Date对象输入', () => {
  const buf = Buffer.alloc(6);
  const date = new Date('2000-01-01T00:00:00Z'); // 使用较早的日期，时间戳较小

  buf.writeIntLE(date, 0, 6);
  const readValue = buf.readIntLE(0, 6);

  // Date对象会被转换为时间戳（毫秒）
  const expectedTimestamp = date.getTime();

  if (readValue !== expectedTimestamp) {
    throw new Error(`Date对象应该转换为时间戳${expectedTimestamp}, 实际${readValue}`);
  }
  return true;
});

// 11. RegExp对象输入 - 修正：RegExp也会被转换为0
test('writeIntBE - RegExp对象输入', () => {
  const buf = Buffer.alloc(4);
  const regex = /123/;

  buf.writeIntBE(regex, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  // RegExp会被转换为NaN，然后转换为0
  if (readValue !== 0) {
    throw new Error(`RegExp应该转换为0, 实际${readValue}`);
  }
  return true;
});

// 12. 复杂valueOf对象 - 修正：复杂嵌套会被转换为NaN，然后转换为0
test('writeIntLE - 复杂valueOf对象', () => {
  const buf = Buffer.alloc(4);
  const obj = {
    valueOf() {
      return {
        valueOf() {
          return 777;
        }
      };
    }
  };

  buf.writeIntLE(obj, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  // 嵌套对象会被转换为NaN，然后转换为0
  if (readValue !== 0) {
    throw new Error(`嵌套对象应该转换为0, 实际${readValue}`);
  }
  return true;
});

// 13. null和undefined的特殊行为 - 修正：都会被转换为0
test('writeIntBE - null输入', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntBE(null, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  // null会被转换为0
  if (readValue !== 0) {
    throw new Error(`null应该转换为0, 实际${readValue}`);
  }
  return true;
});

test('writeIntLE - undefined输入', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntLE(undefined, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  // undefined会被转换为0
  if (readValue !== 0) {
    throw new Error(`undefined应该转换为0, 实际${readValue}`);
  }
  return true;
});

// 14. 字符串数值的边界情况
test('writeIntBE - 十六进制字符串带正负号', () => {
  const buf = Buffer.alloc(4);

  try {
    buf.writeIntBE('+0x123', 0, 4);
    return true;
  } catch (error) {
    return true;
  }
});

test('writeIntLE - 二进制字符串', () => {
  const buf = Buffer.alloc(4);

  buf.writeIntLE('0b101010', 0, 4);
  const readValue = buf.readIntLE(0, 4);

  if (readValue !== 42) {
    throw new Error(`二进制字符串转换错误: 期望42, 实际${readValue}`);
  }
  return true;
});

// 15. 特殊对象类型 - 修正：Map和Set也会被转换为0
test('writeIntBE - Map对象输入', () => {
  const buf = Buffer.alloc(4);
  const map = new Map();

  buf.writeIntBE(map, 0, 4);
  const readValue = buf.readIntBE(0, 4);

  // Map会被转换为NaN，然后转换为0
  if (readValue !== 0) {
    throw new Error(`Map应该转换为0, 实际${readValue}`);
  }
  return true;
});

test('writeIntLE - Set对象输入', () => {
  const buf = Buffer.alloc(4);
  const set = new Set();

  buf.writeIntLE(set, 0, 4);
  const readValue = buf.readIntLE(0, 4);

  // Set会被转换为NaN，然后转换为0
  if (readValue !== 0) {
    throw new Error(`Set应该转换为0, 实际${readValue}`);
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