// buf.write() - 编码测试
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

// UTF-8 编码
test('utf8 编码 - 默认', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('utf8 编码 - 显式指定', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 0, 5, 'utf8');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('utf8 编码 - 中文字符', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('你好');
  return written === 6 && buf.toString('utf8', 0, 6) === '你好';
});

test('utf8 编码 - emoji', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('😀');
  return written === 4 && buf.toString('utf8', 0, 4) === '😀';
});

test('utf8 编码 - 混合 ASCII 和多字节', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('hello世界');
  return written === 11 && buf.toString('utf8', 0, 11) === 'hello世界';
});

// ASCII 编码
test('ascii 编码', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 'ascii');
  return written === 5 && buf.toString('ascii', 0, 5) === 'hello';
});

test('ascii 编码 - 高位字符', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('café', 'ascii');
  return written === 4 && buf[3] === 0xe9; // é 保留低8位
});

// UTF-16LE 编码
test('utf16le 编码', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('hello', 'utf16le');
  return written === 10 && buf.toString('utf16le', 0, 10) === 'hello';
});

test('utf16le 编码 - 中文', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('你好', 'utf16le');
  return written === 4 && buf.toString('utf16le', 0, 4) === '你好';
});

test('ucs2 编码（utf16le 别名）', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('test', 'ucs2');
  return written === 8 && buf.toString('ucs2', 0, 8) === 'test';
});

// Base64 编码
test('base64 编码', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('aGVsbG8=', 'base64');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('base64 编码 - 不带填充', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('aGVsbG8', 'base64');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('base64url 编码', () => {
  const buf = Buffer.alloc(20);
  const written = buf.write('aGVsbG8', 'base64url');
  return written === 5;
});

// Hex 编码
test('hex 编码', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('68656c6c6f', 'hex');
  return written === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('hex 编码 - 大写', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('48454C4C4F', 'hex');
  return written === 5 && buf.toString('utf8', 0, 5) === 'HELLO';
});

test('hex 编码 - 混合大小写', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('48656C6c6F', 'hex');
  return written === 5 && buf.toString('utf8', 0, 5) === 'Hello';
});

test('hex 编码 - 奇数长度（忽略最后一个字符）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('68656c6c6', 'hex');
  return written === 4;
});

// Latin1 编码
test('latin1 编码', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 'latin1');
  return written === 5 && buf.toString('latin1', 0, 5) === 'hello';
});

test('binary 编码（latin1 别名）', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 'binary');
  return written === 5 && buf.toString('binary', 0, 5) === 'hello';
});

test('latin1 编码 - 扩展 ASCII', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('café', 'latin1');
  return written === 4 && buf[3] === 0xe9;
});

// 编码名称大小写不敏感
test('编码名称 - 大写', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 'UTF8');
  return written === 5;
});

test('编码名称 - 混合大小写', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('hello', 'Utf8');
  return written === 5;
});

test('编码名称 - HEX 大写', () => {
  const buf = Buffer.alloc(10);
  const written = buf.write('68656c6c6f', 'HEX');
  return written === 5;
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
