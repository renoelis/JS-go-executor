// buf.reverse() - 基础功能测试
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

// Case 1: 基本反转功能 - 偶数长度
test('基本反转功能 - 偶数长度', () => {
  const buf = Buffer.from([1, 2, 3, 4]);
  const result = buf.reverse();
  const expected = [4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 2: 基本反转功能 - 奇数长度
test('基本反转功能 - 奇数长度', () => {
  const buf = Buffer.from([1, 2, 3, 4, 5]);
  buf.reverse();
  const expected = [5, 4, 3, 2, 1];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 3: 返回值是否为自身
test('返回值是否为自身', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.reverse();
  return result === buf;
});

// Case 4: 空 Buffer
test('空 Buffer 反转', () => {
  const buf = Buffer.alloc(0);
  const result = buf.reverse();
  return result === buf && buf.length === 0;
});

// Case 5: 长度为 1 的 Buffer
test('长度为 1 的 Buffer 反转', () => {
  const buf = Buffer.from([42]);
  const result = buf.reverse();
  return result === buf && buf[0] === 42 && buf.length === 1;
});

// Case 6: 长度为 2 的 Buffer
test('长度为 2 的 Buffer 反转', () => {
  const buf = Buffer.from([0xAA, 0xBB]);
  buf.reverse();
  const expected = [0xBB, 0xAA];
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 7: 验证原地修改 - 保存原始引用
test('验证原地修改 - 保存原始引用', () => {
  const buf = Buffer.from([10, 20, 30, 40]);
  const refBefore = buf;
  buf.reverse();
  return refBefore === buf && buf[0] === 40 && buf[3] === 10;
});

// Case 8: 字符串内容反转
test('字符串内容反转', () => {
  const buf = Buffer.from('abcd', 'utf8');
  buf.reverse();
  const expected = [100, 99, 98, 97]; // 'd', 'c', 'b', 'a' in ASCII
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 9: 多次反转恢复原样
test('多次反转恢复原样', () => {
  const original = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const buf = Buffer.from(original);
  buf.reverse().reverse();
  const actual = Array.from(buf);
  return JSON.stringify(actual) === JSON.stringify(original);
});

// Case 10: 链式调用
test('链式调用', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.reverse().reverse().reverse();
  const expected = [3, 2, 1];
  const actual = Array.from(buf);
  return result === buf && JSON.stringify(actual) === JSON.stringify(expected);
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
