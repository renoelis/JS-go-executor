// buffer.btoa() - Part 1: Basic Functionality Tests
const { btoa } = require('buffer');

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
test('编码简单字符串', () => {
  const result = btoa('Hello');
  return result === 'SGVsbG8=';
});

test('编码空字符串', () => {
  const result = btoa('');
  return result === '';
});

test('编码单字符', () => {
  const result = btoa('A');
  return result === 'QQ==';
});

test('编码两字符', () => {
  const result = btoa('Hi');
  return result === 'SGk=';
});

test('编码三字符', () => {
  const result = btoa('ABC');
  return result === 'QUJD';
});

test('编码四字符（无填充）', () => {
  const result = btoa('ABCD');
  return result === 'QUJDRA==';
});

test('编码数字字符串', () => {
  const result = btoa('123456');
  return result === 'MTIzNDU2';
});

test('编码特殊字符', () => {
  const result = btoa('!$%^&*()');
  return result === 'ISQlXiYqKCk=';
});

test('编码长字符串', () => {
  const result = btoa('The quick brown fox jumps over the lazy dog');
  return result === 'VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZw==';
});

test('编码空格', () => {
  const result = btoa('   ');
  return result === 'ICAg';
});

test('编码换行符', () => {
  const result = btoa('\n');
  return result === 'Cg==';
});

test('编码制表符', () => {
  const result = btoa('\t');
  return result === 'CQ==';
});

test('编码回车符', () => {
  const result = btoa('\r');
  return result === 'DQ==';
});

test('编码 NULL 字符', () => {
  const result = btoa('\0');
  return result === 'AA==';
});

// Latin-1 字符测试（0-255）
test('编码 Latin-1 字符 (0x80)', () => {
  const result = btoa(String.fromCharCode(0x80));
  return result === 'gA==';
});

test('编码 Latin-1 字符 (0xFF)', () => {
  const result = btoa(String.fromCharCode(0xFF));
  return result === '/w==';
});

test('编码所有 ASCII 可打印字符', () => {
  let str = '';
  for (let i = 0x20; i <= 0x7E; i++) {
    str += String.fromCharCode(i);
  }
  const result = btoa(str);
  return result.length > 0 && result.indexOf('=') >= 0;
});

// 类型转换测试
test('数字参数自动转为字符串', () => {
  const result = btoa(123);
  return result === 'MTIz';
});

test('布尔参数自动转为字符串', () => {
  const result = btoa(true);
  return result === 'dHJ1ZQ==';
});

test('对象参数调用 toString()', () => {
  const obj = { toString: () => 'Hello' };
  const result = btoa(obj);
  return result === 'SGVsbG8=';
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
