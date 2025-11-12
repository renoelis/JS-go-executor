// buffer.INSPECT_MAX_BYTES - 基本功能测试
const { Buffer } = require('buffer');
const buffer = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// 基本存在性和类型测试
test('INSPECT_MAX_BYTES 存在于 buffer 模块', () => {
  return buffer.INSPECT_MAX_BYTES !== undefined;
});

test('INSPECT_MAX_BYTES 是数字类型', () => {
  return typeof buffer.INSPECT_MAX_BYTES === 'number';
});

test('INSPECT_MAX_BYTES 是有限数', () => {
  return Number.isFinite(buffer.INSPECT_MAX_BYTES);
});

test('INSPECT_MAX_BYTES 是整数', () => {
  return Number.isInteger(buffer.INSPECT_MAX_BYTES);
});

test('INSPECT_MAX_BYTES 是正数', () => {
  return buffer.INSPECT_MAX_BYTES > 0;
});

test('INSPECT_MAX_BYTES 不是 NaN', () => {
  return !Number.isNaN(buffer.INSPECT_MAX_BYTES);
});

// 默认值测试（Node.js v25.0.0 默认为 50）
test('INSPECT_MAX_BYTES 默认值为 50', () => {
  return buffer.INSPECT_MAX_BYTES === 50;
});

// 基本功能测试 - 小 Buffer 完整显示
test('小于 INSPECT_MAX_BYTES 的 Buffer 完整显示', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const inspected = buf.inspect();
  return inspected.includes('41') && inspected.includes('42') && inspected.includes('43') && !inspected.includes('...');
});

// 基本功能测试 - 大 Buffer 截断显示
test('大于 INSPECT_MAX_BYTES 的 Buffer 被截断', () => {
  const buf = Buffer.alloc(buffer.INSPECT_MAX_BYTES + 10, 0x41);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 刚好等于边界
test('等于 INSPECT_MAX_BYTES 的 Buffer 完整显示', () => {
  const buf = Buffer.alloc(buffer.INSPECT_MAX_BYTES, 0x41);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('等于 INSPECT_MAX_BYTES + 1 的 Buffer 被截断', () => {
  const buf = Buffer.alloc(buffer.INSPECT_MAX_BYTES + 1, 0x41);
  const inspected = buf.inspect();
  return inspected.includes('...');
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
