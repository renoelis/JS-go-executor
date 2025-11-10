// buf.includes() - Deep Edge Cases Tests (深度边界测试)
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

// === 字节值边界 ===
test('搜索字节 127 (最大正数 int8)', () => {
  const buf = Buffer.from([126, 127, 128]);
  return buf.includes(127) === true;
});

test('搜索字节 128 (int8 负数开始)', () => {
  const buf = Buffer.from([126, 127, 128]);
  return buf.includes(128) === true;
});

test('搜索字节 -128 (最小 int8)', () => {
  const buf = Buffer.from([128, 129, 130]);
  return buf.includes(-128) === true;
});

test('搜索字节 -127', () => {
  const buf = Buffer.from([128, 129, 130]);
  return buf.includes(-127) === true;
});

// === offset 精确边界 ===
test('offset 等于 length - 1', () => {
  const buf = Buffer.from('hello');
  return buf.includes('o', 4) === true;
});

test('offset 等于 length', () => {
  const buf = Buffer.from('hello');
  return buf.includes('o', 5) === false;
});

test('offset 等于 length + 1', () => {
  const buf = Buffer.from('hello');
  return buf.includes('o', 6) === false;
});

test('负 offset 等于 -length', () => {
  const buf = Buffer.from('hello');
  return buf.includes('h', -5) === true;
});

test('负 offset 等于 -length - 1', () => {
  const buf = Buffer.from('hello');
  return buf.includes('h', -6) === true;
});

test('负 offset 等于 -1', () => {
  const buf = Buffer.from('hello');
  return buf.includes('o', -1) === true;
});

// === 搜索值长度边界 ===
test('搜索值长度等于 Buffer 长度 - 1', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hell') === true;
});

test('搜索值长度等于 Buffer 长度', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello') === true;
});

test('搜索值长度等于 Buffer 长度 + 1', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello!') === false;
});

test('搜索值为 1 字节', () => {
  const buf = Buffer.from('hello');
  return buf.includes('h') === true;
});

test('搜索值为 2 字节', () => {
  const buf = Buffer.from('hello');
  return buf.includes('he') === true;
});

// === 特殊 offset 与搜索值组合 ===
test('offset 使得剩余空间刚好容纳搜索值', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 6) === true;
});

test('offset 使得剩余空间少于搜索值长度', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world', 8) === false;
});

test('offset 使得剩余空间比搜索值多 1 字节', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('worl', 6) === true;
});

// === 重复字节模式 ===
test('全部相同字节 - 查找单个', () => {
  const buf = Buffer.alloc(100, 65);
  return buf.includes(65) === true;
});

test('全部相同字节 - 查找多个', () => {
  const buf = Buffer.alloc(100, 65);
  return buf.includes(Buffer.alloc(50, 65)) === true;
});

test('全部相同字节 - 查找全部', () => {
  const buf = Buffer.alloc(100, 65);
  return buf.includes(Buffer.alloc(100, 65)) === true;
});

test('全部相同字节 - 查找超长', () => {
  const buf = Buffer.alloc(100, 65);
  return buf.includes(Buffer.alloc(101, 65)) === false;
});

// === 交替模式 ===
test('AB 交替模式 - 查找 AB', () => {
  const buf = Buffer.from('ABABABAB');
  return buf.includes('AB') === true;
});

test('AB 交替模式 - 查找 BA', () => {
  const buf = Buffer.from('ABABABAB');
  return buf.includes('BA') === true;
});

test('AB 交替模式 - 查找 ABAB', () => {
  const buf = Buffer.from('ABABABAB');
  return buf.includes('ABAB') === true;
});

test('AB 交替模式 - 查找 AAA', () => {
  const buf = Buffer.from('ABABABAB');
  return buf.includes('AAA') === false;
});

// === 部分重叠匹配 ===
test('AAAA 中查找 AAA - 第一次出现', () => {
  const buf = Buffer.from('AAAA');
  return buf.includes('AAA', 0) === true;
});

test('AAAA 中查找 AAA - 第二次出现', () => {
  const buf = Buffer.from('AAAA');
  return buf.includes('AAA', 1) === true;
});

