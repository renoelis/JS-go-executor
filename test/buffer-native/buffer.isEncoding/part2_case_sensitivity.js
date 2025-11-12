// Buffer.isEncoding - part2: 大小写敏感性测试
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

// 大写形式
test('UTF8 大写应返回 true', () => {
  return Buffer.isEncoding('UTF8') === true;
});

test('UTF-8 大写应返回 true', () => {
  return Buffer.isEncoding('UTF-8') === true;
});

test('UTF16LE 大写应返回 true', () => {
  return Buffer.isEncoding('UTF16LE') === true;
});

test('UCS2 大写应返回 true', () => {
  return Buffer.isEncoding('UCS2') === true;
});

test('UCS-2 大写应返回 true', () => {
  return Buffer.isEncoding('UCS-2') === true;
});

test('BASE64 大写应返回 true', () => {
  return Buffer.isEncoding('BASE64') === true;
});

test('BASE64URL 大写应返回 true', () => {
  return Buffer.isEncoding('BASE64URL') === true;
});

test('LATIN1 大写应返回 true', () => {
  return Buffer.isEncoding('LATIN1') === true;
});

test('BINARY 大写应返回 true', () => {
  return Buffer.isEncoding('BINARY') === true;
});

test('HEX 大写应返回 true', () => {
  return Buffer.isEncoding('HEX') === true;
});

test('ASCII 大写应返回 true', () => {
  return Buffer.isEncoding('ASCII') === true;
});

// 混合大小写形式
test('Utf8 混合大小写应返回 true', () => {
  return Buffer.isEncoding('Utf8') === true;
});

test('uTf-8 混合大小写应返回 true', () => {
  return Buffer.isEncoding('uTf-8') === true;
});

test('Utf16Le 混合大小写应返回 true', () => {
  return Buffer.isEncoding('Utf16Le') === true;
});

test('Base64 混合大小写应返回 true', () => {
  return Buffer.isEncoding('Base64') === true;
});

test('Base64Url 混合大小写应返回 true', () => {
  return Buffer.isEncoding('Base64Url') === true;
});

test('Latin1 混合大小写应返回 true', () => {
  return Buffer.isEncoding('Latin1') === true;
});

test('Hex 混合大小写应返回 true', () => {
  return Buffer.isEncoding('Hex') === true;
});

test('Ascii 混合大小写应返回 true', () => {
  return Buffer.isEncoding('Ascii') === true;
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
