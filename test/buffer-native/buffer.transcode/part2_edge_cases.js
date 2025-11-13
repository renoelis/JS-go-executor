// buffer.transcode() - Part 2: Edge Cases and Error Handling
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

// 错误处理测试
test('TypeError: 非 Buffer/TypedArray 输入', () => {
  try {
    transcode('Hello', 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: null 输入', () => {
  try {
    transcode(null, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: undefined 输入', () => {
  try {
    transcode(undefined, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 数字输入', () => {
  try {
    transcode(123, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 普通数组输入', () => {
  try {
    transcode([1, 2, 3], 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('TypeError: 不支持的源编码', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'invalid-encoding', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('ILLEGAL_ARGUMENT');
  }
});

test('TypeError: 不支持的目标编码', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8', 'invalid-encoding');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('ILLEGAL_ARGUMENT');
  }
});

test('TypeError: hex 编码不支持', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8', 'hex');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('ILLEGAL_ARGUMENT');
  }
});

test('TypeError: base64 编码不支持', () => {
  try {
    const source = Buffer.from('Hello', 'utf8');
    transcode(source, 'utf8', 'base64');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode') || e.message.includes('ILLEGAL_ARGUMENT');
  }
});

// 无效 UTF-8 序列处理（会抛出错误）
test('无效 UTF-8 序列 - 孤立延续字节（会报错）', () => {
  const source = Buffer.from([0x80]);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unable to transcode') && e.message.includes('INVALID_CHAR');
  }
});

test('无效 UTF-8 序列 - 不完整序列（会报错）', () => {
  const source = Buffer.from([0xC2]); // 2 字节序列的起始但缺少延续
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unable to transcode') && e.message.includes('INVALID_CHAR');
  }
});

test('无效 UTF-8 序列 - 过长编码（会报错）', () => {
  const source = Buffer.from([0xC0, 0x80]); // 过长编码
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return false; // 应该抛出错误
  } catch (e) {
    return e.message.includes('Unable to transcode') && e.message.includes('INVALID_CHAR');
  }
});

// Latin1 到 UTF-8 的所有字节
test('Latin1 所有字节 (0x00-0xFF) 转 UTF-8', () => {
  const bytes = [];
  for (let i = 0; i <= 0xFF; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length >= 256; // UTF-8 编码会更长
});

// UTF-8 到 Latin1 的损失转换
test('UTF-8 到 Latin1 - 超出范围字符', () => {
  const source = Buffer.from('你好', 'utf8'); // 中文字符超出 Latin1 范围
  try {
    const result = transcode(source, 'utf8', 'latin1');
    return result instanceof Buffer; // 可能替换为 ? 或其他字符
  } catch (e) {
    return e.message.includes('cannot be encoded');
  }
});

test('UTF-8 到 ASCII - 超出范围字符', () => {
  const source = Buffer.from([0xC2, 0xA9]); // © 符号
  try {
    const result = transcode(source, 'utf8', 'ascii');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('cannot be encoded');
  }
});

// 字节序标记 (BOM)
test('UTF-8 BOM 转 UTF-16LE', () => {
  const source = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65]); // BOM + "He"
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('UTF-16LE BOM 转 UTF-8', () => {
  const source = Buffer.from([0xFF, 0xFE, 0x48, 0x00, 0x65, 0x00]); // BOM + "He"
  const result = transcode(source, 'utf16le', 'utf8');
  return result instanceof Buffer;
});

// 大小写编码名称
test('编码名称大小写不敏感 - UTF8', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'UTF8', 'UTF16LE');
  return result instanceof Buffer;
});

test('编码名称大小写不敏感 - utf-8', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf-8', 'utf-16le');
  return result instanceof Buffer;
});

// 特殊 TypedArray（不支持）
test('Int8Array 作为输入（不支持）', () => {
  const source = new Int8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError && e.message.includes('Buffer or Uint8Array');
  }
});

test('Uint16Array 作为输入（不支持）', () => {
  const source = new Uint16Array([0x0048, 0x0065, 0x006C, 0x006C, 0x006F]);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return false; // 应该抛出错误
  } catch (e) {
    return e instanceof TypeError && e.message.includes('Buffer or Uint8Array');
  }
});

// 零字节
test('包含零字节的转码', () => {
  const source = Buffer.from([0x48, 0x00, 0x65]); // "H\0e"
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 6;
});

// 往返转换
test('UTF-8 -> UTF-16LE -> UTF-8 往返', () => {
  const original = Buffer.from('Hello World', 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

test('Latin1 -> UTF-8 -> Latin1 往返 (ASCII 范围)', () => {
  const original = Buffer.from('Hello', 'latin1');
  const utf8 = transcode(original, 'latin1', 'utf8');
  const back = transcode(utf8, 'utf8', 'latin1');
  return back.equals(original);
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
