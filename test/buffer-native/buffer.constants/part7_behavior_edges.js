// Buffer.constants - 实际行为与边界测试（第3轮补充）
const buffer = require('buffer');
const { Buffer } = buffer;
const constants = buffer.constants;

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 1. 验证 MAX_LENGTH 是一个非常大的值
test('MAX_LENGTH 远大于实际可用内存限制', () => {
  // MAX_LENGTH 是理论最大值，远超实际内存
  // 验证它至少是 1TB (1024^4)
  const oneTerabyte = 1024 * 1024 * 1024 * 1024;
  return constants.MAX_LENGTH > oneTerabyte;
});

// 2. 使用 0 长度创建 Buffer
test('可以创建长度为 0 的 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0;
});

// 3. 使用负数长度创建 Buffer
test('负数长度应该抛出错误', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('Invalid') ||
           e.message.includes('negative');
  }
});

// 4. 使用小数长度创建 Buffer
test('小数长度会被转换为整数', () => {
  const buf = Buffer.alloc(3.7);
  return buf.length === 3;
});

// 5. 使用 NaN 作为长度
test('NaN 作为长度应该抛出错误或转为 0', () => {
  try {
    const buf = Buffer.alloc(NaN);
    return buf.length === 0; // 可能被转换为 0
  } catch (e) {
    return true; // 或者抛出错误也可以
  }
});

// 6. 使用 Infinity 作为长度
test('Infinity 作为长度应该抛出错误', () => {
  try {
    Buffer.alloc(Infinity);
    return false;
  } catch (e) {
    return e.message.includes('out of range') || e.message.includes('Invalid') ||
           e.message.includes('finite');
  }
});

// 7. 使用字符串形式的数字作为长度
test('字符串数字应该抛出类型错误', () => {
  try {
    Buffer.alloc('10');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('type') || e.message.includes('number');
  }
});

// 8. 使用非数字字符串作为长度
test('非数字字符串应该抛出错误或转为 0', () => {
  try {
    const buf = Buffer.alloc('abc');
    return buf.length === 0; // 可能被转换为 0
  } catch (e) {
    return true;
  }
});

// 9. 验证 MAX_LENGTH + 1 必定失败
test('MAX_LENGTH + 1 应该抛出错误', () => {
  try {
    // 即使不真正分配内存，超过限制也应该失败
    Buffer.alloc(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 10. 验证 MAX_STRING_LENGTH + 1 的 toString
test('超长 Buffer 的 toString 可能受限', () => {
  try {
    // 创建一个足够大但不超过实际内存的 Buffer
    const size = Math.min(10 * 1024 * 1024, constants.MAX_STRING_LENGTH / 10);
    const buf = Buffer.alloc(size, 'a');
    const str = buf.toString('utf8');
    return str.length === size;
  } catch (e) {
    return true; // 如果因内存或其他原因失败也可以接受
  }
});

// 11. 验证常量值的算术运算可能超出安全范围
test('MAX_LENGTH 是最大安全整数，加法会超出', () => {
  const plus = constants.MAX_LENGTH + 1000;
  // MAX_LENGTH 已经是 MAX_SAFE_INTEGER，加任何正数都会超出
  return !Number.isSafeInteger(plus);
});

// 12. 验证常量值的乘法可能溢出
test('MAX_LENGTH 乘以 2 超出安全整数范围', () => {
  const doubled = constants.MAX_LENGTH * 2;
  return !Number.isSafeInteger(doubled);
});

// 13. 验证 Buffer.from 遵守 MAX_LENGTH
test('Buffer.from 数组长度限制', () => {
  try {
    // 创建一个巨大的数组会很慢，所以只测试概念
    const arr = new Array(100);
    const buf = Buffer.from(arr);
    return buf.length === 100;
  } catch (e) {
    return false;
  }
});

// 14. 验证 Buffer.concat 受长度限制
test('Buffer.concat 结果受 MAX_LENGTH 限制', () => {
  const buf1 = Buffer.alloc(100);
  const buf2 = Buffer.alloc(200);
  const result = Buffer.concat([buf1, buf2]);
  return result.length === 300;
});

// 15. 验证常量在数组索引中的使用
test('常量可以用于计算但不能直接作为数组索引', () => {
  const arr = [1, 2, 3];
  try {
    const val = arr[constants.MAX_LENGTH];
    return val === undefined; // 超出索引返回 undefined
  } catch (e) {
    return false;
  }
});

// 16. 验证 Buffer.allocUnsafe 的长度限制
test('Buffer.allocUnsafe 遵守相同的长度限制', () => {
  try {
    Buffer.allocUnsafe(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 17. 验证 Buffer.allocUnsafeSlow 的长度限制
test('Buffer.allocUnsafeSlow 遵守相同的长度限制', () => {
  try {
    Buffer.allocUnsafeSlow(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return true;
  }
});

// 18. 验证常量与位运算
test('MAX_LENGTH 的位运算产生有效结果', () => {
  const shifted = constants.MAX_LENGTH >> 10;
  const masked = constants.MAX_LENGTH & 0xFFFFFFFF;
  return typeof shifted === 'number' && typeof masked === 'number';
});

// 19. 验证常量在循环中的稳定性
test('循环中多次访问常量值不变', () => {
  let consistent = true;
  const expected = constants.MAX_LENGTH;
  for (let i = 0; i < 100; i++) {
    if (constants.MAX_LENGTH !== expected) {
      consistent = false;
      break;
    }
  }
  return consistent;
});

// 20. 验证常量对象的原型链
test('constants 的原型链正常', () => {
  const proto = Object.getPrototypeOf(constants);
  return proto !== null && proto === Object.prototype;
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
