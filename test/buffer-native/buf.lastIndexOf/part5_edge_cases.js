// buf.lastIndexOf() - 边界情况和特殊场景测试
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

// 空 Buffer
test('空 Buffer: 查找任何值', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('test') === -1;
});

test('空 Buffer: 查找数字', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf(0) === -1;
});

test('空 Buffer: 查找空字符串', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('') === 0;
});

// 单字节 Buffer
test('单字节: 匹配', () => {
  const buf = Buffer.from([65]);
  return buf.lastIndexOf(65) === 0;
});

test('单字节: 不匹配', () => {
  const buf = Buffer.from([65]);
  return buf.lastIndexOf(66) === -1;
});

test('单字节: 字符串匹配', () => {
  const buf = Buffer.from('A');
  return buf.lastIndexOf('A') === 0;
});

// 搜索值大于 Buffer
test('搜索值长度大于 Buffer', () => {
  const buf = Buffer.from('hi');
  return buf.lastIndexOf('hello') === -1;
});

test('搜索值长度等于 Buffer', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('test') === 0;
});

// 边界匹配
test('匹配在开头', () => {
  const buf = Buffer.from('hello world');
  return buf.lastIndexOf('hello') === 0;
});

test('匹配在末尾', () => {
  const buf = Buffer.from('hello world');
  return buf.lastIndexOf('world') === 6;
});

test('完全匹配', () => {
  const buf = Buffer.from('exact');
  return buf.lastIndexOf('exact') === 0;
});

// 部分匹配
test('部分匹配不算', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('hello world') === -1;
});

test('重叠匹配取最后一个', () => {
  const buf = Buffer.from('aaa');
  return buf.lastIndexOf('aa') === 1;
});

// 连续重复
test('连续重复字节', () => {
  const buf = Buffer.from([1, 1, 1, 1, 1]);
  return buf.lastIndexOf(Buffer.from([1, 1])) === 3;
});

test('连续重复字符', () => {
  const buf = Buffer.from('aaaa');
  return buf.lastIndexOf('aa') === 2;
});

// UTF-16 对齐
test('UTF16LE: 奇数 byteOffset 自动对齐', () => {
  const buf = Buffer.from('hello', 'utf16le');
  // byteOffset 3 是奇数，应该调整到 2
  return buf.lastIndexOf('e', 3, 'utf16le') === 2;
});

test('UTF16LE: 偶数 byteOffset 正常', () => {
  const buf = Buffer.from('test', 'utf16le');
  return buf.lastIndexOf('t', 6, 'utf16le') === 6;
});

test('UCS2: 对齐行为同 utf16le', () => {
  const buf = Buffer.from('abc', 'ucs2');
  return buf.lastIndexOf('b', 3, 'ucs2') === 2;
});

// 大 Buffer 性能
test('大 Buffer: 1000 字节', () => {
  const buf = Buffer.alloc(1000);
  buf.write('needle', 500);
  buf.write('needle', 800);
  return buf.lastIndexOf('needle') === 800;
});

test('大 Buffer: 重复模式', () => {
  const pattern = 'test';
  const buf = Buffer.alloc(10000);
  for (let i = 0; i < 10000; i += 100) {
    buf.write(pattern, i);
  }
  return buf.lastIndexOf(pattern) === 9900;
});

// 特殊字符
test('特殊字符: 换行符', () => {
  const buf = Buffer.from('line1\nline2\nline3\n');
  return buf.lastIndexOf('\n') === 17;
});

test('特殊字符: 制表符', () => {
  const buf = Buffer.from('col1\tcol2\tcol3\t');
  return buf.lastIndexOf('\t') === 14;
});

test('特殊字符: 空格', () => {
  const buf = Buffer.from('word1 word2 word3 ');
  return buf.lastIndexOf(' ') === 17;
});

test('特殊字符: null 字节', () => {
  const buf = Buffer.from([0, 1, 2, 0, 3]);
  return buf.lastIndexOf(0) === 3;
});

// 不同编码的相同内容
test('不同编码: utf8 vs ascii', () => {
  const buf = Buffer.from('hello');
  const idx1 = buf.lastIndexOf('hello', undefined, 'utf8');
  const idx2 = buf.lastIndexOf('hello', undefined, 'ascii');
  return idx1 === idx2;
});

test('不同编码: hex 查找', () => {
  const buf = Buffer.from([0xFF, 0xFE, 0xFF, 0xFE]);
  return buf.lastIndexOf('FFFE', 'hex') === 2;
});

// 无参数调用（Node.js 会抛出错误）
test('无参数: 抛出错误', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf();
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

// 多个参数
test('三个参数: value, byteOffset, encoding', () => {
  const buf = Buffer.from('hello hello');
  return buf.lastIndexOf('hello', 10, 'utf8') === 6;
});

test('两个参数: value, encoding', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', 'utf8') === 5;
});

test('两个参数: value, byteOffset（数字）', () => {
  const buf = Buffer.from('abc abc');
  return buf.lastIndexOf('abc', 5) === 4;
});

// 未找到的情况
test('未找到: 完全不同', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('world') === -1;
});

test('未找到: 大小写不同', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('HELLO') === -1;
});

test('未找到: byteOffset 太小', () => {
  const buf = Buffer.from('hello world hello');
  return buf.lastIndexOf('world', 5) === -1;
});

// 只有一个匹配
test('只有一个匹配: 在开头', () => {
  const buf = Buffer.from('unique test');
  return buf.lastIndexOf('unique') === 0;
});

test('只有一个匹配: 在中间', () => {
  const buf = Buffer.from('test unique test');
  return buf.lastIndexOf('unique') === 5;
});

test('只有一个匹配: 在末尾', () => {
  const buf = Buffer.from('test unique');
  return buf.lastIndexOf('unique') === 5;
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
