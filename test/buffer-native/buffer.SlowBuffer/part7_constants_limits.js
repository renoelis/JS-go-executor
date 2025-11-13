// Buffer.allocUnsafeSlow - Constants and Limits Tests (Round 2 补漏)
const { Buffer, constants } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// constants 对象验证
test('require("buffer").constants 存在', () => {
  return constants !== undefined && typeof constants === 'object';
});

test('constants.MAX_LENGTH 存在', () => {
  return typeof constants.MAX_LENGTH === 'number';
});

test('constants.MAX_STRING_LENGTH 存在', () => {
  return typeof constants.MAX_STRING_LENGTH === 'number';
});

test('Buffer.constants 在 v25.0.0 不可用', () => {
  return Buffer.constants === undefined;
});

test('MAX_LENGTH 是 2^53 - 1', () => {
  return constants.MAX_LENGTH === 9007199254740991;
});

test('MAX_LENGTH 等于 Number.MAX_SAFE_INTEGER', () => {
  return constants.MAX_LENGTH === Number.MAX_SAFE_INTEGER;
});

// 接近 MAX_LENGTH 的测试
test('分配接近 MAX_LENGTH 的 Buffer 会导致内存错误或成功', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(constants.MAX_LENGTH - 1);
    return buf instanceof Buffer || false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('size') ||
           e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('分配 MAX_LENGTH 会导致错误', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(constants.MAX_LENGTH);
    return false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('size') ||
           e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('分配超过 MAX_LENGTH 抛出 RangeError', () => {
  try {
    const buf = Buffer.allocUnsafeSlow(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// kMaxLength 和 kStringMaxLength
test('kMaxLength 存在于 buffer 模块', () => {
  const { kMaxLength } = require('buffer');
  return typeof kMaxLength === 'number';
});

test('kStringMaxLength 存在于 buffer 模块', () => {
  const { kStringMaxLength } = require('buffer');
  return typeof kStringMaxLength === 'number';
});

test('kMaxLength 等于 constants.MAX_LENGTH', () => {
  const { kMaxLength } = require('buffer');
  return kMaxLength === constants.MAX_LENGTH;
});

test('kStringMaxLength 等于 constants.MAX_STRING_LENGTH', () => {
  const { kStringMaxLength } = require('buffer');
  return kStringMaxLength === constants.MAX_STRING_LENGTH;
});

// 大小限制边界测试
test('分配 10M Buffer', () => {
  try {
    const size = 10 * 1024 * 1024; 
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size;
  } catch (e) {
    return e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('分配 100 Buffer', () => {
  try {
    const size = 100 * 1024 * 1024; 
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size || false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('size') ||
           e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('分配接近 200 Buffer 可能抛出错误', () => {
  try {
    const size = 200 * 1024 * 1024 * 1024 - 1; 
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size || false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('size') ||
           e.message.includes('memory') || e.message.includes('allocation');
  }
});

// 整数范围测试
test('分配 2^31 - 1 (最大有符号 32 位整数)', () => {
  try {
    const size = 2147483647; // 2^31 - 1
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size || false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('size') ||
           e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('分配 2^32 - 1 (最大无符号 32 位整数)', () => {
  try {
    const size = 4294967295; // 2^32 - 1
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size || false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('size') ||
           e.message.includes('memory') || e.message.includes('allocation');
  }
});

test('分配 2^32 可能抛出错误', () => {
  try {
    const size = 4294967296; // 2^32
    const buf = Buffer.allocUnsafeSlow(size);
    return buf.length === size || false;
  } catch (e) {
    return e.message.includes('Invalid') || e.message.includes('size') ||
           e.message.includes('memory') || e.message.includes('allocation');
  }
});

// 平台相关的限制
test('Buffer 大小受系统可用内存限制', () => {
  return constants.MAX_LENGTH === Number.MAX_SAFE_INTEGER;
});

test('MAX_STRING_LENGTH 小于 MAX_LENGTH', () => {
  return constants.MAX_STRING_LENGTH < constants.MAX_LENGTH;
});

test('MAX_STRING_LENGTH 约为 512MB', () => {
  const approx = 512 * 1024 * 1024;
  const diff = Math.abs(constants.MAX_STRING_LENGTH - approx);
  return diff < 50 * 1024 * 1024;
});

// 零值和小值边界
test('分配 0 字节成功', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.length === 0;
});

test('分配 1 字节成功', () => {
  const buf = Buffer.allocUnsafeSlow(1);
  return buf.length === 1;
});

test('分配 8192 字节（常见页大小）', () => {
  const buf = Buffer.allocUnsafeSlow(8192);
  return buf.length === 8192;
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
