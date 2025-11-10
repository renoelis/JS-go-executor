// buf.lastIndexOf() - byteOffset 参数测试
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

// 基本 byteOffset 测试
test('byteOffset: 从指定位置向前搜索', () => {
  const buf = Buffer.from('hello hello hello');
  return buf.lastIndexOf('hello', 10) === 6;
});

test('byteOffset: 0 位置', () => {
  const buf = Buffer.from('hello world');
  return buf.lastIndexOf('hello', 0) === 0;
});

test('byteOffset: buf.length - 1（默认值）', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', buf.length - 1) === 5;
});

test('byteOffset: 省略参数使用默认值', () => {
  const buf = Buffer.from('abc abc');
  return buf.lastIndexOf('abc') === 4;
});

// 负数 byteOffset
test('byteOffset: 负数从末尾计算', () => {
  const buf = Buffer.from('hello hello hello');
  // -6 相当于 17 - 6 = 11
  return buf.lastIndexOf('hello', -6) === 6;
});

test('byteOffset: -1 从倒数第一个字节', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', -1) === 5;
});

test('byteOffset: 负数超出范围', () => {
  const buf = Buffer.from('hello');
  // -100 相当于 5 - 100 = -95，小于 0，返回 -1
  return buf.lastIndexOf('hello', -100) === -1;
});

test('byteOffset: 负数刚好到 0', () => {
  const buf = Buffer.from('hello world');
  // -11 相当于 11 - 11 = 0
  return buf.lastIndexOf('hello', -11) === 0;
});

// 超出范围的 byteOffset
test('byteOffset: 大于 buf.length', () => {
  const buf = Buffer.from('hello hello');
  // 超出范围会被调整为 buf.length - 1
  return buf.lastIndexOf('hello', 1000) === 6;
});

test('byteOffset: 等于 buf.length', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', buf.length) === 5;
});

test('byteOffset: 小于搜索值长度', () => {
  const buf = Buffer.from('hello world hello');
  // byteOffset = 3，小于 'hello' 的长度 5，无法找到完整匹配
  return buf.lastIndexOf('hello', 3) === 0;
});

// 边界情况
test('byteOffset: 刚好在匹配位置', () => {
  const buf = Buffer.from('abc abc abc');
  return buf.lastIndexOf('abc', 8) === 8;
});

test('byteOffset: 在匹配位置之前', () => {
  const buf = Buffer.from('test test test');
  return buf.lastIndexOf('test', 9) === 5;
});

test('byteOffset: 在第一个匹配之前', () => {
  const buf = Buffer.from('hello world hello');
  return buf.lastIndexOf('hello', 3) === 0;
});

// 多次出现的情况
test('byteOffset: 限制搜索范围找到第一个', () => {
  const buf = Buffer.from('aaa aaa aaa');
  return buf.lastIndexOf('aaa', 6) === 4;
});

test('byteOffset: 限制搜索范围找到最后一个', () => {
  const buf = Buffer.from('xyz xyz xyz');
  return buf.lastIndexOf('xyz', 10) === 8;
});

// 数字类型的 byteOffset
test('byteOffset: 浮点数会被转换为整数', () => {
  const buf = Buffer.from('hello hello');
  return buf.lastIndexOf('hello', 8.9) === 6;
});

test('byteOffset: NaN 被视为 buf.length - 1', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', NaN) === 5;
});

test('byteOffset: Infinity 被调整为 buf.length - 1', () => {
  const buf = Buffer.from('abc abc');
  return buf.lastIndexOf('abc', Infinity) === 4;
});

test('byteOffset: -Infinity 返回 -1', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('hello', -Infinity) === -1;
});

// 字符串类型的 byteOffset（应该被识别为 encoding）
test('byteOffset: 字符串参数识别为 encoding', () => {
  const buf = Buffer.from('hello hello');
  // 'utf8' 被识别为 encoding，byteOffset 使用默认值
  return buf.lastIndexOf('hello', 'utf8') === 6;
});

test('byteOffset: 数字字符串被识别为 encoding', () => {
  const buf = Buffer.from('test test');
  // '5' 是字符串，被识别为 encoding（无效），会抛出错误
  try {
    buf.lastIndexOf('test', '5');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

// 空 Buffer
test('byteOffset: 空 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('test', 0) === -1;
});

// 单字节 Buffer
test('byteOffset: 单字节 Buffer', () => {
  const buf = Buffer.from([65]);
  return buf.lastIndexOf(65, 0) === 0;
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
