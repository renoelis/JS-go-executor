// buf.readBigUInt64BE() - 冻结和密封 Buffer 测试
const { Buffer } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 冻结 Buffer 测试（Node.js 不允许冻结有元素的 TypedArray/Buffer）
test('尝试冻结非空 Buffer 会抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(12345n, 0);
    Object.freeze(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('freeze');
  }
});

test('冻结空 Buffer 可以读取（长度为0）', () => {
  try {
    const buf = Buffer.alloc(0);
    Object.freeze(buf);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// 密封 Buffer 测试（Node.js 不允许密封有元素的 TypedArray/Buffer）
test('尝试密封非空 Buffer 会抛出 TypeError', () => {
  try {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(54321n, 0);
    Object.seal(buf);
    return false;
  } catch (e) {
    return e.name === 'TypeError' && e.message.includes('seal');
  }
});

test('密封空 Buffer 可以读取（长度为0）', () => {
  try {
    const buf = Buffer.alloc(0);
    Object.seal(buf);
    return buf.length === 0;
  } catch (e) {
    return false;
  }
});

// 不可扩展 Buffer 测试
test('不可扩展 Buffer 可以读取', () => {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(11111n, 0);
  Object.preventExtensions(buf);
  return buf.readBigUInt64BE(0) === 11111n;
});

test('不可扩展 Buffer 读取零', () => {
  const buf = Buffer.alloc(8);
  Object.preventExtensions(buf);
  return buf.readBigUInt64BE(0) === 0n;
});

// 不可扩展 Buffer 仍然可以正常读取和抛出错误
test('不可扩展 Buffer offset 越界仍抛出错误', () => {
  try {
    const buf = Buffer.alloc(8);
    Object.preventExtensions(buf);
    buf.readBigUInt64BE(1);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
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
