// buf.reverse() - Part 1: Basic Functionality Tests
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
test('反转 3 字节 Buffer', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.reverse();
  return buf[0] === 3 && buf[1] === 2 && buf[2] === 1;
});

test('反转 5 字节 Buffer', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();
  return buf[0] === 5 && buf[1] === 4 && buf[2] === 3 && 
         buf[3] === 2 && buf[4] === 1;
});

test('反转偶数长度 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  buf.reverse();
  return buf[0] === 0x04 && buf[1] === 0x03 && 
         buf[2] === 0x02 && buf[3] === 0x01;
});

test('反转奇数长度 Buffer', () => {
  const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
  buf.reverse();
  return buf[0] === 0x05 && buf[1] === 0x04 && buf[2] === 0x03 && 
         buf[3] === 0x02 && buf[4] === 0x01;
});

// 返回值测试
test('返回 this（链式调用）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.reverse();
  return result === buf;
});

test('链式调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  buf.reverse().reverse();
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3;
});

// 原地修改测试
test('原地修改（不创建新 Buffer）', () => {
  const buf = Buffer.from([1, 2, 3]);
  const originalBuf = buf;
  buf.reverse();
  return buf === originalBuf;
});

// 单字节 Buffer
test('单字节 Buffer 反转', () => {
  const buf = Buffer.from([0x42]);
  buf.reverse();
  return buf[0] === 0x42 && buf.length === 1;
});

// 双字节 Buffer
test('双字节 Buffer 反转', () => {
  const buf = Buffer.from([0x01, 0x02]);
  buf.reverse();
  return buf[0] === 0x02 && buf[1] === 0x01;
});

// 空 Buffer
test('空 Buffer 反转', () => {
  const buf = Buffer.alloc(0);
  buf.reverse();
  return buf.length === 0;
});

// 字符串内容反转
test('ASCII 字符串反转', () => {
  const buf = Buffer.from('hello');
  buf.reverse();
  return buf.toString() === 'olleh';
});

test('UTF-8 字符串反转（字节级）', () => {
  const buf = Buffer.from('abc');
  buf.reverse();
  return buf.toString() === 'cba';
});

// 二进制数据反转
test('二进制数据反转', () => {
  const buf = Buffer.from([0xFF, 0x00, 0xAA, 0x55]);
  buf.reverse();
  return buf[0] === 0x55 && buf[1] === 0xAA && 
         buf[2] === 0x00 && buf[3] === 0xFF;
});

// 对称数据反转
test('对称数据反转', () => {
  const buf = Buffer.from([1, 2, 3, 2, 1]);
  buf.reverse();
  return buf[0] === 1 && buf[1] === 2 && buf[2] === 3 && 
         buf[3] === 2 && buf[4] === 1;
});

// 全零 Buffer
test('全零 Buffer 反转', () => {
  const buf = Buffer.alloc(5);
  buf.reverse();
  return buf.every(b => b === 0);
});

// 全 0xFF Buffer
test('全 0xFF Buffer 反转', () => {
  const buf = Buffer.alloc(5, 0xFF);
  buf.reverse();
  return buf.every(b => b === 0xFF);
});

// 大 Buffer
test('大 Buffer 反转', () => {
  const buf = Buffer.alloc(1000);
  buf[0] = 1;
  buf[999] = 2;
  buf.reverse();
  return buf[0] === 2 && buf[999] === 1;
});

// 多次反转
test('反转两次恢复原状', () => {
  const original = Buffer.from([1, 2, 3, 4, 5]);
  const buf = Buffer.from(original);
  buf.reverse().reverse();
  return buf.equals(original);
});

test('反转三次等于反转一次', () => {
  const buf1 = Buffer.from([1, 2, 3, 4, 5]);
  const buf2 = Buffer.from([1, 2, 3, 4, 5]);
  buf1.reverse();
  buf2.reverse().reverse().reverse();
  return buf1.equals(buf2);
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
