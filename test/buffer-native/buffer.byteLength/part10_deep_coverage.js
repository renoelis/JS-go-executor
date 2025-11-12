// Buffer.byteLength() - Deep Coverage (Round 6)
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

// 参数数量边界
test('无参数应抛出错误', () => {
  try {
    Buffer.byteLength();
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('三个参数（第三个被忽略）', () => {
  const len = Buffer.byteLength('hello', 'utf8', 'extra');
  return len === 5;
});

test('四个参数（多余参数被忽略）', () => {
  const len = Buffer.byteLength('hello', 'utf8', 'extra', 'more');
  return len === 5;
});

// 编码参数特殊值
test('编码参数为 false', () => {
  const len = Buffer.byteLength('hello', false);
  // false 会被转换为 'false' 字符串，作为无效编码回退到 utf8
  return len === 5;
});

test('编码参数为 true', () => {
  const len = Buffer.byteLength('hello', true);
  return len === 5;
});

test('编码参数为数字 0', () => {
  const len = Buffer.byteLength('hello', 0);
  return len === 5;
});

test('编码参数为数字 1', () => {
  const len = Buffer.byteLength('hello', 1);
  return len === 5;
});

test('编码参数为空数组', () => {
  const len = Buffer.byteLength('hello', []);
  return len === 5;
});

test('编码参数为 NaN', () => {
  const len = Buffer.byteLength('hello', NaN);
  return len === 5;
});

// 字符串特殊构造
test('String 对象应抛出错误', () => {
  try {
    Buffer.byteLength(new String('hello'));
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('带 toString 的对象应抛出错误', () => {
  try {
    const obj = { toString: () => 'hello' };
    Buffer.byteLength(obj);
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

test('带 valueOf 的对象应抛出错误', () => {
  try {
    const obj = { valueOf: () => 'hello' };
    Buffer.byteLength(obj);
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

// Buffer 类似对象
test('非标准类似 Buffer 对象应抛出错误', () => {
  try {
    const buf = Buffer.from('hello');
    // 创建一个类似但非正式的 Buffer 对象
    const fakeBuffer = { ...buf };
    Buffer.byteLength(fakeBuffer);
    return false;
  } catch (e) {
    return e.code === 'ERR_INVALID_ARG_TYPE';
  }
});

// 编码名称变体（更多组合）
test('utf-16le 编码（带连字符）', () => {
  const len = Buffer.byteLength('test', 'utf-16le');
  return len === 8;
});

test('UTF-16LE 编码（全大写带连字符）', () => {
  const len = Buffer.byteLength('test', 'UTF-16LE');
  return len === 8;
});

test('Utf-16Le 编码（混合大小写）', () => {
  const len = Buffer.byteLength('test', 'Utf-16Le');
  return len === 8;
});

// TypedArray 极值
test('Uint8Array 值为 0', () => {
  const arr = new Uint8Array([0]);
  return Buffer.byteLength(arr) === 1;
});

test('Uint8Array 值为 255', () => {
  const arr = new Uint8Array([255]);
  return Buffer.byteLength(arr) === 1;
});

test('Int8Array 值为 -128（最小值）', () => {
  const arr = new Int8Array([-128]);
  return Buffer.byteLength(arr) === 1;
});

test('Int8Array 值为 127（最大值）', () => {
  const arr = new Int8Array([127]);
  return Buffer.byteLength(arr) === 1;
});

test('Uint16Array 值为 0', () => {
  const arr = new Uint16Array([0]);
  return Buffer.byteLength(arr) === 2;
});

test('Uint16Array 值为 65535', () => {
  const arr = new Uint16Array([65535]);
  return Buffer.byteLength(arr) === 2;
});

test('Int16Array 值为 -32768', () => {
  const arr = new Int16Array([-32768]);
  return Buffer.byteLength(arr) === 2;
});

test('Int16Array 值为 32767', () => {
  const arr = new Int16Array([32767]);
  return Buffer.byteLength(arr) === 2;
});

// 空白字符在不同编码
test('空格在 hex 编码', () => {
  const len = Buffer.byteLength(' ', 'hex');
  return len === 0;
});

test('空格在 base64 编码', () => {
  const len = Buffer.byteLength(' ', 'base64');
  return len === 0;
});

test('制表符在 hex 编码', () => {
  const len = Buffer.byteLength('\t', 'hex');
  return len === 0;
});

test('制表符在 base64 编码', () => {
  const len = Buffer.byteLength('\t', 'base64');
  return len === 0;
});

test('换行符在 hex 编码', () => {
  const len = Buffer.byteLength('\n', 'hex');
  return len === 0;
});

test('换行符在 base64 编码', () => {
  const len = Buffer.byteLength('\n', 'base64');
  return len === 0;
});

// base64 填充详细测试
test('base64: A（长度1）', () => {
  const len = Buffer.byteLength('A', 'base64');
  return len === 0;
});

test('base64: AA（长度2）', () => {
  const len = Buffer.byteLength('AA', 'base64');
  return len === 1;
});

test('base64: AAA（长度3）', () => {
  const len = Buffer.byteLength('AAA', 'base64');
  return len === 2;
});

test('base64: AAAA（长度4）', () => {
  const len = Buffer.byteLength('AAAA', 'base64');
  return len === 3;
});

test('base64: A=（无效）', () => {
  const len = Buffer.byteLength('A=', 'base64');
  return len === 0;
});

test('base64: AA=（有效）', () => {
  const len = Buffer.byteLength('AA=', 'base64');
  return len === 1;
});

test('base64: AAA=（有效）', () => {
  const len = Buffer.byteLength('AAA=', 'base64');
  return len === 2;
});

test('base64: A==（无效）', () => {
  const len = Buffer.byteLength('A==', 'base64');
  return len === 0;
});

test('base64: AA==（有效）', () => {
  const len = Buffer.byteLength('AA==', 'base64');
  return len === 1;
});

test('base64: AAA==（有效但不标准）', () => {
  const len = Buffer.byteLength('AAA==', 'base64');
  return len === 2;
});

// hex 非法字符详细测试
test('hex: g（非法字符）', () => {
  const len = Buffer.byteLength('g', 'hex');
  return len === 0;
});

test('hex: gg（两个非法字符）', () => {
  const len = Buffer.byteLength('gg', 'hex');
  return len === 1;
});

test('hex: ag（一个合法一个非法）', () => {
  const len = Buffer.byteLength('ag', 'hex');
  return len === 1;
});

test('hex: ga（一个非法一个合法）', () => {
  const len = Buffer.byteLength('ga', 'hex');
  return len === 1;
});

test('hex: a g（带空格）', () => {
  const len = Buffer.byteLength('a g', 'hex');
  return len === 1;
});

test('hex: a-g（带连字符）', () => {
  const len = Buffer.byteLength('a-g', 'hex');
  return len === 1;
});

test('hex: a_g（带下划线）', () => {
  const len = Buffer.byteLength('a_g', 'hex');
  return len === 1;
});

// 字符串长度边界（0-10）
test('字符串长度 0', () => {
  return Buffer.byteLength('') === 0;
});

test('字符串长度 1', () => {
  return Buffer.byteLength('a') === 1;
});

test('字符串长度 2', () => {
  return Buffer.byteLength('ab') === 2;
});

test('字符串长度 3', () => {
  return Buffer.byteLength('abc') === 3;
});

test('字符串长度 5', () => {
  return Buffer.byteLength('abcde') === 5;
});

test('字符串长度 10', () => {
  return Buffer.byteLength('abcdefghij') === 10;
});

// 混合字符精确测试
test('中英混合: a中b文c', () => {
  const len = Buffer.byteLength('a中b文c');
  // a(1) + 中(3) + b(1) + 文(3) + c(1) = 9
  return len === 9;
});

test('emoji混合: a😀b😁c', () => {
  const len = Buffer.byteLength('a😀b😁c');
  // a(1) + 😀(4) + b(1) + 😁(4) + c(1) = 11
  return len === 11;
});

test('全混合: a中😀', () => {
  const len = Buffer.byteLength('a中😀');
  // a(1) + 中(3) + 😀(4) = 8
  return len === 8;
});

// ArrayBuffer slice
test('ArrayBuffer.slice 结果', () => {
  const ab = new ArrayBuffer(10);
  const sliced = ab.slice(2, 8);
  return Buffer.byteLength(sliced) === 6;
});

test('ArrayBuffer.slice 全部', () => {
  const ab = new ArrayBuffer(10);
  const sliced = ab.slice(0, 10);
  return Buffer.byteLength(sliced) === 10;
});

test('ArrayBuffer.slice 起始点', () => {
  const ab = new ArrayBuffer(10);
  const sliced = ab.slice(5);
  return Buffer.byteLength(sliced) === 5;
});

// UTF-16 代理对详细边界
test('UTF-16 高代理最小值 U+D800', () => {
  const len = Buffer.byteLength('\uD800');
  return len === 3;
});

test('UTF-16 高代理最大值 U+DBFF', () => {
  const len = Buffer.byteLength('\uDBFF');
  return len === 3;
});

test('UTF-16 低代理最小值 U+DC00', () => {
  const len = Buffer.byteLength('\uDC00');
  return len === 3;
});

test('UTF-16 低代理最大值 U+DFFF', () => {
  const len = Buffer.byteLength('\uDFFF');
  return len === 3;
});

test('正常代理对 U+D800 U+DC00', () => {
  const len = Buffer.byteLength('\uD800\uDC00');
  return len === 4;
});

test('正常代理对 U+DBFF U+DFFF', () => {
  const len = Buffer.byteLength('\uDBFF\uDFFF');
  return len === 4;
});

test('反向代理对 U+DC00 U+D800', () => {
  const len = Buffer.byteLength('\uDC00\uD800');
  return len === 6;
});

test('反向代理对 U+DFFF U+DBFF', () => {
  const len = Buffer.byteLength('\uDFFF\uDBFF');
  return len === 6;
});

// 连续代理项
test('两个连续高代理项', () => {
  const len = Buffer.byteLength('\uD800\uD800');
  return len === 6;
});

test('两个连续低代理项', () => {
  const len = Buffer.byteLength('\uDC00\uDC00');
  return len === 6;
});

test('三个代理对', () => {
  const len = Buffer.byteLength('\uD800\uDC00\uD801\uDC01\uD802\uDC02');
  return len === 12;
});

// 零字节详细测试
test('单个 null 字节', () => {
  const len = Buffer.byteLength('\x00');
  return len === 1;
});

test('三个 null 字节', () => {
  const len = Buffer.byteLength('\x00\x00\x00');
  return len === 3;
});

test('混合 null 字节: a\\x00b\\x00c', () => {
  const len = Buffer.byteLength('a\x00b\x00c');
  return len === 5;
});

test('开头的 null 字节', () => {
  const len = Buffer.byteLength('\x00abc');
  return len === 4;
});

test('结尾的 null 字节', () => {
  const len = Buffer.byteLength('abc\x00');
  return len === 4;
});

// 连续相同字符（补充）
test('50个空格', () => {
  const len = Buffer.byteLength(' '.repeat(50));
  return len === 50;
});

test('50个换行符', () => {
  const len = Buffer.byteLength('\n'.repeat(50));
  return len === 50;
});

test('50个制表符', () => {
  const len = Buffer.byteLength('\t'.repeat(50));
  return len === 50;
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
