// buf.indexOf() - Encoding Tests
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

// UTF-8 编码测试
test('UTF-8 编码 - 默认', () => {
  const buf = Buffer.from('hello world', 'utf8');
  return buf.indexOf('world') === 6;
});

test('UTF-8 编码 - 显式指定', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'utf8') === 6;
});

test('UTF-8 编码 - 多字节字符', () => {
  const buf = Buffer.from('你好世界');
  return buf.indexOf('世界', 0, 'utf8') === 6;
});

test('UTF-8 编码 - emoji', () => {
  const buf = Buffer.from('hello 😀 world');
  return buf.indexOf('😀', 0, 'utf8') === 6;
});

// UTF-16LE 编码测试
test('UTF-16LE 编码 - 基本查找', () => {
  const buf = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return buf.indexOf('\u03a3', 0, 'utf16le') === 4;
});

test('UTF-16LE 编码 - 负偏移', () => {
  const buf = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return buf.indexOf('\u03a3', -4, 'utf16le') === 6;
});

test('UTF-16LE 编码 - 未找到', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('world', 0, 'utf16le') === -1;
});

// Hex 编码测试
test('Hex 编码 - 查找', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.indexOf('6c6c', 0, 'hex') === 2;
});

test('Hex 编码 - 大小写不敏感', () => {
  const buf = Buffer.from('48656C6C6F', 'hex');
  return buf.indexOf('6c6c', 0, 'hex') === 2;
});

// Base64 编码测试
test('Base64 编码 - 查找', () => {
  const buf = Buffer.from('SGVsbG8gV29ybGQ=', 'base64'); // "Hello World"
  return buf.indexOf('World', 0, 'utf8') === 6;
});

// Latin1 编码测试
test('Latin1 编码 - 查找', () => {
  const buf = Buffer.from('hello world', 'latin1');
  return buf.indexOf('world', 0, 'latin1') === 6;
});

// ASCII 编码测试
test('ASCII 编码 - 查找', () => {
  const buf = Buffer.from('hello world', 'ascii');
  return buf.indexOf('world', 0, 'ascii') === 6;
});

// 混合编码测试
test('混合编码 - Buffer 查找不同编码字符串', () => {
  const buf = Buffer.from('hello world', 'utf8');
  return buf.indexOf('world', 0, 'latin1') === 6;
});

test('混合编码 - 特殊字符', () => {
  const buf = Buffer.from('café', 'utf8');
  return buf.indexOf('é', 0, 'utf8') === 3;
});

// 无效编码测试
test('无效编码 - 抛出错误', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.indexOf('world', 0, 'invalid-encoding');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
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
