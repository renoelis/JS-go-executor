// buffer.transcode() - Part 1: Basic Functionality Tests
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

// 基本功能测试
test('UTF-8 转 UTF-16LE', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

test('UTF-8 转 Latin1', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'latin1');
  return result.toString('latin1') === 'Hello';
});

test('Latin1 转 UTF-8', () => {
  const source = Buffer.from('Hello', 'latin1');
  const result = transcode(source, 'latin1', 'utf8');
  return result.toString('utf8') === 'Hello';
});

test('UTF-16LE 转 UTF-8', () => {
  const source = Buffer.from('Hello', 'utf16le');
  const result = transcode(source, 'utf16le', 'utf8');
  return result.toString('utf8') === 'Hello';
});

test('ASCII 转 UTF-8', () => {
  const source = Buffer.from('Hello', 'ascii');
  const result = transcode(source, 'ascii', 'utf8');
  return result.toString('utf8') === 'Hello';
});

test('UTF-8 转 ASCII', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'ascii');
  return result.toString('ascii') === 'Hello';
});

test('UCS2 转 UTF-8', () => {
  const source = Buffer.from('Hello', 'ucs2');
  const result = transcode(source, 'ucs2', 'utf8');
  return result.toString('utf8') === 'Hello';
});

test('UTF-8 转 UCS2', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'ucs2');
  return result instanceof Buffer && result.length === 10;
});

// 空 Buffer 测试
test('空 Buffer 转码', () => {
  const source = Buffer.from([]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 0;
});

// 单字符测试
test('单字符 UTF-8 转 UTF-16LE', () => {
  const source = Buffer.from('A', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 2;
});

// 多字节字符测试
test('中文字符 UTF-8 转 UTF-16LE', () => {
  const source = Buffer.from('你好', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 4;
});

test('Emoji UTF-8 转 UTF-16LE', () => {
  const source = Buffer.from('😀', 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 4;
});

// Latin1 扩展字符
test('Latin1 扩展字符 (0x80-0xFF)', () => {
  const source = Buffer.from([0xE9]); // é in Latin1
  const result = transcode(source, 'latin1', 'utf8');
  return result.length === 2; // UTF-8 编码的 é 是 2 字节
});

// 相同编码转换
test('UTF-8 转 UTF-8 (无变化)', () => {
  const source = Buffer.from('Hello', 'utf8');
  const result = transcode(source, 'utf8', 'utf8');
  return result.equals(source);
});

test('Latin1 转 Latin1 (无变化)', () => {
  const source = Buffer.from('Hello', 'latin1');
  const result = transcode(source, 'latin1', 'latin1');
  return result.equals(source);
});

// Uint8Array 输入
test('Uint8Array 作为输入', () => {
  const source = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]);
  const result = transcode(source, 'utf8', 'utf16le');
  return result instanceof Buffer && result.length === 10;
});

// 长字符串
test('长字符串转码', () => {
  const longStr = 'A'.repeat(10000);
  const source = Buffer.from(longStr, 'utf8');
  const result = transcode(source, 'utf8', 'utf16le');
  return result.length === 20000;
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
