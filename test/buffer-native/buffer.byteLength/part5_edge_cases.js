// Buffer.byteLength() - Edge Cases Tests
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

// Unicode 边界测试
test('BMP 字符（基本多文种平面）', () => {
  const len = Buffer.byteLength('\u0041'); // 'A'
  return len === 1;
});

test('BMP 字符 - 中文', () => {
  const len = Buffer.byteLength('\u4E2D'); // '中'
  return len === 3;
});

test('辅助平面字符（4 字节）', () => {
  const len = Buffer.byteLength('\u{1F600}'); // 😀
  return len === 4;
});

test('组合字符', () => {
  const len = Buffer.byteLength('e\u0301'); // é (e + 组合重音符)
  return len === 3; // 'e' 1字节 + 组合符 2字节
});

test('零宽字符', () => {
  const len = Buffer.byteLength('\u200B'); // 零宽空格
  return len === 3;
});

test('代理对（正常配对）', () => {
  const len = Buffer.byteLength('\uD83D\uDE00'); // 😀
  return len === 4;
});

test('单独的高代理项', () => {
  const len = Buffer.byteLength('\uD83D');
  // 会被编码为替换字符
  return len === 3;
});

test('单独的低代理项', () => {
  const len = Buffer.byteLength('\uDE00');
  return len === 3;
});

test('反向代理对', () => {
  const len = Buffer.byteLength('\uDE00\uD83D');
  // 两个替换字符
  return len === 6;
});

// 特殊编码边界
test('base64 填充 - 单个等号', () => {
  const len = Buffer.byteLength('YQ==', 'base64');
  return len === 1;
});

test('base64 填充 - 双等号', () => {
  const len = Buffer.byteLength('YWI=', 'base64');
  return len === 2;
});

test('base64 无填充', () => {
  const len = Buffer.byteLength('YWJj', 'base64');
  return len === 3;
});

test('base64 包含空格', () => {
  const len = Buffer.byteLength('YWJj ZGVm', 'base64');
  // 空格会被忽略
  return len === 6;
});

test('base64 包含换行符', () => {
  const len = Buffer.byteLength('YWJj\nZGVm', 'base64');
  // 换行符会被忽略
  return len === 6;
});

test('hex 奇数长度字符串', () => {
  const len = Buffer.byteLength('abc', 'hex');
  // 最后一个字符被忽略或补齐
  return len === 1;
});

test('hex 单个字符', () => {
  const len = Buffer.byteLength('a', 'hex');
  return len === 0;
});

test('hex 空格分隔', () => {
  const len = Buffer.byteLength('ab cd', 'hex');
  // hex 编码中空格不是合法字符，'ab' 解析为 1 字节，空格和 'cd' 会被处理
  // 实际测试显示返回 2
  return len === 2;
});

// Latin1 边界
test('latin1 最大字符值（0xFF）', () => {
  const len = Buffer.byteLength('\xFF', 'latin1');
  return len === 1;
});

test('latin1 字符范围 0-255', () => {
  let str = '';
  for (let i = 0; i < 256; i++) {
    str += String.fromCharCode(i);
  }
  const len = Buffer.byteLength(str, 'latin1');
  return len === 256;
});

// UTF-16LE 边界
test('utf16le BMP 字符', () => {
  const len = Buffer.byteLength('A', 'utf16le');
  return len === 2;
});

test('utf16le 中文字符', () => {
  const len = Buffer.byteLength('中', 'utf16le');
  return len === 2;
});

test('utf16le emoji（代理对）', () => {
  const len = Buffer.byteLength('😀', 'utf16le');
  // emoji 在 UTF-16 中是代理对，4 字节
  return len === 4;
});

test('utf16le 空字符串', () => {
  const len = Buffer.byteLength('', 'utf16le');
  return len === 0;
});

// ASCII 边界
test('ascii 控制字符', () => {
  const len = Buffer.byteLength('\x00\x01\x1F', 'ascii');
  return len === 3;
});

test('ascii DEL 字符（0x7F）', () => {
  const len = Buffer.byteLength('\x7F', 'ascii');
  return len === 1;
});

test('ascii 扩展字符（> 127）被截断', () => {
  const len = Buffer.byteLength('\u0080\u00FF', 'ascii');
  // 超出 ASCII 范围的字符被截断为 1 字节
  return len === 2;
});

// 混合场景
test('多种 Unicode 平面混合', () => {
  const str = 'A\u4E2D😀\u200B'; // ASCII + 中文 + emoji + 零宽
  const len = Buffer.byteLength(str);
  // 1 + 3 + 4 + 3 = 11
  return len === 11;
});

test('重复的代理对', () => {
  const str = '😀😀😀';
  const len = Buffer.byteLength(str);
  return len === 12;
});

test('base64url 特殊字符', () => {
  const len = Buffer.byteLength('YWJj-_==', 'base64url');
  // base64url 使用 - 和 _ 代替 + 和 /
  return len === 4;
});

// 长度为 1 的边界
test('长度为 1 的 Buffer', () => {
  const buf = Buffer.alloc(1);
  const len = Buffer.byteLength(buf);
  return len === 1;
});

test('长度为 1 的 TypedArray', () => {
  const arr = new Uint8Array(1);
  const len = Buffer.byteLength(arr);
  return len === 1;
});

test('长度为 1 的 ArrayBuffer', () => {
  const ab = new ArrayBuffer(1);
  const len = Buffer.byteLength(ab);
  return len === 1;
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
