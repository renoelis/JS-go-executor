// buffer.INSPECT_MAX_BYTES - 并发和极端场景测试
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

// 极大 Buffer 测试（避免 OOM）
test('极大 INSPECT_MAX_BYTES 与小 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = Number.MAX_SAFE_INTEGER;
  const buf = Buffer.alloc(10, 0xFF);
  const inspected = buf.inspect();
  return typeof inspected === 'string' && !inspected.includes('...');
});

test('INSPECT_MAX_BYTES 大于 Buffer 长度很多', () => {
  buffer.INSPECT_MAX_BYTES = 1000000;
  const buf = Buffer.alloc(10, 0xAA);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('中等大小 Buffer 1KB', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(1024, 0xBB);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('大 Buffer 10KB', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(10 * 1024, 0xCC);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 快速修改 INSPECT_MAX_BYTES
test('快速多次修改 INSPECT_MAX_BYTES', () => {
  for (let i = 0; i < 10; i++) {
    buffer.INSPECT_MAX_BYTES = i * 10 + 10;
  }
  return buffer.INSPECT_MAX_BYTES === 100;
});

test('频繁修改和 inspect 交替', () => {
  const buf = Buffer.alloc(50, 0xDD);
  for (let i = 1; i <= 5; i++) {
    buffer.INSPECT_MAX_BYTES = i * 10;
    const inspected = buf.inspect();
    if (typeof inspected !== 'string') return false;
  }
  return true;
});

// 边界值组合
test('INSPECT_MAX_BYTES=1 与 1 字节 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 1;
  const buf = Buffer.from([0xFF]);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('INSPECT_MAX_BYTES=1 与 2 字节 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 1;
  const buf = Buffer.from([0xFF, 0xEE]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('INSPECT_MAX_BYTES 为最大安全整数时', () => {
  buffer.INSPECT_MAX_BYTES = Number.MAX_SAFE_INTEGER;
  const buf = Buffer.alloc(100, 0x77);
  const inspected = buf.inspect();
  return !inspected.includes('...');
});

test('INSPECT_MAX_BYTES 为 Infinity 时小 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = Infinity;
  const buf = Buffer.alloc(50, 0x88);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
});

// 空 Buffer 的各种场景
test('INSPECT_MAX_BYTES=0 与空 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 0;
  const buf = Buffer.alloc(0);
  const inspected = buf.inspect();
  return typeof inspected === 'string' && !inspected.includes('...');
});

test('INSPECT_MAX_BYTES=100 与空 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 100;
  const buf = Buffer.alloc(0);
  const inspected = buf.inspect();
  return typeof inspected === 'string' && !inspected.includes('...');
});

test('INSPECT_MAX_BYTES=Infinity 与空 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = Infinity;
  const buf = Buffer.alloc(0);
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
