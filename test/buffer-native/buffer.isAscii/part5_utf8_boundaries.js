// buffer.isAscii() - Part 5: UTF-8 Boundaries and Encoding Tests
const { Buffer, isAscii } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// UTF-8 多字节序列测试
test('UTF-8 两字节序列 - 中文单字', () => {
  const buf = Buffer.from('中', 'utf8'); // 0xE4 0xB8 0xAD
  return isAscii(buf) === false;
});

test('UTF-8 三字节序列 - 完整字符', () => {
  const buf = Buffer.from('好', 'utf8');
  return isAscii(buf) === false;
});

test('UTF-8 四字节序列 - Emoji', () => {
  const buf = Buffer.from('😀', 'utf8'); // 0xF0 0x9F 0x98 0x80
  return isAscii(buf) === false;
});

test('UTF-8 混合 - ASCII + 两字节', () => {
  const buf = Buffer.from('a中', 'utf8');
  return isAscii(buf) === false;
});

test('UTF-8 混合 - ASCII + Emoji', () => {
  const buf = Buffer.from('test😀', 'utf8');
  return isAscii(buf) === false;
});

// 截断的 UTF-8 序列（无效但仍然是字节）
test('截断的 UTF-8 - 两字节序列首字节', () => {
  const buf = Buffer.from([0xC2]); // 两字节序列的首字节，缺少第二字节
  return isAscii(buf) === false; // 0xC2 > 127
});

test('截断的 UTF-8 - 三字节序列前两字节', () => {
  const buf = Buffer.from([0xE4, 0xB8]); // 缺少第三字节
  return isAscii(buf) === false;
});

test('截断的 UTF-8 - 四字节序列前三字节', () => {
  const buf = Buffer.from([0xF0, 0x9F, 0x98]); // 缺少第四字节
  return isAscii(buf) === false;
});

// UTF-8 continuation 字节
test('单独的 UTF-8 continuation 字节 - 0x80', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

test('单独的 UTF-8 continuation 字节 - 0xBF', () => {
  const buf = Buffer.from([0xBF]);
  return isAscii(buf) === false;
});

test('多个 continuation 字节', () => {
  const buf = Buffer.from([0x80, 0x81, 0x82]);
  return isAscii(buf) === false;
});

// ASCII 和非 ASCII 边界
test('ASCII 后紧跟非 ASCII', () => {
  const buf = Buffer.from([0x7F, 0x80]);
  return isAscii(buf) === false;
});

test('非 ASCII 后紧跟 ASCII', () => {
  const buf = Buffer.from([0x80, 0x7F]);
  return isAscii(buf) === false;
});

test('ASCII-非ASCII-ASCII 模式', () => {
  const buf = Buffer.from([0x41, 0x80, 0x42]);
  return isAscii(buf) === false;
});

// 特殊 Unicode 范围
test('Latin-1 补充字符 - À', () => {
  const buf = Buffer.from('À', 'utf8'); // 0xC3 0x80
  return isAscii(buf) === false;
});

test('Latin-1 补充字符 - ÿ', () => {
  const buf = Buffer.from('ÿ', 'utf8'); // 0xC3 0xBF
  return isAscii(buf) === false;
});

test('希腊字母 - α', () => {
  const buf = Buffer.from('α', 'utf8');
  return isAscii(buf) === false;
});

test('西里尔字母 - Я', () => {
  const buf = Buffer.from('Я', 'utf8');
  return isAscii(buf) === false;
});

test('阿拉伯数字 - ١', () => {
  const buf = Buffer.from('١', 'utf8');
  return isAscii(buf) === false;
});

// 零宽字符
test('零宽空格 - U+200B', () => {
  const buf = Buffer.from('\u200B', 'utf8');
  return isAscii(buf) === false;
});

test('零宽非连字 - U+200C', () => {
  const buf = Buffer.from('\u200C', 'utf8');
  return isAscii(buf) === false;
});

// BOM (Byte Order Mark)
test('UTF-8 BOM - U+FEFF', () => {
  const buf = Buffer.from('\uFEFF', 'utf8');
  return isAscii(buf) === false;
});

test('UTF-8 BOM + ASCII', () => {
  const buf = Buffer.from('\uFEFFhello', 'utf8');
  return isAscii(buf) === false;
});

// 特殊控制字符（扩展 ASCII）
test('DEL 字符 - 0x7F', () => {
  const buf = Buffer.from([0x7F]);
  return isAscii(buf) === true; // 0x7F 是 ASCII
});

test('C1 控制字符 - 0x80', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

test('C1 控制字符 - 0x9F', () => {
  const buf = Buffer.from([0x9F]);
  return isAscii(buf) === false;
});

// 换行符和特殊空白
test('LF - 0x0A', () => {
  const buf = Buffer.from([0x0A]);
  return isAscii(buf) === true;
});

test('CR - 0x0D', () => {
  const buf = Buffer.from([0x0D]);
  return isAscii(buf) === true;
});

test('CRLF - 0x0D 0x0A', () => {
  const buf = Buffer.from([0x0D, 0x0A]);
  return isAscii(buf) === true;
});

test('Tab - 0x09', () => {
  const buf = Buffer.from([0x09]);
  return isAscii(buf) === true;
});

test('垂直制表符 - 0x0B', () => {
  const buf = Buffer.from([0x0B]);
  return isAscii(buf) === true;
});

test('换页符 - 0x0C', () => {
  const buf = Buffer.from([0x0C]);
  return isAscii(buf) === true;
});

// 所有 ASCII 控制字符
test('所有 ASCII 控制字符 (0x00-0x1F)', () => {
  const chars = [];
  for (let i = 0; i <= 0x1F; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  return isAscii(buf) === true;
});

test('所有扩展 ASCII (0x80-0xFF)', () => {
  const chars = [];
  for (let i = 0x80; i <= 0xFF; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  return isAscii(buf) === false;
});

// 混合边界场景
test('ASCII 字符串 + 单个高位字节在末尾', () => {
  const buf = Buffer.from('hello world test');
  const extended = Buffer.concat([buf, Buffer.from([0x80])]);
  return isAscii(extended) === false;
});

test('单个高位字节 + ASCII 字符串', () => {
  const extended = Buffer.concat([Buffer.from([0x80]), Buffer.from('hello')]);
  return isAscii(extended) === false;
});

test('长 ASCII 字符串中间插入非 ASCII', () => {
  const part1 = Buffer.from('a'.repeat(1000));
  const middle = Buffer.from([0x80]);
  const part2 = Buffer.from('b'.repeat(1000));
  const combined = Buffer.concat([part1, middle, part2]);
  return isAscii(combined) === false;
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
