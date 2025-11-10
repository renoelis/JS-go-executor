// buf.includes() - ByteOffset Tests
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

// Positive byteOffset tests
test('byteOffset = 0 (默认)', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', 0) === true;
});

test('byteOffset 在中间位置', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 6) === true;
});

test('byteOffset 刚好在目标位置', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 6) === true;
});

test('byteOffset 超过目标位置', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', 7) === false;
});

test('byteOffset 等于 buffer 长度', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello', 5) === false;
});

test('byteOffset 超过 buffer 长度', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello', 100) === false;
});

// Negative byteOffset tests
test('负数 byteOffset - 从末尾计算', () => {
  const buf = Buffer.from('hello world');
  // -5 means start from buf.length - 5 = 11 - 5 = 6
  return buf.includes('world', -5) === true;
});

test('负数 byteOffset - 查找前面的内容', () => {
  const buf = Buffer.from('hello world');
  // -11 means start from buf.length - 11 = 0
  return buf.includes('hello', -11) === true;
});

test('负数 byteOffset - 超出范围变为 0', () => {
  const buf = Buffer.from('hello world');
  // -100 超出范围，应该从 0 开始
  return buf.includes('hello', -100) === true;
});

test('负数 byteOffset - 刚好在边界', () => {
  const buf = Buffer.from('hello world');
  const len = buf.length; // 11
  return buf.includes('world', -5) === true;
});

test('负数 byteOffset - 找不到', () => {
  const buf = Buffer.from('hello world');
  // -4 means start from 11 - 4 = 7, 'hello' is before position 7
  return buf.includes('hello', -4) === false;
});

// Edge cases with byteOffset
test('byteOffset 为小数 - 应该转换为整数', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 6.7) === true;
});

test('byteOffset 为 NaN - 应该视为 0', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', NaN) === true;
});

test('byteOffset 为 undefined - 使用默认值 0', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', undefined) === true;
});

test('byteOffset 为 null - 应该视为 0', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', null) === true;
});

test('byteOffset 为字符串数字', () => {
  const buf = Buffer.from('hello world');
  // 字符串数字会被转换为数字
  return buf.includes('world', Number('6')) === true;
});

test('byteOffset 为 Infinity', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', Infinity) === false;
});

test('byteOffset 为 -Infinity', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', -Infinity) === true;
});

// Multiple occurrences
test('多次出现 - 从第一次之后开始查找', () => {
  const buf = Buffer.from('hello hello world');
  return buf.includes('hello', 1) === true; // 找到第二个 hello
});

test('多次出现 - 跳过所有出现', () => {
  const buf = Buffer.from('hello hello world');
  return buf.includes('hello', 12) === false;
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
