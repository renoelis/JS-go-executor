// buf.write() - 边界情况测试
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

// 空 Buffer
test('空 Buffer - 长度为 0', () => {
  const buf = Buffer.alloc(0);
  const written = buf.write('hello');
  return written === 0;
});

test('空 Buffer - offset 为 0', () => {
  const buf = Buffer.alloc(0);
  const written = buf.write('hello', 0);
  return written === 0;
});

// 极小 Buffer
test('长度为 1 的 Buffer', () => {
  const buf = Buffer.alloc(1);
  const written = buf.write('hello');
  return written === 1 && buf[0] === 0x68;
});

test('长度为 1 的 Buffer - 写入单字符', () => {
  const buf = Buffer.alloc(1);
  const written = buf.write('x');
  return written === 1 && buf[0] === 0x78;
});

// 多字节字符边界
test('utf8 - 多字节字符被截断（空间不足）', () => {
  const buf = Buffer.alloc(2);
  const written = buf.write('你');
  return written === 0;
});

test('utf8 - 刚好容纳多字节字符', () => {
  const buf = Buffer.alloc(3);
  const written = buf.write('你');
  return written === 3 && buf.toString('utf8') === '你';
});

test('utf8 - 部分空间容纳一个多字节字符', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('你好');
  return written === 3;
});

test('utf8 - 刚好容纳两个多字节字符', () => {
  const buf = Buffer.alloc(6);
  const written = buf.write('你好');
  return written === 6 && buf.toString('utf8') === '你好';
});

test('utf8 - emoji 被截断', () => {
  const buf = Buffer.alloc(3);
  const written = buf.write('😀');
  return written === 0;
});

test('utf8 - 刚好容纳 emoji', () => {
  const buf = Buffer.alloc(4);
  const written = buf.write('😀');
  return written === 4 && buf.toString('utf8') === '😀';
});

test('utf8 - 混合字符在边界', () => {
  const buf = Buffer.alloc(7);
  const written = buf.write('ab你');
  return written === 5 && buf.toString('utf8', 0, 5) === 'ab你';
});

test('utf8 - 混合字符截断多字节部分', () => {
  const buf = Buffer.alloc(4);
  const written = buf.write('ab你');
  return written === 2 && buf.toString('utf8', 0, 2) === 'ab';
});

// UTF-16LE 边界
test('utf16le - 奇数 Buffer 长度', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('ab', 'utf16le');
  return written === 4;
});

test('utf16le - 空间刚好', () => {
  const buf = Buffer.alloc(6);
  const written = buf.write('abc', 'utf16le');
  return written === 6 && buf.toString('utf16le') === 'abc';
});

test('utf16le - 空间不足一个字符', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('abc', 'utf16le');
  return written === 4 && buf.toString('utf16le', 0, 4) === 'ab';
});

// offset 和 length 组合边界
test('offset 在边界，length 为 0', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 10, 0);
  return written === 0;
});

test('offset + length 刚好等于 Buffer 长度', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 5, 5);
  return written === 5 && buf.toString('utf8', 5, 10) === 'hello';
});

test('offset 接近末尾，只能写入部分', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 8);
  return written === 2 && buf.toString('utf8', 8, 10) === 'he';
});

test('length 为 1', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 1);
  return written === 1 && buf[0] === 0x68;
});

// 特殊字符串
test('写入只包含空格的字符串', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('     ');
  return written === 5 && buf.toString('utf8', 0, 5) === '     ';
});

test('写入包含换行符的字符串', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('a\nb\nc');
  return written === 5;
});

test('写入包含制表符的字符串', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('a\tb\tc');
  return written === 5;
});

test('写入包含 null 字符的字符串', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('a\x00b');
  return written === 3;
});

// 大 Buffer
test('大 Buffer - 写入小字符串', () => {
  const buf = Buffer.alloc(1024);
  const written = buf.write('hello');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('大 Buffer - 写入长字符串', () => {
  const buf = Buffer.alloc(1024);
  const str = 'a'.repeat(500);
  const written = buf.write(str);
  return written === 500 && buf.toString('utf8', 0, 500) === str;
});

test('大 Buffer - offset 在中间', () => {
  const buf = Buffer.alloc(1024);
  const written = buf.write('test', 512);
  return written === 4 && buf.toString('utf8', 512, 516) === 'test';
});

// 参数省略和默认值
test('只传 string - 使用所有默认值', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('string + encoding - offset 默认 0', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 'utf8');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('string + offset - encoding 默认 utf8', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 2);
  return written === 5 && buf.toString('utf8', 2, 7) === 'hello';
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
