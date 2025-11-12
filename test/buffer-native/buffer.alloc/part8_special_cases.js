// Buffer.alloc() - Part 8: Special Cases and Documentation Coverage
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

// fill 值为 Buffer 时的完整行为
test('fill 为 Buffer - 精确填充到最后一个字节', () => {
  const fillBuf = Buffer.from([1, 2, 3]);
  const buf = Buffer.alloc(11, fillBuf);
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 &&
         buf[9] === 1 && buf[10] === 2;
});

test('fill 为 Buffer - 单字节 Buffer 重复', () => {
  const fillBuf = Buffer.from([0xCC]);
  const buf = Buffer.alloc(100, fillBuf);
  return buf.every(b => b === 0xCC);
});

// 数字 fill 的取模行为
test('fill 数字 300 取模后为 44', () => {
  const buf = Buffer.alloc(5, 300);
  return buf.every(b => b === 44);
});

test('fill 数字 -300 的取模行为', () => {
  const buf = Buffer.alloc(5, -300);
  const expected = ((-300 % 256) + 256) % 256;
  return buf.every(b => b === expected);
});

test('fill 数字 512 取模为 0', () => {
  const buf = Buffer.alloc(5, 512);
  return buf.every(b => b === 0);
});

test('fill 数字 1000 取模为 232', () => {
  const buf = Buffer.alloc(5, 1000);
  return buf.every(b => b === 232);
});

// 字符串 fill 与编码的交互
test('latin1 编码 - 0x80-0xFF 范围', () => {
  const buf = Buffer.alloc(10, '\x80\x90\xA0\xB0', 'latin1');
  return buf[0] === 0x80 && buf[1] === 0x90 && buf[2] === 0xA0 && buf[3] === 0xB0;
});

test('utf8 编码 - ASCII 范围字符', () => {
  const buf = Buffer.alloc(10, 'abc', 'utf8');
  const expected = Buffer.from('abcabcabca');
  return buf.equals(expected);
});

test('hex 编码 - 只接受有效的十六进制字符', () => {
  const buf = Buffer.alloc(10, '0F', 'hex');
  return buf[0] === 0x0F && buf[1] === 0x0F;
});

// 空字符串 fill 在不同编码下的行为
test('空字符串 utf8 - 填充为 0', () => {
  const buf = Buffer.alloc(5, '', 'utf8');
  return buf.every(b => b === 0);
});

test('空字符串 hex - 填充为 0', () => {
  const buf = Buffer.alloc(5, '', 'hex');
  return buf.every(b => b === 0);
});

test('空字符串 base64 - 填充为 0', () => {
  const buf = Buffer.alloc(5, '', 'base64');
  return buf.every(b => b === 0);
});

test('空字符串 latin1 - 填充为 0', () => {
  const buf = Buffer.alloc(5, '', 'latin1');
  return buf.every(b => b === 0);
});

// 特殊数值的处理
test('size 为 0.1 - 向下取整为 0', () => {
  const buf = Buffer.alloc(0.1);
  return buf.length === 0;
});

test('size 为 0.9 - 向下取整为 0', () => {
  const buf = Buffer.alloc(0.9);
  return buf.length === 0;
});

test('size 为 1.1 - 向下取整为 1', () => {
  const buf = Buffer.alloc(1.1);
  return buf.length === 1;
});

test('size 为 99.99 - 向下取整为 99', () => {
  const buf = Buffer.alloc(99.99);
  return buf.length === 99;
});

// Uint8Array fill 的完整行为
test('fill 为 Uint8Array - 多字节精确填充', () => {
  const fillArr = new Uint8Array([10, 20, 30]);
  const buf = Buffer.alloc(10, fillArr);
  return buf[0] === 10 && buf[1] === 20 && buf[2] === 30 &&
         buf[9] === 10;
});

// 边界大小的 pooling 行为
test('4KB 大小 - 可能使用 pool', () => {
  const buf = Buffer.alloc(4096);
  return buf.length === 4096 && buf.every(b => b === 0);
});

test('8KB 大小 - 可能不使用 pool', () => {
  const buf = Buffer.alloc(8192);
  return buf.length === 8192 && buf.every(b => b === 0);
});

// 多次调用的独立性
test('连续调用 100 次，每次结果独立', () => {
  const bufs = [];
  for (let i = 0; i < 100; i++) {
    bufs.push(Buffer.alloc(10, i % 256));
  }
  return bufs.every((buf, i) => buf.every(b => b === (i % 256)));
});

// 与其他 Buffer 构造函数的一致性
test('Buffer.alloc(n, 0) 与 Buffer.alloc(n) 相同', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10, 0);
  return buf1.equals(buf2);
});

test('Buffer.alloc(n, undefined) 与 Buffer.alloc(n) 相同', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10, undefined);
  return buf1.equals(buf2);
});

// 填充值的字符串表示
test('fill 为数字字符串 65 - 按 utf8 编码为字符', () => {
  const buf = Buffer.alloc(4, '65');
  return buf[0] === 0x36 && buf[1] === 0x35 && buf[2] === 0x36 && buf[3] === 0x35;
});

// 特殊编码字符
test('utf8 编码 - NULL 字符', () => {
  const buf = Buffer.alloc(5, '\0', 'utf8');
  return buf.every(b => b === 0);
});

test('utf8 编码 - 换行符', () => {
  const buf = Buffer.alloc(5, '\n', 'utf8');
  return buf.every(b => b === 0x0A);
});

test('utf8 编码 - 制表符', () => {
  const buf = Buffer.alloc(5, '\t', 'utf8');
  return buf.every(b => b === 0x09);
});

// 复杂的 Buffer fill 场景
test('fill 为包含零的 Buffer', () => {
  const fillBuf = Buffer.from([0x00, 0x01, 0x00]);
  const buf = Buffer.alloc(9, fillBuf);
  return buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 &&
         buf[3] === 0x00 && buf[4] === 0x01 && buf[5] === 0x00;
});

test('fill 为全 0xFF 的 Buffer', () => {
  const fillBuf = Buffer.from([0xFF, 0xFF]);
  const buf = Buffer.alloc(6, fillBuf);
  return buf.every(b => b === 0xFF);
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
