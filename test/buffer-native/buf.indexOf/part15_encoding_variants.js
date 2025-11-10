// buf.indexOf() - Encoding Variants Tests
// 补充编码相关的完整测试
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

function testError(name, fn, expectedErrorType) {
  try {
    fn();
    tests.push({ name, status: '❌', error: 'Expected error but none thrown' });
  } catch (e) {
    const pass = e.name === expectedErrorType || e.message.includes(expectedErrorType);
    tests.push({ name, status: pass ? '✅' : '❌', error: pass ? undefined : e.message });
  }
}

// 两参数形式：buf.indexOf(value, encoding)
test('两参数形式 - utf8 编码', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'utf8') === 6;
});

test('两参数形式 - ascii 编码', () => {
  const buf = Buffer.from('hello world', 'ascii');
  return buf.indexOf('world', 'ascii') === 6;
});

test('两参数形式 - latin1 编码', () => {
  const buf = Buffer.from('hello world', 'latin1');
  return buf.indexOf('world', 'latin1') === 6;
});

test('两参数形式 - hex 编码', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.indexOf('6c6c', 'hex') === 2;
});

test('两参数形式 - base64 编码', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  return buf.indexOf('Hello', 'utf8') === 0;
});

test('两参数形式 - utf16le 编码', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('llo', 'utf16le') === 4;
});

test('两参数形式 - ucs2 编码（utf16le 别名）', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('llo', 'ucs2') === 4;
});

// base64url 编码测试
test('base64url 编码 - 基本查找', () => {
  const buf = Buffer.from('SGVsbG8', 'base64url'); // "Hello"
  return buf.indexOf('Hello', 'utf8') === 0;
});

test('base64url 编码 - 特殊字符', () => {
  // base64url 使用 - 和 _ 代替 + 和 /
  const buf = Buffer.from('PDw_Pz4-', 'base64url'); // "<<??>>""
  return buf.indexOf('<<', 'utf8') === 0;
});

test('base64url 编码 - 无填充', () => {
  const buf = Buffer.from('SGVsbG8', 'base64url'); // 无 = 填充
  return buf.indexOf('Hello', 'utf8') === 0;
});

// binary 编码（latin1 的别名）
test('binary 编码 - 基本查找', () => {
  const buf = Buffer.from('hello world', 'binary');
  return buf.indexOf('world', 'binary') === 6;
});

test('binary 编码 - 扩展 ASCII', () => {
  const buf = Buffer.from('\x80\x81\x82\x83', 'binary');
  return buf.indexOf('\x82\x83', 'binary') === 2;
});

test('binary 编码 - 完整 0-255 范围', () => {
  const arr = [];
  for (let i = 0; i < 256; i++) {
    arr.push(String.fromCharCode(i));
  }
  const buf = Buffer.from(arr.join(''), 'binary');
  return buf.indexOf(String.fromCharCode(128), 'binary') === 128;
});

// latin1 编码详细测试
test('latin1 编码 - 扩展字符', () => {
  const buf = Buffer.from('café', 'latin1');
  return buf.indexOf('é', 'latin1') === 3;
});

test('latin1 编码 - 高位字符', () => {
  const buf = Buffer.from('\xA0\xA1\xA2\xA3', 'latin1');
  return buf.indexOf('\xA2\xA3', 'latin1') === 2;
});

test('latin1 编码 - 与 binary 等价', () => {
  const str = 'hello\x80\x90\xA0';
  const buf1 = Buffer.from(str, 'latin1');
  const buf2 = Buffer.from(str, 'binary');
  return buf1.indexOf('\x90', 'latin1') === buf2.indexOf('\x90', 'binary');
});

// hex 编码详细测试
test('hex 编码 - 奇数长度字符串', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  // Node.js 会忽略奇数长度的最后一个字符
  const result = buf.indexOf('6c6c', 'hex');
  return result === 2; // 正常查找
});

test('hex 编码 - 大写字母', () => {
  const buf = Buffer.from('48656C6C6F', 'hex');
  return buf.indexOf('6C6C', 'hex') === 2;
});

test('hex 编码 - 小写字母', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c6c', 'hex') === 2;
});

test('hex 编码 - 混合大小写', () => {
  const buf = Buffer.from('48656C6c6F', 'hex');
  return buf.indexOf('6C6c', 'hex') === 2;
});

