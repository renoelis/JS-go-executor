// buffer.INSPECT_MAX_BYTES - Test
const { INSPECT_MAX_BYTES } = require('buffer');

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
test('INSPECT_MAX_BYTES 存在', () => {
  return INSPECT_MAX_BYTES !== undefined;
});

test('INSPECT_MAX_BYTES 是数字', () => {
  return typeof INSPECT_MAX_BYTES === 'number';
});

test('INSPECT_MAX_BYTES 是正数', () => {
  return INSPECT_MAX_BYTES > 0;
});

test('INSPECT_MAX_BYTES 是整数', () => {
  return Number.isInteger(INSPECT_MAX_BYTES);
});

// 默认值测试（通常是 50）
test('INSPECT_MAX_BYTES 默认值合理', () => {
  return INSPECT_MAX_BYTES >= 50 && INSPECT_MAX_BYTES <= 100;
});

// 功能测试 - inspect 行为
test('Buffer inspect 受 INSPECT_MAX_BYTES 限制', () => {
  const { Buffer } = require('buffer');
  const buf = Buffer.alloc(INSPECT_MAX_BYTES + 10, 0x41);
  const inspected = buf.inspect();
  // inspect 输出应该被截断
  return inspected.includes('...') || inspected.length < buf.length * 3;
});

test('小于 INSPECT_MAX_BYTES 的 Buffer 完整显示', () => {
  const { Buffer } = require('buffer');
  const buf = Buffer.alloc(10, 0x41);
  const inspected = buf.inspect();
  return inspected.includes('41') && !inspected.includes('...');
});

// 可修改性测试
test('INSPECT_MAX_BYTES 可以被修改', () => {
  const buffer = require('buffer');
  const original = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = 100;
  const modified = buffer.INSPECT_MAX_BYTES === 100;
  buffer.INSPECT_MAX_BYTES = original; // 恢复
  return modified;
});

test('修改 INSPECT_MAX_BYTES 影响 inspect 行为', () => {
  const { Buffer } = require('buffer');
  const buffer = require('buffer');
  const original = buffer.INSPECT_MAX_BYTES;
  
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0x41);
  const inspected = buf.inspect();
  const hasEllipsis = inspected.includes('...');
  
  buffer.INSPECT_MAX_BYTES = original; // 恢复
  return hasEllipsis;
});

// 边界值测试
test('INSPECT_MAX_BYTES 设为 0', () => {
  const buffer = require('buffer');
  const original = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = 0;
  const { Buffer } = require('buffer');
  const buf = Buffer.alloc(10, 0x41);
  const inspected = buf.inspect();
  buffer.INSPECT_MAX_BYTES = original;
  return typeof inspected === 'string';
});

test('INSPECT_MAX_BYTES 设为负数（会抛出错误）', () => {
  const buffer = require('buffer');
  const original = buffer.INSPECT_MAX_BYTES;
  try {
    buffer.INSPECT_MAX_BYTES = -1;
    const { Buffer } = require('buffer');
    const buf = Buffer.alloc(10, 0x41);
    const inspected = buf.inspect();
    buffer.INSPECT_MAX_BYTES = original;
    return false; // 应该抛出错误
  } catch (e) {
    buffer.INSPECT_MAX_BYTES = original;
    return e instanceof RangeError && e.message.includes('out of range');
  }
});

test('INSPECT_MAX_BYTES 设为超大值', () => {
  const buffer = require('buffer');
  const original = buffer.INSPECT_MAX_BYTES;
  buffer.INSPECT_MAX_BYTES = 1000000;
  const { Buffer } = require('buffer');
  const buf = Buffer.alloc(100, 0x41);
  const inspected = buf.inspect();
  buffer.INSPECT_MAX_BYTES = original;
  return !inspected.includes('...');
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
