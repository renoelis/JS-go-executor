// buf.write() - 第3轮：实际行为验证和边缘分支
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

// 实际验证：不同编码的字节对齐
test('utf16le - 写入必须2字节对齐', () => {
  const buf = Buffer.alloc(5);
  const len = buf.write('abc', 'utf16le');
  return len === 4;
});

test('hex - 非十六进制字符被忽略', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('1g2h3i', 'hex');
  return len === 0;
});

// 实际验证：offset 和 length 的组合行为
test('当 length 大于可用空间时自动截断', () => {
  const buf = Buffer.alloc(5);
  const len = buf.write('hello', 3, 5);
  return len === 2 && buf.toString('utf8', 3, 5) === 'he';
});

test('当 offset + length 刚好等于 buffer.length', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('12345', 5, 5);
  return len === 5;
});

// 实际验证：空字符串在不同编码下的行为
test('空字符串 hex 编码返回 0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('', 'hex');
  return len === 0;
});

test('空字符串 base64 编码返回 0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('', 'base64');
  return len === 0;
});

test('空字符串 utf16le 编码返回 0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('', 'utf16le');
  return len === 0;
});

// 实际验证：非法输入的处理
test('hex 编码 - 只有一个有效字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('1', 'hex');
  return len === 0;
});

test('hex 编码 - 两个有效字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('12', 'hex');
  return len === 1 && buf[0] === 0x12;
});

// 实际验证：边界写入
test('写入到最后一个字节', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('x', 9);
  return len === 1 && buf[9] === 0x78;
});

test('尝试写入到 buffer.length 位置返回 0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('x', 10);
  return len === 0;
});

// 实际验证：写入后 Buffer 状态
test('写入不改变 Buffer 长度', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  return buf.length === 10;
});

test('写入不改变 Buffer 的 byteLength', () => {
  const buf = Buffer.alloc(10);
  const before = buf.byteLength;
  buf.write('hello');
  return buf.byteLength === before;
});

// 实际验证：不同类型的字符串
test('写入数字字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('12345');
  return len === 5 && buf.toString('utf8', 0, 5) === '12345';
});

test('写入特殊符号', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('!@#$%');
  return len === 5;
});

test('写入混合内容', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('abc123!@#');
  return len === 9;
});

// 实际验证：base64 的填充处理
test('base64 - 单个填充符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('YWI=', 'base64');
  return len === 2;
});

test('base64 - 双个填充符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('YQ==', 'base64');
  return len === 1;
});

test('base64 - 无填充符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('YWJj', 'base64');
  return len === 3;
});

// 实际验证：写入的原子性
test('部分写入不会留下损坏的数据', () => {
  const buf = Buffer.alloc(3);
  buf.fill(0xff);
  const len = buf.write('中文');
  return len === 3 && buf[0] === 0xe4;
});

// 实际验证：offset 为 0 的不同表达方式
test('offset 显式为 0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('test', 0);
  return len === 4 && buf.toString('utf8', 0, 4) === 'test';
});

test('offset 隐式为 0（省略）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('test');
  return len === 4 && buf.toString('utf8', 0, 4) === 'test';
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
