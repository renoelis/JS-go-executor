// Buffer.byteLength() - Basic Tests
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

// 基本 UTF-8 字符串测试
test('基本 ASCII 字符串', () => {
  const len = Buffer.byteLength('hello');
  return len === 5;
});

test('空字符串', () => {
  const len = Buffer.byteLength('');
  return len === 0;
});

test('单字符字符串', () => {
  const len = Buffer.byteLength('a');
  return len === 1;
});

test('数字字符串', () => {
  const len = Buffer.byteLength('12345');
  return len === 5;
});

test('中文字符（3 字节）', () => {
  const len = Buffer.byteLength('你好');
  // 每个中文字符 UTF-8 编码为 3 字节
  return len === 6;
});

test('emoji 表情（4 字节）', () => {
  const len = Buffer.byteLength('😀');
  // emoji 通常是 4 字节
  return len === 4;
});

test('混合 ASCII 和中文', () => {
  const len = Buffer.byteLength('hello你好');
  // 'hello' = 5 字节, '你好' = 6 字节
  return len === 11;
});

test('换行符和特殊字符', () => {
  const len = Buffer.byteLength('hello\nworld\t!');
  return len === 13;
});

test('空格和制表符', () => {
  const len = Buffer.byteLength('a b\tc');
  return len === 5;
});

test('长字符串（ASCII）', () => {
  const str = 'a'.repeat(1000);
  const len = Buffer.byteLength(str);
  return len === 1000;
});

test('长字符串（中文）', () => {
  const str = '中'.repeat(100);
  const len = Buffer.byteLength(str);
  // 每个中文 3 字节
  return len === 300;
});

test('多个 emoji', () => {
  const len = Buffer.byteLength('😀😁😂');
  // 每个 emoji 4 字节
  return len === 12;
});

// 默认编码测试
test('默认使用 utf8 编码', () => {
  const len1 = Buffer.byteLength('hello');
  const len2 = Buffer.byteLength('hello', 'utf8');
  return len1 === len2 && len1 === 5;
});

test('只传入字符串参数', () => {
  const len = Buffer.byteLength('test');
  return len === 4;
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
