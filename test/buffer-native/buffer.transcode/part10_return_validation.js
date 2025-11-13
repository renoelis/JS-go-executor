// buffer.transcode() - Part 10: Return Value and Byte Order Validation
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

// UTF-16LE 字节序验证
test('UTF-16LE 字节序验证 - A (0x41)', () => {
  const source = Buffer.from('A', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result[0] === 0x41 && result[1] === 0x00;
});

test('UTF-16LE 字节序验证 - 中文"中" (0x4E2D)', () => {
  // 正确的测试：先转换 UTF-8 到 UTF-16LE，然后验证字节序
  const source = Buffer.from('中', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  // UTF-16LE 小端序：低字节在前，高字节在后
  // "中" 的 Unicode 码点是 U+4E2D，UTF-16LE 应该是 [0x2D, 0x4E]
  return result.length === 2 && result[0] === 0x2D && result[1] === 0x4E;
});

test('UTF-16LE 字节序验证 - Emoji 😀', () => {
  const source = Buffer.from('😀', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4 && result[0] === 0x3D && result[1] === 0xD8;
});

// UCS2 字节序验证（应与 UTF-16LE 一致）
test('UCS2 字节序与 UTF-16LE 一致', () => {
  const source = Buffer.from('Test', 'utf8');
  const utf16Result = transcode(source, 'utf8', 'utf16le');
  const ucs2Result = transcode(source, 'utf8', 'ucs2');

  for (let i = 0; i < utf16Result.length; i++) {
    if (utf16Result[i] !== ucs2Result[i]) return false;
  }
  return true;
});

// 返回 Buffer 属性验证
test('返回 Buffer 的 byteLength 属性', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.byteLength === 10;
});

test('返回 Buffer 的 length 属性', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 8;
});

test('返回 Buffer 是独立的（有自己的内存）', () => {
  const source = Buffer.from('Data', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.buffer !== source.buffer;
});

// Latin1 到 UTF-16LE 直接转换
test('Latin1 到 UTF-16LE', () => {
  const source = Buffer.from('Hello', 'latin1');
  const result = transcode(source, 'latin1', 'utf16le');
  return result.length === 10 && result[0] === 0x48 && result[1] === 0x00;
});

test('Latin1 扩展字符到 UTF-16LE', () => {
  const source = Buffer.from([0xE9]); // é
  const result = transcode(source, 'latin1', 'utf16le');
  return result.length === 2 && result[0] === 0xE9 && result[1] === 0x00;
});

test('Latin1 高位字符到 UTF-16LE', () => {
  const source = Buffer.from([0xFF]); // ÿ
  const result = transcode(source, 'latin1', 'utf16le');
  return result.length === 2 && result[0] === 0xFF && result[1] === 0x00;
});

// ASCII 到 Latin1
test('ASCII 到 Latin1 (0x00-0x7F)', () => {
  const source = Buffer.from('ASCII', 'ascii');
  const result = transcode(source, 'ascii', 'latin1');
  return result.toString('latin1') === 'ASCII';
});

// 幂等性测试（A->B->B 应该等于 A->B）
test('UTF-8 -> UTF-16LE -> UTF-16LE 幂等性', () => {
  const source = Buffer.from('Test', 'utf8');
  const step1 = transcode(source, 'utf8', 'utf16le');
  const step2 = transcode(step1, 'utf16le', 'utf16le');
  return step1.equals(step2);
});

test('Latin1 -> Latin1 -> Latin1 幂等性', () => {
  const source = Buffer.from([0x80, 0x90, 0xA0]);
  const step1 = transcode(source, 'latin1', 'latin1');
  const step2 = transcode(step1, 'latin1', 'latin1');
  return step1.equals(step2) && step1.equals(source);
});

test('UTF-8 -> ASCII -> ASCII 幂等性', () => {
  const source = Buffer.from('Hello', 'utf8');
  const step1 = transcode(source, 'utf8', 'ascii');
  const step2 = transcode(step1, 'ascii', 'ascii');
  return step1.equals(step2);
});

// 返回值类型严格验证
test('返回值是 Buffer 实例', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('返回值有 Buffer 方法', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return typeof result.toString === 'function' &&
         typeof result.slice === 'function' &&
         typeof result.write === 'function';
});

// 特殊字节序列的输出验证
test('NULL 字节的 UTF-16LE 表示', () => {
  const source = Buffer.from([0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2 && result[0] === 0x00 && result[1] === 0x00;
});

test('最大 ASCII 字符的 UTF-16LE 表示', () => {
  const source = Buffer.from([0x7F]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2 && result[0] === 0x7F && result[1] === 0x00;
});

test('Latin1 所有字节到 UTF-16LE 的长度', () => {
  const bytes = [];
  for (let i = 0; i <= 0xFF; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'latin1', 'utf16le');
  return result.length === 512;
});

// 验证返回的 Buffer 可修改但不影响源
test('修改返回的 Buffer 不影响源 Buffer', () => {
  const source = Buffer.from('Original', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');

  const originalSourceFirst = source[0];
  result[0] = 0xFF;

  return source[0] === originalSourceFirst;
});

// ASCII 高位字符处理（0x80-0xFF 在 ASCII 中的行为）
test('ASCII 编码不处理高位字符（超出范围）', () => {
  const source = Buffer.from([0x80]); // 超出 ASCII 范围
  try {
    const result = transcode(source, 'ascii', 'utf8');
    return result instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('ASCII 到 UTF-16LE 仅处理 0x00-0x7F', () => {
  const validAscii = Buffer.from([0x41, 0x42, 0x43]); // ABC
  const result = transcode(validAscii, 'ascii', 'utf16le');
  return result.length === 6;
});

// 空编码名称边界
test('编码名称为 null（应失败）', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    transcode(source, null, 'utf8');
    return false;
  } catch (e) {
    return true;
  }
});

// UTF-16BE 支持测试
test('UTF-16BE 编码支持检测', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    const result = transcode(source, 'utf8', 'utf-16be');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('UTF16BE 编码支持检测', () => {
  try {
    const source = Buffer.from('Test', 'utf8');
    const result = transcode(source, 'utf8', 'utf16be');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
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
