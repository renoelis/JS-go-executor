// buffer.atob() - Part 1: 基本功能测试
const { Buffer, atob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 基础解码测试
test('基本 base64 解码 - 简单字符串', () => {
  const encoded = 'SGVsbG8=';
  const decoded = atob(encoded);
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
});

test('基本 base64 解码 - 无填充', () => {
  const encoded = 'SGVsbG8';
  const decoded = atob(encoded);
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
});

test('基本 base64 解码 - 双等号填充', () => {
  const encoded = 'YQ==';
  const decoded = atob(encoded);
  if (decoded !== 'a') {
    throw new Error(`期望 "a", 实际 "${decoded}"`);
  }
  return true;
});

test('基本 base64 解码 - 单等号填充', () => {
  const encoded = 'YWI=';
  const decoded = atob(encoded);
  if (decoded !== 'ab') {
    throw new Error(`期望 "ab", 实际 "${decoded}"`);
  }
  return true;
});

test('解码常见单词', () => {
  const pairs = [
    { encoded: 'Tm9kZQ==', expected: 'Node' },
    { encoded: 'SmF2YVNjcmlwdA==', expected: 'JavaScript' },
    { encoded: 'QnVmZmVy', expected: 'Buffer' }
  ];

  for (const { encoded, expected } of pairs) {
    const decoded = atob(encoded);
    if (decoded !== expected) {
      throw new Error(`编码 "${encoded}" 期望 "${expected}", 实际 "${decoded}"`);
    }
  }
  return true;
});

test('解码数字字符串', () => {
  const encoded = 'MTIzNDU2Nzg5MA==';
  const decoded = atob(encoded);
  if (decoded !== '1234567890') {
    throw new Error(`期望 "1234567890", 实际 "${decoded}"`);
  }
  return true;
});

test('解码空格和标点符号', () => {
  const encoded = 'SGVsbG8sIFdvcmxkIQ==';
  const decoded = atob(encoded);
  if (decoded !== 'Hello, World!') {
    throw new Error(`期望 "Hello, World!", 实际 "${decoded}"`);
  }
  return true;
});

test('解码所有 ASCII 可打印字符', () => {
  const original = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`ASCII 字符解码失败`);
  }
  return true;
});

test('atob 返回值类型为 string', () => {
  const decoded = atob('SGVsbG8=');
  if (typeof decoded !== 'string') {
    throw new Error(`期望类型 "string", 实际 "${typeof decoded}"`);
  }
  return true;
});

test('atob 长度正确', () => {
  const decoded = atob('SGVsbG8=');
  if (decoded.length !== 5) {
    throw new Error(`期望长度 5, 实际 ${decoded.length}`);
  }
  return true;
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
