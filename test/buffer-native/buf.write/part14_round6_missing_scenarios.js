// buf.write() - 第6轮：深度查缺补漏 - 遗漏场景
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

// 遗漏场景1：undefined 参数的各种位置
test('第一个参数为 undefined 会抛出类型错误', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write(undefined);
    return false;
  } catch (e) {
    return e.name === 'TypeError';
  }
});

test('offset 为 undefined 使用默认值 0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('test', undefined);
  return len === 4 && buf.toString('utf8', 0, 4) === 'test';
});

test('length 为 undefined 使用剩余空间', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 3, undefined);
  return len === 5;
});

test('encoding 为 undefined 使用默认 utf8', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 0, 5, undefined);
  return len === 5;
});

// 遗漏场景2：写入后 Buffer 的其他属性不变
test('写入不改变 buffer.buffer 属性', () => {
  const buf = Buffer.alloc(10);
  const originalBuffer = buf.buffer;
  buf.write('test');
  return buf.buffer === originalBuffer;
});

test('写入不改变 buffer.byteOffset', () => {
  const buf = Buffer.alloc(10);
  const originalOffset = buf.byteOffset;
  buf.write('test');
  return buf.byteOffset === originalOffset;
});

// 遗漏场景3：特殊的 hex 输入
test('hex 编码 - 包含空格（应被忽略或导致失败）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('12 34 56', 'hex');
  return len >= 0;
});

test('hex 编码 - 包含冒号分隔（MAC地址格式）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('12:34:56', 'hex');
  return len >= 0;
});

test('hex 编码 - 空字符串返回 0', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('', 'hex');
  return len === 0;
});

test('hex 编码 - 只有无效字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('ghij', 'hex');
  return len === 0;
});

// 遗漏场景4：base64 的边界情况
test('base64 编码 - 只有填充符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('====', 'base64');
  return len === 0;
});

test('base64 编码 - 单个字符（无效）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A', 'base64');
  return len === 0;
});

test('base64 编码 - 两个字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('QQ', 'base64');
  return len === 1;
});

test('base64 编码 - 三个字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('QUI', 'base64');
  return len === 2;
});

test('base64 编码 - 四个字符（完整块）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('QUJD', 'base64');
  return len === 3;
});

// 遗漏场景5：utf16le 的对齐问题
test('utf16le - offset 为奇数时的行为', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A', 1, 'utf16le');
  return len === 2;
});

test('utf16le - length 为奇数时的行为', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('ABC', 0, 5, 'utf16le');
  return len === 4;
});

test('utf16le - 空间为奇数字节', () => {
  const buf = Buffer.alloc(5);
  const len = buf.write('ABC', 'utf16le');
  return len === 4;
});

// 遗漏场景6：latin1 的完整字符范围
test('latin1 - 0x00 字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\x00', 'latin1');
  return len === 1 && buf[0] === 0x00;
});

test('latin1 - 0xFF 字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\xFF', 'latin1');
  return len === 1 && buf[0] === 0xFF;
});

test('latin1 - 0x80-0xFF 范围字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\x80\x90\xA0\xB0\xC0\xD0\xE0\xF0', 'latin1');
  return len === 8;
});

// 遗漏场景7：写入后立即读取验证
test('写入后立即通过索引读取正确', () => {
  const buf = Buffer.alloc(10);
  buf.write('ABC');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

test('写入 hex 后立即读取正确', () => {
  const buf = Buffer.alloc(10);
  buf.write('010203', 'hex');
  return buf[0] === 0x01 && buf[1] === 0x02 && buf[2] === 0x03;
});

test('写入 base64 后立即读取正确', () => {
  const buf = Buffer.alloc(10);
  buf.write('QUJD', 'base64');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

// 遗漏场景8：与 fill 方法的交互
test('先 fill 后 write 部分覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xAA);
  buf.write('hi', 3);
  return buf[0] === 0xAA && buf[2] === 0xAA && buf[3] === 0x68 && buf[5] === 0xAA;
});

test('先 write 后 fill 完全覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  buf.fill(0xBB);
  return buf[0] === 0xBB && buf[4] === 0xBB;
});

// 遗漏场景9：offset + length 的精确边界
test('offset=5, length=5 在 10 字节 Buffer 中', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('12345', 5, 5);
  return len === 5 && buf.toString('utf8', 5, 10) === '12345';
});

test('offset=9, length=1 在 10 字节 Buffer 中', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('x', 9, 1);
  return len === 1 && buf[9] === 0x78;
});

test('offset=10, length=0 在 10 字节 Buffer 中', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('x', 10, 0);
  return len === 0;
});

// 遗漏场景10：多字节字符的精确截断点
test('utf8 - 2字节字符的第1个字节位置截断', () => {
  const buf = Buffer.alloc(1);
  const len = buf.write('é');
  return len === 0;
});

test('utf8 - 3字节字符的第1个字节位置截断', () => {
  const buf = Buffer.alloc(1);
  const len = buf.write('中');
  return len === 0;
});

test('utf8 - 3字节字符的第2个字节位置截断', () => {
  const buf = Buffer.alloc(2);
  const len = buf.write('中');
  return len === 0;
});

test('utf8 - 4字节字符的各个位置截断', () => {
  const buf1 = Buffer.alloc(1);
  const buf2 = Buffer.alloc(2);
  const buf3 = Buffer.alloc(3);
  const len1 = buf1.write('😀');
  const len2 = buf2.write('😀');
  const len3 = buf3.write('😀');
  return len1 === 0 && len2 === 0 && len3 === 0;
});

// 遗漏场景11：连续写入同一位置
test('连续写入同一位置 - 最后一次生效', () => {
  const buf = Buffer.alloc(10);
  buf.write('aaaaa');
  buf.write('bbbbb');
  buf.write('ccccc');
  return buf.toString('utf8', 0, 5) === 'ccccc';
});

test('连续写入不同编码同一位置', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 'utf8');
  buf.write('0102', 'hex');
  return buf[0] === 0x01 && buf[1] === 0x02;
});

// 遗漏场景12：空间刚好容纳但字符串更长
test('空间5字节，写入10字符ASCII', () => {
  const buf = Buffer.alloc(5);
  const len = buf.write('1234567890');
  return len === 5 && buf.toString() === '12345';
});

test('空间6字节，写入4个中文（需12字节）', () => {
  const buf = Buffer.alloc(6);
  const len = buf.write('中文测试');
  return len === 6 && buf.toString('utf8') === '中文';
});

// 遗漏场景13：特殊编码组合
test('先 utf8 写入，再 utf16le 覆盖不同位置', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello', 0, 'utf8');
  buf.write('hi', 10, 'utf16le');
  return buf.toString('utf8', 0, 5) === 'hello' && buf[10] === 0x68;
});

test('先 hex 写入，再 base64 覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.write('0102030405', 0, 'hex');
  buf.write('QUJD', 0, 'base64');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
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
