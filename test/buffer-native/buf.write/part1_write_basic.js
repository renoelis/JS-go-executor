// buf.write() - 基本功能测试
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

// 基本写入功能
test('基本写入 - 默认参数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('基本写入 - 指定 offset', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('world', 3);
  return written === 5 && buf.toString('utf8', 3, 8) === 'world';
});

test('基本写入 - 指定 offset 和 length', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 3);
  return written === 3 && buf.toString('utf8', 0, 3) === 'hel';
});

test('基本写入 - 指定 offset、length 和 encoding', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 5, 'utf8');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('写入空字符串', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('');
  return written === 0;
});

test('写入单个字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('a');
  return written === 1 && buf[0] === 0x61;
});

test('写入填满整个 Buffer', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('hello');
  return written === 5 && buf.toString() === 'hello';
});

test('写入超出 Buffer 长度的字符串（截断）', () => {
  const buf = Buffer.alloc(5);
  const written = buf.write('hello world');
  return written === 5 && buf.toString() === 'hello';
});

test('offset 为 0', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 0);
  return written === 4 && buf.toString('utf8', 0, 4) === 'test';
});

test('offset 在中间位置', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('test', 5);
  return written === 4 && buf.toString('utf8', 5, 9) === 'test';
});

test('offset 在末尾', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('x', 9);
  return written === 1 && buf[9] === 0x78;
});

test('length 限制写入字节数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 2);
  return written === 2 && buf.toString('utf8', 0, 2) === 'he';
});

test('length 为 0', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 0);
  return written === 0;
});

test('length 大于剩余空间会抛出错误', () => {
  const buf = Buffer.alloc(5);
  try {
    buf.write('hello', 0, 10);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

test('返回值是实际写入的字节数', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('abc');
  return written === 3;
});

test('连续多次写入', () => {
  const buf = Buffer.alloc(10);
  const w1 = buf.write('ab', 0);
  const w2 = buf.write('cd', 2);
  const w3 = buf.write('ef', 4);
  return w1 === 2 && w2 === 2 && w3 === 2 && buf.toString('utf8', 0, 6) === 'abcdef';
});

test('覆盖已有内容', () => {
  const buf = Buffer.from('hello');
  const written = buf.write('world');
  return written === 5 && buf.toString() === 'world';
});

test('部分覆盖已有内容', () => {
  const buf = Buffer.from('hello');
  const written = buf.write('ab', 1);
  return written === 2 && buf.toString() === 'hablo';
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
