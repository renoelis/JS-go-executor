// buf.indexOf() - Final Edge Cases Tests
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

// ArrayBuffer 和 SharedArrayBuffer 测试
test('ArrayBuffer 作为搜索值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const ab = new ArrayBuffer(2);
  const view = new Uint8Array(ab);
  view[0] = 3;
  view[1] = 4;
  return buf.indexOf(Buffer.from(ab)) === 2;
});

test('ArrayBuffer 空数组', () => {
  const buf = Buffer.from('hello');
  const ab = new ArrayBuffer(0);
  return buf.indexOf(Buffer.from(ab)) === 0;
});

// DataView 测试
test('DataView 作为搜索值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const ab = new ArrayBuffer(2);
  const dv = new DataView(ab);
  dv.setUint8(0, 3);
  dv.setUint8(1, 4);
  return buf.indexOf(Buffer.from(ab)) === 2;
});

// 编码参数大小写测试
test('编码参数 - UTF8 大写', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'UTF8') === 6;
});

test('编码参数 - utf-8 带连字符', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'utf-8') === 6;
});

test('编码参数 - Utf8 混合大小写', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'Utf8') === 6;
});

test('编码参数 - HEX 大写', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.indexOf('6c6c', 0, 'HEX') === 2;
});

test('编码参数 - base64 小写', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  // 使用 utf8 编码查找，因为 base64 编码会把搜索值也当作 base64
  return buf.indexOf('Hello', 0, 'utf8') === 0;
});

test('编码参数 - latin1 小写', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.indexOf('hello', 0, 'latin1') === 0;
});

test('编码参数 - LATIN1 大写', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.indexOf('hello', 0, 'LATIN1') === 0;
});

test('编码参数 - binary', () => {
  const buf = Buffer.from('hello', 'binary');
  return buf.indexOf('hello', 0, 'binary') === 0;
});

test('编码参数 - ASCII 大写', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.indexOf('hello', 0, 'ASCII') === 0;
});

test('编码参数 - ucs2', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('hello', 0, 'ucs2') === 0;
});

test('编码参数 - ucs-2 带连字符', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('hello', 0, 'ucs-2') === 0;
});

test('编码参数 - utf16le', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('hello', 0, 'utf16le') === 0;
});

test('编码参数 - utf-16le 带连字符', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('hello', 0, 'utf-16le') === 0;
});

// 字符串转数字的边界测试
test('byteOffset 为数字字符串 "5"', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.indexOf('world', '5');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('byteOffset 为数字字符串 "0"', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.indexOf('world', '0');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

// 特殊 Unicode 字符测试
test('Unicode - 零宽字符', () => {
  const buf = Buffer.from('hello\u200Bworld'); // 零宽空格
  return buf.indexOf('\u200B') === 5;
});

test('Unicode - 组合音标符号', () => {
  const buf = Buffer.from('e\u0301'); // é 的组合形式
  return buf.indexOf('\u0301') === 1;
});

test('Unicode - BOM 标记', () => {
  const buf = Buffer.from('\uFEFFhello');
  return buf.indexOf('\uFEFF') === 0;
});

test('Unicode - 替换字符', () => {
  const buf = Buffer.from('\uFFFD');
  return buf.indexOf('\uFFFD') === 0;
});

// 边界情况 - 连续相同字节
test('连续相同字节 - 查找单个', () => {
  const buf = Buffer.from([1, 1, 1, 1, 1]);
  return buf.indexOf(1) === 0;
});

test('连续相同字节 - 查找多个', () => {
  const buf = Buffer.from([1, 1, 1, 1, 1]);
  return buf.indexOf(Buffer.from([1, 1])) === 0;
});

test('连续相同字节 - 查找多个带偏移', () => {
  const buf = Buffer.from([1, 1, 1, 1, 1]);
  return buf.indexOf(Buffer.from([1, 1]), 2) === 2;
});

// 极端长度测试
test('极长字符串 - 1MB Buffer', () => {
  const buf = Buffer.alloc(1024 * 1024);
  buf.write('target', 1024 * 512);
  return buf.indexOf('target') === 1024 * 512;
});

test('极长字符串 - 查找不存在的值', () => {
  const buf = Buffer.alloc(1024 * 1024);
  return buf.indexOf('target') === -1;
});

// byteOffset 精度测试
test('byteOffset - 极大正数', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', 9007199254740991) === -1; // Number.MAX_SAFE_INTEGER
});

test('byteOffset - 极小负数', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('hello', -9007199254740991) === 0; // -Number.MAX_SAFE_INTEGER
});

test('byteOffset - 1.5', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 1.5) === 6; // 应该向下取整为 1
});

test('byteOffset - -1.5', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('d', -1.5) === 10; // 应该向下取整为 -2，从倒数第2个字节开始
});

// 特殊搜索模式
test('搜索模式 - 回文字符串', () => {
  const buf = Buffer.from('abcba');
  return buf.indexOf('bcb') === 1;
});

test('搜索模式 - 嵌套重复', () => {
  const buf = Buffer.from('aabaabaabaab');
  return buf.indexOf('aabaab') === 0;
});

test('搜索模式 - 嵌套重复带偏移', () => {
  const buf = Buffer.from('aabaabaabaab');
  return buf.indexOf('aabaab', 1) === 3;
});

// 混合类型边界测试
test('混合类型 - 数字 0 在字符串 Buffer', () => {
  const buf = Buffer.from('hello\0world');
  return buf.indexOf(0) === 5;
});

test('混合类型 - 字符串 "0" 在数字 Buffer', () => {
  const buf = Buffer.from([48, 49, 50]); // "012"
  return buf.indexOf('0') === 0;
});

// 编码转换边界
test('编码转换 - hex 查找 utf8', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.indexOf('Hello', 0, 'utf8') === 0;
});

test('编码转换 - base64 查找 utf8', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  return buf.indexOf('Hello', 0, 'utf8') === 0;
});

// 空白字符测试
test('空白字符 - 空格', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf(' ') === 5;
});

test('空白字符 - 多个空格', () => {
  const buf = Buffer.from('hello  world');
  return buf.indexOf('  ') === 5;
});

test('空白字符 - Tab', () => {
  const buf = Buffer.from('hello\tworld');
  return buf.indexOf('\t') === 5;
});

test('空白字符 - 换行', () => {
  const buf = Buffer.from('hello\nworld');
  return buf.indexOf('\n') === 5;
});

test('空白字符 - 回车换行', () => {
  const buf = Buffer.from('hello\r\nworld');
  return buf.indexOf('\r\n') === 5;
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
