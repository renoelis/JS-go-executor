// buf.length - Part 19: Unicode and Special Characters Tests
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

// Unicode 字符测试
test('emoji 单个字符的字节长度', () => {
  const buf = Buffer.from('😀');
  return buf.length === 4; // emoji 在 UTF-8 中占 4 字节
});

test('emoji 多个字符的字节长度', () => {
  const buf = Buffer.from('😀😁😂');
  return buf.length === 12; // 3 个 emoji，每个 4 字节
});

test('emoji 与 ASCII 混合', () => {
  const buf = Buffer.from('hello😀world');
  return buf.length === 14; // 5 + 4 + 5 = 14
});

test('零宽字符的字节长度', () => {
  const buf = Buffer.from('\u200B'); // 零宽空格
  return buf.length === 3; // UTF-8 编码
});

test('组合字符的字节长度', () => {
  const buf = Buffer.from('é'); // e + 组合重音符
  return buf.length >= 2;
});

test('代理对字符的字节长度', () => {
  const buf = Buffer.from('𝕳'); // 数学字母 H
  return buf.length === 4;
});

test('RTL 字符的字节长度', () => {
  const buf = Buffer.from('مرحبا'); // 阿拉伯语 "你好"
  return buf.length > 0;
});

test('CJK 统一表意文字', () => {
  const buf = Buffer.from('漢字'); // 汉字
  return buf.length === 6; // 每个汉字 3 字节
});

test('日文平假名', () => {
  const buf = Buffer.from('ひらがな');
  return buf.length === 12; // 每个假名 3 字节
});

test('日文片假名', () => {
  const buf = Buffer.from('カタカナ');
  return buf.length === 12;
});

test('韩文字符', () => {
  const buf = Buffer.from('한글');
  return buf.length === 6; // 每个韩文字符 3 字节
});

test('泰文字符', () => {
  const buf = Buffer.from('สวัสดี');
  return buf.length > 0;
});

test('希伯来文字符', () => {
  const buf = Buffer.from('שלום');
  return buf.length > 0;
});

// 特殊控制字符
test('换行符的字节长度', () => {
  const buf = Buffer.from('\n');
  return buf.length === 1;
});

test('回车符的字节长度', () => {
  const buf = Buffer.from('\r');
  return buf.length === 1;
});

test('制表符的字节长度', () => {
  const buf = Buffer.from('\t');
  return buf.length === 1;
});

test('空字符的字节长度', () => {
  const buf = Buffer.from('\0');
  return buf.length === 1;
});

test('退格符的字节长度', () => {
  const buf = Buffer.from('\b');
  return buf.length === 1;
});

test('垂直制表符的字节长度', () => {
  const buf = Buffer.from('\v');
  return buf.length === 1;
});

test('换页符的字节长度', () => {
  const buf = Buffer.from('\f');
  return buf.length === 1;
});

// BOM (Byte Order Mark) 测试
test('UTF-8 BOM 的字节长度', () => {
  const buf = Buffer.from('\uFEFF');
  return buf.length === 3;
});

test('带 BOM 的字符串', () => {
  const buf = Buffer.from('\uFEFFhello');
  return buf.length === 8; // 3 (BOM) + 5 (hello)
});

// 不同编码下的 length
test('latin1 编码的 length', () => {
  const buf = Buffer.from('café', 'latin1');
  return buf.length === 4;
});

test('ascii 编码的 length', () => {
  const buf = Buffer.from('hello', 'ascii');
  return buf.length === 5;
});

test('ucs2 编码的 length', () => {
  const buf = Buffer.from('hello', 'ucs2');
  return buf.length === 10; // 每个字符 2 字节
});

test('utf16le 编码的 length', () => {
  const buf = Buffer.from('hello', 'utf16le');
  return buf.length === 10; // 每个字符 2 字节
});

test('hex 编码的 length', () => {
  const buf = Buffer.from('48656c6c6f', 'hex');
  return buf.length === 5; // 10 个 hex 字符 = 5 字节
});

test('base64 编码的 length', () => {
  const buf = Buffer.from('SGVsbG8=', 'base64');
  return buf.length === 5;
});

test('base64url 编码的 length', () => {
  const buf = Buffer.from('SGVsbG8', 'base64url');
  return buf.length === 5;
});

// 特殊字符串组合
test('多行字符串的 length', () => {
  const buf = Buffer.from('line1\nline2\nline3');
  return buf.length === 17;
});

test('包含引号的字符串', () => {
  const buf = Buffer.from('He said "hello"');
  return buf.length === 15;
});

test('包含反斜杠的字符串', () => {
  const buf = Buffer.from('C:\\path\\to\\file');
  return buf.length === 15;
});

test('URL 编码字符串', () => {
  const buf = Buffer.from('hello%20world');
  return buf.length === 13;
});

test('HTML 实体字符串', () => {
  const buf = Buffer.from('&lt;div&gt;');
  return buf.length === 11;
});

// 极端 Unicode 范围
test('基本多文种平面 (BMP) 字符', () => {
  const buf = Buffer.from('\u0000\u007F\u0080\u07FF');
  return buf.length > 0;
});

test('补充平面字符', () => {
  const buf = Buffer.from('\uD800\uDC00'); // U+10000
  return buf.length === 4;
});

test('私有使用区字符', () => {
  const buf = Buffer.from('\uE000');
  return buf.length === 3;
});

// 特殊空白字符
test('不间断空格', () => {
  const buf = Buffer.from('\u00A0');
  return buf.length === 2;
});

test('窄不间断空格', () => {
  const buf = Buffer.from('\u202F');
  return buf.length === 3;
});

test('全角空格', () => {
  const buf = Buffer.from('\u3000');
  return buf.length === 3;
});

// 字符串长度与字节长度的差异
test('字符串长度 vs 字节长度 - ASCII', () => {
  const str = 'hello';
  const buf = Buffer.from(str);
  return str.length === buf.length;
});

test('字符串长度 vs 字节长度 - 中文', () => {
  const str = '你好';
  const buf = Buffer.from(str);
  return str.length === 2 && buf.length === 6;
});

test('字符串长度 vs 字节长度 - emoji', () => {
  const str = '😀';
  const buf = Buffer.from(str);
  return str.length === 2 && buf.length === 4; // emoji 在 JS 中是代理对
});

test('字符串长度 vs 字节长度 - 混合', () => {
  const str = 'a你😀';
  const buf = Buffer.from(str);
  return str.length === 4 && buf.length === 8; // 1 + 3 + 4
});

// 空字符串和空白字符串
test('空字符串的 length', () => {
  const buf = Buffer.from('');
  return buf.length === 0;
});

test('单个空格的 length', () => {
  const buf = Buffer.from(' ');
  return buf.length === 1;
});

test('多个空格的 length', () => {
  const buf = Buffer.from('     ');
  return buf.length === 5;
});

test('只有换行符的 length', () => {
  const buf = Buffer.from('\n\n\n');
  return buf.length === 3;
});

// 特殊数值字符串
test('数字字符串的 length', () => {
  const buf = Buffer.from('12345');
  return buf.length === 5;
});

test('浮点数字符串的 length', () => {
  const buf = Buffer.from('3.14159');
  return buf.length === 7;
});

test('科学计数法字符串的 length', () => {
  const buf = Buffer.from('1.23e-4');
  return buf.length === 7;
});

test('负数字符串的 length', () => {
  const buf = Buffer.from('-123');
  return buf.length === 4;
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
