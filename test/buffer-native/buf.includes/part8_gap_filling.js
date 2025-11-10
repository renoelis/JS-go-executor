// buf.includes() - Gap Filling Tests (查缺补漏)
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

// === Node.js 官方文档示例 ===
test('官方示例 1 - 包含 this', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes('this') === true;
});

test('官方示例 2 - 包含 is', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes('is') === true;
});

test('官方示例 3 - 包含 Buffer', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(Buffer.from('a buffer')) === true;
});

test('官方示例 4 - 包含 ASCII 97 (a)', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(97) === true;
});

test('官方示例 5 - 不包含超长 Buffer', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(Buffer.from('a buffer example')) === false;
});

test('官方示例 6 - 包含切片后的 Buffer', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes(Buffer.from('a buffer example').slice(0, 8)) === true;
});

test('官方示例 7 - 从位置 4 开始不包含 this', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.includes('this', 4) === false;
});

// === 边界情况补充 ===
test('搜索值长度大于 Buffer', () => {
  const buf = Buffer.from('hi');
  return buf.includes('hello') === false;
});

test('搜索值长度等于 Buffer', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello') === true;
});

test('搜索值长度比 Buffer 大 1', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello!') === false;
});

test('负数 offset 超出范围到开头', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', -100) === true;
});

test('负数 offset 刚好到开头', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello', -11) === true;
});

test('浮点数 offset 向下取整', () => {
  const buf = Buffer.from('hello');
  return buf.includes('llo', 2.9) === true;
});

test('浮点数 offset 为 0.5', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello', 0.5) === true;
});

// === 特殊字节值 ===
test('搜索字节 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.includes(0) === true;
});

test('搜索字节 255', () => {
  const buf = Buffer.from([255, 254, 253]);
  return buf.includes(255) === true;
});

test('搜索字节 256 (等同于 0)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(256) === true;
});

test('搜索字节 -1 (等同于 255)', () => {
  const buf = Buffer.from([255, 254, 253]);
  return buf.includes(-1) === true;
});

test('搜索字节 -256 (等同于 0)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(-256) === true;
});

// === 特殊字符 ===
test('搜索反斜杠 n 字符串', () => {
  const buf = Buffer.from('hello\\nworld');
  return buf.includes('\\n') === true;
});

test('搜索实际换行符', () => {
  const buf = Buffer.from('hello\nworld');
  return buf.includes('\n') === true;
});

test('搜索制表符', () => {
  const buf = Buffer.from('hello\tworld');
  return buf.includes('\t') === true;
});

test('搜索回车符', () => {
  const buf = Buffer.from('hello\rworld');
  return buf.includes('\r') === true;
});

test('搜索空字符', () => {
  const buf = Buffer.from('hello\0world');
  return buf.includes('\0') === true;
});

// === UTF-8 多字节字符 ===
test('搜索中文字符 - 完整', () => {
  const buf = Buffer.from('你好世界');
  return buf.includes('好') === true;
});

test('搜索中文字符 - 部分字节', () => {
  const buf = Buffer.from('你好');
  // '你' = 0xE4 0xBD 0xA0
  return buf.includes(Buffer.from([0xE4, 0xBD])) === true;
});

test('搜索 emoji', () => {
  const buf = Buffer.from('hello 😀 world');
  return buf.includes('😀') === true;
});

test('搜索 emoji 的部分字节', () => {
  const buf = Buffer.from('😀');
  // 😀 = 0xF0 0x9F 0x98 0x80
  return buf.includes(Buffer.from([0xF0, 0x9F])) === true;
});

// === 类型转换 ===
test('搜索数字字符串 "123"', () => {
  const buf = Buffer.from('hello123world');
  return buf.includes('123') === true;
});

test('搜索数字 1 2 3 的字节序列', () => {
  const buf = Buffer.from([49, 50, 51]); // ASCII '1', '2', '3'
  return buf.includes('123') === true;
});

// === 多次出现 ===
test('多次出现 - 找到第一个', () => {
  const buf = Buffer.from('aaabbbaaaccc');
  return buf.includes('aaa') === true;
});

test('多次出现 - 从中间开始找到第二个', () => {
  const buf = Buffer.from('aaabbbaaaccc');
  return buf.includes('aaa', 4) === true;
});

test('多次出现 - 跳过所有', () => {
  const buf = Buffer.from('aaabbbaaaccc');
  return buf.includes('aaa', 10) === false;
});

// === 重叠模式 ===
test('重叠模式 - aaaa 中查找 aaa', () => {
  const buf = Buffer.from('aaaa');
  return buf.includes('aaa') === true;
});

test('重叠模式 - ababa 中查找 aba', () => {
  const buf = Buffer.from('ababa');
  return buf.includes('aba') === true;
});

// === 二进制数据 ===
test('二进制 - 全 0xFF', () => {
  const buf = Buffer.alloc(10, 0xFF);
  return buf.includes(0xFF) === true;
});

test('二进制 - 全 0x00', () => {
  const buf = Buffer.alloc(10, 0x00);
  return buf.includes(0x00) === true;
});

test('二进制 - 交替模式', () => {
  const buf = Buffer.from([0xAA, 0x55, 0xAA, 0x55]);
  return buf.includes(Buffer.from([0xAA, 0x55])) === true;
});

// === 性能相关 ===
test('大 Buffer 开头查找', () => {
  const buf = Buffer.alloc(100000);
  buf.write('test', 0);
  return buf.includes('test') === true;
});

test('大 Buffer 末尾查找', () => {
  const buf = Buffer.alloc(100000);
  buf.write('test', 99996);
  return buf.includes('test') === true;
});

test('大 Buffer 中间查找', () => {
  const buf = Buffer.alloc(100000);
  buf.write('test', 50000);
  return buf.includes('test') === true;
});

// === 与其他方法的一致性 ===
test('与 indexOf 一致 - 找到', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world') === (buf.indexOf('world') !== -1);
});

test('与 indexOf 一致 - 未找到', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('foo') === (buf.indexOf('foo') !== -1);
});

test('与 indexOf 一致 - 空字符串', () => {
  const buf = Buffer.from('hello');
  return buf.includes('') === (buf.indexOf('') !== -1);
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
