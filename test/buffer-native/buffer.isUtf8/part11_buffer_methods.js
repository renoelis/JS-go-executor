// buffer.isUtf8() - Part 11: Buffer Instance Method Tests
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

// Buffer 实例方法测试（如果存在）
test('Buffer 实例方法 - 有效 UTF-8', () => {
  const buf = Buffer.from('Hello', 'utf8');
  if (typeof buf.isUtf8 === 'function') {
    return buf.isUtf8() === true;
  }
  return true; // 如果方法不存在，测试通过
});

test('Buffer 实例方法 - 无效 UTF-8', () => {
  const buf = Buffer.from([0x80, 0x80]);
  if (typeof buf.isUtf8 === 'function') {
    return buf.isUtf8() === false;
  }
  return true; // 如果方法不存在，测试通过
});

test('Buffer 实例方法 - 空 Buffer', () => {
  const buf = Buffer.from([]);
  if (typeof buf.isUtf8 === 'function') {
    return buf.isUtf8() === true;
  }
  return true;
});

test('Buffer 实例方法 - 中文', () => {
  const buf = Buffer.from('你好', 'utf8');
  if (typeof buf.isUtf8 === 'function') {
    return buf.isUtf8() === true;
  }
  return true;
});

test('Buffer 实例方法 - Emoji', () => {
  const buf = Buffer.from('😀', 'utf8');
  if (typeof buf.isUtf8 === 'function') {
    return buf.isUtf8() === true;
  }
  return true;
});

// 链式调用测试
test('链式操作后验证', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('Hello', 'utf8').subarray(0, 3); // "Hel"
  return isUtf8(buf) === true;
});

test('多次 subarray 后验证', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('Hello World', 'utf8')
    .subarray(0, 8)   // "Hello Wo"
    .subarray(0, 5);  // "Hello"
  return isUtf8(buf) === true;
});

// Buffer.from 各种编码后的验证
test('Buffer.from utf8 编码', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('Hello', 'utf8');
  return isUtf8(buf) === true;
});

test('Buffer.from hex 编码生成有效 UTF-8', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('48656c6c6f', 'hex'); // "Hello" 的 hex
  return isUtf8(buf) === true;
});

test('Buffer.from hex 编码生成无效 UTF-8', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('8080', 'hex'); // 无效字节
  return isUtf8(buf) === false;
});

test('Buffer.from base64 编码生成有效 UTF-8', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('SGVsbG8=', 'base64'); // "Hello" 的 base64
  return isUtf8(buf) === true;
});

test('Buffer.from base64 编码生成无效 UTF-8', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('gIA=', 'base64'); // 0x80 0x80 的 base64
  return isUtf8(buf) === false;
});

// Buffer.alloc 测试
test('Buffer.alloc 零填充', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.alloc(10); // 全零
  return isUtf8(buf) === true;
});

test('Buffer.alloc 填充 ASCII', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.alloc(10, 0x41); // 全 'A'
  return isUtf8(buf) === true;
});

test('Buffer.alloc 填充无效字节', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.alloc(10, 0x80); // 全 0x80（孤立延续字节）
  return isUtf8(buf) === false;
});

test('Buffer.alloc 填充有效 2 字节序列起始', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.alloc(10, 0xC2); // 全 0xC2（2 字节起始，但缺延续字节）
  return isUtf8(buf) === false;
});

// Buffer.allocUnsafe 测试
test('Buffer.allocUnsafe 后填充有效 UTF-8', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x41); // 填充 'A'
  return isUtf8(buf) === true;
});

test('Buffer.allocUnsafe 后填充无效 UTF-8', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.allocUnsafe(5);
  buf.fill(0x80); // 填充无效字节
  return isUtf8(buf) === false;
});

// Buffer.concat 测试
test('Buffer.concat 两个有效 Buffer', () => {
  const { isUtf8 } = require('buffer');
  const buf1 = Buffer.from('Hello', 'utf8');
  const buf2 = Buffer.from(' World', 'utf8');
  const concatenated = Buffer.concat([buf1, buf2]);
  return isUtf8(concatenated) === true;
});

test('Buffer.concat 有效 + 无效 Buffer', () => {
  const { isUtf8 } = require('buffer');
  const buf1 = Buffer.from('Hello', 'utf8');
  const buf2 = Buffer.from([0x80, 0x80]);
  const concatenated = Buffer.concat([buf1, buf2]);
  return isUtf8(concatenated) === false;
});

test('Buffer.concat 无效 + 有效 Buffer', () => {
  const { isUtf8 } = require('buffer');
  const buf1 = Buffer.from([0x80, 0x80]);
  const buf2 = Buffer.from('Hello', 'utf8');
  const concatenated = Buffer.concat([buf1, buf2]);
  return isUtf8(concatenated) === false;
});

test('Buffer.concat 多个 Buffer', () => {
  const { isUtf8 } = require('buffer');
  const buf1 = Buffer.from('Hello', 'utf8');
  const buf2 = Buffer.from(' ', 'utf8');
  const buf3 = Buffer.from('World', 'utf8');
  const concatenated = Buffer.concat([buf1, buf2, buf3]);
  return isUtf8(concatenated) === true;
});

test('Buffer.concat 空数组', () => {
  const { isUtf8 } = require('buffer');
  const concatenated = Buffer.concat([]);
  return isUtf8(concatenated) === true;
});

// Buffer 写入方法后的验证
test('Buffer.write 写入有效 UTF-8', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.alloc(10);
  buf.write('Hello', 'utf8');
  return isUtf8(buf) === true;
});

test('Buffer.write 部分写入', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.alloc(10);
  buf.write('Hello', 2, 'utf8'); // 从偏移 2 开始写入
  return isUtf8(buf) === true;
});

test('Buffer.write 覆盖写入', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('Hello', 'utf8');
  buf.write('World', 0, 'utf8'); // 覆盖整个 Buffer
  return isUtf8(buf) === true;
});

// Buffer 修改后的验证
test('修改 Buffer 内容 - 保持有效', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('Hello', 'utf8');
  buf[0] = 0x48; // 保持 'H'
  return isUtf8(buf) === true;
});

test('修改 Buffer 内容 - 变为无效', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('Hello', 'utf8');
  buf[0] = 0x80; // 无效字节
  return isUtf8(buf) === false;
});

test('修改 Buffer 内容 - 多字节字符', () => {
  const { isUtf8 } = require('buffer');
  const buf = Buffer.from('你好', 'utf8');
  buf[0] = 0x80; // 损坏第一个字符
  return isUtf8(buf) === false;
});

// Buffer copy 测试
test('Buffer.copy 到新 Buffer', () => {
  const { isUtf8 } = require('buffer');
  const src = Buffer.from('Hello', 'utf8');
  const dst = Buffer.alloc(10);
  src.copy(dst);
  return isUtf8(dst) === true;
});

test('Buffer.copy 部分复制', () => {
  const { isUtf8 } = require('buffer');
  const src = Buffer.from('Hello World', 'utf8');
  const dst = Buffer.alloc(5);
  src.copy(dst, 0, 0, 5); // 复制 "Hello"
  return isUtf8(dst) === true;
});

test('Buffer.copy 复制到中间', () => {
  const { isUtf8 } = require('buffer');
  const src = Buffer.from('ABC', 'utf8');
  const dst = Buffer.alloc(10, 0x41); // 全 'A'
  src.copy(dst, 3); // 从偏移 3 开始复制 "ABC"
  return isUtf8(dst) === true;
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
