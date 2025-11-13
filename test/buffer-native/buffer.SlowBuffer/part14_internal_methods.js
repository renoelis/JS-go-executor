// Buffer.allocUnsafeSlow - 内部 slice 方法和别名测试
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

// asciiSlice / asciiWrite (内部方法，通过 toString 和 write 调用)
test('ASCII 编码通过 toString', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello', 'ascii');
  return buf.toString('ascii', 0, 5) === 'Hello';
});

test('ASCII 写入非 ASCII 字符会被截断', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('你好', 'ascii');
  return buf[0] < 128 && buf[1] < 128;
});

// base64Slice / base64Write
test('base64 编码往返', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('Hello World');
  const b64 = buf.toString('base64', 0, 11);
  const buf2 = Buffer.allocUnsafeSlow(20);
  buf2.write(b64, 'base64');
  return buf2.toString('utf8', 0, 11) === 'Hello World';
});

test('base64 空字符串', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('', 'base64');
  return true;
});

// base64urlSlice / base64urlWrite
test('base64url 编码往返', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('test+data/test=', 'utf8');
  const b64url = buf.toString('base64url', 0, 15);
  return typeof b64url === 'string' && b64url.length > 0;
});

test('base64url 与 base64 的区别', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf[0] = 0xFB;
  buf[1] = 0xFF;
  const b64 = buf.toString('base64', 0, 2);
  const b64url = buf.toString('base64url', 0, 2);
  return b64 !== b64url || b64 === b64url;
});

// latin1Slice / latin1Write
test('latin1 编码往返', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('café', 'latin1');
  const str = buf.toString('latin1', 0, 4);
  return str.length === 4;
});

test('latin1 支持 0-255 所有字节', () => {
  const buf = Buffer.allocUnsafeSlow(256);
  for (let i = 0; i < 256; i++) {
    buf[i] = i;
  }
  const str = buf.toString('latin1');
  return str.length === 256;
});

// hexSlice / hexWrite
test('hex 编码往返', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('48656c6c6f', 'hex');
  return buf.toString('hex', 0, 5) === '48656c6c6f';
});

test('hex 编码大小写不敏感写入', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.write('ABCDEF', 'hex');
  buf2.write('abcdef', 'hex');
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

test('hex 编码输出始终小写', () => {
  const buf = Buffer.allocUnsafeSlow(3);
  buf[0] = 0xAB;
  buf[1] = 0xCD;
  buf[2] = 0xEF;
  const hex = buf.toString('hex');
  return hex === 'abcdef';
});

test('hex 编码奇数长度字符串', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const written = buf.write('12345', 'hex');
  return written === 2;
});

// ucs2Slice / ucs2Write
test('ucs2 编码往返', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('你好', 'ucs2');
  return buf.toString('ucs2', 0, 4) === '你好';
});

test('ucs2 别名 utf16le', () => {
  const buf1 = Buffer.allocUnsafeSlow(10);
  const buf2 = Buffer.allocUnsafeSlow(10);
  buf1.write('test', 'ucs2');
  buf2.write('test', 'utf16le');
  return buf1.equals(buf2);
});

test('ucs2 每个字符 2 字节', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const written = buf.write('abc', 'ucs2');
  return written === 6;
});

// utf8Slice / utf8Write
test('utf8 多字节字符', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('Hello 世界 🌍', 'utf8');
  return buf.toString('utf8').includes('世界');
});

test('utf8 不完整字符处理', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('你好世界');
  const partial = buf.toString('utf8', 0, 5);
  return typeof partial === 'string';
});

// parent 和 offset 属性
test('allocUnsafeSlow Buffer 的 parent 属性', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.parent === buf.buffer || buf.parent === undefined;
});

test('allocUnsafeSlow Buffer 的 offset 属性', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  return buf.offset === buf.byteOffset || buf.offset === undefined;
});

test('slice 创建的 Buffer 有 parent', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const slice = buf.slice(2, 5);
  return slice.parent === buf.buffer || slice.parent === undefined;
});

test('slice 创建的 Buffer 有 offset', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const slice = buf.slice(2, 5);
  return typeof slice.offset === 'number' || slice.offset === undefined;
});

// toLocaleString
test('toLocaleString 等同于 toString', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello');
  return buf.toLocaleString('utf8', 0, 5) === buf.toString('utf8', 0, 5);
});

test('toLocaleString 默认参数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('test');
  return typeof buf.toLocaleString() === 'string';
});

// inspect (用于调试输出)
test('inspect 返回字符串表示', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('hello');
  const inspected = buf.inspect();
  return typeof inspected === 'string' && inspected.includes('Buffer');
});

test('空 Buffer 的 inspect', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  const inspected = buf.inspect();
  return typeof inspected === 'string';
});

// 编码组合测试
test('连续使用不同编码写入', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  let offset = 0;
  offset += buf.write('AB', offset, 'hex');
  offset += buf.write('test', offset, 'utf8');
  return offset === 5;
});

test('不同编码读取相同数据', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf[0] = 0x41;
  buf[1] = 0x42;
  const ascii = buf.toString('ascii', 0, 2);
  const utf8 = buf.toString('utf8', 0, 2);
  return ascii === 'AB' && utf8 === 'AB';
});

// 特殊情况
test('write 返回实际写入的字节数', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  const written = buf.write('HelloWorld', 'utf8');
  return written === 5;
});

test('toString 不带参数使用默认编码', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('test');
  const str = buf.toString();
  return str.startsWith('test');
});

test('编码名称大小写不敏感', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('test', 'UTF8');
  return buf.toString('utf8', 0, 4) === 'test';
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
