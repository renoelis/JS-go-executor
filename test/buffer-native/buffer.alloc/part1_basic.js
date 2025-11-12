// Buffer.alloc() - Part 1: Basic Functionality Tests
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

// 基本功能测试
test('创建长度为 0 的 Buffer', () => {
  const buf = Buffer.alloc(0);
  return buf.length === 0;
});

test('创建长度为 1 的 Buffer，默认填充 0', () => {
  const buf = Buffer.alloc(1);
  return buf.length === 1 && buf[0] === 0;
});

test('创建长度为 10 的 Buffer，默认填充 0', () => {
  const buf = Buffer.alloc(10);
  if (buf.length !== 10) return false;
  for (let i = 0; i < 10; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('创建长度为 100 的 Buffer', () => {
  const buf = Buffer.alloc(100);
  if (buf.length !== 100) return false;
  for (let i = 0; i < 100; i++) {
    if (buf[i] !== 0) return false;
  }
  return true;
});

test('创建长度为 1024 的 Buffer', () => {
  const buf = Buffer.alloc(1024);
  return buf.length === 1024 && buf[0] === 0 && buf[1023] === 0;
});

test('创建长度为 8192 的 Buffer（跨越 poolSize）', () => {
  const buf = Buffer.alloc(8192);
  return buf.length === 8192 && buf[0] === 0 && buf[8191] === 0;
});

test('验证返回的是 Buffer 实例', () => {
  const buf = Buffer.alloc(10);
  return Buffer.isBuffer(buf);
});

test('验证 Buffer 类型检查（typeof）', () => {
  const buf = Buffer.alloc(10);
  return typeof buf === 'object' && buf !== null;
});

test('验证可以访问索引', () => {
  const buf = Buffer.alloc(5);
  return buf[0] === 0 && buf[4] === 0 && buf[5] === undefined;
});

test('验证 length 属性存在且正确', () => {
  const buf = Buffer.alloc(42);
  return buf.length === 42 && typeof buf.length === 'number';
});

test('验证不同大小的 Buffer 互相独立', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(10);
  buf1[0] = 255;
  return buf1[0] === 255 && buf2[0] === 0 && buf1.length !== buf2.length;
});

test('验证连续创建多个 Buffer', () => {
  const bufs = [];
  for (let i = 0; i < 5; i++) {
    bufs.push(Buffer.alloc(i + 1));
  }
  return bufs.length === 5 &&
         bufs[0].length === 1 &&
         bufs[4].length === 5 &&
         bufs.every(b => Buffer.isBuffer(b));
});

test('验证大小为 0 时索引访问返回 undefined', () => {
  const buf = Buffer.alloc(0);
  return buf[0] === undefined && buf[-1] === undefined;
});

test('验证 Buffer.alloc 是函数', () => {
  return typeof Buffer.alloc === 'function';
});

test('验证 Buffer.alloc 的参数个数', () => {
  return Buffer.alloc.length === 3;
});

test('验证只传入 size 参数', () => {
  const buf = Buffer.alloc(5);
  return buf.length === 5 && buf[0] === 0 && buf[4] === 0;
});

test('验证整数 size 参数（正整数）', () => {
  const buf = Buffer.alloc(20);
  return buf.length === 20;
});

test('验证创建的 Buffer 可以被修改', () => {
  const buf = Buffer.alloc(3);
  buf[0] = 65;
  buf[1] = 66;
  buf[2] = 67;
  return buf[0] === 65 && buf[1] === 66 && buf[2] === 67;
});

test('验证创建的 Buffer 与其他 Buffer 内存独立', () => {
  const buf1 = Buffer.alloc(5);
  const buf2 = Buffer.alloc(5);
  buf1[0] = 100;
  buf2[0] = 200;
  return buf1[0] === 100 && buf2[0] === 200;
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
