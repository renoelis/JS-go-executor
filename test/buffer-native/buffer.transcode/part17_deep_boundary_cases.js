// buffer.transcode() - Part 17: Deep Boundary Cases and Unicode Edge Tests
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Unicode 深度边界测试
test('Unicode 私有使用区 U+E000-U+F8FF', () => {
  const source = Buffer.from('\uE000\uE001\uF8FF', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 6;
});

test('Unicode 代理区前一个字符 U+D7FF', () => {
  const source = Buffer.from('\uD7FF', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('Unicode 代理区后一个字符 U+E000', () => {
  const source = Buffer.from('\uE000', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('Unicode BMP 最后一个字符 U+FFFD', () => {
  const source = Buffer.from('\uFFFD', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('Supplementary Plane 第一个字符 U+10000', () => {
  const source = Buffer.from('𐀀', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 4;
});

test('Supplementary Plane 最后一个字符 U+10FFFF', () => {
  // 使用 Buffer.from 直接创建 UTF-8 字节序列
  const source = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]); // U+10FFFF 的 UTF-8 编码
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 4;
});

// 组合字符和修饰符
test('组合字符 - 基础字符 + 组合字符', () => {
  const source = Buffer.from('e\u0301', 'utf8'); // é (e + acute accent)
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 4;
});

test('多个组合字符', () => {
  const source = Buffer.from('e\u0301\u0302', 'utf8'); // e + acute + circumflex
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 6;
});

test('零宽度连字符 ZWJ (U+200D)', () => {
  const source = Buffer.from('\u200D', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('零宽度非连字符 ZWNJ (U+200C)', () => {
  const source = Buffer.from('\u200C', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

// 方向性字符
test('左到右标记 LRM (U+200E)', () => {
  const source = Buffer.from('\u200E', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('右到左标记 RLM (U+200F)', () => {
  const source = Buffer.from('\u200F', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('左到右嵌入 LRE (U+202A)', () => {
  const source = Buffer.from('\u202A', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('右到左嵌入 RLE (U+202B)', () => {
  const source = Buffer.from('\u202B', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

// 数学符号区域
test('数学运算符 U+2200-U+22FF', () => {
  const source = Buffer.from('∀∃∄∅∆∇∈∉', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 16;
});

test('几何形状 U+25A0-U+25FF', () => {
  const source = Buffer.from('■□▲△▼▽◆◇', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 16;
});

// 特殊空格字符
test('Em Space (U+2003)', () => {
  const source = Buffer.from('\u2003', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('En Space (U+2002)', () => {
  const source = Buffer.from('\u2002', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('Hair Space (U+200A)', () => {
  const source = Buffer.from('\u200A', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

test('Zero Width Space (U+200B)', () => {
  const source = Buffer.from('\u200B', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 2;
});

// 控制字符的完整覆盖
test('所有 C0 控制字符 (U+0000-U+001F)', () => {
  const bytes = [];
  for (let i = 0; i <= 0x1F; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 64;
});

test('所有 C1 控制字符 (U+0080-U+009F)', () => {
  const chars = [];
  for (let i = 0x80; i <= 0x9F; i++) {
    chars.push(String.fromCharCode(i));
  }
  const source = Buffer.from(chars.join(''), 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

// 编码边界精确测试
test('UTF-8 1字节边界 (U+007F -> U+0080)', () => {
  const source1 = Buffer.from('\u007F', 'utf8');
  const source2 = Buffer.from('\u0080', 'utf8');
  const result1 = transcode(source1, 'utf8', 'utf16le');
  const result2 = transcode(source2, 'utf8', 'utf16le');
  return result1.length === 2 && result2.length === 2;
});

test('UTF-8 2字节边界 (U+07FF -> U+0800)', () => {
  const source1 = Buffer.from('\u07FF', 'utf8');
  const source2 = Buffer.from('\u0800', 'utf8');
  const result1 = transcode(source1, 'utf8', 'utf16le');
  const result2 = transcode(source2, 'utf8', 'utf16le');
  return result1.length === 2 && result2.length === 2;
});

test('UTF-8 3字节边界 (U+FFFF -> U+10000)', () => {
  const source1 = Buffer.from('\uFFFF', 'utf8');
  const source2 = Buffer.from('\u{10000}', 'utf8');
  const result1 = transcode(source1, 'utf8', 'utf16le');
  const result2 = transcode(source2, 'utf8', 'utf16le');
  return result1.length === 2 && result2.length === 4;
});

// 语言特定字符
test('希伯来文字母', () => {
  const source = Buffer.from('אבגדהוזחטי', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 20;
});

test('阿拉伯文字母', () => {
  const source = Buffer.from('أبتثجحخدذر', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 20;
});

test('泰文字母', () => {
  const source = Buffer.from('กขฃคฅฆงจฉช', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 20;
});

test('梵文字母', () => {
  const source = Buffer.from('अआइईउऊऋऌऍऎ', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 20;
});

// 历史文字系统
test('古希腊文字', () => {
  const source = Buffer.from('ΑΒΓΔΕΖΗΘΙΚ', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 20;
});

test('西里尔字母', () => {
  const source = Buffer.from('АБВГДЕЖЗИЙК', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 22;
});

// 音标符号
test('国际音标符号 IPA', () => {
  const source = Buffer.from('ɑɒɓɔɕɖɗɘə', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  // 9 个 IPA 字符，每个在 UTF-16LE 中占 2 字节 = 18 字节
  return result instanceof Buffer && result.length === 18;
});

// 货币符号
test('各种货币符号', () => {
  const source = Buffer.from('$€£¥₹₽₩₪₫', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

// 标点符号变体
test('各种引号', () => {
  const source = Buffer.from('""\u2018\u2019\u00AB\u00BB\u2039\u203A\u201E\u201C\u201A\u2019', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 24;
});

test('各种破折号', () => {
  const source = Buffer.from('‐‑‒–—―', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 12;
});

// 合成 Emoji 序列
test('皮肤色调修饰 Emoji', () => {
  const source = Buffer.from('👋🏻👋🏼👋🏽👋🏾👋🏿', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('性别修饰 Emoji', () => {
  const source = Buffer.from('👨‍💻👩‍💻', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
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
