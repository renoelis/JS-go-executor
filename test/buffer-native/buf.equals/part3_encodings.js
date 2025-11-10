// buf.equals() - Encoding Tests
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

// 不同编码的 Buffer 比较
test('UTF-8 编码 - 相同字符串', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('hello', 'utf8');
  return buf1.equals(buf2) === true;
});

test('UTF-8 编码 - 中文字符', () => {
  const buf1 = Buffer.from('你好世界', 'utf8');
  const buf2 = Buffer.from('你好世界', 'utf8');
  return buf1.equals(buf2) === true;
});

test('UTF-8 编码 - emoji', () => {
  const buf1 = Buffer.from('👍😀🎉', 'utf8');
  const buf2 = Buffer.from('👍😀🎉', 'utf8');
  return buf1.equals(buf2) === true;
});

test('Hex 编码 - 相同内容', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('48656c6c6f', 'hex');
  return buf1.equals(buf2) === true;
});

test('Hex 编码 - 大小写混合', () => {
  const buf1 = Buffer.from('48656c6c6f', 'hex');
  const buf2 = Buffer.from('48656C6C6F', 'hex');
  return buf1.equals(buf2) === true;
});

test('Base64 编码 - 相同内容', () => {
  const buf1 = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  const buf2 = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  return buf1.equals(buf2) === true;
});

test('Base64URL 编码', () => {
  const buf1 = Buffer.from('test-data_123', 'utf8');
  const base64url = buf1.toString('base64url');
  const buf2 = Buffer.from(base64url, 'base64url');
  return buf1.equals(buf2) === true;
});

test('Latin1 编码', () => {
  const buf1 = Buffer.from('hello', 'latin1');
  const buf2 = Buffer.from('hello', 'latin1');
  return buf1.equals(buf2) === true;
});

test('ASCII 编码', () => {
  const buf1 = Buffer.from('hello', 'ascii');
  const buf2 = Buffer.from('hello', 'ascii');
  return buf1.equals(buf2) === true;
});

test('Binary 编码（latin1 别名）', () => {
  const buf1 = Buffer.from('hello', 'binary');
  const buf2 = Buffer.from('hello', 'latin1');
  return buf1.equals(buf2) === true;
});

test('UTF-16LE 编码', () => {
  const buf1 = Buffer.from('hello', 'utf16le');
  const buf2 = Buffer.from('hello', 'utf16le');
  return buf1.equals(buf2) === true;
});

test('UTF-16LE 编码 - 中文', () => {
  const buf1 = Buffer.from('你好', 'utf16le');
  const buf2 = Buffer.from('你好', 'utf16le');
  return buf1.equals(buf2) === true;
});

test('不同编码相同字符串 - UTF-8 vs Latin1', () => {
  const buf1 = Buffer.from('hello', 'utf8');
  const buf2 = Buffer.from('hello', 'latin1');
  return buf1.equals(buf2) === true; // ASCII 范围内相同
});

test('不同编码不同结果 - UTF-8 vs Latin1（中文）', () => {
  const buf1 = Buffer.from('你好', 'utf8');
  const buf2 = Buffer.from('你好', 'latin1');
  return buf1.equals(buf2) === false; // 编码不同，字节不同
});

test('Hex vs 原始字节', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('68656c6c6f', 'hex');
  return buf1.equals(buf2) === true;
});

test('Base64 vs 原始字符串', () => {
  const buf1 = Buffer.from('Hello World');
  const buf2 = Buffer.from('SGVsbG8gV29ybGQ=', 'base64');
  return buf1.equals(buf2) === true;
});

test('空字符串 - 不同编码', () => {
  const buf1 = Buffer.from('', 'utf8');
  const buf2 = Buffer.from('', 'hex');
  const buf3 = Buffer.from('', 'base64');
  return buf1.equals(buf2) && buf2.equals(buf3);
});

test('特殊字符 - null 字节', () => {
  const buf1 = Buffer.from([0, 1, 2, 0, 3]);
  const buf2 = Buffer.from([0, 1, 2, 0, 3]);
  return buf1.equals(buf2) === true;
});

test('特殊字符 - 全 0xFF', () => {
  const buf1 = Buffer.from([255, 255, 255]);
  const buf2 = Buffer.from([255, 255, 255]);
  return buf1.equals(buf2) === true;
});

test('特殊字符 - 全 0x00', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  return buf1.equals(buf2) === true;
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

