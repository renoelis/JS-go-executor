// buf.write() - 参数组合测试
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

// 参数重载：write(string)
test('重载 1: write(string)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

// 参数重载：write(string, encoding)
test('重载 2: write(string, encoding) - utf8', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 'utf8');
  return written === 5;
});

test('重载 2: write(string, encoding) - hex', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('68656c6c6f', 'hex');
  return written === 5;
});

test('重载 2: write(string, encoding) - base64', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('aGVsbG8=', 'base64');
  return written === 5;
});

// 参数重载：write(string, offset)
test('重载 3: write(string, offset)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 3);
  return written === 5 && buf.toString('utf8', 3, 8) === 'hello';
});

test('重载 3: write(string, offset=0)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0);
  return written === 5;
});

// 参数重载：write(string, offset, encoding)
test('重载 4: write(string, offset, encoding)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 2, 'utf8');
  return written === 5 && buf.toString('utf8', 2, 7) === 'hello';
});

test('重载 4: write(string, offset, encoding) - hex', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('abcd', 2, 'hex');
  return written === 2 && buf[2] === 0xab && buf[3] === 0xcd;
});

// 参数重载：write(string, offset, length)
test('重载 5: write(string, offset, length)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 1, 3);
  return written === 3 && buf.toString('utf8', 1, 4) === 'hel';
});

test('重载 5: write(string, offset, length) - 完整', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 5);
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

// 参数重载：write(string, offset, length, encoding)
test('重载 6: write(string, offset, length, encoding)', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 1, 3, 'utf8');
  return written === 3 && buf.toString('utf8', 1, 4) === 'hel';
});

test('重载 6: 完整四参数 - utf8', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 5, 'utf8');
  return written === 5;
});

test('重载 6: 完整四参数 - hex', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('68656c6c6f', 0, 5, 'hex');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('重载 6: 完整四参数 - base64', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('aGVsbG8=', 0, 5, 'base64');
  return written === 5;
});

test('重载 6: 完整四参数 - utf16le', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hi', 0, 4, 'utf16le');
  return written === 4;
});

// 参数顺序验证
test('offset 和 encoding 位置识别 - 数字是 offset', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 2);
  return buf.toString('utf8', 2, 7) === 'hello';
});

test('offset 和 encoding 位置识别 - 字符串是 encoding', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('68656c6c6f', 'hex');
  return buf.toString('utf8', 0, 5) === 'hello';
});

// 参数类型混合
test('offset 为字符串数字被当作encoding', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', '3');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('length 为字符串数字被当作encoding', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('hello', 0, '3');
    return false;
  } catch (e) {
    return e.message.includes('Unknown encoding');
  }
});

test('offset 为 0 的数字形式', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(5);
  buf1.write('hello', 0);
  buf2.write('hello', 0.0);
  return buf1.toString() === 'hello' && buf2.toString() === 'hello';
});

// undefined 参数
test('offset 为 undefined（使用默认值）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', undefined, 5, 'utf8');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('length 为 undefined（使用默认值）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, undefined, 'utf8');
  return written === 5;
});

test('encoding 为 undefined（使用默认值）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 5, undefined);
  return written === 5;
});

// 多参数组合边界
test('offset + length 精确控制', () => {
  const buf = Buffer.alloc(10);
  buf.write('aaaaaaaaaa');
  buf.write('bbb', 3, 3);
  return buf.toString('utf8', 3, 6) === 'bbb' && buf[6] === 0x61;
});

test('不同编码的 offset + length', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('aabbcc', 2, 3, 'hex');
  return written === 3 && buf[2] === 0xaa && buf[3] === 0xbb && buf[4] === 0xcc;
});

test('utf16le 的 offset + length 组合', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('hello', 2, 6, 'utf16le');
  return written === 6 && buf.toString('utf16le', 2, 8) === 'hel';
});

// 参数边界值组合
test('所有参数都是边界值', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 10, 'utf8');
  return written === 5;
});

test('offset 在末尾，length 为 0', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 10, 0);
  return written === 0;
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
