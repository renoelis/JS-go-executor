// buf.indexOf() - Compatibility Tests (Node.js Official Examples)
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

// Node.js 官方文档示例
test('官方示例 - indexOf("this")', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf('this') === 0;
});

test('官方示例 - indexOf("is")', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf('is') === 2;
});

test('官方示例 - indexOf(Buffer.from("a buffer"))', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(Buffer.from('a buffer')) === 8;
});

test('官方示例 - indexOf(97)', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(97) === 8; // 97 是 'a' 的 ASCII 值
});

test('官方示例 - indexOf(Buffer.from("a buffer example"))', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(Buffer.from('a buffer example')) === -1;
});

test('官方示例 - indexOf(Buffer.from("a buffer example").slice(0, 8))', () => {
  const buf = Buffer.from('this is a buffer');
  return buf.indexOf(Buffer.from('a buffer example').subarray(0, 8)) === 8;
});

test('官方示例 - UTF-16LE indexOf("\\u03a3", 0, "utf16le")', () => {
  const utf16Buffer = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return utf16Buffer.indexOf('\u03a3', 0, 'utf16le') === 4;
});

test('官方示例 - UTF-16LE indexOf("\\u03a3", -4, "utf16le")', () => {
  const utf16Buffer = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return utf16Buffer.indexOf('\u03a3', -4, 'utf16le') === 6;
});

// 官方文档 - 数字转换示例
test('官方示例 - indexOf(99.9)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf(99.9) === 2; // 等同于查找 99 或 'c'
});

test('官方示例 - indexOf(256 + 99)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf(256 + 99) === 2;
});

// 官方文档 - byteOffset 强制转换示例
test('官方示例 - indexOf("b", undefined)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', undefined) === 1;
});

test('官方示例 - indexOf("b", {})', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', {}) === 1;
});

test('官方示例 - indexOf("b", null)', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', null) === 1;
});

test('官方示例 - indexOf("b", [])', () => {
  const b = Buffer.from('abcdef');
  return b.indexOf('b', []) === 1;
});

// 与 String.prototype.indexOf() 的兼容性
test('兼容 String.indexOf - 基本查找', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  return buf.indexOf('world') === str.indexOf('world');
});

test('兼容 String.indexOf - 未找到', () => {
  const str = 'hello world';
  const buf = Buffer.from(str);
  return buf.indexOf('foo') === str.indexOf('foo');
});

test('兼容 String.indexOf - 带偏移', () => {
  const str = 'hello hello';
  const buf = Buffer.from(str);
  return buf.indexOf('hello', 1) === str.indexOf('hello', 1);
});

test('兼容 String.indexOf - 空字符串', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.indexOf('') === str.indexOf('');
});

test('兼容 String.indexOf - 空字符串带偏移', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return buf.indexOf('', 3) === str.indexOf('', 3);
});

// 与 Array.prototype.indexOf() 的兼容性
test('兼容 Array.indexOf - 查找元素', () => {
  const arr = [1, 2, 3, 4, 5];
  const buf = Buffer.from(arr);
  return buf.indexOf(3) === arr.indexOf(3);
});

test('兼容 Array.indexOf - 未找到', () => {
  const arr = [1, 2, 3, 4, 5];
  const buf = Buffer.from(arr);
  return buf.indexOf(10) === arr.indexOf(10);
});

test('兼容 Array.indexOf - 带偏移', () => {
  const arr = [1, 2, 3, 2, 1];
  const buf = Buffer.from(arr);
  return buf.indexOf(2, 2) === arr.indexOf(2, 2);
});

// 跨版本兼容性测试
test('跨版本 - 基本功能', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world') === 6;
});

test('跨版本 - Uint8Array 支持', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(new Uint8Array([3, 4])) === 2;
});

test('跨版本 - encoding 参数可选', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0) === 6;
});

// 实际使用场景
test('实际场景 - 查找 HTTP 头部分隔符', () => {
  const buf = Buffer.from('GET / HTTP/1.1\r\n\r\nBody');
  return buf.indexOf('\r\n\r\n') === 14;
});

test('实际场景 - 查找 JSON 字段', () => {
  const buf = Buffer.from('{"name":"value"}');
  return buf.indexOf('"name"') === 1;
});

test('实际场景 - 查找二进制标记', () => {
  const buf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG 文件头
  return buf.indexOf(Buffer.from([0xFF, 0xD8])) === 0;
});

test('实际场景 - 查找换行符', () => {
  const buf = Buffer.from('line1\nline2\nline3');
  return buf.indexOf('\n') === 5;
});

test('实际场景 - 查找分隔符', () => {
  const buf = Buffer.from('key=value&foo=bar');
  return buf.indexOf('&') === 9;
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
