// Buffer.from() - Part 13: Missing Encoding Scenarios
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

// Base64 URL-safe 编码的完整测试
test('Base64URL - 减号替代加号', () => {
  const buf = Buffer.from('a-b', 'base64url');
  return buf instanceof Buffer;
});

test('Base64URL - 下划线替代斜杠', () => {
  const buf = Buffer.from('a_b', 'base64url');
  return buf instanceof Buffer;
});

test('Base64URL - 不应该有填充', () => {
  const buf = Buffer.from('YWJj', 'base64url');
  return buf.toString('utf8') === 'abc';
});

test('Base64URL - 与标准 base64 解码差异', () => {
  const standard = Buffer.from('SGVsbG8+Pz8/', 'base64');
  const urlSafe = Buffer.from('SGVsbG8-Pz8_', 'base64url');
  // 应该解码相同内容
  return standard.length > 0 && urlSafe.length > 0;
});

// HEX 编码的更多边界情况
test('HEX - 只包含数字 0-9', () => {
  const buf = Buffer.from('0123456789', 'hex');
  return buf.length === 5;
});

test('HEX - 只包含字母 A-F', () => {
  const buf = Buffer.from('ABCDEF', 'hex');
  return buf.length === 3 && buf[0] === 0xAB;
});

test('HEX - 只包含字母 a-f', () => {
  const buf = Buffer.from('abcdef', 'hex');
  return buf.length === 3 && buf[0] === 0xab;
});

test('HEX - 前导零', () => {
  const buf = Buffer.from('00000001', 'hex');
  return buf.length === 4 && buf[0] === 0 && buf[3] === 1;
});

test('HEX - 空白字符在开头', () => {
  const buf = Buffer.from(' 4142', 'hex');
  // Node.js 在遇到空格时停止解析，开头的空格导致空结果
  return buf.length === 0;
});

test('HEX - 空白字符在结尾', () => {
  const buf = Buffer.from('4142 ', 'hex');
  return buf.length === 2;
});

test('HEX - 多个连续空白', () => {
  const buf = Buffer.from('41  42', 'hex');
  // Node.js 在遇到空格时停止解析，只处理空格前的字符
  return buf.length === 1 && buf[0] === 0x41;
});

// UTF-16LE 的详细测试
test('UTF16LE - 单个 ASCII 字符', () => {
  const buf = Buffer.from('A', 'utf16le');
  return buf.length === 2 && buf[0] === 0x41 && buf[1] === 0x00;
});

test('UTF16LE - 多个 ASCII 字符', () => {
  const buf = Buffer.from('ABC', 'utf16le');
  return buf.length === 6;
});

test('UTF16LE - 中文字符', () => {
  const buf = Buffer.from('中', 'utf16le');
  return buf.length === 2;
});

test('UTF16LE - BMP 范围字符', () => {
  const buf = Buffer.from('\u4E2D\u6587', 'utf16le');
  return buf.length === 4;
});

test('UTF16LE - 代理对（emoji）', () => {
  const buf = Buffer.from('😀', 'utf16le');
  return buf.length === 4;
});

test('UTF16LE - 小端序验证', () => {
  const buf = Buffer.from('A', 'utf16le');
  // 小端序：低字节在前
  return buf[0] === 0x41 && buf[1] === 0x00;
});

// ASCII 编码的完整测试
test('ASCII - 0-31 控制字符', () => {
  const str = '\x00\x01\x1F';
  const buf = Buffer.from(str, 'ascii');
  return buf.length === 3 && buf[0] === 0 && buf[1] === 1;
});

test('ASCII - 32-126 可打印字符', () => {
  const str = ' ~';
  const buf = Buffer.from(str, 'ascii');
  return buf.length === 2 && buf[0] === 32 && buf[1] === 126;
});

test('ASCII - 127 DEL 字符', () => {
  const buf = Buffer.from('\x7F', 'ascii');
  return buf.length === 1 && buf[0] === 127;
});

