// buffer.INSPECT_MAX_BYTES - inspect 行为详细测试
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

// 不同大小的 Buffer 与 INSPECT_MAX_BYTES 的关系
test('空 Buffer 的 inspect 不受 INSPECT_MAX_BYTES 影响', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(0);
  const inspected = buf.inspect();
  return typeof inspected === 'string' && !inspected.includes('...');
});

test('1 字节 Buffer 小于 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 50;
  const buf = Buffer.from([0xAB]);
  const inspected = buf.inspect();
  return inspected.includes('ab') && !inspected.includes('...');
});

test('刚好达到 INSPECT_MAX_BYTES 边界', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  const buf = Buffer.alloc(10, 0xFF);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('超出 INSPECT_MAX_BYTES 1 字节', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  const buf = Buffer.alloc(11, 0xFF);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('大幅超出 INSPECT_MAX_BYTES', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  const buf = Buffer.alloc(1000, 0xAA);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 不同内容的 Buffer
test('全零 Buffer 的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 20;
  const buf = Buffer.alloc(50, 0x00);
  const inspected = buf.inspect();
  return inspected.includes('00') && inspected.includes('...');
});

test('全 0xFF Buffer 的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 20;
  const buf = Buffer.alloc(50, 0xFF);
  const inspected = buf.inspect();
  return inspected.includes('ff') && inspected.includes('...');
});

test('递增序列 Buffer 的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 10;
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const inspected = buf.inspect();
  return inspected.includes('00') && inspected.includes('...');
});

test('ASCII 字符串 Buffer 的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('Hello World');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('UTF-8 多字节字符 Buffer 的 inspect', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('你好世界');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// inspect 输出格式验证
test('inspect 返回字符串类型', () => {
  const buf = Buffer.from([0x41]);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
});

test('inspect 输出包含 Buffer 标识', () => {
  const buf = Buffer.from([0x41, 0x42]);
  const inspected = buf.inspect();
  return inspected.includes('Buffer') || inspected.includes('[');
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