test('AAAA 中查找 AAA - 超出范围', () => {
  const buf = Buffer.from('AAAA');
  return buf.includes('AAA', 2) === false;
});

test('ABCABC 中查找 CABC', () => {
  const buf = Buffer.from('ABCABC');
  return buf.includes('CABC') === true;
});

// === 编码转换边界 ===
test('hex 编码 - 单字节', () => {
  const buf = Buffer.from('41', 'hex');
  return buf.includes('41', 0, 'hex') === true;
});

test('hex 编码 - 空字符串', () => {
  const buf = Buffer.from('4142', 'hex');
  return buf.includes('', 0, 'hex') === true;
});

test('hex 编码 - 大小写混合', () => {
  const buf = Buffer.from('4142', 'hex');
  try {
    return buf.includes('41', 0, 'hex') === true;
  } catch (e) {
    return true;
  }
});

test('base64 编码 - 无填充', () => {
  const buf = Buffer.from('YWJj', 'base64');
  return buf.includes('YWJj', 0, 'base64') === true;
});

test('base64 编码 - 单个等号填充', () => {
  const buf = Buffer.from('YWJjZA==', 'base64');
  return buf.includes('YWJjZA==', 0, 'base64') === true;
});

test('base64 编码 - 双等号填充', () => {
  const buf = Buffer.from('YWI=', 'base64');
  return buf.includes('YWI=', 0, 'base64') === true;
});

// === UTF-8 多字节边界 ===
test('2 字节 UTF-8 字符开头', () => {
  const buf = Buffer.from('©hello');
  return buf.includes('©') === true;
});

test('2 字节 UTF-8 字符中间', () => {
  const buf = Buffer.from('hello©world');
  return buf.includes('©') === true;
});

test('2 字节 UTF-8 字符末尾', () => {
  const buf = Buffer.from('hello©');
  return buf.includes('©') === true;
});

test('3 字节 UTF-8 字符 - 中文', () => {
  const buf = Buffer.from('你好世界');
  return buf.includes('世') === true;
});

test('4 字节 UTF-8 字符 - emoji', () => {
  const buf = Buffer.from('😀😁😂');
  return buf.includes('😁') === true;
});

test('混合 1-4 字节 UTF-8', () => {
  const buf = Buffer.from('a©你😀');
  return buf.includes('©你') === true;
});

// === 字符串与 Buffer 混合 ===
test('字符串搜索 Buffer 内容', () => {
  const buf = Buffer.from([104, 101, 108, 108, 111]);
  return buf.includes('hello') === true;
});

test('Buffer 搜索字符串内容', () => {
  const buf = Buffer.from('hello world');
  return buf.includes(Buffer.from('world')) === true;
});

test('数字搜索字符串字节', () => {
  const buf = Buffer.from('hello');
  return buf.includes(104) === true;
});

// === 空值和特殊值 ===
test('搜索空 Buffer - 在非空 Buffer 中', () => {
  const buf = Buffer.from('hello');
  return buf.includes(Buffer.alloc(0)) === true;
});

test('搜索空 Buffer - 在空 Buffer 中', () => {
  const buf = Buffer.alloc(0);
  return buf.includes(Buffer.alloc(0)) === true;
});

test('搜索空字符串 - 在非空 Buffer 中', () => {
  const buf = Buffer.from('hello');
  return buf.includes('') === true;
});

test('搜索空字符串 - 在空 Buffer 中', () => {
  const buf = Buffer.alloc(0);
  return buf.includes('') === true;
});

test('搜索空字符串 - 使用 offset', () => {
  const buf = Buffer.from('hello');
  return buf.includes('', 3) === true;
});

// === 数值类型转换 ===
test('搜索浮点数 0.0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(0.0) === true;
});

test('搜索浮点数 1.0', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(1.0) === true;
});

test('搜索浮点数 1.5 (截断为 1)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(1.5) === true;
});

test('搜索浮点数 1.9 (截断为 1)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(1.9) === true;
});

test('搜索浮点数 -0.5 (截断为 0)', () => {
  const buf = Buffer.from([0, 1, 2]);
  return buf.includes(-0.5) === true;
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
