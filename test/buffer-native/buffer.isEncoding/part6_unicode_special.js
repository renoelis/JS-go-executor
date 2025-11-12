// Buffer.isEncoding - part6: Unicode 和特殊字符编码名称
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

// Unicode 字符编码名称
test('包含中文字符的编码名应返回 false', () => {
  return Buffer.isEncoding('UTF八') === false;
});

test('包含日文字符的编码名应返回 false', () => {
  return Buffer.isEncoding('ユーティーエフ８') === false;
});

test('包含韩文字符的编码名应返回 false', () => {
  return Buffer.isEncoding('유티에프８') === false;
});

test('包含表情符号的编码名应返回 false', () => {
  return Buffer.isEncoding('utf8😀') === false;
});

test('包含特殊 Unicode 字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u00008') === false;
});

// 零宽度字符
test('包含零宽度空格的 utf8 应返回 false', () => {
  return Buffer.isEncoding('utf\u200B8') === false;
});

test('包含零宽度非连字符的 utf8 应返回 false', () => {
  return Buffer.isEncoding('utf\uFEFF8') === false;
});

// 不可见字符
test('包含零宽度连字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u200D8') === false;
});

test('包含软连字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u00AD8') === false;
});

// 同形异义字符
test('使用西里尔字母的 utf8（外观相似但不同字符）应返回 false', () => {
  return Buffer.isEncoding('utf\u04308') === false;
});

// 控制字符
test('包含退格符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\b8') === false;
});

test('包含删除符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\x7F8') === false;
});

test('包含响铃符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\x078') === false;
});

// 组合字符
test('包含组合重音符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf8\u0301') === false;
});

test('包含组合分音符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf8\u0308') === false;
});

// 右到左标记
test('包含右到左标记的编码名应返回 false', () => {
  return Buffer.isEncoding('\u202Eutf8') === false;
});

test('包含左到右标记的编码名应返回 false', () => {
  return Buffer.isEncoding('\u202Dutf8') === false;
});

// 特殊引号和符号
test('使用全角字符的 utf8 应返回 false', () => {
  return Buffer.isEncoding('ｕｔｆ８') === false;
});

test('包含上标字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf⁸') === false;
});

test('包含下标字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf₈') === false;
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
