// buf.reverse() - 错误路径测试
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

// Case 1: 在普通对象上调用 reverse
test('在普通对象上调用 reverse', () => {
  try {
    const fakeObj = { 0: 1, 1: 2, length: 2 };
    Buffer.prototype.reverse.call(fakeObj);
    return false; // 应该抛出错误
  } catch (err) {
    return err.name === 'TypeError' || err.message.includes('not a') || err.message.includes('instance');
  }
});

// Case 2: 在 null 上调用 reverse
test('在 null 上调用 reverse', () => {
  try {
    Buffer.prototype.reverse.call(null);
    return false;
  } catch (err) {
    return err.name === 'TypeError';
  }
});

// Case 3: 在 undefined 上调用 reverse
test('在 undefined 上调用 reverse', () => {
  try {
    Buffer.prototype.reverse.call(undefined);
    return false;
  } catch (err) {
    return err.name === 'TypeError';
  }
});

// Case 4: 在数组上调用 Buffer.prototype.reverse
test('在数组上调用 Buffer.prototype.reverse', () => {
  try {
    const arr = [1, 2, 3];
    Buffer.prototype.reverse.call(arr);
    return false;
  } catch (err) {
    return err.name === 'TypeError';
  }
});

// Case 5: reverse 方法忽略传入的参数
test('reverse 方法忽略传入的参数', () => {
  const buf = Buffer.from([1, 2, 3]);
  const result = buf.reverse(999);
  const expected = [3, 2, 1];
  const actual = Array.from(buf);
  return result === buf && JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 6: 在 Int8Array 上调用 Buffer.prototype.reverse
test('在 Int8Array 上调用 Buffer.prototype.reverse', () => {
  const int8 = new Int8Array([1, 2, 3]);
  Buffer.prototype.reverse.call(int8);
  const expected = [3, 2, 1];
  const actual = Array.from(int8);
  return JSON.stringify(actual) === JSON.stringify(expected);
});

// Case 7: 在 Uint16Array 上调用 Buffer.prototype.reverse（按元素反转）
test('在 Uint16Array 上调用 Buffer.prototype.reverse', () => {
  const uint16 = new Uint16Array([0x0102, 0x0304, 0x0506]);
  const before = Array.from(uint16);
  Buffer.prototype.reverse.call(uint16);
  const after = Array.from(uint16);
  const expected = before.slice().reverse();
  return JSON.stringify(after) === JSON.stringify(expected);
});

// Case 8: 在字符串上调用 reverse
test('在字符串上调用 reverse', () => {
  try {
    Buffer.prototype.reverse.call('hello');
    return false;
  } catch (err) {
    return err.name === 'TypeError';
  }
});

// Case 9: 在数字上调用 reverse
test('在数字上调用 reverse', () => {
  try {
    Buffer.prototype.reverse.call(12345);
    return false;
  } catch (err) {
    return err.name === 'TypeError';
  }
});

// Case 10: 在 Boolean 上调用 reverse
test('在 Boolean 上调用 reverse', () => {
  try {
    Buffer.prototype.reverse.call(true);
    return false;
  } catch (err) {
    return err.name === 'TypeError';
  }
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
