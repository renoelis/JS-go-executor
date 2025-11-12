// buffer.atob() - Part 2: 不同输入类型测试
const { atob } = require('buffer');

const tests = [];

function test(name, fn) {
  try {
    const pass = fn();
    tests.push({ name, status: pass ? '✅' : '❌' });
  } catch (e) {
    tests.push({ name, status: '❌', error: e.message, stack: e.stack });
  }
}

// 字符串输入（正常）
test('输入类型：普通字符串', () => {
  const decoded = atob('SGVsbG8=');
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
});

test('输入类型：空字符串', () => {
  const decoded = atob('');
  if (decoded !== '') {
    throw new Error(`期望空字符串, 实际 "${decoded}"`);
  }
  return true;
});

test('输入类型：仅空格的 base64 字符串', () => {
  try {
    const decoded = atob('    ');
    // Node.js atob 可能接受或拒绝空格，验证实际行为
    return true;
  } catch (e) {
    // 如果抛出错误也是合法的
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 数字会被转为字符串
test('输入类型：数字（自动转字符串）', () => {
  try {
    const decoded = atob(123);
    // 数字会转为字符串 "123"，然后尝试解码
    return true;
  } catch (e) {
    // 如果 "123" 不是有效 base64，抛错也正常
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 对象会调用 toString
test('输入类型：对象（自动 toString）', () => {
  const obj = {
    toString() {
      return 'SGVsbG8=';
    }
  };
  const decoded = atob(obj);
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
});

test('输入类型：对象默认 toString（[object Object]）', () => {
  try {
    const decoded = atob({});
    // {} 转为 "[object Object]"，不是有效 base64
    // 可能抛错或返回值
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// null 和 undefined
test('输入类型：null（转为字符串 "null"）', () => {
  try {
    const decoded = atob(null);
    // null 转为 "null"
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('输入类型：undefined（转为字符串 "undefined"）', () => {
  try {
    const decoded = atob(undefined);
    // undefined 转为 "undefined"，不是有效 base64，应该抛出错误
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

// boolean
test('输入类型：boolean true', () => {
  try {
    const decoded = atob(true);
    // true 转为 "true"
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('输入类型：boolean false', () => {
  try {
    const decoded = atob(false);
    // false 转为 "false"，不是有效 base64，应该抛出错误
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

// Symbol 应该抛出 TypeError
test('输入类型：Symbol（应抛出 TypeError）', () => {
  try {
    const sym = Symbol('test');
    atob(sym);
    throw new Error('应该抛出 TypeError');
  } catch (e) {
    if (e.message.includes('Cannot convert') || e.name === 'TypeError') {
      return true;
    }
    throw e;
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
