// buffer.transcode() - Part 4: Unicode and Surrogate Pairs Tests
const { Buffer, transcode } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// Surrogate Pairs 测试
test('有效代理对 - 😀 Emoji', () => {
  const source = Buffer.from('😀', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 4;
});

test('有效代理对 - 𝕳 Mathematical Bold', () => {
  const source = Buffer.from('𝕳', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('UTF-16LE 孤立高代理（应失败）', () => {
  const source = Buffer.from([0x00, 0xD8]); // 孤立高代理 0xD800
  try {
    const result = transcode(source, 'utf16le', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('INVALID_CHAR');
  }
});

test('UTF-16LE 孤立低代理（应失败）', () => {
  const source = Buffer.from([0x00, 0xDC]); // 孤立低代理 0xDC00
  try {
    const result = transcode(source, 'utf16le', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('INVALID_CHAR');
  }
});

test('UTF-16LE 反向代理对（应失败）', () => {
  const source = Buffer.from([0x00, 0xDC, 0x00, 0xD8]); // 低代理在前
  try {
    const result = transcode(source, 'utf16le', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('INVALID_CHAR');
  }
});

test('UTF-16LE 奇数字节（截断处理）', () => {
  const source = Buffer.from([0x48, 0x00, 0x65]); // 3 字节
  // Node.js v25.0.0 会截断最后一个字节，而不是抛出错误
  const result = transcode(source, 'utf16le', 'utf8');
  // 应该只转换前 2 个字节（'H'），最后一个字节被截断
  return result.length === 1 && result[0] === 0x48; // 'H'
});

// 多种 Unicode 平面
test('BMP 基本平面字符', () => {
  const source = Buffer.from('你好世界', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 8;
});

test('Supplementary Plane 字符（需代理对）', () => {
  const source = Buffer.from('𠀀𠀁', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 8;
});

test('混合 BMP 和 Supplementary Plane', () => {
  const source = Buffer.from('A😀B', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

// 特殊 Unicode 字符
test('零宽字符 - ZWSP (U+200B)', () => {
  const source = Buffer.from('\u200B', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('零宽连接符 - ZWJ (U+200D)', () => {
  const source = Buffer.from('\u200D', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('组合标记 - 结合变音符', () => {
  const source = Buffer.from('é', 'utf8'); // e + combining acute
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('表情符号序列 - 肤色修饰符', () => {
  const source = Buffer.from('👋🏻', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('表情符号序列 - ZWJ 序列', () => {
  const source = Buffer.from('👨‍👩‍👧‍👦', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

// Unicode 边界字符
test('U+0000 (NULL)', () => {
  const source = Buffer.from([0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('U+007F (DEL)', () => {
  const source = Buffer.from([0x7F]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('U+0080 (第一个 2 字节字符)', () => {
  const source = Buffer.from([0xC2, 0x80]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('U+07FF (最后一个 2 字节字符)', () => {
  const source = Buffer.from([0xDF, 0xBF]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('U+0800 (第一个 3 字节字符)', () => {
  const source = Buffer.from([0xE0, 0xA0, 0x80]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('U+FFFF (最后一个 BMP 字符)', () => {
  const source = Buffer.from([0xEF, 0xBF, 0xBF]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('U+10000 (第一个 Supplementary 字符)', () => {
  const source = Buffer.from([0xF0, 0x90, 0x80, 0x80]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4;
});

// 非字符 (Non-characters)
test('U+FFFE (非字符)', () => {
  const source = Buffer.from([0xEF, 0xBF, 0xBE]);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return result instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('U+FFFF (非字符)', () => {
  const source = Buffer.from([0xEF, 0xBF, 0xBF]);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return result instanceof Buffer;
  } catch (e) {
    return true;
  }
});

// 替换字符
test('U+FFFD (替换字符)', () => {
  const source = Buffer.from('�', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
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
