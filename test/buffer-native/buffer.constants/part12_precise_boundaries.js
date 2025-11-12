// Buffer.constants - 深度补漏：精确边界与错误详情（第8轮）
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

// === 2^53 精确边界测试 ===

// 1. MAX_LENGTH 等于 2^53 - 1
test('MAX_LENGTH === 2^53 - 1 精确验证', () => {
  const pow53 = Math.pow(2, 53);
  return constants.MAX_LENGTH === pow53 - 1;
});

// 2. MAX_LENGTH 小于 2^53
test('MAX_LENGTH < 2^53', () => {
  const pow53 = Math.pow(2, 53);
  return constants.MAX_LENGTH < pow53;
});

// 3. MAX_LENGTH + 1 等于 2^53
test('MAX_LENGTH + 1 === 2^53', () => {
  const pow53 = Math.pow(2, 53);
  return constants.MAX_LENGTH + 1 === pow53;
});

// 4. MAX_LENGTH 是最大的奇数安全整数
test('MAX_LENGTH 是奇数', () => {
  return constants.MAX_LENGTH % 2 === 1;
});

// 5. MAX_LENGTH 的二进制全是 1
test('MAX_LENGTH 的二进制表示有 53 个 1', () => {
  const binary = constants.MAX_LENGTH.toString(2);
  return binary.length === 53 && binary === '1'.repeat(53);
});

// 6. MAX_LENGTH 的十六进制验证
test('MAX_LENGTH 的十六进制是 0x1fffffffffffff', () => {
  return constants.MAX_LENGTH === 0x1fffffffffffff;
});

// === 2^29 精确边界测试 ===

// 7. MAX_STRING_LENGTH + 24 等于 2^29
test('MAX_STRING_LENGTH + 24 === 2^29', () => {
  return constants.MAX_STRING_LENGTH + 24 === Math.pow(2, 29);
});

// 8. MAX_STRING_LENGTH 的二进制特征
test('MAX_STRING_LENGTH 二进制有 29 位', () => {
  const binary = constants.MAX_STRING_LENGTH.toString(2);
  return binary.length === 29;
});

// 9. MAX_STRING_LENGTH 的二进制模式
test('MAX_STRING_LENGTH 二进制是 25 个 1 + 3 个 0 + 1 个 0', () => {
  const binary = constants.MAX_STRING_LENGTH.toString(2);
  // 11111111111111111111111101000
  return binary.endsWith('01000') && binary.startsWith('111111');
});

// 10. MAX_STRING_LENGTH 小于 2^30
test('MAX_STRING_LENGTH < 2^30', () => {
  return constants.MAX_STRING_LENGTH < Math.pow(2, 30);
});

// === 错误详情测试：类型错误 ===

// 11. 字符串长度参数的错误码
test('Buffer.alloc(字符串) 抛出 ERR_INVALID_ARG_TYPE', () => {
  try {
    Buffer.alloc('100');
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE' || e.name === 'TypeError';
  }
});

// 12. 对象作为长度参数
test('Buffer.alloc({}) 抛出类型错误', () => {
  try {
    Buffer.alloc({});
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE' || e.name === 'TypeError';
  }
});

// 13. 数组作为长度参数
test('Buffer.alloc([]) 抛出类型错误', () => {
  try {
    Buffer.alloc([]);
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE' || e.name === 'TypeError';
  }
});

// 14. null 作为长度参数
test('Buffer.alloc(null) 抛出类型错误', () => {
  try {
    Buffer.alloc(null);
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE' || e.name === 'TypeError';
  }
});

// 15. undefined 作为长度参数
test('Buffer.alloc(undefined) 抛出类型错误', () => {
  try {
    Buffer.alloc(undefined);
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE' || e.name === 'TypeError';
  }
});

// === 错误详情测试：范围错误 ===

// 16. 负数的错误码
test('Buffer.alloc(-1) 抛出 ERR_OUT_OF_RANGE', () => {
  try {
    Buffer.alloc(-1);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 17. Infinity 的错误码
test('Buffer.alloc(Infinity) 抛出范围错误', () => {
  try {
    Buffer.alloc(Infinity);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 18. -Infinity 的错误码
test('Buffer.alloc(-Infinity) 抛出范围错误', () => {
  try {
    Buffer.alloc(-Infinity);
    return false;
  } catch (e) {
    return e.code === 'ERR_OUT_OF_RANGE' || e.name === 'RangeError';
  }
});

// 19. 超过 MAX_LENGTH 的错误信息
test('超过 MAX_LENGTH 的错误包含边界信息', () => {
  try {
    Buffer.alloc(constants.MAX_LENGTH + 1);
    return false;
  } catch (e) {
    const msg = e.message.toLowerCase();
    return msg.includes('range') || msg.includes('allocation') ||
           msg.includes('length') || msg.includes('size');
  }
});

// 20. NaN 的处理
test('Buffer.alloc(NaN) 抛出错误或创建空 Buffer', () => {
  try {
    const buf = Buffer.alloc(NaN);
    return buf.length === 0; // 某些版本可能转为 0
  } catch (e) {
    return true; // 或者抛出错误也可以
  }
});

// === 特殊数值边界 ===

// 21. 2^52 可以创建（理论上，实际受内存限制）
test('2^52 小于 MAX_LENGTH', () => {
  return Math.pow(2, 52) < constants.MAX_LENGTH;
});

// 22. 2^31 - 1（32位有符号整数最大值）小于 MAX_LENGTH
test('2^31 - 1 < MAX_LENGTH', () => {
  return Math.pow(2, 31) - 1 < constants.MAX_LENGTH;
});

// 23. 2^32 - 1（32位无符号整数最大值）小于 MAX_LENGTH
test('2^32 - 1 < MAX_LENGTH', () => {
  return Math.pow(2, 32) - 1 < constants.MAX_LENGTH;
});

// 24. MAX_STRING_LENGTH 小于 2^31
test('MAX_STRING_LENGTH < 2^31', () => {
  return constants.MAX_STRING_LENGTH < Math.pow(2, 31);
});

// 25. 验证 24 的来源（V8 内部对齐）
test('24 字节是合理的元数据大小', () => {
  // V8 字符串对象头部需要元数据空间
  // 验证 24 是正整数且小于 100（合理的头部大小）
  const overhead = Math.pow(2, 29) - constants.MAX_STRING_LENGTH;
  return overhead === 24 && overhead > 0 && overhead < 100;
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
