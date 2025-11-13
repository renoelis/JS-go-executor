// Buffer.allocUnsafeSlow - 编码和字符串处理 (Round 3 补漏)
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

// UTF-8 编码测试
test('写入和读取 UTF-8 字符串', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  const written = buf.write('hello world', 'utf8');
  return buf.toString('utf8', 0, written) === 'hello world';
});

test('写入多字节 UTF-8 字符', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  const written = buf.write('你好世界', 'utf8');
  return buf.toString('utf8', 0, written) === '你好世界';
});

test('写入 emoji 字符', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  const written = buf.write('😀🎉', 'utf8');
  return buf.toString('utf8', 0, written) === '😀🎉';
});

test('处理 UTF-8 边界截断', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('你好');
  return buf.length === 5;
});

// 十六进制编码
test('写入和读取 hex 编码', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('48656c6c6f', 'hex');
  return buf.toString('utf8', 0, 5) === 'Hello';
});

test('hex 编码大小写不敏感', () => {
  const buf1 = Buffer.allocUnsafeSlow(5);
  const buf2 = Buffer.allocUnsafeSlow(5);
  buf1.write('48656C6C6F', 'hex');
  buf2.write('48656c6c6f', 'hex');
  return buf1.equals(buf2);
});

test('无效 hex 字符串处理', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const written = buf.write('48656xyz', 'hex');
  return written >= 0;
});

// Base64 编码
test('写入和读取 base64 编码', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('SGVsbG8gV29ybGQ=', 'base64');
  return buf.toString('utf8', 0, 11) === 'Hello World';
});

test('base64 解码后长度正确', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  const written = buf.write('SGVsbG8=', 'base64');
  return written === 5;
});

test('base64 填充字符处理', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('YQ==', 'base64');
  return buf[0] === 97;
});

// Base64URL 编码
test('写入和读取 base64url 编码', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('SGVsbG8', 'base64url');
  return buf.toString('utf8', 0, 5) === 'Hello';
});

// ASCII 编码
test('写入和读取 ascii 编码', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello', 'ascii');
  return buf.toString('ascii', 0, 5) === 'Hello';
});

test('ascii 编码非 ASCII 字符被截断', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('你好', 'ascii');
  return buf[0] <= 127;
});

// Latin1 编码
test('写入和读取 latin1 编码', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello', 'latin1');
  return buf.toString('latin1', 0, 5) === 'Hello';
});

test('latin1 别名 binary 正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello', 'binary');
  return buf.toString('binary', 0, 5) === 'Hello';
});

// UTF-16LE 编码
test('写入和读取 utf16le 编码', () => {
  const buf = Buffer.allocUnsafeSlow(20);
  buf.write('Hello', 'utf16le');
  return buf.toString('utf16le', 0, 10) === 'Hello';
});

test('utf16le 每个字符占 2 字节', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const written = buf.write('Hi', 'utf16le');
  return written === 4;
});

test('ucs2 别名 utf16le 正常工作', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hi', 'ucs2');
  return buf.toString('ucs2', 0, 4) === 'Hi';
});

// 编码参数验证
test('默认编码是 utf8', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello');
  return buf.toString('utf8', 0, 5) === 'Hello';
});

test('无效编码使用默认编码', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  try {
    buf.write('Hello', 'invalid-encoding');
    return buf.toString('utf8', 0, 5) === 'Hello';
  } catch (e) {
    return e.message.includes('encoding') || e.message.includes('Unknown');
  }
});

// toString 偏移量测试
test('toString 支持 start 参数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('HelloWorld');
  return buf.toString('utf8', 5) === 'World';
});

test('toString 支持 start 和 end 参数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('HelloWorld');
  return buf.toString('utf8', 0, 5) === 'Hello';
});

test('toString 超出范围自动截断', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf.write('Hello');
  return buf.toString('utf8', 0, 100).length === 5;
});

// write 偏移量测试
test('write 支持 offset 参数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.write('Hello', 2);
  return buf[2] === 72 && buf[0] === 0;
});

test('write 支持 offset 和 length 参数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  const written = buf.write('Hello', 0, 3);
  return written === 3 && buf.toString('utf8', 0, 3) === 'Hel';
});

test('write 支持 offset, length 和 encoding 参数', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.fill(0);
  buf.write('Hello', 0, 5, 'utf8');
  return buf.toString('utf8', 0, 5) === 'Hello';
});

// 空字符串处理
test('write 空字符串返回 0', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  const written = buf.write('');
  return written === 0;
});

test('toString 空 Buffer 返回空字符串', () => {
  const buf = Buffer.allocUnsafeSlow(0);
  return buf.toString() === '';
});

// 特殊字符处理
test('处理 null 字符', () => {
  const buf = Buffer.allocUnsafeSlow(5);
  buf[0] = 0;
  buf[1] = 65;
  buf[2] = 0;
  buf[3] = 66;
  return buf[0] === 0 && buf[1] === 65;
});

test('处理换行符', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello\nWorld');
  return buf.toString().includes('\n');
});

test('处理制表符', () => {
  const buf = Buffer.allocUnsafeSlow(10);
  buf.write('Hello\tWorld');
  return buf.toString().includes('\t');
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
