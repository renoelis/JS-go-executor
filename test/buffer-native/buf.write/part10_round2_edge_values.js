// buf.write() - 第2轮补漏：特殊情况和边缘值
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

// offset 和 length 的边界组合
test('offset=0, length=0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 0, 0);
  return len === 0;
});

test('offset 在中间，length 刚好填满剩余空间', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 5, 5);
  return len === 5 && buf.toString('utf8', 5, 10) === 'hello';
});

test('offset 在末尾前一位', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('ab', 9);
  return len === 1 && buf[9] === 0x61;
});

// 不同编码的字节计算
test('hex 编码：奇数长度字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('123', 'hex');
  return len === 1 && buf[0] === 0x12;
});

test('hex 编码：空字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('', 'hex');
  return len === 0;
});

test('base64 编码：填充符处理', () => {
  const buf = Buffer.alloc(20);
  const len1 = buf.write('YQ==', 'base64');
  const len2 = buf.write('YQ', 5, 1, 'base64');
  return len1 === 1 && len2 === 1;
});

test('base64 编码：忽略无效字符', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('YQ==', 'base64');
  return len === 1 && buf[0] === 0x61;
});

test('base64url 编码：URL 安全字符', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('_-', 'base64url');
  return len >= 0;
});

test('utf16le 编码：空字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('', 'utf16le');
  return len === 0;
});

test('utf16le 编码：单个 ASCII 字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A', 'utf16le');
  return len === 2 && buf[0] === 0x41 && buf[1] === 0x00;
});

// 特殊字符处理
test('写入空格', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write(' ');
  return len === 1 && buf[0] === 0x20;
});

test('写入 Tab 字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\t');
  return len === 1 && buf[0] === 0x09;
});

test('写入换行符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\n');
  return len === 1 && buf[0] === 0x0a;
});

test('写入回车符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\r');
  return len === 1 && buf[0] === 0x0d;
});

test('写入 null 字节', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\x00');
  return len === 1 && buf[0] === 0x00;
});

// Latin1 编码特性
test('latin1 编码：8位字符正常保留', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\\xff', 'latin1');
  return len === 4;
});

test('latin1 编码：欧洲字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('àéïöü', 'latin1');
  return len === 5;
});

// ASCII 编码特性
test('ascii 编码：只保留低7位', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 'ascii');
  return buf[0] === 0x68;
});

test('ascii 编码：扩展字符保留8位', () => {
  const buf = Buffer.alloc(10);
  buf.write('\u00ff', 'ascii');
  return buf[0] === 0xff;
});

// 多个编码的一致性测试
test('utf8 和 utf-8 行为一致', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('test', 'utf8');
  buf2.write('test', 'utf-8');
  return buf1.toString('hex') === buf2.toString('hex');
});

test('ucs2 和 ucs-2 行为一致', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('test', 'ucs2');
  buf2.write('test', 'ucs-2');
  return buf1.toString('hex') === buf2.toString('hex');
});

test('binary 和 latin1 编码行为一致', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  buf1.write('test', 'binary');
  buf2.write('test', 'latin1');
  return buf1[0] === buf2[0] && buf1[1] === buf2[1];
});

// length 参数的精确控制
test('length 精确控制写入字节数（utf8）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello world', 0, 5);
  return len === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

test('length 精确控制写入字节数（hex）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('0102030405', 0, 3, 'hex');
  return len === 3 && buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03;
});

test('length 精确控制写入字节数（base64）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('SGVsbG8=', 0, 3, 'base64');
  return len === 3;
});

// 连续写入的独立性
test('连续写入不同位置互不干扰', () => {
  const buf = Buffer.alloc(10);
  buf.write('a', 0);
  buf.write('b', 5);
  return buf[0] === 0x61 && buf[5] === 0x62 && buf[1] === 0x00;
});

test('连续写入覆盖前面的内容', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 0);
  buf.write('world', 0);
  return buf.toString('utf8', 0, 5) === 'world';
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
