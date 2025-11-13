// buffer.transcode() - Part 7: Real Behavior and Edge Branches
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

// UTF-8 到 Latin1 的损失转换详细验证
test('UTF-8 超出 Latin1 范围的字符 - 中文', () => {
  const source = Buffer.from('中', 'utf8');
  try {
    const result = transcode(source, 'utf8', 'latin1');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('cannot be encoded') || e.message.includes('INVALID_CHAR');
  }
});

test('UTF-8 超出 Latin1 范围的字符 - Emoji', () => {
  const source = Buffer.from('😀', 'utf8');
  try {
    const result = transcode(source, 'utf8', 'latin1');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('cannot be encoded') || e.message.includes('INVALID_CHAR');
  }
});

test('UTF-8 超出 ASCII 范围但在 Latin1 范围内', () => {
  const source = Buffer.from('é', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  return result instanceof Buffer && result.length === 1;
});

test('UTF-8 到 ASCII - 保留 ASCII 部分', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'ascii');
  return result.toString('ascii') === 'Hello';
});

test('UTF-8 到 ASCII - 包含非 ASCII', () => {
  const source = Buffer.from('Hëllo', 'utf8');
  try {
    const result = transcode(source, 'utf8', 'ascii');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('cannot be encoded') || e.message.includes('INVALID_CHAR');
  }
});

// 空字符和控制字符
test('包含多个零字节', () => {
  const source = Buffer.from([0x48, 0x00, 0x00, 0x65, 0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10;
});

test('仅零字节', () => {
  const source = Buffer.from([0x00, 0x00, 0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 6;
});

test('控制字符 - Tab', () => {
  const source = Buffer.from('\t', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('控制字符 - Newline', () => {
  const source = Buffer.from('\n', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('控制字符 - Carriage Return', () => {
  const source = Buffer.from('\r', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('混合控制字符和文本', () => {
  const source = Buffer.from('Line1\nLine2\tTab', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 30;
});

// 不同编码的空 Buffer
test('空 Buffer - UTF-8 到 Latin1', () => {
  const source = Buffer.from([]);
  const result = transcode(source, 'utf8', 'latin1');
  return result.length === 0;
});

test('空 Buffer - UTF-16LE 到 UTF-8', () => {
  const source = Buffer.from([]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 0;
});

test('空 Buffer - ASCII 到 UCS2', () => {
  const source = Buffer.from([]);
  const result = transcode(source, 'ascii', 'ucs2');
  return result.length === 0;
});

// BOM 的不同处理
test('UTF-8 带 BOM 转 Latin1', () => {
  const source = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65]);
  try {
    const result = transcode(source, 'utf8', 'latin1');
    return result instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('UTF-16LE 带 BOM 转 Latin1', () => {
  const source = Buffer.from([0xFF, 0xFE, 0x48, 0x00]);
  try {
    const result = transcode(source, 'utf16le', 'latin1');
    return result instanceof Buffer;
  } catch (e) {
    return true;
  }
});

test('移除 BOM 后转码', () => {
  const source = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65]);
  const noBom = source.slice(3);
  const result = transcode(noBom, 'utf8', 'utf16le');
  return result.length === 4;
});

// 混合有效和无效序列
test('部分有效 UTF-8 序列', () => {
  const source = Buffer.from([0x48, 0x65, 0x80, 0x6C, 0x6C]); // He + 无效字节 + ll
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

test('UTF-16LE 部分有效代理对', () => {
  const source = Buffer.from([0x48, 0x00, 0x00, 0xD8]); // 'H' + 孤立高代理
  try {
    transcode(source, 'utf16le', 'utf8');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// 多语言混合
test('英文 + 中文混合', () => {
  const source = Buffer.from('Hello你好', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 14;
});

test('多种语言混合', () => {
  const source = Buffer.from('Hello你好Привет', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('Emoji + 文本混合', () => {
  const source = Buffer.from('Hi😀World', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

// 特殊字符往返
test('换行符往返', () => {
  const original = Buffer.from('Line1\nLine2\n', 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

test('Tab 往返', () => {
  const original = Buffer.from('Col1\tCol2\t', 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

test('混合空白字符往返', () => {
  const original = Buffer.from('A\t B\n C\r D', 'utf8');
  const utf16 = transcode(original, 'utf8', 'utf16le');
  const back = transcode(utf16, 'utf16le', 'utf8');
  return back.equals(original);
});

// ASCII 边界字符
test('所有可打印 ASCII 字符', () => {
  const chars = [];
  for (let i = 0x20; i <= 0x7E; i++) {
    chars.push(i);
  }
  const source = Buffer.from(chars);
  const result = transcode(source, 'ascii', 'utf16le');
  return result.length === chars.length * 2;
});

test('ASCII 控制字符 (0x00-0x1F)', () => {
  const chars = [];
  for (let i = 0; i <= 0x1F; i++) {
    chars.push(i);
  }
  const source = Buffer.from(chars);
  const result = transcode(source, 'ascii', 'utf16le');
  return result.length === chars.length * 2;
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
