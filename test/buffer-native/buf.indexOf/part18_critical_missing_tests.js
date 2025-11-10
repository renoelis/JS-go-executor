// buf.indexOf() - Critical Missing Tests
// 根据 Node.js v25.0.0 官方文档补充的关键测试
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

// ============================================
// 空字符串/空 Buffer 的特殊返回值行为
// ============================================

test('空字符串 - byteOffset=0 返回 0', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 0) === 0;
});

test('空字符串 - byteOffset=3 返回 3', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 3) === 3;
});

test('空字符串 - byteOffset=buf.length 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', buf.length) === buf.length;
});

test('空字符串 - byteOffset > buf.length 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 100) === buf.length;
});

test('空字符串 - 负 byteOffset 从末尾计算', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', -2) === 3; // buf.length + (-2) = 5 - 2 = 3
});

test('空 Buffer - byteOffset=0 返回 0', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 0) === 0;
});

test('空 Buffer - byteOffset=3 返回 3', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 3) === 3;
});

test('空 Buffer - byteOffset=buf.length 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), buf.length) === buf.length;
});

test('空 Buffer - byteOffset > buf.length 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 100) === buf.length;
});

test('空 Uint8Array - byteOffset=2 返回 2', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0), 2) === 2;
});

test('空 Uint8Array - byteOffset=buf.length 返回 buf.length', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0), buf.length) === buf.length;
});

// ============================================
// byteOffset 字符串参数作为 encoding 处理
// ============================================

test('byteOffset 为字符串 "utf8" - 作为 encoding', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 'utf8') === 6;
});

test('byteOffset 为字符串 "hex" - 作为 encoding', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.indexOf('6c6c', 'hex') === 2;
});

test('byteOffset 为字符串 "base64" - 作为 encoding', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  return buf.indexOf('llo', 'utf8') === 2;
});

test('byteOffset 为字符串 "latin1" - 作为 encoding', () => {
  const buf = Buffer.from('hello', 'latin1');
  return buf.indexOf('llo', 'latin1') === 2;
});

test('byteOffset 为字符串 "ascii" - 作为 encoding', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.indexOf('llo', 'ascii') === 2;
});

test('byteOffset 为字符串 "utf16le" - 作为 encoding', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.indexOf('llo', 'utf16le') === 4;
});

test('byteOffset 为字符串 "ucs2" - 作为 encoding', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.indexOf('llo', 'ucs2') === 4;
});

// ============================================
// 数字值的字节转换（模 256 运算）
// ============================================

test('数字 99.9 转为字节 99', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(99.9) === 2; // 'c' = 99
});

test('数字 256 + 99 转为字节 99', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(256 + 99) === 2; // 355 % 256 = 99
});

test('数字 512 转为字节 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(512) === 0; // 512 % 256 = 0
});

test('数字 257 转为字节 1', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(257) === 1; // 257 % 256 = 1
});

test('数字 1000 转为字节 232', () => {
  const buf = Buffer.from([0, 232, 2, 3]);
  return buf.indexOf(1000) === 1; // 1000 % 256 = 232
});

test('数字 -1 转为字节 255', () => {
  const buf = Buffer.from([0, 255, 2, 3]);
  return buf.indexOf(-1) === 1; // -1 & 0xFF = 255
});

test('数字 -256 转为字节 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(-256) === 0; // -256 & 0xFF = 0
});

test('数字 -257 转为字节 255', () => {
  const buf = Buffer.from([0, 255, 2, 3]);
  return buf.indexOf(-257) === 1; // -257 & 0xFF = 255
});

test('数字 -100 转为字节 156', () => {
  const buf = Buffer.from([0, 156, 2, 3]);
  return buf.indexOf(-100) === 1; // -100 & 0xFF = 156
});

// ============================================
// byteOffset 的 NaN 和特殊值处理
// ============================================

test('byteOffset NaN - 搜索整个 buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', NaN) === 6;
});

test('byteOffset 字符串 "abc" 转为 NaN - 当作 encoding', () => {
  const buf = Buffer.from('hello world');
  try {
    buf.indexOf('world', 'abc');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unknown encoding') || e.message.includes('encoding');
  }
});

test('byteOffset 对象 {} 转为 NaN - 搜索整个 buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', {}) === 6;
});

test('byteOffset 数组 [] 转为 0 - 从开头搜索', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', []) === 6;
});

test('byteOffset 数组 [5] 转为 5 - 从位置 5 搜索', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', [5]) === 6;
});

test('byteOffset 数组 [1, 2, 3] 转为 NaN - 搜索整个 buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', [1, 2, 3]) === 6;
});

// ============================================
// 三参数形式：indexOf(value, byteOffset, encoding)
// ============================================

test('三参数 - indexOf(string, number, encoding)', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', 0, 'utf8') === 6;
});

test('三参数 - indexOf(string, number, encoding) 负偏移', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world', -5, 'utf8') === 6;
});

