// buf.write() - 第7轮：针对性补充测试
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

// 补充场景1：参数顺序混淆测试
test('两个数字参数 - 识别为 offset 和 length', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 2, 3);
  return len === 3 && buf.toString('utf8', 2, 5) === 'hel';
});

test('数字 + 字符串 - 识别为 offset 和 encoding', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('68656c6c6f', 2, 'hex');
  return len === 5 && buf[2] === 0x68;
});

test('字符串在第二位 - 识别为 encoding', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('QUJD', 'base64');
  return len === 3;
});

// 补充场景2：与 Buffer.concat 的交互
test('写入后 concat 不影响原 Buffer', () => {
  const buf1 = Buffer.alloc(5);
  buf1.write('hello');
  const buf2 = Buffer.from('world');
  const buf3 = Buffer.concat([buf1, buf2]);
  buf3.write('xxxxx', 0);
  return buf1.toString() === 'hello';
});

// 补充场景3：与 Buffer.compare 的交互
test('写入相同内容的 Buffer 相等', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(5);
  buf1.write('hello');
  buf2.write('hello');
  return Buffer.compare(buf1, buf2) === 0;
});

test('写入不同内容的 Buffer 不相等', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(5);
  buf1.write('hello');
  buf2.write('world');
  return Buffer.compare(buf1, buf2) !== 0;
});

// 补充场景4：与 Buffer.equals 的交互
test('写入后 equals 检查', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(5);
  buf1.write('test1');
  buf2.write('test1');
  return buf1.equals(buf2);
});

// 补充场景5：编码别名的完整性
test('utf-16le 编码（带连字符）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hi', 'utf-16le');
  return len === 4;
});

test('ucs-2 编码（带连字符）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hi', 'ucs-2');
  return len === 4;
});

// 补充场景6：写入后的 toString 各种编码
test('写入 utf8 后用 hex 读取', () => {
  const buf = Buffer.alloc(10);
  buf.write('ABC');
  return buf.toString('hex', 0, 3) === '414243';
});

test('写入 hex 后用 utf8 读取', () => {
  const buf = Buffer.alloc(10);
  buf.write('414243', 'hex');
  return buf.toString('utf8', 0, 3) === 'ABC';
});

test('写入 base64 后用 hex 读取', () => {
  const buf = Buffer.alloc(10);
  buf.write('QUJD', 'base64');
  return buf.toString('hex', 0, 3) === '414243';
});

// 补充场景7：与 Buffer.copy 的交互
test('写入后 copy 到其他 Buffer', () => {
  const buf1 = Buffer.alloc(10);
  buf1.write('hello');
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2, 0, 0, 5);
  return buf2.toString('utf8', 0, 5) === 'hello';
});

test('copy 后再 write 不影响源 Buffer', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(5);
  buf1.copy(buf2);
  buf2.write('world');
  return buf1.toString() === 'hello' && buf2.toString() === 'world';
});

// 补充场景8：写入特殊 ASCII 控制字符
test('写入 BEL 字符（0x07）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\x07');
  return len === 1 && buf[0] === 0x07;
});

test('写入 ESC 字符（0x1B）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\x1B');
  return len === 1 && buf[0] === 0x1B;
});

test('写入 DEL 字符（0x7F）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\x7F');
  return len === 1 && buf[0] === 0x7F;
});

// 补充场景9：写入后的 Buffer.includes
test('写入后可以用 includes 查找', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello world', 0, 10);
  return buf.includes('hello');
});

test('写入后 includes 返回 false（不存在）', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  return !buf.includes('world');
});

// 补充场景10：写入后的 Buffer.indexOf
test('写入后可以用 indexOf 查找', () => {
  const buf = Buffer.alloc(20);
  buf.write('hello world');
  return buf.indexOf('world') === 6;
});

test('写入后 indexOf 返回 -1（不存在）', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  return buf.indexOf('xyz') === -1;
});

// 补充场景11：写入后的 Buffer.lastIndexOf
test('写入重复内容后 lastIndexOf', () => {
  const buf = Buffer.alloc(20);
  buf.write('abcabc');
  return buf.lastIndexOf('abc') === 3;
});

// 补充场景12：不同长度的 Buffer
test('写入到 1 字节 Buffer', () => {
  const buf = Buffer.alloc(1);
  const len = buf.write('abcdef');
  return len === 1 && buf[0] === 0x61;
});

test('写入到 2 字节 Buffer', () => {
  const buf = Buffer.alloc(2);
  const len = buf.write('abcdef');
  return len === 2 && buf[0] === 0x61 && buf[1] === 0x62;
});

test('写入到 3 字节 Buffer', () => {
  const buf = Buffer.alloc(3);
  const len = buf.write('abcdef');
  return len === 3;
});

// 补充场景13：offset 和 length 的各种有效组合
test('offset=1, length=8 在 10 字节 Buffer', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('abcdefgh', 1, 8);
  return len === 8;
});

test('offset=2, length=6 在 10 字节 Buffer', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('123456', 2, 6);
  return len === 6;
});

test('offset=4, length=4 在 10 字节 Buffer', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('test', 4, 4);
  return len === 4;
});

// 补充场景14：写入数字字符串的各种情况
test('写入纯数字字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('0123456789');
  return len === 10 && buf.toString('utf8', 0, 10) === '0123456789';
});

test('写入负数形式的字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('-12345');
  return len === 6;
});

test('写入浮点数形式的字符串', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('3.14159');
  return len === 7;
});

// 补充场景15：与 Buffer.swap 系列方法的交互
test('写入后 swap16', () => {
  const buf = Buffer.alloc(4);
  buf.write('1234');
  buf.swap16();
  return buf[0] === 0x32 && buf[1] === 0x31;
});

test('写入 utf16le 后 swap16', () => {
  const buf = Buffer.alloc(4);
  buf.write('AB', 'utf16le');
  const before = buf[0];
  buf.swap16();
  return buf[0] !== before;
});

// 补充场景16：JSON.stringify 包含 Buffer
test('写入后的 Buffer 可以 JSON.stringify', () => {
  const buf = Buffer.alloc(5);
  buf.write('hello');
  const json = JSON.stringify(buf);
  return json.includes('type') && json.includes('data');
});

// 补充场景17：写入 URL 编码字符串
test('写入 URL 编码的字符串（未解码）', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('hello%20world');
  return len === 13 && buf.toString('utf8', 0, 13) === 'hello%20world';
});

test('写入包含 + 的字符串', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('a+b+c');
  return len === 5 && buf.toString('utf8', 0, 5) === 'a+b+c';
});

// 补充场景18：base64url 的特殊字符
test('base64url - 包含 - 字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A-B', 'base64url');
  return len >= 0;
});

test('base64url - 包含 _ 字符', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('A_B', 'base64url');
  return len >= 0;
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
