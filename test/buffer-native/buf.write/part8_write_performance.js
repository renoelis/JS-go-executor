// buf.write() - 性能和压力测试
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

// 大字符串写入
test('写入 1KB 字符串', () => {
  const buf = Buffer.alloc(1024);
  const str = 'a'.repeat(1024);
  const written = buf.write(str);
  return written === 1024;
});

test('写入 10KB 字符串', () => {
  const buf = Buffer.alloc(10240);
  const str = 'x'.repeat(10240);
  const written = buf.write(str);
  return written === 10240;
});

test('写入超长字符串到小 Buffer（截断）', () => {
  const buf = Buffer.alloc(100);
  const str = 'a'.repeat(10000);
  const written = buf.write(str);
  return written === 100 && buf[99] === 0x61;
});

// 大 Buffer 操作
test('在大 Buffer 的不同位置写入', () => {
  const buf = Buffer.alloc(10240);
  const w1 = buf.write('start', 0);
  const w2 = buf.write('middle', 5120);
  const w3 = buf.write('end', 10230);
  return w1 === 5 && w2 === 6 && w3 === 3;
});

test('大 Buffer 多次连续写入', () => {
  const buf = Buffer.alloc(1024);
  let offset = 0;
  for (let i = 0; i < 100; i++) {
    const written = buf.write('x', offset);
    offset += written;
    if (offset >= buf.length) break;
  }
  return offset === 100;
});

// 重复写入测试
test('同一位置重复写入 100 次', () => {
  const buf = Buffer.alloc(10);
  for (let i = 0; i < 100; i++) {
    buf.write('hello');
  }
  return buf.toString('utf8', 0, 5) === 'hello';
});

test('不同位置重复写入', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 10; i++) {
    buf.write('test', i * 10);
  }
  return buf.toString('utf8', 0, 4) === 'test' && buf.toString('utf8', 90, 94) === 'test';
});

// 多字节字符压力测试
test('写入大量中文字符', () => {
  const buf = Buffer.alloc(3000);
  const str = '测试'.repeat(100);
  const written = buf.write(str);
  return written === 600;
});

test('写入大量 emoji', () => {
  const buf = Buffer.alloc(4000);
  const str = '😀'.repeat(100);
  const written = buf.write(str);
  return written === 400;
});

test('混合大量多字节字符', () => {
  const buf = Buffer.alloc(5000);
  const str = 'a中😀'.repeat(100);
  const written = buf.write(str);
  return written === 800;
});

// 编码转换压力
test('大量 hex 编码写入', () => {
  const buf = Buffer.alloc(1000);
  const hex = '00'.repeat(1000);
  const written = buf.write(hex, 'hex');
  return written === 1000;
});

test('大量 base64 编码写入', () => {
  const buf = Buffer.alloc(1000);
  const b64 = Buffer.alloc(1000).toString('base64');
  const written = buf.write(b64, 'base64');
  return written > 0;
});

test('utf16le 大字符串', () => {
  const buf = Buffer.alloc(2000);
  const str = 'hello'.repeat(100);
  const written = buf.write(str, 'utf16le');
  return written === 1000;
});

// 边界条件压力
test('在 Buffer 末尾附近反复写入', () => {
  const buf = Buffer.alloc(100);
  for (let i = 95; i < 100; i++) {
    buf.write('x', i);
  }
  return buf[99] === 0x78;
});

test('length 限制下的重复写入', () => {
  const buf = Buffer.alloc(100);
  for (let i = 0; i < 100; i++) {
    buf.write('hello', i, 1);
  }
  return true;
});

// 内存效率测试
test('多个独立 Buffer 写入不互相影响', () => {
  const buffers = [];
  for (let i = 0; i < 100; i++) {
    const buf = Buffer.alloc(10);
    buf.write('test' + i);
    buffers.push(buf);
  }
  return buffers[0].toString('utf8', 0, 5) === 'test0' && buffers[99].toString('utf8', 0, 6) === 'test99';
});

test('共享视图的写入隔离', () => {
  const buf = Buffer.alloc(1000);
  const views = [];
  for (let i = 0; i < 10; i++) {
    views.push(buf.subarray(i * 100, (i + 1) * 100));
  }
  views.forEach((view, i) => {
    view.write('idx' + i);
  });
  return buf.toString('utf8', 0, 4) === 'idx0' && buf.toString('utf8', 900, 904) === 'idx9';
});

// 极端长度测试
test('单字符重复写满 Buffer', () => {
  const buf = Buffer.alloc(1000);
  for (let i = 0; i < 1000; i++) {
    buf.write('x', i);
  }
  return buf[0] === 0x78 && buf[999] === 0x78;
});

test('填充整个大 Buffer', () => {
  const buf = Buffer.alloc(1024);
  const str = 'a'.repeat(1024);
  const written = buf.write(str);
  return written === 1024 && buf.toString('utf8', 0, 1024) === str;
});

// 连续操作稳定性
test('交替 offset 写入 1000 次', () => {
  const buf = Buffer.alloc(2000);
  for (let i = 0; i < 1000; i++) {
    buf.write('a', i * 2);
    buf.write('b', i * 2 + 1);
  }
  return buf[0] === 0x61 && buf[1] === 0x62 && buf[1998] === 0x61 && buf[1999] === 0x62;
});

test('不同编码混合写入', () => {
  const buf = Buffer.alloc(1000);
  buf.write('hello', 0, 5, 'utf8');
  buf.write('776f726c64', 5, 5, 'hex');
  buf.write('dGVzdA==', 10, 4, 'base64');
  return buf.toString('utf8', 0, 5) === 'hello';
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
