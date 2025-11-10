// buf.includes() - Edge Cases Tests
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

// Empty buffer tests
test('空 Buffer - 查找空字符串', () => {
  const buf = Buffer.alloc(0);
  return buf.includes('') === true;
});

test('空 Buffer - 查找任何内容', () => {
  const buf = Buffer.alloc(0);
  return buf.includes('hello') === false;
});

test('空 Buffer - 查找数字', () => {
  const buf = Buffer.alloc(0);
  return buf.includes(0) === false;
});

test('空 Buffer - 查找空 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.includes(Buffer.alloc(0)) === true;
});

// Single byte buffer
test('单字节 Buffer - 匹配', () => {
  const buf = Buffer.from([65]); // 'A'
  return buf.includes(65) === true;
});

test('单字节 Buffer - 不匹配', () => {
  const buf = Buffer.from([65]);
  return buf.includes(66) === false;
});

test('单字节 Buffer - 查找字符串', () => {
  const buf = Buffer.from('A');
  return buf.includes('A') === true;
});

// Large buffer tests
test('大 Buffer - 查找在开头', () => {
  const buf = Buffer.alloc(10000);
  buf.write('hello', 0);
  return buf.includes('hello') === true;
});

test('大 Buffer - 查找在末尾', () => {
  const buf = Buffer.alloc(10000);
  buf.write('world', 9995);
  return buf.includes('world') === true;
});

test('大 Buffer - 查找在中间', () => {
  const buf = Buffer.alloc(10000);
  buf.write('middle', 5000);
  return buf.includes('middle') === true;
});

// Boundary matching
test('在 Buffer 开头匹配', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hello') === true;
});

test('在 Buffer 末尾匹配', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world') === true;
});

test('完全匹配整个 Buffer', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello') === true;
});

test('查找内容刚好超出 Buffer', () => {
  const buf = Buffer.from('hello');
  return buf.includes('hello!') === false;
});

// Repeated patterns
test('重复模式 - 查找单个', () => {
  const buf = Buffer.from('aaaaaaa');
  return buf.includes('a') === true;
});

test('重复模式 - 查找多个', () => {
  const buf = Buffer.from('aaaaaaa');
  return buf.includes('aaa') === true;
});

test('重复模式 - 查找全部', () => {
  const buf = Buffer.from('aaaaaaa');
  return buf.includes('aaaaaaa') === true;
});

test('重复模式 - 超出长度', () => {
  const buf = Buffer.from('aaaaaaa');
  return buf.includes('aaaaaaaa') === false;
});

// Binary data
test('二进制数据 - 全 0', () => {
  const buf = Buffer.alloc(10, 0);
  return buf.includes(0) === true;
});

test('二进制数据 - 全 255', () => {
  const buf = Buffer.alloc(10, 255);
  return buf.includes(255) === true;
});

test('二进制数据 - 混合', () => {
  const buf = Buffer.from([0, 1, 2, 3, 255, 254, 253]);
  return buf.includes(Buffer.from([255, 254, 253])) === true;
});

test('二进制数据 - 查找序列', () => {
  const buf = Buffer.from([0x00, 0xFF, 0x00, 0xFF]);
  return buf.includes(Buffer.from([0xFF, 0x00])) === true;
});

// Special characters
test('特殊字符 - 换行符', () => {
  const buf = Buffer.from('hello\nworld');
  return buf.includes('\n') === true;
});

test('特殊字符 - 制表符', () => {
  const buf = Buffer.from('hello\tworld');
  return buf.includes('\t') === true;
});

test('特殊字符 - 空字符', () => {
  const buf = Buffer.from('hello\0world');
  return buf.includes('\0') === true;
});

test('特殊字符 - 回车换行', () => {
  const buf = Buffer.from('hello\r\nworld');
  return buf.includes('\r\n') === true;
});

// Case sensitivity
test('大小写敏感 - 大写', () => {
  const buf = Buffer.from('HELLO');
  return buf.includes('hello') === false;
});

test('大小写敏感 - 小写', () => {
  const buf = Buffer.from('hello');
  return buf.includes('HELLO') === false;
});

test('大小写敏感 - 混合', () => {
  const buf = Buffer.from('HeLLo');
  return buf.includes('HeLLo') === true;
});

// Partial matches
test('部分匹配 - 前缀', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('hel') === true;
});

test('部分匹配 - 后缀', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('rld') === true;
});

test('部分匹配 - 中间', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('lo wo') === true;
});

// No match scenarios
test('完全不匹配', () => {
  const buf = Buffer.from('hello');
  return buf.includes('xyz') === false;
});

test('长度匹配但内容不同', () => {
  const buf = Buffer.from('hello');
  return buf.includes('world') === false;
});

test('子串顺序错误', () => {
  const buf = Buffer.from('hello world');
  return buf.includes('world hello') === false;
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
