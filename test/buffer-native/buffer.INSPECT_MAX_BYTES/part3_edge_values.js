// buffer.INSPECT_MAX_BYTES - 边界值测试
const { Buffer } = require('buffer');
const buffer = require('buffer');

const tests = [];
const originalValue = buffer.INSPECT_MAX_BYTES;

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
    console.log(`${pass ? '✅' : '❌'} ${name}`);
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
    console.log(`❌ ${name}: ${e.message}`);
  } finally {
    buffer.INSPECT_MAX_BYTES = originalValue;
  }
}

// 零值测试
test('设置 INSPECT_MAX_BYTES 为 0', () => {
  buffer.INSPECT_MAX_BYTES = 0;
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  // 设为 0 时所有内容都会被截断
  return typeof inspected === 'string' && inspected.includes('...');
});

test('INSPECT_MAX_BYTES 为 0 时空 Buffer 仍可 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 0;
  const buf = Buffer.alloc(0);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
});

// 负数测试
test('设置 INSPECT_MAX_BYTES 为负数', () => {
  try {
    buffer.INSPECT_MAX_BYTES = -1;
    const buf = Buffer.from([0x41]);
    const inspected = buf.inspect();
    // 负数会导致所有内容被截断或按 0 处理
    return typeof inspected === 'string';
  } catch (e) {
    // 可能抛出 RangeError
    return true;
  }
});

test('设置 INSPECT_MAX_BYTES 为 -100', () => {
  try {
    buffer.INSPECT_MAX_BYTES = -100;
    const buf = Buffer.from([0x41]);
    const inspected = buf.inspect();
    return typeof inspected === 'string';
  } catch (e) {
    return true;
  }
});

// 极大值测试
test('设置 INSPECT_MAX_BYTES 为 Number.MAX_SAFE_INTEGER', () => {
  buffer.INSPECT_MAX_BYTES = Number.MAX_SAFE_INTEGER;
  const buf = Buffer.alloc(100, 0x41);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('设置 INSPECT_MAX_BYTES 为 Infinity', () => {
  buffer.INSPECT_MAX_BYTES = Infinity;
  const buf = Buffer.alloc(100, 0x41);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
});

test('设置 INSPECT_MAX_BYTES 为 -Infinity', () => {
  try {
    buffer.INSPECT_MAX_BYTES = -Infinity;
    const buf = Buffer.from([0x41]);
    const inspected = buf.inspect();
    return typeof inspected === 'string';
  } catch (e) {
    return true;
  }
});

// NaN 测试
test('设置 INSPECT_MAX_BYTES 为 NaN 会抛出 RangeError', () => {
  try {
    buffer.INSPECT_MAX_BYTES = NaN;
    return false;
  } catch (e) {
    return e.message.includes('out of range') && e.message.includes('NaN');
  }
});

// 小数测试
test('设置 INSPECT_MAX_BYTES 为小数 10.5', () => {
  buffer.INSPECT_MAX_BYTES = 10.5;
  const buf = Buffer.alloc(15, 0x41);
  const inspected = buf.inspect();
  // 小数可能被截断或四舍五入
  return typeof inspected === 'string';
});

test('设置 INSPECT_MAX_BYTES 为小数 0.9', () => {
  buffer.INSPECT_MAX_BYTES = 0.9;
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
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
