// buf.indexOf() - ByteOffset Tests
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

// 正数偏移测试
test('正数偏移 - 0', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('hello', 0) === 0;
});

test('正数偏移 - 跳过第一个匹配', () => {
  const buf = Buffer.from('hello hello');
  return buf.indexOf('hello', 1) === 6;
});

test('正数偏移 - 中间位置', () => {
  const buf = Buffer.from('abcdefghij');
  return buf.indexOf('def', 3) === 3;
});

test('正数偏移 - 超出范围', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', 10) === -1;
});

test('正数偏移 - 等于长度', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', 5) === -1;
});

// 负数偏移测试
test('负数偏移 - 从末尾计算', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', -5) === 6;
});

test('负数偏移 - -1', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', -1) === 4;
});

test('负数偏移 - 超出范围', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h', -100) === 0;
});

test('负数偏移 - UTF-16LE', () => {
  const buf = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return buf.indexOf('\u03a3', -4, 'utf16le') === 6;
});

// 零偏移测试
test('零偏移 - 显式指定', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', 0) === 0;
});

// 浮点数偏移测试（应该被转换为整数）
test('浮点数偏移 - 向下取整', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 3.9) === 6;
});

test('浮点数偏移 - 负浮点数', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', -5.5) === 6;
});

// NaN 偏移测试（应该搜索整个 buffer）
test('NaN 偏移 - undefined', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', undefined) === 6;
});

test('NaN 偏移 - null', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', null) === 6;
});

test('NaN 偏移 - 空对象', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', {}) === 6;
});

test('NaN 偏移 - 空数组', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', []) === 6;
});

test('NaN 偏移 - 字符串（会被当作 encoding）', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.indexOf('world', 'abc');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

// 边界偏移测试
test('边界偏移 - 最后一个字节', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', 4) === 4;
});

test('边界偏移 - 刚好在匹配位置', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 6) === 6;
});

test('边界偏移 - 刚好错过匹配', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 7) === -1;
});

// 多次查找测试
test('多次查找 - 第一次出现', () => {
  const buf = Buffer.from('abc abc abc');
  return buf.indexOf('abc', 0) === 0;
});

test('多次查找 - 第二次出现', () => {
  const buf = Buffer.from('abc abc abc');
  return buf.indexOf('abc', 1) === 4;
});

test('多次查找 - 第三次出现', () => {
  const buf = Buffer.from('abc abc abc');
  return buf.indexOf('abc', 5) === 8;
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
