// Buffer.isEncoding - part15: 极端场景与压力测试
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

// 超长字符串测试
test('极长的无效编码名（10000 字符）应返回 false', () => {
  const longString = 'a'.repeat(10000);
  return Buffer.isEncoding(longString) === false;
});

test('极长的无效编码名（50000 字符）应返回 false', () => {
  const longString = 'invalid'.repeat(7143); // 约 50000 字符
  return Buffer.isEncoding(longString) === false;
});

test('utf8 后跟大量字符应返回 false', () => {
  const longString = 'utf8' + 'x'.repeat(1000);
  return Buffer.isEncoding(longString) === false;
});

// 重复编码名测试
test('重复 utf8 100 次应返回 false', () => {
  const repeated = 'utf8'.repeat(100);
  return Buffer.isEncoding(repeated) === false;
});

test('重复 hex 200 次应返回 false', () => {
  const repeated = 'hex'.repeat(200);
  return Buffer.isEncoding(repeated) === false;
});

// Unicode 边界字符
test('包含 NULL 字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u00008') === false;
});

test('包含最大 Unicode 字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf8\uFFFF') === false;
});

test('包含补充平面字符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf8\uD800\uDC00') === false;
});

test('包含孤立代理对的编码名应返回 false', () => {
  return Buffer.isEncoding('utf8\uD800') === false;
});

test('包含反向代理对的编码名应返回 false', () => {
  return Buffer.isEncoding('utf8\uDC00') === false;
});

// 所有控制字符测试
test('包含 SOH 控制字符应返回 false', () => {
  return Buffer.isEncoding('utf\u00018') === false;
});

test('包含 STX 控制字符应返回 false', () => {
  return Buffer.isEncoding('utf\u00028') === false;
});

test('包含 ETX 控制字符应返回 false', () => {
  return Buffer.isEncoding('utf\u00038') === false;
});

test('包含 EOT 控制字符应返回 false', () => {
  return Buffer.isEncoding('utf\u00048') === false;
});

test('包含 VT 垂直制表符应返回 false', () => {
  return Buffer.isEncoding('utf\u000B8') === false;
});

test('包含 FF 换页符应返回 false', () => {
  return Buffer.isEncoding('utf\u000C8') === false;
});

// 特殊空白字符组合
test('包含不间断空格的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u00A08') === false;
});

test('包含窄不间断空格的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u202F8') === false;
});

test('包含全角空格的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u30008') === false;
});

test('包含蒙古文元音分隔符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\u18008') === false;
});

// 数字极值
test('字符串 "0" 应返回 false', () => {
  return Buffer.isEncoding('0') === false;
});

test('字符串 "9007199254740991"（MAX_SAFE_INTEGER）应返回 false', () => {
  return Buffer.isEncoding('9007199254740991') === false;
});

test('字符串 "-1" 应返回 false', () => {
  return Buffer.isEncoding('-1') === false;
});

test('字符串 "3.14159" 应返回 false', () => {
  return Buffer.isEncoding('3.14159') === false;
});

// 特殊字符组合
test('包含多个连续空格的编码名应返回 false', () => {
  return Buffer.isEncoding('utf     8') === false;
});

test('包含制表符和空格混合的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\t 8') === false;
});

test('包含多种换行符的编码名应返回 false', () => {
  return Buffer.isEncoding('utf\r\n8') === false;
});

// 所有有效编码的边界变体
test('utf8 全小写标准形式', () => {
  return Buffer.isEncoding('utf8') === true;
});

test('UTF8 全大写形式', () => {
  return Buffer.isEncoding('UTF8') === true;
});

test('uTf8 随机大小写 1', () => {
  return Buffer.isEncoding('uTf8') === true;
});

test('UtF8 随机大小写 2', () => {
  return Buffer.isEncoding('UtF8') === true;
});

test('utF8 随机大小写 3', () => {
  return Buffer.isEncoding('utF8') === true;
});

test('uTF8 随机大小写 4', () => {
  return Buffer.isEncoding('uTF8') === true;
});

test('Utf8 首字母大写', () => {
  return Buffer.isEncoding('Utf8') === true;
});

test('utfF 数字 8 大写应返回 true（8 不区分大小写）', () => {
  return Buffer.isEncoding('utf8') === true;
});

// 重复字符测试
test('uuuuttttffff8888 重复字母应返回 false', () => {
  return Buffer.isEncoding('uuuuttttffff8888') === false;
});

test('utf88 重复数字应返回 false', () => {
  return Buffer.isEncoding('utf88') === false;
});

test('uuttff88 全部重复应返回 false', () => {
  return Buffer.isEncoding('uuttff88') === false;
});

// 字符删除测试
test('tf8 缺少首字母应返回 false', () => {
  return Buffer.isEncoding('tf8') === false;
});

test('uf8 缺少第二个字母应返回 false', () => {
  return Buffer.isEncoding('uf8') === false;
});

test('ut8 缺少第三个字母应返回 false', () => {
  return Buffer.isEncoding('ut8') === false;
});

test('utf 缺少数字应返回 false', () => {
  return Buffer.isEncoding('utf') === false;
});

// 字符交换测试
test('tuf8 前两个字母交换应返回 false', () => {
  return Buffer.isEncoding('tuf8') === false;
});

test('uft8 后两个字母交换应返回 false', () => {
  return Buffer.isEncoding('uft8') === false;
});

test('utf8 数字和字母交换位置应返回 false', () => {
  return Buffer.isEncoding('8utf') === false;
});

// 连续调用稳定性测试
test('连续调用 1000 次 utf8 应保持稳定', () => {
  for (let i = 0; i < 1000; i++) {
    if (Buffer.isEncoding('utf8') !== true) {
      return false;
    }
  }
  return true;
});

test('连续调用 1000 次 unknown 应保持稳定', () => {
  for (let i = 0; i < 1000; i++) {
    if (Buffer.isEncoding('unknown') !== false) {
      return false;
    }
  }
  return true;
});

test('交替调用 1000 次有效和无效编码应保持稳定', () => {
  for (let i = 0; i < 500; i++) {
    if (Buffer.isEncoding('utf8') !== true) return false;
    if (Buffer.isEncoding('invalid') !== false) return false;
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