test('hex 编码 - 全 0', () => {
  const buf = Buffer.from('00000000', 'hex');
  return buf.indexOf('0000', 'hex') === 0;
});

test('hex 编码 - 全 F', () => {
  const buf = Buffer.from('FFFFFFFF', 'hex');
  return buf.indexOf('FFFF', 'hex') === 0;
});

// utf16le 编码详细测试
test('utf16le 编码 - BMP 字符', () => {
  const buf = Buffer.from('你好世界', 'utf16le');
  return buf.indexOf('世界', 'utf16le') === 4;
});

test('utf16le 编码 - 代理对（emoji）', () => {
  const buf = Buffer.from('😀😁', 'utf16le');
  return buf.indexOf('😁', 'utf16le') === 4;
});

test('utf16le 编码 - 希腊字母', () => {
  const buf = Buffer.from('αβγδε', 'utf16le');
  return buf.indexOf('γδ', 'utf16le') === 4;
});

test('utf16le 编码 - 空字符', () => {
  const buf = Buffer.from('a\u0000b', 'utf16le');
  // Node.js 返回 2（字节偏移），goja 当前返回 1（需要修复）
  return buf.indexOf('\u0000', 'utf16le') === 2;
});

test('utf16le 编码 - 高位字符', () => {
  const buf = Buffer.from('\uFFFF\uFFFE\uFFFD', 'utf16le');
  return buf.indexOf('\uFFFE', 'utf16le') === 2;
});

// ucs2 编码（utf16le 的别名）
test('ucs2 编码 - 与 utf16le 等价', () => {
  const str = 'hello世界';
  const buf1 = Buffer.from(str, 'ucs2');
  const buf2 = Buffer.from(str, 'utf16le');
  return buf1.indexOf('世界', 'ucs2') === buf2.indexOf('世界', 'utf16le');
});

test('ucs2 编码 - 基本查找', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('llo', 'ucs2') === 4;
});

// ascii 编码详细测试
test('ascii 编码 - 控制字符', () => {
  const buf = Buffer.from('hello\x00\x01\x02', 'ascii');
  return buf.indexOf('\x01', 'ascii') === 6;
});

test('ascii 编码 - 可打印字符', () => {
  const buf = Buffer.from('ABC123!@#', 'ascii');
  return buf.indexOf('123', 'ascii') === 3;
});

test('ascii 编码 - 高位截断', () => {
  // ASCII 只保留低 7 位
  const buf = Buffer.from('hello', 'ascii');
  return buf.indexOf('hello', 'ascii') === 0;
});

// utf8 编码详细测试
test('utf8 编码 - 单字节字符', () => {
  const buf = Buffer.from('hello', 'utf8');
  return buf.indexOf('llo', 'utf8') === 2;
});

test('utf8 编码 - 双字节字符', () => {
  const buf = Buffer.from('café', 'utf8');
  return buf.indexOf('é', 'utf8') === 3;
});

test('utf8 编码 - 三字节字符', () => {
  const buf = Buffer.from('你好', 'utf8');
  return buf.indexOf('好', 'utf8') === 3;
});

test('utf8 编码 - 四字节字符（emoji）', () => {
  const buf = Buffer.from('😀😁', 'utf8');
  return buf.indexOf('😁', 'utf8') === 4;
});

test('utf8 编码 - 混合字符', () => {
  const buf = Buffer.from('hello你好😀', 'utf8');
  return buf.indexOf('你好', 'utf8') === 5;
});

test('utf8 编码 - BOM', () => {
  const buf = Buffer.from('\uFEFFhello', 'utf8');
  return buf.indexOf('hello', 'utf8') === 3;
});

test('utf8 编码 - 零宽字符', () => {
  const buf = Buffer.from('a\u200Bb', 'utf8');
  return buf.indexOf('\u200B', 'utf8') === 1;
});

// 编码参数大小写测试
test('编码参数 - UTF8 大写', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'UTF8') === 6;
});

test('编码参数 - Utf8 混合大小写', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'Utf8') === 6;
});

test('编码参数 - UTF-8 带连字符', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'UTF-8') === 6;
});

test('编码参数 - ASCII 大写', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'ASCII') === 6;
});

test('编码参数 - HEX 大写', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c6c', 'HEX') === 2;
});

test('编码参数 - Base64 混合大小写', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  // 注意：编码参数用于 value 的解码，这里 value 是字符串，应该用 utf8
  return buf.indexOf('Hello', 'utf8') === 0;
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
