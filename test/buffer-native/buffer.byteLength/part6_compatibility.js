// Buffer.byteLength() - Compatibility Tests
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

// 与 Buffer.from().length 对比
test('byteLength 与 Buffer.from().length 一致 - ASCII', () => {
  const str = 'hello';
  const len1 = Buffer.byteLength(str);
  const len2 = Buffer.from(str).length;
  return len1 === len2;
});

test('byteLength 与 Buffer.from().length 一致 - 中文', () => {
  const str = '你好世界';
  const len1 = Buffer.byteLength(str);
  const len2 = Buffer.from(str).length;
  return len1 === len2;
});

test('byteLength 与 Buffer.from().length 一致 - emoji', () => {
  const str = '😀😁😂';
  const len1 = Buffer.byteLength(str);
  const len2 = Buffer.from(str).length;
  return len1 === len2;
});

test('byteLength 与 Buffer.from().length 一致 - hex', () => {
  const str = '68656c6c6f';
  const len1 = Buffer.byteLength(str, 'hex');
  const len2 = Buffer.from(str, 'hex').length;
  return len1 === len2;
});

test('byteLength 与 Buffer.from().length 一致 - base64', () => {
  const str = 'aGVsbG8=';
  const len1 = Buffer.byteLength(str, 'base64');
  const len2 = Buffer.from(str, 'base64').length;
  return len1 === len2;
});

test('byteLength 与 Buffer.from().length 一致 - utf16le', () => {
  const str = 'hello';
  const len1 = Buffer.byteLength(str, 'utf16le');
  const len2 = Buffer.from(str, 'utf16le').length;
  return len1 === len2;
});

test('byteLength 与 Buffer.from().length 一致 - latin1', () => {
  const str = 'hello';
  const len1 = Buffer.byteLength(str, 'latin1');
  const len2 = Buffer.from(str, 'latin1').length;
  return len1 === len2;
});

// 与 Buffer.alloc().write() 对比
test('byteLength 与 write() 返回值一致 - utf8', () => {
  const str = 'hello';
  const len1 = Buffer.byteLength(str);
  const buf = Buffer.alloc(100);
  const len2 = buf.write(str);
  return len1 === len2;
});

test('byteLength 与 write() 返回值一致 - 中文', () => {
  const str = '你好';
  const len1 = Buffer.byteLength(str);
  const buf = Buffer.alloc(100);
  const len2 = buf.write(str);
  return len1 === len2;
});

test('byteLength 与 write() 返回值一致 - hex', () => {
  const str = '68656c6c6f';
  const len1 = Buffer.byteLength(str, 'hex');
  const buf = Buffer.alloc(100);
  const len2 = buf.write(str, 0, 'hex');
  return len1 === len2;
});

// 编码别名验证
test('utf8 和 utf-8 结果相同', () => {
  const str = 'hello你好';
  const len1 = Buffer.byteLength(str, 'utf8');
  const len2 = Buffer.byteLength(str, 'utf-8');
  return len1 === len2;
});

test('ucs2 和 utf16le 结果相同', () => {
  const str = 'hello';
  const len1 = Buffer.byteLength(str, 'ucs2');
  const len2 = Buffer.byteLength(str, 'utf16le');
  return len1 === len2;
});

test('ucs-2 和 ucs2 结果相同', () => {
  const str = 'hello';
  const len1 = Buffer.byteLength(str, 'ucs-2');
  const len2 = Buffer.byteLength(str, 'ucs2');
  return len1 === len2;
});

test('binary 和 latin1 结果相同', () => {
  const str = 'hello';
  const len1 = Buffer.byteLength(str, 'binary');
  const len2 = Buffer.byteLength(str, 'latin1');
  return len1 === len2;
});

// 空输入一致性
test('空字符串在所有编码下长度为 0', () => {
  const encodings = ['utf8', 'utf16le', 'latin1', 'ascii', 'hex', 'base64'];
  return encodings.every(enc => Buffer.byteLength('', enc) === 0);
});

test('空 Buffer 长度为 0', () => {
  const buf = Buffer.alloc(0);
  return Buffer.byteLength(buf) === 0;
});

test('空 TypedArray 长度为 0', () => {
  const arr = new Uint8Array(0);
  return Buffer.byteLength(arr) === 0;
});

test('空 ArrayBuffer 长度为 0', () => {
  const ab = new ArrayBuffer(0);
  return Buffer.byteLength(ab) === 0;
});

// TypedArray 字节长度验证
test('TypedArray byteLength 与其 byteLength 属性一致', () => {
  const arr = new Uint8Array([1, 2, 3, 4, 5]);
  return Buffer.byteLength(arr) === arr.byteLength;
});

test('Uint16Array byteLength 验证', () => {
  const arr = new Uint16Array([1, 2, 3]);
  return Buffer.byteLength(arr) === arr.byteLength && arr.byteLength === 6;
});

test('Float32Array byteLength 验证', () => {
  const arr = new Float32Array([1.0, 2.0]);
  return Buffer.byteLength(arr) === arr.byteLength && arr.byteLength === 8;
});

// ArrayBuffer 长度验证
test('ArrayBuffer byteLength 与其 byteLength 属性一致', () => {
  const ab = new ArrayBuffer(100);
  return Buffer.byteLength(ab) === ab.byteLength;
});

// 大小写不敏感全面验证
test('编码名称各种大小写组合 - utf8', () => {
  const str = 'hello';
  const cases = ['utf8', 'UTF8', 'Utf8', 'UtF8'];
  const results = cases.map(enc => Buffer.byteLength(str, enc));
  return results.every(len => len === 5);
});

test('编码名称各种大小写组合 - hex', () => {
  const str = '68656c6c6f';
  const cases = ['hex', 'HEX', 'Hex', 'HeX'];
  const results = cases.map(enc => Buffer.byteLength(str, enc));
  return results.every(len => len === 5);
});

test('编码名称各种大小写组合 - base64', () => {
  const str = 'aGVsbG8=';
  const cases = ['base64', 'BASE64', 'Base64', 'BaSe64'];
  const results = cases.map(enc => Buffer.byteLength(str, enc));
  return results.every(len => len === 5);
});

// 多次调用一致性
test('多次调用返回相同结果', () => {
  const str = 'hello你好😀';
  const len1 = Buffer.byteLength(str);
  const len2 = Buffer.byteLength(str);
  const len3 = Buffer.byteLength(str);
  return len1 === len2 && len2 === len3;
});

test('不同对象相同内容返回相同结果', () => {
  const str1 = 'hello';
  const str2 = 'hel' + 'lo';
  const str3 = String.fromCharCode(104, 101, 108, 108, 111);
  return Buffer.byteLength(str1) === Buffer.byteLength(str2)
      && Buffer.byteLength(str2) === Buffer.byteLength(str3);
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
