// buf.write() - 多字节编码深度测试
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

// UTF-8 多字节序列
test('utf8 - 2 字节序列（拉丁扩展）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('café');
  return written === 5 && buf.toString('utf8', 0, 5) === 'café';
});

test('utf8 - 3 字节序列（CJK）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('中文');
  return written === 6 && buf.toString('utf8', 0, 6) === '中文';
});

test('utf8 - 4 字节序列（emoji）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('🎉');
  return written === 4 && buf.toString('utf8', 0, 4) === '🎉';
});

test('utf8 - 混合 1-2-3 字节', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('aé中');
  return written === 6 && buf.toString('utf8', 0, 6) === 'aé中';
});

test('utf8 - 混合 1-2-3-4 字节', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('aé中🎉');
  return written === 10 && buf.toString('utf8', 0, 10) === 'aé中🎉';
});

test('utf8 - 多个 emoji', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('😀😁😂');
  return written === 12 && buf.toString('utf8', 0, 12) === '😀😁😂';
});

test('utf8 - emoji 后跟文本', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('😀hello');
  return written === 9 && buf.toString('utf8', 0, 9) === '😀hello';
});

test('utf8 - 文本后跟 emoji', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('hello😀');
  return written === 9 && buf.toString('utf8', 0, 9) === 'hello😀';
});

// 边界处理
test('utf8 - 3 字节字符刚好容纳', () => {
  const buf = Buffer.alloc(3);
  const written = buf.write('中');
  return written === 3 && buf.toString('utf8') === '中';
});

test('utf8 - 3 字节字符空间不足 1 字节', () => {
  const buf = Buffer.alloc(2);
  const written = buf.write('中');
  return written === 0;
});

test('utf8 - 3 字节字符空间不足 2 字节', () => {
  const buf = Buffer.alloc(1);
  const written = buf.write('中');
  return written === 0;
});

test('utf8 - 4 字节 emoji 刚好容纳', () => {
  const buf = Buffer.alloc(4);
  const written = buf.write('😀');
  return written === 4 && buf.toString('utf8') === '😀';
});

test('utf8 - 4 字节 emoji 空间不足 1 字节', () => {
  const buf = Buffer.alloc(3);
  const written = buf.write('😀');
  return written === 0;
});

test('utf8 - 4 字节 emoji 空间不足 2 字节', () => {
  const buf = Buffer.alloc(2);
  const written = buf.write('😀');
  return written === 0;
});

test('utf8 - 4 字节 emoji 空间不足 3 字节', () => {
  const buf = Buffer.alloc(1);
  const written = buf.write('😀');
  return written === 0;
});

// 混合字符串截断
test('utf8 - ASCII + 中文，空间只够 ASCII', () => {
  const buf = Buffer.alloc(3);
  const written = buf.write('abc中');
  return written === 3 && buf.toString('utf8') === 'abc';
});

test('utf8 - ASCII + 中文，空间够一个中文', () => {
  const buf = Buffer.alloc(6);
  const written = buf.write('abc中文');
  return written === 6 && buf.toString('utf8') === 'abc中';
});

test('utf8 - 中文截断在多字节边界', () => {
  const buf = Buffer.alloc(7);
  const written = buf.write('中文测');
  return written === 6 && buf.toString('utf8', 0, 6) === '中文';
});

test('utf8 - emoji 截断', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('😀😁');
  return written === 4 && buf.toString('utf8', 0, 4) === '😀';
});

test('utf8 - 复杂 emoji（带肤色修饰符）', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('👋🏻');
  return written === 8;
});

test('utf8 - ZWJ emoji 序列', () => {
  const buf = Buffer.alloc(30);
  const written = buf.write('👨‍👩‍👧‍👦');
  return written > 0;
});

// UTF-16LE 多字节
test('utf16le - 基本多语言平面', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('中文', 'utf16le');
  return written === 4 && buf.toString('utf16le', 0, 4) === '中文';
});

test('utf16le - emoji（需要代理对）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('😀', 'utf16le');
  return written === 4 && buf.toString('utf16le', 0, 4) === '😀';
});

test('utf16le - 混合 BMP 和代理对', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('中😀文', 'utf16le');
  return written === 8 && buf.toString('utf16le', 0, 8) === '中😀文';
});

test('utf16le - 代理对截断（只能容纳一半）', () => {
  const buf = Buffer.alloc(2);
  const written = buf.write('😀', 'utf16le');
  return written === 0 || written === 2;
});

test('utf16le - 奇数长度 Buffer', () => {
  const buf = Buffer.alloc(7);
  const written = buf.write('abc', 'utf16le');
  return written === 6;
});

// 特殊 Unicode 字符
test('utf8 - 零宽字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('a\u200Bb');
  return written === 5;
});

test('utf8 - 组合字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('é');
  return written > 0;
});

test('utf8 - RTL 标记', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('\\u202Ehello');
  return written > 0;
});

// 编码字节计数验证
test('utf8 字节计数 - 纯 ASCII', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello');
  return written === 5;
});

test('utf8 字节计数 - 纯中文', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('你好世界');
  return written === 12;
});

test('utf8 字节计数 - 纯 emoji', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('😀😁');
  return written === 8;
});

test('utf16le 字节计数 - 纯 ASCII', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('hello', 'utf16le');
  return written === 10;
});

test('utf16le 字节计数 - 纯中文', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('你好', 'utf16le');
  return written === 4;
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
