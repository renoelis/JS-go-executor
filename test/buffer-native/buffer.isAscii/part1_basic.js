// buffer.isAscii() - Part 1: Basic Functionality Tests
const { Buffer, isAscii } = require('buffer');

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
test('纯 ASCII 字符串 - Buffer', () => {
  const buf = Buffer.from('hello world', 'utf8');
  return isAscii(buf) === true;
});

test('纯 ASCII 字符 - 数字和符号', () => {
  const buf = Buffer.from('123!@#$%^&*()', 'utf8');
  return isAscii(buf) === true;
});

test('包含非 ASCII 字符 - 中文', () => {
  const buf = Buffer.from('你好', 'utf8');
  return isAscii(buf) === false;
});

test('包含非 ASCII 字符 - Emoji', () => {
  const buf = Buffer.from('hello 😀', 'utf8');
  return isAscii(buf) === false;
});

test('包含扩展 ASCII (128-255)', () => {
  const buf = Buffer.from([0x80, 0xFF]);
  return isAscii(buf) === false;
});

test('空 Buffer', () => {
  const buf = Buffer.from([]);
  return isAscii(buf) === true; // 空被视为有效 ASCII
});

test('单字节 ASCII', () => {
  const buf = Buffer.from([0x41]); // 'A'
  return isAscii(buf) === true;
});

test('ASCII 边界值 - 0x00', () => {
  const buf = Buffer.from([0x00]);
  return isAscii(buf) === true;
});

test('ASCII 边界值 - 0x7F', () => {
  const buf = Buffer.from([0x7F]);
  return isAscii(buf) === true;
});

test('非 ASCII 边界值 - 0x80', () => {
  const buf = Buffer.from([0x80]);
  return isAscii(buf) === false;
});

// Uint8Array 测试
test('Uint8Array - ASCII', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
  return isAscii(arr) === true;
});

test('Uint8Array - 非 ASCII', () => {
  const arr = new Uint8Array([0x48, 0x65, 0x80]);
  return isAscii(arr) === false;
});

// ArrayBuffer 测试
test('ArrayBuffer - ASCII', () => {
  const ab = new ArrayBuffer(5);
  const view = new Uint8Array(ab);
  view[0] = 0x48; // H
  view[1] = 0x65; // e
  view[2] = 0x6C; // l
  view[3] = 0x6C; // l
  view[4] = 0x6F; // o
  return isAscii(ab) === true;
});

test('ArrayBuffer - 非 ASCII', () => {
  const ab = new ArrayBuffer(2);
  const view = new Uint8Array(ab);
  view[0] = 0x48;
  view[1] = 0x80;
  return isAscii(ab) === false;
});

// 其他 TypedArray
test('Uint16Array', () => {
  const arr = new Uint16Array([0x0048, 0x0065]); // 注意字节序
  return typeof isAscii(arr) === 'boolean';
});

test('所有可打印 ASCII 字符', () => {
  const chars = [];
  for (let i = 0x20; i <= 0x7E; i++) {
    chars.push(i);
  }
  const buf = Buffer.from(chars);
  return isAscii(buf) === true;
});

test('包含控制字符的 ASCII', () => {
  const buf = Buffer.from([0x09, 0x0A, 0x0D]); // Tab, LF, CR
  return isAscii(buf) === true;
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
