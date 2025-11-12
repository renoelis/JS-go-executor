// Buffer.constants - 深度补漏：别名关系与模块导出（第7轮）
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

// === kMaxLength 别名测试 ===

// 1. buffer.kMaxLength 存在
test('buffer.kMaxLength 存在', () => {
  return buffer.kMaxLength !== undefined;
});

// 2. kMaxLength 与 MAX_LENGTH 值相同
test('buffer.kMaxLength === constants.MAX_LENGTH', () => {
  return buffer.kMaxLength === constants.MAX_LENGTH;
});

// 3. kMaxLength 与 MAX_LENGTH 类型相同
test('kMaxLength 和 MAX_LENGTH 都是 number', () => {
  return typeof buffer.kMaxLength === 'number' &&
         typeof constants.MAX_LENGTH === 'number';
});

// 4. kMaxLength 的属性描述符
test('kMaxLength 应该是只读或可修改但独立', () => {
  const desc = Object.getOwnPropertyDescriptor(buffer, 'kMaxLength');
  // 验证属性描述符存在且值正确
  return desc && desc.value === constants.MAX_LENGTH;
});

// === kStringMaxLength 别名测试 ===

// 5. buffer.kStringMaxLength 存在
test('buffer.kStringMaxLength 存在', () => {
  return buffer.kStringMaxLength !== undefined;
});

// 6. kStringMaxLength 与 MAX_STRING_LENGTH 值相同
test('buffer.kStringMaxLength === constants.MAX_STRING_LENGTH', () => {
  return buffer.kStringMaxLength === constants.MAX_STRING_LENGTH;
});

// 7. kStringMaxLength 与 MAX_STRING_LENGTH 类型相同
test('kStringMaxLength 和 MAX_STRING_LENGTH 都是 number', () => {
  return typeof buffer.kStringMaxLength === 'number' &&
         typeof constants.MAX_STRING_LENGTH === 'number';
});

// === 模块导出完整性测试 ===

// 8. buffer 模块导出 Buffer
test('buffer 模块导出 Buffer', () => {
  return typeof buffer.Buffer === 'function';
});

// 9. buffer 模块导出 constants
test('buffer 模块导出 constants', () => {
  return typeof buffer.constants === 'object';
});

// 10. buffer.INSPECT_MAX_BYTES 存在
test('buffer.INSPECT_MAX_BYTES 存在', () => {
  return typeof buffer.INSPECT_MAX_BYTES === 'number';
});

// 11. INSPECT_MAX_BYTES 与 MAX_LENGTH 无关
test('INSPECT_MAX_BYTES 不等于 MAX_LENGTH', () => {
  return buffer.INSPECT_MAX_BYTES !== constants.MAX_LENGTH;
});

// 12. buffer.transcode 方法存在
test('buffer.transcode 方法存在', () => {
  return typeof buffer.transcode === 'function';
});

// 13. buffer.isUtf8 方法存在（Node v19+）
test('buffer.isUtf8 方法存在或为 undefined', () => {
  return typeof buffer.isUtf8 === 'function' || buffer.isUtf8 === undefined;
});

// 14. buffer.isAscii 方法存在（Node v19+）
test('buffer.isAscii 方法存在或为 undefined', () => {
  return typeof buffer.isAscii === 'function' || buffer.isAscii === undefined;
});

// === 别名独立性测试 ===

// 15. kMaxLength 不在 constants 对象内
test('constants.kMaxLength 不存在', () => {
  return !('kMaxLength' in constants);
});

// 16. kStringMaxLength 不在 constants 对象内
test('constants.kStringMaxLength 不存在', () => {
  return !('kStringMaxLength' in constants);
});

// 17. 别名数量验证
test('constants 只有 2 个属性', () => {
  return Object.keys(constants).length === 2;
});

// 18. buffer 模块导出至少包含核心成员
test('buffer 模块至少有 5 个导出成员', () => {
  return Object.keys(buffer).length >= 5;
});

// === 值的引用关系测试 ===

// 19. 多次访问 buffer.constants 返回同一引用
test('buffer.constants 引用稳定', () => {
  const ref1 = buffer.constants;
  const ref2 = buffer.constants;
  return ref1 === ref2;
});

// 20. require('buffer').constants 引用一致
test('多次 require 返回相同的 constants', () => {
  const buffer1 = require('buffer');
  const buffer2 = require('buffer');
  return buffer1.constants === buffer2.constants;
});

// === 别名值精确性测试 ===

// 21. kMaxLength 精确等于 9007199254740991
test('kMaxLength === 9007199254740991', () => {
  return buffer.kMaxLength === 9007199254740991;
});

// 22. kStringMaxLength 精确等于 536870888
test('kStringMaxLength === 536870888', () => {
  return buffer.kStringMaxLength === 536870888;
});

// 23. kMaxLength 等于 Number.MAX_SAFE_INTEGER
test('kMaxLength === Number.MAX_SAFE_INTEGER', () => {
  return buffer.kMaxLength === Number.MAX_SAFE_INTEGER;
});

// 24. kStringMaxLength 等于 2^29 - 24
test('kStringMaxLength === 2^29 - 24', () => {
  return buffer.kStringMaxLength === Math.pow(2, 29) - 24;
});

// 25. 别名与 constants 值的严格相等
test('所有别名严格相等测试', () => {
  return buffer.kMaxLength === constants.MAX_LENGTH &&
         buffer.kStringMaxLength === constants.MAX_STRING_LENGTH &&
         buffer.kMaxLength === Number.MAX_SAFE_INTEGER &&
         buffer.kStringMaxLength === 536870888;
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
