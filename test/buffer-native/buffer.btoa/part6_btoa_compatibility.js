// buffer.btoa() - Compatibility and Interop Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 兼容性测试
test('与atob往返 - ASCII文本', () => {
  const original = 'hello world';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('与atob往返 - 二进制数据', () => {
  const original = '\x00\x01\x02\x03\xFF';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('与atob往返 - 长字符串', () => {
  const original = 'a'.repeat(1000);
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('与atob往返 - 空字符串', () => {
  const original = '';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('与atob往返 - 特殊字符', () => {
  const original = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const encoded = btoa(original);
  const decoded = atob(encoded);
  return decoded === original;
});

test('与Buffer.from兼容性', () => {
  const { Buffer } = require('buffer');
  const text = 'test string';
  const btoaResult = btoa(text);
  const bufferResult = Buffer.from(text, 'binary').toString('base64');
  return btoaResult === bufferResult;
});

test('与Buffer.from兼容性 - 二进制', () => {
  const { Buffer } = require('buffer');
  const binary = '\x00\xFF\x80\x7F';
  const btoaResult = btoa(binary);
  const bufferResult = Buffer.from(binary, 'binary').toString('base64');
  return btoaResult === bufferResult;
});

test('与Buffer.from兼容性 - Latin-1字符', () => {
  const { Buffer } = require('buffer');
  const latin1 = '\xA0\xB0\xC0\xD0';
  const btoaResult = btoa(latin1);
  const bufferResult = Buffer.from(latin1, 'binary').toString('base64');
  return btoaResult === bufferResult;
});

test('标准Base64格式验证', () => {
  const result = btoa('test');
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(result);
});

test('RFC 4648兼容性 - 示例1', () => {
  const result = btoa('f');
  return result === 'Zg==';
});

test('RFC 4648兼容性 - 示例2', () => {
  const result = btoa('fo');
  return result === 'Zm8=';
});

test('RFC 4648兼容性 - 示例3', () => {
  const result = btoa('foo');
  return result === 'Zm9v';
});

test('RFC 4648兼容性 - 示例4', () => {
  const result = btoa('foob');
  return result === 'Zm9vYg==';
});

test('RFC 4648兼容性 - 示例5', () => {
  const result = btoa('fooba');
  return result === 'Zm9vYmE=';
});

test('RFC 4648兼容性 - 示例6', () => {
  const result = btoa('foobar');
  return result === 'Zm9vYmFy';
});

test('MIME Base64兼容性（无换行）', () => {
  const long = 'a'.repeat(100);
  const result = btoa(long);
  return !result.includes('\n') && !result.includes('\r');
});

test('浏览器API兼容性 - 全局函数', () => {
  return typeof btoa === 'function';
});

test('浏览器API兼容性 - 返回类型', () => {
  const result = btoa('test');
  return typeof result === 'string';
});

test('Web标准行为 - 单参数', () => {
  const result = btoa('test');
  return result === 'dGVzdA==';
});

test('历史行为保持 - 空字符串', () => {
  const result = btoa('');
  return result === '';
});

test('Latin-1别名binary编码', () => {
  const { Buffer } = require('buffer');
  const data = '\x80\x90\xA0';
  const btoaResult = btoa(data);
  const binaryResult = Buffer.from(data, 'latin1').toString('base64');
  return btoaResult === binaryResult;
});

test('不同长度输入一致性', () => {
  for (let len = 0; len < 20; len++) {
    const input = 'x'.repeat(len);
    const encoded = btoa(input);
    const decoded = atob(encoded);
    if (decoded !== input) return false;
  }
  return true;
});

test('字符集范围0-255完整测试', () => {
  let allChars = '';
  for (let i = 0; i < 256; i++) {
    allChars += String.fromCharCode(i);
  }
  const encoded = btoa(allChars);
  const decoded = atob(encoded);
  if (decoded.length !== 256) return false;
  for (let i = 0; i < 256; i++) {
    if (decoded.charCodeAt(i) !== i) return false;
  }
  return true;
});

test('数据完整性 - 随机字节序列', () => {
  let random = '';
  for (let i = 0; i < 100; i++) {
    random += String.fromCharCode(Math.floor(Math.random() * 256));
  }
  const encoded = btoa(random);
  const decoded = atob(encoded);
  return decoded === random;
});

test('编码不改变原字符串', () => {
  const original = 'immutable';
  const copy = original;
  btoa(original);
  return original === copy;
});

test('多次编码幂等性', () => {
  const input = 'test';
  const result1 = btoa(input);
  const result2 = btoa(input);
  const result3 = btoa(input);
  return result1 === result2 && result2 === result3;
});

test('性能合理性 - 中等字符串', () => {
  const input = 'x'.repeat(1000);
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    btoa(input);
  }
  const duration = Date.now() - start;
  return duration < 1000; // 100次调用应该在1秒内完成
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
