// Buffer.byteLength() - Cross Validation (Round 4)
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

// 编码 + 特殊字符组合
test('hex 编码 + 非 ASCII 字符', () => {
  // 非 hex 字符会被部分处理
  const len = Buffer.byteLength('你好', 'hex');
  return len === 1;
});

test('base64 编码 + emoji', () => {
  const len = Buffer.byteLength('😀', 'base64');
  // emoji 会被部分处理
  return len === 1;
});

test('latin1 编码 + emoji', () => {
  const len = Buffer.byteLength('😀', 'latin1');
  // emoji 超出 latin1 范围，会被截断
  return len === 2;
});

test('ascii 编码 + emoji', () => {
  const len = Buffer.byteLength('😀', 'ascii');
  // emoji 在 ASCII 中会被截断
  return len === 2;
});

// 空值组合测试
test('空 Buffer + 任意编码参数', () => {
  const buf = Buffer.alloc(0);
  return Buffer.byteLength(buf, 'hex') === 0
      && Buffer.byteLength(buf, 'base64') === 0
      && Buffer.byteLength(buf, 'utf8') === 0;
});

test('空字符串 + 所有支持的编码', () => {
  const encodings = ['utf8', 'utf16le', 'latin1', 'ascii', 'base64', 'base64url', 'hex', 'binary', 'ucs2'];
  return encodings.every(enc => Buffer.byteLength('', enc) === 0);
});

// 长度边界组合
test('最小非空 Buffer（1 字节）', () => {
  const buf = Buffer.alloc(1);
  return Buffer.byteLength(buf) === 1;
});

test('中等长度 Buffer（1024 字节）', () => {
  const buf = Buffer.alloc(1024);
  return Buffer.byteLength(buf) === 1024;
});

test('大 Buffer（10MB）', () => {
  const buf = Buffer.alloc(10 * 1024 * 1024);
  return Buffer.byteLength(buf) === 10 * 1024 * 1024;
});

// TypedArray 长度验证组合
test('所有 TypedArray 类型的空数组', () => {
  return Buffer.byteLength(new Uint8Array(0)) === 0
      && Buffer.byteLength(new Uint16Array(0)) === 0
      && Buffer.byteLength(new Uint32Array(0)) === 0
      && Buffer.byteLength(new Int8Array(0)) === 0
      && Buffer.byteLength(new Int16Array(0)) === 0
      && Buffer.byteLength(new Int32Array(0)) === 0
      && Buffer.byteLength(new Float32Array(0)) === 0
      && Buffer.byteLength(new Float64Array(0)) === 0;
});

test('所有 TypedArray 类型的单元素数组', () => {
  return Buffer.byteLength(new Uint8Array(1)) === 1
      && Buffer.byteLength(new Uint16Array(1)) === 2
      && Buffer.byteLength(new Uint32Array(1)) === 4
      && Buffer.byteLength(new Int8Array(1)) === 1
      && Buffer.byteLength(new Int16Array(1)) === 2
      && Buffer.byteLength(new Int32Array(1)) === 4
      && Buffer.byteLength(new Float32Array(1)) === 4
      && Buffer.byteLength(new Float64Array(1)) === 8;
});

// 编码别名完整验证
test('utf8 所有别名', () => {
  const str = 'test你好';
  const len = Buffer.byteLength(str, 'utf8');
  return Buffer.byteLength(str, 'UTF8') === len
      && Buffer.byteLength(str, 'utf-8') === len
      && Buffer.byteLength(str, 'UTF-8') === len;
});

test('utf16le 所有别名', () => {
  const str = 'test';
  const len = Buffer.byteLength(str, 'utf16le');
  return Buffer.byteLength(str, 'UTF16LE') === len
      && Buffer.byteLength(str, 'ucs2') === len
      && Buffer.byteLength(str, 'UCS2') === len
      && Buffer.byteLength(str, 'ucs-2') === len
      && Buffer.byteLength(str, 'UCS-2') === len;
});

test('latin1 所有别名', () => {
  const str = 'test';
  const len = Buffer.byteLength(str, 'latin1');
  return Buffer.byteLength(str, 'LATIN1') === len
      && Buffer.byteLength(str, 'binary') === len
      && Buffer.byteLength(str, 'BINARY') === len;
});

// 混合字符编码测试
test('ASCII + 中文 + emoji 混合（utf8）', () => {
  const str = 'hello你好😀world';
  const len = Buffer.byteLength(str, 'utf8');
  // hello(5) + 你好(6) + 😀(4) + world(5) = 20
  return len === 20;
});

