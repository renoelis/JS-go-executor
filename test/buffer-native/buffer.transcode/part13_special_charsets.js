// buffer.transcode() - Part 13: Special Character Sets and Encoding Boundaries
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

// 各语言特定字符
test('日文平假名', () => {
  const source = Buffer.from('あいうえお', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'あいうえお';
});

test('日文片假名', () => {
  const source = Buffer.from('アイウエオ', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'アイウエオ';
});

test('韩文字符', () => {
  const source = Buffer.from('한글', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '한글';
});

test('泰文字符', () => {
  const source = Buffer.from('ภาษาไทย', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'ภาษาไทย';
});

test('阿拉伯文字符', () => {
  const source = Buffer.from('العربية', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'العربية';
});

test('希伯来文字符', () => {
  const source = Buffer.from('עברית', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'עברית';
});

test('希腊字母', () => {
  const source = Buffer.from('Ελληνικά', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'Ελληνικά';
});

test('西里尔字母', () => {
  const source = Buffer.from('Русский', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'Русский';
});

// 特殊符号和表情
test('数学符号 ∑∏∫', () => {
  const source = Buffer.from('∑∏∫', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '∑∏∫';
});

test('箭头符号 ←→↑↓', () => {
  const source = Buffer.from('←→↑↓', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '←→↑↓';
});

test('几何形状 ■□●○', () => {
  const source = Buffer.from('■□●○', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '■□●○';
});

test('音乐符号 ♪♫♬', () => {
  const source = Buffer.from('♪♫♬', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '♪♫♬';
});

test('扑克牌符号 ♠♥♦♣', () => {
  const source = Buffer.from('♠♥♦♣', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '♠♥♦♣';
});

test('棋类符号 ♔♕♖♗♘♙', () => {
  const source = Buffer.from('♔♕♖♗♘♙', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '♔♕♖♗♘♙';
});

// 多种 Emoji
test('Emoji - 笑脸系列', () => {
  const source = Buffer.from('😀😁😂😃', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '😀😁😂😃';
});

test('Emoji - 动物', () => {
  const source = Buffer.from('🐶🐱🐭🐹', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '🐶🐱🐭🐹';
});

test('Emoji - 食物', () => {
  const source = Buffer.from('🍎🍌🍇🍓', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '🍎🍌🍇🍓';
});

test('Emoji - 国旗', () => {
  const source = Buffer.from('🇺🇸🇬🇧🇨🇳🇯🇵', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === '🇺🇸🇬🇧🇨🇳🇯🇵';
});

// 组合字符详细测试
test('变音符 - è (e + grave)', () => {
  const source = Buffer.from('è', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'è';
});

test('变音符 - ñ (n + tilde)', () => {
  const source = Buffer.from('ñ', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'ñ';
});

test('变音符 - ü (u + diaeresis)', () => {
  const source = Buffer.from('ü', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'ü';
});

// 不可见字符
test('零宽度空格 ZWSP', () => {
  const source = Buffer.from('\u200B', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('零宽度非连接符 ZWNJ', () => {
  const source = Buffer.from('\u200C', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('零宽度连接符 ZWJ', () => {
  const source = Buffer.from('\u200D', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('左至右标记 LRM', () => {
  const source = Buffer.from('\u200E', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('右至左标记 RLM', () => {
  const source = Buffer.from('\u200F', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

// 特殊空白字符
test('不换行空格 NBSP (U+00A0)', () => {
  const source = Buffer.from('\u00A0', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('窄不换行空格 (U+202F)', () => {
  const source = Buffer.from('\u202F', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('全角空格 (U+3000)', () => {
  const source = Buffer.from('\u3000', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

// 控制字符扩展
test('响铃 BEL (U+0007)', () => {
  const source = Buffer.from('\u0007', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('退格 BS (U+0008)', () => {
  const source = Buffer.from('\u0008', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('垂直制表符 VT (U+000B)', () => {
  const source = Buffer.from('\u000B', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('换页 FF (U+000C)', () => {
  const source = Buffer.from('\u000C', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('转义 ESC (U+001B)', () => {
  const source = Buffer.from('\u001B', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

// 混合多种字符集
test('英文 + 中文 + Emoji', () => {
  const source = Buffer.from('Hello世界😀', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'Hello世界😀';
});

test('多语言混合', () => {
  const source = Buffer.from('Hello世界مرحبا🌍', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'Hello世界مرحبا🌍';
});

test('符号 + 文字混合', () => {
  const source = Buffer.from('Test®©™', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  const back = transcode(result, 'utf16le', 'utf8');
  return back.toString('utf8') === 'Test®©™';
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
