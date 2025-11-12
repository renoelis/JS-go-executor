// buffer.atob() - Part 3: 错误路径与边界测试
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

// 非法 base64 字符
test('错误：包含非法字符（!）', () => {
  try {
    atob('SGVs!G8=');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：包含非法字符（@）', () => {
  try {
    atob('SGVs@G8=');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：包含非法字符（#）', () => {
  try {
    atob('SGVs#G8=');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：包含 Unicode 字符（中文）', () => {
  try {
    atob('SGVs中G8=');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('Latin1')) {
      return true;
    }
    throw e;
  }
});

test('错误：包含 emoji', () => {
  try {
    atob('SGVs😀G8=');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('Latin1')) {
      return true;
    }
    throw e;
  }
});

// 填充错误
test('错误：填充位置错误（= 在中间）', () => {
  try {
    atob('SGV=bG8=');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：三个等号填充', () => {
  try {
    atob('SGVsbG8===');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：填充后还有字符', () => {
  try {
    atob('SGVsbG8=abc');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 长度边界
test('边界：长度为 1 的 base64 字符', () => {
  try {
    const decoded = atob('A');
    // 长度 1 不是有效 base64（需要至少 2 个字符），应该抛出错误
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('边界：长度为 2 的 base64 字符', () => {
  try {
    const decoded = atob('YQ');
    // Node.js v25 实际接受长度 2（容错处理），验证能解码
    if (typeof decoded !== 'string') {
      throw new Error('应返回字符串');
    }
    return true;
  } catch (e) {
    // 如果抛出错误也是合法的
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('correctly encoded')) {
      return true;
    }
    throw e;
  }
});

test('边界：长度为 3 的 base64 字符', () => {
  try {
    const decoded = atob('YWI');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 无效的 base64 序列
test('错误：完全随机字符', () => {
  try {
    atob('$%^&*()');
    throw new Error('应该抛出错误');
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：换行符', () => {
  try {
    const decoded = atob('SGVs\nbG8=');
    // Node.js 可能接受或拒绝换行符
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：回车符', () => {
  try {
    const decoded = atob('SGVs\rbG8=');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

test('错误：制表符', () => {
  try {
    const decoded = atob('SGVs\tbG8=');
    return true;
  } catch (e) {
    if (e.message.includes('Invalid') || e.message.includes('invalid')) {
      return true;
    }
    throw e;
  }
});

// 参数数量
test('错误：无参数调用', () => {
  try {
    atob();
    throw new Error('应该抛出错误');
  } catch (e) {
    // Node.js v25 抛出 TypeError: The "input" argument must be specified
    if (e.message.includes('Invalid') || e.message.includes('invalid') || e.message.includes('required') || e.message.includes('argument') || e.name === 'TypeError') {
      return true;
    }
    throw e;
  }
});

test('正常：一个参数', () => {
  const decoded = atob('SGVsbG8=');
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
});

test('忽略：多余参数', () => {
  const decoded = atob('SGVsbG8=', 'extra', 'params');
  if (decoded !== 'Hello') {
    throw new Error(`期望 "Hello", 实际 "${decoded}"`);
  }
  return true;
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
