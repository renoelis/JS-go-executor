// buf.length - Part 4: Buffer Operations
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

// Buffer.concat 测试
test('concat 两个 buffer 的长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const buf3 = Buffer.concat([buf1, buf2]);
  return buf3.length === 10;
});

test('concat 多个 buffer 的长度', () => {
  const buf1 = Buffer.from('a');
  const buf2 = Buffer.from('b');
  const buf3 = Buffer.from('c');
  const buf4 = Buffer.concat([buf1, buf2, buf3]);
  return buf4.length === 3;
});

test('concat 空数组的长度', () => {
  const buf = Buffer.concat([]);
  return buf.length === 0;
});

test('concat 包含空 buffer 的长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(0);
  const buf3 = Buffer.from('world');
  const buf4 = Buffer.concat([buf1, buf2, buf3]);
  return buf4.length === 10;
});

test('concat 指定总长度', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.from('world');
  const buf3 = Buffer.concat([buf1, buf2], 20);
  return buf3.length === 20;
});

// Buffer.allocUnsafe 测试
test('allocUnsafe 的长度', () => {
  const buf = Buffer.allocUnsafe(10);
  return buf.length === 10;
});

test('allocUnsafe 零长度', () => {
  const buf = Buffer.allocUnsafe(0);
  return buf.length === 0;
});

// write 操作不改变 length（官方文档示例）
test('write 操作不改变 length', () => {
  const buf = Buffer.alloc(1234);
  const originalLength = buf.length;
  buf.write('some string', 0, 'utf8');
  return buf.length === originalLength && buf.length === 1234;
});

test('write 短字符串不改变 length', () => {
  const buf = Buffer.alloc(100);
  buf.write('hello', 0, 'utf8');
  return buf.length === 100;
});

test('write 长字符串不改变 length', () => {
  const buf = Buffer.alloc(10);
  buf.write('this is a very long string', 0, 'utf8');
  return buf.length === 10;
});

// fill 操作不改变 length
test('fill 操作不改变 length', () => {
  const buf = Buffer.alloc(10);
  buf.fill(0);
  return buf.length === 10;
});

test('fill 指定值不改变 length', () => {
  const buf = Buffer.alloc(10);
  buf.fill('a');
  return buf.length === 10;
});

test('fill 部分区域不改变 length', () => {
  const buf = Buffer.alloc(10);
  buf.fill('a', 2, 8);
  return buf.length === 10;
});

// copy 操作测试
test('copy 后源 buffer 长度不变', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2);
  return buf1.length === 5;
});

test('copy 后目标 buffer 长度不变', () => {
  const buf1 = Buffer.from('hello');
  const buf2 = Buffer.alloc(10);
  buf1.copy(buf2);
  return buf2.length === 10;
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