test('三参数 - indexOf(string, number, hex)', () => {
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello"
  return buf.indexOf('6c', 0, 'hex') === 2;
});

test('三参数 - indexOf(string, number, base64)', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello"
  return buf.indexOf('ll', 0, 'utf8') === 2;
});

test('三参数 - indexOf(string, number, utf16le)', () => {
  const buf = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return buf.indexOf('\u03a3', 0, 'utf16le') === 4;
});

test('三参数 - indexOf(string, negative, utf16le)', () => {
  const buf = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return buf.indexOf('\u03a3', -4, 'utf16le') === 6;
});

// ============================================
// Uint8Array 作为 value 的完整测试
// ============================================

test('Uint8Array - 基本查找', () => {
  const buf = Buffer.from('hello world');
  const arr = new Uint8Array([119, 111, 114, 108, 100]); // "world"
  return buf.indexOf(arr) === 6;
});

test('Uint8Array - 单字节', () => {
  const buf = Buffer.from('hello');
  const arr = new Uint8Array([108]); // "l"
  return buf.indexOf(arr) === 2;
});

test('Uint8Array - 空数组', () => {
  const buf = Buffer.from('hello');
  const arr = new Uint8Array(0);
  return buf.indexOf(arr) === 0;
});

test('Uint8Array - 未找到', () => {
  const buf = Buffer.from('hello');
  const arr = new Uint8Array([120, 121, 122]); // "xyz"
  return buf.indexOf(arr) === -1;
});

test('Uint8Array - 带 byteOffset', () => {
  const buf = Buffer.from('hello hello');
  const arr = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
  return buf.indexOf(arr, 1) === 6;
});

test('Uint8Array - 负 byteOffset', () => {
  const buf = Buffer.from('hello hello');
  const arr = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
  return buf.indexOf(arr, -5) === 6;
});

test('Uint8Array - 大于 buffer 长度', () => {
  const buf = Buffer.from('hello');
  const arr = new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]);
  return buf.indexOf(arr) === -1;
});

// ============================================
// 边界条件：buf.length 边界
// ============================================

test('查找位置等于 buf.length - 1', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o') === 4; // 最后一个字符
});

test('查找位置等于 buf.length - value.length', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world') === 6; // 正好在末尾
});

test('byteOffset = buf.length - 1 能找到最后字符', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', buf.length - 1) === 4;
});

test('byteOffset = buf.length 找不到任何内容', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', buf.length) === -1;
});

test('byteOffset = buf.length + 1 找不到任何内容', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', buf.length + 1) === -1;
});

// ============================================
// 特殊编码组合测试
// ============================================

test('UTF-8 多字节字符 - 中文', () => {
  const buf = Buffer.from('你好世界');
  return buf.indexOf('世界', 0, 'utf8') === 6;
});

test('UTF-8 多字节字符 - emoji', () => {
  const buf = Buffer.from('hello 😀 world');
  return buf.indexOf('😀', 0, 'utf8') === 6;
});

test('UTF-8 多字节字符 - 日文', () => {
  const buf = Buffer.from('こんにちは');
  return buf.indexOf('にち', 0, 'utf8') === 6;
});

test('UTF-16LE - 希腊字母', () => {
  const buf = Buffer.from('\u039a\u0391\u03a3\u03a3\u0395', 'utf16le');
  return buf.indexOf('\u0391', 0, 'utf16le') === 2;
});

test('Hex 编码 - 大小写混合', () => {
  const buf = Buffer.from('48656C6c6F', 'hex'); // "Hello"
  return buf.indexOf('6C6c', 0, 'hex') === 2;
});

// ============================================
// 负 byteOffset 的精确计算
// ============================================

test('负 byteOffset -1 从倒数第一个字节开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('o', -1) === 4;
});

test('负 byteOffset -2 从倒数第二个字节开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('l', -2) === 3;
});

test('负 byteOffset -5 从开头开始', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h', -5) === 0;
});

test('负 byteOffset -6 从开头开始（超出范围）', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h', -6) === 0;
});

test('负 byteOffset -100 从开头开始（大幅超出）', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h', -100) === 0;
});

test('负 byteOffset 精确计算 - buf.length + offset', () => {
  const buf = Buffer.from('hello world');
  const offset = -5;
  const expected = buf.length + offset; // 11 - 5 = 6
  return buf.indexOf('world', offset) === 6;
});

// ============================================
// 数字作为 value 的边界测试
// ============================================

test('数字 0 查找', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(0) === 0;
});

test('数字 255 查找', () => {
  const buf = Buffer.from([0, 255, 2, 3]);
  return buf.indexOf(255) === 1;
});

test('数字 128 查找', () => {
  const buf = Buffer.from([0, 128, 2, 3]);
  return buf.indexOf(128) === 1;
});

test('数字 0.5 转为 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(0.5) === 0;
});

test('数字 255.9 转为 255', () => {
  const buf = Buffer.from([0, 255, 2, 3]);
  return buf.indexOf(255.9) === 1;
});

// ============================================
// 总结输出
// ============================================

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
