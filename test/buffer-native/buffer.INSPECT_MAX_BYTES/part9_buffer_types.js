// buffer.INSPECT_MAX_BYTES - 特殊 Buffer 类型测试
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

// 不同来源的 Buffer
test('通过 Buffer.from(string) 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('Hello World');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('通过 Buffer.from(array) 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 3;
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('通过 Buffer.alloc() 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.alloc(20, 0xAA);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('通过 Buffer.allocUnsafe() 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.allocUnsafe(20);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
});

test('通过 Buffer.allocUnsafeSlow() 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.allocUnsafeSlow(20);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
});

test('通过 Buffer.concat() 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf1 = Buffer.from([1, 2, 3]);
  const buf2 = Buffer.from([4, 5, 6]);
  const buf = Buffer.concat([buf1, buf2]);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// slice 和 subarray 创建的视图
test('通过 slice() 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 3;
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sliced = buf.slice(0, 6);
  const inspected = sliced.inspect();
  return inspected.includes('...');
});

test('通过 subarray() 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 3;
  const buf = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
  const sub = buf.subarray(0, 6);
  const inspected = sub.inspect();
  return inspected.includes('...');
});

// TypedArray 相关
test('从 Uint8Array 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 4;
  const arr = new Uint8Array([1, 2, 3, 4, 5, 6, 7]);
  const buf = Buffer.from(arr);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('从 ArrayBuffer 创建的 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 4;
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  const inspected = buf.inspect();
  return inspected.includes('...');
});

// 不同编码的字符串 Buffer
test('UTF-8 编码的字符串 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('你好世界', 'utf8');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('Base64 编码的字符串 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  const inspected = buf.inspect();
  return inspected.includes('...');
});

test('Hex 编码的字符串 Buffer', () => {
  buffer.INSPECT_MAX_BYTES = 5;
  const buf = Buffer.from('48656c6c6f20576f726c64', 'hex');
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
