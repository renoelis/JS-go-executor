// buf.reverse() - 不同输入类型测试
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

// Case 1: 标准 Buffer 实例
test('标准 Buffer 实例', () => {
  const buf = Buffer.allocUnsafe(5);
  for (let i = 0; i < 5; i++) buf[i] = i + 1;
  buf.reverse();
  const expected = [5, 4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 2: Uint8Array 调用 Buffer.prototype.reverse
test('Uint8Array 调用 Buffer.prototype.reverse', () => {
  const uint8 = new Uint8Array([1, 2, 3, 4]);
  Buffer.prototype.reverse.call(uint8);
  const expected = [4, 3, 2, 1];
  const actual = Array.from(uint8);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 3: Buffer.from(Uint8Array)
test('Buffer.from(Uint8Array) 后反转', () => {
  const uint8 = new Uint8Array([10, 20, 30]);
  const buf = Buffer.from(uint8);
  buf.reverse();
  const expected = [30, 20, 10];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 4: Buffer.from(ArrayBuffer)
test('Buffer.from(ArrayBuffer) 后反转', () => {
  const ab = new ArrayBuffer(4);
  const view = new Uint8Array(ab);
  view[0] = 11;
  view[1] = 22;
  view[2] = 33;
  view[3] = 44;
  const buf = Buffer.from(ab);
  buf.reverse();
  const expected = [44, 33, 22, 11];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 5: hex 编码字符串创建的 Buffer
test('hex 编码字符串创建的 Buffer 反转', () => {
  const buf = Buffer.from('68656c6c6f', 'hex'); // "hello"
  buf.reverse();
  const expected = [0x6f, 0x6c, 0x6c, 0x65, 0x68]; // "olleh"
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 6: base64 编码字符串创建的 Buffer
test('base64 编码字符串创建的 Buffer 反转', () => {
  const buf = Buffer.from('AQIDBA==', 'base64'); // [1, 2, 3, 4]
  buf.reverse();
  const expected = [4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 7: Buffer.alloc 零填充
test('Buffer.alloc 零填充 Buffer 反转', () => {
  const buf = Buffer.alloc(4);
  buf[1] = 99;
  buf.reverse();
  const expected = [0, 0, 99, 0];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 8: Buffer.allocUnsafe 未初始化
test('Buffer.allocUnsafe 未初始化 Buffer 反转', () => {
  const buf = Buffer.allocUnsafe(3);
  buf[0] = 100;
  buf[1] = 200;
  buf[2] = 50;
  buf.reverse();
  const expected = [50, 200, 100];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 9: Buffer.concat 结果
test('Buffer.concat 结果反转', () => {
  const buf1 = Buffer.from([1, 2]);
  const buf2 = Buffer.from([3, 4]);
  const buf = Buffer.concat([buf1, buf2]);
  buf.reverse();
  const expected = [4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 10: 包含 UTF-8 多字节字符
test('包含 UTF-8 多字节字符的 Buffer 反转', () => {
  const buf = Buffer.from('你好', 'utf8');
  const originalBytes = Array.from(buf);
  buf.reverse();
  const reversedBytes = Array.from(buf);
  return reversedBytes.length === originalBytes.length &&
         reversedBytes[0] === originalBytes[originalBytes.length - 1];
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
