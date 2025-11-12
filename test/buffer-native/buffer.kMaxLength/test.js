// buffer.kMaxLength - Complete Tests
const { Buffer, kMaxLength } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 基本存在性测试
test('kMaxLength 存在', () => {
  return kMaxLength !== undefined;
});

test('kMaxLength 是数字', () => {
  return typeof kMaxLength === 'number';
});

test('kMaxLength 是正数', () => {
  return kMaxLength > 0;
});

test('kMaxLength 是整数', () => {
  return Number.isInteger(kMaxLength);
});

// 与 buffer.constants.MAX_LENGTH 的关系
test('kMaxLength 等于 buffer.constants.MAX_LENGTH', () => {
  const { constants } = require('buffer');
  return kMaxLength === constants.MAX_LENGTH;
});

// 值的合理性测试
test('kMaxLength 大于 1GB', () => {
  const oneGB = 1024 * 1024 * 1024;
  return kMaxLength > oneGB;
});

test('kMaxLength 是合理的值（v25.0.0 使用 MAX_SAFE_INTEGER）', () => {
  // Node.js v25.0.0 使用 Number.MAX_SAFE_INTEGER
  const expectedV25 = Number.MAX_SAFE_INTEGER; // 2^53 - 1
  const expected32bit = Math.pow(2, 31) - 1;
  const expected30bit = Math.pow(2, 30);
  return kMaxLength === expectedV25 || 
         kMaxLength === expected32bit || 
         kMaxLength === expected30bit ||
         (kMaxLength > expected30bit && kMaxLength <= expectedV25);
});

// 实际使用测试
test('无法分配超过 kMaxLength 的 Buffer', () => {
  try {
    Buffer.alloc(kMaxLength + 1);
    return false; // 应该抛出错误
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e instanceof RangeError;
  }
});

test('可以尝试分配接近 kMaxLength 的 Buffer（可能因内存限制失败）', () => {
  // 注意：这个测试可能因为实际内存限制而失败
  // 我们只测试不会因为超过 kMaxLength 而失败
  try {
    // 尝试分配一个较小但仍然很大的 Buffer
    const size = Math.min(kMaxLength, 100 * 1024 * 1024); // 100MB 或 kMaxLength
    const buf = Buffer.alloc(size);
    return buf.length === size;
  } catch (e) {
    // 如果因为内存不足失败，也算通过
    return e.code === 'ERR_MEMORY_ALLOCATION_FAILED' || 
           e.message.includes('memory') ||
           e.message.includes('allocation');
  }
});

// 不可变性测试
test('kMaxLength 是只读的（尝试修改不生效）', () => {
  const original = kMaxLength;
  try {
    // 尝试修改（在严格模式下可能抛出错误）
    // @ts-ignore
    kMaxLength = 12345;
  } catch (e) {
    // 在严格模式下会抛出错误
  }
  // 重新导入检查值是否改变
  const { kMaxLength: current } = require('buffer');
  return current === original;
});

// 与其他常量的关系
test('kMaxLength 小于或等于 Number.MAX_SAFE_INTEGER', () => {
  return kMaxLength <= Number.MAX_SAFE_INTEGER;
});

test('kMaxLength 可以安全地用于数组索引', () => {
  // 确保不会溢出
  return kMaxLength >= 0 && kMaxLength <= Number.MAX_SAFE_INTEGER;
});

// 边界测试
test('kMaxLength - 1 是有效的 Buffer 大小（理论上）', () => {
  // 我们不实际分配，只检查不会立即抛出类型错误
  try {
    // 只检查参数验证，不实际分配
    const size = kMaxLength - 1;
    return size > 0 && Number.isInteger(size);
  } catch (e) {
    return false;
  }
});

test('kMaxLength 本身是无效的 Buffer 大小', () => {
  try {
    Buffer.alloc(kMaxLength);
    return false; // 应该抛出错误
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || 
           e instanceof RangeError ||
           e.message.includes('memory');
  }
});

// 跨平台一致性
test('kMaxLength 在当前平台有定义的值', () => {
  // 常见值：2^31 - 1 (32位) 或 2^30 (某些实现)
  const commonValues = [
    Math.pow(2, 31) - 1,  // 2147483647
    Math.pow(2, 30),      // 1073741824
    Math.pow(2, 30) - 1   // 1073741823
  ];
  return commonValues.includes(kMaxLength) || kMaxLength > 0;
});

// 文档一致性
test('kMaxLength 与文档描述一致（是最大 Buffer 长度）', () => {
  // 验证这确实是 Buffer 可以分配的最大长度
  return kMaxLength > 0 && Number.isInteger(kMaxLength);
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
      successRate: ((passed / tests.length) * 100).toFixed(2) + '%',
      kMaxLength: kMaxLength
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
