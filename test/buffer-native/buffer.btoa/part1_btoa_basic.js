// buffer.btoa() - Basic Functionality Tests
const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 基本功能测试
test('空字符串编码', () => {
  const result = btoa('');
  return result === '';
});

test('单字符编码', () => {
  const result = btoa('a');
  return result === 'YQ==';
});

test('ASCII字符串编码', () => {
  const result = btoa('hello');
  return result === 'aGVsbG8=';
});

test('多个ASCII字符', () => {
  const result = btoa('Hello World');
  return result === 'SGVsbG8gV29ybGQ=';
});

test('数字字符串', () => {
  const result = btoa('123456');
  return result === 'MTIzNDU2';
});

test('特殊ASCII字符', () => {
  const result = btoa('!@#$%^&*()');
  return result === 'IUAjJCVeJiooKQ==';
});

test('空格和换行符', () => {
  const result = btoa(' \t\n\r');
  return result === 'IAkKDQ==';
});

test('所有可打印ASCII字符', () => {
  const input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const result = btoa(input);
  return result === 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODk=';
});

test('二进制数据（低字节）', () => {
  const result = btoa('\x00');
  return result === 'AA==';
});

test('二进制数据（高字节范围）', () => {
  const result = btoa('\x00\x01\x02\x03');
  return result === 'AAECAw==';
});

test('完整字节范围（0-255采样）', () => {
  const input = '\x00\x10\x20\x30\x40\x50\x60\x70\x80\x90\xa0\xb0\xc0\xd0\xe0\xf0\xff';
  const result = btoa(input);
  return result === 'ABAgMEBQYHCAkKCwwNDg8P8=';
});

test('长度为3的倍数', () => {
  const result = btoa('abc');
  return result === 'YWJj';
});

test('长度为3的倍数+1', () => {
  const result = btoa('abcd');
  return result === 'YWJjZA==';
});

test('长度为3的倍数+2', () => {
  const result = btoa('abcde');
  return result === 'YWJjZGU=';
});

test('较长字符串', () => {
  const input = 'The quick brown fox jumps over the lazy dog';
  const result = btoa(input);
  return result === 'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZw==';
});

test('重复字符', () => {
  const result = btoa('aaaaaaa');
  return result === 'YWFhYWFhYQ==';
});

test('Base64输出不含换行符', () => {
  const longInput = 'a'.repeat(100);
  const result = btoa(longInput);
  return !result.includes('\n') && !result.includes('\r');
});

test('Latin-1范围内的字符', () => {
  const result = btoa('\x80\x81\x82');
  return result === 'gIGC';
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
