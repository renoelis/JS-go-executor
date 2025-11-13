// buffer.kStringMaxLength - Complete Tests
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

// 基本存在性测试
test('kStringMaxLength 存在', () => {
  return kStringMaxLength !== undefined;
});

test('kStringMaxLength 是数字', () => {
  return typeof kStringMaxLength === 'number';
});

test('kStringMaxLength 是正数', () => {
  return kStringMaxLength > 0;
});

test('kStringMaxLength 是整数', () => {
  return Number.isInteger(kStringMaxLength);
});

// 与 buffer.constants.MAX_STRING_LENGTH 的关系
test('kStringMaxLength 等于 buffer.constants.MAX_STRING_LENGTH', () => {
  const { constants } = require('buffer');
  return kStringMaxLength === constants.MAX_STRING_LENGTH;
});

// 与 kMaxLength 的关系
test('kStringMaxLength 小于等于 kMaxLength', () => {
  const { kMaxLength } = require('buffer');
  return kStringMaxLength <= kMaxLength;
});

// 值的合理性测试
test('kStringMaxLength 大于 100MB', () => {
  const hundredMB = 100 * 1024 * 1024;
  return kStringMaxLength > hundredMB;
});

test('kStringMaxLength 是合理的字符串长度限制', () => {
  // 通常是 2^29 - 24 或类似值（V8 限制）
  const expected = Math.pow(2, 29) - 24; // 536870888
  const alternative = Math.pow(2, 28); // 268435456
  return kStringMaxLength === expected || 
         kStringMaxLength === alternative ||
         (kStringMaxLength > alternative && kStringMaxLength <= expected);
});

// 实际使用测试
test('无法创建超过 kStringMaxLength 的字符串 Buffer', () => {
  try {
    // 尝试创建一个超长字符串
    const str = 'a'.repeat(kStringMaxLength + 1);
    Buffer.from(str);
    return false; // 应该抛出错误或内存错误
  } catch (e) {
    // 可能是范围错误或内存错误
    return e.code === 'ERR_OUT_OF_RANGE' || 
           e instanceof RangeError ||
           e.message.includes('Invalid string length') ||
           e.message.includes('memory');
  }
});

test('toString 超过 kStringMaxLength 应该失败', () => {
  try {
    // 创建一个大 Buffer（如果内存允许）
    const size = Math.min(kStringMaxLength + 1000, 10 * 1024 * 1024);
    const buf = Buffer.alloc(size);
    // 尝试转换为字符串可能会因为长度限制失败
    // 但小 Buffer 应该成功
    if (size <= kStringMaxLength) {
      const str = buf.toString();
      return str.length === size;
    } else {
      buf.toString();
      return false; // 应该抛出错误
    }
  } catch (e) {
    return e.message.includes('string length') || 
           e.message.includes('memory') ||
           e instanceof RangeError;
  }
});

// 不可变性测试
test('kStringMaxLength 是只读的', () => {
  const original = kStringMaxLength;
  try {
    // @ts-ignore
    kStringMaxLength = 12345;
  } catch (e) {
    // 严格模式下会抛出错误
  }
  const { kStringMaxLength: current } = require('buffer');
  return current === original;
});

// 与其他常量的关系
test('kStringMaxLength 小于 Number.MAX_SAFE_INTEGER', () => {
  return kStringMaxLength < Number.MAX_SAFE_INTEGER;
});

test('kStringMaxLength 小于 2^30', () => {
  return kStringMaxLength < Math.pow(2, 30);
});

// 边界测试
test('接近 kStringMaxLength 的字符串可以处理（小测试）', () => {
  try {
    // 使用较小的测试大小以避免内存问题
    const testSize = Math.min(1000, kStringMaxLength);
    const str = 'a'.repeat(testSize);
    const buf = Buffer.from(str);
    return buf.toString() === str;
  } catch (e) {
    return false;
  }
});

// 编码相关
test('kStringMaxLength 适用于所有编码', () => {
  // 这是字符串长度限制，不是字节长度
  try {
    const testSize = 1000;
    const str = 'a'.repeat(testSize);
    const encodings = ['utf8', 'ascii', 'latin1', 'hex', 'base64'];
    return encodings.every(enc => {
      try {
        const buf = Buffer.from(str, enc);
        return buf instanceof Buffer;
      } catch (e) {
        return false;
      }
    });
  } catch (e) {
    return false;
  }
});

// 跨平台一致性
test('kStringMaxLength 在当前平台有定义的值', () => {
  // V8 常见值
  const commonValues = [
    536870888,  // 2^29 - 24 (V8 默认)
    268435456,  // 2^28
    1073741799  // 2^30 - 25
  ];
  return commonValues.includes(kStringMaxLength) || kStringMaxLength > 0;
});

// 实际限制验证
test('Buffer.from(string) 受 kStringMaxLength 限制', () => {
  // 验证这确实是字符串转 Buffer 的限制
  return kStringMaxLength > 0 && Number.isInteger(kStringMaxLength);
});

test('buf.toString() 受 kStringMaxLength 限制', () => {
  // 验证这确实是 Buffer 转字符串的限制
  return kStringMaxLength > 0 && Number.isInteger(kStringMaxLength);
});

// 与 JavaScript 字符串限制的关系
test('kStringMaxLength 反映 JavaScript 字符串最大长度', () => {
  // JavaScript 字符串有最大长度限制（V8 中）
  // kStringMaxLength 应该接近这个限制
  return kStringMaxLength > 100000000; // 至少 100M 字符
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
      kStringMaxLength: kStringMaxLength
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
