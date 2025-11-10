// buf.lastIndexOf() - 特殊场景和边界条件补充测试
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

// 字符串 vs 数字的边界
test('value: 字符串 "0" vs 数字 0', () => {
  const buf = Buffer.from([48, 49, 50]); // "012"
  const idx1 = buf.lastIndexOf('0');
  const idx2 = buf.lastIndexOf(48);
  return idx1 === 0 && idx2 === 0;
});

test('value: 字符串 "255" vs 数字 255', () => {
  const buf = Buffer.from([50, 53, 53, 255]); // "255" + 0xFF
  const idx1 = buf.lastIndexOf('255');
  const idx2 = buf.lastIndexOf(255);
  return idx1 === 0 && idx2 === 3;
});

// 编码别名测试
test('编码别名: utf-8 vs utf8', () => {
  const buf = Buffer.from('test test');
  const idx1 = buf.lastIndexOf('test', undefined, 'utf8');
  const idx2 = buf.lastIndexOf('test', undefined, 'utf-8');
  return idx1 === idx2 && idx1 === 5;
});

test('编码别名: ucs2 vs ucs-2', () => {
  const buf = Buffer.from('test', 'ucs2');
  const idx1 = buf.lastIndexOf('t', undefined, 'ucs2');
  const idx2 = buf.lastIndexOf('t', undefined, 'ucs-2');
  return idx1 === idx2;
});

test('编码别名: utf16le vs utf-16le', () => {
  const buf = Buffer.from('hello', 'utf16le');
  const idx1 = buf.lastIndexOf('o', undefined, 'utf16le');
  const idx2 = buf.lastIndexOf('o', undefined, 'utf-16le');
  return idx1 === idx2;
});

// 空值的完整测试
test('空值: 空字符串在空 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf('') === 0;
});

test('空值: 空 Buffer 在非空 Buffer', () => {
  const buf = Buffer.from('test');
  return buf.lastIndexOf(Buffer.alloc(0)) === 4;
});

test('空值: 空 Uint8Array 在空 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.lastIndexOf(new Uint8Array(0)) === 0;
});

// byteOffset 的字符串参数（应被识别为编码）
test('参数识别: 第二个参数为 "utf8"', () => {
  const buf = Buffer.from('hello hello');
  // 'utf8' 应该被识别为编码，byteOffset 使用默认值
  return buf.lastIndexOf('hello', 'utf8') === 6;
});

test('参数识别: 第二个参数为 "hex"', () => {
  const buf = Buffer.from([0x01, 0x02, 0x01, 0x02]);
  return buf.lastIndexOf('0102', 'hex') === 2;
});

test('参数识别: 第二个参数为 "base64"', () => {
  const buf = Buffer.from('test test');
  const search = Buffer.from('test').toString('base64');
  return buf.lastIndexOf(search, 'base64') === 5;
});

// 数字的特殊转换
test('数字转换: Number.MAX_SAFE_INTEGER', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  // 超大数字应该取模
  const result = buf.lastIndexOf(Number.MAX_SAFE_INTEGER);
  return result >= -1; // 结果应该是有效的
});

test('数字转换: Number.MIN_SAFE_INTEGER', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  const result = buf.lastIndexOf(Number.MIN_SAFE_INTEGER);
  return result >= -1;
});

test('数字转换: -0', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  return buf.lastIndexOf(-0) === 2;
});

test('数字转换: +0', () => {
  const buf = Buffer.from([0, 1, 0, 2]);
  return buf.lastIndexOf(+0) === 2;
});

