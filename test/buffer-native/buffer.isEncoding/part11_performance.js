// Buffer.isEncoding - part11: 性能与大量调用测试
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

// 连续多次调用
test('连续调用 100 次 utf8 应保持一致性', () => {
  for (let i = 0; i < 100; i++) {
    if (Buffer.isEncoding('utf8') !== true) {
      return false;
    }
  }
  return true;
});

test('连续调用 100 次 unknown 应保持一致性', () => {
  for (let i = 0; i < 100; i++) {
    if (Buffer.isEncoding('unknown') !== false) {
      return false;
    }
  }
  return true;
});

test('交替调用有效和无效编码应正确', () => {
  for (let i = 0; i < 50; i++) {
    if (Buffer.isEncoding('utf8') !== true) return false;
    if (Buffer.isEncoding('unknown') !== false) return false;
  }
  return true;
});

// 批量测试所有有效编码
test('批量测试所有有效编码应全部返回 true', () => {
  const validEncodings = [
    'utf8', 'utf-8', 'UTF8', 'UTF-8',
    'utf16le', 'UTF16LE', 'ucs2', 'ucs-2', 'UCS2', 'UCS-2',
    'base64', 'BASE64', 'base64url', 'BASE64URL',
    'latin1', 'LATIN1', 'binary', 'BINARY',
    'hex', 'HEX',
    'ascii', 'ASCII'
  ];

  for (const encoding of validEncodings) {
    if (Buffer.isEncoding(encoding) !== true) {
      return false;
    }
  }
  return true;
});

// 批量测试所有无效编码
test('批量测试所有无效编码应全部返回 false', () => {
  const invalidEncodings = [
    'unknown', 'utf32', 'utf16', 'utf16be',
    'iso-8859-1', 'gbk', 'big5', 'shift_jis',
    'base32', 'base16', '', ' ', 'utf_8',
    'utf 8', 'utf-16', 'utf-32'
  ];

  for (const encoding of invalidEncodings) {
    if (Buffer.isEncoding(encoding) !== false) {
      return false;
    }
  }
  return true;
});

// 同一字符串重复测试
test('相同字符串 utf8 多次调用应返回相同结果', () => {
  const str = 'utf8';
  const result1 = Buffer.isEncoding(str);
  const result2 = Buffer.isEncoding(str);
  const result3 = Buffer.isEncoding(str);
  return result1 === result2 && result2 === result3 && result1 === true;
});

test('相同字符串 unknown 多次调用应返回相同结果', () => {
  const str = 'unknown';
  const result1 = Buffer.isEncoding(str);
  const result2 = Buffer.isEncoding(str);
  const result3 = Buffer.isEncoding(str);
  return result1 === result2 && result2 === result3 && result1 === false;
});

// 不同变量引用相同字符串
test('不同变量引用 utf8 应返回相同结果', () => {
  const str1 = 'utf8';
  const str2 = 'utf8';
  const str3 = 'utf' + '8';
  return Buffer.isEncoding(str1) === Buffer.isEncoding(str2) &&
         Buffer.isEncoding(str2) === Buffer.isEncoding(str3) &&
         Buffer.isEncoding(str1) === true;
});

// 动态构造的字符串
test('动态构造的 utf8 字符串应正确识别', () => {
  const parts = ['u', 't', 'f', '8'];
  const encoding = parts.join('');
  return Buffer.isEncoding(encoding) === true;
});

test('动态构造的 hex 字符串应正确识别', () => {
  const encoding = 'he' + 'x';
  return Buffer.isEncoding(encoding) === true;
});

test('从数组构造的编码名应正确识别', () => {
  const chars = [104, 101, 120]; // 'hex' 的 ASCII 码
  const encoding = String.fromCharCode(...chars);
  return Buffer.isEncoding(encoding) === true;
});

// 模板字符串
test('模板字符串构造的 utf8 应正确识别', () => {
  const num = 8;
  const encoding = `utf${num}`;
  return Buffer.isEncoding(encoding) === true;
});

test('模板字符串构造的 base64 应正确识别', () => {
  const base = 'base';
  const suffix = '64';
  const encoding = `${base}${suffix}`;
  return Buffer.isEncoding(encoding) === true;
});

// 字符串方法处理后的编码名
test('toUpperCase 处理后的 utf8 应正确识别', () => {
  const encoding = 'utf8'.toUpperCase();
  return Buffer.isEncoding(encoding) === true;
});

test('toLowerCase 处理后的 UTF8 应正确识别', () => {
  const encoding = 'UTF8'.toLowerCase();
  return Buffer.isEncoding(encoding) === true;
});

test('trim 处理后的 utf8 应保持有效（无空格）', () => {
  const encoding = 'utf8'.trim();
  return Buffer.isEncoding(encoding) === true;
});

test('trim 处理带空格的 utf8 字符串应返回 true', () => {
  const encoding = '  utf8  '.trim();
  return Buffer.isEncoding(encoding) === true;
});

// 字符串切片
test('slice 提取的 hex 应正确识别', () => {
  const fullString = 'abchexdef';
  const encoding = fullString.slice(3, 6);
  return Buffer.isEncoding(encoding) === true;
});

test('substring 提取的 ascii 应正确识别', () => {
  const fullString = 'xascii';
  const encoding = fullString.substring(1);
  return Buffer.isEncoding(encoding) === true;
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
