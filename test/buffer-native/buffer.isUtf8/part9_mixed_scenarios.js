// buffer.isUtf8() - Part 9: Mixed Scenarios Tests
const { Buffer, isUtf8 } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 混合有效和无效序列
test('混合 - 有效 + 无效 + 有效', () => {
  const buf = Buffer.from([0x41, 0x80, 0x42]); // 'A' + 孤立字节 + 'B'
  return isUtf8(buf) === false;
});

test('混合 - 多个有效字符 + 无效', () => {
  const buf = Buffer.from([0x41, 0x42, 0x43, 0x80]); // "ABC" + 孤立字节
  return isUtf8(buf) === false;
});

test('混合 - 无效 + 多个有效字符', () => {
  const buf = Buffer.from([0x80, 0x41, 0x42, 0x43]); // 孤立字节 + "ABC"
  return isUtf8(buf) === false;
});

test('混合 - 有效 2 字节 + 无效 + 有效 2 字节', () => {
  const buf = Buffer.from([0xC2, 0x80, 0x80, 0xC2, 0x81]); // 有效 + 孤立 + 有效
  return isUtf8(buf) === false;
});

test('混合 - 有效 3 字节 + 无效 + 有效 3 字节', () => {
  const buf = Buffer.from([0xE0, 0xA0, 0x80, 0x80, 0xE0, 0xA0, 0x81]); // 有效 + 孤立 + 有效
  return isUtf8(buf) === false;
});

test('混合 - 有效 4 字节 + 无效 + 有效 4 字节', () => {
  const buf = Buffer.from([0xF0, 0x90, 0x80, 0x80, 0x80, 0xF0, 0x90, 0x80, 0x81]); // 有效 + 孤立 + 有效
  return isUtf8(buf) === false;
});

// 混合不同长度的有效字符
test('混合长度 - 1 + 2 + 3 + 4 字节', () => {
  const buf = Buffer.from([
    0x41,                   // 1 字节 'A'
    0xC2, 0x80,             // 2 字节 U+0080
    0xE0, 0xA0, 0x80,       // 3 字节 U+0800
    0xF0, 0x90, 0x80, 0x80  // 4 字节 U+10000
  ]);
  return isUtf8(buf) === true;
});

test('混合长度 - 4 + 3 + 2 + 1 字节', () => {
  const buf = Buffer.from([
    0xF0, 0x90, 0x80, 0x80,  // 4 字节 U+10000
    0xE0, 0xA0, 0x80,        // 3 字节 U+0800
    0xC2, 0x80,              // 2 字节 U+0080
    0x41                     // 1 字节 'A'
  ]);
  return isUtf8(buf) === true;
});

test('混合长度 - 连续多个 1 字节', () => {
  const buf = Buffer.from('ABCDEFGHIJ', 'utf8');
  return isUtf8(buf) === true;
});

test('混合长度 - 连续多个 2 字节', () => {
  const buf = Buffer.from([
    0xC2, 0x80,
    0xC2, 0x81,
    0xC2, 0x82,
    0xC2, 0x83
  ]);
  return isUtf8(buf) === true;
});

test('混合长度 - 连续多个 3 字节', () => {
  const buf = Buffer.from('你好世界', 'utf8');
  return isUtf8(buf) === true;
});

test('混合长度 - 连续多个 4 字节', () => {
  const buf = Buffer.from('😀😁😂😃', 'utf8');
  return isUtf8(buf) === true;
});

// 复杂文本场景
test('复杂文本 - 英文 + 中文 + Emoji', () => {
  const buf = Buffer.from('Hello 你好 😀', 'utf8');
  return isUtf8(buf) === true;
});

test('复杂文本 - 多语言混合', () => {
  const buf = Buffer.from('Hello 你好 こんにちは مرحبا Привет', 'utf8');
  return isUtf8(buf) === true;
});

test('复杂文本 - 标点符号混合', () => {
  const buf = Buffer.from('Hello, 世界！こんにちは。', 'utf8');
  return isUtf8(buf) === true;
});

test('复杂文本 - 数字和符号', () => {
  const buf = Buffer.from('Price: ¥100 €50 $75', 'utf8');
  return isUtf8(buf) === true;
});

// 边界字符的组合
test('边界组合 - 1 字节最大 + 2 字节最小', () => {
  const buf = Buffer.from([0x7F, 0xC2, 0x80]); // U+007F + U+0080
  return isUtf8(buf) === true;
});

test('边界组合 - 2 字节最大 + 3 字节最小', () => {
  const buf = Buffer.from([0xDF, 0xBF, 0xE0, 0xA0, 0x80]); // U+07FF + U+0800
  return isUtf8(buf) === true;
});

test('边界组合 - 3 字节最大 + 4 字节最小', () => {
  const buf = Buffer.from([0xEF, 0xBF, 0xBF, 0xF0, 0x90, 0x80, 0x80]); // U+FFFF + U+10000
  return isUtf8(buf) === true;
});

test('边界组合 - 代理对前 + 代理对后', () => {
  const buf = Buffer.from([0xED, 0x9F, 0xBF, 0xEE, 0x80, 0x80]); // U+D7FF + U+E000
  return isUtf8(buf) === true;
});

