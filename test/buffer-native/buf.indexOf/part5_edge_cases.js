// buf.indexOf() - Edge Cases Tests
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

// 边界情况
test('查找长度大于 Buffer 的字符串', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello world') === -1;
});

test('查找长度等于 Buffer 的字符串', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello') === 0;
});

test('单字节 Buffer 查找', () => {
  const buf = Buffer.from([42]);
  return buf.indexOf(42) === 0;
});

test('单字节 Buffer 未找到', () => {
  const buf = Buffer.from([42]);
  return buf.indexOf(43) === -1;
});

// 重复字符测试
test('重复字符 - 查找第一个', () => {
  const buf = Buffer.from('aaaa');
  return buf.indexOf('a') === 0;
});

test('重复字符 - 查找多个', () => {
  const buf = Buffer.from('aaaa');
  return buf.indexOf('aa') === 0;
});

test('重复字符 - 带偏移', () => {
  const buf = Buffer.from('aaaa');
  return buf.indexOf('aa', 1) === 1;
});

// 特殊字符测试
test('特殊字符 - 换行符', () => {
  const buf = Buffer.from('hello\nworld');
  return buf.indexOf('\n') === 5;
});

test('特殊字符 - 制表符', () => {
  const buf = Buffer.from('hello\tworld');
  return buf.indexOf('\t') === 5;
});

test('特殊字符 - 回车符', () => {
  const buf = Buffer.from('hello\rworld');
  return buf.indexOf('\r') === 5;
});

test('特殊字符 - 空字符', () => {
  const buf = Buffer.from('hello\0world');
  return buf.indexOf('\0') === 5;
});

test('特殊字符 - 多个空字符', () => {
  const buf = Buffer.from([1, 0, 0, 2]);
  return buf.indexOf(0) === 1;
});

// Unicode 测试
test('Unicode - 中文字符', () => {
  const buf = Buffer.from('你好世界');
  return buf.indexOf('世界') === 6;
});

test('Unicode - 日文字符', () => {
  const buf = Buffer.from('こんにちは');
  return buf.indexOf('にち') === 6;
});

test('Unicode - 韩文字符', () => {
  const buf = Buffer.from('안녕하세요');
  return buf.indexOf('하세') === 6;
});

test('Unicode - 混合字符', () => {
  const buf = Buffer.from('hello世界');
  return buf.indexOf('世界') === 5;
});

test('Unicode - Emoji', () => {
  const buf = Buffer.from('😀😁😂');
  return buf.indexOf('😁') === 4;
});

test('Unicode - 组合 Emoji', () => {
  const buf = Buffer.from('👨‍👩‍👧‍👦');
  return buf.indexOf('👨') === 0;
});

// 大小写敏感测试
test('大小写敏感 - 大写', () => {
  const buf = Buffer.from('Hello World');
  return buf.indexOf('WORLD') === -1;
});

test('大小写敏感 - 小写', () => {
  const buf = Buffer.from('Hello World');
  return buf.indexOf('world') === -1;
});

test('大小写敏感 - 匹配', () => {
  const buf = Buffer.from('Hello World');
  return buf.indexOf('World') === 6;
});

// 部分匹配测试
test('部分匹配 - 开头匹配但不完整', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('hello world!') === -1;
});

test('部分匹配 - 中间匹配', () => {
  const buf = Buffer.from('abcdefghij');
  return buf.indexOf('cde') === 2;
});

// 连续查找测试
test('连续查找 - 相邻匹配', () => {
  const buf = Buffer.from('aaa');
  return buf.indexOf('aa') === 0;
});

test('连续查找 - 重叠模式', () => {
  const buf = Buffer.from('ababab');
  return buf.indexOf('abab') === 0;
});

// 二进制数据测试
test('二进制数据 - 查找字节序列', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF]);
  return buf.indexOf(Buffer.from([0x02, 0x03])) === 2;
});

test('二进制数据 - 查找 0xFF', () => {
  const buf = Buffer.from([0x00, 0x01, 0xFF, 0x03]);
  return buf.indexOf(0xFF) === 2;
});

test('二进制数据 - 查找 0x00', () => {
  const buf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
  return buf.indexOf(0x00) === 0;
});

// 长 Buffer 测试
test('长 Buffer - 查找末尾', () => {
  const buf = Buffer.alloc(1000);
  buf.write('target', 994);
  return buf.indexOf('target') === 994;
});

test('长 Buffer - 查找开头', () => {
  const buf = Buffer.alloc(1000);
  buf.write('target', 0);
  return buf.indexOf('target') === 0;
});

test('长 Buffer - 查找中间', () => {
  const buf = Buffer.alloc(1000);
  buf.write('target', 500);
  return buf.indexOf('target') === 500;
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
