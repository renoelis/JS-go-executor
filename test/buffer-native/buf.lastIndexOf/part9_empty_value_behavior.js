// buf.lastIndexOf() - 空值行为精确测试（与 indexOf 对比）
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

// 空字符串行为 - lastIndexOf 总是返回 byteOffset
test('空字符串: byteOffset = 0', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 0) === 0;
});

test('空字符串: byteOffset = 2', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 2) === 2;
});

test('空字符串: byteOffset = buf.length', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', buf.length) === buf.length;
});

test('空字符串: byteOffset > buf.length', () => {
  const buf = Buffer.from('test');
  // lastIndexOf 会将超出范围的 offset 限制为 buf.length - 1
  // 但空字符串特殊：应该返回调整后的 offset
  return buf.lastIndexOf('', 100) === buf.length;
});

test('空字符串: byteOffset = -1', () => {
  const buf = Buffer.from('test');
  // -1 相当于 4 - 1 = 3
  return buf.lastIndexOf('', -1) === 3;
});

test('空字符串: byteOffset = -buf.length', () => {
  const buf = Buffer.from('test');
  // -4 相当于 4 - 4 = 0
  return buf.lastIndexOf('', -buf.length) === 0;
});

test('空字符串: byteOffset 负数超出范围', () => {
  const buf = Buffer.from('test');
  // -100 相当于 4 - 100 = -96，应该被限制为 0 或返回 -1
  const result = buf.lastIndexOf('', -100);
  // 根据 Node.js 行为，负数超出范围时返回 0
  return result === 0;
});

test('空字符串: 默认 byteOffset（省略）', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('') === buf.length;
});

test('空字符串: byteOffset = undefined', () => {
  const buf = Buffer.from('world');
  return buf.lastIndexOf('', undefined) === buf.length;
});

// 空 Buffer 行为
test('空 Buffer: byteOffset = 0', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(Buffer.alloc(0), 0) === 0;
});

test('空 Buffer: byteOffset = 2', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(Buffer.alloc(0), 2) === 2;
});

test('空 Buffer: byteOffset = buf.length', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(Buffer.alloc(0), buf.length) === buf.length;
});

test('空 Buffer: 默认 byteOffset', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf(Buffer.alloc(0)) === buf.length;
});

// 空 Uint8Array 行为
test('空 Uint8Array: byteOffset = 1', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(new Uint8Array(0), 1) === 1;
});

test('空 Uint8Array: 默认 byteOffset', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(new Uint8Array(0)) === buf.length;
});

// 空 Buffer 本身的行为
test('空 Buffer 本身: 查找空字符串', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('') === 0;
});

test('空 Buffer 本身: 查找空 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf(Buffer.alloc(0)) === 0;
});

test('空 Buffer 本身: 查找空字符串 with offset 0', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('', 0) === 0;
});

// 与 indexOf 的对比（确保行为一致性）
test('对比 indexOf: 空字符串 byteOffset = 2', () => {
  const buf = Buffer.from('test');
  const lastIdx = buf.lastIndexOf('', 2);
  const firstIdx = buf.indexOf('', 2);
  // indexOf 从 offset 2 开始向后找，应该返回 2
  // lastIndexOf 从 offset 2 开始向前找，也应该返回 2
  return lastIdx === 2 && firstIdx === 2;
});

test('对比 indexOf: 空字符串默认 offset', () => {
  const buf = Buffer.from('hello');
  const lastIdx = buf.lastIndexOf('');
  const firstIdx = buf.indexOf('');
  // indexOf 默认从 0 开始，返回 0
  // lastIndexOf 默认从末尾开始，返回 buf.length
  return lastIdx === buf.length && firstIdx === 0;
});

// 不同编码的空字符串
test('空字符串: hex 编码', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 2, 'hex') === 2;
});

test('空字符串: base64 编码', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 3, 'base64') === 3;
});

test('空字符串: utf16le 编码', () => {
  const buf = Buffer.from('test', 'utf16le');
  return buf.lastIndexOf('', 4, 'utf16le') === 4;
});

// byteOffset 强制转换与空字符串
test('空字符串: byteOffset = NaN', () => {
  const buf = Buffer.from('test');
  // NaN 应该使用默认值 buf.length - 1，但空字符串返回调整后的值
  return buf.lastIndexOf('', NaN) === buf.length;
});

test('空字符串: byteOffset = {}', () => {
  const buf = Buffer.from('test');
  // {} 转换为 NaN，使用默认值
  return buf.lastIndexOf('', {}) === buf.length;
});

test('空字符串: byteOffset = null', () => {
  const buf = Buffer.from('test');
  // null 转换为 0
  return buf.lastIndexOf('', null) === 0;
});

test('空字符串: byteOffset = []', () => {
  const buf = Buffer.from('test');
  // [] 转换为 0
  return buf.lastIndexOf('', []) === 0;
});

test('空字符串: byteOffset = true', () => {
  const buf = Buffer.from('test');
  // true 转换为 1
  return buf.lastIndexOf('', true) === 1;
});

test('空字符串: byteOffset = false', () => {
  const buf = Buffer.from('test');
  // false 转换为 0
  return buf.lastIndexOf('', false) === 0;
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
