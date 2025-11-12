// buffer.INSPECT_MAX_BYTES - 可变性测试
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
    // 每次测试后恢复原始值
    buffer.INSPECT_MAX_BYTES = originalValue;
  }
}

// 可变性测试
test('INSPECT_MAX_BYTES 可以被赋值修改', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  return buffer.INSPECT_MAX_BYTES === 100;
});

test('修改 INSPECT_MAX_BYTES 为小值', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  return buffer.INSPECT_MAX_BYTES === 5;
});

test('修改 INSPECT_MAX_BYTES 为大值', () => {
  buffer.INSPECT_MAX_BYTES = 1000;
  return buffer.INSPECT_MAX_BYTES === 1000;
});

test('修改 INSPECT_MAX_BYTES 为 1', () => {
  buffer.INSPECT_MAX_BYTES = 1;
  return buffer.INSPECT_MAX_BYTES === 1;
});

// 修改后的功能影响
test('修改为小值后 Buffer 显示被截断', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0x41);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('修改为大值后 Buffer 完整显示', () => {
  buffer.INSPECT_MAX_BYTES = 1000;
  const buf = Buffer.alloc(100, 0x41);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('修改为 1 时只显示 1 字节', () => {
  buffer.INSPECT_MAX_BYTES = 1;
  const buf = Buffer.from([0x41, 0x42, 0x43]);
  const inspected = buf.inspect();
  return inspected.includes('41') && inspected.includes('...');
});

test('修改后再次读取保持修改后的值', () => {
  buffer.INSPECT_MAX_BYTES = 77;
  const val1 = buffer.INSPECT_MAX_BYTES;
  const val2 = buffer.INSPECT_MAX_BYTES;
  return val1 === 77 && val2 === 77;
});

test('多次修改 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  buffer.INSPECT_MAX_BYTES = 20;
  buffer.INSPECT_MAX_BYTES = 30;
  return buffer.INSPECT_MAX_BYTES === 30;
});

test('修改为浮点数会被接受', () => {
  buffer.INSPECT_MAX_BYTES = 55.7;
  return buffer.INSPECT_MAX_BYTES === 55.7;
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
