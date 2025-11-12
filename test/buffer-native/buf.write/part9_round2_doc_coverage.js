// buf.write() - 第2轮补漏：对照 Node 官方文档的额外测试
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

// 官方文档测试：参数的不同重载形式
test('参数重载：buf.write(string)', () => {
  const buf = Buffer.alloc(256);
  const len = buf.write('\u00bd + \u00bc = \u00be', 0);
  return len === 12;
});

test('参数重载：指定完整的四个参数', () => {
  const buf = Buffer.alloc(256);
  const len = buf.write('\u00bd + \u00bc = \u00be', 0, 12, 'utf8');
  return len === 12;
});

// 官方文档：写入返回实际字节数
test('返回实际写入字节数而非字符数', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('中文');
  return len === 6;
});

// 官方文档：offset 不合法的情况
test('offset 超出 Buffer 长度时抛出 RangeError', () => {
  const buf = Buffer.alloc(10);
  try {
    buf.write('test', 100);
    return false;
  } catch (e) {
    return e.name === 'RangeError';
  }
});

// 官方文档：length 限制
test('length 限制写入长度 - 不超过 Buffer 可用空间', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello world', 0, 5);
  return len === 5 && buf.toString('utf8', 0, 5) === 'hello';
});

// 官方文档：默认编码是 utf8
test('默认编码是 utf8', () => {
  const buf = Buffer.alloc(20);
  buf.write('测试');
  const buf2 = Buffer.alloc(20);
  buf2.write('测试', 'utf8');
  return buf.toString('utf8', 0, 6) === buf2.toString('utf8', 0, 6);
});

// 官方文档：各种支持的编码
test('支持 utf8 编码', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 'utf8');
  return len === 5;
});

test('支持 utf-8 编码（带连字符）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 'utf-8');
  return len === 5;
});

test('支持 utf16le 编码', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('hello', 'utf16le');
  return len === 10;
});

test('支持 ucs2 编码', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('hello', 'ucs2');
  return len === 10;
});

test('支持 ucs-2 编码（带连字符）', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('hello', 'ucs-2');
  return len === 10;
});

test('支持 base64 编码', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('aGVsbG8=', 'base64');
  return len === 5;
});

test('支持 base64url 编码', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('aGVsbG8', 'base64url');
  return len === 5;
});

test('支持 latin1 编码', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 'latin1');
  return len === 5;
});

test('支持 binary 编码（latin1 别名）', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 'binary');
  return len === 5;
});

test('支持 hex 编码', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('68656c6c6f', 'hex');
  return len === 5;
});

test('支持 ascii 编码', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 'ascii');
  return len === 5;
});

// 官方文档：写入操作的原子性
test('写入操作是原子的', () => {
  const buf = Buffer.alloc(10);
  buf.write('hello');
  return buf.toString('utf8', 0, 5) === 'hello';
});

// 官方文档：不完整的多字节字符处理
test('不完整的多字节字符不会被写入', () => {
  const buf = Buffer.alloc(2);
  const len = buf.write('中');
  return len === 0;
});

test('多字节字符刚好能容纳时正常写入', () => {
  const buf = Buffer.alloc(3);
  const len = buf.write('中');
  return len === 3 && buf.toString('utf8') === '中';
});

// 官方文档：与 TypedArray 的交互
test('Buffer 是 Uint8Array 的子类', () => {
  const buf = Buffer.alloc(10);
  return buf instanceof Uint8Array;
});

test('写入后可以通过索引访问字节', () => {
  const buf = Buffer.alloc(10);
  buf.write('A');
  return buf[0] === 0x41;
});

// offset 的边界处理
test('offset 等于 Buffer 长度时写入 0 字节', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 10);
  return len === 0;
});

test('offset 加 length 刚好等于 Buffer 长度', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 5, 5);
  return len === 5;
});

// 编码的大小写不敏感
test('编码名称大小写不敏感 - UTF8', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('hello', 'UTF8');
  return len === 5;
});

test('编码名称大小写不敏感 - HEX', () => {
  const buf = Buffer.alloc(10);
  const len = buf.write('68656c6c6f', 'HEX');
  return len === 5;
});

test('编码名称大小写不敏感 - Base64', () => {
  const buf = Buffer.alloc(20);
  const len = buf.write('aGVsbG8=', 'BASE64');
  return len === 5;
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
