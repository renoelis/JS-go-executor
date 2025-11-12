// buffer.atob() - Part 2: Edge Cases and Error Handling
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

// 错误处理测试
test('无效字符 - 包含非 Base64 字符', () => {
  try {
    atob('Hello@World');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.message.includes('Invalid');
  }
});

test('无效字符 - 包含中文', () => {
  try {
    atob('你好');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.message.includes('Invalid');
  }
});

test('无效字符 - 包含 Emoji', () => {
  try {
    atob('😀');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.message.includes('Invalid');
  }
});

test('无效长度 - 单个字符（非法）', () => {
  try {
    atob('A');
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError' || e.name === 'DOMException' || e.message.includes('not correctly encoded');
  }
});

test('无效长度 - 5 个字符（非法）', () => {
  try {
    atob('AAAAA');
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError' || e.name === 'DOMException' || e.message.includes('not correctly encoded');
  }
});

test('填充错误 - 中间有填充符', () => {
  try {
    atob('SG=sbG8=');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.message.includes('Invalid');
  }
});

test('填充错误 - 三个填充符', () => {
  try {
    atob('A===');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.message.includes('Invalid');
  }
});

// null 和 undefined 测试
test('null 参数转为字符串 "null"', () => {
  try {
    const result = atob(null);
    return typeof result === 'string';
  } catch (e) {
    return e.message.includes('Invalid');
  }
});

test('undefined 参数转为字符串 "undefined"（会报错）', () => {
  try {
    const result = atob(undefined);
    // 'undefined' 不是有效的 base64，会抛出错误
    return false;
  } catch (e) {
    return e.name === 'InvalidCharacterError' || e.message.includes('not correctly encoded');
  }
});

// 边界情况
test('只有填充符', () => {
  try {
    atob('====');
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.message.includes('Invalid');
  }
});

test('超长 Base64 字符串', () => {
  // 使用有效的 base64 字符串（不能简单重复带 padding 的字符串）
  const longBase64 = 'QUFB'.repeat(10000); // 'AAA' * 10000
  try {
    const result = atob(longBase64);
    return result.length === 30000; // 每个 'QUFB' 解码为 3 字节
  } catch (e) {
    // 如果太长导致错误也可以接受
    return e.message.includes('Invalid') || e.message.includes('length');
  }
});

test('包含所有有效 Base64 字符', () => {
  const allChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const result = atob(allChars);
  return result.length > 0;
});

// 特殊 Base64 序列
test('全零字节', () => {
  const result = atob('AAAA');
  return result.charCodeAt(0) === 0 && result.charCodeAt(1) === 0 && result.charCodeAt(2) === 0;
});

test('全 0xFF 字节', () => {
  const result = atob('////');
  return result.charCodeAt(0) === 0xFF && result.charCodeAt(1) === 0xFF && result.charCodeAt(2) === 0xFF;
});

// 与 btoa 的往返测试
test('atob(btoa(x)) === x (ASCII)', () => {
  const { btoa } = require('buffer');
  const original = 'Hello World';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('atob(btoa(x)) === x (特殊字符)', () => {
  const { btoa } = require('buffer');
  const original = '!@#$%^&*()';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

// 大小写敏感测试
test('Base64 大小写敏感', () => {
  const upper = atob('QUJD');
  const lower = atob('qujd');
  return upper !== lower;
});

// 忽略的空白字符组合
test('忽略多种空白字符混合', () => {
  const result = atob('SGVs \n\r\t bG8=');
  return result === 'Hello';
});

test('开头和结尾的空白字符', () => {
  const result = atob('  SGVsbG8=  ');
  return result === 'Hello';
});

// URL-safe Base64（应该失败或特殊处理）
test('URL-safe Base64 字符 - 和 _', () => {
  try {
    atob('SGVsbG8-X29ybGQ_'); // URL-safe 使用 - 和 _ 替代 + 和 /
    return false;
  } catch (e) {
    return e.name === 'DOMException' || e.message.includes('Invalid');
  }
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
