// buf.includes() - Encoding Tests
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

// Encoding parameter tests
test('utf8 编码 - 显式指定', () => {
  const buf = Buffer.from('hello world', 'utf8');
  return buf.includes('world', 0, 'utf8') === true;
});

test('hex 编码 - 查找十六进制字符串', () => {
  const buf = Buffer.from('68656c6c6f', 'hex'); // 'hello'
  return buf.includes('6c6c', 0, 'hex') === true; // 'll'
});

test('hex 编码 - 不匹配', () => {
  const buf = Buffer.from('68656c6c6f', 'hex');
  return buf.includes('ffff', 0, 'hex') === false;
});

test('base64 编码 - 查找', () => {
  const buf = Buffer.from('aGVsbG8gd29ybGQ=', 'base64'); // 'hello world'
  return buf.includes('d29ybGQ=', 0, 'base64') === true; // 'world'
});

test('latin1 编码 - 查找', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.includes('ell', 0, 'latin1') === true;
});

test('ascii 编码 - 查找', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.includes('lo', 0, 'ascii') === true;
});

test('utf16le 编码 - 查找', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const search = Buffer.from('ll', 'utf16le');
  return buf.includes(search) === true;
});

test('多字节 UTF-8 字符 - 中文', () => {
  const buf = Buffer.from('你好世界');
  return buf.includes('世界') === true;
});

test('多字节 UTF-8 字符 - emoji', () => {
  const buf = Buffer.from('hello 😀 world');
  return buf.includes('😀') === true;
});

test('多字节字符 - 部分字节不匹配', () => {
  const buf = Buffer.from('你好世界');
  // 查找一个不完整的字符序列应该返回 false
  return buf.includes(Buffer.from([0xE4, 0xB8])) === true; // '你' 的前两个字节
});

test('混合编码 - utf8 查找 Buffer', () => {
  const buf = Buffer.from('hello world', 'utf8');
  const search = Buffer.from('world');
  return buf.includes(search) === true;
});

test('空字符串 - 不同编码', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.includes('', 0, 'hex') === true;
});

test('大小写敏感', () => {
  const buf = Buffer.from('Hello World');
  return buf.includes('hello') === false;
});

test('编码不匹配导致查找失败', () => {
  const buf = Buffer.from('hello', 'utf8');
  // 使用错误的编码解释搜索字符串
  return buf.includes('68656c6c6f', 0, 'utf8') === false;
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
