// buffer.transcode() - Part 9: Extreme Cases and Compatibility Tests
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

// 极端长度测试
test('接近 Buffer 最大长度限制（模拟 5MB）', () => {
  try {
    const size = 5 * 1024 * 1024;
    const source = Buffer.alloc(size);
    source.fill('A');
    const result = transcode(source, 'utf8', 'utf16le');
    return result.length === size * 2;
  } catch (e) {
    return e.message.includes('Cannot create') || e.message.includes('Invalid');
  }
});

test('超大 Buffer（模拟 10MB）', () => {
  try {
    const size = 10 * 1024 * 1024;
    const source = Buffer.alloc(size);
    source.fill(0x41);
    const result = transcode(source, 'utf8', 'utf16le');
    return result.length === size * 2;
  } catch (e) {
    return e.message.includes('Cannot create') || e.message.includes('Invalid');
  }
});

// 连续边界字节测试
test('连续 0xFF 字节（Latin1）', () => {
  const source = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 8;
});

test('连续 0x00 字节', () => {
  const source = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 10;
});

test('交替 0x00 和 0xFF', () => {
  const source = Buffer.from([0x00, 0xFF, 0x00, 0xFF]);
  try {
    const result = transcode(source, 'utf8', 'utf16le');
    return result instanceof Buffer;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// UTF-8 所有多字节边界
test('UTF-8 所有 1 字节边界 (0x00-0x7F)', () => {
  const bytes = [];
  for (let i = 0; i <= 0x7F; i++) {
    bytes.push(i);
  }
  const source = Buffer.from(bytes);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 256;
});

test('UTF-8 2 字节序列边界 - 最小值 U+0080', () => {
  const source = Buffer.from([0xC2, 0x80]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 2 字节序列边界 - 最大值 U+07FF', () => {
  const source = Buffer.from([0xDF, 0xBF]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 3 字节序列边界 - 最小值 U+0800', () => {
  const source = Buffer.from([0xE0, 0xA0, 0x80]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 3 字节序列边界 - 最大值 U+FFFF', () => {
  const source = Buffer.from([0xEF, 0xBF, 0xBF]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

test('UTF-8 4 字节序列边界 - 最小值 U+10000', () => {
  const source = Buffer.from([0xF0, 0x90, 0x80, 0x80]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4;
});

test('UTF-8 4 字节序列边界 - 最大有效值 U+10FFFF', () => {
  const source = Buffer.from([0xF4, 0x8F, 0xBF, 0xBF]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 4;
});

test('UTF-8 4 字节序列 - 超出范围 U+110000（应失败）', () => {
  const source = Buffer.from([0xF4, 0x90, 0x80, 0x80]);
  try {
    transcode(source, 'utf8', 'utf16le');
    return false;
  } catch (e) {
    return e.message.includes('Unable to transcode');
  }
});

// UTF-16LE 代理对详细边界
test('UTF-16LE 高代理范围起始 0xD800', () => {
  const source = Buffer.from([0x00, 0xD8, 0x00, 0xDC]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 4;
});

test('UTF-16LE 高代理范围结束 0xDBFF', () => {
  const source = Buffer.from([0xFF, 0xDB, 0xFF, 0xDF]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 4;
});

test('UTF-16LE 低代理范围起始 0xDC00', () => {
  const source = Buffer.from([0x00, 0xD8, 0x00, 0xDC]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result instanceof Buffer;
});

test('UTF-16LE 低代理范围结束 0xDFFF', () => {
  const source = Buffer.from([0x00, 0xD8, 0xFF, 0xDF]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result instanceof Buffer;
});

// 所有编码的空字符处理
test('UTF-8 空字符 U+0000', () => {
  const source = Buffer.from([0x00]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.equals(Buffer.from([0x00, 0x00]));
});

test('Latin1 空字符', () => {
  const source = Buffer.from([0x00]);
  const result = transcode(source, 'latin1', 'utf8');
  return result.equals(Buffer.from([0x00]));
});

test('UTF-16LE 空字符', () => {
  const source = Buffer.from([0x00, 0x00]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.equals(Buffer.from([0x00]));
});

// 非规范化 Unicode
test('Unicode 规范等价 - é (单一字符)', () => {
  const source = Buffer.from('\u00E9', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

test('Unicode 规范等价 - é (组合字符)', () => {
  const source = Buffer.from('e\u0301', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer;
});

// 编码名称特殊格式
test('编码名称全大写 - UTF8', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'UTF8', 'UTF16LE');
  return result instanceof Buffer;
});

test('编码名称全大写 - LATIN1', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'UTF8', 'LATIN1');
  return result instanceof Buffer;
});

test('编码名称全大写 - ASCII', () => {
  const source = Buffer.from('Test', 'utf8');
  const result = transcode(source, 'UTF8', 'ASCII');
  return result instanceof Buffer;
});

// 奇数和偶数长度的 UTF-16LE
test('UTF-16LE 偶数字节 - 2 字节', () => {
  const source = Buffer.from([0x48, 0x00]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 1;
});

test('UTF-16LE 偶数字节 - 4 字节', () => {
  const source = Buffer.from([0x48, 0x00, 0x65, 0x00]);
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 2;
});

test('UTF-16LE 偶数字节 - 100 字节', () => {
  const source = Buffer.alloc(100);
  for (let i = 0; i < 50; i++) {
    source[i * 2] = 0x41;
    source[i * 2 + 1] = 0x00;
  }
  const result = transcode(source, 'utf16le', 'utf8');
  return result.length === 50;
});

// 不同 TypedArray 缓冲区共享
test('Uint8Array 共享 ArrayBuffer', () => {
  const ab = new ArrayBuffer(10);
  const view1 = new Uint8Array(ab, 0, 5);
  const view2 = new Uint8Array(ab, 5, 5);

  view1[0] = 0x48;
  view1[1] = 0x65;
  view1[2] = 0x6C;
  view1[3] = 0x6C;
  view1[4] = 0x6F;

  const result = transcode(view1, 'utf8', 'utf16le');
  return result.length === 10;
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
