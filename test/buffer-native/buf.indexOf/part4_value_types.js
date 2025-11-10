// buf.indexOf() - Value Types Tests
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

// String 类型测试
test('String - 单个字符', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('h') === 0;
});

test('String - 多个字符', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf('world') === 6;
});

test('String - 空字符串', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('') === 0;
});

test('String - 空字符串带偏移', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 3) === 3;
});

test('String - 空字符串偏移等于长度', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 5) === 5;
});

test('String - 空字符串偏移超出长度', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf('', 10) === 5;
});

// Buffer 类型测试
test('Buffer - 查找 Buffer', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf(Buffer.from('world')) === 6;
});

test('Buffer - 空 Buffer', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0)) === 0;
});

test('Buffer - 空 Buffer 带偏移', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(Buffer.alloc(0), 3) === 3;
});

test('Buffer - 单字节 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from([3])) === 2;
});

test('Buffer - 多字节 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(Buffer.from([3, 4, 5])) === 2;
});

test('Buffer - 部分匹配', () => {
  const buf = Buffer.from('this is a buffer');
  const search = Buffer.from('a buffer example');
  return buf.indexOf(search.subarray(0, 8)) === 8;
});

// Uint8Array 类型测试
test('Uint8Array - 查找', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(new Uint8Array([3, 4])) === 2;
});

test('Uint8Array - 空数组', () => {
  const buf = Buffer.from('hello');
  return buf.indexOf(new Uint8Array(0)) === 0;
});

test('Uint8Array - 单元素', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(new Uint8Array([3])) === 2;
});

// Number 类型测试
test('Number - 查找字节值', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  return buf.indexOf(3) === 2;
});

test('Number - ASCII 值', () => {
  const buf = Buffer.from('hello world');
  return buf.indexOf(111) === 4; // 'o' 的 ASCII 值
});

test('Number - 0', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(0) === 0;
});

test('Number - 255', () => {
  const buf = Buffer.from([1, 2, 255, 4]);
  return buf.indexOf(255) === 2;
});

test('Number - 超出范围自动取模 (256)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(256) === 0; // 256 % 256 = 0
});

test('Number - 超出范围自动取模 (257)', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(257) === 1; // 257 % 256 = 1
});

test('Number - 超出范围 (256 + 99)', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(256 + 99) === 2; // 等同于查找 99 ('c')
});

test('Number - 浮点数转整数', () => {
  const buf = Buffer.from('abcdef');
  return buf.indexOf(99.9) === 2; // 转为 99
});

test('Number - 负数', () => {
  const buf = Buffer.from([0, 1, 2, 3]);
  return buf.indexOf(-1) === -1; // -1 转为 255，但 buffer 中没有，应该返回 -1
});

test('Number - 负数取模', () => {
  const buf = Buffer.from([0, 1, 255, 3]);
  return buf.indexOf(-1) === 2; // -1 & 0xFF = 255
});

// 空 Buffer 测试
test('空 Buffer - 查找任何值', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf('hello') === -1;
});

test('空 Buffer - 查找空字符串', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf('') === 0;
});

test('空 Buffer - 查找数字', () => {
  const buf = Buffer.alloc(0);
  return buf.indexOf(0) === -1;
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
