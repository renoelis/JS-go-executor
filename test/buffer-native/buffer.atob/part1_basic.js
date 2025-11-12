// buffer.atob() - Part 1: Basic Functionality Tests
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

// 基本功能测试
test('解码简单 Base64 字符串', () => {
  const result = atob('SGVsbG8=');
  return result === 'Hello';
});

test('解码无填充的 Base64', () => {
  const result = atob('SGVsbG8');
  return result === 'Hello';
});

test('解码带双填充的 Base64', () => {
  const result = atob('SGk=');
  return result === 'Hi';
});

test('解码空字符串', () => {
  const result = atob('');
  return result === '';
});

test('解码 ASCII 字符', () => {
  const result = atob('QUJDREVGRw==');
  return result === 'ABCDEFG';
});

test('解码数字', () => {
  const result = atob('MTIzNDU2');
  return result === '123456';
});

test('解码特殊字符', () => {
  const result = atob('ISQlXiYqKCk=');
  return result === '!$%^&*()';
});

test('解码长字符串', () => {
  const input = 'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZw==';
  const result = atob(input);
  return result === 'The quick brown fox jumps over the lazy dog';
});

test('解码包含 + 和 / 的 Base64', () => {
  const result = atob('YWJjKy8=');
  return result.length === 5;
});

test('解码全 A', () => {
  const result = atob('QUFBQQ==');
  return result === 'AAAA';
});

// Latin-1 字符测试
test('解码 Latin-1 扩展字符', () => {
  const result = atob('wqPCqMKp');
  return result.charCodeAt(0) === 0xC2; // Latin-1 编码
});

test('解码二进制数据', () => {
  const result = atob('AAECAwQFBgc=');
  return result.length === 8;
});

// 忽略空白字符（根据规范）
test('忽略换行符', () => {
  const result = atob('SGVs\nbG8=');
  return result === 'Hello';
});

test('忽略空格', () => {
  const result = atob('SGVs bG8=');
  return result === 'Hello';
});

test('忽略制表符', () => {
  const result = atob('SGVs\tbG8=');
  return result === 'Hello';
});

test('忽略回车符', () => {
  const result = atob('SGVs\rbG8=');
  return result === 'Hello';
});

// 类型转换测试
test('数字参数自动转为字符串', () => {
  const result = atob(123);
  return typeof result === 'string';
});

test('对象参数调用 toString()', () => {
  const obj = { toString: () => 'SGVsbG8=' };
  const result = atob(obj);
  return result === 'Hello';
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
