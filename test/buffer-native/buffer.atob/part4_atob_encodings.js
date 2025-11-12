// buffer.atob() - Part 4: base64 编码边界与特殊字符测试
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

// 所有合法 base64 字符集
test('编码：base64 字符集 A-Z', () => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const encoded = Buffer.from(charset).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== charset) {
    throw new Error(`解码失败`);
  }
  return true;
});

test('编码：base64 字符集 a-z', () => {
  const charset = 'abcdefghijklmnopqrstuvwxyz';
  const encoded = Buffer.from(charset).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== charset) {
    throw new Error(`解码失败`);
  }
  return true;
});

test('编码：base64 字符集 0-9', () => {
  const charset = '0123456789';
  const encoded = Buffer.from(charset).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== charset) {
    throw new Error(`解码失败`);
  }
  return true;
});

test('编码：base64 特殊字符 +/', () => {
  const charset = '+/';
  const encoded = Buffer.from(charset).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== charset) {
    throw new Error(`解码失败`);
  }
  return true;
});

// 二进制数据
test('编码：二进制数据（全 0）', () => {
  const buf = Buffer.alloc(8, 0);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  // 验证长度和内容
  if (decoded.length !== 8) {
    throw new Error(`期望长度 8, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < decoded.length; i++) {
    if (decoded.charCodeAt(i) !== 0) {
      throw new Error(`位置 ${i} 应为 0`);
    }
  }
  return true;
});

test('编码：二进制数据（全 255）', () => {
  const buf = Buffer.alloc(8, 255);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 8) {
    throw new Error(`期望长度 8, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < decoded.length; i++) {
    if (decoded.charCodeAt(i) !== 255) {
      throw new Error(`位置 ${i} 应为 255, 实际 ${decoded.charCodeAt(i)}`);
    }
  }
  return true;
});

test('编码：二进制数据（0-255 递增）', () => {
  const buf = Buffer.from([0, 1, 2, 3, 4, 5, 127, 128, 255]);
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 9) {
    throw new Error(`期望长度 9, 实际 ${decoded.length}`);
  }
  const expected = [0, 1, 2, 3, 4, 5, 127, 128, 255];
  for (let i = 0; i < expected.length; i++) {
    if (decoded.charCodeAt(i) !== expected[i]) {
      throw new Error(`位置 ${i} 期望 ${expected[i]}, 实际 ${decoded.charCodeAt(i)}`);
    }
  }
  return true;
});

// Latin1 字符（0-255）
test('编码：Latin1 字符范围', () => {
  let original = '';
  for (let i = 0; i < 256; i++) {
    original += String.fromCharCode(i);
  }
  const encoded = Buffer.from(original, 'latin1').toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 256) {
    throw new Error(`期望长度 256, 实际 ${decoded.length}`);
  }
  for (let i = 0; i < 256; i++) {
    if (decoded.charCodeAt(i) !== i) {
      throw new Error(`位置 ${i} 期望 ${i}, 实际 ${decoded.charCodeAt(i)}`);
    }
  }
  return true;
});

// 不同填充情况
test('编码：无填充（长度 % 3 === 0）', () => {
  const original = 'abc';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

test('编码：一个填充（长度 % 3 === 2）', () => {
  const original = 'ab';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

test('编码：两个填充（长度 % 3 === 1）', () => {
  const original = 'a';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`期望 "${original}", 实际 "${decoded}"`);
  }
  return true;
});

// URL-safe base64（带 - 和 _）
test('编码：URL-safe base64 字符（-）', () => {
  try {
    // 标准 base64 用 +，URL-safe 用 -
    const decoded = atob('SGVsbG8-');
    // 可能接受或拒绝
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('编码：URL-safe base64 字符（_）', () => {
  try {
    // 标准 base64 用 /，URL-safe 用 _
    const decoded = atob('SGVsbG8_');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 特殊控制字符
test('编码：包含 null 字节', () => {
  const buf = Buffer.from([72, 101, 108, 0, 108, 111]); // "Hel\0lo"
  const encoded = buf.toString('base64');
  const decoded = atob(encoded);
  if (decoded.length !== 6) {
    throw new Error(`期望长度 6, 实际 ${decoded.length}`);
  }
  if (decoded.charCodeAt(3) !== 0) {
    throw new Error(`位置 3 应为 null 字节`);
  }
  return true;
});

test('编码：包含换行符（0x0A）', () => {
  const original = 'Hello\nWorld';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`换行符编码失败`);
  }
  return true;
});

test('编码：包含回车符（0x0D）', () => {
  const original = 'Hello\rWorld';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`回车符编码失败`);
  }
  return true;
});

test('编码：包含制表符（0x09）', () => {
  const original = 'Hello\tWorld';
  const encoded = Buffer.from(original).toString('base64');
  const decoded = atob(encoded);
  if (decoded !== original) {
    throw new Error(`制表符编码失败`);
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
