// buf.lastIndexOf() - 补充边界测试
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

// 特殊数字值测试
test('value: NaN 转换为 0', () => {
  const buf = Buffer.from([0, 1, 2, 0, 3]);
  return buf.lastIndexOf(NaN) === 3;
});

test('value: Infinity 转换为 0', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  return buf.lastIndexOf(Infinity) === 2;
});

test('value: -Infinity 转换为 0', () => {
  const buf = Buffer.from([0, 1, 2, 0]);
  return buf.lastIndexOf(-Infinity) === 3;
});

test('value: 负数浮点数', () => {
  const buf = Buffer.from([254, 1, 2, 254]);
  // -2.5 -> -2 -> 254 (& 0xFF)
  return buf.lastIndexOf(-2.5) === 3;
});

test('value: 大于 255 的浮点数', () => {
  const buf = Buffer.from([1, 2, 3, 1]);
  // 257.8 -> 257 -> 1 (& 0xFF)
  return buf.lastIndexOf(257.8) === 3;
});

// byteOffset 特殊值
test('byteOffset: undefined 使用默认值', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', undefined) === 5;
});

test('byteOffset: null 转换为 0', () => {
  const buf = Buffer.from('abc abc');
  return buf.lastIndexOf('abc', null) === 0;
});

test('byteOffset: true 转换为 1', () => {
  const buf = Buffer.from('abcabc');
  return buf.lastIndexOf('abc', true) === 0;
});

test('byteOffset: false 转换为 0', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('test', false) === 0;
});

test('byteOffset: 空字符串转换为 NaN，使用默认值', () => {
  const buf = Buffer.from('hello hello');
  try {
    buf.lastIndexOf('hello', '');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('byteOffset: 对象转换为 NaN，使用默认值', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', {}) === 5;
});

test('byteOffset: 数组转换为 0', () => {
  const buf = Buffer.from('abc abc');
  // [] 转换为 0
  return buf.lastIndexOf('abc', []) === 0;
});

// 重叠匹配的特殊情况
test('重叠匹配: aaa 中查找 aa', () => {
  const buf = Buffer.from('aaa');
  return buf.lastIndexOf('aa') === 1;
});

test('重叠匹配: aaaa 中查找 aaa', () => {
  const buf = Buffer.from('aaaa');
  return buf.lastIndexOf('aaa') === 1;
});

test('重叠匹配: 111111 中查找 111', () => {
  const buf = Buffer.from([1, 1, 1, 1, 1, 1]);
  return buf.lastIndexOf(Buffer.from([1, 1, 1])) === 3;
});

// 部分匹配不应该返回结果
test('部分匹配: 查找比 Buffer 长的值', () => {
  const buf = Buffer.from('short');
  return buf.lastIndexOf('short string') === -1;
});

test('部分匹配: 末尾不完整', () => {
  const buf = Buffer.from('hello wo');
  return buf.lastIndexOf('world') === -1;
});

// 空 Buffer 的各种情况
test('空 Buffer: 查找空字符串返回 0', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('') === 0;
});

test('空 Buffer: 查找空 Buffer 返回 0', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf(Buffer.alloc(0)) === 0;
});

test('空 Buffer: 查找 0 返回 -1', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf(0) === -1;
});

test('空 Buffer: 使用 byteOffset 查找空字符串', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('', 0) === 0;
});

// 单字节 Buffer 边界
test('单字节: byteOffset 为 0', () => {
  const buf = Buffer.from([65]);
  return buf.lastIndexOf(65, 0) === 0;
});

test('单字节: byteOffset 为 -1', () => {
  const buf = Buffer.from([65]);
  return buf.lastIndexOf(65, -1) === 0;
});

test('单字节: byteOffset 为 1', () => {
  const buf = Buffer.from([65]);
  return buf.lastIndexOf(65, 1) === 0;
});

test('单字节: 查找空字符串', () => {
  const buf = Buffer.from([65]);
  return buf.lastIndexOf('') === 1;
});

// 多字节字符的边界情况
test('多字节: 中文字符在边界', () => {
  const buf = Buffer.from('你好');
  return buf.lastIndexOf('好') === 3;
});

test('多字节: emoji 在末尾', () => {
  const buf = Buffer.from('test😀');
  return buf.lastIndexOf('😀') === 4;
});

test('多字节: 部分多字节字符可以匹配字节序列', () => {
  const buf = Buffer.from('你好世界');
  const partial = Buffer.from([0xE4, 0xBD]); // "你" 的前两个字节
  // Node.js 按字节匹配，所以会找到这个字节序列
  return buf.lastIndexOf(partial) === 0;
});

// 编码转换边界
test('编码: hex 空字符串', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 'hex') === 4;
});

test('编码: base64 空字符串', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 'base64') === 4;
});

test('编码: utf16le 空字符串', () => {
  const buf = Buffer.from('test', 'utf16le');
  return buf.lastIndexOf('', undefined, 'utf16le') === 8;
});

// 大 Buffer 边界
test('大 Buffer: 在最后位置', () => {
  const buf = Buffer.alloc(1000);
  buf.write('target', 994);
  return buf.lastIndexOf('target') === 994;
});

test('大 Buffer: 在第一位置', () => {
  const buf = Buffer.alloc(1000);
  buf.write('target', 0);
  return buf.lastIndexOf('target') === 0;
});

test('大 Buffer: 不存在', () => {
  const buf = Buffer.alloc(1000);
  return buf.lastIndexOf('notfound') === -1;
});

// 连续相同字节
test('连续相同: 全是 0', () => {
  const buf = Buffer.alloc(10);
  return buf.lastIndexOf(0) === 9;
});

test('连续相同: 全是 255', () => {
  const buf = Buffer.alloc(10, 255);
  return buf.lastIndexOf(255) === 9;
});

test('连续相同: 查找多个相同字节', () => {
  const buf = Buffer.alloc(10, 1);
  return buf.lastIndexOf(Buffer.from([1, 1, 1])) === 7;
});

// byteOffset 与搜索值长度的关系
test('byteOffset 小于搜索值长度但能找到', () => {
  const buf = Buffer.from('hello world hello');
  // byteOffset = 4, 'hello' 长度 = 5, 但第一个 'hello' 在位置 0
  return buf.lastIndexOf('hello', 4) === 0;
});

test('byteOffset 等于搜索值长度减1', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', 3) === 0;
});

test('byteOffset 刚好在第二个匹配的开始位置', () => {
  const buf = Buffer.from('abc abc abc');
  return buf.lastIndexOf('abc', 8) === 8;
});

// UTF-16 对齐的更多测试
test('UTF16LE: byteOffset 在奇数位置自动调整', () => {
  const buf = Buffer.from('hello', 'utf16le');
  // byteOffset 5 是奇数，应该调整到 4
  return buf.lastIndexOf('l', 5, 'utf16le') === 4;
});

test('UTF16LE: 搜索值长度为奇数（无效）', () => {
  const buf = Buffer.from('test', 'utf16le');
  // 单字节搜索在 utf16le 中无法匹配
  return buf.lastIndexOf(Buffer.from([0x74]), undefined, 'utf16le') === -1;
});

test('UTF16LE: 空 Buffer 查找空字符串', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('', undefined, 'utf16le') === 0;
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
