// buf.lastIndexOf() - Node.js 官方文档示例对齐测试
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

// 官方示例 1: 基本用法
test('官方示例: this buffer is a buffer - this', () => {
  const buf = Buffer.from('this buffer is a buffer');
  return buf.lastIndexOf('this') === 0;
});

test('官方示例: this buffer is a buffer - buffer (最后)', () => {
  const buf = Buffer.from('this buffer is a buffer');
  return buf.lastIndexOf('buffer') === 17;
});

test('官方示例: this buffer is a buffer - Buffer.from', () => {
  const buf = Buffer.from('this buffer is a buffer');
  return buf.lastIndexOf(Buffer.from('buffer')) === 17;
});

test('官方示例: this buffer is a buffer - 97 (a)', () => {
  const buf = Buffer.from('this buffer is a buffer');
  return buf.lastIndexOf(97) === 15;
});

test('官方示例: this buffer is a buffer - yolo', () => {
  const buf = Buffer.from('this buffer is a buffer');
  return buf.lastIndexOf(Buffer.from('yolo')) === -1;
});

test('官方示例: this buffer is a buffer - buffer with offset 5', () => {
  const buf = Buffer.from('this buffer is a buffer');
  return buf.lastIndexOf('buffer', 5) === 5;
});

test('官方示例: this buffer is a buffer - buffer with offset 4', () => {
  const buf = Buffer.from('this buffer is a buffer');
  return buf.lastIndexOf('buffer', 4) === -1;
});

// 官方示例 2: UTF-16LE
test('官方示例: utf16le - ΚΑΛΣΣΕ 查找 Σ', () => {
  const utf16Buffer = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return utf16Buffer.lastIndexOf('\u03a3', undefined, 'utf16le') === 6;
});

test('官方示例: utf16le - ΚΑΛΣΣΕ 查找 Σ with -5', () => {
  const utf16Buffer = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return utf16Buffer.lastIndexOf('\u03a3', -5, 'utf16le') === 4;
});

// 官方示例 3: 数字转换
test('官方示例: abcdef - 99.9 转换为 99 (c)', () => {
  const b = Buffer.from('abcdef');
  return b.lastIndexOf(99.9) === 2;
});

test('官方示例: abcdef - 256 + 99 转换为 99 (c)', () => {
  const b = Buffer.from('abcdef');
  return b.lastIndexOf(256 + 99) === 2;
});

// 官方示例 4: byteOffset 转换为 NaN
test('官方示例: abcdef - b with undefined offset', () => {
  const b = Buffer.from('abcdef');
  return b.lastIndexOf('b', undefined) === 1;
});

test('官方示例: abcdef - b with {} offset', () => {
  const b = Buffer.from('abcdef');
  return b.lastIndexOf('b', {}) === 1;
});

// 官方示例 5: byteOffset 转换为 0
test('官方示例: abcdef - b with null offset', () => {
  const b = Buffer.from('abcdef');
  return b.lastIndexOf('b', null) === -1;
});

test('官方示例: abcdef - b with [] offset', () => {
  const b = Buffer.from('abcdef');
  return b.lastIndexOf('b', []) === -1;
});

// 官方文档明确的行为：空字符串或空 Buffer 返回 byteOffset
test('官方行为: 空字符串返回 byteOffset', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf('', 2) === 2;
});

test('官方行为: 空 Buffer 返回 byteOffset', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(Buffer.alloc(0), 3) === 3;
});

test('官方行为: 空字符串默认返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('') === 5;
});

test('官方行为: 空 Buffer 默认返回 buf.length', () => {
  const buf = Buffer.from('world');
  return buf.lastIndexOf(Buffer.alloc(0)) === 5;
});

// 类型错误测试（官方文档明确）
test('官方错误: value 不是 string/number/Buffer/Uint8Array', () => {
  const buf = Buffer.from('test');
  try {
    buf.lastIndexOf({});
    return false;
  } catch (e) {
    return e.message.includes('must be one of type');
  }
});

test('官方错误: 数字会被强制转换为有效字节值', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
  // 300 % 256 = 44
  return buf.lastIndexOf(300) === -1;
});

test('官方错误: byteOffset 不是数字会被强制转换', () => {
  const buf = Buffer.from('test test');
  // '5' 是字符串，会被识别为 encoding
  try {
    buf.lastIndexOf('test', '5');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

// 边界对齐测试
test('官方行为: 负 offset 从末尾计算', () => {
  const buf = Buffer.from('hello world hello');
  // -6 相当于 17 - 6 = 11，从位置 11 向前搜索，只能找到位置 0 的 'hello'
  return buf.lastIndexOf('hello', -6) === 0;
});

test('官方行为: 超大 offset 被限制为 buf.length - 1', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', 10000) === 5;
});

test('官方行为: 负超大 offset 返回 -1', () => {
  const buf = Buffer.from('hello');
  return buf.lastIndexOf('hello', -1000) === -1;
});

// 精确的字节匹配
test('官方行为: 字节级别精确匹配', () => {
  const buf = Buffer.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]); // 'hello'
  return buf.lastIndexOf('hello') === 0;
});

test('官方行为: 大小写敏感', () => {
  const buf = Buffer.from('Hello');
  return buf.lastIndexOf('hello') === -1;
});

// Uint8Array 支持（v6.0.0+）
test('官方特性: Uint8Array 支持', () => {
  const buf = Buffer.from([1, 2, 3, 1, 2, 3]);
  const search = new Uint8Array([1, 2, 3]);
  return buf.lastIndexOf(search) === 3;
});

test('官方特性: Uint8Array 空数组', () => {
  const buf = Buffer.from('test');
  const search = new Uint8Array(0);
  return buf.lastIndexOf(search) === 4;
});

// 与 String.prototype.lastIndexOf() 行为匹配
test('官方对齐: 与 String.lastIndexOf 行为一致', () => {
  const str = 'this buffer is a buffer';
  const buf = Buffer.from(str);
  const strResult = str.lastIndexOf('buffer');
  const bufResult = buf.lastIndexOf('buffer');
  return strResult === bufResult;
});

test('官方对齐: NaN offset 行为与 String 一致', () => {
  const buf = Buffer.from('test test');
  // NaN 会搜索整个 buffer
  return buf.lastIndexOf('test', NaN) === 5;
});

test('官方对齐: 0 offset 行为与 String 一致', () => {
  const buf = Buffer.from('abc abc');
  return buf.lastIndexOf('abc', 0) === 0;
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