// 截断场景
test('截断 - 2 字节序列在开始位置截断', () => {
  const full = Buffer.from('A你好', 'utf8'); // 'A' + "你好"
  const truncated = full.subarray(0, 2); // 只包含 'A' + '你'的第一个字节
  return isUtf8(truncated) === false;
});

test('截断 - 3 字节序列在中间截断', () => {
  const full = Buffer.from('你好', 'utf8');
  const truncated = full.subarray(0, 2); // '你'的前 2 个字节
  return isUtf8(truncated) === false;
});

test('截断 - 4 字节序列在不同位置截断', () => {
  const full = Buffer.from('😀', 'utf8'); // 4 字节
  const truncated1 = full.subarray(0, 1); // 前 1 字节
  const truncated2 = full.subarray(0, 2); // 前 2 字节
  const truncated3 = full.subarray(0, 3); // 前 3 字节
  return isUtf8(truncated1) === false && isUtf8(truncated2) === false && isUtf8(truncated3) === false;
});

// 重复模式
test('重复模式 - 同一字符重复', () => {
  const buf = Buffer.from('AAAAAAAAAA', 'utf8');
  return isUtf8(buf) === true;
});

test('重复模式 - 同一多字节字符重复', () => {
  const buf = Buffer.from('你你你你你', 'utf8');
  return isUtf8(buf) === true;
});

test('重复模式 - 同一 Emoji 重复', () => {
  const buf = Buffer.from('😀😀😀😀😀', 'utf8');
  return isUtf8(buf) === true;
});

test('重复模式 - 交替字符', () => {
  const buf = Buffer.from('ABABABABAB', 'utf8');
  return isUtf8(buf) === true;
});

test('重复模式 - 交替多字节字符', () => {
  const buf = Buffer.from('你好你好你好', 'utf8');
  return isUtf8(buf) === true;
});

// 空格和控制字符的组合
test('空格组合 - 多种空格', () => {
  const buf = Buffer.from([
    0x20,       // 普通空格
    0xC2, 0xA0, // 不间断空格
    0xE2, 0x80, 0x80, // en quad
    0xE2, 0x80, 0x8B  // 零宽度空格
  ]);
  return isUtf8(buf) === true;
});

test('控制字符组合 - 换行和制表', () => {
  const buf = Buffer.from('Hello\n\tWorld\r\n', 'utf8');
  return isUtf8(buf) === true;
});

test('控制字符组合 - NULL 在中间', () => {
  const buf = Buffer.from([0x48, 0x65, 0x00, 0x6C, 0x6C, 0x6F]); // "He\0llo"
  return isUtf8(buf) === true;
});

// 特殊 Unicode 字符的组合
test('特殊字符 - BOM + 文本', () => {
  const buf = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]); // BOM + "Hello"
  return isUtf8(buf) === true;
});

test('特殊字符 - 组合字符', () => {
  const buf = Buffer.from('é', 'utf8'); // e + 组合重音符（NFC 或 NFD）
  return isUtf8(buf) === true;
});

test('特殊字符 - 变音符号', () => {
  const buf = Buffer.from('café', 'utf8');
  return isUtf8(buf) === true;
});

test('特殊字符 - 连字符号', () => {
  const buf = Buffer.from('ﬁ', 'utf8'); // fi 连字
  return isUtf8(buf) === true;
});

// 真实世界场景
test('真实场景 - JSON 字符串', () => {
  const buf = Buffer.from('{"name":"张三","age":25}', 'utf8');
  return isUtf8(buf) === true;
});

test('真实场景 - HTML 片段', () => {
  const buf = Buffer.from('<div>你好</div>', 'utf8');
  return isUtf8(buf) === true;
});

test('真实场景 - URL', () => {
  const buf = Buffer.from('https://example.com/search?q=测试', 'utf8');
  return isUtf8(buf) === true;
});

test('真实场景 - 电子邮件地址', () => {
  const buf = Buffer.from('用户@example.com', 'utf8');
  return isUtf8(buf) === true;
});

test('真实场景 - 文件路径', () => {
  const buf = Buffer.from('/home/用户/文档/测试.txt', 'utf8');
  return isUtf8(buf) === true;
});

// 错误混合场景
test('错误混合 - 有效后立即无效', () => {
  const buf = Buffer.from([0xC2, 0x80, 0xC0]); // 有效 2 字节 + 非法起始
  return isUtf8(buf) === false;
});

test('错误混合 - 无效后立即有效', () => {
  const buf = Buffer.from([0xC0, 0xC2, 0x80]); // 非法起始 + 有效 2 字节
  return isUtf8(buf) === false;
});

test('错误混合 - 过长编码在中间', () => {
  const buf = Buffer.from([0x41, 0xC0, 0x80, 0x42]); // 'A' + 过长 + 'B'
  return isUtf8(buf) === false;
});

test('错误混合 - 代理对在有效字符中间', () => {
  const buf = Buffer.from([0x41, 0xED, 0xA0, 0x80, 0x42]); // 'A' + 代理对 + 'B'
  return isUtf8(buf) === false;
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