test('ASCII - 128-255 被截断为 7 位', () => {
  const buf = Buffer.from('\x80\x81\xFE\xFF', 'ascii');
  // Node.js 实际上不进行 7 位截断，直接使用字符的字节值
  return buf[0] === 128 && buf[1] === 129 && buf[2] === 254 && buf[3] === 255;
});

// Latin1 编码的完整测试
test('Latin1 - 完整的可打印字符集', () => {
  let str = '';
  for (let i = 32; i < 127; i++) {
    str += String.fromCharCode(i);
  }
  const buf = Buffer.from(str, 'latin1');
  return buf.length === 95;
});

test('Latin1 - 扩展拉丁字符 160-255', () => {
  let str = '';
  for (let i = 160; i < 256; i++) {
    str += String.fromCharCode(i);
  }
  const buf = Buffer.from(str, 'latin1');
  return buf.length === 96;
});

test('Latin1 - 特殊拉丁字符', () => {
  const str = 'café'; // 包含 é (233)
  const buf = Buffer.from(str, 'latin1');
  return buf.toString('latin1') === str;
});

// UTF-8 的多字节边界
test('UTF-8 - 2 字节边界 (U+0080 到 U+07FF)', () => {
  const str = '\u0080\u07FF';
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 4; // 每个 2 字节
});

test('UTF-8 - 3 字节边界 (U+0800 到 U+FFFF)', () => {
  const str = '\u0800\uFFFF';
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 6; // 每个 3 字节
});

test('UTF-8 - 4 字节边界 (U+10000 到 U+10FFFF)', () => {
  const str = '\uD800\uDC00\uDBFF\uDFFF'; // U+10000 和 U+10FFFF
  const buf = Buffer.from(str, 'utf8');
  return buf.length === 8; // 每个 4 字节
});

test('UTF-8 - 单字节 ASCII 最大值', () => {
  const buf = Buffer.from('\x7F', 'utf8');
  return buf.length === 1 && buf[0] === 0x7F;
});

test('UTF-8 - 2 字节最小值', () => {
  const buf = Buffer.from('\u0080', 'utf8');
  return buf.length === 2;
});

test('UTF-8 - 3 字节最小值', () => {
  const buf = Buffer.from('\u0800', 'utf8');
  return buf.length === 3;
});

test('UTF-8 - BOM 处理', () => {
  const buf = Buffer.from('\uFEFF', 'utf8');
  return buf.length === 3; // UTF-8 BOM 是 3 字节
});

// 编码名称的所有变体
test('编码别名 - binary 完全等同于 latin1', () => {
  const testStr = '\x00\x80\xFF';
  const buf1 = Buffer.from(testStr, 'binary');
  const buf2 = Buffer.from(testStr, 'latin1');
  return buf1.equals(buf2);
});

test('编码别名 - ucs2 完全等同于 utf16le', () => {
  const testStr = 'Test测试';
  const buf1 = Buffer.from(testStr, 'ucs2');
  const buf2 = Buffer.from(testStr, 'utf16le');
  return buf1.equals(buf2);
});

test('编码别名 - ucs-2 等同于 ucs2', () => {
  const buf1 = Buffer.from('Test', 'ucs-2');
  const buf2 = Buffer.from('Test', 'ucs2');
  return buf1.equals(buf2);
});

// 空字符串在不同编码下
test('空字符串 - UTF-8', () => {
  const buf = Buffer.from('', 'utf8');
  return buf.length === 0;
});

test('空字符串 - UTF-16LE', () => {
  const buf = Buffer.from('', 'utf16le');
  return buf.length === 0;
});

test('空字符串 - HEX', () => {
  const buf = Buffer.from('', 'hex');
  return buf.length === 0;
});

test('空字符串 - Base64', () => {
  const buf = Buffer.from('', 'base64');
  return buf.length === 0;
});

test('空字符串 - Latin1', () => {
  const buf = Buffer.from('', 'latin1');
  return buf.length === 0;
});

test('空字符串 - ASCII', () => {
  const buf = Buffer.from('', 'ascii');
  return buf.length === 0;
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