test('ASCII + 中文 + emoji 混合（utf16le）', () => {
  const str = 'hello你好😀world';
  const len = Buffer.byteLength(str, 'utf16le');
  // utf16le: hello(10) + 你好(4) + 😀(4) + world(10) = 28
  return len === 28;
});

test('全 ASCII 字符（utf8 vs latin1）', () => {
  const str = 'abcdef';
  const len1 = Buffer.byteLength(str, 'utf8');
  const len2 = Buffer.byteLength(str, 'latin1');
  return len1 === len2 && len1 === 6;
});

test('全 ASCII 字符（utf8 vs ascii）', () => {
  const str = 'abcdef';
  const len1 = Buffer.byteLength(str, 'utf8');
  const len2 = Buffer.byteLength(str, 'ascii');
  return len1 === len2 && len1 === 6;
});

// Buffer 与 ArrayBuffer 互操作
test('从 Buffer 创建的 ArrayBuffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const len = Buffer.byteLength(ab);
  return len === 5;
});

test('从 ArrayBuffer 创建的 Buffer', () => {
  const ab = new ArrayBuffer(10);
  const buf = Buffer.from(ab);
  return Buffer.byteLength(buf) === 10;
});

// 特殊字符串长度验证
test('只包含空格的字符串', () => {
  const str = '          '; // 10 个空格
  return Buffer.byteLength(str) === 10;
});

test('只包含换行符的字符串', () => {
  const str = '\n\n\n\n\n'; // 5 个换行符
  return Buffer.byteLength(str) === 5;
});

test('只包含制表符的字符串', () => {
  const str = '\t\t\t\t\t'; // 5 个制表符
  return Buffer.byteLength(str) === 5;
});

test('回车 + 换行组合', () => {
  const str = '\r\n\r\n\r\n';
  return Buffer.byteLength(str) === 6;
});

// hex 编码特殊情况
test('hex 全 0', () => {
  const len = Buffer.byteLength('0000000000', 'hex');
  return len === 5;
});

test('hex 全 F', () => {
  const len = Buffer.byteLength('FFFFFFFFFF', 'hex');
  return len === 5;
});

test('hex 交替 01', () => {
  const len = Buffer.byteLength('0101010101', 'hex');
  return len === 5;
});

// base64 编码特殊情况
test('base64 全 A', () => {
  const len = Buffer.byteLength('AAAA', 'base64');
  return len === 3;
});

test('base64 标准字母表', () => {
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const len = Buffer.byteLength(str, 'base64');
  return len === 48;
});

test('base64url 标准字母表', () => {
  const str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const len = Buffer.byteLength(str, 'base64url');
  return len === 48;
});

// Unicode 规范化差异
test('相同显示不同编码的字符', () => {
  const str1 = 'é'; // U+00E9 (预组合)
  const str2 = 'e\u0301'; // U+0065 + U+0301 (分解)
  const len1 = Buffer.byteLength(str1);
  const len2 = Buffer.byteLength(str2);
  // 预组合: 2 字节, 分解: 3 字节
  return len1 === 2 && len2 === 3;
});

// 极端字符测试
test('U+0000 null 字符', () => {
  const len = Buffer.byteLength('\u0000');
  return len === 1;
});

test('U+FFFF 最大 BMP 字符', () => {
  const len = Buffer.byteLength('\uFFFF');
  return len === 3;
});

test('U+10FFFF 最大 Unicode 码点', () => {
  const len = Buffer.byteLength('\u{10FFFF}');
  return len === 4;
});

// 性能相关边界（不实际测性能，只测功能）
test('10K 字符串', () => {
  const str = 'a'.repeat(10000);
  return Buffer.byteLength(str) === 10000;
});

test('100K 字符串', () => {
  const str = 'a'.repeat(100000);
  return Buffer.byteLength(str) === 100000;
});

test('10K 中文字符串', () => {
  const str = '中'.repeat(10000);
  return Buffer.byteLength(str) === 30000;
});

// 编码与输入类型交叉
test('Buffer + 非法编码参数（应忽略编码）', () => {
  const buf = Buffer.from('hello');
  const len1 = Buffer.byteLength(buf);
  const len2 = Buffer.byteLength(buf, 'invalid-encoding');
  return len1 === len2 && len1 === 5;
});

test('TypedArray + 编码参数（应忽略编码）', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  const len1 = Buffer.byteLength(arr);
  const len2 = Buffer.byteLength(arr, 'hex');
  return len1 === len2 && len1 === 5;
});

test('ArrayBuffer + 编码参数（应忽略编码）', () => {
  const ab = new ArrayBuffer(10);
  const len1 = Buffer.byteLength(ab);
  const len2 = Buffer.byteLength(ab, 'base64');
  return len1 === len2 && len1 === 10;
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
