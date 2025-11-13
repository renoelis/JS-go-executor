// buffer.kStringMaxLength - Part 2: Value Validation
const { Buffer, kStringMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 与 buffer.constants.MAX_STRING_LENGTH 的关系
test('kStringMaxLength 等于 buffer.constants.MAX_STRING_LENGTH', () => {
  const { constants } = require('buffer');
  return kStringMaxLength === constants.MAX_STRING_LENGTH;
});

test('buffer.constants.MAX_STRING_LENGTH 存在', () => {
  const { constants } = require('buffer');
  return constants.MAX_STRING_LENGTH !== undefined;
});

test('两者引用同一个值', () => {
  const { constants } = require('buffer');
  return kStringMaxLength === constants.MAX_STRING_LENGTH &&
         typeof kStringMaxLength === 'number';
});

// V8 典型值验证
test('kStringMaxLength 是 V8 常见值之一', () => {
  const commonValues = [
    536870888,  // 2^29 - 24 (V8 默认，64位)
    268435456,  // 2^28 (32位系统)
    1073741799, // 2^30 - 25 (某些配置)
    536870912,  // 2^29 (理论值)
    1073741824  // 2^30 (理论最大)
  ];
  return commonValues.includes(kStringMaxLength) || kStringMaxLength > 100000000;
});

test('kStringMaxLength 符合 2 的幂次模式', () => {
  // V8 限制通常是 2^n - k 的形式
  const power29 = Math.pow(2, 29);
  const power28 = Math.pow(2, 28);
  const power30 = Math.pow(2, 30);

  return (kStringMaxLength >= power28 - 100 && kStringMaxLength <= power28 + 100) ||
         (kStringMaxLength >= power29 - 100 && kStringMaxLength <= power29 + 100) ||
         (kStringMaxLength >= power30 - 100 && kStringMaxLength <= power30 + 100);
});

// 合理性范围测试
test('kStringMaxLength 大于 100MB', () => {
  const hundredMB = 100 * 1024 * 1024;
  return kStringMaxLength > hundredMB;
});

test('kStringMaxLength 大于 200MB', () => {
  const twoHundredMB = 200 * 1024 * 1024;
  return kStringMaxLength > twoHundredMB;
});

test('kStringMaxLength 小于 2GB', () => {
  const twoGB = 2 * 1024 * 1024 * 1024;
  return kStringMaxLength < twoGB;
});

test('kStringMaxLength 小于 2^30', () => {
  return kStringMaxLength < Math.pow(2, 30);
});

test('kStringMaxLength 小于等于 2^30', () => {
  return kStringMaxLength <= Math.pow(2, 30);
});

test('kStringMaxLength 大于 2^27', () => {
  return kStringMaxLength > Math.pow(2, 27);
});

// 位操作验证
test('kStringMaxLength 在 32 位整数范围内', () => {
  return kStringMaxLength >= 0 && kStringMaxLength <= 0x7FFFFFFF;
});

test('kStringMaxLength 可以用 32 位有符号整数表示', () => {
  return kStringMaxLength === (kStringMaxLength | 0) && kStringMaxLength > 0;
});

// 数学运算验证
test('kStringMaxLength 乘以 2 不会溢出到 Infinity', () => {
  return Number.isFinite(kStringMaxLength * 2);
});

test('kStringMaxLength 除以 2 是整数', () => {
  return Number.isInteger(kStringMaxLength / 2);
});

test('kStringMaxLength 模 2 的结果是 0 或 1', () => {
  const mod = kStringMaxLength % 2;
  return mod === 0 || mod === 1;
});

// 字符串转换验证
test('kStringMaxLength 转字符串后包含数字', () => {
  const str = String(kStringMaxLength);
  return /^\d+$/.test(str);
});

test('kStringMaxLength toString 和 String 结果一致', () => {
  return kStringMaxLength.toString() === String(kStringMaxLength);
});

test('kStringMaxLength 转换为 JSON 是数字', () => {
  const json = JSON.stringify({ value: kStringMaxLength });
  const parsed = JSON.parse(json);
  return parsed.value === kStringMaxLength;
});

// 比较运算验证
test('kStringMaxLength 等于自身', () => {
  return kStringMaxLength === kStringMaxLength;
});

test('kStringMaxLength 严格等于自身', () => {
  const temp = kStringMaxLength;
  return temp === kStringMaxLength;
});

test('kStringMaxLength 大于 0', () => {
  return kStringMaxLength > 0;
});

test('kStringMaxLength 不等于 0', () => {
  return kStringMaxLength !== 0;
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
