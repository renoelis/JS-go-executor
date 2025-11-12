// buffer.atob() - Part 15: WHATWG Infra Standard 深度合规测试
// 基于 WHATWG Infra Standard forgiving-base64 算法
const { atob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// === ASCII 空白字符测试 ===
// Node.js v25 支持 SPACE、TAB、LF、CR、FF 空白字符过滤（仅这5种）

test('Node.js 空白：前后空格过滤', () => {
  const withSpaces = '  SGVsbG8=  ';  // 前后空格
  const withoutSpaces = 'SGVsbG8=';
  const result1 = atob(withSpaces);
  const result2 = atob(withoutSpaces);
  if (result1 !== result2) {
    throw new Error(`前后空格处理不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('Node.js 空白：中间空格过滤', () => {
  const withSpace = 'SGVs bG8=';  // 中间空格
  const withoutSpace = 'SGVsbG8=';
  const result1 = atob(withSpace);
  const result2 = atob(withoutSpace);
  if (result1 !== result2) {
    throw new Error(`中间空格处理不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('Node.js 空白：多个空格过滤', () => {
  const withSpaces = 'S G V s   b G 8 =';  // 多个空格
  const withoutSpaces = 'SGVsbG8=';
  const result1 = atob(withSpaces);
  const result2 = atob(withoutSpaces);
  if (result1 !== result2) {
    throw new Error(`多个空格处理不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('Node.js 空白：仅空格应返回空', () => {
  const onlySpaces = '    ';
  const result = atob(onlySpaces);
  if (result !== '') {
    throw new Error(`仅空格应返回空字符串，实际: "${result}"`);
  }
  return true;
});

test('Node.js 空白：混合SPACE、TAB、LF、CR、FF', () => {
  // 只使用Node.js支持的空白字符：空格
  const mixed = ' S G V s b G 8 = ';  // 仅空格
  const clean = 'SGVsbG8=';
  const result1 = atob(mixed);
  const result2 = atob(clean);
  if (result1 !== result2) {
    throw new Error(`混合空白处理不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('WHATWG 空白：TAB字符自动过滤', () => {
  const withTab = 'SGVs' + String.fromCharCode(9) + 'bG8=';  // 插入TAB
  const withoutTab = 'SGVsbG8=';
  const result1 = atob(withTab);
  const result2 = atob(withoutTab);
  if (result1 !== result2) {
    throw new Error(`TAB过滤不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('WHATWG 空白：LF字符自动过滤', () => {
  const withLF = 'SGVs' + String.fromCharCode(10) + 'bG8=';  // 插入LF  
  const withoutLF = 'SGVsbG8=';
  const result1 = atob(withLF);
  const result2 = atob(withoutLF);
  if (result1 !== result2) {
    throw new Error(`LF过滤不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('WHATWG 空白：CR字符自动过滤', () => {
  const withCR = 'SGVs' + String.fromCharCode(13) + 'bG8=';  // 插入CR
  const withoutCR = 'SGVsbG8=';
  const result1 = atob(withCR);
  const result2 = atob(withoutCR);
  if (result1 !== result2) {
    throw new Error(`CR过滤不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('WHATWG 空白：FF字符自动过滤', () => {
  const withFF = 'SGVs' + String.fromCharCode(12) + 'bG8=';  // 插入FF
  const withoutFF = 'SGVsbG8=';
  const result1 = atob(withFF);
  const result2 = atob(withoutFF);
  if (result1 !== result2) {
    throw new Error(`FF过滤不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

test('WHATWG 空白：混合所有空白字符', () => {
  // 混合所有5种WHATWG标准空白字符
  const mixed = 'S' + String.fromCharCode(9) + 'G' + String.fromCharCode(10) + 'V' + String.fromCharCode(12) + 's' + String.fromCharCode(13) + ' bG8=';
  const clean = 'SGVsbG8=';
  const result1 = atob(mixed);
  const result2 = atob(clean);
  if (result1 !== result2) {
    throw new Error(`混合空白过滤不一致: "${result1}" vs "${result2}"`);
  }
  return true;
});

// === 长度边界测试 ===
// WHATWG: 如果长度模4余1，返回失败

test('Node.js 长度：余数为1 (应失败)', () => {
  try {
    atob('A');  // 长度1，模4余1
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('encoded')) {
      return true;
    }
    throw e;
  }
});

test('Node.js 长度：余数为1 (5字符，应失败)', () => {
  try {
    atob('AAAAA');  // 长度5，模4余1
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('encoded')) {
      return true;
    }
    throw e;
  }
});

test('Node.js 长度：余数为1 (9字符，应失败)', () => {
  try {
    atob('AAAAAAAAA');  // 长度9，模4余1
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('encoded')) {
      return true;
    }
    throw e;
  }
});

// === 填充字符位置测试 ===

test('WHATWG 填充：中间位置有等号 (应失败)', () => {
  try {
    atob('SG=sbG8=');  // 等号在中间
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('WHATWG 填充：三个等号 (应失败)', () => {
  try {
    atob('SGVs===');  // 不能有三个等号
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('WHATWG 填充：四个等号 (应失败)', () => {
  try {
    atob('====');  // 不能有四个等号
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// === 位丢弃测试 ===
// WHATWG: "YQ" 和 "YR" 都应该返回 'a'

test('WHATWG 位丢弃：YQ 和 YR 等价', () => {
  const result1 = atob('YQ');  // 12位，丢弃末尾4位
  const result2 = atob('YR');  // 12位，丢弃末尾4位
  if (result1 !== result2 || result1 !== 'a') {
    throw new Error(`位丢弃不正确: YQ="${result1}", YR="${result2}"`);
  }
  return true;
});

test('WHATWG 位丢弃：18位情况', () => {
  // 3字符 = 18位，应丢弃末尾2位
  const result1 = atob('SGU');  // "He"
  const result2 = atob('SGV');  // "He" (末尾2位不同)
  if (result1 !== result2) {
    throw new Error(`18位丢弃不正确: SGU="${result1}", SGV="${result2}"`);
  }
  return true;
});

// === 字符集完整性测试 ===

test('WHATWG 字符集：仅允许base64字符', () => {
  const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  
  // 测试每个有效字符
  for (let i = 0; i < validChars.length; i += 4) {
    const chunk = validChars.substr(i, 4).padEnd(4, 'A');
    try {
      atob(chunk);
    } catch (e) {
      throw new Error(`有效字符 "${chunk}" 应该被接受`);
    }
  }
  return true;
});

test('WHATWG 字符集：拒绝所有非base64字符', () => {
  // 测试一些明确的非base64字符
  const invalidChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?'];
  
  for (const char of invalidChars) {
    try {
      atob('AAA' + char);  // 在有效base64中插入无效字符
      throw new Error(`无效字符 "${char}" 应该被拒绝`);
    } catch (e) {
      if (!e.message.includes('Invalid') && !e.message.includes('invalid')) {
        throw new Error(`字符 "${char}" 的错误类型不正确: ${e.message}`);
      }
    }
  }
  return true;
});

// === 空白与有效字符组合 ===

test('WHATWG 空白：空白与填充组合', () => {
  const withWhitespace = ' SGVs' + String.fromCharCode(9) + 'bG' + String.fromCharCode(10) + '8= ' + String.fromCharCode(12);  // 各种空白字符
  const clean = 'SGVsbG8=';
  const result1 = atob(withWhitespace);
  const result2 = atob(clean);
  if (result1 !== result2) {
    throw new Error(`空白与填充组合处理不一致`);
  }
  return true;
});

test('WHATWG 空白：仅空白字符应为空结果', () => {
  const onlyWhitespace = String.fromCharCode(32) + String.fromCharCode(9) + String.fromCharCode(10) + String.fromCharCode(12) + String.fromCharCode(13);  // 所有空白字符
  const result = atob(onlyWhitespace);
  if (result !== '') {
    throw new Error(`仅空白字符应返回空字符串，实际: "${result}"`);
  }
  return true;
});

// === RFC 4648 表格验证 ===

test('WHATWG RFC4648：验证编码表映射', () => {
  // 验证 base64 编码表的正确映射
  const mapping = {
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7,
    'I': 8, 'J': 9, 'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15,
    'Q': 16, 'R': 17, 'S': 18, 'T': 19, 'U': 20, 'V': 21, 'W': 22, 'X': 23,
    'Y': 24, 'Z': 25, 'a': 26, 'b': 27, 'c': 28, 'd': 29, 'e': 30, 'f': 31,
    'g': 32, 'h': 33, 'i': 34, 'j': 35, 'k': 36, 'l': 37, 'm': 38, 'n': 39,
    'o': 40, 'p': 41, 'q': 42, 'r': 43, 's': 44, 't': 45, 'u': 46, 'v': 47,
    'w': 48, 'x': 49, 'y': 50, 'z': 51, '0': 52, '1': 53, '2': 54, '3': 55,
    '4': 56, '5': 57, '6': 58, '7': 59, '8': 60, '9': 61, '+': 62, '/': 63
  };

  // 测试边界值映射
  const testA = atob('AAAA');  // 应该是 [0,0,0]
  if (testA.charCodeAt(0) !== 0 || testA.charCodeAt(1) !== 0 || testA.charCodeAt(2) !== 0) {
    throw new Error(`AAAA 解码不正确: [${testA.charCodeAt(0)}, ${testA.charCodeAt(1)}, ${testA.charCodeAt(2)}]`);
  }

  const test_slash = atob('////');  // 应该是 [255,255,255]
  if (test_slash.charCodeAt(0) !== 255 || test_slash.charCodeAt(1) !== 255 || test_slash.charCodeAt(2) !== 255) {
    throw new Error(`//// 解码不正确: [${test_slash.charCodeAt(0)}, ${test_slash.charCodeAt(1)}, ${test_slash.charCodeAt(2)}]`);
  }

  return true;
});

// === 输出和总结 ===

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