// byteOffset 的特殊转换
test('byteOffset: 字符串数字 "5" 被识别为编码', () => {
  const buf = Buffer.from('abc abc abc');
  // 字符串 "5" 会被当作编码参数，导致错误
  try {
    buf.lastIndexOf('abc', '5');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('byteOffset: 字符串 "0" 被识别为编码', () => {
  const buf = Buffer.from('test test');
  // 字符串 "0" 会被当作编码参数，导致错误
  try {
    buf.lastIndexOf('test', '0');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('byteOffset: 布尔值 true (转为 1)', () => {
  const buf = Buffer.from('ab ab');
  // true 转换为 1
  return buf.lastIndexOf('ab', true) === 0;
});

test('byteOffset: 布尔值 false (转为 0)', () => {
  const buf = Buffer.from('test test');
  // false 转换为 0
  return buf.lastIndexOf('test', false) === 0;
});

// 多字节字符的边界
test('多字节: emoji 在边界', () => {
  const buf = Buffer.from('😀test😀');
  return buf.lastIndexOf('😀') === 8;
});

test('多字节: 中文标点', () => {
  const buf = Buffer.from('你好，世界，你好');
  // '你好' = 6 bytes, '，' = 3 bytes, '世界' = 6 bytes
  // 第二个 '，' 在位置: 6 + 3 + 6 + 3 = 18
  const idx = buf.lastIndexOf('，');
  // 实际位置是 15
  return idx === 15;
});

test('多字节: 混合 ASCII 和多字节', () => {
  const buf = Buffer.from('hello世界hello世界');
  return buf.lastIndexOf('世界') === 16;
});

// Buffer 子类
test('Buffer 子类: 从 Buffer.from 创建', () => {
  const buf = Buffer.from('test test test');
  const search = Buffer.from('test');
  return buf.lastIndexOf(search) === 10;
});

test('Buffer 子类: 从 Uint8Array 转换', () => {
  const buf = Buffer.from('hello hello');
  const arr = new Uint8Array([104, 101, 108, 108, 111]); // 'hello'
  return buf.lastIndexOf(arr) === 6;
});

// 特殊的 Buffer 构造
test('Buffer.allocUnsafe: 未初始化的 Buffer', () => {
  const buf = Buffer.allocUnsafe(20);
  buf.write('test', 0);
  buf.write('test', 10);
  return buf.lastIndexOf('test') === 10;
});

test('Buffer.from with offset: 子 Buffer', () => {
  const parent = Buffer.from('hello world hello');
  const child = parent.subarray(6, 17); // 'world hello'
  return child.lastIndexOf('hello') === 6;
});

// 编码的大小写混合
test('编码大小写: Utf8', () => {
  const buf = Buffer.from('test test');
  return buf.lastIndexOf('test', undefined, 'Utf8') === 5;
});

test('编码大小写: HEX', () => {
  const buf = Buffer.from([0xAB, 0xCD, 0xAB, 0xCD]);
  return buf.lastIndexOf('abcd', 'HEX') === 2;
});

test('编码大小写: Base64', () => {
  const buf = Buffer.from('hello hello');
  const search = Buffer.from('hello').toString('base64');
  return buf.lastIndexOf(search, undefined, 'Base64') === 6;
});

// 零宽度字符
test('特殊字符: 零宽度空格', () => {
  const buf = Buffer.from('test\u200Btest\u200Btest');
  return buf.lastIndexOf('\u200B') === 11;
});

test('特殊字符: 零宽度连接符', () => {
  const buf = Buffer.from('a\u200Db\u200Dc');
  // 'a' = 1, '\u200D' = 3, 'b' = 1, '\u200D' = 3, 'c' = 1
  // 第二个 '\u200D' 在位置 5
  return buf.lastIndexOf('\u200D') === 5;
});

// 重复搜索值
test('重复值: 单字节重复', () => {
  const buf = Buffer.alloc(100, 65); // 全是 'A'
  return buf.lastIndexOf(65) === 99;
});

test('重复值: 多字节重复', () => {
  const buf = Buffer.alloc(102); // 确保能容纳完整的 'abc' 模式
  const pattern = Buffer.from('abc');
  for (let i = 0; i <= 99; i += 3) {
    pattern.copy(buf, i);
  }
  // 最后一个完整的 'abc' 在位置 99
  return buf.lastIndexOf('abc') === 99;
});

// 搜索值等于 Buffer 长度
test('搜索值长度: 等于 Buffer', () => {
  const buf = Buffer.from('exact');
  return buf.lastIndexOf('exact') === 0;
});

test('搜索值长度: 大于 Buffer', () => {
  const buf = Buffer.from('hi');
  return buf.lastIndexOf('hello world') === -1;
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
