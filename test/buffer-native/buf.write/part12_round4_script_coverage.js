// buf.write() - 第4轮：测试脚本本身的补漏
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

// 补充：offset + encoding 参数组合（三参数形式）
test('三参数：write(string, offset, encoding) - utf8', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 2, 'utf8');
  return len === 5 && buf.toString('utf8', 2, 7) === 'hello';
});

test('三参数：write(string, offset, encoding) - hex', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('abcd', 3, 'hex');
  return len === 2 && buf[3] === 0xab && buf[4] === 0xcd;
});

test('三参数：write(string, offset, encoding) - base64', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('YWJj', 1, 'base64');
  return len === 3 && buf[1] === 0x61;
});

// 补充：写入后未使用区域保持不变
test('写入不影响前面的字节', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xaa);
  buf.write('hi', 5);
  return buf[0] === 0xaa && buf[4] === 0xaa;
});

test('写入不影响后面的字节', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0xbb);
  buf.write('hi', 0);
  return buf[2] === 0xbb && buf[9] === 0xbb;
});

// 补充：复杂的 Unicode 字符
test('写入组合字符（é 的分解形式）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('e\u0301');
  return len > 0;
});

test('写入右到左标记字符', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('\u202Etext');
  return len > 0;
});

test('写入左到右标记字符', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('\u202Dtext');
  return len > 0;
});

// 补充：Buffer 方法链式调用（虽然 write 返回数字）
test('write 返回数字，不支持链式调用', () => {
  const buf = Buffer.alloc(10);
  const result = buf.write('test');
  return typeof result === 'number';
});

// 补充：与其他 Buffer 方法的交互
test('write 后可以用 toString 读取', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  return buf.toString('utf8', 0, 5) === 'hello';
});

test('write 后可以用 slice 获取', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello', 2);
  const slice = buf.subarray(2, 7);
  return slice.toString('utf8') === 'hello';
});

test('write 后可以用索引访问', () => {
  const buf = Buffer.alloc(10);
  buf.write('ABC');
  return buf[0] === 0x41 && buf[1] === 0x42 && buf[2] === 0x43;
});

// 补充：Buffer.from 创建的 Buffer
test('Buffer.from 创建的 Buffer 可以 write', () => {
  const buf = Buffer.from('xxxxx');
  const len = buf.write('hello');
  return len === 5 && buf.toString() === 'hello';
});

test('Buffer.allocUnsafe 创建的 Buffer 可以 write', () => {
  const buf = Buffer.allocUnsafe(10);
  const len = buf.write('test');
  return len === 4;
});

// 补充：特殊长度的字符串
test('写入长度为 256 的字符串', () => {
  const buf = Buffer.alloc(300);
  const str = 'a'.repeat(256);
  const len = buf.write(str);
  return len === 256;
});

test('写入长度为 1024 的字符串', () => {
  const buf = Buffer.alloc(1100);
  const str = 'b'.repeat(1024);
  const len = buf.write(str);
  return len === 1024;
});

// 补充：offset 和 length 都接近边界
test('offset 接近末尾，length 很小', () => {
  const buf = Buffer.alloc(100);
  const len = buf.write('ab', 98, 2);
  return len === 2;
});

test('offset 为 0，length 等于 buffer.length', () => {
  const buf = Buffer.alloc(5);
  const len = buf.write('hello', 0, 5);
  return len === 5;
});

// 补充：不同编码的混合使用
test('先 utf8 后 hex 覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.write('test', 0, 'utf8');
  buf.write('abcd', 0, 'hex');
  return buf[0] === 0xab && buf[1] === 0xcd;
});

test('先 hex 后 base64 覆盖', () => {
  const buf = Buffer.alloc(10);
  buf.write('0102', 0, 'hex');
  buf.write('YWI=', 0, 'base64');
  return buf[0] === 0x61 && buf[1] === 0x62;
});

// 补充：UTF-8 BOM 标记
test('写入 UTF-8 BOM', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('\uFEFF');
  return len === 3;
});

// 补充：base64url 和 base64 的区别
test('base64url 使用 URL 安全字符', () => {
  const buf1 = Buffer.alloc(10);
  const buf2 = Buffer.alloc(10);
  const len1 = buf1.write('YWJj', 'base64');
  const len2 = buf2.write('YWJj', 'base64url');
  return len1 === len2;
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
